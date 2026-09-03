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

// Stream collector that accumulates output AND echoes directly to terminal console
class ConsoleAndBufferCollector extends Writable {
  constructor(consoleStream) {
    super();
    this.data = '';
    this.consoleStream = consoleStream; // process.stdout or process.stderr
  }

  _write(chunk, encoding, callback) {
    const text = chunk.toString();
    this.data += text;
    if (this.consoleStream) {
      this.consoleStream.write(text); // Prints live to host console
    }
    callback();
  }
}

/**
 * Executes user/Mafia code within an isolated, ephemeral Docker sandbox[cite: 1].
 * Logs are streamed to the server console and packaged for frontend consumption[cite: 1].
 */
export async function executeCode({
  submission_id,
  room_id = null,
  language,
  files,
  command,
  timeout_seconds = 10
}) {
  const image = RUNNER_IMAGES[language];
  if (!image) {
    throw new Error(`Unsupported language: ${language}`);
  }

  const runId = `${submission_id}_${uuidv4().slice(0, 8)}`;
  const tempDir = path.join('/tmp/runs', runId);
  await fs.mkdir(tempDir, { recursive: true });

  let container = null;
  const startTime = Date.now();

  try {
    // Write submission files and defined tests to isolated temp dir[cite: 1]
    for (const file of files) {
      const filePath = path.join(tempDir, file.name);
      await fs.writeFile(filePath, file.content, 'utf-8');
    }

    // Ephemeral container with restricted privileges to isolate untrusted code[cite: 1]
    container = await docker.createContainer({
      Image: image,
      Cmd: ['/bin/sh', '-c', command],
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

    // Pipe directly to host console while buffering for the API response
    const stdoutCollector = new ConsoleAndBufferCollector(process.stdout);
    const stderrCollector = new ConsoleAndBufferCollector(process.stderr);
    docker.modem.demuxStream(logStream, stdoutCollector, stderrCollector);

    await container.start();

    // Guard against infinite loops or stalling via synchronous flag and async kill[cite: 1]
    let timedOut = false;
    let timer;

    const timeoutPromise = new Promise((_, reject) => {
      timer = setTimeout(() => {
        timedOut = true;
        container.kill().catch(() => {});
        reject(new Error('EXECUTION_TIMEOUT'));
      }, timeout_seconds * 1000);
    });

    const waitPromise = container.wait().then((res) => {
      clearTimeout(timer);
      if (timedOut) {
        throw new Error('EXECUTION_TIMEOUT');
      }
      return res;
    });

    const result = await Promise.race([waitPromise, timeoutPromise]);
    const executionTimeMs = Date.now() - startTime;
    const exitCode = result.StatusCode;

    return {
      submission_id,
      room_id,
      status: exitCode === 0 ? 'passed' : 'failed',
      exit_code: exitCode,
      stdout: stdoutCollector.data,
      stderr: stderrCollector.data,
      output: (stdoutCollector.data + stderrCollector.data).trim(), // Combined convenience field for frontend terminals
      execution_time_ms: executionTimeMs
    };
  } catch (error) {
    const executionTimeMs = Date.now() - startTime;

    if (error.message === 'EXECUTION_TIMEOUT') {
      const timeoutNotice = `Process killed: execution exceeded ${timeout_seconds} seconds.\n`;
      process.stderr.write(timeoutNotice);

      return {
        submission_id,
        room_id,
        status: 'timeout',
        exit_code: -1,
        stdout: '',
        stderr: timeoutNotice.trim(),
        output: timeoutNotice.trim(),
        execution_time_ms: executionTimeMs
      };
    }

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
  } finally {
    if (container) {
      try {
        await container.remove({ force: true });
      } catch (_) {}
    }
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}