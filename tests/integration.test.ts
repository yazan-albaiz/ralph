/**
 * Integration Tests
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { existsSync } from 'node:fs';
import { mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { setSilentMode } from '../src/lib/logger.js';
import { runPreflightChecks } from '../src/lib/preflight.js';
import { parsePromiseTag, preparePrompt } from '../src/lib/promiseParser.js';
import { createMockClaudeRunner } from '../src/lib/claude.js';
import {
  createHistoryEntry,
  addIterationToHistory,
  finalizeHistoryEntry,
  createIterationRecord,
} from '../src/lib/history.js';
import { DEFAULT_CONFIG } from '../src/types/index.js';
import type { RalphConfig } from '../src/types/index.js';

describe('Integration Tests', () => {
  beforeEach(() => {
    setSilentMode(true);
  });

  afterEach(() => {
    setSilentMode(false);
  });

  describe('Full Loop Simulation', () => {
    test('simulates a successful loop with mock Claude', async () => {
      const config: RalphConfig = {
        ...DEFAULT_CONFIG,
        prompt: 'Test prompt',
        isFile: false,
        projectRoot: process.cwd(),
        maxIterations: 10,
      };

      // Create mock Claude runner that completes on iteration 3
      let iteration = 0;
      const mockRunner = async () => {
        iteration++;
        const output =
          iteration < 3
            ? `Working on iteration ${iteration}...`
            : `Done! <promise>COMPLETE</promise>`;

        return {
          success: true,
          output,
          error: null,
          duration: 1000,
          promiseTag: parsePromiseTag(output),
        };
      };

      // Simulate loop
      let currentIteration = 0;
      let completed = false;

      while (currentIteration < config.maxIterations && !completed) {
        currentIteration++;
        const result = await mockRunner();

        if (result.promiseTag?.type === 'COMPLETE') {
          completed = true;
        }
      }

      expect(completed).toBe(true);
      expect(currentIteration).toBe(3);
    });

    test('simulates max iterations reached', async () => {
      const config: RalphConfig = {
        ...DEFAULT_CONFIG,
        prompt: 'Test prompt',
        isFile: false,
        projectRoot: process.cwd(),
        maxIterations: 5,
      };

      // Mock runner that never completes
      const mockRunner = async () => ({
        success: true,
        output: 'Still working...',
        error: null,
        duration: 1000,
        promiseTag: parsePromiseTag('Still working...'),
      });

      let currentIteration = 0;
      let completed = false;

      while (currentIteration < config.maxIterations && !completed) {
        currentIteration++;
        const result = await mockRunner();

        if (result.promiseTag?.type === 'COMPLETE') {
          completed = true;
        }
      }

      expect(completed).toBe(false);
      expect(currentIteration).toBe(5);
    });

    test('simulates blocked state', async () => {
      const blockedOutput = '<promise>BLOCKED: Need API credentials</promise>';
      const result = parsePromiseTag(blockedOutput);

      expect(result.type).toBe('BLOCKED');
      expect(result.content).toBe('Need API credentials');
    });

    test('simulates decide state', async () => {
      const decideOutput = '<promise>DECIDE: Should I use PostgreSQL or MongoDB?</promise>';
      const result = parsePromiseTag(decideOutput);

      expect(result.type).toBe('DECIDE');
      expect(result.content).toBe('Should I use PostgreSQL or MongoDB?');
    });
  });

  describe('History Tracking', () => {
    test('tracks full iteration history', () => {
      const config: RalphConfig = {
        ...DEFAULT_CONFIG,
        prompt: 'Test prompt',
        isFile: false,
        projectRoot: '/test/project',
        maxIterations: 10,
      };

      // Create history entry
      let entry = createHistoryEntry(config, 'Build a REST API');
      expect(entry.iterations).toHaveLength(0);

      // Add iterations
      const iter1 = createIterationRecord(
        new Date('2024-01-01T00:00:00Z'),
        'Iteration 1 output',
        null
      );
      entry = addIterationToHistory(entry, iter1);
      expect(entry.iterations).toHaveLength(1);
      expect(entry.iterations[0].number).toBe(1);

      const iter2 = createIterationRecord(
        new Date('2024-01-01T00:01:00Z'),
        'Iteration 2 output',
        { type: 'COMPLETE', content: null, raw: '<promise>COMPLETE</promise>' }
      );
      entry = addIterationToHistory(entry, iter2);
      expect(entry.iterations).toHaveLength(2);
      expect(entry.iterations[1].number).toBe(2);

      // Finalize
      entry = finalizeHistoryEntry(entry, 'completed', 120000);
      expect(entry.result).toBe('completed');
      expect(entry.totalDuration).toBe(120000);
    });
  });

  describe('Prompt Preparation', () => {
    test('prepares prompt with PROJECT_ROOT and completion instructions', () => {
      const prompt = 'Build a REST API';
      const projectRoot = '/home/user/myproject';
      const signal = '<promise>COMPLETE</promise>';

      const prepared = preparePrompt(prompt, projectRoot, signal);

      expect(prepared).toContain('PROJECT_ROOT=/home/user/myproject');
      expect(prepared).toContain('Build a REST API');
      expect(prepared).toContain(signal);
      expect(prepared).toContain('BLOCKED');
      expect(prepared).toContain('DECIDE');
    });
  });

  describe('Pre-flight Integration', () => {
    test('pre-flight checks run without crashing', async () => {
      const config: RalphConfig = {
        ...DEFAULT_CONFIG,
        prompt: 'Test',
        isFile: false,
        projectRoot: process.cwd(),
      };

      const result = await runPreflightChecks(config);

      expect(result.checks.length).toBeGreaterThan(0);
      expect(typeof result.passed).toBe('boolean');
    });
  });

  describe('Mock Claude Runner', () => {
    test('creates working mock runner', async () => {
      const mockOutput = 'Test output <promise>COMPLETE</promise>';
      const runner = createMockClaudeRunner(mockOutput, 10);

      const result = await runner({
        prompt: 'Test',
        model: 'opus',
        dangerouslySkipPermissions: false,
        projectRoot: '/test',
      });

      expect(result.success).toBe(true);
      expect(result.output).toBe(mockOutput);
      expect(result.promiseTag?.type).toBe('COMPLETE');
    });

    test('mock runner streams output', async () => {
      const mockOutput = 'Hello World';
      const runner = createMockClaudeRunner(mockOutput, 10);
      const chunks: string[] = [];

      await runner({
        prompt: 'Test',
        model: 'opus',
        dangerouslySkipPermissions: false,
        projectRoot: '/test',
        onOutput: (chunk) => chunks.push(chunk),
      });

      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks.join('')).toBe(mockOutput);
    });
  });
});
