/**
 * useExitHandler Hook - Double Ctrl+C handling
 */

import { useEffect, useCallback, useRef, useState } from 'react';
import { useApp } from 'ink';

interface UseExitHandlerOptions {
  onExit?: () => void | Promise<void>;
  confirmTimeout?: number;
  enabled?: boolean;
}

interface UseExitHandlerReturn {
  exitRequested: boolean;
  confirmExit: boolean;
  requestExit: () => void;
  cancelExit: () => void;
  forceExit: () => void;
}

/**
 * Hook for handling graceful exit with double Ctrl+C confirmation
 */
export function useExitHandler(options: UseExitHandlerOptions = {}): UseExitHandlerReturn {
  const { onExit, confirmTimeout = 2000, enabled = true } = options;

  const { exit } = useApp();
  const [exitRequested, setExitRequested] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);
  const ctrlCCountRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Handle the actual exit
   */
  const performExit = useCallback(async () => {
    if (onExit) {
      await onExit();
    }
    exit();
  }, [exit, onExit]);

  /**
   * Request exit (first Ctrl+C)
   */
  const requestExit = useCallback(() => {
    ctrlCCountRef.current++;

    if (ctrlCCountRef.current === 1) {
      setExitRequested(true);
      setConfirmExit(false);

      // Reset after timeout
      timerRef.current = setTimeout(() => {
        ctrlCCountRef.current = 0;
        setExitRequested(false);
      }, confirmTimeout);
    } else {
      // Second Ctrl+C - confirm exit
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      setConfirmExit(true);
      performExit();
    }
  }, [confirmTimeout, performExit]);

  /**
   * Cancel the exit request
   */
  const cancelExit = useCallback(() => {
    ctrlCCountRef.current = 0;
    setExitRequested(false);
    setConfirmExit(false);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  /**
   * Force immediate exit (bypass confirmation)
   */
  const forceExit = useCallback(() => {
    performExit();
  }, [performExit]);

  // Set up SIGINT handler
  useEffect(() => {
    if (!enabled) return;

    const handler = () => {
      requestExit();
    };

    process.on('SIGINT', handler);

    return () => {
      process.off('SIGINT', handler);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [enabled, requestExit]);

  return {
    exitRequested,
    confirmExit,
    requestExit,
    cancelExit,
    forceExit,
  };
}

/**
 * Non-hook version for use outside React components
 */
export function setupExitHandler(options: {
  onExit?: () => void | Promise<void>;
  onFirstCtrlC?: () => void;
  confirmTimeout?: number;
}): () => void {
  const { onExit, onFirstCtrlC, confirmTimeout = 2000 } = options;

  let ctrlCCount = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const handler = async () => {
    ctrlCCount++;

    if (ctrlCCount === 1) {
      onFirstCtrlC?.();
      console.log('\nPress Ctrl+C again to exit...');

      timer = setTimeout(() => {
        ctrlCCount = 0;
      }, confirmTimeout);
    } else {
      if (timer) {
        clearTimeout(timer);
      }

      if (onExit) {
        await onExit();
      }

      process.exit(0);
    }
  };

  process.on('SIGINT', handler);

  // Return cleanup function
  return () => {
    process.off('SIGINT', handler);
    if (timer) {
      clearTimeout(timer);
    }
  };
}

/**
 * Exit warning message component helper
 */
export function getExitWarningMessage(): string {
  return 'Press Ctrl+C again within 2 seconds to exit...';
}

export default useExitHandler;
