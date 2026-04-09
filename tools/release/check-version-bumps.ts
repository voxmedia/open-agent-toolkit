import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  getPublicPackageContracts,
  type PublicPackageContract,
} from '../../packages/cli/src/release/public-package-contract';
import {
  findChangedWorkspaceDirs,
  getPackageVersion,
  readPackageJsonAtGitRef,
  REPO_ROOT,
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
}

async function readCurrentPackageJson(
  workspaceDir: string,
): Promise<Record<string, unknown>> {
  return JSON.parse(
    await readFile(join(REPO_ROOT, workspaceDir, 'package.json'), 'utf8'),
  ) as Record<string, unknown>;
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

  const errors = findLockstepVersionBumpErrors(states);

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
