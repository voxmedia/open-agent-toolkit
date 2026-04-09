import { execFile } from 'node:child_process';
import { dirname, join, matchesGlob } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import { type PublicPackageContract } from '../../packages/cli/src/release/public-package-contract';

const execFileAsync = promisify(execFile);

export const REPO_ROOT = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
);

export async function runCommand(
  command: string,
  args: readonly string[],
  cwd = REPO_ROOT,
): Promise<string> {
  const { stdout } = await execFileAsync(command, args, {
    cwd,
    env: process.env,
    maxBuffer: 20 * 1024 * 1024,
  });

  return stdout;
}

export async function gitRefExists(ref: string): Promise<boolean> {
  try {
    await runCommand('git', ['rev-parse', '--verify', '--quiet', ref]);
    return true;
  } catch {
    return false;
  }
}

export async function readPackageJsonAtGitRef(
  ref: string,
  workspaceDir: string,
): Promise<Record<string, unknown> | null> {
  try {
    return JSON.parse(
      await runCommand('git', ['show', `${ref}:${workspaceDir}/package.json`]),
    ) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function getPackageVersion(
  packageJson: Record<string, unknown> | null,
): string | null {
  return packageJson && typeof packageJson.version === 'string'
    ? packageJson.version
    : null;
}

export async function resolveMergeBase(
  headRef = 'HEAD',
): Promise<string | null> {
  for (const ref of ['origin/main', 'main']) {
    try {
      return (await runCommand('git', ['merge-base', ref, headRef])).trim();
    } catch {
      continue;
    }
  }

  return null;
}

export async function findChangedWorkspaceDirs(
  baseRef: string,
  headRef: string,
  contracts: readonly PublicPackageContract[],
): Promise<Set<string>> {
  const diff = await runCommand('git', [
    'diff',
    '--name-only',
    `${baseRef}..${headRef}`,
    '--',
    ...contracts.map((contract) => contract.workspaceDir),
  ]);

  const changedDirs = new Set<string>();
  for (const path of diff
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)) {
    const contract = contracts.find(
      (candidate) =>
        path === candidate.workspaceDir ||
        path.startsWith(`${candidate.workspaceDir}/`),
    );
    if (contract && !isVersionPolicyIgnoredPath(contract, path)) {
      changedDirs.add(contract.workspaceDir);
    }
  }

  return changedDirs;
}

export function isVersionPolicyIgnoredPath(
  contract: PublicPackageContract,
  workspacePath: string,
): boolean {
  const relativePath = workspacePath.startsWith(`${contract.workspaceDir}/`)
    ? workspacePath.slice(contract.workspaceDir.length + 1)
    : workspacePath === contract.workspaceDir
      ? ''
      : workspacePath;

  return contract.versionPolicyIgnorePatterns.some((pattern) =>
    matchesGlob(relativePath, pattern),
  );
}
