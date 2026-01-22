/**
 * Main Ink Application Component
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import type { RalphConfig, LoopStatus, TimingStats as TimingStatsType } from './types/index.js';
import { Splash } from './components/Splash.js';
import { Header } from './components/Header.js';
import { IterationPanel } from './components/IterationPanel.js';
import { OutputPreview } from './components/OutputPreview.js';
import { TimingStats } from './components/TimingStats.js';
import { NotificationBox, WarningMessage } from './components/Logger.js';
import { useClaudeLoop } from './hooks/useClaudeLoop.js';
import { useTiming, createInitialTimingStats } from './hooks/useTiming.js';
import { useOutputCapture } from './hooks/useOutputCapture.js';
import { useExitHandler, getExitWarningMessage } from './hooks/useExitHandler.js';
import { logger, setSilentMode } from './lib/logger.js';

interface AppProps {
  config: RalphConfig;
}

type AppPhase = 'splash' | 'preflight' | 'running' | 'paused' | 'complete' | 'error';

export function App({ config }: AppProps) {
  const [phase, setPhase] = useState<AppPhase>(config.showSplash ? 'splash' : 'running');
  const [iterationDuration, setIterationDuration] = useState(0);

  // Silence console logs when using TUI
  useEffect(() => {
    if (!config.verbose) {
      setSilentMode(true);
    }
    return () => setSilentMode(false);
  }, [config.verbose]);

  // Timing hook
  const { stats, startIteration, endIteration, reset: resetTiming } = useTiming();

  // Output capture hook
  const { output, addOutput, clearOutput } = useOutputCapture({ maxLines: 50 });

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
      if (status === 'completed' || status === 'max_reached' || status === 'cancelled') {
        setPhase('complete');
      } else if (status === 'blocked' || status === 'decide') {
        setPhase('paused');
      } else if (status === 'error') {
        setPhase('error');
      }
    },
    onComplete: (entry) => {
      logger.ok(`Loop completed: ${entry.result}`);
    },
  });

  // Handle splash completion
  const handleSplashComplete = useCallback(() => {
    setPhase('running');
    loop.start();
  }, [loop]);

  // Start loop after splash
  useEffect(() => {
    if (phase === 'running' && loop.state.status === 'idle') {
      loop.start();
    }
  }, [phase, loop]);

  // Handle keyboard input
  useInput((input, key) => {
    // 'q' to quit
    if (input === 'q') {
      loop.stop();
      forceExit();
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

  // Build timing stats object
  const timingStats: TimingStatsType = stats;

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
        status={loop.state.status}
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
            status={loop.state.status}
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
      {(loop.state.status === 'blocked' || loop.state.status === 'decide') && (
        <Box marginTop={1}>
          <NotificationBox
            type={loop.state.status === 'blocked' ? 'blocked' : 'decide'}
            title={loop.state.status === 'blocked' ? 'Loop Blocked' : 'Decision Needed'}
            message={loop.state.lastPromiseTag?.content || 'Human intervention required'}
            instructions="Press 'r' to resume, 'q' to quit"
          />
        </Box>
      )}

      {/* Completion notification */}
      {phase === 'complete' && (
        <Box marginTop={1}>
          <NotificationBox
            type="complete"
            title={
              loop.state.status === 'completed'
                ? 'Task Complete!'
                : loop.state.status === 'max_reached'
                  ? 'Max Iterations Reached'
                  : 'Loop Stopped'
            }
            message={
              loop.state.status === 'completed'
                ? `Completed in ${loop.state.currentIteration} iteration(s)`
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
