/**
 * IterationPanel Component - Current iteration display
 */

import React from 'react';
import { Box, Text } from 'ink';
import { Spinner, ProgressBar } from './Spinner.js';
import type { LoopStatus, ParsedPromiseTag } from '../types/index.js';

interface IterationPanelProps {
  iteration: number;
  maxIterations: number;
  status: LoopStatus;
  duration: number;
  promiseTag?: ParsedPromiseTag | null;
  output?: string[];
  unlimited?: boolean;
}

/**
 * Format duration to human readable
 */
function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}

/**
 * Get status icon and color
 */
function getStatusDisplay(status: LoopStatus): { icon: string; color: string; label: string } {
  switch (status) {
    case 'running':
      return { icon: '●', color: 'green', label: 'Running' };
    case 'completed':
      return { icon: '✓', color: 'green', label: 'Complete' };
    case 'blocked':
      return { icon: '⚠', color: 'yellow', label: 'Blocked' };
    case 'decide':
      return { icon: '?', color: 'cyan', label: 'Needs Decision' };
    case 'error':
      return { icon: '✕', color: 'red', label: 'Error' };
    case 'cancelled':
      return { icon: '✕', color: 'red', label: 'Cancelled' };
    case 'max_reached':
      return { icon: '!', color: 'red', label: 'Max Reached' };
    case 'paused':
      return { icon: '◐', color: 'yellow', label: 'Paused' };
    default:
      return { icon: '○', color: 'gray', label: 'Idle' };
  }
}

export function IterationPanel({
  iteration,
  maxIterations,
  status,
  duration,
  promiseTag,
  output = [],
  unlimited = false,
}: IterationPanelProps) {
  const statusDisplay = getStatusDisplay(status);

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={statusDisplay.color as never}
      paddingX={2}
      paddingY={1}
    >
      {/* Header */}
      <Box justifyContent="space-between">
        <Box>
          <Text color={statusDisplay.color as never} bold>
            {statusDisplay.icon}
          </Text>
          <Text bold> Iteration </Text>
          <Text color="yellow" bold>
            {iteration}
          </Text>
          {unlimited ? (
            <Text color="cyan"> ∞</Text>
          ) : (
            <Text color="gray">/{maxIterations}</Text>
          )}
        </Box>
        <Text color="gray">{formatDuration(duration)}</Text>
      </Box>

      {/* Progress bar - only show when not unlimited */}
      {!unlimited && (
        <Box marginY={1}>
          <ProgressBar current={iteration} total={maxIterations} width={40} />
        </Box>
      )}

      {/* Status */}
      <Box>
        {status === 'running' ? (
          <Spinner label={statusDisplay.label} />
        ) : (
          <Text color={statusDisplay.color as never}>{statusDisplay.label}</Text>
        )}
      </Box>

      {/* Promise tag info if present */}
      {promiseTag && promiseTag.type && (
        <Box marginTop={1} flexDirection="column">
          <Text color="gray">{'─'.repeat(40)}</Text>
          <Box marginTop={1}>
            <Text color={promiseTag.type === 'COMPLETE' ? 'green' : 'yellow'} bold>
              {promiseTag.type}
            </Text>
            {promiseTag.content && (
              <Text color="white">: {promiseTag.content}</Text>
            )}
          </Box>
        </Box>
      )}
    </Box>
  );
}

/**
 * Compact iteration display
 */
export function CompactIterationPanel({
  iteration,
  maxIterations,
  status,
  unlimited = false,
}: {
  iteration: number;
  maxIterations: number;
  status: LoopStatus;
  unlimited?: boolean;
}) {
  const statusDisplay = getStatusDisplay(status);

  return (
    <Box gap={2}>
      <Text color={statusDisplay.color as never}>{statusDisplay.icon}</Text>
      <Text>
        Iteration <Text color="yellow" bold>{iteration}</Text>
        {unlimited ? (
          <Text color="cyan"> ∞</Text>
        ) : (
          <Text color="gray">/{maxIterations}</Text>
        )}
      </Text>
    </Box>
  );
}

/**
 * Iteration history item
 */
export function IterationHistoryItem({
  number,
  duration,
  success,
  promiseType,
}: {
  number: number;
  duration: number;
  success: boolean;
  promiseType?: string | null;
}) {
  return (
    <Box gap={2}>
      <Text color="gray">#{number}</Text>
      <Text color={success ? 'green' : 'red'}>{success ? '✓' : '✕'}</Text>
      <Text color="gray">{formatDuration(duration)}</Text>
      {promiseType && (
        <Text color="cyan" dimColor>
          [{promiseType}]
        </Text>
      )}
    </Box>
  );
}

export default IterationPanel;
