/**
 * Promise Tag Parser - Parse semantic promise tags from Claude output
 */

import type { ParsedPromiseTag, PromiseTagType } from '../types/index.js';

// Regex patterns for promise tags
const PROMISE_TAG_PATTERNS = {
  // Standard completion: <promise>COMPLETE</promise>
  COMPLETE: /<promise>\s*COMPLETE\s*<\/promise>/i,

  // Blocked with reason: <promise>BLOCKED: reason here</promise>
  BLOCKED: /<promise>\s*BLOCKED:\s*(.+?)\s*<\/promise>/i,

  // Decision needed: <promise>DECIDE: question here</promise>
  DECIDE: /<promise>\s*DECIDE:\s*(.+?)\s*<\/promise>/i,
};

// Combined pattern to find any promise tag
const ANY_PROMISE_TAG = /<promise>(.+?)<\/promise>/gi;

/**
 * Parse a string for promise tags
 */
export function parsePromiseTag(output: string): ParsedPromiseTag {
  // Check for COMPLETE tag
  const completeMatch = output.match(PROMISE_TAG_PATTERNS.COMPLETE);
  if (completeMatch) {
    return {
      type: 'COMPLETE',
      content: null,
      raw: completeMatch[0],
    };
  }

  // Check for BLOCKED tag
  const blockedMatch = output.match(PROMISE_TAG_PATTERNS.BLOCKED);
  if (blockedMatch) {
    return {
      type: 'BLOCKED',
      content: blockedMatch[1].trim(),
      raw: blockedMatch[0],
    };
  }

  // Check for DECIDE tag
  const decideMatch = output.match(PROMISE_TAG_PATTERNS.DECIDE);
  if (decideMatch) {
    return {
      type: 'DECIDE',
      content: decideMatch[1].trim(),
      raw: decideMatch[0],
    };
  }

  // No recognized promise tag found
  return {
    type: null,
    content: null,
    raw: null,
  };
}

/**
 * Check if output contains a completion signal (custom signal support)
 */
export function containsCompletionSignal(output: string, signal: string): boolean {
  // First check for the custom signal if provided
  if (signal && output.includes(signal)) {
    return true;
  }

  // Also check for standard COMPLETE tag
  return PROMISE_TAG_PATTERNS.COMPLETE.test(output);
}

/**
 * Find all promise tags in output (for debugging/analysis)
 */
export function findAllPromiseTags(output: string): string[] {
  const matches = output.match(ANY_PROMISE_TAG);
  return matches || [];
}

/**
 * Check if the parsed tag requires user intervention
 */
export function requiresUserIntervention(tag: ParsedPromiseTag): boolean {
  return tag.type === 'BLOCKED' || tag.type === 'DECIDE';
}

/**
 * Check if the parsed tag indicates completion
 */
export function indicatesCompletion(tag: ParsedPromiseTag): boolean {
  return tag.type === 'COMPLETE';
}

/**
 * Get human-readable description of the tag
 */
export function getTagDescription(tag: ParsedPromiseTag): string {
  switch (tag.type) {
    case 'COMPLETE':
      return 'Task completed successfully';
    case 'BLOCKED':
      return `Blocked: ${tag.content || 'Unknown reason'}`;
    case 'DECIDE':
      return `Decision needed: ${tag.content || 'Unknown question'}`;
    default:
      return 'No status tag found';
  }
}

/**
 * Create a prompt suffix with completion instructions
 */
export function createCompletionSuffix(signal: string): string {
  return `

---
IMPORTANT INSTRUCTIONS FOR RALPH LOOP:

When you have completed ALL tasks successfully, output exactly:
${signal}

If you are BLOCKED and cannot continue without human intervention, output:
<promise>BLOCKED: [brief reason why you're blocked]</promise>

If you need a DECISION from the user before continuing, output:
<promise>DECIDE: [brief question for the user]</promise>

Do not output any promise tags until you've attempted to complete the tasks or determined you cannot proceed.
---`;
}

/**
 * Inject PROJECT_ROOT and completion instructions into a prompt
 */
export function preparePrompt(
  originalPrompt: string,
  projectRoot: string,
  completionSignal: string
): string {
  const projectRootLine = `PROJECT_ROOT=${projectRoot}`;
  const suffix = createCompletionSuffix(completionSignal);

  return `${projectRootLine}

${originalPrompt}${suffix}`;
}

export const promiseParser = {
  parsePromiseTag,
  containsCompletionSignal,
  findAllPromiseTags,
  requiresUserIntervention,
  indicatesCompletion,
  getTagDescription,
  createCompletionSuffix,
  preparePrompt,
};

export default promiseParser;
