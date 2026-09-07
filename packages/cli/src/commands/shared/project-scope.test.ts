import { mkdtemp, mkdir, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { isAbsolute, join } from 'node:path';

import { CliError } from '@errors/cli-error';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  canonicalizePath,
  completedSyncedRefName,
  isSyncedCheckout,
  resolveDefaultScope,
  resolveProjectScope,
  resolveProjectsParent,
  resolveScopeRoot,
  syncedRecordPath,
  syncedRefName,
} from './project-scope';

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(
    tempDirs
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe('project scope paths', () => {
  it('normalizes non-missing canonical path failures into path-specific CLI errors', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-project-scope-'));
    tempDirs.push(root);
    const file = join(root, 'file');
    await writeFile(file, 'not a directory\n', 'utf8');
    const nonDirectoryPath = join(file, 'child');

    expect(() => canonicalizePath(nonDirectoryPath)).toThrowError(
      expect.objectContaining({
        name: 'CliError',
        exitCode: 2,
        message: expect.stringContaining(nonDirectoryPath),
      }),
    );

    const loop = join(root, 'loop');
    await symlink(loop, loop);
    expect(() => canonicalizePath(loop)).toThrowError(
      expect.objectContaining({
        name: 'CliError',
        exitCode: 2,
        message: expect.stringContaining(loop),
      }),
    );
  });

  it('resolves sibling scope roots from relative and absolute projects roots', () => {
    const repoRoot = '/repo';

    expect(resolveProjectsParent(repoRoot, '.oat/projects/shared')).toBe(
      '/repo/.oat/projects',
    );
    expect(resolveScopeRoot(repoRoot, '.oat/projects/shared', 'synced')).toBe(
      '/repo/.oat/projects/synced',
    );
    expect(resolveScopeRoot(repoRoot, '.oat/projects/shared', 'local')).toBe(
      '/repo/.oat/projects/local',
    );
    expect(resolveScopeRoot(repoRoot, '.oat/projects/shared', 'shared')).toBe(
      '/repo/.oat/projects/shared',
    );

    const absoluteRoot = '/var/oat/projects/shared';
    expect(isAbsolute(absoluteRoot)).toBe(true);
    expect(resolveScopeRoot(repoRoot, absoluteRoot, 'synced')).toBe(
      canonicalizePath('/var/oat/projects/synced'),
    );

    const customRoot = '/var/oat/team-projects';
    expect(resolveScopeRoot(repoRoot, customRoot, 'shared')).toBe(
      canonicalizePath(customRoot),
    );
    expect(resolveScopeRoot(repoRoot, customRoot, 'local')).toBe(
      canonicalizePath('/var/oat/local'),
    );
    expect(resolveScopeRoot(repoRoot, customRoot, 'synced')).toBe(
      canonicalizePath('/var/oat/synced'),
    );
  });

  it('treats a custom configured root as the authoritative shared root', () => {
    const configuredRoot = '.oat/team-projects';

    expect(
      resolveProjectScope(
        '/repo/.oat/team-projects/example',
        configuredRoot,
        '/repo',
      ),
    ).toBe('shared');
    expect(
      resolveProjectScope('/repo/.oat/local/example', configuredRoot, '/repo'),
    ).toBe('local');
    expect(
      resolveProjectScope('/repo/.oat/synced/example', configuredRoot, '/repo'),
    ).toBe('synced');

    const absoluteRoot = '/var/oat/team-projects';
    expect(
      resolveProjectScope(
        '/var/oat/team-projects/example',
        absoluteRoot,
        '/repo',
      ),
    ).toBe('shared');
    expect(
      resolveProjectScope('/var/oat/local/example', absoluteRoot, '/repo'),
    ).toBe('local');
    expect(
      resolveProjectScope('/var/oat/synced/example', absoluteRoot, '/repo'),
    ).toBe('synced');
  });

  it('derives known scopes from project paths only', () => {
    const repoRoot = '/repo';
    const configuredRoot = '.oat/projects/shared';

    expect(
      resolveProjectScope(
        join(repoRoot, '.oat/projects/synced/example'),
        configuredRoot,
        repoRoot,
      ),
    ).toBe('synced');
    expect(
      resolveProjectScope(
        join(repoRoot, '.oat/projects/shared/example'),
        configuredRoot,
        repoRoot,
      ),
    ).toBe('shared');
    expect(
      resolveProjectScope(
        join(repoRoot, '.oat/projects/local/example'),
        configuredRoot,
        repoRoot,
      ),
    ).toBe('local');
    expect(
      resolveProjectScope(
        join(repoRoot, '.oat/projects/archived/example'),
        configuredRoot,
        repoRoot,
      ),
    ).toBeNull();
    expect(
      resolveProjectScope('/unrelated/example', configuredRoot, repoRoot),
    ).toBeNull();
  });

  it('resolves sibling scopes for a single-segment relative root from repo context', () => {
    const configuredRoot = 'projects';

    expect(
      resolveProjectScope('/repo/projects/example', configuredRoot, '/repo'),
    ).toBe('shared');
    expect(
      resolveProjectScope('/repo/local/example', configuredRoot, '/repo'),
    ).toBe('local');
    expect(
      resolveProjectScope('/repo/synced/example', configuredRoot, '/repo'),
    ).toBe('synced');
    expect(resolveProjectScope('local/example', configuredRoot, '/repo')).toBe(
      'local',
    );
    expect(resolveProjectScope('synced/example', configuredRoot, '/repo')).toBe(
      'synced',
    );
  });

  it('ignores incidental local and synced segments outside configured roots', () => {
    expect(
      resolveProjectScope(
        '/var/local/repo/team-projects/example',
        '/var/local/repo/team-projects',
        '/repo',
      ),
    ).toBe('shared');
    expect(
      resolveProjectScope(
        '/var/synced/unrelated/example',
        '/var/local/repo/team-projects',
        '/repo',
      ),
    ).toBeNull();
    expect(
      resolveProjectScope(
        'workspace/local/incidental/example',
        '.oat/team-projects',
        '/repo',
      ),
    ).toBeNull();
    expect(
      resolveProjectScope(
        'workspace/synced/incidental/example',
        '.oat/team-projects',
        '/repo',
      ),
    ).toBeNull();
  });

  it('builds validated ref and record paths', () => {
    expect(syncedRefName('my-slug')).toBe('refs/oat/projects/my-slug');
    expect(completedSyncedRefName('my-slug')).toBe(
      'refs/oat/completed/my-slug',
    );
    expect(syncedRecordPath('/repo/.oat/projects/synced', 'my-slug')).toBe(
      '/repo/.oat/projects/synced/my-slug.json',
    );

    for (const slug of ['-leading', '../escape', 'has space', '']) {
      expect(() => syncedRefName(slug)).toThrow(CliError);
      expect(() => completedSyncedRefName(slug)).toThrow(CliError);
    }
  });
});

describe('isSyncedCheckout', () => {
  it('is true only when .git is a file', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-project-scope-'));
    tempDirs.push(root);
    const fileCheckout = join(root, 'file');
    const directoryCheckout = join(root, 'directory');
    const absentCheckout = join(root, 'absent');
    await mkdir(fileCheckout);
    await mkdir(join(directoryCheckout, '.git'), { recursive: true });
    await mkdir(absentCheckout);
    await writeFile(join(fileCheckout, '.git'), 'gitdir: elsewhere\n');

    await expect(isSyncedCheckout(fileCheckout)).resolves.toBe(true);
    await expect(isSyncedCheckout(directoryCheckout)).resolves.toBe(false);
    await expect(isSyncedCheckout(absentCheckout)).resolves.toBe(false);
  });
});

describe('resolveDefaultScope', () => {
  it('defaults to synced when configuration is absent', async () => {
    const resolveEffectiveConfig = vi.fn(async () => ({ resolved: {} }));

    await expect(
      resolveDefaultScope('/repo', {}, { resolveEffectiveConfig }),
    ).resolves.toBe('synced');
  });

  it('honors effective config and the environment override', async () => {
    const resolveEffectiveConfig = vi.fn(async () => ({
      resolved: {
        'projects.defaultScope': { value: 'local', source: 'shared' },
      },
    }));

    await expect(
      resolveDefaultScope('/repo', {}, { resolveEffectiveConfig }),
    ).resolves.toBe('local');
    await expect(
      resolveDefaultScope(
        '/repo',
        { OAT_PROJECTS_DEFAULT_SCOPE: 'shared' },
        { resolveEffectiveConfig },
      ),
    ).resolves.toBe('shared');
  });
});
