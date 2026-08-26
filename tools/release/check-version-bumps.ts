import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  getPublicPackageContracts,
  type PublicPackageContract,
} from '../../packages/cli/src/release/public-package-contract';
import {
  compareStableVersions,
  findChangedWorkspaceDirs,
  getPackageVersion,
  readPackageJsonAtGitRef,
  REPO_ROOT,
  resolveCurrentMainRef,
  resolveMergeBase,
} from './release-utils';
import {
  findLockstepVersionBumpErrors,
  type PublicPackageVersionState,
} from './validate-public-packages';

export interface VersionBumpCheckResult {
  status: 'skipped' | 'passed' | 'failed';
  summary: string;
  errors: string[];
}

interface VersionBumpCheckDependencies {
  contracts?: readonly PublicPackageContract[];
  resolveMergeBaseFn?: typeof resolveMergeBase;
  findChangedWorkspaceDirsFn?: typeof findChangedWorkspaceDirs;
  readCurrentPackageJsonFn?: (
    workspaceDir: string,
  ) => Promise<Record<string, unknown> | null>;
  readBasePackageJsonFn?: (
    baseRef: string,
    workspaceDir: string,
  ) => Promise<Record<string, unknown> | null>;
  resolveCurrentMainRefFn?: () => Promise<string | null>;
  readMainPackageJsonFn?: (
    mainRef: string,
    workspaceDir: string,
  ) => Promise<Record<string, unknown> | null>;
}

interface CurrentMainVersionState {
  contract: PublicPackageContract;
  currentVersion: string;
  mainVersion: string | null;
}

async function readCurrentPackageJson(
  workspaceDir: string,
): Promise<Record<string, unknown>> {
  return JSON.parse(
    await readFile(join(REPO_ROOT, workspaceDir, 'package.json'), 'utf8'),
  ) as Record<string, unknown>;
}

/**
 * Rejects lockstep versions that the current tip of main has already reached.
 *
 * The merge-base rule proves a branch bumped relative to where it forked; this
 * rule proves the branch is still ahead of what main released afterwards.
 */
export function findVersionsBehindCurrentMainErrors(
  currentMainRef: string,
  states: readonly CurrentMainVersionState[],
): string[] {
  const errors: string[] = [];

  for (const { contract, currentVersion, mainVersion } of states) {
    if (mainVersion === null) {
      errors.push(
        `${contract.publicName}: no package version found at current main (${currentMainRef}); cannot prove this branch is ahead of the released version`,
      );
      continue;
    }

    const comparison = compareStableVersions(currentVersion, mainVersion);

    if (comparison === null) {
      errors.push(
        `${contract.publicName}: cannot compare versions numerically (branch ${currentVersion || 'missing'}, current main ${mainVersion}); the release gate requires stable major.minor.patch versions`,
      );
      continue;
    }

    if (comparison <= 0) {
      errors.push(
        `${contract.publicName}@${currentVersion} is not greater than the current main version ${mainVersion} (${currentMainRef}); rebase on current main and bump all public packages above ${mainVersion}`,
      );
    }
  }

  return errors;
}

export async function runVersionBumpCheck(
  dependencies: VersionBumpCheckDependencies = {},
): Promise<VersionBumpCheckResult> {
  const contracts = dependencies.contracts ?? getPublicPackageContracts();
  const mergeBase = await (
    dependencies.resolveMergeBaseFn ?? resolveMergeBase
  )();

  if (!mergeBase) {
    return {
      status: 'skipped',
      summary: 'no merge base found — skipping version bump check',
      errors: [],
    };
  }

  const changedWorkspaceDirs = await (
    dependencies.findChangedWorkspaceDirsFn ?? findChangedWorkspaceDirs
  )(mergeBase, 'HEAD', contracts);

  if (changedWorkspaceDirs.size === 0) {
    return {
      status: 'passed',
      summary: 'no public package changes — version bump check passed',
      errors: [],
    };
  }

  const states: PublicPackageVersionState[] = await Promise.all(
    contracts.map(async (contract) => {
      const currentPackageJson = await (
        dependencies.readCurrentPackageJsonFn ?? readCurrentPackageJson
      )(contract.workspaceDir);
      const basePackageJson = await (
        dependencies.readBasePackageJsonFn ?? readPackageJsonAtGitRef
      )(mergeBase, contract.workspaceDir);
      return {
        contract,
        changedSinceBase: changedWorkspaceDirs.has(contract.workspaceDir),
        currentVersion: getPackageVersion(currentPackageJson) ?? '',
        baseVersion: getPackageVersion(basePackageJson),
      };
    }),
  );

  const errors = [...findLockstepVersionBumpErrors(states)];
  const currentMainRef = await (
    dependencies.resolveCurrentMainRefFn ?? resolveCurrentMainRef
  )();

  if (currentMainRef === null) {
    errors.push(
      'cannot compare package versions with current main: neither origin/main nor main was found. Fetch the default branch (git fetch origin main) so the release gate can compare against the current main tip.',
    );
  } else {
    const currentMainStates: CurrentMainVersionState[] = await Promise.all(
      states.map(async (state) => ({
        contract: state.contract,
        currentVersion: state.currentVersion,
        mainVersion: getPackageVersion(
          await (dependencies.readMainPackageJsonFn ?? readPackageJsonAtGitRef)(
            currentMainRef,
            state.contract.workspaceDir,
          ),
        ),
      })),
    );

    errors.push(
      ...findVersionsBehindCurrentMainErrors(currentMainRef, currentMainStates),
    );
  }

  return errors.length === 0
    ? {
        status: 'passed',
        summary: 'version bump check passed',
        errors: [],
      }
    : {
        status: 'failed',
        summary: 'version bump check failed:',
        errors,
      };
}

async function main() {
  const result = await runVersionBumpCheck();

  if (result.status === 'failed') {
    console.error(result.summary);
    for (const error of result.errors) {
      console.error(`- ${error}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log(result.summary);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
