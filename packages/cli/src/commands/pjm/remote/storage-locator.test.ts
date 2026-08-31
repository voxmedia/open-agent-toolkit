import { describe, expect, it } from 'vitest';

import { resolveRemoteStorageLocations } from './storage-locator';

const base = {
  repoRoot: '/work/repo',
  gitCommonDir: '/work/repo/.git',
  repositoryIdentity: 'https://github.com/voxmedia/open-agent-toolkit.git',
  stateStorage: 'local' as const,
};

describe('resolveRemoteStorageLocations', () => {
  it('stores shared backlog metadata in the repository PJM surface', () => {
    const result = resolveRemoteStorageLocations({
      ...base,
      target: { kind: 'backlog', scope: 'shared', path: null },
    });

    expect(result.portable).toEqual({
      storageClass: 'shared',
      bindingsDir: '/work/repo/.oat/repo/pjm/remote/bindings',
    });
    expect(result.operational.root).toBe(
      `/work/repo/.git/oat/pjm-remote/${result.repositoryFingerprint}`,
    );
  });

  it.each(['shared', 'synced'] as const)(
    'stores %s project metadata beside its project artifacts',
    (scope) => {
      const result = resolveRemoteStorageLocations({
        ...base,
        target: {
          kind: 'project',
          scope,
          path: `/work/repo/.oat/projects/${scope}/demo`,
        },
      });

      expect(result.portable).toEqual({
        storageClass: scope,
        bindingsDir: `/work/repo/.oat/projects/${scope}/demo/remote/bindings`,
      });
    },
  );

  it('keeps local project metadata in the common local store', () => {
    const result = resolveRemoteStorageLocations({
      ...base,
      target: {
        kind: 'project',
        scope: 'local',
        path: '/work/repo/.oat/projects/local/demo',
      },
    });

    expect(result.portable.storageClass).toBe('local');
    expect(result.portable.bindingsDir).toBe(
      `${result.operational.root}/metadata/bindings`,
    );
  });

  it('uses shared operational storage only after explicit opt-in', () => {
    const result = resolveRemoteStorageLocations({
      ...base,
      stateStorage: 'shared',
      target: {
        kind: 'project',
        scope: 'synced',
        path: '/work/repo/.oat/projects/synced/demo',
      },
    });

    expect(result.operational).toMatchObject({
      storageClass: 'shared',
      root: '/work/repo/.oat/projects/synced/demo/remote/state',
      bindingsDir: '/work/repo/.oat/projects/synced/demo/remote/state/bindings',
    });
  });

  it('rejects shared operational storage for local projects', () => {
    expect(() =>
      resolveRemoteStorageLocations({
        ...base,
        stateStorage: 'shared',
        target: {
          kind: 'project',
          scope: 'local',
          path: '/work/repo/.oat/projects/local/demo',
        },
      }),
    ).toThrow(/local projects.*shared operational storage/i);
  });

  it('reuses common-Git-dir state across worktrees', () => {
    const main = resolveRemoteStorageLocations({
      ...base,
      target: { kind: 'backlog', scope: 'shared', path: null },
    });
    const worktree = resolveRemoteStorageLocations({
      ...base,
      repoRoot: '/work/repo-worktree',
      gitCommonDir: '/work/repo/.git',
      target: { kind: 'backlog', scope: 'shared', path: null },
    });

    expect(worktree.repositoryFingerprint).toBe(main.repositoryFingerprint);
    expect(worktree.operational.root).toBe(main.operational.root);
  });

  it('keeps a new clone local while retaining the stable repository fingerprint', () => {
    const first = resolveRemoteStorageLocations({
      ...base,
      target: { kind: 'backlog', scope: 'shared', path: null },
    });
    const clone = resolveRemoteStorageLocations({
      ...base,
      repoRoot: '/other/clone',
      gitCommonDir: '/other/clone/.git',
      target: { kind: 'backlog', scope: 'shared', path: null },
    });

    expect(clone.repositoryFingerprint).toBe(first.repositoryFingerprint);
    expect(clone.operational.root).not.toBe(first.operational.root);
  });
});
