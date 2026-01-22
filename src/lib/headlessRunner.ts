/**
 * Headless Runner - TUI-free execution mode for AFK/background operation
 *
 * Canonical Ralph Pattern:
 * - Prompts are STATIC (no iteration/context injection)
 * - Progress is tracked via FILES (progress.txt), not injected context
 * - Structured console output for monitoring
 */

import type {
  RalphConfig,
  LoopStatus,
  ClaudeProcessResult,
  HistoryEntry,
} from '../types/index.js';
import { runClaude, killActiveProcess } from './claude.js';
import { preparePrompt, requiresUserIntervention, indicatesCompletion } from './promiseParser.js';
import {
  createHistoryEntry,
  addIterationToHistory,
  finalizeHistoryEntry,
  saveHistoryEntry,
  createIterationRecord,
} from './history.js';
import {
  notifyComplete,
  notifyBlocked,
  notifyDecision,
  notifyMaxIterations,
} from './notifications.js';

interface HeadlessRunnerOptions {
  config: RalphConfig;
}

/**
 * Format timestamp for logs
 */
function formatTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Log with timestamp and level
 */
function log(level: 'INFO' | 'WARN' | 'ERROR' | 'OK', message: string): void {
  const timestamp = formatTimestamp();
  const prefix = {
    INFO: '\x1b[36m[INFO]\x1b[0m',
    WARN: '\x1b[33m[WARN]\x1b[0m',
    ERROR: '\x1b[31m[ERROR]\x1b[0m',
    OK: '\x1b[32m[OK]\x1b[0m',
  }[level];
  console.log(`[${timestamp}] ${prefix} ${message}`);
}

/**
 * Format duration in milliseconds to human readable
 */
function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}

/**
 * Run Ralph in headless mode (no TUI)
 */
export async function runHeadless({ config }: HeadlessRunnerOptions): Promise<void> {
  log('INFO', '═══════════════════════════════════════════════════════════════');
  log('INFO', 'RALPH - Autonomous AI Coding Loop (Headless Mode)');
  log('INFO', '═══════════════════════════════════════════════════════════════');
  log('INFO', `Model: ${config.model}`);
  log('INFO', `Max iterations: ${config.unlimited ? '∞ (unlimited)' : config.maxIterations}`);
  log('INFO', `Project root: ${config.projectRoot}`);
  log('INFO', `Prompt: ${config.prompt.substring(0, 100)}${config.prompt.length > 100 ? '...' : ''}`);
  log('INFO', '───────────────────────────────────────────────────────────────');

  let isRunning = true;
  let iteration = 0;
  let status: LoopStatus = 'running';
  const startTime = Date.now();
  let history: HistoryEntry = createHistoryEntry(config, config.prompt);

  // Handle SIGINT (Ctrl+C)
  let sigintCount = 0;
  const handleSigint = () => {
    sigintCount++;
    if (sigintCount === 1) {
      log('WARN', 'Received SIGINT - press Ctrl+C again to force exit');
      isRunning = false;
    } else {
      log('WARN', 'Force exiting...');
      killActiveProcess();
      process.exit(1);
    }
  };
  process.on('SIGINT', handleSigint);

  // Canonical ralph: prompt is static, no context injection
  const preparedPrompt = preparePrompt(config.prompt, config.completionSignal);

  const shouldContinue = () => isRunning && (config.unlimited || iteration < config.maxIterations);

  while (shouldContinue()) {
    iteration++;
    const iterationDisplay = config.unlimited ? `${iteration} (unlimited)` : `${iteration}/${config.maxIterations}`;
    log('INFO', `Starting iteration ${iterationDisplay}`);

    const iterationStartTime = new Date();
    const iterationStart = Date.now();

    try {
      const result: ClaudeProcessResult = await runClaude({
        prompt: preparedPrompt,
        model: config.model,
        dangerouslySkipPermissions: config.dangerouslySkipPermissions,
        projectRoot: config.projectRoot,
        sandbox: config.sandbox,
        onOutput: (chunk) => {
          // In headless mode, optionally stream output to console
          if (config.verbose) {
            process.stdout.write(chunk);
          }
        },
        onError: (error) => {
          log('ERROR', `Iteration ${iteration} error: ${error}`);
        },
      });

      const iterationDuration = Date.now() - iterationStart;
      log('INFO', `Iteration ${iteration} completed in ${formatDuration(iterationDuration)}`);

      // Record iteration in history
      const iterationRecord = createIterationRecord(iterationStartTime, result.output, result.promiseTag);
      history = addIterationToHistory(history, iterationRecord);

      // Check for completion
      if (result.promiseTag && indicatesCompletion(result.promiseTag)) {
        log('OK', `Task completed at iteration ${iteration}`);
        status = 'completed';
        const totalDuration = Date.now() - startTime;
        history = finalizeHistoryEntry(history, status, totalDuration);
        await saveHistoryEntry(history);
        await notifyComplete(iteration, totalDuration);
        break;
      }

      // Check for user intervention needed
      if (result.promiseTag && requiresUserIntervention(result.promiseTag)) {
        const { type: tagType, content } = result.promiseTag;
        const message = content ?? '';
        const isBlocked = tagType === 'BLOCKED';

        log('WARN', `${isBlocked ? 'BLOCKED' : 'DECISION NEEDED'}: ${message}`);
        status = isBlocked ? 'blocked' : 'decide';

        if (isBlocked) {
          await notifyBlocked(message);
        } else {
          await notifyDecision(message);
        }

        // In headless mode, we stop on blocked/decide since there's no way to resume
        log('WARN', 'Stopping headless execution - manual intervention required');
        break;
      }

      if (!result.success) {
        log('ERROR', `Iteration ${iteration} failed: ${result.error}`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      log('ERROR', `Iteration ${iteration} exception: ${errorMessage}`);
      status = 'error';
      break;
    }
  }

  // Final status
  const totalDuration = Date.now() - startTime;

  if (!config.unlimited && iteration >= config.maxIterations && status === 'running') {
    log('WARN', `Max iterations (${config.maxIterations}) reached`);
    status = 'max_reached';
    await notifyMaxIterations(config.maxIterations);
  } else if (!isRunning && status === 'running') {
    log('WARN', 'Loop cancelled by user');
    status = 'cancelled';
  }

  // Save final history
  if (status !== 'completed') {
    history = finalizeHistoryEntry(history, status as 'completed' | 'max_reached' | 'cancelled', totalDuration);
    await saveHistoryEntry(history);
  }

  log('INFO', '───────────────────────────────────────────────────────────────');
  log('INFO', `Final status: ${status.toUpperCase()}`);
  log('INFO', `Total iterations: ${iteration}`);
  log('INFO', `Total duration: ${formatDuration(totalDuration)}`);
  log('INFO', `History saved to: ~/.ralph/history/${history.id}.json`);
  log('INFO', '═══════════════════════════════════════════════════════════════');

  // Cleanup
  process.off('SIGINT', handleSigint);

  // Exit with appropriate code
  if (status === 'completed') {
    process.exit(0);
  } else if (status === 'error') {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

export default runHeadless;
