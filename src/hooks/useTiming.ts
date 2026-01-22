/**
 * useTiming Hook - Timing and performance tracking
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type { TimingStats } from '../types/index.js';

interface UseTimingReturn {
  stats: TimingStats;
  startIteration: () => void;
  endIteration: () => void;
  reset: () => void;
}

/**
 * Calculate delta direction based on threshold
 */
function getDeltaDirection(
  current: number,
  average: number,
  threshold = 0.1
): 'up' | 'down' | 'same' {
  if (average === 0) return 'same';

  const ratio = (current - average) / average;

  if (ratio > threshold) return 'up';
  if (ratio < -threshold) return 'down';
  return 'same';
}

/**
 * Hook for tracking timing and performance metrics
 */
export function useTiming(): UseTimingReturn {
  const [stats, setStats] = useState<TimingStats>({
    startTime: Date.now(),
    totalElapsed: 0,
    iterationTimes: [],
    runningAverage: 0,
    lastDuration: 0,
    lastDelta: 0,
    deltaDirection: 'same',
  });

  const iterationStartRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  // Update total elapsed time periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setStats((prev) => ({
        ...prev,
        totalElapsed: Date.now() - startTimeRef.current,
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  /**
   * Start timing a new iteration
   */
  const startIteration = useCallback(() => {
    iterationStartRef.current = Date.now();
  }, []);

  /**
   * End the current iteration and record timing
   */
  const endIteration = useCallback(() => {
    if (iterationStartRef.current === null) {
      return;
    }

    const duration = Date.now() - iterationStartRef.current;
    iterationStartRef.current = null;

    setStats((prev) => {
      const newIterationTimes = [...prev.iterationTimes, duration];
      const totalIterationTime = newIterationTimes.reduce((a, b) => a + b, 0);
      const newAverage = Math.round(totalIterationTime / newIterationTimes.length);

      const delta = duration - prev.runningAverage;
      const deltaDirection = getDeltaDirection(duration, prev.runningAverage);

      return {
        ...prev,
        iterationTimes: newIterationTimes,
        runningAverage: newAverage,
        lastDuration: duration,
        lastDelta: delta,
        deltaDirection,
        totalElapsed: Date.now() - startTimeRef.current,
      };
    });
  }, []);

  /**
   * Reset all timing stats
   */
  const reset = useCallback(() => {
    startTimeRef.current = Date.now();
    iterationStartRef.current = null;

    setStats({
      startTime: Date.now(),
      totalElapsed: 0,
      iterationTimes: [],
      runningAverage: 0,
      lastDuration: 0,
      lastDelta: 0,
      deltaDirection: 'same',
    });
  }, []);

  return {
    stats,
    startIteration,
    endIteration,
    reset,
  };
}

/**
 * Format timing stats for display
 */
export function formatTimingStats(stats: TimingStats): string {
  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  };

  const deltaSign = stats.lastDelta >= 0 ? '+' : '';
  const deltaColor =
    stats.deltaDirection === 'down' ? 'green' : stats.deltaDirection === 'up' ? 'red' : 'yellow';

  return [
    `Total: ${formatDuration(stats.totalElapsed)}`,
    `Iter avg: ${formatDuration(stats.runningAverage)}`,
    `Last: ${formatDuration(stats.lastDuration)} (${deltaSign}${formatDuration(Math.abs(stats.lastDelta))})`,
  ].join(' | ');
}

/**
 * Create initial timing stats
 */
export function createInitialTimingStats(): TimingStats {
  return {
    startTime: Date.now(),
    totalElapsed: 0,
    iterationTimes: [],
    runningAverage: 0,
    lastDuration: 0,
    lastDelta: 0,
    deltaDirection: 'same',
  };
}

export default useTiming;
