/**
 * Claude CLI Wrapper Tests
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { setSilentMode } from '../src/lib/logger.js';
import {
  buildClaudeArgs,
  createMockClaudeRunner,
  killActiveProcess,
} from '../src/lib/claude.js';
import type { ClaudeProcessOptions } from '../src/types/index.js';

describe('Claude CLI Wrapper', () => {
  beforeEach(() => {
    setSilentMode(true);
  });

  afterEach(() => {
    setSilentMode(false);
    killActiveProcess();
  });

  describe('buildClaudeArgs', () => {
    test('builds basic args with model', () => {
      const options: ClaudeProcessOptions = {
        prompt: 'Test prompt',
        model: 'opus',
        dangerouslySkipPermissions: false,
        projectRoot: '/test',
      };

      const args = buildClaudeArgs(options);

      expect(args).toContain('--model');
      expect(args).toContain('opus');
      expect(args).toContain('-p');
      expect(args).toContain('Test prompt');
    });

    test('uses acceptEdits permission mode by default', () => {
      const options: ClaudeProcessOptions = {
        prompt: 'Test',
        model: 'sonnet',
        dangerouslySkipPermissions: false,
        projectRoot: '/test',
      };

      const args = buildClaudeArgs(options);

      expect(args).toContain('--permission-mode');
      expect(args).toContain('acceptEdits');
      expect(args).not.toContain('--dangerously-skip-permissions');
    });

    test('uses dangerously-skip-permissions when enabled', () => {
      const options: ClaudeProcessOptions = {
        prompt: 'Test',
        model: 'sonnet',
        dangerouslySkipPermissions: true,
        projectRoot: '/test',
      };

      const args = buildClaudeArgs(options);

      expect(args).toContain('--dangerously-skip-permissions');
      expect(args).not.toContain('--permission-mode');
    });

    test('includes prompt with -p flag', () => {
      const options: ClaudeProcessOptions = {
        prompt: 'Build a REST API with authentication',
        model: 'opus',
        dangerouslySkipPermissions: false,
        projectRoot: '/test',
      };

      const args = buildClaudeArgs(options);

      const pIndex = args.indexOf('-p');
      expect(pIndex).toBeGreaterThan(-1);
      expect(args[pIndex + 1]).toBe('Build a REST API with authentication');
    });
  });

  describe('createMockClaudeRunner', () => {
    test('returns mock output', async () => {
      const mockOutput = 'Mock output <promise>COMPLETE</promise>';
      const runner = createMockClaudeRunner(mockOutput, 10);

      const result = await runner({
        prompt: 'Test',
        model: 'opus',
        dangerouslySkipPermissions: false,
        projectRoot: '/test',
      });

      expect(result.success).toBe(true);
      expect(result.output).toBe(mockOutput);
      expect(result.promiseTag.type).toBe('COMPLETE');
    });

    test('streams output to callback', async () => {
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

    test('parses BLOCKED tag from mock output', async () => {
      const mockOutput = '<promise>BLOCKED: Need credentials</promise>';
      const runner = createMockClaudeRunner(mockOutput, 10);

      const result = await runner({
        prompt: 'Test',
        model: 'opus',
        dangerouslySkipPermissions: false,
        projectRoot: '/test',
      });

      expect(result.promiseTag.type).toBe('BLOCKED');
      expect(result.promiseTag.content).toBe('Need credentials');
    });

    test('parses DECIDE tag from mock output', async () => {
      const mockOutput = '<promise>DECIDE: Use Redux or Context?</promise>';
      const runner = createMockClaudeRunner(mockOutput, 10);

      const result = await runner({
        prompt: 'Test',
        model: 'opus',
        dangerouslySkipPermissions: false,
        projectRoot: '/test',
      });

      expect(result.promiseTag.type).toBe('DECIDE');
      expect(result.promiseTag.content).toBe('Use Redux or Context?');
    });

    test('tracks duration', async () => {
      const mockOutput = 'Output';
      const delay = 50;
      const runner = createMockClaudeRunner(mockOutput, delay);

      const result = await runner({
        prompt: 'Test',
        model: 'opus',
        dangerouslySkipPermissions: false,
        projectRoot: '/test',
      });

      expect(result.duration).toBeGreaterThanOrEqual(delay);
    });
  });

  describe('killActiveProcess', () => {
    test('returns false when no active process', () => {
      const killed = killActiveProcess();
      expect(killed).toBe(false);
    });
  });
});
