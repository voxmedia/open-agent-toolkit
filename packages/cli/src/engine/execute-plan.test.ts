import {
  lstat,
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  readlink,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';

import { copyDirectory, removeCollectionSymlinkIfUnchanged } from '@fs/io';
import { computeFileHash } from '@manifest/hash';
import {
  createEmptyManifest,
  loadManifest,
  saveManifest,
} from '@manifest/manager';
import type { ManifestV2 } from '@manifest/manifest.types';
import { OAT_VERSION } from '@shared/oat-version';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { proveCollectionIdentity } from './collection-sync';
import type {
  CollectionIdentityProof,
  RemovalSyncPlanEntry,
  SyncPlan,
  SyncPlanEntry,
} from './engine.types';
import { executeSyncPlan, inferScopeRoot } from './execute-plan';
import { OAT_DIRECTORY_SENTINEL, OAT_MARKER_PREFIX } from './markers';

const finalCollectionRemovalRace = vi.hoisted(() => ({
  afterIdentityRead: undefined as undefined | (() => Promise<void>),
}));

vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs/promises')>();
  return {
    ...actual,
    readlink: async (...args: Parameters<typeof actual.readlink>) => {
      const linkText = await actual.readlink(...args);
      const [linkPath] = args;
      if (
        finalCollectionRemovalRace.afterIdentityRead &&
        typeof linkPath === 'string' &&
        linkPath.endsWith('/.claude/skills')
      ) {
        const afterIdentityRead = finalCollectionRemovalRace.afterIdentityRead;
        finalCollectionRemovalRace.afterIdentityRead = undefined;
        await afterIdentityRead();
      }
      return linkText;
    },
  };
});

function createCanonicalEntry(
  root: string,
  type: 'skill' | 'agent' | 'rule',
  name: string,
) {
  const canonicalDir =
    type === 'skill' ? 'skills' : type === 'agent' ? 'agents' : 'rules';
  return {
    name,
    type,
    canonicalPath: join(root, '.agents', canonicalDir, name),
    isFile: type === 'rule',
  };
}

function createEntry(
  root: string,
  name: string,
  operation: SyncPlanEntry['operation'],
  strategy: SyncPlanEntry['strategy'] = operation.includes('copy')
    ? 'copy'
    : 'symlink',
): SyncPlanEntry {
  return {
    canonical: createCanonicalEntry(root, 'skill', name),
    provider: 'claude',
    providerPath: join(root, '.claude', 'skills', name),
    operation,
    strategy,
    reason: operation,
  };
}

function createRenderedRuleEntry(
  root: string,
  operation: SyncPlanEntry['operation'],
  renderedContent: string,
): SyncPlanEntry {
  return {
    canonical: createCanonicalEntry(root, 'rule', 'react-components.md'),
    provider: 'cursor',
    providerPath: join(root, '.cursor', 'rules', 'react-components.mdc'),
    operation,
    strategy: 'copy',
    reason: operation,
    renderedContent,
  };
}

function createRemovalEntry(root: string, name: string): RemovalSyncPlanEntry {
  return {
    ...createEntry(root, name, 'remove', 'symlink'),
    operation: 'remove',
  };
}

function createPlan(
  entries: SyncPlanEntry[],
  removals: RemovalSyncPlanEntry[] = [],
): SyncPlan {
  return {
    scope: 'project',
    entries,
    removals,
  };
}

async function seedCanonical(
  root: string,
  name: string,
  content = 'hello',
): Promise<void> {
  const canonicalFile = join(root, '.agents', 'skills', name, 'SKILL.md');
  await mkdir(join(root, '.agents', 'skills', name), { recursive: true });
  await writeFile(canonicalFile, content, 'utf8');
}

async function createTestCollectionLink(
  target: string,
  linkPath: string,
): Promise<{ linkText: string; device: string; inode: string }> {
  await mkdir(dirname(linkPath), { recursive: true });
  const linkText = relative(dirname(linkPath), target);
  await symlink(linkText, linkPath, 'dir');
  const created = await lstat(linkPath);
  return {
    linkText,
    device: String(created.dev),
    inode: String(created.ino),
  };
}

async function createCollectionPlan(
  root: string,
  action: 'create-collection-link' | 'adopt-collection-link',
): Promise<SyncPlan> {
  const canonicalDir = join(root, '.agents', 'skills');
  const providerDir = join(root, '.claude', 'skills');
  const proof = await proveCollectionIdentity({
    root,
    canonicalDir,
    providerDir,
  });
  return {
    scope: 'project',
    entries: [],
    removals: [],
    collections: [
      {
        provider: 'claude',
        scope: 'project',
        contentType: 'skill',
        canonicalDir,
        providerDir,
        action,
        ownership:
          action === 'create-collection-link' ? 'oat-created' : 'adopted-exact',
        configuredStrategy: 'auto',
        proof,
        inheritedEntries: ['.agents/skills/skill-one'],
        reason: action,
      },
    ],
  };
}

async function createOwnedCollectionTransition(root: string): Promise<{
  manifest: ManifestV2;
  plan: SyncPlan;
  providerDir: string;
}> {
  await seedCanonical(root, 'skill-one', 'canonical-before');
  const canonicalDir = join(root, '.agents', 'skills');
  const providerDir = join(root, '.claude', 'skills');
  await mkdir(dirname(providerDir), { recursive: true });
  await symlink(join('..', '.agents', 'skills'), providerDir, 'dir');
  const proof = await proveCollectionIdentity({
    root,
    canonicalDir,
    providerDir,
  });
  if (proof.status !== 'exact-link') {
    throw new Error('test collection must prove exact');
  }
  const providerLink = await lstat(providerDir);
  const collectionId = 'collection-transition';
  const manifest: ManifestV2 = {
    ...createEmptyManifest(),
    collections: [
      {
        id: collectionId,
        provider: 'claude',
        contentType: 'skill',
        canonicalDir: '.agents/skills',
        providerDir: '.claude/skills',
        linkTarget: '.agents/skills',
        ownership: 'oat-created',
        createdLink: {
          device: String(providerLink.dev),
          inode: String(providerLink.ino),
          linkText: await readlink(providerDir),
        },
        lastVerified: new Date().toISOString(),
      },
    ],
    entries: [
      {
        canonicalPath: '.agents/skills/skill-one',
        providerPath: '.claude/skills/skill-one',
        provider: 'claude',
        contentType: 'skill',
        strategy: 'collection',
        collectionId,
        contentHash: null,
        isFile: false,
        lastSynced: new Date().toISOString(),
      },
    ],
  };
  const deferredEntry = createEntry(
    root,
    'skill-one',
    'create_symlink',
    'symlink',
  );
  deferredEntry.deferredUntilCollectionDetached = true;
  const plan: SyncPlan = {
    scope: 'project',
    entries: [deferredEntry],
    removals: [],
    collections: [
      {
        provider: 'claude',
        scope: 'project',
        contentType: 'skill',
        canonicalDir,
        providerDir,
        action: 'detach-collection',
        ownership: 'oat-created',
        configuredStrategy: 'symlink',
        createdLink: manifest.collections[0]!.createdLink,
        transitionToPerEntry: true,
        proof,
        inheritedEntries: ['.agents/skills/skill-one'],
        reason: 'transition to explicit per-entry sync',
      },
    ],
  };
  return { manifest, plan, providerDir };
}

async function createAbsentCollectionTransition(
  root: string,
  strategy: 'symlink' | 'copy',
): Promise<{
  manifest: ManifestV2;
  plan: SyncPlan;
  providerDir: string;
}> {
  const transition = await createOwnedCollectionTransition(root);
  await rm(transition.providerDir);
  const collection = transition.plan.collections?.[0];
  const entry = transition.plan.entries[0];
  if (!collection || !entry) {
    throw new Error('test transition must include a collection and entry');
  }
  const proof = await proveCollectionIdentity({
    root,
    canonicalDir: collection.canonicalDir,
    providerDir: collection.providerDir,
  });
  if (proof.status !== 'absent') {
    throw new Error('test collection must prove absent');
  }
  collection.proof = proof;
  collection.configuredStrategy = strategy;
  entry.operation = strategy === 'symlink' ? 'create_symlink' : 'create_copy';
  entry.strategy = strategy;
  return transition;
}

describe('executeSyncPlan', () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    finalCollectionRemovalRace.afterIdentityRead = undefined;
    await Promise.all(
      tempDirs.map(async (dir) => {
        await rm(dir, { recursive: true, force: true });
      }),
    );
    tempDirs.length = 0;
  });

  it('fails collection creation closed with truthful per-entry recovery', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-execute-plan-'));
    tempDirs.push(root);
    const manifestPath = join(root, '.oat', 'sync', 'manifest.json');
    await seedCanonical(root, 'skill-one');
    await mkdir(join(root, '.claude'), { recursive: true });
    const plan = await createCollectionPlan(root, 'create-collection-link');

    const result = await executeSyncPlan(
      plan,
      createEmptyManifest(),
      manifestPath,
    );

    await expect(lstat(join(root, '.claude', 'skills'))).rejects.toMatchObject({
      code: 'ENOENT',
    });
    await expect(loadManifest(manifestPath)).resolves.toMatchObject({
      collections: [],
      entries: [],
    });
    expect(result.collectionResults).toEqual([
      expect.objectContaining({
        status: 'failed',
        action: 'create-collection-link',
        reason: expect.stringMatching(/secure|per-entry|exact alias/i),
      }),
    ]);
  });

  it('commits collection ownership when a guarded creation primitive is injected', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-execute-plan-'));
    tempDirs.push(root);
    const manifestPath = join(root, '.oat', 'sync', 'manifest.json');
    await seedCanonical(root, 'skill-one');
    await mkdir(join(root, '.claude'), { recursive: true });
    const plan = await createCollectionPlan(root, 'create-collection-link');

    const result = await executeSyncPlan(
      plan,
      createEmptyManifest(),
      manifestPath,
      { createCollectionSymlinkNoClobber: createTestCollectionLink },
    );

    expect(
      (await lstat(join(root, '.claude', 'skills'))).isSymbolicLink(),
    ).toBe(true);
    await expect(loadManifest(manifestPath)).resolves.toMatchObject({
      collections: [{ ownership: 'oat-created' }],
      entries: [{ strategy: 'collection', collectionId: expect.any(String) }],
    });
    expect(result.collectionResults).toEqual([
      expect.objectContaining({
        status: 'changed',
        action: 'create-collection-link',
      }),
    ]);
  });

  it('aborts on apply-time identity change and preserves the new destination', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-execute-plan-'));
    tempDirs.push(root);
    const manifestPath = join(root, '.oat', 'sync', 'manifest.json');
    await seedCanonical(root, 'skill-one');
    await mkdir(join(root, '.claude'), { recursive: true });
    const plan = await createCollectionPlan(root, 'create-collection-link');
    await writeFile(join(root, '.claude', 'skills'), 'foreign', 'utf8');

    const result = await executeSyncPlan(
      plan,
      createEmptyManifest(),
      manifestPath,
    );

    await expect(
      readFile(join(root, '.claude', 'skills'), 'utf8'),
    ).resolves.toBe('foreign');
    expect(result.collectionResults?.[0]?.status).toBe('failed');
    await expect(loadManifest(manifestPath)).resolves.toMatchObject({
      collections: [],
    });
  });

  it('re-proves collection ancestry after the mutation hook before reaching creation', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-execute-plan-'));
    const outside = await mkdtemp(join(tmpdir(), 'oat-execute-outside-'));
    tempDirs.push(root, outside);
    const manifestPath = join(root, '.oat', 'sync', 'manifest.json');
    await seedCanonical(root, 'skill-one');
    await mkdir(join(root, '.claude'), { recursive: true });
    const plan = await createCollectionPlan(root, 'create-collection-link');
    const createCollection = vi.fn(async () => {
      throw new Error('collection creation must not be reached');
    });

    const result = await executeSyncPlan(
      plan,
      createEmptyManifest(),
      manifestPath,
      {
        beforeFirstMutation: async () => {
          await rm(join(root, '.claude'), { recursive: true, force: true });
          await symlink(outside, join(root, '.claude'), 'dir');
        },
        createCollectionSymlinkNoClobber: createCollection,
      },
    );

    expect(createCollection).not.toHaveBeenCalled();
    await expect(lstat(join(outside, 'skills'))).rejects.toMatchObject({
      code: 'ENOENT',
    });
    expect(result.collectionResults[0]).toMatchObject({ status: 'failed' });
  });

  it('preserves a newly created link for manual rollback when guarded unlink is unavailable', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-execute-plan-'));
    tempDirs.push(root);
    const manifestPath = join(root, '.oat', 'sync', 'manifest.json');
    await seedCanonical(root, 'skill-one');
    await mkdir(join(root, '.claude'), { recursive: true });
    const plan = await createCollectionPlan(root, 'create-collection-link');

    const result = await executeSyncPlan(
      plan,
      createEmptyManifest(),
      manifestPath,
      {
        saveManifest: vi.fn(async () => {
          throw new Error('manifest write failed');
        }),
        createCollectionSymlinkNoClobber: createTestCollectionLink,
      },
    );

    expect(
      (await lstat(join(root, '.claude', 'skills'))).isSymbolicLink(),
    ).toBe(true);
    expect(result.collectionResults?.[0]).toMatchObject({
      status: 'partial',
      reason: expect.stringMatching(/manual|preserv|guard/i),
    });
  });

  it('reports partial when rollback cannot prove the created link is unchanged', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-execute-plan-'));
    tempDirs.push(root);
    const manifestPath = join(root, '.oat', 'sync', 'manifest.json');
    await seedCanonical(root, 'skill-one');
    await mkdir(join(root, '.claude'), { recursive: true });
    const plan = await createCollectionPlan(root, 'create-collection-link');

    const result = await executeSyncPlan(
      plan,
      createEmptyManifest(),
      manifestPath,
      {
        saveManifest: vi.fn(async () => {
          throw new Error('manifest write failed');
        }),
        removeCollectionSymlinkIfUnchanged: vi.fn(async () => false),
        createCollectionSymlinkNoClobber: createTestCollectionLink,
      },
    );

    expect(result.collectionResults?.[0]?.status).toBe('partial');
    expect(
      (await lstat(join(root, '.claude', 'skills'))).isSymbolicLink(),
    ).toBe(true);
  });

  it('adopts an exact alias through manifest-only mutation', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-execute-plan-'));
    tempDirs.push(root);
    const manifestPath = join(root, '.oat', 'sync', 'manifest.json');
    await seedCanonical(root, 'skill-one');
    await mkdir(join(root, '.claude'), { recursive: true });
    await symlink(
      join('..', '.agents', 'skills'),
      join(root, '.claude', 'skills'),
      'dir',
    );
    const plan = await createCollectionPlan(root, 'adopt-collection-link');
    const createLink = vi.fn();

    const result = await executeSyncPlan(
      plan,
      createEmptyManifest(),
      manifestPath,
      {
        createCollectionSymlinkNoClobber: createLink,
      },
    );

    expect(createLink).not.toHaveBeenCalled();
    expect(result.collectionResults?.[0]).toMatchObject({
      status: 'changed',
      ownership: 'adopted-exact',
    });
    expect(
      (await lstat(join(root, '.claude', 'skills'))).isSymbolicLink(),
    ).toBe(true);
  });

  it.each([
    'real-directory',
    'foreign-link',
    'same-target-replacement',
    'missing-path',
    'identity-unavailable',
    'removal-failure',
  ] as const)(
    'blocks deferred transition children when collection identity becomes %s',
    async (kind) => {
      const root = await mkdtemp(join(tmpdir(), 'oat-execute-plan-'));
      const outside = await mkdtemp(
        join(tmpdir(), 'oat-execute-plan-outside-'),
      );
      tempDirs.push(root, outside);
      const manifestPath = join(root, '.oat', 'sync', 'manifest.json');
      const { manifest, plan, providerDir } =
        await createOwnedCollectionTransition(root);
      await saveManifest(manifestPath, manifest);
      const unavailableProof: CollectionIdentityProof = {
        status: 'ineligible',
        reason: 'identity-unavailable',
        checkedAt: new Date().toISOString(),
      };

      const result = await executeSyncPlan(plan, manifest, manifestPath, {
        beforeFirstMutation: async () => {
          if (kind === 'identity-unavailable' || kind === 'removal-failure') {
            return;
          }
          await rm(providerDir, { recursive: true, force: true });
          if (kind === 'real-directory') {
            await mkdir(providerDir, { recursive: true });
            await writeFile(join(providerDir, 'user-owned.txt'), 'preserve');
          } else if (kind === 'foreign-link') {
            await symlink(outside, providerDir, 'dir');
          } else if (kind === 'same-target-replacement') {
            await symlink(
              join('..', '.agents', 'skills'),
              join(root, '.claude', 'identity-reservation'),
              'dir',
            );
            await symlink(join('..', '.agents', 'skills'), providerDir, 'dir');
          }
        },
        ...(kind === 'identity-unavailable'
          ? {
              proveCollectionIdentity: async () => unavailableProof,
            }
          : {}),
        ...(kind === 'removal-failure'
          ? {
              removeCollectionSymlinkIfUnchanged: async () => false,
            }
          : {}),
      });

      expect(result.collectionResults[0]?.status).not.toBe('changed');
      expect(result.operations?.[0]).toMatchObject({ status: 'failed' });
      await expect(loadManifest(manifestPath)).resolves.toMatchObject({
        collections: [{ id: 'collection-transition' }],
        entries: [{ strategy: 'collection' }],
      });
      await expect(
        readFile(
          join(root, '.agents', 'skills', 'skill-one', 'SKILL.md'),
          'utf8',
        ),
      ).resolves.toBe('canonical-before');

      if (kind === 'real-directory') {
        await expect(
          readFile(join(providerDir, 'user-owned.txt'), 'utf8'),
        ).resolves.toBe('preserve');
        await expect(
          lstat(join(providerDir, 'skill-one')),
        ).rejects.toMatchObject({ code: 'ENOENT' });
      } else if (kind === 'foreign-link') {
        await expect(lstat(join(outside, 'skill-one'))).rejects.toMatchObject({
          code: 'ENOENT',
        });
      } else if (kind === 'missing-path') {
        await expect(lstat(providerDir)).rejects.toMatchObject({
          code: 'ENOENT',
        });
      } else {
        expect((await lstat(providerDir)).isSymbolicLink()).toBe(true);
      }
    },
  );

  it.each(['destination-root', 'nested-directory'] as const)(
    'blocks deferred directory copy before an unsafe %s publication hook',
    async (swapKind) => {
      const root = await mkdtemp(join(tmpdir(), 'oat-execute-plan-'));
      const outside = await mkdtemp(join(tmpdir(), 'oat-execute-outside-'));
      tempDirs.push(root, outside);
      const manifestPath = join(root, '.oat', 'sync', 'manifest.json');
      const { manifest, plan, providerDir } =
        await createAbsentCollectionTransition(root, 'copy');
      const canonicalEntry = join(root, '.agents', 'skills', 'skill-one');
      await mkdir(join(canonicalEntry, 'references'), { recursive: true });
      await writeFile(
        join(canonicalEntry, 'references', 'guide.md'),
        'canonical guide',
        'utf8',
      );
      await writeFile(join(outside, 'user-owned.md'), 'outside-before', 'utf8');
      await saveManifest(manifestPath, manifest);
      const destination = join(providerDir, 'skill-one');
      let unsafePublicationCalls = 0;

      const result = await executeSyncPlan(plan, manifest, manifestPath, {
        copyDirectory: async (src, dest) => {
          unsafePublicationCalls += 1;
          await mkdir(dirname(dest), { recursive: true });
          await mkdir(dest);
          if (swapKind === 'destination-root') {
            await rm(dest, { recursive: true });
            await symlink(outside, dest, 'dir');
          } else {
            const nestedDestination = join(dest, 'references');
            await mkdir(nestedDestination);
            await rm(nestedDestination, { recursive: true });
            await symlink(outside, nestedDestination, 'dir');
          }
          await copyDirectory(src, dest);
        },
      });

      expect(unsafePublicationCalls).toBe(0);
      expect(result.collectionResults[0]).toMatchObject({
        action: 'detach-collection',
        status: 'rejected',
        reason: expect.stringMatching(/manual.*director.*copy.*retry/i),
      });
      expect(result.operations[0]).toMatchObject({
        status: 'failed',
        failure: expect.stringMatching(/manual.*director.*copy.*retry/i),
      });
      await expect(lstat(destination)).rejects.toMatchObject({
        code: 'ENOENT',
      });
      await expect(readdir(outside)).resolves.toEqual(['user-owned.md']);
      await expect(
        readFile(join(outside, 'user-owned.md'), 'utf8'),
      ).resolves.toBe('outside-before');
      await expect(loadManifest(manifestPath)).resolves.toMatchObject({
        collections: [{ id: 'collection-transition' }],
        entries: [{ strategy: 'collection' }],
      });
    },
  );

  it('blocks deferred transition children while automatic unlink is unavailable', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-execute-plan-'));
    tempDirs.push(root);
    const manifestPath = join(root, '.oat', 'sync', 'manifest.json');
    const { manifest, plan, providerDir } =
      await createOwnedCollectionTransition(root);
    await saveManifest(manifestPath, manifest);
    const result = await executeSyncPlan(plan, manifest, manifestPath);

    expect(result.collectionResults[0]).toMatchObject({
      action: 'detach-collection',
      status: expect.not.stringMatching(/^changed$/),
      reason: expect.stringMatching(/manual|preserv|guard/i),
    });
    expect(result.operations[0]).toMatchObject({ status: 'failed' });
    expect((await lstat(providerDir)).isSymbolicLink()).toBe(true);
    await expect(loadManifest(manifestPath)).resolves.toMatchObject({
      collections: [{ id: 'collection-transition' }],
      entries: [{ strategy: 'collection' }],
    });
  });

  it('preserves a final-window replacement and blocks every deferred child', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-execute-plan-'));
    tempDirs.push(root);
    const manifestPath = join(root, '.oat', 'sync', 'manifest.json');
    const { manifest, plan, providerDir } =
      await createOwnedCollectionTransition(root);
    await saveManifest(manifestPath, manifest);

    const result = await executeSyncPlan(plan, manifest, manifestPath, {
      removeCollectionSymlinkIfUnchanged: async (linkPath, created) => {
        finalCollectionRemovalRace.afterIdentityRead = async () => {
          await rm(linkPath);
          await writeFile(linkPath, 'user replacement', 'utf8');
        };
        return removeCollectionSymlinkIfUnchanged(linkPath, created);
      },
    });

    expect(result.collectionResults[0]).toMatchObject({
      action: 'detach-collection',
      status: 'partial',
      reason: expect.stringMatching(/manual|preserv|guard/i),
    });
    expect(result.operations[0]).toMatchObject({ status: 'failed' });
    await expect(readFile(providerDir, 'utf8')).resolves.toBe(
      'user replacement',
    );
    await expect(loadManifest(manifestPath)).resolves.toMatchObject({
      collections: [{ id: 'collection-transition' }],
      entries: [{ strategy: 'collection' }],
    });
  });

  it.each([
    ['file', 'symlink'],
    ['directory', 'symlink'],
    ['file', 'copy'],
    ['directory', 'copy'],
  ] as const)(
    'preserves a user %s destination created before deferred %s apply',
    async (destinationKind, strategy) => {
      const root = await mkdtemp(join(tmpdir(), 'oat-execute-plan-'));
      tempDirs.push(root);
      const manifestPath = join(root, '.oat', 'sync', 'manifest.json');
      const { manifest, plan, providerDir } =
        await createAbsentCollectionTransition(root, strategy);
      const destination = join(providerDir, 'skill-one');
      const userBytes = `user-owned-${strategy}-${destinationKind}`;
      await saveManifest(manifestPath, manifest);
      let injected = false;

      const result = await executeSyncPlan(plan, manifest, manifestPath, {
        saveManifest: async (path, nextManifest) => {
          await saveManifest(path, nextManifest);
          if (injected) return;
          injected = true;
          await mkdir(providerDir, { recursive: true });
          if (destinationKind === 'file') {
            await writeFile(destination, userBytes, 'utf8');
          } else {
            await mkdir(destination);
            await writeFile(join(destination, 'SKILL.md'), userBytes, 'utf8');
          }
        },
      });

      expect(result.collectionResults[0]).toMatchObject({
        action: 'detach-collection',
        status: strategy === 'copy' ? 'rejected' : 'changed',
      });
      expect(result.operations[0]).toMatchObject({
        status: 'failed',
        failure: expect.stringMatching(
          strategy === 'copy'
            ? /manual.*director.*copy.*retry/i
            : /appeared.*preserv.*retry/i,
        ),
      });
      if (strategy === 'copy') {
        expect(injected).toBe(false);
        await expect(lstat(providerDir)).rejects.toMatchObject({
          code: 'ENOENT',
        });
        await expect(loadManifest(manifestPath)).resolves.toMatchObject({
          collections: [{ id: 'collection-transition' }],
          entries: [{ strategy: 'collection' }],
        });
      } else {
        if (destinationKind === 'file') {
          await expect(readFile(destination, 'utf8')).resolves.toBe(userBytes);
        } else {
          await expect(
            readFile(join(destination, 'SKILL.md'), 'utf8'),
          ).resolves.toBe(userBytes);
        }
        await expect(loadManifest(manifestPath)).resolves.toMatchObject({
          collections: [],
          entries: [],
        });
      }
    },
  );

  it('creates symlinks for create_symlink entries', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-execute-plan-'));
    tempDirs.push(root);
    const manifestPath = join(root, '.oat', 'sync', 'manifest.json');
    await seedCanonical(root, 'skill-one');

    const plan = createPlan([
      createEntry(root, 'skill-one', 'create_symlink', 'symlink'),
    ]);
    const result = await executeSyncPlan(
      plan,
      createEmptyManifest(),
      manifestPath,
    );

    const stat = await lstat(join(root, '.claude', 'skills', 'skill-one'));
    expect(stat.isSymbolicLink()).toBe(true);
    expect(result.applied).toBe(1);
  });

  it('copies directories for create_copy entries', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-execute-plan-'));
    tempDirs.push(root);
    const manifestPath = join(root, '.oat', 'sync', 'manifest.json');
    await seedCanonical(root, 'skill-one', 'copy me');

    const plan = createPlan([
      createEntry(root, 'skill-one', 'create_copy', 'copy'),
    ]);
    await executeSyncPlan(plan, createEmptyManifest(), manifestPath);

    const copied = await readFile(
      join(root, '.claude', 'skills', 'skill-one', 'SKILL.md'),
      'utf8',
    );
    const sentinel = await readFile(
      join(root, '.claude', 'skills', 'skill-one', OAT_DIRECTORY_SENTINEL),
      'utf8',
    );
    expect(copied.startsWith(OAT_MARKER_PREFIX)).toBe(true);
    expect(copied).toContain('copy me');
    expect(sentinel).toContain('Source:');
  });

  it('re-creates symlink for update_symlink entries', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-execute-plan-'));
    tempDirs.push(root);
    const manifestPath = join(root, '.oat', 'sync', 'manifest.json');
    await seedCanonical(root, 'skill-one');
    await seedCanonical(root, 'other-skill');

    await mkdir(join(root, '.claude', 'skills'), { recursive: true });
    await symlink(
      join(root, '.agents', 'skills', 'other-skill'),
      join(root, '.claude', 'skills', 'skill-one'),
      'dir',
    );

    const plan = createPlan([
      createEntry(root, 'skill-one', 'update_symlink', 'symlink'),
    ]);
    await executeSyncPlan(plan, createEmptyManifest(), manifestPath);

    const linkTarget = await readlink(
      join(root, '.claude', 'skills', 'skill-one'),
    );
    expect(resolve(join(root, '.claude', 'skills'), linkTarget)).toBe(
      join(root, '.agents', 'skills', 'skill-one'),
    );
  });

  it('re-copies for update_copy entries', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-execute-plan-'));
    tempDirs.push(root);
    const manifestPath = join(root, '.oat', 'sync', 'manifest.json');
    await seedCanonical(root, 'skill-one', 'fresh');
    await mkdir(join(root, '.claude', 'skills', 'skill-one'), {
      recursive: true,
    });
    await writeFile(
      join(root, '.claude', 'skills', 'skill-one', 'SKILL.md'),
      'stale',
      'utf8',
    );

    const plan = createPlan([
      createEntry(root, 'skill-one', 'update_copy', 'copy'),
    ]);
    await executeSyncPlan(plan, createEmptyManifest(), manifestPath);

    const content = await readFile(
      join(root, '.claude', 'skills', 'skill-one', 'SKILL.md'),
      'utf8',
    );
    const sentinel = await readFile(
      join(root, '.claude', 'skills', 'skill-one', OAT_DIRECTORY_SENTINEL),
      'utf8',
    );
    expect(content.startsWith(OAT_MARKER_PREFIX)).toBe(true);
    expect(content).toContain('fresh');
    expect(sentinel).toContain('Source:');
  });

  it('writes rendered file content for transformed rule copies and stores provider hash', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-execute-plan-'));
    tempDirs.push(root);
    const manifestPath = join(root, '.oat', 'sync', 'manifest.json');
    await mkdir(join(root, '.agents', 'rules'), { recursive: true });
    await writeFile(
      join(root, '.agents', 'rules', 'react-components.md'),
      '# canonical source\n',
      'utf8',
    );

    const renderedContent = `---
description: React components
---

# React Components

<!-- OAT-managed: do not edit directly. Source: .agents/rules/react-components.md -->
`;

    const plan = createPlan([
      createRenderedRuleEntry(root, 'create_copy', renderedContent),
    ]);
    await executeSyncPlan(plan, createEmptyManifest(), manifestPath);

    const providerPath = join(root, '.cursor', 'rules', 'react-components.mdc');
    const written = await readFile(providerPath, 'utf8');
    const manifest = await loadManifest(manifestPath);

    expect(written).toBe(renderedContent);
    expect(manifest.entries[0]).toMatchObject({
      provider: 'cursor',
      contentType: 'rule',
      strategy: 'copy',
      providerPath: '.cursor/rules/react-components.mdc',
      canonicalPath: '.agents/rules/react-components.md',
      contentHash: await computeFileHash(providerPath),
      isFile: true,
    });
  });

  it('removes provider path for remove entries', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-execute-plan-'));
    tempDirs.push(root);
    const manifestPath = join(root, '.oat', 'sync', 'manifest.json');
    await seedCanonical(root, 'skill-one');
    await mkdir(join(root, '.claude', 'skills', 'skill-one'), {
      recursive: true,
    });

    const removal = createRemovalEntry(root, 'skill-one');
    const plan = createPlan([], [removal]);
    await executeSyncPlan(plan, createEmptyManifest(), manifestPath);

    await expect(
      lstat(join(root, '.claude', 'skills', 'skill-one')),
    ).rejects.toThrow();
  });

  it.each([
    ['create_symlink', 'symlink'],
    ['update_symlink', 'symlink'],
    ['create_copy', 'copy'],
    ['update_copy', 'copy'],
    ['remove', 'symlink'],
  ] as const)(
    'refuses %s when an existing provider parent is a symlink',
    async (operation, strategy) => {
      const root = await mkdtemp(join(tmpdir(), 'oat-execute-plan-'));
      const external = await mkdtemp(
        join(tmpdir(), 'oat-execute-plan-external-'),
      );
      tempDirs.push(root, external);
      const manifestPath = join(root, '.oat', 'sync', 'manifest.json');
      await seedCanonical(root, 'skill-one', 'canonical-before');
      await mkdir(join(root, '.claude'), { recursive: true });
      await symlink(external, join(root, '.claude', 'skills'), 'dir');

      const isExistingOperation =
        operation === 'update_symlink' ||
        operation === 'update_copy' ||
        operation === 'remove';
      if (isExistingOperation) {
        await mkdir(join(external, 'skill-one'), { recursive: true });
        await writeFile(
          join(external, 'skill-one', 'SKILL.md'),
          'external-before',
          'utf8',
        );
      }

      const entry = createEntry(root, 'skill-one', operation, strategy);
      const plan =
        operation === 'remove'
          ? createPlan(
              [],
              [
                {
                  ...entry,
                  operation: 'remove',
                },
              ],
            )
          : createPlan([entry]);

      await expect(
        executeSyncPlan(plan, createEmptyManifest(), manifestPath),
      ).rejects.toThrow(/symbolic link/i);

      await expect(
        readFile(
          join(root, '.agents', 'skills', 'skill-one', 'SKILL.md'),
          'utf8',
        ),
      ).resolves.toBe('canonical-before');
      if (isExistingOperation) {
        await expect(
          readFile(join(external, 'skill-one', 'SKILL.md'), 'utf8'),
        ).resolves.toBe('external-before');
      } else {
        await expect(lstat(join(external, 'skill-one'))).rejects.toMatchObject({
          code: 'ENOENT',
        });
      }
      await expect(lstat(manifestPath)).rejects.toMatchObject({
        code: 'ENOENT',
      });
    },
  );

  it('preflights the whole plan before applying any entry', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-execute-plan-'));
    const external = await mkdtemp(
      join(tmpdir(), 'oat-execute-plan-external-'),
    );
    tempDirs.push(root, external);
    const manifestPath = join(root, '.oat', 'sync', 'manifest.json');
    await seedCanonical(root, 'safe-skill', 'safe-canonical-before');
    await seedCanonical(root, 'unsafe-skill', 'unsafe-canonical-before');
    await mkdir(join(root, '.cursor', 'skills'), { recursive: true });
    await mkdir(join(root, '.claude'), { recursive: true });
    await symlink(external, join(root, '.claude', 'skills'), 'dir');
    await mkdir(dirname(manifestPath), { recursive: true });
    await writeFile(manifestPath, 'manifest-before', 'utf8');

    const safeEntry = {
      ...createEntry(root, 'safe-skill', 'create_copy', 'copy'),
      provider: 'cursor',
      providerPath: join(root, '.cursor', 'skills', 'safe-skill'),
    };
    const unsafeEntry = createEntry(
      root,
      'unsafe-skill',
      'create_symlink',
      'symlink',
    );

    await expect(
      executeSyncPlan(
        createPlan([safeEntry, unsafeEntry]),
        createEmptyManifest(),
        manifestPath,
      ),
    ).rejects.toThrow(/symbolic link/i);

    await expect(
      lstat(join(root, '.cursor', 'skills', 'safe-skill')),
    ).rejects.toMatchObject({ code: 'ENOENT' });
    await expect(lstat(join(external, 'unsafe-skill'))).rejects.toMatchObject({
      code: 'ENOENT',
    });
    await expect(
      readFile(
        join(root, '.agents', 'skills', 'safe-skill', 'SKILL.md'),
        'utf8',
      ),
    ).resolves.toBe('safe-canonical-before');
    await expect(
      readFile(
        join(root, '.agents', 'skills', 'unsafe-skill', 'SKILL.md'),
        'utf8',
      ),
    ).resolves.toBe('unsafe-canonical-before');
    await expect(readFile(manifestPath, 'utf8')).resolves.toBe(
      'manifest-before',
    );
  });

  it('revalidates ancestry after preflight and before the first mutation', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-execute-plan-'));
    const external = await mkdtemp(
      join(tmpdir(), 'oat-execute-plan-external-'),
    );
    tempDirs.push(root, external);
    const manifestPath = join(root, '.oat', 'sync', 'manifest.json');
    const providerParent = join(root, '.claude', 'skills');
    await seedCanonical(root, 'skill-one', 'canonical-before');
    await mkdir(providerParent, { recursive: true });

    const result = await executeSyncPlan(
      createPlan([createEntry(root, 'skill-one', 'create_copy', 'copy')]),
      createEmptyManifest(),
      manifestPath,
      {
        beforeFirstMutation: async () => {
          await rm(providerParent, { recursive: true, force: true });
          await symlink(external, providerParent, 'dir');
        },
      },
    );

    expect(result).toMatchObject({ applied: 0, failed: 1, skipped: 0 });
    await expect(lstat(join(external, 'skill-one'))).rejects.toMatchObject({
      code: 'ENOENT',
    });
    await expect(
      readFile(
        join(root, '.agents', 'skills', 'skill-one', 'SKILL.md'),
        'utf8',
      ),
    ).resolves.toBe('canonical-before');
    await expect(loadManifest(manifestPath)).resolves.toMatchObject({
      entries: [],
    });
  });

  it('detaches manifest ownership without deleting the provider path', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-execute-plan-'));
    tempDirs.push(root);
    const manifestPath = join(root, '.oat', 'sync', 'manifest.json');
    const providerPath = join(root, '.cursor', 'skills', 'skill-one');
    await seedCanonical(root, 'skill-one');
    await mkdir(providerPath, { recursive: true });
    await writeFile(join(providerPath, 'SKILL.md'), 'user content', 'utf8');

    const detachment: RemovalSyncPlanEntry = {
      canonical: createCanonicalEntry(root, 'skill', 'skill-one'),
      provider: 'cursor',
      providerPath,
      operation: 'detach',
      strategy: 'symlink',
      reason:
        'obsolete mapping provider path is changed; preserve and detach manifest ownership',
    };
    const manifest = {
      ...createEmptyManifest(),
      entries: [
        {
          canonicalPath: '.agents/skills/skill-one',
          providerPath: '.cursor/skills/skill-one',
          provider: 'cursor',
          contentType: 'skill' as const,
          strategy: 'symlink' as const,
          contentHash: null,
          isFile: false,
          lastSynced: new Date().toISOString(),
        },
      ],
    };

    const result = await executeSyncPlan(
      createPlan([], [detachment]),
      manifest,
      manifestPath,
    );
    const updated = await loadManifest(manifestPath);

    expect(result).toMatchObject({ applied: 1, failed: 0 });
    expect(updated.entries).toEqual([]);
    await expect(
      readFile(join(providerPath, 'SKILL.md'), 'utf8'),
    ).resolves.toBe('user content');
  });

  it('removes copy-mode manifest entries without hashing deleted canonical paths', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-execute-plan-'));
    tempDirs.push(root);
    const manifestPath = join(root, '.oat', 'sync', 'manifest.json');

    await mkdir(join(root, '.claude', 'skills', 'skill-one'), {
      recursive: true,
    });
    await writeFile(
      join(root, '.claude', 'skills', 'skill-one', 'SKILL.md'),
      'copied',
      'utf8',
    );

    const removal: RemovalSyncPlanEntry = {
      ...createEntry(root, 'skill-one', 'remove', 'copy'),
      operation: 'remove',
    };
    const plan = createPlan([], [removal]);
    const manifest = {
      ...createEmptyManifest(),
      entries: [
        {
          canonicalPath: '.agents/skills/skill-one',
          providerPath: '.claude/skills/skill-one',
          provider: 'claude',
          contentType: 'skill' as const,
          strategy: 'copy' as const,
          contentHash: 'deadbeef',
          lastSynced: new Date().toISOString(),
        },
      ],
    };

    const result = await executeSyncPlan(plan, manifest, manifestPath);
    const updated = await loadManifest(manifestPath);

    expect(result).toMatchObject({ applied: 1, failed: 0 });
    expect(updated.entries).toHaveLength(0);
    await expect(
      lstat(join(root, '.claude', 'skills', 'skill-one')),
    ).rejects.toThrow();
  });

  it('skips skip entries (no filesystem changes) and records unmanaged in-sync entries', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-execute-plan-'));
    tempDirs.push(root);
    const manifestPath = join(root, '.oat', 'sync', 'manifest.json');
    await seedCanonical(root, 'skill-one');

    const plan = createPlan([
      createEntry(root, 'skill-one', 'skip', 'symlink'),
    ]);
    const result = await executeSyncPlan(
      plan,
      createEmptyManifest(),
      manifestPath,
    );

    await expect(
      lstat(join(root, '.claude', 'skills', 'skill-one')),
    ).rejects.toThrow();
    expect(result.skipped).toBe(1);
    const manifest = await loadManifest(manifestPath);
    expect(manifest.entries).toHaveLength(1);
    expect(manifest.entries[0]).toMatchObject({
      canonicalPath: '.agents/skills/skill-one',
      providerPath: '.claude/skills/skill-one',
      provider: 'claude',
      strategy: 'symlink',
      contentHash: null,
    });
  });

  it('updates manifest after successful operations', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-execute-plan-'));
    tempDirs.push(root);
    const manifestPath = join(root, '.oat', 'sync', 'manifest.json');
    await seedCanonical(root, 'skill-one');

    const plan = createPlan([
      createEntry(root, 'skill-one', 'create_symlink', 'symlink'),
    ]);
    await executeSyncPlan(plan, createEmptyManifest(), manifestPath);

    const manifest = await loadManifest(manifestPath);
    expect(manifest.entries).toHaveLength(1);
    expect(manifest.entries[0]).toMatchObject({
      canonicalPath: '.agents/skills/skill-one',
      providerPath: '.claude/skills/skill-one',
      provider: 'claude',
      strategy: 'symlink',
      contentHash: null,
    });
  });

  it('refreshes a stale manifest oatVersion without changing entry sync metadata', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-execute-plan-'));
    tempDirs.push(root);
    const manifestPath = join(root, '.oat', 'sync', 'manifest.json');
    const lastSynced = '2026-06-24T20:00:00.000Z';
    const manifest = {
      ...createEmptyManifest(),
      oatVersion: '0.0.1',
      entries: [
        {
          canonicalPath: '.agents/skills/skill-one',
          providerPath: '.claude/skills/skill-one',
          provider: 'claude',
          contentType: 'skill' as const,
          strategy: 'copy' as const,
          contentHash: 'deadbeef',
          isFile: false,
          lastSynced,
        },
      ],
    };

    const result = await executeSyncPlan(
      createPlan([]),
      manifest,
      manifestPath,
    );
    const updated = await loadManifest(manifestPath);

    expect(result).toMatchObject({ applied: 0, failed: 0, skipped: 0 });
    expect(updated.oatVersion).toBe(OAT_VERSION);
    expect(updated.entries[0]).toMatchObject({
      contentHash: 'deadbeef',
      lastSynced,
    });
  });

  it('preserves original V1 manifest bytes when every planned operation fails', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-execute-plan-'));
    tempDirs.push(root);
    const manifestPath = join(root, '.oat', 'sync', 'manifest.json');
    await mkdir(dirname(manifestPath), { recursive: true });
    const legacyBytes = `${JSON.stringify(
      {
        version: 1,
        oatVersion: '0.1.0',
        entries: [],
        lastUpdated: '2026-02-13T00:00:00.000Z',
      },
      null,
      4,
    )}\n`;
    await writeFile(manifestPath, legacyBytes, 'utf8');
    const normalized = await loadManifest(manifestPath);
    const plan = createPlan([
      createEntry(root, 'missing-one', 'create_copy', 'copy'),
      createEntry(root, 'missing-two', 'create_copy', 'copy'),
    ]);

    const result = await executeSyncPlan(plan, normalized, manifestPath);

    expect(result).toMatchObject({ applied: 0, failed: 2 });
    await expect(readFile(manifestPath, 'utf8')).resolves.toBe(legacyBytes);
  });

  it('continues on error and reports partial failure', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-execute-plan-'));
    tempDirs.push(root);
    const manifestPath = join(root, '.oat', 'sync', 'manifest.json');
    await seedCanonical(root, 'good-skill');

    const failingEntry = {
      ...createEntry(root, 'missing-skill', 'create_copy', 'copy'),
      canonical: createCanonicalEntry(root, 'skill', 'missing-skill'),
    };
    const goodEntry = createEntry(
      root,
      'good-skill',
      'create_symlink',
      'symlink',
    );

    const plan = createPlan([failingEntry, goodEntry]);
    const result = await executeSyncPlan(
      plan,
      createEmptyManifest(),
      manifestPath,
    );

    const stat = await lstat(join(root, '.claude', 'skills', 'good-skill'));
    expect(stat.isSymbolicLink()).toBe(true);
    expect(result.applied).toBe(1);
    expect(result.failed).toBe(1);
    await expect(loadManifest(manifestPath)).resolves.toMatchObject({
      entries: [
        expect.objectContaining({
          canonicalPath: '.agents/skills/good-skill',
          strategy: 'symlink',
        }),
      ],
    });
    expect(result.operations).toEqual([
      {
        scope: 'project',
        provider: 'claude',
        contentKind: 'skill',
        asset: 'missing-skill',
        action: 'create_copy',
        status: 'missing',
        failure:
          'Canonical or provider input was missing; restore it and retry sync.',
      },
      {
        scope: 'project',
        provider: 'claude',
        contentKind: 'skill',
        asset: 'good-skill',
        action: 'create_symlink',
        status: 'changed',
      },
    ]);
  });

  it('returns SyncResult with counts', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-execute-plan-'));
    tempDirs.push(root);
    const manifestPath = join(root, '.oat', 'sync', 'manifest.json');
    await seedCanonical(root, 'skill-one');

    const plan = createPlan([
      createEntry(root, 'skill-one', 'create_symlink', 'symlink'),
    ]);
    const result = await executeSyncPlan(
      plan,
      createEmptyManifest(),
      manifestPath,
    );

    expect(result).toMatchObject({
      applied: 1,
      failed: 0,
      skipped: 0,
    });
    expect(result.operations).toEqual([
      {
        scope: 'project',
        provider: 'claude',
        contentKind: 'skill',
        asset: 'skill-one',
        action: 'create_symlink',
        status: 'changed',
      },
    ]);
  });

  it('inferScopeRoot handles mixed path separators', () => {
    const scopeRoot = inferScopeRoot(
      '/tmp/project\\.agents\\skills\\skill-one',
    );
    expect(scopeRoot).toBe('/tmp/project');
  });
});
