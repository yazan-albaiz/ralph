/**
 * Docker Sandbox Utilities - Preflight checks for Docker sandbox mode
 */

import { spawn } from 'node:child_process';
import type { DockerPreflightResult } from '../types/index.js';
import { logger } from './logger.js';

// Minimum Docker Desktop version required for sandbox plugin
const MIN_DOCKER_DESKTOP_VERSION = '4.50.0';

/**
 * Compare semantic versions
 * Returns: -1 if a < b, 0 if a == b, 1 if a > b
 */
function compareVersions(a: string, b: string): number {
  const partsA = a.split('.').map((n) => parseInt(n, 10) || 0);
  const partsB = b.split('.').map((n) => parseInt(n, 10) || 0);

  const maxLen = Math.max(partsA.length, partsB.length);
  for (let i = 0; i < maxLen; i++) {
    const numA = partsA[i] || 0;
    const numB = partsB[i] || 0;
    if (numA < numB) return -1;
    if (numA > numB) return 1;
  }
  return 0;
}

/**
 * Run a command and return stdout
 */
async function runCommand(command: string, args: string[]): Promise<{ success: boolean; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';

    const proc = spawn(command, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    proc.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString();
    });

    proc.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    proc.on('close', (code) => {
      resolve({ success: code === 0, stdout: stdout.trim(), stderr: stderr.trim() });
    });

    proc.on('error', () => {
      resolve({ success: false, stdout: '', stderr: `Command not found: ${command}` });
    });
  });
}

/**
 * Check if Docker is installed
 */
export async function checkDockerInstalled(): Promise<{ installed: boolean; version: string | null }> {
  const result = await runCommand('docker', ['--version']);
  if (!result.success) {
    return { installed: false, version: null };
  }

  // Parse version from "Docker version 24.0.7, build afdd53b"
  const match = result.stdout.match(/Docker version ([0-9.]+)/);
  return { installed: true, version: match?.[1] ?? null };
}

/**
 * Check if Docker daemon is running
 */
export async function checkDockerRunning(): Promise<boolean> {
  const result = await runCommand('docker', ['info']);
  return result.success;
}

/**
 * Check if Docker sandbox plugin is available
 */
export async function checkSandboxPluginAvailable(): Promise<boolean> {
  const result = await runCommand('docker', ['sandbox', '--help']);
  return result.success;
}

/**
 * Get Docker Desktop version
 * Parses from 'docker version' output which includes server version info
 */
export async function getDockerDesktopVersion(): Promise<string | null> {
  const result = await runCommand('docker', ['version', '--format', '{{.Server.Version}}']);
  if (!result.success || !result.stdout) {
    return null;
  }

  // Docker Desktop version is in the server version
  // Format might be "24.0.7" or "24.0.7-desktop.1"
  const version = result.stdout.split('-')[0];
  return version || null;
}

/**
 * Create a failed preflight result with accumulated state
 */
function createFailedResult(
  errors: string[],
  state: Partial<DockerPreflightResult>
): DockerPreflightResult {
  return {
    passed: false,
    dockerInstalled: false,
    dockerRunning: false,
    sandboxPluginAvailable: false,
    dockerVersion: null,
    dockerDesktopVersion: null,
    meetsMinimumVersion: false,
    errors,
    ...state,
  };
}

/**
 * Run all Docker preflight checks
 */
export async function runDockerPreflightChecks(): Promise<DockerPreflightResult> {
  const errors: string[] = [];

  logger.debug('Running Docker preflight checks...');

  // Check Docker installed
  const { installed: dockerInstalled, version: dockerVersion } = await checkDockerInstalled();

  if (!dockerInstalled) {
    errors.push('Docker is not installed. Install Docker Desktop from https://www.docker.com/products/docker-desktop/');
    return createFailedResult(errors, {});
  }

  logger.debug(`Docker installed: version ${dockerVersion}`);

  // Check Docker running
  const dockerRunning = await checkDockerRunning();
  if (!dockerRunning) {
    errors.push('Docker daemon is not running. Please start Docker Desktop.');
    return createFailedResult(errors, { dockerInstalled: true, dockerVersion });
  }

  logger.debug('Docker daemon is running');

  // Get Docker Desktop version
  const dockerDesktopVersion = await getDockerDesktopVersion();
  const meetsMinimumVersion = dockerDesktopVersion
    ? compareVersions(dockerDesktopVersion, MIN_DOCKER_DESKTOP_VERSION) >= 0
    : false;

  if (!meetsMinimumVersion) {
    errors.push(
      `Docker Desktop ${MIN_DOCKER_DESKTOP_VERSION}+ required for sandbox mode. ` +
      `Current version: ${dockerDesktopVersion ?? 'unknown'}. ` +
      `Please update Docker Desktop.`
    );
  }

  logger.debug(`Docker Desktop version: ${dockerDesktopVersion ?? 'unknown'}`);

  // Check sandbox plugin
  const sandboxPluginAvailable = await checkSandboxPluginAvailable();
  if (!sandboxPluginAvailable) {
    errors.push(
      'Docker sandbox plugin is not available. ' +
      'This feature requires Docker Desktop 4.50+ with the sandbox extension enabled.'
    );
  }

  logger.debug(`Sandbox plugin available: ${sandboxPluginAvailable}`);

  const passed = dockerInstalled && dockerRunning && sandboxPluginAvailable && meetsMinimumVersion;

  return {
    passed,
    dockerInstalled,
    dockerRunning,
    sandboxPluginAvailable,
    dockerVersion,
    dockerDesktopVersion,
    meetsMinimumVersion,
    errors,
  };
}

/**
 * Format Docker preflight results for display
 */
export function formatDockerPreflightResults(result: DockerPreflightResult): string {
  const lines: string[] = [];
  lines.push('Docker Sandbox Preflight Checks:');
  lines.push(`  Docker installed: ${result.dockerInstalled ? 'Yes' : 'No'}`);
  lines.push(`  Docker running: ${result.dockerRunning ? 'Yes' : 'No'}`);
  lines.push(`  Docker version: ${result.dockerVersion ?? 'N/A'}`);
  lines.push(`  Docker Desktop version: ${result.dockerDesktopVersion ?? 'N/A'}`);
  lines.push(`  Meets minimum version (${MIN_DOCKER_DESKTOP_VERSION}+): ${result.meetsMinimumVersion ? 'Yes' : 'No'}`);
  lines.push(`  Sandbox plugin: ${result.sandboxPluginAvailable ? 'Available' : 'Not available'}`);

  if (result.errors.length > 0) {
    lines.push('');
    lines.push('Errors:');
    for (const error of result.errors) {
      lines.push(`  - ${error}`);
    }
  }

  return lines.join('\n');
}

export const docker = {
  checkDockerInstalled,
  checkDockerRunning,
  checkSandboxPluginAvailable,
  getDockerDesktopVersion,
  runDockerPreflightChecks,
  formatDockerPreflightResults,
  compareVersions,
};

export default docker;
