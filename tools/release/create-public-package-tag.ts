import { execFile } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import { getPublicPackageContracts } from '../../packages/cli/src/release/public-package-contract';
import {
  findLockstepVersionBumpErrors,
  type PublicPackageVersionState,
} from './validate-public-packages';

const execFileAsync = promisify(execFile);
const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const ZERO_SHA = '0000000000000000000000000000000000000000';

interface CliOptions {
  baseRef: string | null;
  headRef: string;
  push: boolean;
}

function parseCliArgs(argv: readonly string[]): CliOptions {
  let baseRef: string | null = null;
  let headRef = 'HEAD';
  let push = false;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    switch (arg) {
      case '--base-ref': {
        baseRef = argv[index + 1] ?? null;
        index += 1;
        break;
      }
      case '--head-ref': {
        headRef = argv[index + 1] ?? 'HEAD';
        index += 1;
        break;
      }
      case '--push': {
        push = true;
        break;
      }
      default: {
        throw new Error(`unknown argument: ${arg}`);
      }
    }
  }

  return { baseRef, headRef, push };
}

async function runCommand(
  command: string,
  args: readonly string[],
): Promise<string> {
  const { stdout } = await execFileAsync(command, args, {
    cwd: REPO_ROOT,
    env: process.env,
    maxBuffer: 20 * 1024 * 1024,
  });

  return stdout;
}

async function runCommandQuietly(
  command: string,
  args: readonly string[],
): Promise<boolean> {
  try {
    await runCommand(command, args);
    return true;
  } catch {
    return false;
  }
}

async function readPackageJsonAtGitRef(
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

function getPackageVersion(
  packageJson: Record<string, unknown> | null,
): string | null {
  return packageJson && typeof packageJson.version === 'string'
    ? packageJson.version
    : null;
}

async function findChangedWorkspaceDirs(baseRef: string, headRef: string) {
  const contracts = getPublicPackageContracts();
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
    if (contract) {
      changedDirs.add(contract.workspaceDir);
    }
  }

  return changedDirs;
}

async function getVersionStates(
  baseRef: string,
  headRef: string,
): Promise<PublicPackageVersionState[]> {
  const contracts = getPublicPackageContracts();
  const changedWorkspaceDirs = await findChangedWorkspaceDirs(baseRef, headRef);

  return Promise.all(
    contracts.map(async (contract) => {
      const currentPackageJson = await readPackageJsonAtGitRef(
        headRef,
        contract.workspaceDir,
      );
      const basePackageJson = await readPackageJsonAtGitRef(
        baseRef,
        contract.workspaceDir,
      );

      return {
        contract,
        changedSinceBase: changedWorkspaceDirs.has(contract.workspaceDir),
        currentVersion: getPackageVersion(currentPackageJson) ?? '',
        baseVersion: getPackageVersion(basePackageJson),
      } satisfies PublicPackageVersionState;
    }),
  );
}

function getReleaseTagName(
  states: readonly PublicPackageVersionState[],
): string | null {
  const changedVersions = new Set(
    states
      .filter((state) => state.changedSinceBase)
      .map((state) => state.currentVersion.trim())
      .filter((version) => version.length > 0),
  );

  if (changedVersions.size === 0) {
    return null;
  }

  if (changedVersions.size > 1) {
    throw new Error(
      `expected a single lockstep release version, found ${Array.from(changedVersions).join(', ')}`,
    );
  }

  return `v${Array.from(changedVersions)[0]}`;
}

async function createTag(tagName: string, headRef: string, push: boolean) {
  const tagExists = await runCommandQuietly('git', [
    'rev-parse',
    '--verify',
    '--quiet',
    `refs/tags/${tagName}`,
  ]);

  if (tagExists) {
    console.log(`release tag ${tagName} already exists`);
    return;
  }

  await runCommand('git', ['tag', tagName, headRef]);
  console.log(`created release tag ${tagName} at ${headRef}`);

  if (push) {
    await runCommand('git', ['push', 'origin', `refs/tags/${tagName}`]);
    console.log(`pushed release tag ${tagName}`);
  }
}

async function main() {
  const options = parseCliArgs(process.argv.slice(2));
  const baseRef = options.baseRef?.trim();

  if (!baseRef || baseRef === ZERO_SHA) {
    console.log(
      'no comparable base ref available; skipping release tag creation',
    );
    return;
  }

  const states = await getVersionStates(baseRef, options.headRef);
  const versionErrors = findLockstepVersionBumpErrors(states);
  if (versionErrors.length > 0) {
    throw new Error(versionErrors.join('\n'));
  }

  const tagName = getReleaseTagName(states);
  if (!tagName) {
    console.log(
      'no public package version bump detected; skipping release tag creation',
    );
    return;
  }

  await createTag(tagName, options.headRef, options.push);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    await main();
  } catch (error) {
    console.error('release tag creation failed');
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
