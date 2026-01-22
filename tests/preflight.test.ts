/**
 * Pre-flight Checks Tests
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { setSilentMode } from '../src/lib/logger.js';
import { preflight, runPreflightChecks, formatPreflightResults } from '../src/lib/preflight.js';
import type { RalphConfig, PreflightResult } from '../src/types/index.js';

describe('Pre-flight Checks', () => {
  beforeEach(() => {
    setSilentMode(true);
  });

  afterEach(() => {
    setSilentMode(false);
  });

  const createTestConfig = (overrides: Partial<RalphConfig> = {}): RalphConfig => ({
    maxIterations: 100,
    completionSignal: '<promise>COMPLETE</promise>',
    model: 'opus',
    dangerouslySkipPermissions: false,
    verbose: false,
    showSplash: true,
    enableNotifications: true,
    enableSound: true,
    prompt: 'Test prompt',
    isFile: false,
    projectRoot: process.cwd(),
    sandbox: false,
    ...overrides,
  });

  describe('runPreflightChecks', () => {
    test('passes with valid configuration', async () => {
      const config = createTestConfig();
      const result = await runPreflightChecks(config);

      // Claude CLI check might fail if not installed, but other checks should work
      expect(result.checks.length).toBeGreaterThan(0);
      expect(Array.isArray(result.errors)).toBe(true);
      expect(Array.isArray(result.warnings)).toBe(true);
    });

    test('fails with invalid model', async () => {
      const config = createTestConfig({ model: 'invalid-model' });
      const result = await runPreflightChecks(config);

      const modelCheck = result.checks.find((c) => c.name === 'Model');
      expect(modelCheck).toBeDefined();
      expect(modelCheck!.passed).toBe(false);
      expect(modelCheck!.fatal).toBe(true);
    });

    test('passes when file prompt has content (file was already loaded)', async () => {
      // When isFile is true, prompt contains the loaded content, not the file path
      // This simulates a successfully loaded file
      const config = createTestConfig({
        prompt: '# File Content\n\nThis is the loaded content from a file.',
        isFile: true,
      });
      const result = await runPreflightChecks(config);

      const fileCheck = result.checks.find((c) => c.name === 'Prompt File');
      expect(fileCheck).toBeDefined();
      expect(fileCheck!.passed).toBe(true);
      expect(fileCheck!.message).toBe('Prompt loaded from file successfully');
    });

    test('fails when file prompt is empty', async () => {
      // Simulates a file that was empty or somehow failed to load content
      const config = createTestConfig({
        prompt: '',
        isFile: true,
      });
      const result = await runPreflightChecks(config);

      const fileCheck = result.checks.find((c) => c.name === 'Prompt File');
      expect(fileCheck).toBeDefined();
      expect(fileCheck!.passed).toBe(false);
      expect(fileCheck!.fatal).toBe(true);
    });

    test('skips prompt file check for inline prompts', async () => {
      const config = createTestConfig({ isFile: false });
      const result = await runPreflightChecks(config);

      const fileCheck = result.checks.find((c) => c.name === 'Prompt File');
      expect(fileCheck).toBeDefined();
      expect(fileCheck!.passed).toBe(true);
    });

    test('warns on invalid max iterations', async () => {
      const config = createTestConfig({ maxIterations: 1000 });
      const result = await runPreflightChecks(config);

      const iterCheck = result.checks.find((c) => c.name === 'Max Iterations');
      expect(iterCheck).toBeDefined();
      expect(iterCheck!.passed).toBe(false);
    });

    test('fails on zero max iterations', async () => {
      const config = createTestConfig({ maxIterations: 0 });
      const result = await runPreflightChecks(config);

      const iterCheck = result.checks.find((c) => c.name === 'Max Iterations');
      expect(iterCheck).toBeDefined();
      expect(iterCheck!.passed).toBe(false);
      expect(iterCheck!.fatal).toBe(true);
    });
  });

  describe('formatPreflightResults', () => {
    test('formats passing results', () => {
      const result: PreflightResult = {
        passed: true,
        checks: [
          { name: 'Test', passed: true, message: 'Test passed', fatal: false },
        ],
        errors: [],
        warnings: [],
      };

      const formatted = formatPreflightResults(result);
      expect(formatted).toContain('All pre-flight checks passed');
    });

    test('formats failing results with errors', () => {
      const result: PreflightResult = {
        passed: false,
        checks: [
          { name: 'Test', passed: false, message: 'Test failed', fatal: true },
        ],
        errors: [
          { name: 'Test', passed: false, message: 'Test failed', fatal: true },
        ],
        warnings: [],
      };

      const formatted = formatPreflightResults(result);
      expect(formatted).toContain('Pre-flight checks failed');
      expect(formatted).toContain('Test failed');
    });

    test('formats results with warnings', () => {
      const result: PreflightResult = {
        passed: true,
        checks: [
          { name: 'Test', passed: false, message: 'Warning message', fatal: false },
        ],
        errors: [],
        warnings: [
          { name: 'Test', passed: false, message: 'Warning message', fatal: false },
        ],
      };

      const formatted = formatPreflightResults(result);
      expect(formatted).toContain('Warnings');
      expect(formatted).toContain('Warning message');
    });
  });

  describe('Valid Models', () => {
    const validModels = ['opus', 'sonnet', 'haiku', 'opus-4', 'sonnet-4', 'sonnet-3.5'];

    for (const model of validModels) {
      test(`accepts valid model: ${model}`, async () => {
        const config = createTestConfig({ model });
        const result = await runPreflightChecks(config);

        const modelCheck = result.checks.find((c) => c.name === 'Model');
        expect(modelCheck).toBeDefined();
        expect(modelCheck!.passed).toBe(true);
      });
    }
  });

  describe('Preflight Object', () => {
    test('preflight object has all methods', () => {
      expect(typeof preflight.runPreflightChecks).toBe('function');
      expect(typeof preflight.formatPreflightResults).toBe('function');
    });
  });
});
