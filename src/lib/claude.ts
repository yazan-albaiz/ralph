/**
 * Claude CLI Wrapper - Spawn and manage Claude CLI processes
 */

import { spawn, type ChildProcess } from 'node:child_process';
import type { ClaudeProcessOptions, ClaudeProcessResult, SpawnConfig } from '../types/index.js';
import { parsePromiseTag } from './promiseParser.js';
import { logger } from './logger.js';

let activeProcess: ChildProcess | null = null;

const EMPTY_PROMISE_TAG: ReturnType<typeof parsePromiseTag> = { type: null, content: null, raw: null };

export function killActiveProcess(): boolean {
  if (activeProcess && !activeProcess.killed) {
    activeProcess.kill('SIGTERM');
    activeProcess = null;
    return true;
  }
  return false;
}

export function buildClaudeArgs(options: ClaudeProcessOptions): string[] {
  const args: string[] = [];

  // Always use print mode for non-interactive operation
  args.push('--print');

  // Model selection
  args.push('--model', options.model);

  // Skip permissions when enabled
  if (options.dangerouslySkipPermissions) {
    args.push('--dangerously-skip-permissions');
  } else {
    args.push('--permission-mode', 'acceptEdits');
  }

  // Output format
  args.push('--output-format', 'text');

  // The prompt itself (must be last)
  args.push('-p', options.prompt);

  return args;
}

export function buildSpawnConfig(options: ClaudeProcessOptions): SpawnConfig {
  const claudeArgs = buildClaudeArgs(options);

  if (options.sandbox) {
    return {
      command: 'docker',
      args: ['sandbox', 'run', '--credentials', 'host', 'claude', ...claudeArgs],
    };
  }

  return {
    command: 'claude',
    args: claudeArgs,
  };
}

export async function runClaude(options: ClaudeProcessOptions): Promise<ClaudeProcessResult> {
  const startTime = Date.now();
  const spawnConfig = buildSpawnConfig(options);

  logger.debug('Running Claude CLI', { args: [spawnConfig.command, ...spawnConfig.args].join(' ') });

  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    let hasError = false;

    const proc = spawn(spawnConfig.command, spawnConfig.args, {
      cwd: options.projectRoot,
      env: { ...process.env, TERM: 'dumb' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    activeProcess = proc;

    proc.stdout.on('data', (chunk: Buffer) => {
      const text = chunk.toString();
      stdout += text;
      logger.debug(`[OUTPUT] Received ${text.length} chars`);
      options.onOutput?.(text);
    });

    proc.stderr.on('data', (chunk: Buffer) => {
      const text = chunk.toString();
      stderr += text;
      options.onError?.(text);
    });

    proc.on('close', (code) => {
      activeProcess = null;
      const duration = Date.now() - startTime;
      const promiseTag = parsePromiseTag(stdout);

      if (code !== 0 && !promiseTag.type) {
        hasError = true;
        logger.debug(`Claude process exited with code ${code}`);
      }

      resolve({
        success: !hasError,
        output: stdout,
        error: hasError ? stderr || `Process exited with code ${code}` : null,
        duration,
        promiseTag,
      });
    });

    proc.on('error', (err) => {
      activeProcess = null;
      logger.error('Claude process error', err);

      resolve({
        success: false,
        output: stdout,
        error: err.message,
        duration: Date.now() - startTime,
        promiseTag: EMPTY_PROMISE_TAG,
      });
    });
  });
}

/**
 * Run Claude CLI with timeout
 */
export async function runClaudeWithTimeout(
  options: ClaudeProcessOptions,
  timeoutMs: number = 30 * 60 * 1000 // 30 minutes default
): Promise<ClaudeProcessResult> {
  return new Promise((resolve) => {
    let resolved = false;

    // Set up timeout
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        killActiveProcess();
        resolve({
          success: false,
          output: '',
          error: `Claude process timed out after ${Math.round(timeoutMs / 1000)} seconds`,
          duration: timeoutMs,
          promiseTag: { type: null, content: null, raw: null },
        });
      }
    }, timeoutMs);

    // Run the process
    runClaude(options).then((result) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        resolve(result);
      }
    });
  });
}

/**
 * Check if Claude CLI is available
 */
export async function isClaudeAvailable(): Promise<boolean> {
  return new Promise((resolve) => {
    const proc = spawn('claude', ['--version'], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    proc.on('close', (code) => {
      resolve(code === 0);
    });

    proc.on('error', () => {
      resolve(false);
    });
  });
}

/**
 * Get Claude CLI version
 */
export async function getClaudeVersion(): Promise<string | null> {
  return new Promise((resolve) => {
    let output = '';

    const proc = spawn('claude', ['--version'], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    proc.stdout.on('data', (chunk: Buffer) => {
      output += chunk.toString();
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve(output.trim());
      } else {
        resolve(null);
      }
    });

    proc.on('error', () => {
      resolve(null);
    });
  });
}

/**
 * Create a mock Claude runner for testing
 */
export function createMockClaudeRunner(
  mockOutput: string,
  mockDelay: number = 100
): (options: ClaudeProcessOptions) => Promise<ClaudeProcessResult> {
  return async (options: ClaudeProcessOptions): Promise<ClaudeProcessResult> => {
    const startTime = Date.now();

    // Simulate delay
    await new Promise((resolve) => setTimeout(resolve, mockDelay));

    // Stream output in chunks if callback provided
    if (options.onOutput) {
      const chunkSize = 50;
      for (let i = 0; i < mockOutput.length; i += chunkSize) {
        options.onOutput(mockOutput.slice(i, i + chunkSize));
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
    }

    const promiseTag = parsePromiseTag(mockOutput);

    return {
      success: true,
      output: mockOutput,
      error: null,
      duration: Date.now() - startTime,
      promiseTag,
    };
  };
}

export const claude = {
  runClaude,
  runClaudeWithTimeout,
  killActiveProcess,
  buildClaudeArgs,
  buildSpawnConfig,
  isClaudeAvailable,
  getClaudeVersion,
  createMockClaudeRunner,
};

export default claude;
