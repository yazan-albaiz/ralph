/**
 * Spinner Component - Animated spinner with step detection
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Box, Text } from 'ink';
import InkSpinner from 'ink-spinner';

interface SpinnerProps {
  label?: string;
  type?: 'dots' | 'line' | 'pipe' | 'arc' | 'circle';
}

/**
 * Basic animated spinner
 */
export function Spinner({ label = 'Working...', type = 'dots' }: SpinnerProps) {
  return (
    <Box>
      <Text color="cyan">
        <InkSpinner type={type} />
      </Text>
      <Text> {label}</Text>
    </Box>
  );
}

interface StepSpinnerProps {
  currentStep?: string;
  output?: string[];
  isRunning: boolean;
}

// Patterns to detect step progress
const STEP_PATTERNS = [
  /\[(\d+)\/(\d+)\]/,           // [1/5]
  /Step (\d+)/i,                // Step 1
  /(\d+)\. /,                   // 1.
  /Phase (\d+)/i,               // Phase 1
  /Task (\d+)/i,                // Task 1
  /Stage (\d+)/i,               // Stage 1
  /Progress: (\d+)%/i,          // Progress: 50%
];

/**
 * Detect current step from output
 */
function detectStep(output: string[]): string | null {
  if (output.length === 0) return null;

  // Check last few lines for step patterns
  const recentLines = output.slice(-10);

  for (let i = recentLines.length - 1; i >= 0; i--) {
    const line = recentLines[i];
    for (const pattern of STEP_PATTERNS) {
      const match = line.match(pattern);
      if (match) {
        // Return the matched portion
        return match[0];
      }
    }
  }

  return null;
}

/**
 * Detect current action from output
 */
function detectAction(output: string[]): string | null {
  if (output.length === 0) return null;

  const lastLine = output[output.length - 1].trim();
  if (!lastLine) return null;

  // Common action patterns
  const actionPatterns = [
    { pattern: /Reading|Loading|Fetching/i, action: 'Reading files...' },
    { pattern: /Writing|Creating|Generating/i, action: 'Writing code...' },
    { pattern: /Running|Executing|Testing/i, action: 'Running tests...' },
    { pattern: /Installing|Adding/i, action: 'Installing dependencies...' },
    { pattern: /Analyzing|Checking/i, action: 'Analyzing code...' },
    { pattern: /Building|Compiling/i, action: 'Building project...' },
    { pattern: /Fixing|Resolving/i, action: 'Fixing issues...' },
  ];

  for (const { pattern, action } of actionPatterns) {
    if (pattern.test(lastLine)) {
      return action;
    }
  }

  // Return truncated last line if short enough
  if (lastLine.length <= 40) {
    return lastLine;
  }

  return lastLine.slice(0, 37) + '...';
}

/**
 * Spinner with step detection from output
 */
export function StepSpinner({ currentStep, output = [], isRunning }: StepSpinnerProps) {
  const [dots, setDots] = useState('');

  useEffect(() => {
    if (!isRunning) {
      setDots('');
      return;
    }

    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? '' : prev + '.'));
    }, 500);

    return () => clearInterval(interval);
  }, [isRunning]);

  const detectedStep = useMemo(() => detectStep(output), [output]);
  const detectedAction = useMemo(() => detectAction(output), [output]);

  if (!isRunning) {
    return (
      <Box>
        <Text color="green">✓</Text>
        <Text> Complete</Text>
      </Box>
    );
  }

  const displayStep = currentStep || detectedStep;
  const displayAction = detectedAction || 'Working';

  return (
    <Box flexDirection="column">
      <Box>
        <Text color="cyan">
          <InkSpinner type="dots" />
        </Text>
        <Text> {displayAction}{dots}</Text>
      </Box>
      {displayStep && (
        <Box marginLeft={2}>
          <Text color="gray" dimColor>
            {displayStep}
          </Text>
        </Box>
      )}
    </Box>
  );
}

/**
 * Progress bar component
 */
interface ProgressBarProps {
  current: number;
  total: number;
  width?: number;
  showPercentage?: boolean;
}

export function ProgressBar({
  current,
  total,
  width = 30,
  showPercentage = true,
}: ProgressBarProps) {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
  const filled = Math.round((current / total) * width);
  const empty = width - filled;

  return (
    <Box>
      <Text color="gray">[</Text>
      <Text color="green">{'█'.repeat(filled)}</Text>
      <Text color="gray">{'░'.repeat(empty)}</Text>
      <Text color="gray">]</Text>
      {showPercentage && (
        <Text color="yellow"> {percentage}%</Text>
      )}
    </Box>
  );
}

export default Spinner;
