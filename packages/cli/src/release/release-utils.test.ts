import { describe, expect, it } from 'vitest';

import {
  findChangedWorkspaceDirsFromPaths,
  findVersionPolicyDependencyRootsByWorkspaceDir,
} from '../../../../tools/release/release-utils';
import { getPublicPackageContracts } from './public-package-contract';

describe('findChangedWorkspaceDirsFromPaths', () => {
  it('maps canonical CLI asset sources back to the CLI package', () => {
    expect(
      findChangedWorkspaceDirsFromPaths(
        [
          '.agents/skills/oat-project-document/SKILL.md',
          '.oat/templates/state.md',
          'apps/oat-docs/docs/index.mdx',
        ],
        getPublicPackageContracts(),
      ),
    ).toEqual(new Set(['packages/cli']));
  });

  it('ignores generated bundled assets for version policy diffing', () => {
    expect(
      findChangedWorkspaceDirsFromPaths(
        [
          'packages/cli/assets/public-package-versions.json',
          'packages/cli/assets/skills/oat-project-document/SKILL.md',
        ],
        getPublicPackageContracts(),
      ),
    ).toEqual(new Set());
  });

  it('still tracks direct workspace changes for public packages', () => {
    expect(
      findChangedWorkspaceDirsFromPaths(
        ['packages/cli/src/index.ts', 'packages/docs-theme/src/index.ts'],
        getPublicPackageContracts(),
      ),
    ).toEqual(new Set(['packages/cli', 'packages/docs-theme']));
  });

  it('tracks internal workspace dependency changes for dependent public packages', () => {
    expect(
      findChangedWorkspaceDirsFromPaths(
        ['packages/control-plane/src/index.ts'],
        getPublicPackageContracts(),
        new Map([['packages/cli', ['packages/control-plane']]]),
      ),
    ).toEqual(new Set(['packages/cli']));
  });

  it('marks all affected public packages when a shared dependency changes', () => {
    expect(
      findChangedWorkspaceDirsFromPaths(
        ['packages/docs-transforms/src/index.ts'],
        getPublicPackageContracts(),
        new Map([['packages/docs-config', ['packages/docs-transforms']]]),
      ),
    ).toEqual(new Set(['packages/docs-config', 'packages/docs-transforms']));
  });
});

describe('findVersionPolicyDependencyRootsByWorkspaceDir', () => {
  it('derives release-impacting workspace dependencies from package manifests', async () => {
    const dependencyRoots =
      await findVersionPolicyDependencyRootsByWorkspaceDir(
        getPublicPackageContracts(),
      );

    expect(dependencyRoots.get('packages/cli')).toEqual([
      'packages/control-plane',
    ]);
    expect(dependencyRoots.get('packages/docs-config')).toEqual([
      'packages/docs-transforms',
    ]);
    expect(dependencyRoots.get('packages/docs-theme')).toEqual([]);
    expect(dependencyRoots.get('packages/docs-transforms')).toEqual([]);
  });
});
