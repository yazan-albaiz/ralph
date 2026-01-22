/**
 * Promise Tag Parser - Parse semantic promise tags from Claude output
 */

import type { ParsedPromiseTag, PromiseTagType } from '../types/index.js';

/**
 * Loop context for Claude to understand its autonomous execution environment
 */
export interface LoopContext {
  currentIteration: number;
  maxIterations: number;
  isFirstIteration: boolean;
}

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
 * Inject PROJECT_ROOT, loop context, and completion instructions into a prompt
 */
export function preparePrompt(
  originalPrompt: string,
  projectRoot: string,
  completionSignal: string,
  loopContext?: LoopContext
): string {
  const contextHeader = `=== RALPH AUTONOMOUS LOOP ===
You are running inside RALPH, an autonomous AI coding loop.

ITERATION: ${loopContext?.currentIteration ?? '?'} of ${loopContext?.maxIterations ?? '?'}
${loopContext?.isFirstIteration ? 'This is the FIRST iteration.' : 'This is a CONTINUATION - previous iterations have run.'}
PROJECT_ROOT=${projectRoot}

INSTRUCTIONS:
- You are running autonomously - the user sees your output in real-time via TUI
- Provide clear progress updates as you work (e.g., "Now implementing X...", "Testing Y...")
- Think step-by-step and be explicit about what you're doing
- Summarize what was accomplished after completing subtasks
- On subsequent iterations, build upon previous work
=== END RALPH CONTEXT ===

`;

  const suffix = createCompletionSuffix(completionSignal);
  return `${contextHeader}${originalPrompt}${suffix}`;
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
