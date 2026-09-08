import { chmod, mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { ProviderScopeContext } from '@providers/shared/registry';
import { describe, expect, it } from 'vitest';

import {
  resolveProviderScopeContexts,
  resolveScopeProviderContext,
  resolveScopeProviderContextOutcome,
  type ProviderContextDependencies,
} from './provider-context';

/**
 * Real scope roots. The distinction under test is "sync config absent" versus
 * "sync config present but unreadable", and the only honest source for that is
 * the real `loadSyncConfig` against a real file: a double would encode the same
 * assumption the code makes.
 */
async function scopeRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'oat-provider-context-'));
  await mkdir(join(root, '.oat', 'sync'), { recursive: true });
  return root;
}

function configPath(root: string): string {
  return join(root, '.oat', 'sync', 'config.json');
}

/**
 * Only the registry resolution is stubbed. `loadSyncConfig` stays real so the
 * `ENOENT`-is-not-a-failure contract is proven rather than assumed.
 */
const stubResolve: ProviderContextDependencies = {
  resolveProviderScopeContext: async ({ scope, scopeRoot: root }) =>
    ({
      scope,
      configSource: join(root, '.oat', 'sync', 'config.json'),
      activeProviders: [],
      detectedProviders: [],
      mismatches: { detectedUnset: [], detectedDisabled: [] },
      activation: [],
      registrations: [],
    }) as ProviderScopeContext,
};

describe('resolveScopeProviderContextOutcome', () => {
  it('resolves when no sync config is present at all', async () => {
    // The accepted control for the failure cases below: `loadSyncConfig`
    // answers ENOENT with the defaults, so an absent config is a legitimately
    // empty result and must never be reported as a failure.
    const root = await scopeRoot();

    await expect(
      resolveScopeProviderContextOutcome({
        scope: 'project',
        scopeRoot: root,
        dependencies: stubResolve,
      }),
    ).resolves.toMatchObject({ status: 'resolved' });
  });

  it('resolves a valid sync config', async () => {
    const root = await scopeRoot();
    await writeFile(
      configPath(root),
      JSON.stringify({ version: 1, defaultStrategy: 'auto' }),
      'utf8',
    );

    await expect(
      resolveScopeProviderContextOutcome({
        scope: 'user',
        scopeRoot: root,
        dependencies: stubResolve,
      }),
    ).resolves.toMatchObject({ status: 'resolved' });
  });

  for (const scope of ['project', 'user'] as const) {
    it(`fails, keeping the error, when the ${scope}-scope sync config is invalid JSON`, async () => {
      const root = await scopeRoot();
      await writeFile(configPath(root), '{', 'utf8');

      const outcome = await resolveScopeProviderContextOutcome({
        scope,
        scopeRoot: root,
        dependencies: stubResolve,
      });

      expect(outcome.status).toBe('failed');
      expect(
        outcome.status === 'failed' && outcome.error instanceof Error
          ? outcome.error.message
          : '',
      ).toContain('is not valid JSON');
    });

    it(`fails, keeping the error, when the ${scope}-scope sync config is a directory`, async () => {
      const root = await scopeRoot();
      await mkdir(configPath(root), { recursive: true });

      const outcome = await resolveScopeProviderContextOutcome({
        scope,
        scopeRoot: root,
        dependencies: stubResolve,
      });

      expect(outcome.status).toBe('failed');
      expect(
        outcome.status === 'failed' && outcome.error instanceof Error
          ? outcome.error.message
          : '',
      ).toContain('Unable to load sync config');
    });

    it(`fails, keeping the error, when the ${scope}-scope sync config is unreadable`, async () => {
      // `chmod 000` is not a permission barrier for root, so the real EACCES
      // shape is only assertable as a non-root user. The invalid-JSON and
      // directory cases above cover the same branch without that dependency.
      if (process.getuid?.() === 0) return;
      const root = await scopeRoot();
      await writeFile(
        configPath(root),
        JSON.stringify({ version: 1, defaultStrategy: 'auto' }),
        'utf8',
      );
      await chmod(configPath(root), 0o000);

      const outcome = await resolveScopeProviderContextOutcome({
        scope,
        scopeRoot: root,
        dependencies: stubResolve,
      });

      await chmod(configPath(root), 0o644);
      expect(outcome.status).toBe('failed');
      expect(
        outcome.status === 'failed' && outcome.error instanceof Error
          ? outcome.error.message
          : '',
      ).toContain('EACCES');
    });
  }

  it('fails when the registry resolution itself throws', async () => {
    const root = await scopeRoot();

    const outcome = await resolveScopeProviderContextOutcome({
      scope: 'project',
      scopeRoot: root,
      dependencies: {
        resolveProviderScopeContext: async () => {
          throw new Error('registry exploded');
        },
      },
    });

    expect(outcome).toMatchObject({ status: 'failed' });
  });
});

describe('resolveScopeProviderContext (existing null contract)', () => {
  /**
   * The outcome API is additive. Every existing consumer — `init tools`,
   * `tools remove`, `tools update`, and the pack surface behind `tools
   * list`/`info` — reads reachability as optional evidence and must keep
   * seeing exactly `null` for a failure, so surfacing the error to the
   * diagnostic cannot start failing an install that already succeeded.
   */
  it('still collapses every failure shape to null', async () => {
    const invalid = await scopeRoot();
    await writeFile(configPath(invalid), '{', 'utf8');
    const isDir = await scopeRoot();
    await mkdir(configPath(isDir), { recursive: true });

    await expect(
      resolveScopeProviderContext({
        scope: 'project',
        scopeRoot: invalid,
        dependencies: stubResolve,
      }),
    ).resolves.toBeNull();
    await expect(
      resolveScopeProviderContext({
        scope: 'user',
        scopeRoot: isDir,
        dependencies: stubResolve,
      }),
    ).resolves.toBeNull();
    // A registry failure has to be reached to be pinned: a scope root whose
    // config is already broken fails in `loadSyncConfig` and never calls the
    // stub, so this case uses a root with no config at all.
    const registryOnly = await scopeRoot();
    let registryCalled = false;
    await expect(
      resolveScopeProviderContext({
        scope: 'project',
        scopeRoot: registryOnly,
        dependencies: {
          resolveProviderScopeContext: async () => {
            registryCalled = true;
            throw new Error('registry exploded');
          },
        },
      }),
    ).resolves.toBeNull();
    expect(registryCalled).toBe(true);
  });

  it('still returns a context when the config is absent or valid', async () => {
    const absent = await scopeRoot();

    await expect(
      resolveScopeProviderContext({
        scope: 'project',
        scopeRoot: absent,
        dependencies: stubResolve,
      }),
    ).resolves.toMatchObject({ scope: 'project' });
  });

  it('still drops only the failing scope from the multi-scope resolution', async () => {
    const broken = await scopeRoot();
    await writeFile(configPath(broken), '{', 'utf8');
    const healthy = await scopeRoot();

    const contexts = await resolveProviderScopeContexts({
      scopeRoots: { project: broken, user: healthy },
      dependencies: stubResolve,
    });

    expect(contexts.map(({ scope }) => scope)).toEqual(['user']);
  });
});
