/**
 * useClaudeLoop Hook - Main orchestration for the Ralph loop
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type {
  RalphConfig,
  LoopState,
  LoopStatus,
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

  const updateStatus = useCallback(
    (status: LoopStatus) => {
      setState((prev) => ({ ...prev, status }));
      onStatusChange?.(status);
    },
    [onStatusChange]
  );

  const runIteration = useCallback(
    async (iteration: number, prompt: string): Promise<ClaudeProcessResult> => {
      const iterationStartTime = new Date();
      onIterationStart?.(iteration);

      const preparedPrompt = preparePrompt(prompt, config.projectRoot, config.completionSignal, {
        currentIteration: iteration,
        maxIterations: config.maxIterations,
        isFirstIteration: iteration === 1,
      });

      const result = await runClaude({
        prompt: preparedPrompt,
        model: config.model,
        dangerouslySkipPermissions: config.dangerouslySkipPermissions,
        projectRoot: config.projectRoot,
        onOutput: (chunk) => {
          logger.debug(`[STREAM] Received chunk: ${chunk.length} chars`);
          setState((prev) => ({ ...prev, output: [...prev.output, chunk] }));
          onOutput?.(chunk);
        },
        onError: (error) => {
          logger.error(`Iteration ${iteration} error: ${error}`);
        },
      });

      // Fallback for Claude CLI's -p mode which may buffer all output until completion
      if (result.output && result.output.length > 0) {
        logger.debug(`[RESULT] Final output: ${result.output.length} chars`);
        setState((prev) => {
          if (prev.output.length === 0) {
            logger.debug('[FALLBACK] Using result output since streaming captured nothing');
            return { ...prev, output: [result.output] };
          }
          return prev;
        });
      }

      onIterationEnd?.(iteration, result);

      if (historyRef.current) {
        const iterationRecord = createIterationRecord(iterationStartTime, result.output, result.promiseTag);
        historyRef.current = addIterationToHistory(historyRef.current, iterationRecord);
      }

      return result;
    },
    [config, onIterationStart, onIterationEnd, onOutput]
  );

  const finalizeAndSave = useCallback(
    async (result: 'completed' | 'max_reached' | 'cancelled') => {
      const totalDuration = Date.now() - startTimeRef.current;
      if (historyRef.current) {
        historyRef.current = finalizeHistoryEntry(historyRef.current, result, totalDuration);
        await saveHistoryEntry(historyRef.current);
        onComplete?.(historyRef.current);
      }
      return totalDuration;
    },
    [onComplete]
  );

  const executeLoop = useCallback(
    async (prompt: string) => {
      isRunningRef.current = true;
      startTimeRef.current = Date.now();
      historyRef.current = createHistoryEntry(config, prompt);

      let iteration = 0;
      let lastResult: ClaudeProcessResult | null = null;

      while (isRunningRef.current && iteration < config.maxIterations) {
        while (isPausedRef.current && isRunningRef.current) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }

        if (!isRunningRef.current) break;

        iteration++;
        setState((prev) => ({ ...prev, currentIteration: iteration }));
        logger.info(`Starting iteration ${iteration}/${config.maxIterations}`);

        try {
          lastResult = await runIteration(iteration, prompt);
          setState((prev) => ({ ...prev, lastPromiseTag: lastResult?.promiseTag ?? null }));

          if (lastResult.promiseTag && indicatesCompletion(lastResult.promiseTag)) {
            logger.ok(`Task completed at iteration ${iteration}`);
            updateStatus('completed');
            const totalDuration = await finalizeAndSave('completed');
            await notifyComplete(iteration, totalDuration);
            isRunningRef.current = false;
            return;
          }

          if (lastResult.promiseTag && requiresUserIntervention(lastResult.promiseTag)) {
            const { type: tagType, content } = lastResult.promiseTag;
            const message = content ?? '';
            const isBlocked = tagType === 'BLOCKED';

            logger.warn(`${isBlocked ? 'Blocked' : 'Decision needed'} at iteration ${iteration}: ${message}`);
            updateStatus(isBlocked ? 'blocked' : 'decide');
            await (isBlocked ? notifyBlocked(message) : notifyDecision(message));

            isPausedRef.current = true;
            continue;
          }

          if (!lastResult.success) {
            logger.error(`Iteration ${iteration} failed: ${lastResult.error}`);
          }
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : String(err);
          logger.error(`Iteration ${iteration} exception: ${errorMessage}`);
          setState((prev) => ({ ...prev, error: errorMessage }));
        }
      }

      if (iteration >= config.maxIterations) {
        logger.warn(`Max iterations (${config.maxIterations}) reached`);
        updateStatus('max_reached');
        await finalizeAndSave('max_reached');
        await notifyMaxIterations(config.maxIterations);
      } else if (!isRunningRef.current && state.status !== 'completed') {
        updateStatus('cancelled');
        await finalizeAndSave('cancelled');
      }

      isRunningRef.current = false;
    },
    [config, runIteration, updateStatus, finalizeAndSave, state.status]
  );

  const start = useCallback(
    async (prompt?: string) => {
      const effectivePrompt = prompt ?? config.prompt;

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

  const pause = useCallback(() => {
    isPausedRef.current = true;
    updateStatus('paused');
  }, [updateStatus]);

  const resume = useCallback(() => {
    isPausedRef.current = false;
    if (isRunningRef.current) {
      updateStatus('running');
    }
  }, [updateStatus]);

  const stop = useCallback(() => {
    isRunningRef.current = false;
    isPausedRef.current = false;
    killActiveProcess();
    updateStatus('cancelled');
  }, [updateStatus]);

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
