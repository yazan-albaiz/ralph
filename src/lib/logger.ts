/**
 * Structured Colored Logging Utility
 */

import chalk from 'chalk';
import type { LogLevel, LogEntry } from '../types/index.js';

// Color mapping for log levels
const levelColors: Record<LogLevel, (text: string) => string> = {
  INFO: chalk.blue,
  OK: chalk.green,
  WARN: chalk.yellow,
  ERROR: chalk.red,
  DEBUG: chalk.gray,
};

// Level prefixes with padding for alignment
const levelPrefixes: Record<LogLevel, string> = {
  INFO: '[INFO] ',
  OK: '[OK]   ',
  WARN: '[WARN] ',
  ERROR: '[ERROR]',
  DEBUG: '[DEBUG]',
};

// Internal log buffer for testing/debugging
const logBuffer: LogEntry[] = [];
const MAX_BUFFER_SIZE = 1000;

// Configuration
let debugEnabled = false;
let silentMode = false;

/**
 * Enable or disable debug logging
 */
export function setDebugEnabled(enabled: boolean): void {
  debugEnabled = enabled;
}

/**
 * Enable or disable all logging (for testing)
 */
export function setSilentMode(enabled: boolean): void {
  silentMode = enabled;
}

/**
 * Format timestamp for log output
 */
function formatTimestamp(): string {
  const now = new Date();
  return chalk.gray(
    `[${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}]`
  );
}

/**
 * Core logging function
 */
function logInternal(level: LogLevel, message: string, data?: unknown): void {
  // Skip debug logs if not enabled
  if (level === 'DEBUG' && !debugEnabled) {
    return;
  }

  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date(),
    data,
  };

  // Add to buffer
  logBuffer.push(entry);
  if (logBuffer.length > MAX_BUFFER_SIZE) {
    logBuffer.shift();
  }

  // Skip console output in silent mode
  if (silentMode) {
    return;
  }

  const colorFn = levelColors[level];
  const prefix = colorFn(levelPrefixes[level]);
  const timestamp = formatTimestamp();

  let output = `${timestamp} ${prefix} ${message}`;

  // Add data if present (for debug)
  if (data !== undefined && debugEnabled) {
    output += '\n' + chalk.gray(JSON.stringify(data, null, 2));
  }

  // Use appropriate console method
  if (level === 'ERROR') {
    console.error(output);
  } else if (level === 'WARN') {
    console.warn(output);
  } else {
    console.log(output);
  }
}

/**
 * Log an info message
 */
export function info(message: string, data?: unknown): void {
  logInternal('INFO', message, data);
}

/**
 * Log a success message
 */
export function ok(message: string, data?: unknown): void {
  logInternal('OK', message, data);
}

/**
 * Log a warning message
 */
export function warn(message: string, data?: unknown): void {
  logInternal('WARN', message, data);
}

/**
 * Log an error message
 */
export function error(message: string, data?: unknown): void {
  logInternal('ERROR', message, data);
}

/**
 * Log a debug message (only if debug is enabled)
 */
export function debug(message: string, data?: unknown): void {
  logInternal('DEBUG', message, data);
}

/**
 * Get the log buffer (for testing)
 */
export function getLogBuffer(): LogEntry[] {
  return [...logBuffer];
}

/**
 * Clear the log buffer
 */
export function clearLogBuffer(): void {
  logBuffer.length = 0;
}

/**
 * Create a prefixed logger for a specific component
 */
export function createPrefixedLogger(prefix: string) {
  return {
    info: (message: string, data?: unknown) => info(`[${prefix}] ${message}`, data),
    ok: (message: string, data?: unknown) => ok(`[${prefix}] ${message}`, data),
    warn: (message: string, data?: unknown) => warn(`[${prefix}] ${message}`, data),
    error: (message: string, data?: unknown) => error(`[${prefix}] ${message}`, data),
    debug: (message: string, data?: unknown) => debug(`[${prefix}] ${message}`, data),
  };
}

// Default export as object with all functions
export const logger = {
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
};

export default logger;
