/**
 * Promise Parser Tests
 */

import { describe, test, expect } from 'bun:test';
import {
  parsePromiseTag,
  containsCompletionSignal,
  findAllPromiseTags,
  requiresUserIntervention,
  indicatesCompletion,
  getTagDescription,
  createCompletionSuffix,
  preparePrompt,
} from '../src/lib/promiseParser.js';
import type { ParsedPromiseTag } from '../src/types/index.js';

describe('Promise Parser', () => {
  describe('parsePromiseTag', () => {
    test('parses COMPLETE tag', () => {
      const output = 'Some output\n<promise>COMPLETE</promise>\nMore output';
      const result = parsePromiseTag(output);

      expect(result.type).toBe('COMPLETE');
      expect(result.content).toBeNull();
      expect(result.raw).toBe('<promise>COMPLETE</promise>');
    });

    test('parses COMPLETE tag with whitespace', () => {
      const output = '<promise>  COMPLETE  </promise>';
      const result = parsePromiseTag(output);

      expect(result.type).toBe('COMPLETE');
    });

    test('parses COMPLETE tag case-insensitively', () => {
      const output = '<promise>complete</promise>';
      const result = parsePromiseTag(output);

      expect(result.type).toBe('COMPLETE');
    });

    test('parses BLOCKED tag with reason', () => {
      const output = '<promise>BLOCKED: Need API key to continue</promise>';
      const result = parsePromiseTag(output);

      expect(result.type).toBe('BLOCKED');
      expect(result.content).toBe('Need API key to continue');
    });

    test('parses BLOCKED tag with complex reason', () => {
      const output =
        '<promise>BLOCKED: Cannot access file /etc/hosts - permission denied</promise>';
      const result = parsePromiseTag(output);

      expect(result.type).toBe('BLOCKED');
      expect(result.content).toBe('Cannot access file /etc/hosts - permission denied');
    });

    test('parses DECIDE tag with question', () => {
      const output = '<promise>DECIDE: Should I use React or Vue?</promise>';
      const result = parsePromiseTag(output);

      expect(result.type).toBe('DECIDE');
      expect(result.content).toBe('Should I use React or Vue?');
    });

    test('returns null type when no tag found', () => {
      const output = 'Just some regular output without any tags';
      const result = parsePromiseTag(output);

      expect(result.type).toBeNull();
      expect(result.content).toBeNull();
      expect(result.raw).toBeNull();
    });

    test('handles empty string', () => {
      const result = parsePromiseTag('');

      expect(result.type).toBeNull();
    });

    test('prioritizes COMPLETE over other tags', () => {
      const output =
        '<promise>COMPLETE</promise> and <promise>BLOCKED: test</promise>';
      const result = parsePromiseTag(output);

      expect(result.type).toBe('COMPLETE');
    });
  });

  describe('containsCompletionSignal', () => {
    test('detects standard COMPLETE tag', () => {
      const output = 'Output <promise>COMPLETE</promise> done';
      expect(containsCompletionSignal(output, '')).toBe(true);
    });

    test('detects custom signal', () => {
      const output = 'Task finished with TASK_DONE marker';
      expect(containsCompletionSignal(output, 'TASK_DONE')).toBe(true);
    });

    test('returns false when signal not found', () => {
      const output = 'Some random output';
      expect(containsCompletionSignal(output, 'DONE')).toBe(false);
    });

    test('prefers custom signal over standard tag', () => {
      const output = 'Custom: MY_COMPLETE_SIGNAL';
      expect(containsCompletionSignal(output, 'MY_COMPLETE_SIGNAL')).toBe(true);
    });
  });

  describe('findAllPromiseTags', () => {
    test('finds all promise tags in output', () => {
      const output = `
        First: <promise>COMPLETE</promise>
        Second: <promise>BLOCKED: reason</promise>
        Third: <promise>DECIDE: question</promise>
      `;
      const tags = findAllPromiseTags(output);

      expect(tags).toHaveLength(3);
      expect(tags).toContain('<promise>COMPLETE</promise>');
      expect(tags).toContain('<promise>BLOCKED: reason</promise>');
      expect(tags).toContain('<promise>DECIDE: question</promise>');
    });

    test('returns empty array when no tags found', () => {
      const output = 'No tags here';
      const tags = findAllPromiseTags(output);

      expect(tags).toHaveLength(0);
    });
  });

  describe('requiresUserIntervention', () => {
    test('returns true for BLOCKED tag', () => {
      const tag: ParsedPromiseTag = { type: 'BLOCKED', content: 'reason', raw: '' };
      expect(requiresUserIntervention(tag)).toBe(true);
    });

    test('returns true for DECIDE tag', () => {
      const tag: ParsedPromiseTag = { type: 'DECIDE', content: 'question', raw: '' };
      expect(requiresUserIntervention(tag)).toBe(true);
    });

    test('returns false for COMPLETE tag', () => {
      const tag: ParsedPromiseTag = { type: 'COMPLETE', content: null, raw: '' };
      expect(requiresUserIntervention(tag)).toBe(false);
    });

    test('returns false for null tag', () => {
      const tag: ParsedPromiseTag = { type: null, content: null, raw: null };
      expect(requiresUserIntervention(tag)).toBe(false);
    });
  });

  describe('indicatesCompletion', () => {
    test('returns true for COMPLETE tag', () => {
      const tag: ParsedPromiseTag = { type: 'COMPLETE', content: null, raw: '' };
      expect(indicatesCompletion(tag)).toBe(true);
    });

    test('returns false for other tags', () => {
      const blocked: ParsedPromiseTag = { type: 'BLOCKED', content: 'x', raw: '' };
      const decide: ParsedPromiseTag = { type: 'DECIDE', content: 'x', raw: '' };
      const none: ParsedPromiseTag = { type: null, content: null, raw: null };

      expect(indicatesCompletion(blocked)).toBe(false);
      expect(indicatesCompletion(decide)).toBe(false);
      expect(indicatesCompletion(none)).toBe(false);
    });
  });

  describe('getTagDescription', () => {
    test('describes COMPLETE tag', () => {
      const tag: ParsedPromiseTag = { type: 'COMPLETE', content: null, raw: '' };
      expect(getTagDescription(tag)).toBe('Task completed successfully');
    });

    test('describes BLOCKED tag with reason', () => {
      const tag: ParsedPromiseTag = { type: 'BLOCKED', content: 'API key missing', raw: '' };
      expect(getTagDescription(tag)).toBe('Blocked: API key missing');
    });

    test('describes DECIDE tag with question', () => {
      const tag: ParsedPromiseTag = { type: 'DECIDE', content: 'Use TypeScript?', raw: '' };
      expect(getTagDescription(tag)).toBe('Decision needed: Use TypeScript?');
    });

    test('describes null tag', () => {
      const tag: ParsedPromiseTag = { type: null, content: null, raw: null };
      expect(getTagDescription(tag)).toBe('No status tag found');
    });
  });

  describe('createCompletionSuffix', () => {
    test('creates suffix with custom signal', () => {
      const signal = '<promise>COMPLETE</promise>';
      const suffix = createCompletionSuffix(signal);

      expect(suffix).toContain(signal);
      expect(suffix).toContain('BLOCKED');
      expect(suffix).toContain('DECIDE');
    });
  });

  describe('preparePrompt', () => {
    test('injects PROJECT_ROOT and completion suffix', () => {
      const originalPrompt = 'Build a REST API';
      const projectRoot = '/home/user/project';
      const signal = '<promise>COMPLETE</promise>';

      const prepared = preparePrompt(originalPrompt, projectRoot, signal);

      expect(prepared).toContain('PROJECT_ROOT=/home/user/project');
      expect(prepared).toContain('Build a REST API');
      expect(prepared).toContain(signal);
    });

    test('preserves original prompt content', () => {
      const originalPrompt = 'Line 1\nLine 2\nLine 3';
      const prepared = preparePrompt(originalPrompt, '/test', 'DONE');

      expect(prepared).toContain('Line 1');
      expect(prepared).toContain('Line 2');
      expect(prepared).toContain('Line 3');
    });
  });
});
