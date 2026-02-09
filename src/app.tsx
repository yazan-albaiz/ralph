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
import { useExitHandler, getExitWarningMessage } from './hooks/useExitHandler.js';
import { logger, setSilentMode } from './lib/logger.js';

interface AppProps {
  config: RalphConfig;
}

type AppPhase = 'splash' | 'starting' | 'running' | 'paused' | 'complete' | 'error';

function getCompletionTitle(status: LoopStatus): string {
  switch (status) {
    case 'completed':
      return '✓ Task Complete!';
    case 'max_reached':
      return '! Max Iterations Reached';
    default:
      return '✕ Loop Stopped';
  }
}

function getCompletionMessage(status: LoopStatus, currentIteration: number, maxIterations: number): string {
  switch (status) {
    case 'completed':
      return `Successfully completed in ${currentIteration} iteration(s)`;
    case 'max_reached':
      return `Reached maximum of ${maxIterations} iterations without completion signal`;
    default:
      return `Stopped at iteration ${currentIteration}`;
  }
}

function getInterventionProps(status: LoopStatus): { type: 'blocked' | 'decide'; title: string } {
  const isBlocked = status === 'blocked';
  return {
    type: isBlocked ? 'blocked' : 'decide',
    title: isBlocked ? 'Loop Blocked' : 'Decision Needed',
  };
}

function mapStatusToPhase(status: LoopStatus): AppPhase | null {
  switch (status) {
    case 'completed':
    case 'max_reached':
    case 'cancelled':
      return 'complete';
    case 'blocked':
    case 'decide':
      return 'paused';
    case 'error':
      return 'error';
    case 'running':
      return 'running';
    default:
      return null;
  }
}

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

  // Note: Output is now captured internally by useClaudeLoop (loop.state.output)

  // Exit handler hook
  const { exitRequested } = useExitHandler({
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
    onStatusChange: (status) => {
      logger.debug(`Status changed to: ${status}`);
      const newPhase = mapStatusToPhase(status);
      if (newPhase) {
        setPhase(newPhase);
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
  useInput((input, _key) => {
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
            <Text color="yellow">{config.unlimited ? '∞ (unlimited)' : config.maxIterations}</Text>
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
            unlimited={config.unlimited}
          />
          <Box marginTop={1}>
            <TimingStats stats={timingStats} compact />
          </Box>
        </Box>

        {/* Right column - Output preview */}
        <Box flexDirection="column" flexGrow={1} marginLeft={1}>
          <OutputPreview
            output={loop.state.output}
            maxLines={config.verbose ? 50 : 20}
            title="Claude Output"
          />
        </Box>
      </Box>

      {/* Blocked/Decide notification */}
      {(displayStatus === 'blocked' || displayStatus === 'decide') && (
        <Box marginTop={1}>
          <NotificationBox
            {...getInterventionProps(displayStatus)}
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
            title={getCompletionTitle(displayStatus)}
            message={getCompletionMessage(displayStatus, loop.state.currentIteration, config.maxIterations)}
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
