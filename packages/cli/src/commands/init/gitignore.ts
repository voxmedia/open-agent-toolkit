import { execFile } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';

import { fileExists } from '@fs/io';

const SECTION_START = '# OAT core';
const SECTION_END = '# END OAT core';
const OAT_STATE_DASHBOARD_PATH = '.oat/state.md';
const execFileAsync = promisify(execFile);

const CORE_ENTRIES = [
  '.oat/config.local.json',
  '.oat/state.md',
  '.oat/projects/local/**',
  '.oat/projects/archived/**',
  '!.oat/projects/local/.gitkeep',
  '!.oat/projects/archived/.gitkeep',
];

export interface ApplyOatCoreResult {
  action: 'created' | 'updated' | 'no-change';
  entries: string[];
  stateDashboardIndexAction: 'untracked' | 'not-tracked' | 'not-git-repo';
}

function buildSection(): string {
  return `${SECTION_START}\n${CORE_ENTRIES.join('\n')}\n${SECTION_END}`;
}

export async function applyOatCoreGitignore(
  repoRoot: string,
): Promise<ApplyOatCoreResult> {
  const gitignorePath = join(repoRoot, '.gitignore');
  const exists = await fileExists(gitignorePath);
  const section = buildSection();

  if (!exists) {
    await writeFile(gitignorePath, `${section}\n`, 'utf8');
    return {
      action: 'created',
      entries: CORE_ENTRIES,
      stateDashboardIndexAction: await untrackOatStateDashboard(repoRoot),
    };
  }

  const content = await readFile(gitignorePath, 'utf8');
  const startIdx = content.indexOf(SECTION_START);
  const endIdx = content.indexOf(SECTION_END);

  if (startIdx !== -1 && endIdx !== -1) {
    const existingSection = content.slice(
      startIdx,
      endIdx + SECTION_END.length,
    );
    if (existingSection === section) {
      return {
        action: 'no-change',
        entries: CORE_ENTRIES,
        stateDashboardIndexAction: await untrackOatStateDashboard(repoRoot),
      };
    }

    const before = content.slice(0, startIdx);
    const after = content.slice(endIdx + SECTION_END.length);
    await writeFile(gitignorePath, `${before}${section}${after}`, 'utf8');
    return {
      action: 'updated',
      entries: CORE_ENTRIES,
      stateDashboardIndexAction: await untrackOatStateDashboard(repoRoot),
    };
  }

  const separator = content.endsWith('\n') ? '\n' : '\n\n';
  await writeFile(gitignorePath, `${content}${separator}${section}\n`, 'utf8');
  return {
    action: 'updated',
    entries: CORE_ENTRIES,
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
