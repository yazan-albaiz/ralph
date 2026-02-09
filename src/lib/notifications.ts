/**
 * Notifications - Desktop notifications and sound alerts
 */

import notifier from 'node-notifier';
import beeper from 'beeper';
import type { NotificationPayload, NotificationType } from '../types/index.js';
import { logger } from './logger.js';

// Configuration
let notificationsEnabled = true;
let soundEnabled = true;

/**
 * Enable or disable notifications
 */
export function setNotificationsEnabled(enabled: boolean): void {
  notificationsEnabled = enabled;
}

/**
 * Enable or disable sound
 */
export function setSoundEnabled(enabled: boolean): void {
  soundEnabled = enabled;
}

/**
 * Get notification settings
 */
export function getNotificationSettings(): { notifications: boolean; sound: boolean } {
  return {
    notifications: notificationsEnabled,
    sound: soundEnabled,
  };
}

// Sound patterns for different notification types
const SOUND_PATTERNS: Record<NotificationType, string> = {
  complete: '**',      // Two beeps for completion
  blocked: '***',      // Three beeps for blocked
  decide: '**-*',      // Pattern for decision needed
  error: '****',       // Four rapid beeps for error
  info: '*',           // Single beep for info
};

// Default titles for notification types
const DEFAULT_TITLES: Record<NotificationType, string> = {
  complete: 'Ralph Loop Complete',
  blocked: 'Ralph Loop Blocked',
  decide: 'Ralph Loop Needs Decision',
  error: 'Ralph Loop Error',
  info: 'Ralph Loop',
};

/**
 * Play a sound pattern
 */
export async function playSound(type: NotificationType): Promise<void> {
  if (!soundEnabled) {
    return;
  }

  const pattern = SOUND_PATTERNS[type];

  try {
    await beeper(pattern);
  } catch (err) {
    logger.debug('Sound playback failed', err);
  }
}

/**
 * Send a desktop notification
 */
export async function sendNotification(payload: NotificationPayload): Promise<void> {
  if (!notificationsEnabled) {
    return;
  }

  const title = payload.title || DEFAULT_TITLES[payload.type];

  try {
    await new Promise<void>((resolve, reject) => {
      notifier.notify(
        {
          title,
          message: payload.message,
          sound: false, // We handle sound separately
          wait: false,
        },
        (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });
  } catch (err) {
    logger.debug('Notification failed', err);
  }

  // Play sound if requested
  if (payload.sound !== false) {
    await playSound(payload.type);
  }
}

/**
 * Send completion notification
 */
export async function notifyComplete(
  iteration: number,
  totalDuration: number
): Promise<void> {
  const minutes = Math.floor(totalDuration / 60000);
  const seconds = Math.floor((totalDuration % 60000) / 1000);
  const timeStr = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;

  await sendNotification({
    type: 'complete',
    title: 'Ralph Loop Complete!',
    message: `Completed after ${iteration} iteration(s) in ${timeStr}`,
    sound: true,
  });
}

/**
 * Send blocked notification
 */
export async function notifyBlocked(reason: string): Promise<void> {
  await sendNotification({
    type: 'blocked',
    title: 'Ralph Loop Blocked',
    message: reason || 'Human intervention required',
    sound: true,
  });
}

/**
 * Send decision needed notification
 */
export async function notifyDecision(question: string): Promise<void> {
  await sendNotification({
    type: 'decide',
    title: 'Ralph Loop Needs Decision',
    message: question || 'Please make a decision',
    sound: true,
  });
}

/**
 * Send error notification
 */
export async function notifyError(error: string): Promise<void> {
  await sendNotification({
    type: 'error',
    title: 'Ralph Loop Error',
    message: error || 'An error occurred',
    sound: true,
  });
}

/**
 * Send max iterations reached notification
 */
export async function notifyMaxIterations(maxIterations: number): Promise<void> {
  await sendNotification({
    type: 'error',
    title: 'Ralph Loop Stopped',
    message: `Maximum iterations (${maxIterations}) reached without completion`,
    sound: true,
  });
}

/**
 * Send info notification (silent by default)
 */
export async function notifyInfo(message: string, playSound = false): Promise<void> {
  await sendNotification({
    type: 'info',
    title: 'Ralph Loop',
    message,
    sound: playSound,
  });
}

/**
 * Test notifications (for debugging)
 */
export async function testNotifications(): Promise<void> {
  logger.info('Testing notifications...');

  await sendNotification({
    type: 'info',
    title: 'Test Notification',
    message: 'If you see this, notifications are working!',
    sound: true,
  });

  logger.ok('Notification test complete');
}

export const notifications = {
  setNotificationsEnabled,
  setSoundEnabled,
  getNotificationSettings,
  playSound,
  sendNotification,
  notifyComplete,
  notifyBlocked,
  notifyDecision,
  notifyError,
  notifyMaxIterations,
  notifyInfo,
  testNotifications,
};

export default notifications;
