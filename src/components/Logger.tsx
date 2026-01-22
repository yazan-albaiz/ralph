/**
 * Logger Component - Structured colored log output for Ink
 */

import React from 'react';
import { Box, Text } from 'ink';
import type { LogLevel, LogEntry } from '../types/index.js';

// Color mapping for log levels
const LEVEL_COLORS: Record<LogLevel, string> = {
  INFO: 'blue',
  OK: 'green',
  WARN: 'yellow',
  ERROR: 'red',
  DEBUG: 'gray',
};

// Icons for log levels
const LEVEL_ICONS: Record<LogLevel, string> = {
  INFO: 'ℹ',
  OK: '✓',
  WARN: '⚠',
  ERROR: '✕',
  DEBUG: '•',
};

interface LogLineProps {
  level: LogLevel;
  message: string;
  timestamp?: Date;
  showTimestamp?: boolean;
}

/**
 * Single log line component
 */
export function LogLine({ level, message, timestamp, showTimestamp = true }: LogLineProps) {
  const color = LEVEL_COLORS[level];
  const icon = LEVEL_ICONS[level];

  const timeStr = timestamp
    ? `${timestamp.getHours().toString().padStart(2, '0')}:${timestamp.getMinutes().toString().padStart(2, '0')}:${timestamp.getSeconds().toString().padStart(2, '0')}`
    : '';

  return (
    <Box>
      {showTimestamp && timestamp && (
        <Text color="gray" dimColor>
          [{timeStr}]{' '}
        </Text>
      )}
      <Text color={color as never}>{icon} </Text>
      <Text color={color as never}>[{level.padEnd(5)}]</Text>
      <Text> {message}</Text>
    </Box>
  );
}

interface LogViewerProps {
  entries: LogEntry[];
  maxLines?: number;
  showTimestamps?: boolean;
  filter?: LogLevel[];
}

/**
 * Log viewer component showing recent log entries
 */
export function LogViewer({
  entries,
  maxLines = 20,
  showTimestamps = true,
  filter,
}: LogViewerProps) {
  // Filter entries if filter is provided
  const filteredEntries = filter
    ? entries.filter((e) => filter.includes(e.level))
    : entries;

  // Get last N entries
  const displayEntries = filteredEntries.slice(-maxLines);

  return (
    <Box flexDirection="column" borderStyle="single" borderColor="gray" paddingX={1}>
      <Box marginBottom={1}>
        <Text color="cyan" bold>
          Log
        </Text>
        <Text color="gray"> ({displayEntries.length} entries)</Text>
      </Box>

      {displayEntries.length === 0 ? (
        <Text color="gray" dimColor>
          No log entries yet...
        </Text>
      ) : (
        displayEntries.map((entry, index) => (
          <LogLine
            key={index}
            level={entry.level}
            message={entry.message}
            timestamp={entry.timestamp}
            showTimestamp={showTimestamps}
          />
        ))
      )}
    </Box>
  );
}

/**
 * Inline status message
 */
export function StatusMessage({
  level,
  message,
}: {
  level: LogLevel;
  message: string;
}) {
  const color = LEVEL_COLORS[level];
  const icon = LEVEL_ICONS[level];

  return (
    <Box>
      <Text color={color as never}>{icon} </Text>
      <Text>{message}</Text>
    </Box>
  );
}

/**
 * Success message shorthand
 */
export function SuccessMessage({ message }: { message: string }) {
  return <StatusMessage level="OK" message={message} />;
}

/**
 * Error message shorthand
 */
export function ErrorMessage({ message }: { message: string }) {
  return <StatusMessage level="ERROR" message={message} />;
}

/**
 * Warning message shorthand
 */
export function WarningMessage({ message }: { message: string }) {
  return <StatusMessage level="WARN" message={message} />;
}

/**
 * Info message shorthand
 */
export function InfoMessage({ message }: { message: string }) {
  return <StatusMessage level="INFO" message={message} />;
}

/**
 * Blocked/Decision notification box
 */
interface NotificationBoxProps {
  type: 'blocked' | 'decide' | 'error' | 'complete';
  title: string;
  message: string;
  instructions?: string;
}

export function NotificationBox({ type, title, message, instructions }: NotificationBoxProps) {
  const colors: Record<string, string> = {
    blocked: 'yellow',
    decide: 'cyan',
    error: 'red',
    complete: 'green',
  };

  const icons: Record<string, string> = {
    blocked: '⚠',
    decide: '?',
    error: '✕',
    complete: '✓',
  };

  const borderColor = colors[type] || 'gray';
  const icon = icons[type] || '•';

  return (
    <Box
      flexDirection="column"
      borderStyle="double"
      borderColor={borderColor as never}
      paddingX={2}
      paddingY={1}
    >
      <Box>
        <Text color={borderColor as never} bold>
          {icon} {title}
        </Text>
      </Box>
      <Box marginY={1}>
        <Text>{message}</Text>
      </Box>
      {instructions && (
        <Box>
          <Text color="gray" dimColor>
            {instructions}
          </Text>
        </Box>
      )}
    </Box>
  );
}

export default LogViewer;
