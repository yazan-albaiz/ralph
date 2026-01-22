/**
 * History Management Tests
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { rm, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { setSilentMode } from '../src/lib/logger.js';
import {
  history,
  createHistoryEntry,
  addIterationToHistory,
  finalizeHistoryEntry,
  createIterationRecord,
  generateHistoryId,
} from '../src/lib/history.js';
import type { RalphConfig, ParsedPromiseTag } from '../src/types/index.js';

// Use a test directory to avoid polluting user's ~/.ralph
const TEST_RALPH_DIR = join(homedir(), '.ralph-test');
const TEST_HISTORY_DIR = join(TEST_RALPH_DIR, 'history');

describe('History Management', () => {
  beforeEach(() => {
    setSilentMode(true);
  });

  afterEach(() => {
    setSilentMode(false);
  });

  describe('generateHistoryId', () => {
    test('generates unique IDs', () => {
      const id1 = generateHistoryId();
      const id2 = generateHistoryId();
      expect(id1).not.toBe(id2);
    });

    test('generates IDs of correct length', () => {
      const id = generateHistoryId();
      expect(id.length).toBe(10);
    });
  });

  describe('createHistoryEntry', () => {
    test('creates entry with correct structure', () => {
      const config: RalphConfig = {
        maxIterations: 100,
        completionSignal: '<promise>COMPLETE</promise>',
        model: 'opus',
        dangerouslySkipPermissions: false,
        verbose: false,
        showSplash: true,
        enableNotifications: true,
        enableSound: true,
        prompt: 'Test prompt',
        isFile: false,
        projectRoot: '/test/project',
      };

      const entry = createHistoryEntry(config, 'Test prompt content');

      expect(entry.id).toBeDefined();
      expect(entry.id.length).toBe(10);
      expect(entry.timestamp).toBeDefined();
      expect(entry.projectRoot).toBe('/test/project');
      expect(entry.prompt).toBe('Test prompt content');
      expect(entry.iterations).toEqual([]);
      expect(entry.result).toBe('running');
      expect(entry.totalDuration).toBe(0);
      expect(entry.config.maxIterations).toBe(100);
      expect(entry.config.model).toBe('opus');
    });
  });

  describe('addIterationToHistory', () => {
    test('adds iteration with correct number', () => {
      const config: RalphConfig = {
        maxIterations: 100,
        completionSignal: '<promise>COMPLETE</promise>',
        model: 'opus',
        dangerouslySkipPermissions: false,
        verbose: false,
        showSplash: true,
        enableNotifications: true,
        enableSound: true,
        prompt: 'Test',
        isFile: false,
        projectRoot: '/test',
      };

      let entry = createHistoryEntry(config, 'Test');

      // Add first iteration
      const iteration1 = {
        startTime: '2024-01-01T00:00:00Z',
        endTime: '2024-01-01T00:01:00Z',
        duration: 60000,
        output: 'Output 1',
        promiseTag: null,
      };
      entry = addIterationToHistory(entry, iteration1);

      expect(entry.iterations).toHaveLength(1);
      expect(entry.iterations[0].number).toBe(1);
      expect(entry.iterations[0].output).toBe('Output 1');

      // Add second iteration
      const iteration2 = {
        startTime: '2024-01-01T00:01:00Z',
        endTime: '2024-01-01T00:02:00Z',
        duration: 60000,
        output: 'Output 2',
        promiseTag: null,
      };
      entry = addIterationToHistory(entry, iteration2);

      expect(entry.iterations).toHaveLength(2);
      expect(entry.iterations[1].number).toBe(2);
    });
  });

  describe('finalizeHistoryEntry', () => {
    test('finalizes entry with result and duration', () => {
      const config: RalphConfig = {
        maxIterations: 100,
        completionSignal: '<promise>COMPLETE</promise>',
        model: 'opus',
        dangerouslySkipPermissions: false,
        verbose: false,
        showSplash: true,
        enableNotifications: true,
        enableSound: true,
        prompt: 'Test',
        isFile: false,
        projectRoot: '/test',
      };

      let entry = createHistoryEntry(config, 'Test');
      entry = finalizeHistoryEntry(entry, 'completed', 120000);

      expect(entry.result).toBe('completed');
      expect(entry.totalDuration).toBe(120000);
    });
  });

  describe('createIterationRecord', () => {
    test('creates iteration record with timing', () => {
      const startTime = new Date('2024-01-01T00:00:00Z');
      const promiseTag: ParsedPromiseTag = {
        type: 'COMPLETE',
        content: null,
        raw: '<promise>COMPLETE</promise>',
      };

      const record = createIterationRecord(startTime, 'Test output', promiseTag);

      expect(record.startTime).toBe('2024-01-01T00:00:00.000Z');
      expect(record.endTime).toBeDefined();
      expect(record.duration).toBeGreaterThanOrEqual(0);
      expect(record.output).toBe('Test output');
      expect(record.promiseTag).toEqual(promiseTag);
    });

    test('creates record with null promise tag', () => {
      const startTime = new Date();
      const record = createIterationRecord(startTime, 'Test', null);

      expect(record.promiseTag).toBeNull();
    });
  });

  describe('History Object', () => {
    test('history object has all methods', () => {
      expect(typeof history.ensureHistoryDir).toBe('function');
      expect(typeof history.loadHistoryIndex).toBe('function');
      expect(typeof history.saveHistoryIndex).toBe('function');
      expect(typeof history.generateHistoryId).toBe('function');
      expect(typeof history.createHistoryEntry).toBe('function');
      expect(typeof history.addIterationToHistory).toBe('function');
      expect(typeof history.finalizeHistoryEntry).toBe('function');
      expect(typeof history.saveHistoryEntry).toBe('function');
      expect(typeof history.loadHistoryEntry).toBe('function');
      expect(typeof history.listRecentHistory).toBe('function');
      expect(typeof history.createIterationRecord).toBe('function');
    });
  });
});
