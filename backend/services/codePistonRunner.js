const PISTON_API_URL = 'https://emkc.org/api/v2/piston/execute';

// Map your project's language identifiers to Piston runtimes
const LANGUAGE_CONFIG = {
  python: {
    language: 'python',
    version: '3.10.0'
  },
  javascript: {
    language: 'javascript',
    version: '18.15.0'
  }
};

/**
 * Executes player submissions using the Piston API engine.
 * @param {Object} payload
 * @param {string} payload.submission_id
 * @param {string} [payload.room_id]
 * @param {'python'|'javascript'} payload.language
 * @param {Array<{name: string, content: string}>} payload.files
 * @param {string} [payload.command]
 * @param {number} [payload.timeout_seconds=10]
 * @returns {Promise<Object>} Formatted result payload for game engine & frontend
 */
export async function executeCode({
  submission_id,
  room_id = null,
  language,
  files,
  command = '',
  timeout_seconds = 10
}) {
  const runtime = LANGUAGE_CONFIG[language];
  if (!runtime) {
    throw new Error(`Unsupported language: ${language}`);
  }

  // Piston treats the first file in the array as the execution entrypoint.
  // We reorder files so that test files or entry files run first.
  let formattedFiles = [...files];
  const targetName = command.trim().split(/\s+/).pop();
  const targetIndex = formattedFiles.findIndex((f) => f.name === targetName);

  if (targetIndex > 0) {
    const [targetFile] = formattedFiles.splice(targetIndex, 1);
    formattedFiles.unshift(targetFile);
  }

  const pistonPayload = {
    language: runtime.language,
    version: runtime.version,
    files: formattedFiles.map((file) => ({
      name: file.name,
      content: file.content
    })),
    stdin: '',
    args: [],
    run_timeout: timeout_seconds * 1000
  };

  const startTime = Date.now();

  try {
    const response = await fetch(PISTON_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pistonPayload)
    });

    const executionTimeMs = Date.now() - startTime;
    const data = await response.json();

    if (!response.ok || data.message) {
      throw new Error(data.message || `Piston API responded with status ${response.status}`);
    }

    const { run } = data;
    const stdout = run.stdout || '';
    const stderr = run.stderr || '';
    const output = (stdout + (stderr ? `\n${stderr}` : '')).trim();

    // Echo live output directly to the server terminal
    if (stdout) process.stdout.write(stdout);
    if (stderr) process.stderr.write(stderr);

    // Identify timeouts (signal SIGKILL / SIGTERM or timeout indicator)
    const isTimeout =
      run.signal === 'SIGKILL' ||
      run.signal === 'SIGTERM' ||
      output.toLowerCase().includes('timed out') ||
      output.toLowerCase().includes('time limit exceeded');

    if (isTimeout) {
      const timeoutNotice = `Process killed: execution exceeded ${timeout_seconds} seconds.\n`;
      process.stderr.write(timeoutNotice);

      return {
        submission_id,
        room_id,
        status: 'timeout',
        exit_code: -1,
        stdout: stdout,
        stderr: timeoutNotice.trim(),
        output: timeoutNotice.trim(),
        execution_time_ms: executionTimeMs
      };
    }

    const exitCode = run.code ?? (stderr ? 1 : 0);
    const status = exitCode === 0 ? 'passed' : 'failed';

    return {
      submission_id,
      room_id,
      status,
      exit_code: exitCode,
      stdout,
      stderr,
      output,
      execution_time_ms: executionTimeMs
    };
  } catch (error) {
    const executionTimeMs = Date.now() - startTime;
    process.stderr.write(`Runtime Error: ${error.message}\n`);

    return {
      submission_id,
      room_id,
      status: 'error',
      exit_code: -1,
      stdout: '',
      stderr: error.message,
      output: error.message,
      execution_time_ms: executionTimeMs
    };
  }
}