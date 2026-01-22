/**
 * useOutputCapture Hook - Live output streaming and buffering with throttling
 */

import { useState, useCallback, useRef, useEffect } from 'react';

interface UseOutputCaptureReturn {
  output: string[];
  addOutput: (chunk: string) => void;
  clearOutput: () => void;
  getFullOutput: () => string;
  getRecentLines: (n: number) => string[];
  finalFlush: () => void;
}

interface UseOutputCaptureOptions {
  maxBufferSize?: number;
  maxLines?: number;
  throttleMs?: number;
}

/**
 * Hook for capturing and managing output streams with throttling to prevent TUI flashing
 */
export function useOutputCapture(options: UseOutputCaptureOptions = {}): UseOutputCaptureReturn {
  const { maxBufferSize = 100, maxLines = 50, throttleMs = 100 } = options;

  const [output, setOutput] = useState<string[]>([]);
  const bufferRef = useRef<string[]>([]);
  const pendingChunksRef = useRef<string[]>([]);
  const lastUpdateRef = useRef<number>(0);
  const pendingUpdateRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Flush pending chunks to buffer and update state
   */
  const flushBuffer = useCallback(() => {
    if (pendingChunksRef.current.length === 0) return;

    // Add pending chunks to buffer
    bufferRef.current.push(...pendingChunksRef.current);
    pendingChunksRef.current = [];

    // Trim buffer if it gets too large
    if (bufferRef.current.length > maxBufferSize * 2) {
      const allLines = bufferRef.current.flatMap((c) => c.split('\n'));
      const trimmed = allLines.slice(-maxBufferSize);
      bufferRef.current = [trimmed.join('\n')];
    }

    // Update state
    setOutput([...bufferRef.current]);
    lastUpdateRef.current = Date.now();
  }, [maxBufferSize]);

  /**
   * Add a chunk of output to the buffer (throttled)
   */
  const addOutput = useCallback(
    (chunk: string) => {
      // Add to pending chunks
      pendingChunksRef.current.push(chunk);

      const now = Date.now();
      const timeSinceLastUpdate = now - lastUpdateRef.current;

      // If enough time has passed, flush immediately
      if (timeSinceLastUpdate >= throttleMs) {
        if (pendingUpdateRef.current) {
          clearTimeout(pendingUpdateRef.current);
          pendingUpdateRef.current = null;
        }
        flushBuffer();
      } else {
        // Schedule a flush if not already scheduled
        if (!pendingUpdateRef.current) {
          pendingUpdateRef.current = setTimeout(() => {
            pendingUpdateRef.current = null;
            flushBuffer();
          }, throttleMs - timeSinceLastUpdate);
        }
      }
    },
    [throttleMs, flushBuffer]
  );

  /**
   * Clear all output
   */
  const clearOutput = useCallback(() => {
    if (pendingUpdateRef.current) {
      clearTimeout(pendingUpdateRef.current);
      pendingUpdateRef.current = null;
    }
    pendingChunksRef.current = [];
    bufferRef.current = [];
    setOutput([]);
  }, []);

  /**
   * Get the full concatenated output
   */
  const getFullOutput = useCallback(() => {
    // Include pending chunks that haven't been flushed yet
    return [...bufferRef.current, ...pendingChunksRef.current].join('');
  }, []);

  /**
   * Get the most recent N lines
   */
  const getRecentLines = useCallback(
    (n: number = maxLines) => {
      const allChunks = [...bufferRef.current, ...pendingChunksRef.current];
      const allLines = allChunks.flatMap((c) => c.split('\n'));
      return allLines.slice(-n);
    },
    [maxLines]
  );

  /**
   * Force flush all pending output (call when iteration completes)
   */
  const finalFlush = useCallback(() => {
    if (pendingUpdateRef.current) {
      clearTimeout(pendingUpdateRef.current);
      pendingUpdateRef.current = null;
    }
    flushBuffer();
  }, [flushBuffer]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pendingUpdateRef.current) {
        clearTimeout(pendingUpdateRef.current);
      }
    };
  }, []);

  return {
    output,
    addOutput,
    clearOutput,
    getFullOutput,
    getRecentLines,
    finalFlush,
  };
}

/**
 * Rolling buffer class for output management
 */
export class RollingBuffer {
  private chunks: string[] = [];
  private maxChunks: number;
  private maxLines: number;

  constructor(maxChunks = 100, maxLines = 50) {
    this.maxChunks = maxChunks;
    this.maxLines = maxLines;
  }

  add(chunk: string): void {
    this.chunks.push(chunk);
    this.trim();
  }

  private trim(): void {
    if (this.chunks.length > this.maxChunks * 2) {
      const allLines = this.getLines();
      const trimmed = allLines.slice(-this.maxLines * 2);
      this.chunks = [trimmed.join('\n')];
    }
  }

  getLines(): string[] {
    return this.chunks.flatMap((c) => c.split('\n'));
  }

  getRecentLines(n?: number): string[] {
    const lines = this.getLines();
    return lines.slice(-(n || this.maxLines));
  }

  getFullOutput(): string {
    return this.chunks.join('');
  }

  clear(): void {
    this.chunks = [];
  }

  get length(): number {
    return this.chunks.length;
  }

  get lineCount(): number {
    return this.getLines().length;
  }
}

/**
 * Create a new rolling buffer instance
 */
export function createRollingBuffer(maxChunks = 100, maxLines = 50): RollingBuffer {
  return new RollingBuffer(maxChunks, maxLines);
}

export default useOutputCapture;
