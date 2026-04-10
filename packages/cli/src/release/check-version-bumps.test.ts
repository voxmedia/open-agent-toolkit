import { describe, expect, it } from 'vitest';

import { runVersionBumpCheck } from '../../../../tools/release/check-version-bumps';
import { getPublicPackageContracts } from './public-package-contract';

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

    await expect(
      runVersionBumpCheck({
        contracts,
        resolveMergeBaseFn: async () => 'origin/main',
        findChangedWorkspaceDirsFn: async () => new Set<string>(),
      }),
    ).resolves.toEqual({
      status: 'passed',
      summary: 'no public package changes — version bump check passed',
      errors: [],
    });
  });

  it('fails when changed public packages keep their base versions', async () => {
    const contracts = getPublicPackageContracts();

    const result = await runVersionBumpCheck({
      contracts,
      resolveMergeBaseFn: async () => 'origin/main',
      findChangedWorkspaceDirsFn: async () => new Set(['packages/cli']),
      readCurrentPackageJsonFn: async () => ({ version: '0.0.4' }),
      readBasePackageJsonFn: async () => ({ version: '0.0.4' }),
    });

    expect(result).toEqual({
      status: 'failed',
      summary: 'version bump check failed:',
      errors: [
        'publishable package changes require a lockstep version bump across all public packages. Changed packages: @open-agent-toolkit/cli. Packages still at their base version: @open-agent-toolkit/cli@0.0.4, @open-agent-toolkit/control-plane@0.0.4, @open-agent-toolkit/docs-config@0.0.4, @open-agent-toolkit/docs-theme@0.0.4, @open-agent-toolkit/docs-transforms@0.0.4',
      ],
    });
  });
});
