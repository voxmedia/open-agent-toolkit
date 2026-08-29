import { execFile } from 'node:child_process';
import { readFile, rm, writeFile } from 'node:fs/promises';
import { isAbsolute, join, relative } from 'node:path';
import { promisify } from 'node:util';

import type { GitRunner } from '@commands/project/sync/git';
import { canonicalizePath } from '@commands/shared/project-scope';
import { CliError } from '@errors/cli-error';

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

function managedScopedRules(content: string | null): string[] {
  if (content === null) return [];
  const startIndex = content.indexOf(SECTION_START);
  const endIndex = content.indexOf(SECTION_END);
  if (startIndex === -1 || endIndex < startIndex) return [];
  return content
    .slice(startIndex + SECTION_START.length, endIndex)
    .split('\n')
    .filter((line) => /^\/(?:.+\/)?(?:local\/\*\*|synced\/\*\/)$/.test(line));
}

export interface ApplyOatCoreResult {
  action: 'created' | 'updated' | 'no-change';
  entries: string[];
  stateDashboardIndexAction: 'untracked' | 'not-tracked' | 'not-git-repo';
}

export interface EnsureScopedRootGitignoreResult {
  before: string | null | undefined;
  changed: boolean;
}

async function readOptionalFile(path: string): Promise<string | null> {
  try {
    return await readFile(path, 'utf8');
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

function removeUnmanagedRule(content: string, rule: string): string {
  let inManagedBlock = false;
  return content
    .split('\n')
    .filter((line) => {
      if (line === SECTION_START) inManagedBlock = true;
      const keep = line !== rule || inManagedBlock;
      if (line === SECTION_END) inManagedBlock = false;
      return keep;
    })
    .join('\n');
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
  additionalEntries: readonly string[] = [],
): Promise<ApplyOatCoreResult> {
  const gitignorePath = join(repoRoot, '.gitignore');
  const existingScopedRules = managedScopedRules(
    await readOptionalFile(gitignorePath),
  );
  const result = await applyManagedBlock(gitignorePath, {
    start: SECTION_START,
    end: SECTION_END,
    entries: [
      ...new Set([
        ...CORE_ENTRIES,
        ...existingScopedRules,
        ...additionalEntries,
      ]),
    ],
  });
  return {
    ...result,
    stateDashboardIndexAction: await untrackOatStateDashboard(repoRoot),
  };
}

export async function ensureScopedRootGitignore(
  repoRoot: string,
  scopeRoot: string,
  scope: 'local' | 'synced',
  git: GitRunner,
  dirtyMessage:
    | string
    | null = 'Cannot repair the configured project-root rule because .gitignore has staged or unstaged changes; commit or stash those changes, then retry.',
): Promise<EnsureScopedRootGitignoreResult> {
  const canonicalRepoRoot = canonicalizePath(repoRoot);
  const canonicalScopeRoot = canonicalizePath(scopeRoot);
  const scopeRelative = relative(canonicalRepoRoot, canonicalScopeRoot);
  if (
    scopeRelative === '..' ||
    scopeRelative.startsWith('../') ||
    scopeRelative.startsWith('..\\') ||
    isAbsolute(scopeRelative)
  ) {
    return { changed: false, before: undefined };
  }

  const normalizedRoot = scopeRelative.split('\\').join('/');
  const rule =
    scope === 'local' ? `/${normalizedRoot}/**` : `/${normalizedRoot}/*/`;
  const defaultRoot = `.oat/projects/${scope}`;
  const customRule = normalizedRoot === defaultRoot ? null : rule;
  const gitignorePath = join(repoRoot, '.gitignore');
  const current = await readOptionalFile(gitignorePath);
  const managedSection =
    current?.slice(
      current.indexOf(SECTION_START),
      current.indexOf(SECTION_END),
    ) ?? '';
  const customRuleManaged =
    customRule === null || managedSection.split('\n').includes(customRule);
  const probe = join(canonicalScopeRoot, '__probe__', 'artifact.md');
  const ignored = await git.run(
    ['check-ignore', '--quiet', '--no-index', probe],
    { cwd: repoRoot, allowFailure: true },
  );
  if (ignored.code === 0 && customRuleManaged) {
    return { changed: false, before: undefined };
  }
  if (ignored.code !== 0 && ignored.code !== 1) {
    throw new CliError(
      `git check-ignore failed (exit ${ignored.code}): ${ignored.stderr || ignored.stdout || 'unknown Git error'}`,
      2,
    );
  }

  if (dirtyMessage !== null) {
    const gitignoreStatus = await git.run(
      ['status', '--porcelain=v1', '--', '.gitignore'],
      { cwd: repoRoot },
    );
    if (gitignoreStatus.stdout !== '') throw new CliError(dirtyMessage, 1);
  }

  const before = await readOptionalFile(gitignorePath);
  if (before !== null && customRule !== null) {
    const cleaned = removeUnmanagedRule(before, customRule);
    if (cleaned !== before) await writeFile(gitignorePath, cleaned, 'utf8');
  }
  await applyOatCoreGitignore(
    repoRoot,
    customRule === null ? [] : [customRule],
  );

  const verified = await git.run(
    ['check-ignore', '--quiet', '--no-index', probe],
    { cwd: repoRoot, allowFailure: true },
  );
  if (verified.code !== 0) {
    if (before === null) {
      await rm(gitignorePath, { force: true });
    } else {
      await writeFile(gitignorePath, before, 'utf8');
    }
    throw new CliError(
      `git check-ignore failed after applying the managed block (exit ${verified.code}): ${verified.stderr || verified.stdout || 'configured rule did not match'}`,
      2,
    );
  }
  return {
    before,
    changed: (await readOptionalFile(gitignorePath)) !== before,
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
