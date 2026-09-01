import {
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readlink,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  DEFAULT_SYNC_CONFIG as AUTO_SYNC_CONFIG,
  type SyncConfig,
} from '@config/sync-config';
import { createSymlink } from '@fs/io';
import { createEmptyManifest, loadManifest } from '@manifest/manager';
import { claudeAdapter } from '@providers/claude/adapter';
import { copilotAdapter } from '@providers/copilot/adapter';
import { cursorAdapter } from '@providers/cursor/adapter';
import type { ProviderAdapter } from '@providers/shared/adapter.types';
import { afterEach, describe, expect, it } from 'vitest';

import { computeSyncPlan as computeSyncPlanImplementation } from './compute-plan';
import { executeSyncPlan } from './execute-plan';
import { OAT_DIRECTORY_SENTINEL, OAT_MARKER_PREFIX } from './markers';
import { scanCanonical } from './scanner';
import { createTestAdapter } from './test-helpers';

const DEFAULT_SYNC_CONFIG: SyncConfig = {
  ...AUTO_SYNC_CONFIG,
  defaultStrategy: 'symlink',
};
const COPY_SYNC_CONFIG: SyncConfig = {
  ...AUTO_SYNC_CONFIG,
  defaultStrategy: 'copy',
};

function computeSyncPlan(
  args: Parameters<typeof computeSyncPlanImplementation>[0],
): ReturnType<typeof computeSyncPlanImplementation> {
  return computeSyncPlanImplementation({
    ...args,
    collectionAliasEligibleMappings:
      args.collectionAliasEligibleMappings ??
      args.adapters.flatMap((adapter) =>
        [...adapter.projectMappings, ...adapter.userMappings]
          .filter(({ contentType }) => contentType === 'skill')
          .map(() => ({
            provider: adapter.name,
            contentType: 'skill' as const,
          })),
      ),
  });
}

async function seedCanonical(root: string): Promise<void> {
  await mkdir(join(root, '.agents', 'skills', 'skill-one'), {
    recursive: true,
  });
  await mkdir(join(root, '.agents', 'agents', 'agent-one'), {
    recursive: true,
  });
  await writeFile(
    join(root, '.agents', 'skills', 'skill-one', 'SKILL.md'),
    '# skill\n',
    'utf8',
  );
  await writeFile(
    join(root, '.agents', 'agents', 'agent-one', 'AGENT.md'),
    '# agent\n',
    'utf8',
  );
}

function createLegacyCursorAdapter(
  defaultStrategy: ProviderAdapter['defaultStrategy'] = 'symlink',
): ProviderAdapter {
  const legacySkillMapping = {
    contentType: 'skill' as const,
    canonicalDir: '.agents/skills',
    providerDir: '.cursor/skills',
    nativeRead: false,
  };

  return {
    ...cursorAdapter,
    defaultStrategy,
    projectMappings: [
      legacySkillMapping,
      ...cursorAdapter.projectMappings.filter(
        (mapping) => mapping.contentType !== 'skill',
      ),
    ],
    userMappings: [
      legacySkillMapping,
      ...cursorAdapter.userMappings.filter(
        (mapping) => mapping.contentType !== 'skill',
      ),
    ],
  };
}

function createLegacyCopilotAdapter(): ProviderAdapter {
  const projectSkillMapping = {
    contentType: 'skill' as const,
    canonicalDir: '.agents/skills',
    providerDir: '.github/skills',
    nativeRead: false,
  };
  const userSkillMapping = {
    contentType: 'skill' as const,
    canonicalDir: '.agents/skills',
    providerDir: '.copilot/skills',
    nativeRead: false,
  };

  return {
    ...copilotAdapter,
    projectMappings: [
      projectSkillMapping,
      ...copilotAdapter.projectMappings.filter(
        (mapping) => mapping.contentType !== 'skill',
      ),
    ],
    userMappings: [
      userSkillMapping,
      ...copilotAdapter.userMappings.filter(
        (mapping) => mapping.contentType !== 'skill',
      ),
    ],
  };
}

function createSkillCollectionAdapter(): ProviderAdapter {
  const adapter = createTestAdapter();
  return {
    ...adapter,
    projectMappings: adapter.projectMappings.filter(
      ({ contentType }) => contentType === 'skill',
    ),
  };
}

describe('sync engine integration', () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(
      tempDirs.map(async (dir) => {
        await rm(dir, { recursive: true, force: true });
      }),
    );
    tempDirs.length = 0;
  });

  it('full sync: scan → plan → execute creates correct symlinks', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-engine-int-'));
    tempDirs.push(root);
    const adapter = createTestAdapter();
    const manifestPath = join(root, '.oat', 'sync', 'manifest.json');
    await seedCanonical(root);

    const canonical = await scanCanonical(root, 'project');
    const plan = await computeSyncPlan({
      canonical,
      adapters: [adapter],
      manifest: createEmptyManifest(),
      scope: 'project',
      config: DEFAULT_SYNC_CONFIG,
      scopeRoot: root,
    });
    await executeSyncPlan(plan, createEmptyManifest(), manifestPath);

    const skillStat = await lstat(join(root, '.claude', 'skills', 'skill-one'));
    const agentStat = await lstat(join(root, '.claude', 'agents', 'agent-one'));
    expect(skillStat.isSymbolicLink()).toBe(true);
    expect(agentStat.isSymbolicLink()).toBe(true);
  });

  it('idempotent: second run produces all skip entries', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-engine-int-'));
    tempDirs.push(root);
    const adapter = createTestAdapter();
    const manifestPath = join(root, '.oat', 'sync', 'manifest.json');
    await seedCanonical(root);

    const firstCanonical = await scanCanonical(root, 'project');
    const firstPlan = await computeSyncPlan({
      canonical: firstCanonical,
      adapters: [adapter],
      manifest: createEmptyManifest(),
      scope: 'project',
      config: DEFAULT_SYNC_CONFIG,
      scopeRoot: root,
    });
    await executeSyncPlan(firstPlan, createEmptyManifest(), manifestPath);

    const secondCanonical = await scanCanonical(root, 'project');
    const manifest = await loadManifest(manifestPath);
    const secondPlan = await computeSyncPlan({
      canonical: secondCanonical,
      adapters: [adapter],
      manifest,
      scope: 'project',
      config: DEFAULT_SYNC_CONFIG,
      scopeRoot: root,
    });

    expect(
      secondPlan.entries.every((entry) => entry.operation === 'skip'),
    ).toBe(true);
  });

  it('reconciles collection inheritance, removal, repetition, and disablement without child mutation', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-engine-int-'));
    tempDirs.push(root);
    const adapter = createSkillCollectionAdapter();
    const manifestPath = join(root, '.oat', 'sync', 'manifest.json');
    await mkdir(join(root, '.agents', 'skills', 'skill-one'), {
      recursive: true,
    });
    await mkdir(join(root, '.claude'), { recursive: true });
    await writeFile(
      join(root, '.agents', 'skills', 'skill-one', 'SKILL.md'),
      '# skill one\n',
      'utf8',
    );

    const firstCanonical = await scanCanonical(root, 'project');
    const firstPlan = await computeSyncPlan({
      canonical: firstCanonical,
      adapters: [adapter],
      manifest: createEmptyManifest(),
      scope: 'project',
      config: AUTO_SYNC_CONFIG,
      scopeRoot: root,
    });
    expect(firstPlan.collections).toEqual([
      expect.objectContaining({ action: 'create-collection-link' }),
    ]);
    await executeSyncPlan(firstPlan, createEmptyManifest(), manifestPath);

    await mkdir(join(root, '.agents', 'skills', 'skill-two'), {
      recursive: true,
    });
    await writeFile(
      join(root, '.agents', 'skills', 'skill-two', 'SKILL.md'),
      '# skill two\n',
      'utf8',
    );
    const secondCanonical = await scanCanonical(root, 'project');
    const firstManifest = await loadManifest(manifestPath);
    const inheritancePlan = await computeSyncPlan({
      canonical: secondCanonical,
      adapters: [adapter],
      manifest: firstManifest,
      scope: 'project',
      config: AUTO_SYNC_CONFIG,
      scopeRoot: root,
    });
    expect(inheritancePlan.entries).toEqual([]);
    expect(inheritancePlan.collections).toEqual([
      expect.objectContaining({
        action: 'inherit-collection',
        inheritedEntries: [
          '.agents/skills/skill-one',
          '.agents/skills/skill-two',
        ],
      }),
    ]);
    await executeSyncPlan(inheritancePlan, firstManifest, manifestPath);

    const inheritedManifest = await loadManifest(manifestPath);
    const repeatedPlan = await computeSyncPlan({
      canonical: secondCanonical,
      adapters: [adapter],
      manifest: inheritedManifest,
      scope: 'project',
      config: AUTO_SYNC_CONFIG,
      scopeRoot: root,
    });
    expect(repeatedPlan).toMatchObject({
      entries: [],
      removals: [],
      collections: [],
    });

    await rm(join(root, '.agents', 'skills', 'skill-one'), {
      recursive: true,
      force: true,
    });
    const reducedCanonical = await scanCanonical(root, 'project');
    const removalPlan = await computeSyncPlan({
      canonical: reducedCanonical,
      adapters: [adapter],
      manifest: inheritedManifest,
      scope: 'project',
      config: AUTO_SYNC_CONFIG,
      scopeRoot: root,
    });
    expect(removalPlan.entries).toEqual([]);
    expect(removalPlan.removals).toEqual([
      expect.objectContaining({ operation: 'detach' }),
    ]);
    await executeSyncPlan(removalPlan, inheritedManifest, manifestPath);

    const reducedManifest = await loadManifest(manifestPath);
    expect(reducedManifest.entries).toEqual([
      expect.objectContaining({
        canonicalPath: '.agents/skills/skill-two',
        strategy: 'collection',
      }),
    ]);
    const disablePlan = await computeSyncPlan({
      canonical: reducedCanonical,
      adapters: [],
      manifest: reducedManifest,
      scope: 'project',
      config: AUTO_SYNC_CONFIG,
      scopeRoot: root,
    });
    expect(disablePlan.collections).toEqual([
      expect.objectContaining({ action: 'detach-collection' }),
    ]);
    const result = await executeSyncPlan(
      disablePlan,
      reducedManifest,
      manifestPath,
    );

    expect(result.collectionResults).toEqual([
      expect.objectContaining({
        action: 'detach-collection',
        status: 'changed',
      }),
    ]);
    await expect(lstat(join(root, '.claude', 'skills'))).rejects.toMatchObject({
      code: 'ENOENT',
    });
    await expect(
      readFile(
        join(root, '.agents', 'skills', 'skill-two', 'SKILL.md'),
        'utf8',
      ),
    ).resolves.toBe('# skill two\n');
    await expect(loadManifest(manifestPath)).resolves.toMatchObject({
      collections: [],
      entries: [],
    });
  });

  it.each(['symlink', 'copy'] as const)(
    'transitions a durably owned auto collection to explicit %s per-entry sync',
    async (strategy) => {
      const root = await mkdtemp(join(tmpdir(), 'oat-engine-int-'));
      tempDirs.push(root);
      const adapter = createSkillCollectionAdapter();
      const manifestPath = join(root, '.oat', 'sync', 'manifest.json');
      const canonicalDir = join(root, '.agents', 'skills');
      const providerDir = join(root, '.claude', 'skills');
      await mkdir(join(canonicalDir, 'skill-one'), { recursive: true });
      await mkdir(join(root, '.claude'), { recursive: true });
      await writeFile(
        join(canonicalDir, 'skill-one', 'SKILL.md'),
        '# skill one\n',
        'utf8',
      );
      const canonical = await scanCanonical(root, 'project');
      const collectionPlan = await computeSyncPlan({
        canonical,
        adapters: [adapter],
        manifest: createEmptyManifest(),
        scope: 'project',
        config: AUTO_SYNC_CONFIG,
        scopeRoot: root,
      });
      await executeSyncPlan(
        collectionPlan,
        createEmptyManifest(),
        manifestPath,
      );
      const collectionManifest = await loadManifest(manifestPath);

      expect(collectionManifest.collections[0]).toMatchObject({
        ownership: 'oat-created',
        createdLink: {
          device: expect.any(String),
          inode: expect.any(String),
          linkText: expect.any(String),
        },
      });

      const transitionPlan = await computeSyncPlan({
        canonical,
        adapters: [adapter],
        manifest: collectionManifest,
        scope: 'project',
        config: {
          ...AUTO_SYNC_CONFIG,
          providers: { claude: { strategy } },
        },
        scopeRoot: root,
      });
      expect(transitionPlan.collections).toEqual([
        expect.objectContaining({
          action: 'detach-collection',
          transitionToPerEntry: true,
        }),
      ]);
      expect(transitionPlan.entries).toEqual([
        expect.objectContaining({
          operation: strategy === 'copy' ? 'create_copy' : 'create_symlink',
          strategy,
          deferredUntilCollectionDetached: true,
        }),
      ]);

      const result = await executeSyncPlan(
        transitionPlan,
        collectionManifest,
        manifestPath,
      );
      expect(result.failed).toBe(0);
      expect((await lstat(providerDir)).isDirectory()).toBe(true);
      expect(
        (await lstat(join(providerDir, 'skill-one'))).isSymbolicLink(),
      ).toBe(strategy === 'symlink');
      await expect(loadManifest(manifestPath)).resolves.toMatchObject({
        collections: [],
        entries: [expect.objectContaining({ strategy })],
      });
    },
  );

  it('preserves a same-target user replacement during disablement', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-engine-int-'));
    tempDirs.push(root);
    const adapter = createSkillCollectionAdapter();
    const manifestPath = join(root, '.oat', 'sync', 'manifest.json');
    const canonicalDir = join(root, '.agents', 'skills');
    const providerDir = join(root, '.claude', 'skills');
    await mkdir(join(canonicalDir, 'skill-one'), { recursive: true });
    await mkdir(join(root, '.claude'), { recursive: true });
    await writeFile(
      join(canonicalDir, 'skill-one', 'SKILL.md'),
      '# skill one\n',
      'utf8',
    );
    const canonical = await scanCanonical(root, 'project');
    const firstPlan = await computeSyncPlan({
      canonical,
      adapters: [adapter],
      manifest: createEmptyManifest(),
      scope: 'project',
      config: AUTO_SYNC_CONFIG,
      scopeRoot: root,
    });
    await executeSyncPlan(firstPlan, createEmptyManifest(), manifestPath);
    const ownedManifest = await loadManifest(manifestPath);
    const originalIdentity = await lstat(providerDir);

    await rm(providerDir);
    await symlink(
      join('..', '.agents', 'skills'),
      join(root, '.claude', 'identity-reservation'),
      'dir',
    );
    await symlink(join('..', '.agents', 'skills'), providerDir, 'dir');
    const replacementIdentity = await lstat(providerDir);
    expect(String(replacementIdentity.ino)).not.toBe(
      String(originalIdentity.ino),
    );

    const disablePlan = await computeSyncPlan({
      canonical,
      adapters: [],
      manifest: ownedManifest,
      scope: 'project',
      config: AUTO_SYNC_CONFIG,
      scopeRoot: root,
    });
    const result = await executeSyncPlan(
      disablePlan,
      ownedManifest,
      manifestPath,
    );

    expect(result.collectionResults[0]).toMatchObject({
      action: 'detach-collection',
      status: 'changed',
    });
    expect((await lstat(providerDir)).isSymbolicLink()).toBe(true);
    await expect(loadManifest(manifestPath)).resolves.toMatchObject({
      collections: [],
      entries: [],
    });
  });

  it('detaches a legacy created record without deleting its exact alias', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-engine-int-'));
    tempDirs.push(root);
    const adapter = createSkillCollectionAdapter();
    const manifestPath = join(root, '.oat', 'sync', 'manifest.json');
    const canonicalDir = join(root, '.agents', 'skills');
    const providerDir = join(root, '.claude', 'skills');
    await mkdir(join(canonicalDir, 'skill-one'), { recursive: true });
    await mkdir(join(root, '.claude'), { recursive: true });
    await writeFile(
      join(canonicalDir, 'skill-one', 'SKILL.md'),
      '# skill one\n',
      'utf8',
    );
    const canonical = await scanCanonical(root, 'project');
    const firstPlan = await computeSyncPlan({
      canonical,
      adapters: [adapter],
      manifest: createEmptyManifest(),
      scope: 'project',
      config: AUTO_SYNC_CONFIG,
      scopeRoot: root,
    });
    await executeSyncPlan(firstPlan, createEmptyManifest(), manifestPath);
    const legacyManifest = await loadManifest(manifestPath);
    delete (
      legacyManifest
        .collections[0] as (typeof legacyManifest.collections)[number] & {
        createdLink?: unknown;
      }
    ).createdLink;

    const disablePlan = await computeSyncPlan({
      canonical,
      adapters: [],
      manifest: legacyManifest,
      scope: 'project',
      config: AUTO_SYNC_CONFIG,
      scopeRoot: root,
    });
    await executeSyncPlan(disablePlan, legacyManifest, manifestPath);

    expect((await lstat(providerDir)).isSymbolicLink()).toBe(true);
    await expect(loadManifest(manifestPath)).resolves.toMatchObject({
      collections: [],
      entries: [],
    });
  });

  it.each(['adopted', 'changed', 'replacement', 'unverifiable'] as const)(
    'preserves an %s collection conflict during explicit strategy transition',
    async (kind) => {
      const root = await mkdtemp(join(tmpdir(), 'oat-engine-int-'));
      tempDirs.push(root);
      const adapter = createSkillCollectionAdapter();
      const manifestPath = join(root, '.oat', 'sync', 'manifest.json');
      const canonicalDir = join(root, '.agents', 'skills');
      const providerDir = join(root, '.claude', 'skills');
      await mkdir(join(canonicalDir, 'skill-one'), { recursive: true });
      await mkdir(join(root, '.claude'), { recursive: true });
      await writeFile(
        join(canonicalDir, 'skill-one', 'SKILL.md'),
        '# skill one\n',
        'utf8',
      );
      const canonical = await scanCanonical(root, 'project');

      if (kind === 'adopted') {
        await symlink(join('..', '.agents', 'skills'), providerDir, 'dir');
      }
      const firstPlan = await computeSyncPlan({
        canonical,
        adapters: [adapter],
        manifest: createEmptyManifest(),
        scope: 'project',
        config: AUTO_SYNC_CONFIG,
        scopeRoot: root,
      });
      await executeSyncPlan(firstPlan, createEmptyManifest(), manifestPath);
      const manifest = await loadManifest(manifestPath);

      if (kind === 'changed') {
        await rm(providerDir);
        await mkdir(join(root, 'foreign-skills'));
        await symlink(join('..', 'foreign-skills'), providerDir, 'dir');
      }
      if (kind === 'replacement') {
        await rm(providerDir);
        await symlink(
          join('..', '.agents', 'skills'),
          join(root, '.claude', 'identity-reservation'),
          'dir',
        );
        await symlink(join('..', '.agents', 'skills'), providerDir, 'dir');
      }
      if (kind === 'unverifiable') {
        delete (
          manifest.collections[0] as (typeof manifest.collections)[number] & {
            createdLink?: unknown;
          }
        ).createdLink;
      }

      const transitionPlan = await computeSyncPlan({
        canonical,
        adapters: [adapter],
        manifest,
        scope: 'project',
        config: {
          ...AUTO_SYNC_CONFIG,
          providers: { claude: { strategy: 'symlink' } },
        },
        scopeRoot: root,
      });

      expect(transitionPlan.entries).toEqual([]);
      expect(transitionPlan.collections).toEqual([
        expect.objectContaining({
          action: 'reject-collection',
          reason: expect.stringMatching(/clear|preserv|identity/i),
        }),
      ]);
      expect((await lstat(providerDir)).isSymbolicLink()).toBe(true);
    },
  );

  it('detaches adopted and changed collection aliases without removing them', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-engine-int-'));
    tempDirs.push(root);
    const adapter = createSkillCollectionAdapter();
    const manifestPath = join(root, '.oat', 'sync', 'manifest.json');
    const canonicalDir = join(root, '.agents', 'skills');
    const providerDir = join(root, '.claude', 'skills');
    await mkdir(join(canonicalDir, 'skill-one'), { recursive: true });
    await mkdir(join(root, '.claude'), { recursive: true });
    await writeFile(
      join(canonicalDir, 'skill-one', 'SKILL.md'),
      '# skill one\n',
      'utf8',
    );
    await symlink(join('..', '.agents', 'skills'), providerDir, 'dir');

    const canonical = await scanCanonical(root, 'project');
    const adoptionPlan = await computeSyncPlan({
      canonical,
      adapters: [adapter],
      manifest: createEmptyManifest(),
      scope: 'project',
      config: AUTO_SYNC_CONFIG,
      scopeRoot: root,
    });
    expect(adoptionPlan.collections).toEqual([
      expect.objectContaining({ action: 'adopt-collection-link' }),
    ]);
    await executeSyncPlan(adoptionPlan, createEmptyManifest(), manifestPath);

    const adoptedManifest = await loadManifest(manifestPath);
    const adoptedDisablePlan = await computeSyncPlan({
      canonical,
      adapters: [],
      manifest: adoptedManifest,
      scope: 'project',
      config: AUTO_SYNC_CONFIG,
      scopeRoot: root,
    });
    await executeSyncPlan(adoptedDisablePlan, adoptedManifest, manifestPath);
    expect((await lstat(providerDir)).isSymbolicLink()).toBe(true);
    await expect(loadManifest(manifestPath)).resolves.toMatchObject({
      collections: [],
      entries: [],
    });

    const freshPlan = await computeSyncPlan({
      canonical,
      adapters: [adapter],
      manifest: createEmptyManifest(),
      scope: 'project',
      config: AUTO_SYNC_CONFIG,
      scopeRoot: root,
    });
    await executeSyncPlan(freshPlan, createEmptyManifest(), manifestPath);
    const ownedManifest = await loadManifest(manifestPath);
    ownedManifest.collections[0]!.ownership = 'oat-created';
    await rm(providerDir);
    const foreignDir = join(root, 'foreign-skills');
    await mkdir(foreignDir);
    await symlink(join('..', 'foreign-skills'), providerDir, 'dir');
    const changedDisablePlan = await computeSyncPlan({
      canonical,
      adapters: [],
      manifest: ownedManifest,
      scope: 'project',
      config: AUTO_SYNC_CONFIG,
      scopeRoot: root,
    });
    await executeSyncPlan(changedDisablePlan, ownedManifest, manifestPath);

    expect((await lstat(providerDir)).isSymbolicLink()).toBe(true);
    expect(await readlink(providerDir)).toBe(join('..', 'foreign-skills'));
    await expect(loadManifest(manifestPath)).resolves.toMatchObject({
      collections: [],
      entries: [],
    });
  });

  it('repairs missing manifest entries for pre-existing in-sync symlinks', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-engine-int-'));
    tempDirs.push(root);
    const adapter = createTestAdapter();
    const manifestPath = join(root, '.oat', 'sync', 'manifest.json');
    await seedCanonical(root);

    const skillCanonical = join(root, '.agents', 'skills', 'skill-one');
    const agentCanonical = join(root, '.agents', 'agents', 'agent-one');
    await Promise.all([
      createSymlink(
        skillCanonical,
        join(root, '.claude', 'skills', 'skill-one'),
        undefined,
        false,
      ),
      createSymlink(
        agentCanonical,
        join(root, '.claude', 'agents', 'agent-one'),
        undefined,
        false,
      ),
    ]);

    const emptyManifest = createEmptyManifest();
    const canonical = await scanCanonical(root, 'project');
    const plan = await computeSyncPlan({
      canonical,
      adapters: [adapter],
      manifest: emptyManifest,
      scope: 'project',
      config: DEFAULT_SYNC_CONFIG,
      scopeRoot: root,
    });

    expect(plan.entries).toHaveLength(2);
    expect(plan.entries.every((entry) => entry.operation === 'skip')).toBe(
      true,
    );

    const result = await executeSyncPlan(plan, emptyManifest, manifestPath);
    const manifest = await loadManifest(manifestPath);

    expect(result.applied).toBe(0);
    expect(result.failed).toBe(0);
    expect(result.skipped).toBe(2);
    expect(
      manifest.entries.map((entry) => [entry.canonicalPath, entry.provider]),
    ).toEqual(
      expect.arrayContaining([
        ['.agents/skills/skill-one', 'claude'],
        ['.agents/agents/agent-one', 'claude'],
      ]),
    );
    expect(
      await readlink(join(root, '.claude', 'skills', 'skill-one')),
    ).toBeDefined();
  });

  it('dry-run: computeSyncPlan without execute makes zero fs changes', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-engine-int-'));
    tempDirs.push(root);
    await seedCanonical(root);

    const canonical = await scanCanonical(root, 'project');
    await computeSyncPlan({
      canonical,
      adapters: [createTestAdapter()],
      manifest: createEmptyManifest(),
      scope: 'project',
      config: DEFAULT_SYNC_CONFIG,
      scopeRoot: root,
    });

    await expect(
      lstat(join(root, '.claude', 'skills', 'skill-one')),
    ).rejects.toThrow();
  });

  it('refuses planning through a provider parent linked to canonical skills', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-engine-int-'));
    tempDirs.push(root);
    await seedCanonical(root);
    await mkdir(join(root, '.claude'), { recursive: true });
    await symlink(
      join('..', '.agents', 'skills'),
      join(root, '.claude', 'skills'),
      'dir',
    );
    const canonicalSkill = join(
      root,
      '.agents',
      'skills',
      'skill-one',
      'SKILL.md',
    );
    const contentBefore = await readFile(canonicalSkill, 'utf8');

    const canonical = await scanCanonical(root, 'project');
    await expect(
      computeSyncPlan({
        canonical,
        adapters: [createTestAdapter()],
        manifest: createEmptyManifest(),
        scope: 'project',
        config: DEFAULT_SYNC_CONFIG,
        scopeRoot: root,
      }),
    ).rejects.toThrow(/symbolic link/i);

    await expect(readFile(canonicalSkill, 'utf8')).resolves.toBe(contentBefore);
  });

  it('removal: delete canonical → plan shows remove → execute cleans provider', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-engine-int-'));
    tempDirs.push(root);
    const adapter = createTestAdapter();
    const manifestPath = join(root, '.oat', 'sync', 'manifest.json');
    await seedCanonical(root);

    const firstCanonical = await scanCanonical(root, 'project');
    const firstPlan = await computeSyncPlan({
      canonical: firstCanonical,
      adapters: [adapter],
      manifest: createEmptyManifest(),
      scope: 'project',
      config: DEFAULT_SYNC_CONFIG,
      scopeRoot: root,
    });
    await executeSyncPlan(firstPlan, createEmptyManifest(), manifestPath);

    await rm(join(root, '.agents', 'skills', 'skill-one'), {
      recursive: true,
      force: true,
    });

    const canonical = await scanCanonical(root, 'project');
    const manifest = await loadManifest(manifestPath);
    const plan = await computeSyncPlan({
      canonical,
      adapters: [adapter],
      manifest,
      scope: 'project',
      config: DEFAULT_SYNC_CONFIG,
      scopeRoot: root,
    });
    expect(plan.removals.some((entry) => entry.operation === 'remove')).toBe(
      true,
    );

    await executeSyncPlan(plan, manifest, manifestPath);
    await expect(
      lstat(join(root, '.claude', 'skills', 'skill-one')),
    ).rejects.toThrow();
  });

  it('copy mode removal clears provider view and manifest entry', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-engine-int-'));
    tempDirs.push(root);
    const adapter = createTestAdapter({ defaultStrategy: 'copy' });
    const manifestPath = join(root, '.oat', 'sync', 'manifest.json');
    await seedCanonical(root);

    const firstCanonical = await scanCanonical(root, 'project');
    const firstPlan = await computeSyncPlan({
      canonical: firstCanonical,
      adapters: [adapter],
      manifest: createEmptyManifest(),
      scope: 'project',
      config: COPY_SYNC_CONFIG,
      scopeRoot: root,
    });
    await executeSyncPlan(firstPlan, createEmptyManifest(), manifestPath);

    await rm(join(root, '.agents', 'skills', 'skill-one'), {
      recursive: true,
      force: true,
    });

    const canonical = await scanCanonical(root, 'project');
    const manifest = await loadManifest(manifestPath);
    const plan = await computeSyncPlan({
      canonical,
      adapters: [adapter],
      manifest,
      scope: 'project',
      config: COPY_SYNC_CONFIG,
      scopeRoot: root,
    });
    const result = await executeSyncPlan(plan, manifest, manifestPath);
    const updated = await loadManifest(manifestPath);

    expect(result.failed).toBe(0);
    expect(
      updated.entries.some(
        (entry) => entry.canonicalPath === '.agents/skills/skill-one',
      ),
    ).toBe(false);
    await expect(
      lstat(join(root, '.claude', 'skills', 'skill-one')),
    ).rejects.toThrow();
  });

  it('copy mode: creates copies with correct hashes in manifest', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-engine-int-'));
    tempDirs.push(root);
    const adapter = createTestAdapter({ defaultStrategy: 'copy' });
    const manifestPath = join(root, '.oat', 'sync', 'manifest.json');
    await seedCanonical(root);

    const canonical = await scanCanonical(root, 'project');
    const plan = await computeSyncPlan({
      canonical,
      adapters: [adapter],
      manifest: createEmptyManifest(),
      scope: 'project',
      config: COPY_SYNC_CONFIG,
      scopeRoot: root,
    });
    await executeSyncPlan(plan, createEmptyManifest(), manifestPath);

    const copiedContent = await readFile(
      join(root, '.claude', 'skills', 'skill-one', 'SKILL.md'),
      'utf8',
    );
    const sentinelContent = await readFile(
      join(root, '.claude', 'skills', 'skill-one', OAT_DIRECTORY_SENTINEL),
      'utf8',
    );
    const manifest = await loadManifest(manifestPath);
    const skillEntry = manifest.entries.find(
      (entry) => entry.canonicalPath === '.agents/skills/skill-one',
    );

    expect(copiedContent.startsWith(OAT_MARKER_PREFIX)).toBe(true);
    expect(copiedContent).toContain('# skill');
    expect(sentinelContent).toContain('Source:');
    expect(skillEntry?.strategy).toBe('copy');
    expect(skillEntry?.contentHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('file-based agent: syncs via symlink', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-engine-int-'));
    tempDirs.push(root);
    const adapter = createTestAdapter();
    const manifestPath = join(root, '.oat', 'sync', 'manifest.json');

    await mkdir(join(root, '.agents', 'agents'), { recursive: true });
    await writeFile(
      join(root, '.agents', 'agents', 'my-agent.md'),
      '# My Agent\n',
      'utf8',
    );

    const canonical = await scanCanonical(root, 'project');
    const plan = await computeSyncPlan({
      canonical,
      adapters: [adapter],
      manifest: createEmptyManifest(),
      scope: 'project',
      config: DEFAULT_SYNC_CONFIG,
      scopeRoot: root,
    });
    await executeSyncPlan(plan, createEmptyManifest(), manifestPath);

    const agentStat = await lstat(
      join(root, '.claude', 'agents', 'my-agent.md'),
    );
    expect(agentStat.isSymbolicLink()).toBe(true);
  });

  it('file-based agent: syncs via copy mode with correct hash', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-engine-int-'));
    tempDirs.push(root);
    const adapter = createTestAdapter({ defaultStrategy: 'copy' });
    const manifestPath = join(root, '.oat', 'sync', 'manifest.json');

    await mkdir(join(root, '.agents', 'agents'), { recursive: true });
    await writeFile(
      join(root, '.agents', 'agents', 'my-agent.md'),
      '# My Agent\n',
      'utf8',
    );

    const canonical = await scanCanonical(root, 'project');
    const plan = await computeSyncPlan({
      canonical,
      adapters: [adapter],
      manifest: createEmptyManifest(),
      scope: 'project',
      config: COPY_SYNC_CONFIG,
      scopeRoot: root,
    });
    await executeSyncPlan(plan, createEmptyManifest(), manifestPath);

    const copiedContent = await readFile(
      join(root, '.claude', 'agents', 'my-agent.md'),
      'utf8',
    );
    expect(copiedContent).toBe('# My Agent\n');

    const manifest = await loadManifest(manifestPath);
    const agentEntry = manifest.entries.find(
      (entry) => entry.canonicalPath === '.agents/agents/my-agent.md',
    );
    expect(agentEntry?.strategy).toBe('copy');
    expect(agentEntry?.contentHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('file-based agent: removal cleans up provider path', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-engine-int-'));
    tempDirs.push(root);
    const adapter = createTestAdapter();
    const manifestPath = join(root, '.oat', 'sync', 'manifest.json');

    await mkdir(join(root, '.agents', 'agents'), { recursive: true });
    await writeFile(
      join(root, '.agents', 'agents', 'my-agent.md'),
      '# My Agent\n',
      'utf8',
    );

    const firstCanonical = await scanCanonical(root, 'project');
    const firstPlan = await computeSyncPlan({
      canonical: firstCanonical,
      adapters: [adapter],
      manifest: createEmptyManifest(),
      scope: 'project',
      config: DEFAULT_SYNC_CONFIG,
      scopeRoot: root,
    });
    await executeSyncPlan(firstPlan, createEmptyManifest(), manifestPath);

    await rm(join(root, '.agents', 'agents', 'my-agent.md'));

    const canonical = await scanCanonical(root, 'project');
    const manifest = await loadManifest(manifestPath);
    const plan = await computeSyncPlan({
      canonical,
      adapters: [adapter],
      manifest,
      scope: 'project',
      config: DEFAULT_SYNC_CONFIG,
      scopeRoot: root,
    });
    expect(plan.removals.some((entry) => entry.operation === 'remove')).toBe(
      true,
    );

    await executeSyncPlan(plan, manifest, manifestPath);
    await expect(
      lstat(join(root, '.claude', 'agents', 'my-agent.md')),
    ).rejects.toThrow();
  });

  it('scope filtering: user scope skips agents', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-engine-int-'));
    tempDirs.push(root);
    const adapter = createTestAdapter();
    const manifestPath = join(root, '.oat', 'sync', 'manifest.json');
    await seedCanonical(root);

    const canonical = await scanCanonical(root, 'user');
    const plan = await computeSyncPlan({
      canonical,
      adapters: [adapter],
      manifest: createEmptyManifest(),
      scope: 'user',
      config: DEFAULT_SYNC_CONFIG,
      scopeRoot: root,
    });
    await executeSyncPlan(plan, createEmptyManifest(), manifestPath);

    const skillStat = await lstat(join(root, '.claude', 'skills', 'skill-one'));
    expect(skillStat.isSymbolicLink()).toBe(true);
    await expect(
      lstat(join(root, '.claude', 'agents', 'agent-one')),
    ).rejects.toThrow();
  });

  it('materializes Claude reviewer and implementer files at user scope', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-engine-int-'));
    tempDirs.push(root);
    const manifestPath = join(root, '.oat', 'sync', 'manifest.json');
    await mkdir(join(root, '.agents', 'agents'), { recursive: true });
    for (const name of ['oat-reviewer.md', 'oat-phase-implementer.md']) {
      await writeFile(
        join(root, '.agents', 'agents', name),
        `---\nname: ${name.replace('.md', '')}\ndescription: managed\n---\n`,
        'utf8',
      );
    }

    const canonical = await scanCanonical(
      root,
      'user',
      claudeAdapter.userMappings.map(({ contentType, canonicalDir }) => ({
        contentType,
        canonicalDir,
      })),
    );
    const plan = await computeSyncPlan({
      canonical,
      adapters: [claudeAdapter],
      manifest: createEmptyManifest(),
      scope: 'user',
      config: DEFAULT_SYNC_CONFIG,
      scopeRoot: root,
    });
    const result = await executeSyncPlan(
      plan,
      createEmptyManifest(),
      manifestPath,
    );

    expect(result.operations?.map(({ status }) => status)).toEqual([
      'changed',
      'changed',
    ]);
    for (const name of ['oat-reviewer.md', 'oat-phase-implementer.md']) {
      await expect(
        lstat(join(root, '.claude', 'agents', name)),
      ).resolves.toMatchObject({});
    }
  });

  it('retires project Cursor skill copies without affecting active mappings or local skills', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-engine-int-'));
    tempDirs.push(root);
    const manifestPath = join(root, '.oat', 'sync', 'manifest.json');
    await mkdir(join(root, '.cursor'), { recursive: true });
    await seedCanonical(root);
    await mkdir(join(root, '.agents', 'skills', 'skill-two'), {
      recursive: true,
    });
    await writeFile(
      join(root, '.agents', 'skills', 'skill-two', 'SKILL.md'),
      '# skill two\n',
      'utf8',
    );
    await mkdir(join(root, '.agents', 'rules'), { recursive: true });
    await writeFile(
      join(root, '.agents', 'rules', 'rule-one.md'),
      '---\ndescription: Rule one\nactivation: always\n---\n\n# Rule One\n',
      'utf8',
    );

    const canonical = await scanCanonical(root, 'project');
    const legacyAdapter = createLegacyCursorAdapter('copy');
    const legacyPlan = await computeSyncPlan({
      canonical,
      adapters: [legacyAdapter],
      manifest: createEmptyManifest(),
      scope: 'project',
      config: COPY_SYNC_CONFIG,
      scopeRoot: root,
    });
    await executeSyncPlan(legacyPlan, createEmptyManifest(), manifestPath);

    const modifiedPath = join(root, '.cursor', 'skills', 'skill-two');
    await writeFile(
      join(modifiedPath, 'SKILL.md'),
      '# user-modified skill two\n',
      'utf8',
    );
    const unmanagedPath = join(root, '.cursor', 'skills', 'cursor-only');
    await mkdir(unmanagedPath, { recursive: true });
    await writeFile(join(unmanagedPath, 'SKILL.md'), '# cursor only\n', 'utf8');

    const legacyManifest = await loadManifest(manifestPath);
    const retirementPlan = await computeSyncPlan({
      canonical,
      adapters: [cursorAdapter],
      manifest: legacyManifest,
      scope: 'project',
      config: DEFAULT_SYNC_CONFIG,
      scopeRoot: root,
    });

    expect(
      retirementPlan.removals.find(
        (entry) => entry.canonical.name === 'skill-one',
      ),
    ).toMatchObject({ operation: 'remove' });
    expect(
      retirementPlan.removals.find(
        (entry) => entry.canonical.name === 'skill-two',
      ),
    ).toMatchObject({ operation: 'detach' });

    await executeSyncPlan(retirementPlan, legacyManifest, manifestPath);
    await expect(
      lstat(join(root, '.cursor', 'skills', 'skill-one')),
    ).rejects.toMatchObject({ code: 'ENOENT' });
    await expect(
      readFile(join(modifiedPath, 'SKILL.md'), 'utf8'),
    ).resolves.toBe('# user-modified skill two\n');
    await expect(
      readFile(join(unmanagedPath, 'SKILL.md'), 'utf8'),
    ).resolves.toBe('# cursor only\n');
    await expect(
      lstat(join(root, '.cursor', 'agents', 'agent-one')),
    ).resolves.toBeDefined();
    await expect(
      lstat(join(root, '.cursor', 'rules', 'rule-one.mdc')),
    ).resolves.toBeDefined();

    const updatedManifest = await loadManifest(manifestPath);
    expect(
      updatedManifest.entries.filter(
        (entry) => entry.provider === 'cursor' && entry.contentType === 'skill',
      ),
    ).toEqual([]);
    expect(
      updatedManifest.entries.some(
        (entry) => entry.provider === 'cursor' && entry.contentType === 'agent',
      ),
    ).toBe(true);
    expect(
      updatedManifest.entries.some(
        (entry) => entry.provider === 'cursor' && entry.contentType === 'rule',
      ),
    ).toBe(true);

    const subsequentPlan = await computeSyncPlan({
      canonical,
      adapters: [cursorAdapter],
      manifest: updatedManifest,
      scope: 'project',
      config: DEFAULT_SYNC_CONFIG,
      scopeRoot: root,
    });
    expect(
      [...subsequentPlan.entries, ...subsequentPlan.removals].filter(
        (entry) => entry.canonical.type === 'skill',
      ),
    ).toEqual([]);
  });

  it('retires user Cursor skill symlinks while preserving replaced content', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-engine-int-'));
    tempDirs.push(root);
    const manifestPath = join(root, '.oat', 'sync', 'manifest.json');
    await mkdir(join(root, '.cursor'), { recursive: true });
    await mkdir(join(root, '.agents', 'skills', 'skill-one'), {
      recursive: true,
    });
    await mkdir(join(root, '.agents', 'skills', 'skill-two'), {
      recursive: true,
    });
    await writeFile(
      join(root, '.agents', 'skills', 'skill-one', 'SKILL.md'),
      '# skill one\n',
      'utf8',
    );
    await writeFile(
      join(root, '.agents', 'skills', 'skill-two', 'SKILL.md'),
      '# skill two\n',
      'utf8',
    );

    const canonical = await scanCanonical(root, 'user');
    const legacyAdapter = createLegacyCursorAdapter();
    const legacyPlan = await computeSyncPlan({
      canonical,
      adapters: [legacyAdapter],
      manifest: createEmptyManifest(),
      scope: 'user',
      config: DEFAULT_SYNC_CONFIG,
      scopeRoot: root,
    });
    await executeSyncPlan(legacyPlan, createEmptyManifest(), manifestPath);

    const replacedPath = join(root, '.cursor', 'skills', 'skill-two');
    await rm(replacedPath, { recursive: true, force: true });
    await mkdir(replacedPath, { recursive: true });
    await writeFile(
      join(replacedPath, 'SKILL.md'),
      '# user replacement\n',
      'utf8',
    );

    const legacyManifest = await loadManifest(manifestPath);
    const retirementPlan = await computeSyncPlan({
      canonical,
      adapters: [cursorAdapter],
      manifest: legacyManifest,
      scope: 'user',
      config: DEFAULT_SYNC_CONFIG,
      scopeRoot: root,
    });
    await executeSyncPlan(retirementPlan, legacyManifest, manifestPath);

    await expect(
      lstat(join(root, '.cursor', 'skills', 'skill-one')),
    ).rejects.toMatchObject({ code: 'ENOENT' });
    await expect(
      readFile(join(replacedPath, 'SKILL.md'), 'utf8'),
    ).resolves.toBe('# user replacement\n');
    const updatedManifest = await loadManifest(manifestPath);
    expect(
      updatedManifest.entries.filter(
        (entry) => entry.provider === 'cursor' && entry.contentType === 'skill',
      ),
    ).toEqual([]);
  });

  it('retires user Copilot skill symlinks while preserving replaced content', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-engine-int-'));
    tempDirs.push(root);
    const manifestPath = join(root, '.oat', 'sync', 'manifest.json');
    await mkdir(join(root, '.agents', 'skills', 'skill-one'), {
      recursive: true,
    });
    await mkdir(join(root, '.agents', 'skills', 'skill-two'), {
      recursive: true,
    });
    await writeFile(
      join(root, '.agents', 'skills', 'skill-one', 'SKILL.md'),
      '# skill one\n',
      'utf8',
    );
    await writeFile(
      join(root, '.agents', 'skills', 'skill-two', 'SKILL.md'),
      '# skill two\n',
      'utf8',
    );

    const canonical = await scanCanonical(root, 'user');
    const legacyPlan = await computeSyncPlan({
      canonical,
      adapters: [createLegacyCopilotAdapter()],
      manifest: createEmptyManifest(),
      scope: 'user',
      config: DEFAULT_SYNC_CONFIG,
      scopeRoot: root,
    });
    await executeSyncPlan(legacyPlan, createEmptyManifest(), manifestPath);

    const replacedPath = join(root, '.copilot', 'skills', 'skill-two');
    await rm(replacedPath, { recursive: true, force: true });
    await mkdir(replacedPath, { recursive: true });
    await writeFile(
      join(replacedPath, 'SKILL.md'),
      '# user replacement\n',
      'utf8',
    );

    const legacyManifest = await loadManifest(manifestPath);
    const retirementPlan = await computeSyncPlan({
      canonical,
      adapters: [copilotAdapter],
      manifest: legacyManifest,
      scope: 'user',
      config: DEFAULT_SYNC_CONFIG,
      scopeRoot: root,
    });
    await executeSyncPlan(retirementPlan, legacyManifest, manifestPath);

    await expect(
      lstat(join(root, '.copilot', 'skills', 'skill-one')),
    ).rejects.toMatchObject({ code: 'ENOENT' });
    await expect(
      readFile(join(replacedPath, 'SKILL.md'), 'utf8'),
    ).resolves.toBe('# user replacement\n');
    const updatedManifest = await loadManifest(manifestPath);
    expect(
      updatedManifest.entries.filter(
        (entry) =>
          entry.provider === 'copilot' && entry.contentType === 'skill',
      ),
    ).toEqual([]);
  });
});
