/**
 * useClaudeLoop Hook - Main orchestration for the Ralph loop
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type {
  RalphConfig,
  LoopState,
  LoopStatus,
  ParsedPromiseTag,
  HistoryEntry,
  ClaudeProcessResult,
} from '../types/index.js';
import { runClaude, killActiveProcess } from '../lib/claude.js';
import { preparePrompt, requiresUserIntervention, indicatesCompletion } from '../lib/promiseParser.js';
import {
  createHistoryEntry,
  addIterationToHistory,
  finalizeHistoryEntry,
  saveHistoryEntry,
  createIterationRecord,
} from '../lib/history.js';
import {
  notifyComplete,
  notifyBlocked,
  notifyDecision,
  notifyError,
  notifyMaxIterations,
} from '../lib/notifications.js';
import { logger } from '../lib/logger.js';

interface UseClaudeLoopOptions {
  config: RalphConfig;
  onIterationStart?: (iteration: number) => void;
  onIterationEnd?: (iteration: number, result: ClaudeProcessResult) => void;
  onOutput?: (chunk: string) => void;
  onStatusChange?: (status: LoopStatus) => void;
  onComplete?: (entry: HistoryEntry) => void;
}

interface UseClaudeLoopReturn {
  state: LoopState;
  start: (prompt?: string) => Promise<void>;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  reset: () => void;
}

/**
 * Main hook for orchestrating the Ralph loop
 */
export function useClaudeLoop(options: UseClaudeLoopOptions): UseClaudeLoopReturn {
  const { config, onIterationStart, onIterationEnd, onOutput, onStatusChange, onComplete } = options;

  const [state, setState] = useState<LoopState>({
    status: 'idle',
    currentIteration: 0,
    output: [],
    lastPromiseTag: null,
    error: null,
  });

  const historyRef = useRef<HistoryEntry | null>(null);
  const isRunningRef = useRef(false);
  const isPausedRef = useRef(false);
  const startTimeRef = useRef<number>(0);

  /**
   * Update state and notify of status change
   */
  const updateStatus = useCallback(
    (status: LoopStatus) => {
      setState((prev) => ({ ...prev, status }));
      onStatusChange?.(status);
    },
    [onStatusChange]
  );

  /**
   * Run a single iteration
   */
  const runIteration = useCallback(
    async (iteration: number, prompt: string): Promise<ClaudeProcessResult> => {
      const iterationStartTime = new Date();

      onIterationStart?.(iteration);

      // Prepare the prompt with PROJECT_ROOT, loop context, and completion instructions
      const preparedPrompt = preparePrompt(
        prompt,
        config.projectRoot,
        config.completionSignal,
        {
          currentIteration: iteration,
          maxIterations: config.maxIterations,
          isFirstIteration: iteration === 1,
        }
      );

      // Run Claude
      const result = await runClaude({
        prompt: preparedPrompt,
        model: config.model,
        dangerouslySkipPermissions: config.dangerouslySkipPermissions,
        projectRoot: config.projectRoot,
        onOutput: (chunk) => {
          setState((prev) => ({
            ...prev,
            output: [...prev.output, chunk],
          }));
          onOutput?.(chunk);
        },
        onError: (error) => {
          logger.error(`Iteration ${iteration} error: ${error}`);
        },
      });

      onIterationEnd?.(iteration, result);

      // Add to history
      if (historyRef.current) {
        const iterationRecord = createIterationRecord(
          iterationStartTime,
          result.output,
          result.promiseTag
        );
        historyRef.current = addIterationToHistory(historyRef.current, iterationRecord);
      }

      return result;
    },
    [config, onIterationStart, onIterationEnd, onOutput]
  );

  /**
   * Main loop execution
   */
  const executeLoop = useCallback(
    async (prompt: string) => {
      isRunningRef.current = true;
      startTimeRef.current = Date.now();

      // Create history entry
      historyRef.current = createHistoryEntry(config, prompt);

      let iteration = 0;
      let lastResult: ClaudeProcessResult | null = null;

      while (isRunningRef.current && iteration < config.maxIterations) {
        // Check if paused
        while (isPausedRef.current && isRunningRef.current) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }

        if (!isRunningRef.current) break;

        iteration++;
        setState((prev) => ({ ...prev, currentIteration: iteration }));

        logger.info(`Starting iteration ${iteration}/${config.maxIterations}`);

        try {
          lastResult = await runIteration(iteration, prompt);

          // Update state with result
          setState((prev) => ({
            ...prev,
            lastPromiseTag: lastResult?.promiseTag || null,
          }));

          // Check for completion
          if (lastResult.promiseTag && indicatesCompletion(lastResult.promiseTag)) {
            logger.ok(`Task completed at iteration ${iteration}`);
            updateStatus('completed');

            const totalDuration = Date.now() - startTimeRef.current;
            if (historyRef.current) {
              historyRef.current = finalizeHistoryEntry(historyRef.current, 'completed', totalDuration);
              await saveHistoryEntry(historyRef.current);
              onComplete?.(historyRef.current);
            }

            await notifyComplete(iteration, totalDuration);
            isRunningRef.current = false;
            return;
          }

          // Check for blocked/decide
          if (lastResult.promiseTag && requiresUserIntervention(lastResult.promiseTag)) {
            const tagType = lastResult.promiseTag.type;
            const content = lastResult.promiseTag.content || '';

            if (tagType === 'BLOCKED') {
              logger.warn(`Blocked at iteration ${iteration}: ${content}`);
              updateStatus('blocked');
              await notifyBlocked(content);
            } else if (tagType === 'DECIDE') {
              logger.warn(`Decision needed at iteration ${iteration}: ${content}`);
              updateStatus('decide');
              await notifyDecision(content);
            }

            // Pause the loop
            isPausedRef.current = true;
            continue;
          }

          // Check for errors
          if (!lastResult.success) {
            logger.error(`Iteration ${iteration} failed: ${lastResult.error}`);
            // Continue anyway - Ralph is persistent
          }
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : String(err);
          logger.error(`Iteration ${iteration} exception: ${errorMessage}`);
          setState((prev) => ({ ...prev, error: errorMessage }));
        }
      }

      // Handle completion states
      if (iteration >= config.maxIterations) {
        logger.warn(`Max iterations (${config.maxIterations}) reached`);
        updateStatus('max_reached');

        const totalDuration = Date.now() - startTimeRef.current;
        if (historyRef.current) {
          historyRef.current = finalizeHistoryEntry(historyRef.current, 'max_reached', totalDuration);
          await saveHistoryEntry(historyRef.current);
          onComplete?.(historyRef.current);
        }

        await notifyMaxIterations(config.maxIterations);
      } else if (!isRunningRef.current && state.status !== 'completed') {
        updateStatus('cancelled');

        const totalDuration = Date.now() - startTimeRef.current;
        if (historyRef.current) {
          historyRef.current = finalizeHistoryEntry(historyRef.current, 'cancelled', totalDuration);
          await saveHistoryEntry(historyRef.current);
          onComplete?.(historyRef.current);
        }
      }

      isRunningRef.current = false;
    },
    [config, runIteration, updateStatus, onComplete, state.status]
  );

  /**
   * Start the loop
   */
  const start = useCallback(
    async (prompt?: string) => {
      const effectivePrompt = prompt || config.prompt;

      if (!effectivePrompt) {
        logger.error('No prompt provided');
        setState((prev) => ({ ...prev, error: 'No prompt provided' }));
        return;
      }

      setState({
        status: 'running',
        currentIteration: 0,
        output: [],
        lastPromiseTag: null,
        error: null,
      });

      updateStatus('running');
      await executeLoop(effectivePrompt);
    },
    [config.prompt, executeLoop, updateStatus]
  );

  /**
   * Pause the loop
   */
  const pause = useCallback(() => {
    isPausedRef.current = true;
    updateStatus('paused');
  }, [updateStatus]);

  /**
   * Resume the loop
   */
  const resume = useCallback(() => {
    isPausedRef.current = false;
    if (isRunningRef.current) {
      updateStatus('running');
    }
  }, [updateStatus]);

  /**
   * Stop the loop
   */
  const stop = useCallback(() => {
    isRunningRef.current = false;
    isPausedRef.current = false;
    killActiveProcess();
    updateStatus('cancelled');
  }, [updateStatus]);

  /**
   * Reset the loop state
   */
  const reset = useCallback(() => {
    isRunningRef.current = false;
    isPausedRef.current = false;
    killActiveProcess();
    historyRef.current = null;

    setState({
      status: 'idle',
      currentIteration: 0,
      output: [],
      lastPromiseTag: null,
      error: null,
    });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isRunningRef.current = false;
      killActiveProcess();
    };
  }, []);

  return {
    state,
    start,
    pause,
    resume,
    stop,
    reset,
  };
}

export default useClaudeLoop;
