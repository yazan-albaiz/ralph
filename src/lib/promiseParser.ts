/**
 * Promise Tag Parser - Parse semantic promise tags from Claude output
 */

import type { ParsedPromiseTag } from '../types/index.js';

export interface LoopContext {
  currentIteration: number;
  maxIterations: number;
  isFirstIteration: boolean;
}

const PROMISE_TAG_PATTERNS = {
  COMPLETE: /<promise>\s*COMPLETE\s*<\/promise>/i,
  BLOCKED: /<promise>\s*BLOCKED:\s*(.+?)\s*<\/promise>/i,
  DECIDE: /<promise>\s*DECIDE:\s*(.+?)\s*<\/promise>/i,
};

const ANY_PROMISE_TAG = /<promise>(.+?)<\/promise>/gi;

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

When you have completed ALL tasks successfully, output exactly:
${signal}

If you are BLOCKED and cannot continue without human intervention, output:
<promise>BLOCKED: [brief reason why you're blocked]</promise>

If you need a DECISION from the user before continuing, output:
<promise>DECIDE: [brief question for the user]</promise>

Do not output any promise tags until you've attempted to complete the tasks or determined you cannot proceed.
---`;
}

export function preparePrompt(
  originalPrompt: string,
  projectRoot: string,
  completionSignal: string,
  loopContext?: LoopContext
): string {
  const iteration = loopContext?.currentIteration ?? '?';
  const maxIterations = loopContext?.maxIterations ?? '?';
  const iterationStatus = loopContext?.isFirstIteration
    ? 'This is the FIRST iteration.'
    : 'This is a CONTINUATION - previous iterations have run.';

  const contextHeader = `=== RALPH AUTONOMOUS LOOP ===
You are running inside RALPH, an autonomous AI coding loop.

ITERATION: ${iteration} of ${maxIterations}
${iterationStatus}
PROJECT_ROOT=${projectRoot}

INSTRUCTIONS:
- You are running autonomously - the user sees your output in real-time via TUI
- Provide clear progress updates as you work (e.g., "Now implementing X...", "Testing Y...")
- Think step-by-step and be explicit about what you're doing
- Summarize what was accomplished after completing subtasks
- On subsequent iterations, build upon previous work
=== END RALPH CONTEXT ===

`;

  return `${contextHeader}${originalPrompt}${createCompletionSuffix(completionSignal)}`;
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
