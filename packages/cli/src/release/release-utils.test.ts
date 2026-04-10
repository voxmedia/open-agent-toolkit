import { describe, expect, it } from 'vitest';

import { findChangedWorkspaceDirsFromPaths } from '../../../../tools/release/release-utils';
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
});
