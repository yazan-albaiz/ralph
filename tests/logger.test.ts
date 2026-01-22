/**
 * Logger Tests
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import {
  logger,
  info,
  ok,
  warn,
  error,
  debug,
  setDebugEnabled,
  setSilentMode,
  getLogBuffer,
  clearLogBuffer,
  createPrefixedLogger,
} from '../src/lib/logger.js';

describe('Logger', () => {
  beforeEach(() => {
    // Enable silent mode to avoid console noise during tests
    setSilentMode(true);
    clearLogBuffer();
  });

  afterEach(() => {
    setSilentMode(false);
    setDebugEnabled(false);
    clearLogBuffer();
  });

  describe('Basic Logging', () => {
    test('info() adds entry to buffer with INFO level', () => {
      info('Test info message');
      const buffer = getLogBuffer();
      expect(buffer).toHaveLength(1);
      expect(buffer[0].level).toBe('INFO');
      expect(buffer[0].message).toBe('Test info message');
    });

    test('ok() adds entry to buffer with OK level', () => {
      ok('Test ok message');
      const buffer = getLogBuffer();
      expect(buffer).toHaveLength(1);
      expect(buffer[0].level).toBe('OK');
      expect(buffer[0].message).toBe('Test ok message');
    });

    test('warn() adds entry to buffer with WARN level', () => {
      warn('Test warn message');
      const buffer = getLogBuffer();
      expect(buffer).toHaveLength(1);
      expect(buffer[0].level).toBe('WARN');
      expect(buffer[0].message).toBe('Test warn message');
    });

    test('error() adds entry to buffer with ERROR level', () => {
      error('Test error message');
      const buffer = getLogBuffer();
      expect(buffer).toHaveLength(1);
      expect(buffer[0].level).toBe('ERROR');
      expect(buffer[0].message).toBe('Test error message');
    });
  });

  describe('Debug Logging', () => {
    test('debug() does not log when debug is disabled', () => {
      setDebugEnabled(false);
      debug('Test debug message');
      const buffer = getLogBuffer();
      expect(buffer).toHaveLength(0);
    });

    test('debug() logs when debug is enabled', () => {
      setDebugEnabled(true);
      debug('Test debug message');
      const buffer = getLogBuffer();
      expect(buffer).toHaveLength(1);
      expect(buffer[0].level).toBe('DEBUG');
      expect(buffer[0].message).toBe('Test debug message');
    });
  });

  describe('Data Attachment', () => {
    test('logs with attached data', () => {
      const testData = { foo: 'bar', num: 42 };
      info('Message with data', testData);
      const buffer = getLogBuffer();
      expect(buffer).toHaveLength(1);
      expect(buffer[0].data).toEqual(testData);
    });
  });

  describe('Buffer Management', () => {
    test('clearLogBuffer() clears all entries', () => {
      info('Message 1');
      info('Message 2');
      expect(getLogBuffer()).toHaveLength(2);
      clearLogBuffer();
      expect(getLogBuffer()).toHaveLength(0);
    });

    test('buffer respects max size', () => {
      // Log more than max buffer size (1000)
      for (let i = 0; i < 1005; i++) {
        info(`Message ${i}`);
      }
      const buffer = getLogBuffer();
      expect(buffer.length).toBeLessThanOrEqual(1000);
    });
  });

  describe('Prefixed Logger', () => {
    test('createPrefixedLogger adds prefix to all messages', () => {
      const componentLogger = createPrefixedLogger('TestComponent');
      componentLogger.info('Test message');
      componentLogger.warn('Warning message');

      const buffer = getLogBuffer();
      expect(buffer).toHaveLength(2);
      expect(buffer[0].message).toBe('[TestComponent] Test message');
      expect(buffer[1].message).toBe('[TestComponent] Warning message');
    });
  });

  describe('Timestamp', () => {
    test('log entries have valid timestamps', () => {
      info('Test message');
      const buffer = getLogBuffer();
      expect(buffer[0].timestamp).toBeInstanceOf(Date);
      expect(buffer[0].timestamp.getTime()).toBeLessThanOrEqual(Date.now());
    });
  });

  describe('Logger Object', () => {
    test('logger object has all methods', () => {
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.ok).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.error).toBe('function');
      expect(typeof logger.debug).toBe('function');
      expect(typeof logger.setDebugEnabled).toBe('function');
      expect(typeof logger.setSilentMode).toBe('function');
      expect(typeof logger.getLogBuffer).toBe('function');
      expect(typeof logger.clearLogBuffer).toBe('function');
      expect(typeof logger.createPrefixedLogger).toBe('function');
    });
  });
});
