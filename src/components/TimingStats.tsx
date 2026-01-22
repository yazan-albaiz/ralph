/**
 * TimingStats Component - Performance metrics display
 */

import React from 'react';
import { Box, Text } from 'ink';
import type { TimingStats as TimingStatsType } from '../types/index.js';

interface TimingStatsProps {
  stats: TimingStatsType;
  compact?: boolean;
}

/**
 * Format milliseconds to human readable string
 */
function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }

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
 * Format delta with sign and color
 */
function formatDelta(delta: number, direction: 'up' | 'down' | 'same'): {
  text: string;
  color: string;
} {
  const absValue = Math.abs(delta);
  const formatted = formatDuration(absValue);

  switch (direction) {
    case 'down':
      return { text: `-${formatted}`, color: 'green' };
    case 'up':
      return { text: `+${formatted}`, color: 'red' };
    case 'same':
    default:
      return { text: `±0`, color: 'yellow' };
  }
}

/**
 * Full timing stats display
 */
export function TimingStats({ stats, compact = false }: TimingStatsProps) {
  const delta = formatDelta(stats.lastDelta, stats.deltaDirection);

  if (compact) {
    return (
      <Box gap={2}>
        <Text>
          <Text color="gray">Total: </Text>
          <Text color="white">{formatDuration(stats.totalElapsed)}</Text>
        </Text>
        <Text color="gray">|</Text>
        <Text>
          <Text color="gray">Avg: </Text>
          <Text color="cyan">{formatDuration(stats.runningAverage)}</Text>
        </Text>
        <Text color="gray">|</Text>
        <Text>
          <Text color="gray">Last: </Text>
          <Text color="white">{formatDuration(stats.lastDuration)}</Text>
          <Text color={delta.color as never}> ({delta.text})</Text>
        </Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" borderStyle="single" borderColor="gray" paddingX={2} paddingY={1}>
      <Box marginBottom={1}>
        <Text color="cyan" bold>
          Performance Metrics
        </Text>
      </Box>

      <Box flexDirection="column" gap={0}>
        <Box justifyContent="space-between" width={50}>
          <Text color="gray">Total elapsed:</Text>
          <Text color="white" bold>
            {formatDuration(stats.totalElapsed)}
          </Text>
        </Box>

        <Box justifyContent="space-between" width={50}>
          <Text color="gray">Iterations completed:</Text>
          <Text color="yellow">{stats.iterationTimes.length}</Text>
        </Box>

        <Box justifyContent="space-between" width={50}>
          <Text color="gray">Average iteration:</Text>
          <Text color="cyan">{formatDuration(stats.runningAverage)}</Text>
        </Box>

        <Box justifyContent="space-between" width={50}>
          <Text color="gray">Last iteration:</Text>
          <Box>
            <Text color="white">{formatDuration(stats.lastDuration)}</Text>
            <Text color={delta.color as never}> ({delta.text})</Text>
          </Box>
        </Box>

        {/* Mini chart of last 5 iterations */}
        {stats.iterationTimes.length > 1 && (
          <Box marginTop={1}>
            <Text color="gray">Recent: </Text>
            <MiniChart times={stats.iterationTimes.slice(-5)} average={stats.runningAverage} />
          </Box>
        )}
      </Box>
    </Box>
  );
}

/**
 * Mini bar chart of iteration times
 */
function MiniChart({ times, average }: { times: number[]; average: number }) {
  const maxTime = Math.max(...times, average);
  const barWidth = 5;

  return (
    <Box gap={1}>
      {times.map((time, index) => {
        const height = Math.max(1, Math.round((time / maxTime) * barWidth));
        const isAboveAvg = time > average * 1.1;
        const isBelowAvg = time < average * 0.9;
        const color = isAboveAvg ? 'red' : isBelowAvg ? 'green' : 'yellow';

        return (
          <Text key={index} color={color}>
            {'█'.repeat(height)}
          </Text>
        );
      })}
    </Box>
  );
}

/**
 * Inline timing display
 */
export function InlineTiming({
  elapsed,
  iteration,
  average,
}: {
  elapsed: number;
  iteration: number;
  average: number;
}) {
  return (
    <Box gap={1}>
      <Text color="gray">[</Text>
      <Text color="white">{formatDuration(elapsed)}</Text>
      <Text color="gray">elapsed</Text>
      <Text color="gray">|</Text>
      <Text color="yellow">#{iteration}</Text>
      <Text color="gray">|</Text>
      <Text color="cyan">~{formatDuration(average)}</Text>
      <Text color="gray">/iter]</Text>
    </Box>
  );
}

export default TimingStats;
