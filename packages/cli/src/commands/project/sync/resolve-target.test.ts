import { describe, expect, it } from 'vitest';

import { resolveSyncedTarget } from './resolve-target';

function deps(
  options: {
    activeProject?: string;
    existing?: string[];
    record?: boolean;
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
    readSyncedRecord: async () =>
      options.record
        ? {
            schemaVersion: 1 as const,
            slug: 'demo',
            scope: 'synced' as const,
            ref: 'refs/oat/projects/demo',
            remote: 'origin' as const,
            status: 'active' as const,
            createdAt: '2026-08-27T00:00:00.000Z',
            completedAt: null,
          }
        : null,
    gitRunner: {
      run: async () => ({ code: 2, stdout: '', stderr: '' }),
    },
  };
}

describe('resolveSyncedTarget', () => {
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

  it('allows an absent checkout when a record exists', async () => {
    await expect(
      resolveSyncedTarget(
        { repoRoot: '/repo', env: {} },
        'demo',
        deps({ record: true }),
        { allowMissingCheckout: true },
      ),
    ).resolves.toMatchObject({ slug: 'demo' });
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
});
