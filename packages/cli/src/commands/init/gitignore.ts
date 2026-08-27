import { execFile } from 'node:child_process';
import { join } from 'node:path';
import { promisify } from 'node:util';

import { applyManagedBlock } from './managed-block';

const SECTION_START = '# OAT core';
const SECTION_END = '# END OAT core';
const OAT_STATE_DASHBOARD_PATH = '.oat/state.md';
const execFileAsync = promisify(execFile);

const CORE_ENTRIES = [
  '.oat/config.local.json',
  '.oat/state.md',
  '.oat/projects/local/**',
  '.oat/projects/archived/**',
  '.oat/projects/synced/*/',
  '!.oat/projects/local/.gitkeep',
  '!.oat/projects/archived/.gitkeep',
];

export interface ApplyOatCoreResult {
  action: 'created' | 'updated' | 'no-change';
  entries: string[];
  stateDashboardIndexAction: 'untracked' | 'not-tracked' | 'not-git-repo';
}

export async function isSyncedRuleApplied(repoRoot: string): Promise<boolean> {
  try {
    await execFileAsync(
      'git',
      [
        'check-ignore',
        '--quiet',
        '--no-index',
        '.oat/projects/synced/__probe__/',
      ],
      { cwd: repoRoot },
    );
    return true;
  } catch {
    return false;
  }
}

export async function applyOatCoreGitignore(
  repoRoot: string,
): Promise<ApplyOatCoreResult> {
  const gitignorePath = join(repoRoot, '.gitignore');
  const result = await applyManagedBlock(gitignorePath, {
    start: SECTION_START,
    end: SECTION_END,
    entries: CORE_ENTRIES,
  });
  return {
    ...result,
    stateDashboardIndexAction: await untrackOatStateDashboard(repoRoot),
  };
}

/**
 * Removes the generated repo dashboard from the git index once the OAT core
 * ignore rule is present, while leaving the working-tree file intact.
 *
 * @param repoRoot Repository root where the OAT core gitignore section applies.
 * @returns The index migration outcome for `.oat/state.md`.
 */
export async function untrackOatStateDashboard(
  repoRoot: string,
): Promise<ApplyOatCoreResult['stateDashboardIndexAction']> {
  try {
    await execFileAsync('git', ['rev-parse', '--is-inside-work-tree'], {
      cwd: repoRoot,
    });
  } catch {
    return 'not-git-repo';
  }

  try {
    await execFileAsync(
      'git',
      ['ls-files', '--error-unmatch', OAT_STATE_DASHBOARD_PATH],
      { cwd: repoRoot },
    );
  } catch {
    return 'not-tracked';
  }

  await execFileAsync(
    'git',
    ['rm', '--cached', '--force', '--quiet', '--', OAT_STATE_DASHBOARD_PATH],
    { cwd: repoRoot },
  );
  return 'untracked';
}
