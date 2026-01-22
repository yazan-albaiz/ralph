/**
 * Pre-flight Checks - Verify environment before running
 */

import { existsSync } from 'node:fs';
import { access, constants } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';
import type { PreflightCheck, PreflightResult, RalphConfig } from '../types/index.js';
import { logger } from './logger.js';

// Valid Claude models
const VALID_MODELS = ['opus', 'sonnet', 'haiku', 'opus-4', 'sonnet-4', 'sonnet-3.5'];

/**
 * Check if a command exists in PATH
 */
async function commandExists(command: string): Promise<boolean> {
  const { exec } = await import('node:child_process');
  const { promisify } = await import('node:util');
  const execAsync = promisify(exec);

  try {
    await execAsync(`which ${command}`);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if current directory is a git repository
 */
async function isGitRepo(path: string): Promise<boolean> {
  const gitDir = join(path, '.git');
  return existsSync(gitDir);
}

/**
 * Check if a file is readable
 */
async function isFileReadable(path: string): Promise<boolean> {
  try {
    await access(path, constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check Claude CLI is installed
 */
async function checkClaudeCli(): Promise<PreflightCheck> {
  const exists = await commandExists('claude');
  return {
    name: 'Claude CLI',
    passed: exists,
    message: exists ? 'Claude CLI is installed' : 'Claude CLI not found in PATH. Install it from https://claude.ai/code',
    fatal: true,
  };
}

/**
 * Check prompt file exists (if file path provided)
 *
 * Note: By the time preflight runs, the file has already been loaded
 * in cli.tsx. If isFile is true, the file was successfully read.
 * This check now just confirms the prompt content exists.
 */
async function checkPromptFile(config: RalphConfig): Promise<PreflightCheck> {
  if (!config.isFile) {
    return {
      name: 'Prompt File',
      passed: true,
      message: 'Using inline prompt (no file check needed)',
      fatal: false,
    };
  }

  // If isFile is true, the file was already successfully loaded in cli.tsx
  // config.prompt now contains the file content, not the file path
  // We just verify that content was actually loaded
  const hasContent = Boolean(config.prompt && config.prompt.length > 0);

  return {
    name: 'Prompt File',
    passed: hasContent,
    message: hasContent
      ? 'Prompt loaded from file successfully'
      : 'Prompt file was empty or failed to load',
    fatal: !hasContent,
  };
}

/**
 * Check if current directory is a git repo (warning only)
 */
async function checkGitRepo(config: RalphConfig): Promise<PreflightCheck> {
  const isRepo = await isGitRepo(config.projectRoot);
  return {
    name: 'Git Repository',
    passed: isRepo,
    message: isRepo
      ? 'Current directory is a git repository'
      : 'Current directory is not a git repository (recommended for version control)',
    fatal: false,
  };
}

/**
 * Check ~/.ralph directory exists or can be created
 */
async function checkRalphDir(): Promise<PreflightCheck> {
  const ralphDir = join(homedir(), '.ralph');
  const exists = existsSync(ralphDir);

  if (!exists) {
    // Try to create it
    try {
      const { mkdir } = await import('node:fs/promises');
      await mkdir(ralphDir, { recursive: true });
      return {
        name: 'Ralph Directory',
        passed: true,
        message: `Created ~/.ralph directory`,
        fatal: false,
      };
    } catch (err) {
      return {
        name: 'Ralph Directory',
        passed: false,
        message: `Failed to create ~/.ralph directory: ${err}`,
        fatal: true,
      };
    }
  }

  return {
    name: 'Ralph Directory',
    passed: true,
    message: '~/.ralph directory exists',
    fatal: false,
  };
}

/**
 * Check model is valid
 */
function checkModelValid(config: RalphConfig): PreflightCheck {
  const isValid = VALID_MODELS.includes(config.model);
  return {
    name: 'Model',
    passed: isValid,
    message: isValid
      ? `Model "${config.model}" is valid`
      : `Invalid model "${config.model}". Valid models: ${VALID_MODELS.join(', ')}`,
    fatal: true,
  };
}

/**
 * Check for existing ralph process (prevent duplicates)
 */
async function checkNoExistingProcess(): Promise<PreflightCheck> {
  const { exec } = await import('node:child_process');
  const { promisify } = await import('node:util');
  const execAsync = promisify(exec);

  try {
    const { stdout } = await execAsync('pgrep -f "ralph-cli"');
    const pids = stdout.trim().split('\n').filter(Boolean);
    // Exclude current process
    const currentPid = process.pid.toString();
    const otherPids = pids.filter((pid) => pid !== currentPid);

    if (otherPids.length > 0) {
      return {
        name: 'No Duplicate Process',
        passed: false,
        message: `Another ralph process is running (PID: ${otherPids.join(', ')})`,
        fatal: false, // Warning only, don't block
      };
    }
  } catch {
    // pgrep returns non-zero if no processes found, which is fine
  }

  return {
    name: 'No Duplicate Process',
    passed: true,
    message: 'No other ralph process running',
    fatal: false,
  };
}

/**
 * Check max iterations is reasonable
 */
function checkMaxIterations(config: RalphConfig): PreflightCheck {
  const MAX_SAFE = 500;
  const isReasonable = config.maxIterations > 0 && config.maxIterations <= MAX_SAFE;

  return {
    name: 'Max Iterations',
    passed: isReasonable,
    message: isReasonable
      ? `Max iterations set to ${config.maxIterations}`
      : `Max iterations (${config.maxIterations}) should be between 1 and ${MAX_SAFE}`,
    fatal: !isReasonable && config.maxIterations <= 0,
  };
}

/**
 * Run all pre-flight checks
 */
export async function runPreflightChecks(config: RalphConfig): Promise<PreflightResult> {
  logger.info('Running pre-flight checks...');

  const checks: PreflightCheck[] = await Promise.all([
    checkClaudeCli(),
    checkPromptFile(config),
    checkGitRepo(config),
    checkRalphDir(),
    Promise.resolve(checkModelValid(config)),
    checkNoExistingProcess(),
    Promise.resolve(checkMaxIterations(config)),
  ]);

  const errors = checks.filter((c) => !c.passed && c.fatal);
  const warnings = checks.filter((c) => !c.passed && !c.fatal);
  const passed = errors.length === 0;

  // Log results
  for (const check of checks) {
    if (check.passed) {
      logger.ok(check.message);
    } else if (check.fatal) {
      logger.error(check.message);
    } else {
      logger.warn(check.message);
    }
  }

  return {
    passed,
    checks,
    errors,
    warnings,
  };
}

/**
 * Format pre-flight results for display
 */
export function formatPreflightResults(result: PreflightResult): string {
  const lines: string[] = [];

  if (result.passed) {
    lines.push('All pre-flight checks passed!');
  } else {
    lines.push('Pre-flight checks failed:');
    for (const error of result.errors) {
      lines.push(`  - ${error.message}`);
    }
  }

  if (result.warnings.length > 0) {
    lines.push('\nWarnings:');
    for (const warning of result.warnings) {
      lines.push(`  - ${warning.message}`);
    }
  }

  return lines.join('\n');
}

export const preflight = {
  runPreflightChecks,
  formatPreflightResults,
};

export default preflight;
