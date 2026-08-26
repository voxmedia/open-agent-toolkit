import { describe, expect, it } from 'vitest';

import { runVersionBumpCheck } from '../../../../tools/release/check-version-bumps';
import {
  findLockstepVersionBumpErrors,
  type PublicPackageVersionState,
} from '../../../../tools/release/validate-public-packages';
import { getPublicPackageContracts } from './public-package-contract';

const PUBLIC_NAMES = getPublicPackageContracts().map(
  (contract) => contract.publicName,
);

function buildMergeBaseStates(
  currentVersion: string,
  baseVersion: string,
  changedWorkspaceDirs: readonly string[],
): PublicPackageVersionState[] {
  return getPublicPackageContracts().map((contract) => ({
    contract,
    changedSinceBase: changedWorkspaceDirs.includes(contract.workspaceDir),
    currentVersion,
    baseVersion,
  }));
}

describe('runVersionBumpCheck', () => {
  it('skips the check when no merge base is available', async () => {
    await expect(
      runVersionBumpCheck({
        resolveMergeBaseFn: async () => null,
      }),
    ).resolves.toEqual({
      status: 'skipped',
      summary: 'no merge base found — skipping version bump check',
      errors: [],
    });
  });

  it('passes when no public packages changed since the merge base', async () => {
    const contracts = getPublicPackageContracts();
    let currentMainReads = 0;
    let currentMainRefResolutions = 0;

    await expect(
      runVersionBumpCheck({
        contracts,
        resolveMergeBaseFn: async () => 'origin/main',
        findChangedWorkspaceDirsFn: async () => new Set<string>(),
        resolveCurrentMainRefFn: async () => {
          currentMainRefResolutions += 1;
          return 'origin/main';
        },
        readMainPackageJsonFn: async () => {
          currentMainReads += 1;
          return { version: '9.9.9' };
        },
      }),
    ).resolves.toEqual({
      status: 'passed',
      summary: 'no public package changes — version bump check passed',
      errors: [],
    });
    expect(currentMainRefResolutions).toBe(0);
    expect(currentMainReads).toBe(0);
  });

  it('fails when changed public packages keep their base versions', async () => {
    const contracts = getPublicPackageContracts();

    const result = await runVersionBumpCheck({
      contracts,
      resolveMergeBaseFn: async () => 'origin/main',
      findChangedWorkspaceDirsFn: async () => new Set(['packages/cli']),
      readCurrentPackageJsonFn: async () => ({ version: '0.0.4' }),
      readBasePackageJsonFn: async () => ({ version: '0.0.4' }),
      resolveCurrentMainRefFn: async () => 'origin/main',
      readMainPackageJsonFn: async () => ({ version: '0.0.3' }),
    });

    expect(result).toEqual({
      status: 'failed',
      summary: 'version bump check failed:',
      errors: [
        'publishable package changes require a lockstep version bump across all public packages. Changed packages: @open-agent-toolkit/cli. Packages still at their base version: @open-agent-toolkit/cli@0.0.4, @open-agent-toolkit/control-plane@0.0.4, @open-agent-toolkit/docs-config@0.0.4, @open-agent-toolkit/docs-theme@0.0.4, @open-agent-toolkit/docs-transforms@0.0.4',
      ],
    });
  });

  it('fails when a valid merge-base bump was overtaken by a later main release', async () => {
    const contracts = getPublicPackageContracts();
    const mergeBaseOnlyErrors = findLockstepVersionBumpErrors(
      buildMergeBaseStates('0.2.29', '0.2.28', ['packages/cli']),
    );

    const result = await runVersionBumpCheck({
      contracts,
      resolveMergeBaseFn: async () => 'merge-base-sha',
      findChangedWorkspaceDirsFn: async () => new Set(['packages/cli']),
      readCurrentPackageJsonFn: async () => ({ version: '0.2.29' }),
      readBasePackageJsonFn: async () => ({ version: '0.2.28' }),
      resolveCurrentMainRefFn: async () => 'origin/main',
      readMainPackageJsonFn: async () => ({ version: '0.2.30' }),
    });

    expect(mergeBaseOnlyErrors).toEqual([]);
    expect(result.status).toBe('failed');
    expect(result.errors).toEqual(
      PUBLIC_NAMES.map(
        (publicName) =>
          `${publicName}@0.2.29 is not greater than the current main version 0.2.30 (origin/main); rebase on current main and bump all public packages above 0.2.30`,
      ),
    );
  });

  it('passes when every lockstep version is strictly above current main', async () => {
    const contracts = getPublicPackageContracts();

    await expect(
      runVersionBumpCheck({
        contracts,
        resolveMergeBaseFn: async () => 'merge-base-sha',
        findChangedWorkspaceDirsFn: async () => new Set(['packages/cli']),
        readCurrentPackageJsonFn: async () => ({ version: '0.2.31' }),
        readBasePackageJsonFn: async () => ({ version: '0.2.30' }),
        resolveCurrentMainRefFn: async () => 'origin/main',
        readMainPackageJsonFn: async () => ({ version: '0.2.30' }),
      }),
    ).resolves.toEqual({
      status: 'passed',
      summary: 'version bump check passed',
      errors: [],
    });
  });

  it('fails when a lockstep version merely equals current main', async () => {
    const contracts = getPublicPackageContracts();

    const result = await runVersionBumpCheck({
      contracts,
      resolveMergeBaseFn: async () => 'merge-base-sha',
      findChangedWorkspaceDirsFn: async () => new Set(['packages/cli']),
      readCurrentPackageJsonFn: async () => ({ version: '0.2.30' }),
      readBasePackageJsonFn: async () => ({ version: '0.2.29' }),
      resolveCurrentMainRefFn: async () => 'origin/main',
      readMainPackageJsonFn: async () => ({ version: '0.2.30' }),
    });

    expect(result.status).toBe('failed');
    expect(result.errors).toHaveLength(PUBLIC_NAMES.length);
    for (const publicName of PUBLIC_NAMES) {
      expect(result.errors).toContain(
        `${publicName}@0.2.30 is not greater than the current main version 0.2.30 (origin/main); rebase on current main and bump all public packages above 0.2.30`,
      );
    }
  });

  it('reports merge-base and current-main failures together in one run', async () => {
    const contracts = getPublicPackageContracts();

    const result = await runVersionBumpCheck({
      contracts,
      resolveMergeBaseFn: async () => 'merge-base-sha',
      findChangedWorkspaceDirsFn: async () => new Set(['packages/cli']),
      readCurrentPackageJsonFn: async () => ({ version: '0.2.29' }),
      readBasePackageJsonFn: async () => ({ version: '0.2.29' }),
      resolveCurrentMainRefFn: async () => 'origin/main',
      readMainPackageJsonFn: async () => ({ version: '0.2.30' }),
    });

    expect(result.status).toBe('failed');
    expect(result.errors).toHaveLength(PUBLIC_NAMES.length + 1);
    expect(result.errors[0]).toContain(
      'publishable package changes require a lockstep version bump',
    );
    expect(result.errors.slice(1)).toEqual(
      PUBLIC_NAMES.map(
        (publicName) =>
          `${publicName}@0.2.29 is not greater than the current main version 0.2.30 (origin/main); rebase on current main and bump all public packages above 0.2.30`,
      ),
    );
  });

  it('fails with actionable text when versions cannot be compared numerically', async () => {
    const contracts = getPublicPackageContracts();

    const result = await runVersionBumpCheck({
      contracts,
      resolveMergeBaseFn: async () => 'merge-base-sha',
      findChangedWorkspaceDirsFn: async () => new Set(['packages/cli']),
      readCurrentPackageJsonFn: async () => ({ version: '0.2.31-rc.1' }),
      readBasePackageJsonFn: async () => ({ version: '0.2.30' }),
      resolveCurrentMainRefFn: async () => 'origin/main',
      readMainPackageJsonFn: async () => ({ version: '0.2.30' }),
    });

    expect(result.status).toBe('failed');
    expect(result.errors).toEqual(
      PUBLIC_NAMES.map(
        (publicName) =>
          `${publicName}: cannot compare versions numerically (branch 0.2.31-rc.1, current main 0.2.30); the release gate requires stable major.minor.patch versions`,
      ),
    );
  });

  it('fails when current main has no readable package version', async () => {
    const contracts = getPublicPackageContracts();

    const result = await runVersionBumpCheck({
      contracts,
      resolveMergeBaseFn: async () => 'merge-base-sha',
      findChangedWorkspaceDirsFn: async () => new Set(['packages/cli']),
      readCurrentPackageJsonFn: async () => ({ version: '0.2.31' }),
      readBasePackageJsonFn: async () => ({ version: '0.2.30' }),
      resolveCurrentMainRefFn: async () => 'origin/main',
      readMainPackageJsonFn: async () => null,
    });

    expect(result.status).toBe('failed');
    expect(result.errors).toEqual(
      PUBLIC_NAMES.map(
        (publicName) =>
          `${publicName}: no package version found at current main (origin/main); cannot prove this branch is ahead of the released version`,
      ),
    );
  });

  it('fails closed when publishable work changed but no current main ref exists', async () => {
    const contracts = getPublicPackageContracts();
    let currentMainReads = 0;

    const result = await runVersionBumpCheck({
      contracts,
      resolveMergeBaseFn: async () => 'merge-base-sha',
      findChangedWorkspaceDirsFn: async () => new Set(['packages/cli']),
      readCurrentPackageJsonFn: async () => ({ version: '0.2.31' }),
      readBasePackageJsonFn: async () => ({ version: '0.2.30' }),
      resolveCurrentMainRefFn: async () => null,
      readMainPackageJsonFn: async () => {
        currentMainReads += 1;
        return { version: '0.2.30' };
      },
    });

    expect(result).toEqual({
      status: 'failed',
      summary: 'version bump check failed:',
      errors: [
        'cannot compare package versions with current main: neither origin/main nor main was found. Fetch the default branch (git fetch origin main) so the release gate can compare against the current main tip.',
      ],
    });
    expect(currentMainReads).toBe(0);
  });
});
