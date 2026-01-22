/**
 * Splash Screen Component - Ralph Wiggum ASCII Art
 */

import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';

// ASCII art of Ralph Wiggum "I'm in danger" scene
// Style matching ralph_example.png with dense block characters
const RALPH_ASCII = `
▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
▓▓██████████████████▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓██████████████▓▓▓
▓▓██░░░░░░░░░░░░░░██▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓██░░░░░░░░░░██▓▓▓
▓▓██░░░░░░░░░░░░░░██▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓██░░░░░░░░░░██▓▓▓
▓▓██████████████████▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓██████████████▓▓▓
▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▒▒▒▒▒▒▒▒▒▒▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▒▒░░░░░░░░░░░░░░▒▒▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▒░░▒▒▒▒▒▒▒▒▒▒▒▒▒▒░░░▒▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▒░░▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒░░▒▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▒░▒▒▒▒░░░░▒▒▒▒░░░░▒▒▒▒▒░░▒▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▒░▒▒▒░██▓▓░▒▒▒░██▓▓░▒▒▒▒▒░▒▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▒░▒▒▒░████░▒▒▒░████░▒▒▒▒▒░▒▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▒░▒▒▒▒░░░░▒▒▒▒▒░░░░▒▒▒▒▒▒░▒▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▒░▒▒░░░░░░░▒▒░░░░░░░▒▒▒▒▒░▒▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▒░▒▒▒▒░░░░░░░░░░▒▒▒▒▒▒░▒▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▒░▒▒▒▒▒▒████▒▒▒▒▒▒▒░▒▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▒░░▒▒▒▒▒▒▒▒▒▒▒░░▒▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
▓▓░░░░░░░░░░░░▓▓▓▓▓▓▒░░░░░░░░░░▒▓▓▓▓▓▓░░░░░░░░░░░░▓▓▓▓▓▓▓▓▓▓
▓▓░░░░░░░░░░░░▓▓▓▓▓▓▓▓▒▒▒▒▒▒▒▒▓▓▓▓▓▓▓▓░░░░░░░░░░░░▓▓▓▓▓▓▓▓▓▓
▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░▓▓▓▓▓▓▓▓▓▓
▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░▓▓▓▓▓▓▓▓▓▓
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
      {/* ASCII Art */}
      <Box>
        <Text color="yellow">{RALPH_ASCII}</Text>
      </Box>

      {/* Quote Box */}
      <Box flexDirection="column" alignItems="center" marginY={1}>
        <Text color="cyan">╔═════════════════════════════════╗</Text>
        <Text color="cyan">║                                 ║</Text>
        <Text>
          <Text color="cyan">║</Text>
          <Text color="white">       (chuckles)               </Text>
          <Text color="cyan">║</Text>
        </Text>
        <Text>
          <Text color="cyan">║</Text>
          <Text color="yellowBright" bold>
            {'       I\'m in danger.           '}
          </Text>
          <Text color="cyan">║</Text>
        </Text>
        <Text color="cyan">║                                 ║</Text>
        <Text color="cyan">╚═════════════════════════════════╝</Text>
      </Box>

      {/* Title */}
      <Box marginTop={1}>
        <Text color="green">{RALPH_TITLE}</Text>
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
