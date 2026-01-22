/**
 * Ralph CLI Type Definitions
 */

// CLI Configuration
export interface RalphConfig {
  maxIterations: number;
  unlimited: boolean;
  completionSignal: string;
  model: string;
  dangerouslySkipPermissions: boolean;
  verbose: boolean;
  showSplash: boolean;
  enableNotifications: boolean;
  enableSound: boolean;
  prompt: string;
  isFile: boolean;
  projectRoot: string;
  sandbox: boolean;
  headless: boolean;
  autoCommit: boolean;
}

// Default configuration values
export const DEFAULT_CONFIG: Omit<RalphConfig, 'prompt' | 'isFile' | 'projectRoot'> = {
  maxIterations: 200,
  unlimited: false,
  completionSignal: '<promise>COMPLETE</promise>',
  model: 'opus',
  dangerouslySkipPermissions: false,
  verbose: false,
  showSplash: true,
  enableNotifications: true,
  enableSound: true,
  sandbox: false,
  headless: false,
  autoCommit: true,
};

// Timing and Performance
export interface TimingStats {
  startTime: number;
  totalElapsed: number;
  iterationTimes: number[];
  runningAverage: number;
  lastDuration: number;
  lastDelta: number;
  deltaDirection: 'up' | 'down' | 'same';
}

// Promise Tag Types
export type PromiseTagType = 'COMPLETE' | 'BLOCKED' | 'DECIDE' | null;

export interface ParsedPromiseTag {
  type: PromiseTagType;
  content: string | null;
  raw: string | null;
}

// Loop State
export type LoopStatus =
  | 'idle'
  | 'running'
  | 'paused'
  | 'completed'
  | 'blocked'
  | 'decide'
  | 'max_reached'
  | 'cancelled'
  | 'error';

export interface LoopState {
  status: LoopStatus;
  currentIteration: number;
  output: string[];
  lastPromiseTag: ParsedPromiseTag | null;
  error: string | null;
}

// History Types
export interface IterationRecord {
  number: number;
  startTime: string;
  endTime: string;
  duration: number;
  output: string;
  promiseTag: ParsedPromiseTag | null;
}

export interface HistoryEntry {
  id: string;
  timestamp: string;
  projectRoot: string;
  prompt: string;
  config: Partial<RalphConfig>;
  iterations: IterationRecord[];
  result: LoopStatus;
  totalDuration: number;
}

export interface HistoryIndex {
  version: number;
  entries: Array<{
    id: string;
    timestamp: string;
    projectRoot: string;
    result: LoopStatus;
    iterationCount: number;
    totalDuration: number;
  }>;
}

// Pre-flight Check Results
export interface PreflightCheck {
  name: string;
  passed: boolean;
  message: string;
  fatal: boolean;
}

export interface PreflightResult {
  passed: boolean;
  checks: PreflightCheck[];
  errors: PreflightCheck[];
  warnings: PreflightCheck[];
}

// Log Levels
export type LogLevel = 'INFO' | 'OK' | 'WARN' | 'ERROR' | 'DEBUG';

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  data?: unknown;
}

// Notification Types
export type NotificationType = 'complete' | 'blocked' | 'decide' | 'error' | 'info';

export interface NotificationPayload {
  type: NotificationType;
  title: string;
  message: string;
  sound?: boolean;
}

// Claude Process Types
export interface ClaudeProcessOptions {
  prompt: string;
  model: string;
  dangerouslySkipPermissions: boolean;
  projectRoot: string;
  sandbox?: boolean;
  onOutput?: (chunk: string) => void;
  onError?: (error: string) => void;
}

export interface ClaudeProcessResult {
  success: boolean;
  output: string;
  error: string | null;
  duration: number;
  promiseTag: ParsedPromiseTag | null;
}

// Docker Sandbox Types
export interface DockerPreflightResult {
  passed: boolean;
  dockerInstalled: boolean;
  dockerRunning: boolean;
  sandboxPluginAvailable: boolean;
  dockerVersion: string | null;
  dockerDesktopVersion: string | null;
  meetsMinimumVersion: boolean;
  errors: string[];
}

export type SandboxFallbackChoice = 'continue-without-sandbox' | 'exit';

// Spawn Configuration for Docker sandbox mode
export interface SpawnConfig {
  command: string;
  args: string[];
}
