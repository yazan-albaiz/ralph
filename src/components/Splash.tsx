/**
 * Splash Screen Component
 */

import { useState, useEffect } from 'react';
import { Box, Text } from 'ink';

const RALPH_TITLE_LINES = [
  '██████╗  █████╗ ██╗     ██████╗ ██╗  ██╗',
  '██╔══██╗██╔══██╗██║     ██╔══██╗██║  ██║',
  '██████╔╝███████║██║     ██████╔╝███████║',
  '██╔══██╗██╔══██║██║     ██╔═══╝ ██╔══██║',
  '██║  ██║██║  ██║███████╗██║     ██║  ██║',
  '╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝╚═╝     ╚═╝  ╚═╝',
];

const TAGLINE = '"(chuckles) I\'m in danger."';

interface SplashProps {
  version?: string;
  duration?: number;
  onComplete?: () => void;
}

export function Splash({ version = '1.0.0', duration = 2000, onComplete }: SplashProps): React.ReactNode {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      onComplete?.();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onComplete]);

  if (!visible) {
    return null;
  }

  return (
    <Box flexDirection="column" alignItems="center" paddingY={1}>
      <Box flexDirection="column" alignItems="center">
        {RALPH_TITLE_LINES.map((line, index) => (
          <Text key={index} color="yellow" bold>
            {line}
          </Text>
        ))}
      </Box>

      <Box marginTop={1}>
        <Text color="gray" dimColor>
          {TAGLINE}
        </Text>
      </Box>

      <Box marginTop={1} flexDirection="column" alignItems="center">
        <Text color="gray">Autonomous AI Coding Loop v{version}</Text>
        <Text color="cyan">Starting...</Text>
      </Box>
    </Box>
  );
}

export function MiniSplash(): React.ReactNode {
  return (
    <Box flexDirection="column" alignItems="center">
      {RALPH_TITLE_LINES.map((line, index) => (
        <Text key={index} color="yellow" bold>
          {line}
        </Text>
      ))}
      <Text color="gray" dimColor>
        {TAGLINE}
      </Text>
    </Box>
  );
}

export default Splash;
