/**
 * Prompt Loading Tests
 *
 * Tests for the prompt loading logic to ensure:
 * 1. File prompts are loaded correctly
 * 2. Inline prompts work without file validation
 * 3. Preflight doesn't re-validate after content is loaded
 * 4. Special characters and large files are handled properly
 */

import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { existsSync, writeFileSync, mkdirSync, rmSync, readFileSync } from 'fs';
import { join } from 'path';
import { runPreflightChecks } from '../src/lib/preflight.js';
import { setSilentMode } from '../src/lib/logger.js';
import type { RalphConfig } from '../src/types/index.js';

describe('Prompt Loading', () => {
  const testDir = '/tmp/ralph-prompt-tests';

  const createTestConfig = (overrides: Partial<RalphConfig> = {}): RalphConfig => ({
    maxIterations: 100,
    completionSignal: '<promise>COMPLETE</promise>',
    model: 'opus',
    dangerouslySkipPermissions: false,
    verbose: false,
    showSplash: false,
    enableNotifications: false,
    enableSound: false,
    prompt: 'Test prompt',
    isFile: false,
    projectRoot: process.cwd(),
    sandbox: false,
    ...overrides,
  });

  beforeAll(() => {
    setSilentMode(true);
    mkdirSync(testDir, { recursive: true });
  });

  afterAll(() => {
    setSilentMode(false);
    rmSync(testDir, { recursive: true, force: true });
  });

  describe('File prompt loading', () => {
    test('should pass preflight when file content is loaded (isFile=true)', async () => {
      // Simulates what cli.tsx does: loads file content into prompt, sets isFile=true
      const config = createTestConfig({
        prompt: '# Test Prompt\n\nDo something.',
        isFile: true,
      });

      const result = await runPreflightChecks(config);
      const fileCheck = result.checks.find((c) => c.name === 'Prompt File');

      expect(fileCheck).toBeDefined();
      expect(fileCheck!.passed).toBe(true);
      expect(fileCheck!.message).toBe('Prompt loaded from file successfully');
    });

    test('should fail preflight when file content is empty (isFile=true)', async () => {
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
  });

  describe('Inline prompt handling', () => {
    test('should handle inline prompt string without file validation', async () => {
      const inlinePrompt = 'Just say hello';
      const config = createTestConfig({
        prompt: inlinePrompt,
        isFile: false,
      });

      const result = await runPreflightChecks(config);
      const fileCheck = result.checks.find((c) => c.name === 'Prompt File');

      expect(fileCheck).toBeDefined();
      expect(fileCheck!.passed).toBe(true);
      expect(fileCheck!.message).toBe('Using inline prompt (no file check needed)');
    });
  });

  describe('Preflight does not re-validate file path', () => {
    test('should not try to validate prompt content as file path', async () => {
      // This is the specific bug case - when isFile=true, prompt contains
      // the file content, not a path. Preflight should NOT try to check
      // if the content exists as a file
      const fileContent = `# My Prompt

      This content would fail if treated as a file path because:
      1. It contains newlines
      2. It contains special characters: @#$%^&*()
      3. It's actual content, not a path

      <promise>COMPLETE</promise>`;

      const config = createTestConfig({
        prompt: fileContent,
        isFile: true,
      });

      const result = await runPreflightChecks(config);
      const fileCheck = result.checks.find((c) => c.name === 'Prompt File');

      expect(fileCheck).toBeDefined();
      expect(fileCheck!.passed).toBe(true);
    });
  });

  describe('Special characters in prompts', () => {
    test('should handle prompts with code blocks', async () => {
      const promptPath = join(testDir, 'special-chars.md');
      const content = `# Test

\`\`\`bash
echo "hello"
\`\`\`

<promise>COMPLETE</promise>`;
      writeFileSync(promptPath, content);

      // Verify file was written
      expect(existsSync(promptPath)).toBe(true);

      // Simulate loading the file (as cli.tsx would do)
      const loadedContent = readFileSync(promptPath, 'utf-8');
      const config = createTestConfig({
        prompt: loadedContent,
        isFile: true,
      });

      const result = await runPreflightChecks(config);
      const fileCheck = result.checks.find((c) => c.name === 'Prompt File');

      expect(fileCheck).toBeDefined();
      expect(fileCheck!.passed).toBe(true);
    });

    test('should handle prompts with XML-like tags', async () => {
      const promptPath = join(testDir, 'xml-tags.md');
      const content = `# Test with XML tags

<example>
Some content here
</example>

<promise>COMPLETE</promise>`;
      writeFileSync(promptPath, content);

      const loadedContent = readFileSync(promptPath, 'utf-8');
      const config = createTestConfig({
        prompt: loadedContent,
        isFile: true,
      });

      const result = await runPreflightChecks(config);
      const fileCheck = result.checks.find((c) => c.name === 'Prompt File');

      expect(fileCheck).toBeDefined();
      expect(fileCheck!.passed).toBe(true);
    });
  });

  describe('Large prompt files', () => {
    test('should handle large prompt files', async () => {
      const promptPath = join(testDir, 'large-prompt.md');
      // Create a ~100KB file
      const largeContent = '# Large Prompt\n\n' + 'Lorem ipsum dolor sit amet. '.repeat(4000);
      writeFileSync(promptPath, largeContent);

      const loadedContent = readFileSync(promptPath, 'utf-8');
      expect(loadedContent.length).toBeGreaterThan(100000);

      const config = createTestConfig({
        prompt: loadedContent,
        isFile: true,
      });

      const result = await runPreflightChecks(config);
      const fileCheck = result.checks.find((c) => c.name === 'Prompt File');

      expect(fileCheck).toBeDefined();
      expect(fileCheck!.passed).toBe(true);
    });
  });

  describe('Edge cases', () => {
    test('should handle whitespace-only file content', async () => {
      const config = createTestConfig({
        prompt: '   \n\n   ',
        isFile: true,
      });

      const result = await runPreflightChecks(config);
      const fileCheck = result.checks.find((c) => c.name === 'Prompt File');

      // Whitespace-only is considered having content (length > 0)
      expect(fileCheck).toBeDefined();
      expect(fileCheck!.passed).toBe(true);
    });

    test('should handle unicode content', async () => {
      const config = createTestConfig({
        prompt: '# Test Unicode\n\n日本語テスト\n\nEmoji: 🚀✅🎉',
        isFile: true,
      });

      const result = await runPreflightChecks(config);
      const fileCheck = result.checks.find((c) => c.name === 'Prompt File');

      expect(fileCheck).toBeDefined();
      expect(fileCheck!.passed).toBe(true);
    });
  });
});
