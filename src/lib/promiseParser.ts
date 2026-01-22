/**
 * Promise Tag Parser - Parse semantic promise tags from Claude output
 *
 * Canonical Ralph Pattern:
 * - Prompts are STATIC (no iteration/context injection)
 * - Only the completion suffix is appended to teach Claude about promise tags
 * - Progress is tracked via FILES (progress.txt), not injected context
 */

import type { ParsedPromiseTag } from '../types/index.js';

const PROMISE_TAG_PATTERNS = {
  COMPLETE: /<promise>\s*COMPLETE\s*<\/promise>/i,
  BLOCKED: /<promise>\s*BLOCKED:\s*(.+?)\s*<\/promise>/i,
  DECIDE: /<promise>\s*DECIDE:\s*(.+?)\s*<\/promise>/i,
};

const ANY_PROMISE_TAG = /<promise>(.+?)<\/promise>/gi;
const COMMIT_MESSAGE_PATTERN = /<commit_message>([\s\S]*?)<\/commit_message>/i;

export interface ParsedTags {
  promiseTag: ParsedPromiseTag;
  commitMessage: string | null;
}

export function parsePromiseTag(output: string): ParsedPromiseTag {
  const completeMatch = output.match(PROMISE_TAG_PATTERNS.COMPLETE);
  if (completeMatch) {
    return { type: 'COMPLETE', content: null, raw: completeMatch[0] };
  }

  const blockedMatch = output.match(PROMISE_TAG_PATTERNS.BLOCKED);
  if (blockedMatch) {
    return { type: 'BLOCKED', content: blockedMatch[1].trim(), raw: blockedMatch[0] };
  }

  const decideMatch = output.match(PROMISE_TAG_PATTERNS.DECIDE);
  if (decideMatch) {
    return { type: 'DECIDE', content: decideMatch[1].trim(), raw: decideMatch[0] };
  }

  return { type: null, content: null, raw: null };
}

/**
 * Parse commit message from output
 * Format: <commit_message>Your commit message here</commit_message>
 */
export function parseCommitMessage(output: string): string | null {
  const match = output.match(COMMIT_MESSAGE_PATTERN);
  if (match && match[1]) {
    // Clean up the message: trim whitespace, normalize newlines
    return match[1].trim().replace(/\n+/g, ' ').substring(0, 200);
  }
  return null;
}

/**
 * Parse all Ralph-specific tags from Claude's output
 */
export function parseAllTags(output: string): ParsedTags {
  return {
    promiseTag: parsePromiseTag(output),
    commitMessage: parseCommitMessage(output),
  };
}

export function containsCompletionSignal(output: string, signal: string): boolean {
  return (signal && output.includes(signal)) || PROMISE_TAG_PATTERNS.COMPLETE.test(output);
}

export function findAllPromiseTags(output: string): string[] {
  return output.match(ANY_PROMISE_TAG) ?? [];
}

export function requiresUserIntervention(tag: ParsedPromiseTag): boolean {
  return tag.type === 'BLOCKED' || tag.type === 'DECIDE';
}

export function indicatesCompletion(tag: ParsedPromiseTag): boolean {
  return tag.type === 'COMPLETE';
}

export function getTagDescription(tag: ParsedPromiseTag): string {
  switch (tag.type) {
    case 'COMPLETE':
      return 'Task completed successfully';
    case 'BLOCKED':
      return `Blocked: ${tag.content ?? 'Unknown reason'}`;
    case 'DECIDE':
      return `Decision needed: ${tag.content ?? 'Unknown question'}`;
    default:
      return 'No status tag found';
  }
}

export function createCompletionSuffix(signal: string): string {
  return `

---
IMPORTANT INSTRUCTIONS FOR RALPH LOOP:

When you have completed work in this iteration:

1. If you made code changes that should be committed, provide a commit message:
   <commit_message>Brief description of changes</commit_message>

2. If ALL tasks are fully complete, output:
   ${signal}

3. If you are BLOCKED and cannot continue without human intervention, output:
   <promise>BLOCKED: [brief reason why you're blocked]</promise>

4. If you need a DECISION from the user before continuing, output:
   <promise>DECIDE: [brief question for the user]</promise>

Do not output promise tags until you've attempted to complete the tasks or determined you cannot proceed.
---`;
}

/**
 * Prepare prompt for Claude - Canonical Ralph Pattern
 *
 * The canonical ralph keeps prompts STATIC. The only thing appended is the
 * completion suffix that teaches Claude about promise tags.
 *
 * NO context injection (iteration number, PROJECT_ROOT, etc.) - this is intentional.
 * Claude reads state from files (progress.txt, task files), not injected context.
 *
 * @param originalPrompt - The user's prompt (unchanged)
 * @param completionSignal - The completion signal to use
 * @returns The prompt with completion suffix appended
 */
export function preparePrompt(
  originalPrompt: string,
  completionSignal: string
): string {
  // Canonical ralph: prompt is static, only completion suffix is appended
  return `${originalPrompt}${createCompletionSuffix(completionSignal)}`;
}

export const promiseParser = {
  parsePromiseTag,
  parseCommitMessage,
  parseAllTags,
  containsCompletionSignal,
  findAllPromiseTags,
  requiresUserIntervention,
  indicatesCompletion,
  getTagDescription,
  createCompletionSuffix,
  preparePrompt,
};

export default promiseParser;
