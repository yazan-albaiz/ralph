/**
 * Docker Sandbox Tests
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { setSilentMode } from '../src/lib/logger.js';
import {
  checkDockerInstalled,
  formatDockerPreflightResults,
  docker,
} from '../src/lib/docker.js';
import { buildSpawnConfig } from '../src/lib/claude.js';
import type { ClaudeProcessOptions, DockerPreflightResult } from '../src/types/index.js';

describe('Docker Sandbox', () => {
  beforeEach(() => {
    setSilentMode(true);
  });

  afterEach(() => {
    setSilentMode(false);
  });

  describe('checkDockerInstalled', () => {
    test('returns proper structure', async () => {
      const result = await checkDockerInstalled();

      expect(result).toHaveProperty('installed');
      expect(result).toHaveProperty('version');
      expect(typeof result.installed).toBe('boolean');
      // version is string | null
      expect(result.version === null || typeof result.version === 'string').toBe(true);
    });
  });

  describe('formatDockerPreflightResults', () => {
    test('formats passing results', () => {
      const result: DockerPreflightResult = {
        passed: true,
        dockerInstalled: true,
        dockerRunning: true,
        sandboxPluginAvailable: true,
        dockerVersion: '24.0.7',
        dockerDesktopVersion: '4.50.0',
        meetsMinimumVersion: true,
        errors: [],
      };

      const formatted = formatDockerPreflightResults(result);

      expect(formatted).toContain('Docker installed: Yes');
      expect(formatted).toContain('Docker running: Yes');
      expect(formatted).toContain('Sandbox plugin: Available');
      expect(formatted).toContain('24.0.7');
      expect(formatted).toContain('4.50.0');
    });

    test('formats failing results with errors', () => {
      const result: DockerPreflightResult = {
        passed: false,
        dockerInstalled: true,
        dockerRunning: false,
        sandboxPluginAvailable: false,
        dockerVersion: '24.0.7',
        dockerDesktopVersion: null,
        meetsMinimumVersion: false,
        errors: ['Docker daemon is not running.', 'Sandbox plugin not available.'],
      };

      const formatted = formatDockerPreflightResults(result);

      expect(formatted).toContain('Docker installed: Yes');
      expect(formatted).toContain('Docker running: No');
      expect(formatted).toContain('Sandbox plugin: Not available');
      expect(formatted).toContain('Errors:');
      expect(formatted).toContain('Docker daemon is not running.');
      expect(formatted).toContain('Sandbox plugin not available.');
    });

    test('formats results with N/A for missing versions', () => {
      const result: DockerPreflightResult = {
        passed: false,
        dockerInstalled: false,
        dockerRunning: false,
        sandboxPluginAvailable: false,
        dockerVersion: null,
        dockerDesktopVersion: null,
        meetsMinimumVersion: false,
        errors: ['Docker not installed.'],
      };

      const formatted = formatDockerPreflightResults(result);

      expect(formatted).toContain('Docker version: N/A');
      expect(formatted).toContain('Docker Desktop version: N/A');
    });
  });

  describe('compareVersions', () => {
    test('compares equal versions', () => {
      expect(docker.compareVersions('1.0.0', '1.0.0')).toBe(0);
      expect(docker.compareVersions('4.50.0', '4.50.0')).toBe(0);
    });

    test('compares greater versions', () => {
      expect(docker.compareVersions('2.0.0', '1.0.0')).toBe(1);
      expect(docker.compareVersions('1.1.0', '1.0.0')).toBe(1);
      expect(docker.compareVersions('1.0.1', '1.0.0')).toBe(1);
      expect(docker.compareVersions('4.51.0', '4.50.0')).toBe(1);
    });

    test('compares lesser versions', () => {
      expect(docker.compareVersions('1.0.0', '2.0.0')).toBe(-1);
      expect(docker.compareVersions('1.0.0', '1.1.0')).toBe(-1);
      expect(docker.compareVersions('1.0.0', '1.0.1')).toBe(-1);
      expect(docker.compareVersions('4.49.0', '4.50.0')).toBe(-1);
    });

    test('handles different length versions', () => {
      expect(docker.compareVersions('1.0', '1.0.0')).toBe(0);
      expect(docker.compareVersions('1.0.0', '1.0')).toBe(0);
      expect(docker.compareVersions('1.0', '1.0.1')).toBe(-1);
    });
  });

  describe('buildSpawnConfig', () => {
    const baseOptions: ClaudeProcessOptions = {
      prompt: 'Test prompt',
      model: 'opus',
      dangerouslySkipPermissions: false,
      projectRoot: '/test',
    };

    test('returns claude command when sandbox is disabled', () => {
      const options: ClaudeProcessOptions = { ...baseOptions, sandbox: false };
      const config = buildSpawnConfig(options);

      expect(config.command).toBe('claude');
      expect(config.args).toContain('--model');
      expect(config.args).toContain('opus');
      expect(config.args).not.toContain('docker');
      expect(config.args).not.toContain('sandbox');
    });

    test('returns claude command when sandbox is undefined', () => {
      const options: ClaudeProcessOptions = { ...baseOptions };
      const config = buildSpawnConfig(options);

      expect(config.command).toBe('claude');
      expect(config.args).not.toContain('docker');
    });

    test('returns docker sandbox command when sandbox is enabled', () => {
      const options: ClaudeProcessOptions = { ...baseOptions, sandbox: true };
      const config = buildSpawnConfig(options);

      expect(config.command).toBe('docker');
      expect(config.args[0]).toBe('sandbox');
      expect(config.args[1]).toBe('run');
      expect(config.args).toContain('--credentials');
      expect(config.args).toContain('host');
      expect(config.args).toContain('claude');
      expect(config.args).toContain('--model');
      expect(config.args).toContain('opus');
    });

    test('preserves all Claude args in sandbox mode', () => {
      const options: ClaudeProcessOptions = {
        ...baseOptions,
        sandbox: true,
        dangerouslySkipPermissions: true,
      };
      const config = buildSpawnConfig(options);

      expect(config.command).toBe('docker');
      expect(config.args).toContain('--dangerously-skip-permissions');
      expect(config.args).toContain('-p');
      expect(config.args).toContain('Test prompt');
    });
  });

  describe('docker object', () => {
    test('has all methods', () => {
      expect(typeof docker.checkDockerInstalled).toBe('function');
      expect(typeof docker.checkDockerRunning).toBe('function');
      expect(typeof docker.checkSandboxPluginAvailable).toBe('function');
      expect(typeof docker.getDockerDesktopVersion).toBe('function');
      expect(typeof docker.runDockerPreflightChecks).toBe('function');
      expect(typeof docker.formatDockerPreflightResults).toBe('function');
      expect(typeof docker.compareVersions).toBe('function');
    });
  });
});
