/**
 * Notifications Tests
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { setSilentMode } from '../src/lib/logger.js';
import {
  notifications,
  setNotificationsEnabled,
  setSoundEnabled,
  getNotificationSettings,
} from '../src/lib/notifications.js';

describe('Notifications', () => {
  beforeEach(() => {
    setSilentMode(true);
    // Disable actual notifications during tests
    setNotificationsEnabled(false);
    setSoundEnabled(false);
  });

  afterEach(() => {
    setSilentMode(false);
    // Re-enable for other tests
    setNotificationsEnabled(true);
    setSoundEnabled(true);
  });

  describe('Configuration', () => {
    test('setNotificationsEnabled toggles notifications', () => {
      setNotificationsEnabled(true);
      expect(getNotificationSettings().notifications).toBe(true);

      setNotificationsEnabled(false);
      expect(getNotificationSettings().notifications).toBe(false);
    });

    test('setSoundEnabled toggles sound', () => {
      setSoundEnabled(true);
      expect(getNotificationSettings().sound).toBe(true);

      setSoundEnabled(false);
      expect(getNotificationSettings().sound).toBe(false);
    });

    test('getNotificationSettings returns both settings', () => {
      setNotificationsEnabled(true);
      setSoundEnabled(false);

      const settings = getNotificationSettings();
      expect(settings).toEqual({
        notifications: true,
        sound: false,
      });
    });
  });

  describe('Notification Functions', () => {
    test('notifyComplete does not throw when disabled', async () => {
      setNotificationsEnabled(false);
      setSoundEnabled(false);

      // Should not throw
      await expect(notifications.notifyComplete(5, 60000)).resolves.toBeUndefined();
    });

    test('notifyBlocked does not throw when disabled', async () => {
      setNotificationsEnabled(false);
      setSoundEnabled(false);

      await expect(notifications.notifyBlocked('Test reason')).resolves.toBeUndefined();
    });

    test('notifyDecision does not throw when disabled', async () => {
      setNotificationsEnabled(false);
      setSoundEnabled(false);

      await expect(notifications.notifyDecision('Test question?')).resolves.toBeUndefined();
    });

    test('notifyError does not throw when disabled', async () => {
      setNotificationsEnabled(false);
      setSoundEnabled(false);

      await expect(notifications.notifyError('Test error')).resolves.toBeUndefined();
    });

    test('notifyMaxIterations does not throw when disabled', async () => {
      setNotificationsEnabled(false);
      setSoundEnabled(false);

      await expect(notifications.notifyMaxIterations(100)).resolves.toBeUndefined();
    });

    test('notifyInfo does not throw when disabled', async () => {
      setNotificationsEnabled(false);
      setSoundEnabled(false);

      await expect(notifications.notifyInfo('Test info')).resolves.toBeUndefined();
    });
  });

  describe('playSound', () => {
    test('does not throw when sound disabled', async () => {
      setSoundEnabled(false);

      await expect(notifications.playSound('complete')).resolves.toBeUndefined();
      await expect(notifications.playSound('blocked')).resolves.toBeUndefined();
      await expect(notifications.playSound('decide')).resolves.toBeUndefined();
      await expect(notifications.playSound('error')).resolves.toBeUndefined();
      await expect(notifications.playSound('info')).resolves.toBeUndefined();
    });
  });

  describe('sendNotification', () => {
    test('does not throw when notifications disabled', async () => {
      setNotificationsEnabled(false);

      await expect(
        notifications.sendNotification({
          type: 'complete',
          title: 'Test',
          message: 'Test message',
          sound: false,
        })
      ).resolves.toBeUndefined();
    });
  });

  describe('Notifications Object', () => {
    test('has all expected methods', () => {
      expect(typeof notifications.setNotificationsEnabled).toBe('function');
      expect(typeof notifications.setSoundEnabled).toBe('function');
      expect(typeof notifications.getNotificationSettings).toBe('function');
      expect(typeof notifications.playSound).toBe('function');
      expect(typeof notifications.sendNotification).toBe('function');
      expect(typeof notifications.notifyComplete).toBe('function');
      expect(typeof notifications.notifyBlocked).toBe('function');
      expect(typeof notifications.notifyDecision).toBe('function');
      expect(typeof notifications.notifyError).toBe('function');
      expect(typeof notifications.notifyMaxIterations).toBe('function');
      expect(typeof notifications.notifyInfo).toBe('function');
      expect(typeof notifications.testNotifications).toBe('function');
    });
  });
});
