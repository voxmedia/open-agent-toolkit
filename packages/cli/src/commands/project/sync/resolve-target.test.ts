import { mkdir, mkdtemp, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { createSyncedFixture } from '@shared/../__tests__/synced-fixture';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { defaultGitRunner } from './git';
import { buildSyncTarget, createSyncedProject } from './ref-sync';
import { resolveSyncedTarget } from './resolve-target';

function deps(
  options: {
    activeProject?: string;
    existing?: string[];
    record?: boolean;
    recordPending?: boolean;
  } = {},
) {
  return {
    resolveProjectsRoot: async () => '.oat/projects/shared',
    readOatLocalConfig: async () => ({
      version: 1,
      activeProject: options.activeProject,
    }),
    pathExists: async (path: string) =>
      (options.existing ?? []).some((suffix) => path.endsWith(suffix)),
    realpath: async (path: string) => path,
    classifyAdoptionRecord: async () =>
      options.record
        ? options.recordPending
          ? ('pending' as const)
          : ('durable' as const)
        : ('create' as const),
    gitRunner: {
      run: async (args: string[]) =>
        args[0] === 'status'
          ? {
              code: 0,
              stdout: options.recordPending
                ? '?? .oat/projects/synced/demo.json'
                : '',
              stderr: '',
            }
          : { code: 2, stdout: '', stderr: '' },
    },
  };
}

describe('resolveSyncedTarget', () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(
      tempDirs.map((dir) => rm(dir, { recursive: true, force: true })),
    );
    tempDirs.length = 0;
  });

  it('resolves a bare slug under the synced root', async () => {
    const target = await resolveSyncedTarget(
      { repoRoot: '/repo', env: {} },
      'demo',
      deps({ existing: ['/synced/demo'] }),
    );
    expect(target).toMatchObject({
      slug: 'demo',
      projectPath: '/repo/.oat/projects/synced/demo',
      ref: 'refs/oat/projects/demo',
    });
  });

  it('resolves explicit and active synced paths', async () => {
    const injected = deps({
      activeProject: '.oat/projects/synced/demo',
      existing: ['/synced/demo'],
    });
    await expect(
      resolveSyncedTarget(
        { repoRoot: '/repo', env: {} },
        '.oat/projects/synced/demo',
        injected,
      ),
    ).resolves.toMatchObject({ slug: 'demo' });
    await expect(
      resolveSyncedTarget({ repoRoot: '/repo', env: {} }, undefined, injected),
    ).resolves.toMatchObject({ slug: 'demo' });
  });

  it.each(['relative', 'absolute'] as const)(
    'rejects a %s descendant before reading the matching sibling checkout or record',
    async (kind) => {
      const repoRoot = await mkdtemp(join(tmpdir(), 'oat-resolve-target-'));
      tempDirs.push(repoRoot);
      const syncedRoot = join(repoRoot, '.oat/projects/synced');
      await mkdir(join(syncedRoot, 'demo', 'reviews'), { recursive: true });
      await mkdir(join(syncedRoot, 'reviews'), { recursive: true });
      const pathExists = vi.fn(async () => true);
      const classifyAdoptionRecord = vi.fn(async () => 'durable' as const);
      const requested =
        kind === 'absolute'
          ? join(syncedRoot, 'demo', 'reviews')
          : '.oat/projects/synced/demo/reviews';

      await expect(
        resolveSyncedTarget({ repoRoot, env: {} }, requested, {
          ...deps(),
          pathExists,
          classifyAdoptionRecord,
        }),
      ).rejects.toMatchObject({
        message: expect.stringContaining('exactly one direct child'),
        exitCode: 1,
      });
      expect(pathExists).not.toHaveBeenCalled();
      expect(classifyAdoptionRecord).not.toHaveBeenCalled();
    },
  );

  it.each([
    ['explicit path', '.oat/projects/synced/demo'],
    ['bare slug', 'demo'],
  ] as const)(
    'rejects a real-worktree sibling symlink selected by %s',
    async (_kind, requested) => {
      const fixture = await createSyncedFixture();
      try {
        const sibling = buildSyncTarget(
          fixture.cloneA,
          '.oat/projects/shared',
          'reviews',
        );
        await createSyncedProject(sibling, defaultGitRunner);
        await symlink(
          sibling.projectPath,
          join(fixture.cloneA, '.oat/projects/synced/demo'),
          'dir',
        );

        await expect(
          resolveSyncedTarget({ repoRoot: fixture.cloneA, env: {} }, requested),
        ).rejects.toMatchObject({
          message: expect.stringContaining('canonical direct child'),
          exitCode: 1,
        });
      } finally {
        await fixture.cleanup();
      }
    },
  );

  it('allows an absent checkout when a record exists', async () => {
    const injected = deps({ record: true });
    injected.realpath = vi.fn(async (path: string) => path);
    await expect(
      resolveSyncedTarget({ repoRoot: '/repo', env: {} }, 'demo', injected, {
        allowMissingCheckout: true,
      }),
    ).resolves.toMatchObject({ slug: 'demo' });
    expect(injected.realpath).not.toHaveBeenCalled();
  });

  it('rejects non-synced paths and unknown slugs', async () => {
    await expect(
      resolveSyncedTarget(
        { repoRoot: '/repo', env: {} },
        '.oat/projects/shared/demo',
        deps({ existing: ['/shared/demo'] }),
      ),
    ).rejects.toThrow('shared scope');
    await expect(
      resolveSyncedTarget({ repoRoot: '/repo', env: {} }, 'missing', deps()),
    ).rejects.toThrow('No synced project named missing locally or on origin');
  });

  it('marks an origin-only ref for adoption', async () => {
    const injected = deps();
    injected.gitRunner = {
      run: async () => ({
        code: 0,
        stdout:
          '1234567890123456789012345678901234567890\trefs/oat/projects/demo',
        stderr: '',
      }),
    };
    await expect(
      resolveSyncedTarget({ repoRoot: '/repo', env: {} }, 'demo', injected, {
        allowMissingCheckout: true,
      }),
    ).resolves.toMatchObject({ slug: 'demo', adopt: true });
  });

  it('treats only an empty exit-2 ls-remote result as a missing ref', async () => {
    await expect(
      resolveSyncedTarget({ repoRoot: '/repo', env: {} }, 'missing', deps(), {
        allowMissingCheckout: true,
      }),
    ).rejects.toMatchObject({
      message: 'No synced project named missing locally or on origin.',
      exitCode: 1,
    });
  });

  it.each([
    { code: 128, stderr: 'fatal: unable to access origin: DNS failure' },
    { code: 2, stderr: 'injected transport failure' },
  ])('preserves ls-remote diagnostics for $stderr', async (failure) => {
    const injected = deps();
    injected.gitRunner = {
      run: async () => ({ ...failure, stdout: '' }),
    };

    await expect(
      resolveSyncedTarget({ repoRoot: '/repo', env: {} }, 'demo', injected, {
        allowMissingCheckout: true,
      }),
    ).rejects.toMatchObject({
      message: expect.stringContaining(failure.stderr),
      exitCode: 2,
    });
  });

  it('marks an existing checkout without a record for repair adoption', async () => {
    await expect(
      resolveSyncedTarget(
        { repoRoot: '/repo', env: {} },
        'demo',
        deps({ existing: ['/synced/demo'] }),
        { allowMissingCheckout: true },
      ),
    ).resolves.toMatchObject({ slug: 'demo', adopt: true });
  });

  it('classifies an existing uncommitted record as pending adoption durability', async () => {
    await expect(
      resolveSyncedTarget(
        { repoRoot: '/repo', env: {} },
        'demo',
        deps({
          existing: ['/synced/demo'],
          record: true,
          recordPending: true,
        }),
        { allowMissingCheckout: true },
      ),
    ).resolves.toMatchObject({
      slug: 'demo',
      adopt: true,
      adoptionRecord: 'pending',
    });
  });

  it('classifies a clean committed record as durable', async () => {
    await expect(
      resolveSyncedTarget(
        { repoRoot: '/repo', env: {} },
        'demo',
        deps({ existing: ['/synced/demo'], record: true }),
        { allowMissingCheckout: true },
      ),
    ).resolves.toMatchObject({
      slug: 'demo',
      adopt: false,
      adoptionRecord: 'durable',
    });
  });
});
