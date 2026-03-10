import { execFile } from 'node:child_process';
import {
  chmod,
  lstat,
  readFile,
  readlink,
  rm,
  writeFile,
} from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { promisify } from 'node:util';

import { ensureDir } from '@fs/io';

const execFileAsync = promisify(execFile);

export const HOOK_MARKER_START = '# >>> oat pre-commit hook >>>';
export const HOOK_MARKER_END = '# <<< oat pre-commit hook <<<';
export const HOOK_DRIFT_WARNING =
  "oat: project provider views are out of sync - run 'oat status --scope project' or 'oat sync --scope project'";

interface RunHookCheckOptions {
  runStatusCommand?: (cwd: string) => Promise<boolean>;
  warn?: (message: string) => void;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function createHookSnippet(options: { includeShebang?: boolean } = {}): string {
  const lines = [
    HOOK_MARKER_START,
    'if command -v oat >/dev/null 2>&1; then',
    '  if ! oat status --scope project >/dev/null 2>&1; then',
    `    echo "${HOOK_DRIFT_WARNING}" >&2`,
    '  fi',
    'fi',
    HOOK_MARKER_END,
  ];

  if (!options.includeShebang) {
    return lines.join('\n');
  }

  return ['#!/bin/sh', '', ...lines].join('\n');
}

async function resolveGitDirectory(projectRoot: string): Promise<string> {
  const gitPath = join(projectRoot, '.git');

  try {
    const gitStat = await lstat(gitPath);
    if (gitStat.isSymbolicLink()) {
      const symlinkTarget = await readlink(gitPath);
      return resolve(dirname(gitPath), symlinkTarget);
    }

    if (gitStat.isFile()) {
      const content = await readFile(gitPath, 'utf8');
      const match = /^gitdir:\s*(.+)$/m.exec(content.trim());
      if (match?.[1]) {
        return resolve(projectRoot, match[1].trim());
      }
    }
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'ENOENT'
    ) {
      return gitPath;
    }
    throw error;
  }

  return gitPath;
}

async function resolveHooksDirectory(
  projectRoot: string,
  options: { createIfMissing?: boolean } = {},
): Promise<string> {
  const gitDir = await resolveGitDirectory(projectRoot);
  const hooksDir = join(gitDir, 'hooks');
  const shouldCreate = options.createIfMissing ?? false;

  try {
    const hooksStat = await lstat(hooksDir);
    if (!hooksStat.isSymbolicLink()) {
      return hooksDir;
    }

    const symlinkTarget = await readlink(hooksDir);
    const resolvedTarget = resolve(dirname(hooksDir), symlinkTarget);
    if (shouldCreate) {
      await ensureDir(resolvedTarget);
    }
    return resolvedTarget;
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'ENOENT'
    ) {
      if (shouldCreate) {
        await ensureDir(hooksDir);
      }
      return hooksDir;
    }
    throw error;
  }
}

export async function isHookInstalled(projectRoot: string): Promise<boolean> {
  const hooksDir = await resolveHooksDirectory(projectRoot);
  const hookPath = join(hooksDir, 'pre-commit');
  try {
    const content = await readFile(hookPath, 'utf8');
    return content.includes(HOOK_MARKER_START);
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'ENOENT'
    ) {
      return false;
    }
    throw error;
  }
}

export async function installHook(projectRoot: string): Promise<void> {
  const hooksDir = await resolveHooksDirectory(projectRoot, {
    createIfMissing: true,
  });
  const hookPath = join(hooksDir, 'pre-commit');

  let current = '';
  try {
    current = await readFile(hookPath, 'utf8');
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code !== 'ENOENT'
    ) {
      throw error;
    }
  }

  if (current.includes(HOOK_MARKER_START)) {
    await chmod(hookPath, 0o755);
    return;
  }

  const includeShebang = current.trim().length === 0;
  const snippet = createHookSnippet({ includeShebang });
  await ensureDir(dirname(hookPath));
  const next =
    current.trim().length > 0
      ? `${current.trimEnd()}\n\n${snippet}\n`
      : `${snippet}\n`;
  await writeFile(hookPath, next, 'utf8');
  await chmod(hookPath, 0o755);
}

function removeHookSnippet(content: string): string {
  const markerStart = escapeRegExp(HOOK_MARKER_START);
  const markerEnd = escapeRegExp(HOOK_MARKER_END);
  const normalized = content.replaceAll('\r\n', '\n');

  const wholeSnippetPattern = new RegExp(
    `^#!/bin/sh\\n\\n${markerStart}[\\s\\S]*?${markerEnd}\\n?$`,
  );
  if (wholeSnippetPattern.test(normalized)) {
    return '';
  }

  const markerBlockPattern = new RegExp(
    `\\n?${markerStart}[\\s\\S]*?${markerEnd}\\n?`,
    'm',
  );
  const withoutMarker = normalized.replace(markerBlockPattern, '\n');
  const compacted = withoutMarker.replace(/\n{3,}/g, '\n\n').trimEnd();
  return compacted.length > 0 ? `${compacted}\n` : '';
}

export async function uninstallHook(projectRoot: string): Promise<void> {
  const hooksDir = await resolveHooksDirectory(projectRoot);
  const hookPath = join(hooksDir, 'pre-commit');

  let current = '';
  try {
    current = await readFile(hookPath, 'utf8');
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'ENOENT'
    ) {
      return;
    }
    throw error;
  }

  if (!current.includes(HOOK_MARKER_START)) {
    return;
  }

  const next = removeHookSnippet(current);
  if (next.trim().length === 0) {
    await rm(hookPath, { force: true });
    return;
  }
  await writeFile(hookPath, next, 'utf8');
}

async function runStatusCommandDefault(cwd: string): Promise<boolean> {
  try {
    await execFileAsync('oat', ['status', '--scope', 'project'], { cwd });
    return true;
  } catch {
    return false;
  }
}

export async function runHookCheck(
  cwd: string,
  options: RunHookCheckOptions = {},
): Promise<{ inSync: boolean }> {
  const runStatusCommand = options.runStatusCommand ?? runStatusCommandDefault;
  const warn =
    options.warn ??
    ((message: string) => {
      process.stderr.write(`${message}\n`);
    });

  let inSync = false;
  try {
    // Default impl already returns boolean on failures, but this catch
    // protects custom injected implementations from escaping exceptions.
    inSync = await runStatusCommand(cwd);
  } catch {
    inSync = false;
  }

  if (!inSync) {
    warn(HOOK_DRIFT_WARNING);
  }

  return { inSync };
}
