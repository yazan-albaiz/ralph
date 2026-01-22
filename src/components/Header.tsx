/**
 * Header Component - Status header with timing
 */

import React from 'react';
import { Box, Text } from 'ink';
import type { LoopStatus, RalphConfig } from '../types/index.js';

interface HeaderProps {
  config: RalphConfig;
  status: LoopStatus;
  iteration: number;
  totalElapsed: number;
}

// Status colors and icons
const STATUS_CONFIG: Record<LoopStatus, { icon: string; color: string }> = {
  idle: { icon: '○', color: 'gray' },
  running: { icon: '●', color: 'green' },
  paused: { icon: '◐', color: 'yellow' },
  completed: { icon: '✓', color: 'green' },
  blocked: { icon: '⚠', color: 'yellow' },
  decide: { icon: '?', color: 'cyan' },
  max_reached: { icon: '!', color: 'red' },
  cancelled: { icon: '✕', color: 'red' },
  error: { icon: '✕', color: 'red' },
};

/**
 * Format milliseconds to human readable string
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

export function Header({ config, status, iteration, totalElapsed }: HeaderProps) {
  const statusConfig = STATUS_CONFIG[status];

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor="blue"
      paddingX={2}
      paddingY={1}
    >
      {/* Title Row */}
      <Box justifyContent="space-between">
        <Box>
          <Text color="yellow" bold>
            RALPH
          </Text>
          <Text color="gray"> - Autonomous AI Coding Loop</Text>
        </Box>
        <Box>
          <Text color={statusConfig.color as never}>
            {statusConfig.icon} {status.toUpperCase()}
          </Text>
        </Box>
      </Box>

      {/* Separator */}
      <Box marginY={1}>
        <Text color="gray">{'─'.repeat(60)}</Text>
      </Box>

      {/* Info Row */}
      <Box justifyContent="space-between">
        <Box gap={2}>
          <Box>
            <Text color="gray">Model: </Text>
            <Text color="cyan">{config.model}</Text>
          </Box>
          <Box>
            <Text color="gray">Iteration: </Text>
            <Text color="yellow" bold>
              {iteration}
            </Text>
            <Text color="gray">/{config.maxIterations}</Text>
          </Box>
        </Box>
        <Box>
          <Text color="gray">Elapsed: </Text>
          <Text color="white">{formatDuration(totalElapsed)}</Text>
        </Box>
      </Box>

      {/* Project Root */}
      <Box marginTop={1}>
        <Text color="gray">Project: </Text>
        <Text color="blue" dimColor>
          {config.projectRoot.length > 50
            ? '...' + config.projectRoot.slice(-47)
            : config.projectRoot}
        </Text>
      </Box>
    </Box>
  );
}

/**
 * Compact header for smaller terminals
 */
export function CompactHeader({
  status,
  iteration,
  maxIterations,
  elapsed,
}: {
  status: LoopStatus;
  iteration: number;
  maxIterations: number;
  elapsed: number;
}) {
  const statusConfig = STATUS_CONFIG[status];

  return (
    <Box gap={2}>
      <Text color={statusConfig.color as never}>
        {statusConfig.icon} {status}
      </Text>
      <Text color="gray">|</Text>
      <Text>
        <Text color="yellow">{iteration}</Text>
        <Text color="gray">/{maxIterations}</Text>
      </Text>
      <Text color="gray">|</Text>
      <Text color="white">{formatDuration(elapsed)}</Text>
    </Box>
  );
}

export default Header;
