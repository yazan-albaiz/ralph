/**
 * useOutputCapture Hook - Live output streaming and buffering
 */

import { useState, useCallback, useRef } from 'react';

interface UseOutputCaptureReturn {
  output: string[];
  addOutput: (chunk: string) => void;
  clearOutput: () => void;
  getFullOutput: () => string;
  getRecentLines: (n: number) => string[];
}

interface UseOutputCaptureOptions {
  maxBufferSize?: number;
  maxLines?: number;
}

/**
 * Hook for capturing and managing output streams
 */
export function useOutputCapture(options: UseOutputCaptureOptions = {}): UseOutputCaptureReturn {
  const { maxBufferSize = 100, maxLines = 50 } = options;

  const [output, setOutput] = useState<string[]>([]);
  const bufferRef = useRef<string[]>([]);

  /**
   * Add a chunk of output to the buffer
   */
  const addOutput = useCallback(
    (chunk: string) => {
      bufferRef.current.push(chunk);

      // Trim buffer if it gets too large
      if (bufferRef.current.length > maxBufferSize * 2) {
        const allLines = bufferRef.current.flatMap((c) => c.split('\n'));
        const trimmed = allLines.slice(-maxBufferSize);
        bufferRef.current = [trimmed.join('\n')];
      }

      // Update state (batched for performance)
      setOutput([...bufferRef.current]);
    },
    [maxBufferSize]
  );

  /**
   * Clear all output
   */
  const clearOutput = useCallback(() => {
    bufferRef.current = [];
    setOutput([]);
  }, []);

  /**
   * Get the full concatenated output
   */
  const getFullOutput = useCallback(() => {
    return bufferRef.current.join('');
  }, []);

  /**
   * Get the most recent N lines
   */
  const getRecentLines = useCallback(
    (n: number = maxLines) => {
      const allLines = bufferRef.current.flatMap((c) => c.split('\n'));
      return allLines.slice(-n);
    },
    [maxLines]
  );

  return {
    output,
    addOutput,
    clearOutput,
    getFullOutput,
    getRecentLines,
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
