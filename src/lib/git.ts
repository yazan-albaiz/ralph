/**
 * Git Operations Module - Auto-commit support for Ralph
 */

import { execSync, spawnSync } from 'node:child_process';

export interface GitStatus {
  hasChanges: boolean;
  staged: number;
  unstaged: number;
  untracked: number;
}

export interface CommitResult {
  success: boolean;
  error?: string;
}

/**
 * Check if current directory is a git repository
 */
export function isGitRepo(cwd: string): boolean {
  try {
    execSync('git rev-parse --git-dir', { cwd, stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get git status summary
 */
export function getGitStatus(cwd: string): GitStatus {
  try {
    const result = execSync('git status --porcelain', { cwd, encoding: 'utf-8' });
    const lines = result.trim().split('\n').filter(line => line.length > 0);

    let staged = 0;
    let unstaged = 0;
    let untracked = 0;

    for (const line of lines) {
      const indexStatus = line[0];
      const workTreeStatus = line[1];

      if (indexStatus === '?') {
        untracked++;
      } else {
        if (indexStatus !== ' ') staged++;
        if (workTreeStatus !== ' ') unstaged++;
      }
    }

    return {
      hasChanges: lines.length > 0,
      staged,
      unstaged,
      untracked,
    };
  } catch {
    return { hasChanges: false, staged: 0, unstaged: 0, untracked: 0 };
  }
}

/**
 * Stage all changes and commit
 */
export function commitChanges(cwd: string, message: string): CommitResult {
  try {
    // Stage all changes
    execSync('git add -A', { cwd, stdio: 'pipe' });

    // Commit with message
    const result = spawnSync('git', ['commit', '-m', message], {
      cwd,
      stdio: 'pipe',
      encoding: 'utf-8',
    });

    if (result.status !== 0) {
      // Check if it's just "nothing to commit"
      const output = result.stdout + result.stderr;
      if (output.includes('nothing to commit') || output.includes('no changes added')) {
        return { success: true }; // Not an error, just nothing to commit
      }
      return { success: false, error: result.stderr || 'Unknown git error' };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Generate a default commit message based on git diff
 */
export function generateDefaultCommitMessage(cwd: string, iteration: number): string {
  try {
    // First stage changes to see what would be committed
    execSync('git add -A', { cwd, stdio: 'pipe' });

    const diffStat = execSync('git diff --cached --stat', { cwd, encoding: 'utf-8' });
    const lines = diffStat.trim().split('\n');

    if (lines.length > 0) {
      const summaryLine = lines[lines.length - 1]; // e.g., "3 files changed, 50 insertions(+), 10 deletions(-)"

      if (summaryLine && summaryLine.includes('changed')) {
        return `ralph: iteration ${iteration} - ${summaryLine.trim()}`;
      }
    }
  } catch {
    // Ignore errors
  }

  return `ralph: iteration ${iteration} complete`;
}

/**
 * Check if there are uncommitted changes
 */
export function hasUncommittedChanges(cwd: string): boolean {
  const status = getGitStatus(cwd);
  return status.hasChanges;
}

export const git = {
  isGitRepo,
  getGitStatus,
  commitChanges,
  generateDefaultCommitMessage,
  hasUncommittedChanges,
};

export default git;
