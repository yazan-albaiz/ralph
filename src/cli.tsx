#!/usr/bin/env node
/**
 * Ralph CLI - Entry Point
 *
 * Autonomous AI Coding Loop using Claude Code
 * Named after Ralph Wiggum - naive, relentless persistence
 */

import React from 'react';
import { render } from 'ink';
import { Command } from 'commander';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { RalphConfig } from './types/index.js';
import { DEFAULT_CONFIG } from './types/index.js';
import { App } from './app.js';
import { runPreflightChecks, formatPreflightResults } from './lib/preflight.js';
import { logger, setDebugEnabled } from './lib/logger.js';
import { setNotificationsEnabled, setSoundEnabled } from './lib/notifications.js';

// Package version (will be replaced by build)
const VERSION = '1.0.0';

// CLI program
const program = new Command();

program
  .name('ralph')
  .description('Autonomous AI Coding Loop using Claude Code - named after Ralph Wiggum')
  .version(VERSION)
  .argument('[prompt]', 'Prompt string or path to prompt file')
  .option('-m, --max <n>', 'Maximum iterations', (val) => parseInt(val, 10), DEFAULT_CONFIG.maxIterations)
  .option('-s, --signal <text>', 'Completion signal', DEFAULT_CONFIG.completionSignal)
  .option('-M, --model <model>', 'Claude model (opus, sonnet, haiku)', DEFAULT_CONFIG.model)
  .option('-d, --dangerously-skip', 'Skip permission prompts', DEFAULT_CONFIG.dangerouslySkipPermissions)
  .option('-v, --verbose', 'Show full Claude output', DEFAULT_CONFIG.verbose)
  .option('--no-splash', 'Skip splash screen')
  .option('--no-notify', 'Disable desktop notifications')
  .option('--no-sound', 'Disable sound alerts')
  .option('--debug', 'Enable debug logging')
  .option('--preflight-only', 'Only run pre-flight checks')
  .action(async (promptArg: string | undefined, options) => {
    // Enable debug if requested
    if (options.debug) {
      setDebugEnabled(true);
    }

    // Handle notifications/sound
    if (!options.notify) {
      setNotificationsEnabled(false);
    }
    if (!options.sound) {
      setSoundEnabled(false);
    }

    // Determine prompt
    let prompt = promptArg || '';
    let isFile = false;

    if (promptArg) {
      const resolvedPath = resolve(promptArg);
      if (existsSync(resolvedPath)) {
        try {
          prompt = await readFile(resolvedPath, 'utf-8');
          isFile = true;
          logger.info(`Loaded prompt from file: ${resolvedPath}`);
        } catch (err) {
          logger.error(`Failed to read prompt file: ${err}`);
          process.exit(1);
        }
      }
    }

    // Build config
    const config: RalphConfig = {
      maxIterations: options.max,
      completionSignal: options.signal,
      model: options.model,
      dangerouslySkipPermissions: options.dangerouslySkip || false,
      verbose: options.verbose || false,
      showSplash: options.splash !== false,
      enableNotifications: options.notify !== false,
      enableSound: options.sound !== false,
      prompt,
      isFile,
      projectRoot: process.cwd(),
    };

    // Run pre-flight checks
    const preflightResult = await runPreflightChecks(config);

    if (options.preflightOnly) {
      console.log(formatPreflightResults(preflightResult));
      process.exit(preflightResult.passed ? 0 : 1);
    }

    if (!preflightResult.passed) {
      console.error('\nPre-flight checks failed:');
      for (const error of preflightResult.errors) {
        console.error(`  - ${error.message}`);
      }
      process.exit(1);
    }

    // Validate prompt
    if (!prompt) {
      console.error('Error: No prompt provided');
      console.error('Usage: ralph [options] <prompt_or_file>');
      console.error('\nExamples:');
      console.error('  ralph "Build a REST API with tests"');
      console.error('  ralph ./my-prd.md');
      console.error('  ralph -m 50 -M sonnet "Implement feature X"');
      process.exit(1);
    }

    // Render the app
    const { waitUntilExit } = render(<App config={config} />);

    try {
      await waitUntilExit();
    } catch (err) {
      logger.error(`Application error: ${err}`);
      process.exit(1);
    }
  });

// Parse arguments
program.parse();
