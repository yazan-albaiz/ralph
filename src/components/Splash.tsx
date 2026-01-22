/**
 * Splash Screen Component
 * TODO: Add proper Ralph Wiggum ASCII art in the future
 */

import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';

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

  useEffect(() => {
    const completeTimer = setTimeout(() => {
      setVisible(false);
      onComplete?.();
    }, duration);

    return () => {
      clearTimeout(completeTimer);
    };
  }, [duration, onComplete]);

  if (!visible) {
    return null;
  }

  return (
    <Box flexDirection="column" alignItems="center" paddingY={1}>
      {/* Title */}
      <Box>
        <Text color="yellow">{RALPH_TITLE}</Text>
      </Box>

      {/* Tagline */}
      <Box marginTop={1}>
        <Text color="gray" dimColor>
          "(chuckles) I'm in danger."
        </Text>
      </Box>

      {/* Version and Loading */}
      <Box marginTop={1} flexDirection="column" alignItems="center">
        <Text color="gray">Autonomous AI Coding Loop v{version}</Text>
        <Text color="cyan">Starting...</Text>
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
        {'██████╗  █████╗ ██╗     ██████╗ ██╗  ██╗'}
      </Text>
      <Text color="yellow" bold>
        {'██╔══██╗██╔══██╗██║     ██╔══██╗██║  ██║'}
      </Text>
      <Text color="yellow" bold>
        {'██████╔╝███████║██║     ██████╔╝███████║'}
      </Text>
      <Text color="yellow" bold>
        {'██╔══██╗██╔══██║██║     ██╔═══╝ ██╔══██║'}
      </Text>
      <Text color="yellow" bold>
        {'██║  ██║██║  ██║███████╗██║     ██║  ██║'}
      </Text>
      <Text color="yellow" bold>
        {'╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝╚═╝     ╚═╝  ╚═╝'}
      </Text>
      <Text color="gray" dimColor>
        {'"(chuckles) I\'m in danger."'}
      </Text>
    </Box>
  );
}

export default Splash;
