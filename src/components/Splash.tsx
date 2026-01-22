/**
 * Splash Screen Component - Ralph Wiggum ASCII Art
 */

import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';

// Inline ASCII art (avoids file reading issues)
const RALPH_ASCII = `
                    ████████████████
                ████░░░░░░░░░░░░░░████
              ██░░░░░░░░░░░░░░░░░░░░░░██
            ██░░░░░░████████████░░░░░░░░██
          ██░░░░████▓▓▓▓▓▓▓▓▓▓████░░░░░░██
          ██░░██▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓██░░░░██
        ██░░██▓▓▓▓████▓▓▓▓████▓▓▓▓██░░░░██
        ██░░██▓▓████████████████▓▓██░░░░██
        ██░░██▓▓██    ██    ██▓▓▓▓██░░░░██
        ██░░██▓▓██ ●  ██ ●  ██▓▓▓▓██░░░░██
        ██░░██▓▓████████████████▓▓██░░░░██
        ██░░██▓▓▓▓▓▓████████▓▓▓▓▓▓██░░░░██
          ██░░██▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓██░░░░██
          ██░░░░██▓▓▓▓████▓▓▓▓██░░░░░░██
            ██░░░░████████████░░░░░░██
              ██░░░░░░░░░░░░░░░░░░██
            ████████████████████████
`;

const RALPH_TITLE = `
    ██████╗  █████╗ ██╗     ██████╗ ██╗  ██╗
    ██╔══██╗██╔══██╗██║     ██╔══██╗██║  ██║
    ██████╔╝███████║██║     ██████╔╝███████║
    ██╔══██╗██╔══██║██║     ██╔═══╝ ██╔══██║
    ██║  ██║██║  ██║███████╗██║     ██║  ██║
    ╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝╚═╝     ╚═╝  ╚═╝
`;

interface SplashProps {
  version?: string;
  duration?: number;
  onComplete?: () => void;
}

export function Splash({ version = '1.0.0', duration = 2000, onComplete }: SplashProps) {
  const [visible, setVisible] = useState(true);
  const [fadePhase, setFadePhase] = useState(0);

  useEffect(() => {
    // Start fade out after duration - 500ms
    const fadeTimer = setTimeout(() => {
      setFadePhase(1);
    }, duration - 500);

    // Complete after full duration
    const completeTimer = setTimeout(() => {
      setVisible(false);
      onComplete?.();
    }, duration);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(completeTimer);
    };
  }, [duration, onComplete]);

  if (!visible) {
    return null;
  }

  return (
    <Box flexDirection="column" alignItems="center" paddingY={1}>
      {/* ASCII Art */}
      <Box>
        <Text color={fadePhase === 0 ? 'yellow' : 'gray'}>{RALPH_ASCII}</Text>
      </Box>

      {/* Quote */}
      <Box marginY={1}>
        <Text color="cyan">╔═══════════════════════════╗</Text>
      </Box>
      <Box>
        <Text color="cyan">║</Text>
        <Text color="white">   (chuckles)              </Text>
        <Text color="cyan">║</Text>
      </Box>
      <Box>
        <Text color="cyan">║</Text>
        <Text color="yellowBright" bold>
          {'      I\'m in danger.       '}
        </Text>
        <Text color="cyan">║</Text>
      </Box>
      <Box marginBottom={1}>
        <Text color="cyan">╚═══════════════════════════╝</Text>
      </Box>

      {/* Title */}
      <Box>
        <Text color={fadePhase === 0 ? 'green' : 'gray'}>{RALPH_TITLE}</Text>
      </Box>

      {/* Version */}
      <Box marginTop={1}>
        <Text color="gray">Autonomous AI Coding Loop v{version}</Text>
      </Box>
    </Box>
  );
}

/**
 * Mini splash for quick display
 */
export function MiniSplash() {
  return (
    <Box flexDirection="column" alignItems="center">
      <Text color="yellow" bold>
        {'  ██████╗  █████╗ ██╗     ██████╗ ██╗  ██╗'}
      </Text>
      <Text color="yellow" bold>
        {'  ██╔══██╗██╔══██╗██║     ██╔══██╗██║  ██║'}
      </Text>
      <Text color="yellow" bold>
        {'  ██████╔╝███████║██║     ██████╔╝███████║'}
      </Text>
      <Text color="yellow" bold>
        {'  ██╔══██╗██╔══██║██║     ██╔═══╝ ██╔══██║'}
      </Text>
      <Text color="yellow" bold>
        {'  ██║  ██║██║  ██║███████╗██║     ██║  ██║'}
      </Text>
      <Text color="yellow" bold>
        {'  ╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝╚═╝     ╚═╝  ╚═╝'}
      </Text>
      <Text color="gray" dimColor>
        {'"(chuckles) I\'m in danger."'}
      </Text>
    </Box>
  );
}

export default Splash;
