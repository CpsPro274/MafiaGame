import Docker from 'dockerode';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { Writable } from 'stream';

const docker = new Docker({ socketPath: '/var/run/docker.sock' });

const RUNNER_IMAGES = {
  python: 'runner-python:latest',
  javascript: 'runner-node:latest'
};

class ConsoleAndBufferCollector extends Writable {
  constructor(consoleStream) {
    super();
    this.data = '';
    this.consoleStream = consoleStream;
  }
  _write(chunk, encoding, callback) {
    const text = chunk.toString();
    this.data += text;
    if (this.consoleStream) {
      this.consoleStream.write(text);
    }
    callback();
  }
}

/**
 * Builds the test suite script from raw test case objects.
 */
function buildTestHarness(language, testCases = []) {
  if (language === 'python') {
    const testFunctions = testCases
      .map((tc, index) => {
        const invocation = String(tc.input).trim().startsWith('(')
          ? `solution${tc.input}`
          : `solution(${tc.input})`;

        return [
          `def test_case_${index}():`,
          `    # hidden: ${Boolean(tc.hidden)}`,
          `    assert ${invocation} == ${tc.expected}`
        ].join('\n');
      })
      .join('\n\n');

    return [
      'import pytest',
      'from solution import solution',
      '',
      testFunctions
    ].join('\n');
  }

  throw new Error(`Unsupported language test generator: ${language}`);
}

/**
 * Pure execution function: receives raw inputs and returns standard test output.
 *
 * @param {Object} params
 * @param {string} params.code The player/shared code to test
 * @param {Array<{input: string, expected: string, hidden?: boolean}>} params.testCases Array matching DB test_cases
 * @param {'python'|'javascript'} [params.language='python'] Target language runtime
 * @param {number} [params.timeoutSeconds=10] Container timeout limit in seconds
 * @returns {Promise<{
 *   status: 'passed' | 'failed' | 'timeout' | 'error',
 *   allPassed: boolean,
 *   exitCode: number,
 *   stdout: string,
 *   stderr: string,
 *   output: string,
 *   executionTimeMs: number
 * }>}
 */
export async function runCode({
  code,
  testCases = [],
  language = 'python',
  timeoutSeconds = 10
}) {
  const image = RUNNER_IMAGES[language];
  if (!image) {
    throw new Error(`Unsupported language runtime: ${language}`);
  }

  const runId = `run_${uuidv4().slice(0, 8)}`;
  const tempDir = path.join('/tmp/runs', runId);
  await fs.mkdir(tempDir, { recursive: true });

  let container = null;
  const startTime = Date.now();

  try {
    const testContent = buildTestHarness(language, testCases);
    await fs.writeFile(path.join(tempDir, 'solution.py'), code, 'utf-8');
    await fs.writeFile(path.join(tempDir, 'test_solution.py'), testContent, 'utf-8');

    const runCommand = 'pytest -p no:cacheprovider test_solution.py';

    container = await docker.createContainer({
      Image: image,
      Cmd: ['/bin/sh', '-c', runCommand],
      WorkingDir: '/home/runner/app',
      Tty: false,
      AttachStdout: true,
      AttachStderr: true,
      HostConfig: {
        Binds: [`${tempDir}:/home/runner/app:ro`],
        NetworkMode: 'none',
        Memory: 256 * 1024 * 1024,
        MemorySwap: 256 * 1024 * 1024,
        NanoCpus: 1000000000,
        PidsLimit: 64,
        ReadonlyRootfs: true,
        Tmpfs: { '/tmp': 'rw,noexec,nosuid,size=32m' }
      }
    });

    const logStream = await container.attach({
      stream: true,
      stdout: true,
      stderr: true
    });

    const stdoutCollector = new ConsoleAndBufferCollector(process.stdout);
    const stderrCollector = new ConsoleAndBufferCollector(process.stderr);
    docker.modem.demuxStream(logStream, stdoutCollector, stderrCollector);

    await container.start();

    let timedOut = false;
    let timer;

    const timeoutPromise = new Promise((_, reject) => {
      timer = setTimeout(() => {
        timedOut = true;
        container.kill().catch(() => {});
        reject(new Error('EXECUTION_TIMEOUT'));
      }, timeoutSeconds * 1000);
    });

    const waitPromise = container.wait().then((res) => {
      clearTimeout(timer);
      if (timedOut) throw new Error('EXECUTION_TIMEOUT');
      return res;
    });

    const result = await Promise.race([waitPromise, timeoutPromise]);
    const executionTimeMs = Date.now() - startTime;
    const exitCode = result.StatusCode;
    const isPassed = exitCode === 0;

    return {
      status: isPassed ? 'passed' : 'failed',
      allPassed: isPassed,
      exitCode,
      stdout: stdoutCollector.data,
      stderr: stderrCollector.data,
      output: (stdoutCollector.data + stderrCollector.data).trim(),
      executionTimeMs
    };
  } catch (error) {
    const executionTimeMs = Date.now() - startTime;
    const isTimeout = error.message === 'EXECUTION_TIMEOUT';
    const message = isTimeout
      ? `Process killed: execution exceeded ${timeoutSeconds} seconds.`
      : error.message;

    return {
      status: isTimeout ? 'timeout' : 'error',
      allPassed: false,
      exitCode: -1,
      stdout: '',
      stderr: message,
      output: message,
      executionTimeMs
    };
  } finally {
    if (container) {
      try {
        await container.remove({ force: true });
      } catch (_) {}
    }
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}