import { execFile } from 'node:child_process';
import { readFile, readdir } from 'node:fs/promises';
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

const WORKSPACE_DIRECTORIES = ['apps', 'packages'] as const;
const WORKSPACE_DEPENDENCY_FIELDS = [
  'dependencies',
  'optionalDependencies',
] as const;

interface WorkspacePackageInfo {
  name: string;
  workspaceDir: string;
  dependencyNames: string[];
}

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
  const dependencyRootsByWorkspaceDir =
    await findVersionPolicyDependencyRootsByWorkspaceDir(contracts);
  const diff = await runCommand('git', [
    'diff',
    '--name-only',
    `${baseRef}..${headRef}`,
    '--',
    ...Array.from(
      new Set(
        contracts.flatMap((contract) => [
          contract.workspaceDir,
          ...contract.versionPolicyAdditionalRoots,
          ...(dependencyRootsByWorkspaceDir.get(contract.workspaceDir) ?? []),
        ]),
      ),
    ),
  ]);

  return findChangedWorkspaceDirsFromPaths(
    diff
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean),
    contracts,
    dependencyRootsByWorkspaceDir,
  );
}

export function findChangedWorkspaceDirsFromPaths(
  changedPaths: readonly string[],
  contracts: readonly PublicPackageContract[],
  dependencyRootsByWorkspaceDir: ReadonlyMap<
    string,
    readonly string[]
  > = new Map(),
): Set<string> {
  const changedDirs = new Set<string>();

  for (const path of changedPaths) {
    for (const contract of contracts) {
      const roots = [
        contract.workspaceDir,
        ...contract.versionPolicyAdditionalRoots,
        ...(dependencyRootsByWorkspaceDir.get(contract.workspaceDir) ?? []),
      ];

      if (
        roots.some((root) => path === root || path.startsWith(`${root}/`)) &&
        !isVersionPolicyIgnoredPath(contract, path)
      ) {
        changedDirs.add(contract.workspaceDir);
      }
    }
  }

  return changedDirs;
}

export async function findVersionPolicyDependencyRootsByWorkspaceDir(
  contracts: readonly PublicPackageContract[],
): Promise<Map<string, string[]>> {
  const workspacePackages = await loadWorkspacePackageInfos();
  const dependencyRootsByWorkspaceDir = new Map<string, string[]>();

  for (const contract of contracts) {
    const dependencyRoots = collectWorkspaceDependencyRoots(
      contract.publicName,
      workspacePackages,
    ).filter((workspaceDir) => workspaceDir !== contract.workspaceDir);
    dependencyRootsByWorkspaceDir.set(contract.workspaceDir, dependencyRoots);
  }

  return dependencyRootsByWorkspaceDir;
}

async function loadWorkspacePackageInfos(): Promise<
  Map<string, WorkspacePackageInfo>
> {
  const workspacePackages = new Map<string, WorkspacePackageInfo>();

  for (const workspaceDirectory of WORKSPACE_DIRECTORIES) {
    const absoluteWorkspaceDirectory = join(REPO_ROOT, workspaceDirectory);
    let entries: Awaited<ReturnType<typeof readdir>>;

    try {
      entries = await readdir(absoluteWorkspaceDirectory, {
        withFileTypes: true,
      });
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }

      const workspaceDir = join(workspaceDirectory, entry.name);
      const packageJsonPath = join(REPO_ROOT, workspaceDir, 'package.json');
      let packageJson: Record<string, unknown>;

      try {
        packageJson = JSON.parse(
          await readFile(packageJsonPath, 'utf8'),
        ) as Record<string, unknown>;
      } catch {
        continue;
      }

      const name = packageJson.name;
      if (typeof name !== 'string' || name.trim().length === 0) {
        continue;
      }

      workspacePackages.set(name, {
        name,
        workspaceDir,
        dependencyNames: getWorkspaceDependencyNames(packageJson),
      });
    }
  }

  return workspacePackages;
}

function collectWorkspaceDependencyRoots(
  packageName: string,
  workspacePackages: ReadonlyMap<string, WorkspacePackageInfo>,
): string[] {
  const dependencyRoots = new Set<string>();
  const visitedPackageNames = new Set<string>();

  function visit(currentPackageName: string) {
    const currentPackage = workspacePackages.get(currentPackageName);
    if (!currentPackage) {
      return;
    }

    for (const dependencyName of currentPackage.dependencyNames) {
      const dependencyPackage = workspacePackages.get(dependencyName);
      if (!dependencyPackage || visitedPackageNames.has(dependencyName)) {
        continue;
      }

      visitedPackageNames.add(dependencyName);
      dependencyRoots.add(dependencyPackage.workspaceDir);
      visit(dependencyName);
    }
  }

  visit(packageName);

  return Array.from(dependencyRoots).sort();
}

function getWorkspaceDependencyNames(
  packageJson: Record<string, unknown>,
): string[] {
  const dependencyNames = new Set<string>();

  for (const field of WORKSPACE_DEPENDENCY_FIELDS) {
    const dependencies = packageJson[field];
    if (!dependencies || typeof dependencies !== 'object') {
      continue;
    }

    for (const dependencyName of Object.keys(
      dependencies as Record<string, unknown>,
    )) {
      dependencyNames.add(dependencyName);
    }
  }

  return Array.from(dependencyNames).sort();
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
