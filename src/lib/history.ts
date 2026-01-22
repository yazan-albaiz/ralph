/**
 * History Management - Save and load iteration history
 */

import { mkdir, readFile, writeFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { nanoid } from 'nanoid';
import type {
  HistoryEntry,
  HistoryIndex,
  IterationRecord,
  RalphConfig,
  LoopStatus,
  ParsedPromiseTag,
} from '../types/index.js';
import { logger } from './logger.js';

// History directory path
const RALPH_DIR = join(homedir(), '.ralph');
const HISTORY_DIR = join(RALPH_DIR, 'history');
const INDEX_FILE = join(HISTORY_DIR, 'index.json');
const INDEX_VERSION = 1;

/**
 * Ensure history directory exists
 */
export async function ensureHistoryDir(): Promise<void> {
  if (!existsSync(RALPH_DIR)) {
    await mkdir(RALPH_DIR, { recursive: true });
    logger.debug('Created ~/.ralph directory');
  }
  if (!existsSync(HISTORY_DIR)) {
    await mkdir(HISTORY_DIR, { recursive: true });
    logger.debug('Created ~/.ralph/history directory');
  }
}

/**
 * Load the history index
 */
export async function loadHistoryIndex(): Promise<HistoryIndex> {
  await ensureHistoryDir();

  if (!existsSync(INDEX_FILE)) {
    return { version: INDEX_VERSION, entries: [] };
  }

  try {
    const content = await readFile(INDEX_FILE, 'utf-8');
    const index = JSON.parse(content) as HistoryIndex;

    // Handle version migrations if needed
    if (index.version !== INDEX_VERSION) {
      logger.warn(`History index version mismatch (got ${index.version}, expected ${INDEX_VERSION})`);
    }

    return index;
  } catch (err) {
    logger.error('Failed to load history index', err);
    return { version: INDEX_VERSION, entries: [] };
  }
}

/**
 * Save the history index
 */
export async function saveHistoryIndex(index: HistoryIndex): Promise<void> {
  await ensureHistoryDir();

  try {
    await writeFile(INDEX_FILE, JSON.stringify(index, null, 2), 'utf-8');
  } catch (err) {
    logger.error('Failed to save history index', err);
    throw err;
  }
}

/**
 * Generate a unique history entry ID
 */
export function generateHistoryId(): string {
  return nanoid(10);
}

/**
 * Generate filename for a history entry
 */
function getHistoryFilename(entry: Pick<HistoryEntry, 'id' | 'timestamp'>): string {
  const date = new Date(entry.timestamp);
  const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
  return `${dateStr}-${entry.id}.json`;
}

/**
 * Create a new history entry
 */
export function createHistoryEntry(
  config: RalphConfig,
  prompt: string
): HistoryEntry {
  const id = generateHistoryId();
  const timestamp = new Date().toISOString();

  return {
    id,
    timestamp,
    projectRoot: config.projectRoot,
    prompt,
    config: {
      maxIterations: config.maxIterations,
      model: config.model,
      completionSignal: config.completionSignal,
    },
    iterations: [],
    result: 'running' as LoopStatus,
    totalDuration: 0,
  };
}

/**
 * Add an iteration record to a history entry
 */
export function addIterationToHistory(
  entry: HistoryEntry,
  iteration: Omit<IterationRecord, 'number'>
): HistoryEntry {
  const newIteration: IterationRecord = {
    ...iteration,
    number: entry.iterations.length + 1,
  };

  return {
    ...entry,
    iterations: [...entry.iterations, newIteration],
  };
}

/**
 * Finalize a history entry with the result
 */
export function finalizeHistoryEntry(
  entry: HistoryEntry,
  result: LoopStatus,
  totalDuration: number
): HistoryEntry {
  return {
    ...entry,
    result,
    totalDuration,
  };
}

/**
 * Save a history entry to disk
 */
export async function saveHistoryEntry(entry: HistoryEntry): Promise<void> {
  await ensureHistoryDir();

  const filename = getHistoryFilename(entry);
  const filepath = join(HISTORY_DIR, filename);

  try {
    await writeFile(filepath, JSON.stringify(entry, null, 2), 'utf-8');
    logger.debug(`Saved history entry: ${filename}`);

    // Update index
    const index = await loadHistoryIndex();
    const existingIdx = index.entries.findIndex((e) => e.id === entry.id);

    const indexEntry = {
      id: entry.id,
      timestamp: entry.timestamp,
      projectRoot: entry.projectRoot,
      result: entry.result,
      iterationCount: entry.iterations.length,
      totalDuration: entry.totalDuration,
    };

    if (existingIdx >= 0) {
      index.entries[existingIdx] = indexEntry;
    } else {
      index.entries.push(indexEntry);
    }

    await saveHistoryIndex(index);
  } catch (err) {
    logger.error('Failed to save history entry', err);
    throw err;
  }
}

/**
 * Load a specific history entry by ID
 */
export async function loadHistoryEntry(id: string): Promise<HistoryEntry | null> {
  await ensureHistoryDir();

  try {
    const files = await readdir(HISTORY_DIR);
    const matchingFile = files.find((f) => f.includes(id) && f.endsWith('.json'));

    if (!matchingFile || matchingFile === 'index.json') {
      return null;
    }

    const filepath = join(HISTORY_DIR, matchingFile);
    const content = await readFile(filepath, 'utf-8');
    return JSON.parse(content) as HistoryEntry;
  } catch (err) {
    logger.error(`Failed to load history entry ${id}`, err);
    return null;
  }
}

/**
 * List recent history entries
 */
export async function listRecentHistory(limit = 10): Promise<HistoryIndex['entries']> {
  const index = await loadHistoryIndex();

  // Sort by timestamp descending
  const sorted = [...index.entries].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return sorted.slice(0, limit);
}

/**
 * Create an iteration record helper
 */
export function createIterationRecord(
  startTime: Date,
  output: string,
  promiseTag: ParsedPromiseTag | null
): Omit<IterationRecord, 'number'> {
  const endTime = new Date();
  return {
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
    duration: endTime.getTime() - startTime.getTime(),
    output,
    promiseTag,
  };
}

export const history = {
  ensureHistoryDir,
  loadHistoryIndex,
  saveHistoryIndex,
  generateHistoryId,
  createHistoryEntry,
  addIterationToHistory,
  finalizeHistoryEntry,
  saveHistoryEntry,
  loadHistoryEntry,
  listRecentHistory,
  createIterationRecord,
};

export default history;
