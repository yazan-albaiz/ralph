/**
 * OutputPreview Component - 50-line rolling output preview
 */

import React, { useMemo } from 'react';
import { Box, Text } from 'ink';

interface OutputPreviewProps {
  output: string[];
  maxLines?: number;
  showLineNumbers?: boolean;
  title?: string;
}

/**
 * Strip ANSI codes from string for accurate line counting
 */
function stripAnsi(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g, '');
}

/**
 * Truncate long lines
 */
function truncateLine(line: string, maxWidth: number): string {
  const stripped = stripAnsi(line);
  if (stripped.length <= maxWidth) {
    return line;
  }
  // Find where to cut (accounting for ANSI codes)
  let visibleChars = 0;
  let cutIndex = 0;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '\x1B') {
      // Skip ANSI sequence
      const match = line.slice(i).match(/^\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/);
      if (match) {
        i += match[0].length - 1;
        continue;
      }
    }
    visibleChars++;
    cutIndex = i + 1;
    if (visibleChars >= maxWidth - 3) {
      break;
    }
  }
  return line.slice(0, cutIndex) + '...';
}

export function OutputPreview({
  output,
  maxLines = 50,
  showLineNumbers = false,
  title = 'Output',
}: OutputPreviewProps) {
  // Process and limit output lines
  const displayLines = useMemo(() => {
    // Flatten array and split by newlines
    const allLines = output.flatMap((chunk) => chunk.split('\n'));

    // Take last maxLines
    const recentLines = allLines.slice(-maxLines);

    // Truncate long lines
    return recentLines.map((line) => truncateLine(line, 120));
  }, [output, maxLines]);

  const lineNumberWidth = displayLines.length.toString().length;

  return (
    <Box flexDirection="column" borderStyle="single" borderColor="gray" paddingX={1}>
      {/* Title */}
      <Box marginBottom={1}>
        <Text color="cyan" bold>
          {title}
        </Text>
        <Text color="gray"> ({displayLines.length} lines)</Text>
      </Box>

      {/* Output lines */}
      <Box flexDirection="column">
        {displayLines.length === 0 ? (
          <Text color="gray" dimColor>
            No output yet...
          </Text>
        ) : (
          displayLines.map((line, index) => (
            <Box key={index}>
              {showLineNumbers && (
                <Text color="gray" dimColor>
                  {(index + 1).toString().padStart(lineNumberWidth, ' ')}│{' '}
                </Text>
              )}
              <Text>{line || ' '}</Text>
            </Box>
          ))
        )}
      </Box>
    </Box>
  );
}

/**
 * Compact output preview for smaller views
 */
export function CompactOutputPreview({
  output,
  maxLines = 10,
}: {
  output: string[];
  maxLines?: number;
}) {
  const displayLines = useMemo(() => {
    const allLines = output.flatMap((chunk) => chunk.split('\n'));
    return allLines.slice(-maxLines).map((line) => truncateLine(line, 80));
  }, [output, maxLines]);

  return (
    <Box flexDirection="column">
      {displayLines.map((line, index) => (
        <Text key={index} color="gray">
          {line || ' '}
        </Text>
      ))}
    </Box>
  );
}

/**
 * Output buffer manager hook
 */
export function createOutputBuffer(maxSize: number = 50) {
  const buffer: string[] = [];

  return {
    add: (chunk: string) => {
      buffer.push(chunk);
      // Trim buffer if it exceeds max size
      const allLines = buffer.flatMap((c) => c.split('\n'));
      if (allLines.length > maxSize * 2) {
        // Keep last maxSize*2 lines worth
        const trimmed = allLines.slice(-maxSize * 2);
        buffer.length = 0;
        buffer.push(trimmed.join('\n'));
      }
    },
    get: () => [...buffer],
    clear: () => {
      buffer.length = 0;
    },
    getLines: () => buffer.flatMap((c) => c.split('\n')).slice(-maxSize),
  };
}

export default OutputPreview;
