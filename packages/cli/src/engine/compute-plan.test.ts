import { mkdir, mkdtemp, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { DEFAULT_SYNC_CONFIG } from '../config/sync-config';
import { createEmptyManifest } from '../manifest/manager';
import type { Manifest, ManifestEntry } from '../manifest/manifest.types';
import type { ProviderAdapter } from '../providers/shared/adapter.types';
import { computeSyncPlan } from './compute-plan';
import type { CanonicalEntry } from './scanner';

function createAdapter(
  overrides: Partial<ProviderAdapter> = {},
): ProviderAdapter {
  return {
    name: 'claude',
    displayName: 'Claude Code',
    defaultStrategy: 'symlink',
    projectMappings: [
      {
        contentType: 'skill',
        canonicalDir: '.agents/skills',
        providerDir: '.claude/skills',
        nativeRead: false,
      },
      {
        contentType: 'agent',
        canonicalDir: '.agents/agents',
        providerDir: '.claude/agents',
        nativeRead: false,
      },
    ],
    userMappings: [
      {
        contentType: 'skill',
        canonicalDir: '.agents/skills',
        providerDir: '.claude/skills',
        nativeRead: false,
      },
    ],
    detect: async () => true,
    ...overrides,
  };
}

function createCanonicalEntry(
  root: string,
  type: 'skill' | 'agent',
  name: string,
): CanonicalEntry {
  return {
    name,
    type,
    canonicalPath: join(
      root,
      '.agents',
      type === 'skill' ? 'skills' : 'agents',
      name,
    ),
  };
}

function manifestWithEntry(entry: ManifestEntry): Manifest {
  const manifest = createEmptyManifest();
  return {
    ...manifest,
    entries: [entry],
  };
}

describe('computeSyncPlan', () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(
      tempDirs.map(async (dir) => {
        await rm(dir, { recursive: true, force: true });
      }),
    );
    tempDirs.length = 0;
  });

  it('creates create_symlink entry when canonical exists but provider path missing', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-compute-plan-'));
    tempDirs.push(root);
    await mkdir(join(root, '.agents', 'skills', 'skill-one'), {
      recursive: true,
    });

    const canonical = [createCanonicalEntry(root, 'skill', 'skill-one')];

    const plan = await computeSyncPlan({
      canonical,
      adapters: [createAdapter()],
      manifest: createEmptyManifest(),
      scope: 'project',
      config: DEFAULT_SYNC_CONFIG,
      scopeRoot: root,
    });

    expect(plan.entries).toHaveLength(1);
    expect(plan.entries[0]).toMatchObject({
      provider: 'claude',
      operation: 'create_symlink',
      strategy: 'symlink',
      providerPath: join(root, '.claude', 'skills', 'skill-one'),
    });
  });

  it('creates skip entry when symlink already correct', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-compute-plan-'));
    tempDirs.push(root);
    const canonicalPath = join(root, '.agents', 'skills', 'skill-one');
    const providerPath = join(root, '.claude', 'skills', 'skill-one');

    await mkdir(canonicalPath, { recursive: true });
    await mkdir(join(root, '.claude', 'skills'), { recursive: true });
    await symlink(canonicalPath, providerPath, 'dir');

    const canonical = [createCanonicalEntry(root, 'skill', 'skill-one')];

    const plan = await computeSyncPlan({
      canonical,
      adapters: [createAdapter()],
      manifest: createEmptyManifest(),
      scope: 'project',
      config: DEFAULT_SYNC_CONFIG,
      scopeRoot: root,
    });

    expect(plan.entries).toHaveLength(1);
    expect(plan.entries[0]?.operation).toBe('skip');
  });

  it('creates update_symlink when symlink target wrong', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-compute-plan-'));
    tempDirs.push(root);
    const canonicalPath = join(root, '.agents', 'skills', 'skill-one');
    const wrongTarget = join(root, '.agents', 'skills', 'skill-two');
    const providerPath = join(root, '.claude', 'skills', 'skill-one');

    await mkdir(canonicalPath, { recursive: true });
    await mkdir(wrongTarget, { recursive: true });
    await mkdir(join(root, '.claude', 'skills'), { recursive: true });
    await symlink(wrongTarget, providerPath, 'dir');

    const canonical = [createCanonicalEntry(root, 'skill', 'skill-one')];

    const plan = await computeSyncPlan({
      canonical,
      adapters: [createAdapter()],
      manifest: createEmptyManifest(),
      scope: 'project',
      config: DEFAULT_SYNC_CONFIG,
      scopeRoot: root,
    });

    expect(plan.entries).toHaveLength(1);
    expect(plan.entries[0]?.operation).toBe('update_symlink');
  });

  it('creates remove entry for manifest item whose canonical was deleted', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-compute-plan-'));
    tempDirs.push(root);

    const plan = await computeSyncPlan({
      canonical: [],
      adapters: [createAdapter()],
      manifest: manifestWithEntry({
        canonicalPath: '.agents/skills/skill-one',
        providerPath: '.claude/skills/skill-one',
        provider: 'claude',
        contentType: 'skill',
        strategy: 'symlink',
        contentHash: null,
        lastSynced: new Date().toISOString(),
      }),
      scope: 'project',
      config: DEFAULT_SYNC_CONFIG,
      scopeRoot: root,
    });

    expect(plan.removals).toHaveLength(1);
    expect(plan.removals[0]).toMatchObject({
      operation: 'remove',
      providerPath: join(root, '.claude', 'skills', 'skill-one'),
    });
  });

  it('filters out nativeRead mappings', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-compute-plan-'));
    tempDirs.push(root);
    await mkdir(join(root, '.agents', 'skills', 'skill-one'), {
      recursive: true,
    });

    const canonical = [createCanonicalEntry(root, 'skill', 'skill-one')];
    const codexAdapter = createAdapter({
      name: 'codex',
      projectMappings: [
        {
          contentType: 'skill',
          canonicalDir: '.agents/skills',
          providerDir: '.agents/skills',
          nativeRead: true,
        },
      ],
      userMappings: [],
    });

    const plan = await computeSyncPlan({
      canonical,
      adapters: [codexAdapter],
      manifest: createEmptyManifest(),
      scope: 'project',
      config: DEFAULT_SYNC_CONFIG,
      scopeRoot: root,
    });

    expect(plan.entries).toEqual([]);
  });

  it('respects scope content types (user scope: skills only)', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-compute-plan-'));
    tempDirs.push(root);
    await mkdir(join(root, '.agents', 'skills', 'skill-one'), {
      recursive: true,
    });
    await mkdir(join(root, '.agents', 'agents', 'agent-one'), {
      recursive: true,
    });

    const canonical = [
      createCanonicalEntry(root, 'skill', 'skill-one'),
      createCanonicalEntry(root, 'agent', 'agent-one'),
    ];

    const plan = await computeSyncPlan({
      canonical,
      adapters: [createAdapter()],
      manifest: createEmptyManifest(),
      scope: 'user',
      config: DEFAULT_SYNC_CONFIG,
      scopeRoot: root,
    });

    expect(plan.entries).toHaveLength(1);
    expect(plan.entries[0]?.canonical.type).toBe('skill');
  });

  it('uses copy strategy when adapter specifies copy', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-compute-plan-'));
    tempDirs.push(root);
    await mkdir(join(root, '.agents', 'skills', 'skill-one'), {
      recursive: true,
    });

    const canonical = [createCanonicalEntry(root, 'skill', 'skill-one')];

    const plan = await computeSyncPlan({
      canonical,
      adapters: [createAdapter({ defaultStrategy: 'copy' })],
      manifest: createEmptyManifest(),
      scope: 'project',
      config: DEFAULT_SYNC_CONFIG,
      scopeRoot: root,
    });

    expect(plan.entries).toHaveLength(1);
    expect(plan.entries[0]).toMatchObject({
      operation: 'create_copy',
      strategy: 'copy',
    });
  });
});
