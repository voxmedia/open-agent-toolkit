import { describe, expect, it } from 'vitest';

import {
  compareStableVersions,
  findChangedWorkspaceDirsFromPaths,
  findVersionPolicyDependencyRootsByWorkspaceDir,
  parseStableVersion,
  resolveCurrentMainRef,
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

  it('tracks shared public package changes for dependents and the package itself', () => {
    expect(
      findChangedWorkspaceDirsFromPaths(
        ['packages/control-plane/src/index.ts'],
        getPublicPackageContracts(),
        new Map([['packages/cli', ['packages/control-plane']]]),
      ),
    ).toEqual(new Set(['packages/cli', 'packages/control-plane']));
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

describe('resolveCurrentMainRef', () => {
  it('prefers origin/main when the remote tracking ref exists', async () => {
    const probedRefs: string[] = [];

    await expect(
      resolveCurrentMainRef(async (ref) => {
        probedRefs.push(ref);
        return ref === 'origin/main';
      }),
    ).resolves.toBe('origin/main');
    expect(probedRefs).toEqual(['origin/main']);
  });

  it('falls back to local main outside CI checkouts', async () => {
    await expect(
      resolveCurrentMainRef(async (ref) => ref === 'main'),
    ).resolves.toBe('main');
  });

  it('fails closed with null when no current main ref is available', async () => {
    await expect(resolveCurrentMainRef(async () => false)).resolves.toBeNull();
  });
});

describe('parseStableVersion', () => {
  it('parses stable numeric versions', () => {
    expect(parseStableVersion('0.2.32')).toEqual({
      major: 0,
      minor: 2,
      patch: 32,
    });
    expect(parseStableVersion('10.0.1')).toEqual({
      major: 10,
      minor: 0,
      patch: 1,
    });
  });

  it('rejects surrounding whitespace so only exact values are accepted', () => {
    expect(parseStableVersion(' 0.2.32 ')).toBeNull();
    expect(parseStableVersion('0.2.32\n')).toBeNull();
  });

  it.each([
    ['prerelease identifiers', '0.2.32-rc.1'],
    ['build metadata', '0.2.32+build.5'],
    ['v prefixes', 'v0.2.32'],
    ['partial versions', '0.2'],
    ['extra segments', '0.2.32.1'],
    ['leading zeroes', '0.02.32'],
    ['non-numeric segments', '0.2.x'],
    ['empty strings', ''],
  ])('rejects %s rather than mapping them to 0.0.0', (_label, version) => {
    expect(parseStableVersion(version)).toBeNull();
  });

  it('rejects missing evidence', () => {
    expect(parseStableVersion(null)).toBeNull();
    expect(parseStableVersion(undefined)).toBeNull();
  });

  it('rejects segments beyond the safe integer range', () => {
    expect(parseStableVersion('1.2.99999999999999999999')).toBeNull();
  });
});

describe('compareStableVersions', () => {
  it('orders versions by major, then minor, then patch', () => {
    expect(compareStableVersions('0.2.33', '0.2.32')).toBeGreaterThan(0);
    expect(compareStableVersions('0.3.0', '0.2.99')).toBeGreaterThan(0);
    expect(compareStableVersions('1.0.0', '0.99.99')).toBeGreaterThan(0);
    expect(compareStableVersions('0.2.29', '0.2.30')).toBeLessThan(0);
    expect(compareStableVersions('0.2.32', '0.2.32')).toBe(0);
  });

  it('compares numerically rather than lexicographically', () => {
    expect(compareStableVersions('0.2.9', '0.2.10')).toBeLessThan(0);
  });

  it('returns null when either side is missing or malformed', () => {
    expect(compareStableVersions('0.2.32', null)).toBeNull();
    expect(compareStableVersions(null, '0.2.32')).toBeNull();
    expect(compareStableVersions('0.2.32-rc.1', '0.2.32')).toBeNull();
    expect(compareStableVersions('0.2.32', '')).toBeNull();
  });
});
