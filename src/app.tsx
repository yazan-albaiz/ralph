/**
 * Main Ink Application Component
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import type { RalphConfig, LoopStatus, TimingStats as TimingStatsType } from './types/index.js';
import { Splash } from './components/Splash.js';
import { Header } from './components/Header.js';
import { IterationPanel } from './components/IterationPanel.js';
import { OutputPreview } from './components/OutputPreview.js';
import { TimingStats } from './components/TimingStats.js';
import { NotificationBox, WarningMessage } from './components/Logger.js';
import { Spinner } from './components/Spinner.js';
import { useClaudeLoop } from './hooks/useClaudeLoop.js';
import { useTiming } from './hooks/useTiming.js';
import { useOutputCapture } from './hooks/useOutputCapture.js';
import { useExitHandler, getExitWarningMessage } from './hooks/useExitHandler.js';
import { logger, setSilentMode } from './lib/logger.js';

interface AppProps {
  config: RalphConfig;
}

type AppPhase = 'splash' | 'starting' | 'running' | 'paused' | 'complete' | 'error';

export function App({ config }: AppProps) {
  const [phase, setPhase] = useState<AppPhase>(config.showSplash ? 'splash' : 'starting');
  const [iterationDuration, setIterationDuration] = useState(0);
  const { exit } = useApp();

  // Silence console logs when using TUI
  useEffect(() => {
    if (!config.verbose) {
      setSilentMode(true);
    }
    return () => setSilentMode(false);
  }, [config.verbose]);

  // Timing hook
  const { stats, startIteration, endIteration } = useTiming();

  // Output capture hook
  const { output, addOutput } = useOutputCapture({ maxLines: 50 });

  // Exit handler hook
  const { exitRequested, forceExit } = useExitHandler({
    onExit: async () => {
      loop.stop();
      logger.info('Ralph loop stopped by user');
    },
  });

  // Claude loop hook
  const loop = useClaudeLoop({
    config,
    onIterationStart: (iteration) => {
      startIteration();
      logger.info(`Iteration ${iteration} started`);
    },
    onIterationEnd: (iteration, result) => {
      endIteration();
      setIterationDuration(result.duration);
      logger.info(`Iteration ${iteration} completed in ${result.duration}ms`);
    },
    onOutput: addOutput,
    onStatusChange: (status) => {
      logger.debug(`Status changed to: ${status}`);
      if (status === 'completed' || status === 'max_reached' || status === 'cancelled') {
        setPhase('complete');
      } else if (status === 'blocked' || status === 'decide') {
        setPhase('paused');
      } else if (status === 'error') {
        setPhase('error');
      } else if (status === 'running') {
        setPhase('running');
      }
    },
    onComplete: (entry) => {
      logger.ok(`Loop completed: ${entry.result}`);
    },
  });

  // Handle splash completion - transition to starting phase
  const handleSplashComplete = useCallback(() => {
    setPhase('starting');
  }, []);

  // Start loop when entering starting phase
  useEffect(() => {
    if (phase === 'starting') {
      // Small delay to ensure UI renders first
      const timer = setTimeout(() => {
        loop.start();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [phase, loop]);

  // Handle keyboard input
  useInput((input, key) => {
    // 'q' to quit
    if (input === 'q') {
      loop.stop();
      exit();
    }

    // 'p' to pause/resume
    if (input === 'p') {
      if (loop.state.status === 'running') {
        loop.pause();
        setPhase('paused');
      } else if (loop.state.status === 'paused') {
        loop.resume();
        setPhase('running');
      }
    }

    // 'r' to resume from blocked/decide
    if (input === 'r' && (loop.state.status === 'blocked' || loop.state.status === 'decide')) {
      loop.resume();
      setPhase('running');
    }

    // 'c' to continue (alias for resume)
    if (input === 'c' && phase === 'paused') {
      loop.resume();
      setPhase('running');
    }
  });

  // Render splash screen
  if (phase === 'splash') {
    return <Splash duration={2000} onComplete={handleSplashComplete} />;
  }

  // Render starting screen
  if (phase === 'starting' && loop.state.status === 'idle') {
    return (
      <Box flexDirection="column" padding={1}>
        <Box
          flexDirection="column"
          borderStyle="round"
          borderColor="cyan"
          paddingX={2}
          paddingY={1}
        >
          <Box>
            <Text color="yellow" bold>
              RALPH
            </Text>
            <Text color="gray"> - Autonomous AI Coding Loop</Text>
          </Box>
          <Box marginTop={1}>
            <Spinner label="Initializing Claude..." />
          </Box>
          <Box marginTop={1}>
            <Text color="gray">Model: </Text>
            <Text color="cyan">{config.model}</Text>
            <Text color="gray"> | Max iterations: </Text>
            <Text color="yellow">{config.maxIterations}</Text>
          </Box>
        </Box>
      </Box>
    );
  }

  // Build timing stats object
  const timingStats: TimingStatsType = stats;

  // Determine current display status
  const displayStatus = loop.state.status;
  const isComplete = phase === 'complete';

  return (
    <Box flexDirection="column" padding={1}>
      {/* Exit warning */}
      {exitRequested && (
        <Box marginBottom={1}>
          <WarningMessage message={getExitWarningMessage()} />
        </Box>
      )}

      {/* Header */}
      <Header
        config={config}
        status={displayStatus}
        iteration={loop.state.currentIteration}
        totalElapsed={stats.totalElapsed}
      />

      {/* Main content */}
      <Box flexDirection="row" marginTop={1}>
        {/* Left column - Iteration and timing */}
        <Box flexDirection="column" width="40%">
          <IterationPanel
            iteration={loop.state.currentIteration}
            maxIterations={config.maxIterations}
            status={displayStatus}
            duration={iterationDuration}
            promiseTag={loop.state.lastPromiseTag}
          />
          <Box marginTop={1}>
            <TimingStats stats={timingStats} compact />
          </Box>
        </Box>

        {/* Right column - Output preview */}
        <Box flexDirection="column" flexGrow={1} marginLeft={1}>
          <OutputPreview
            output={output}
            maxLines={config.verbose ? 50 : 20}
            title="Claude Output"
          />
        </Box>
      </Box>

      {/* Blocked/Decide notification */}
      {(displayStatus === 'blocked' || displayStatus === 'decide') && (
        <Box marginTop={1}>
          <NotificationBox
            type={displayStatus === 'blocked' ? 'blocked' : 'decide'}
            title={displayStatus === 'blocked' ? 'Loop Blocked' : 'Decision Needed'}
            message={loop.state.lastPromiseTag?.content || 'Human intervention required'}
            instructions="Press 'r' to resume, 'q' to quit"
          />
        </Box>
      )}

      {/* Completion notification */}
      {isComplete && (
        <Box marginTop={1}>
          <NotificationBox
            type="complete"
            title={
              displayStatus === 'completed'
                ? '✓ Task Complete!'
                : displayStatus === 'max_reached'
                  ? '! Max Iterations Reached'
                  : '✕ Loop Stopped'
            }
            message={
              displayStatus === 'completed'
                ? `Successfully completed in ${loop.state.currentIteration} iteration(s)`
                : displayStatus === 'max_reached'
                  ? `Reached maximum of ${config.maxIterations} iterations without completion signal`
                  : `Stopped at iteration ${loop.state.currentIteration}`
            }
            instructions="Press 'q' to exit"
          />
        </Box>
      )}

      {/* Error notification */}
      {loop.state.error && (
        <Box marginTop={1}>
          <NotificationBox
            type="error"
            title="Error"
            message={loop.state.error}
            instructions="Press 'r' to retry, 'q' to quit"
          />
        </Box>
      )}

      {/* Controls hint */}
      <Box marginTop={1}>
        <Text color="gray" dimColor>
          Controls: [p]ause | [r]esume | [q]uit | Ctrl+C twice to force exit
        </Text>
      </Box>
    </Box>
  );
}

export default App;
