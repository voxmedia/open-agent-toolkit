import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { isAbsolute, join } from 'node:path';

import { CliError } from '@errors/cli-error';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  canonicalizePath,
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
      resolveProjectScope('/repo/.oat/team-projects/example', configuredRoot),
    ).toBe('shared');
    expect(
      resolveProjectScope('/repo/.oat/local/example', configuredRoot),
    ).toBe('local');
    expect(
      resolveProjectScope('/repo/.oat/synced/example', configuredRoot),
    ).toBe('synced');

    const absoluteRoot = '/var/oat/team-projects';
    expect(
      resolveProjectScope('/var/oat/team-projects/example', absoluteRoot),
    ).toBe('shared');
    expect(resolveProjectScope('/var/oat/local/example', absoluteRoot)).toBe(
      'local',
    );
    expect(resolveProjectScope('/var/oat/synced/example', absoluteRoot)).toBe(
      'synced',
    );
  });

  it('derives known scopes from project paths only', () => {
    const repoRoot = '/repo';
    const configuredRoot = '.oat/projects/shared';

    expect(
      resolveProjectScope(
        join(repoRoot, '.oat/projects/synced/example'),
        configuredRoot,
      ),
    ).toBe('synced');
    expect(
      resolveProjectScope(
        join(repoRoot, '.oat/projects/shared/example'),
        configuredRoot,
      ),
    ).toBe('shared');
    expect(
      resolveProjectScope(
        join(repoRoot, '.oat/projects/local/example'),
        configuredRoot,
      ),
    ).toBe('local');
    expect(
      resolveProjectScope(
        join(repoRoot, '.oat/projects/archived/example'),
        configuredRoot,
      ),
    ).toBeNull();
    expect(
      resolveProjectScope('/unrelated/example', configuredRoot),
    ).toBeNull();
  });

  it('does not vacuously match sibling scopes for a single-segment relative root', () => {
    const configuredRoot = 'projects';

    expect(resolveProjectScope('/repo/projects/example', configuredRoot)).toBe(
      'shared',
    );
    expect(
      resolveProjectScope('/repo/local/example', configuredRoot),
    ).toBeNull();
    expect(
      resolveProjectScope('/repo/synced/example', configuredRoot),
    ).toBeNull();
    expect(resolveProjectScope('local/example', configuredRoot)).toBeNull();
    expect(resolveProjectScope('synced/example', configuredRoot)).toBeNull();
  });

  it('ignores incidental local and synced segments outside configured roots', () => {
    expect(
      resolveProjectScope(
        '/var/local/repo/team-projects/example',
        '/var/local/repo/team-projects',
      ),
    ).toBe('shared');
    expect(
      resolveProjectScope(
        '/var/synced/unrelated/example',
        '/var/local/repo/team-projects',
      ),
    ).toBeNull();
    expect(
      resolveProjectScope(
        'workspace/local/incidental/example',
        '.oat/team-projects',
      ),
    ).toBeNull();
    expect(
      resolveProjectScope(
        'workspace/synced/incidental/example',
        '.oat/team-projects',
      ),
    ).toBeNull();
  });

  it('builds validated ref and record paths', () => {
    expect(syncedRefName('my-slug')).toBe('refs/oat/projects/my-slug');
    expect(syncedRecordPath('/repo/.oat/projects/synced', 'my-slug')).toBe(
      '/repo/.oat/projects/synced/my-slug.json',
    );

    for (const slug of ['-leading', '../escape', 'has space', '']) {
      expect(() => syncedRefName(slug)).toThrow(CliError);
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
