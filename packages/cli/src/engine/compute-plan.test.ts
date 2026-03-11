import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { DEFAULT_SYNC_CONFIG } from '@config/sync-config';
import { createEmptyManifest } from '@manifest/manager';
import type { Manifest, ManifestEntry } from '@manifest/manifest.types';
import { afterEach, describe, expect, it } from 'vitest';

import { computeSyncPlan } from './compute-plan';
import type { CanonicalEntry } from './scanner';
import { createTestAdapter } from './test-helpers';

function createCanonicalEntry(
  root: string,
  type: 'skill' | 'agent' | 'rule',
  name: string,
): CanonicalEntry {
  const canonicalDir =
    type === 'skill' ? 'skills' : type === 'agent' ? 'agents' : 'rules';
  return {
    name,
    type,
    canonicalPath: join(root, '.agents', canonicalDir, name),
    isFile: type === 'rule',
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
      adapters: [createTestAdapter()],
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
      adapters: [createTestAdapter()],
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
      adapters: [createTestAdapter()],
      manifest: createEmptyManifest(),
      scope: 'project',
      config: DEFAULT_SYNC_CONFIG,
      scopeRoot: root,
    });

    expect(plan.entries).toHaveLength(1);
    expect(plan.entries[0]?.operation).toBe('update_symlink');
  });

  it('creates update_symlink with missing-target reason for broken symlinks', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-compute-plan-'));
    tempDirs.push(root);
    const canonicalPath = join(root, '.agents', 'skills', 'skill-one');
    const missingTarget = join(root, '.agents', 'skills', 'missing-skill');
    const providerPath = join(root, '.claude', 'skills', 'skill-one');

    await mkdir(canonicalPath, { recursive: true });
    await mkdir(join(root, '.claude', 'skills'), { recursive: true });
    await symlink(missingTarget, providerPath, 'dir');

    const canonical = [createCanonicalEntry(root, 'skill', 'skill-one')];

    const plan = await computeSyncPlan({
      canonical,
      adapters: [createTestAdapter()],
      manifest: createEmptyManifest(),
      scope: 'project',
      config: DEFAULT_SYNC_CONFIG,
      scopeRoot: root,
    });

    expect(plan.entries).toHaveLength(1);
    expect(plan.entries[0]).toMatchObject({
      operation: 'update_symlink',
      reason: 'symlink target is missing',
    });
  });

  it('creates remove entry for manifest item whose canonical was deleted', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-compute-plan-'));
    tempDirs.push(root);

    const plan = await computeSyncPlan({
      canonical: [],
      adapters: [createTestAdapter()],
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
    const codexAdapter = createTestAdapter({
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

  it('forces copy strategy for transformed rule mappings and applies provider extensions', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-compute-plan-'));
    tempDirs.push(root);
    const canonicalFile = join(root, '.agents', 'rules', 'react-components.md');
    await mkdir(join(root, '.agents', 'rules'), { recursive: true });
    await writeFile(canonicalFile, '# canonical rule\n', 'utf8');

    const adapter = createTestAdapter({
      name: 'cursor',
      defaultStrategy: 'symlink',
      projectMappings: [
        {
          contentType: 'rule',
          canonicalDir: '.agents/rules',
          providerDir: '.cursor/rules',
          nativeRead: false,
          providerExtension: '.mdc',
          transformCanonical: () => '# rendered rule\n',
        },
      ],
      userMappings: [],
    });

    const plan = await computeSyncPlan({
      canonical: [createCanonicalEntry(root, 'rule', 'react-components.md')],
      adapters: [adapter],
      manifest: createEmptyManifest(),
      scope: 'project',
      config: DEFAULT_SYNC_CONFIG,
      scopeRoot: root,
    });

    expect(plan.entries).toHaveLength(1);
    expect(plan.entries[0]).toMatchObject({
      provider: 'cursor',
      strategy: 'copy',
      operation: 'create_copy',
      providerPath: join(root, '.cursor', 'rules', 'react-components.mdc'),
      renderedContent: '# rendered rule\n',
    });
  });

  it('skips transformed rule copies when rendered provider output already matches', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-compute-plan-'));
    tempDirs.push(root);
    await mkdir(join(root, '.agents', 'rules'), { recursive: true });
    await writeFile(
      join(root, '.agents', 'rules', 'react-components.md'),
      '# canonical rule\n',
      'utf8',
    );
    await mkdir(join(root, '.cursor', 'rules'), { recursive: true });
    await writeFile(
      join(root, '.cursor', 'rules', 'react-components.mdc'),
      '# rendered rule\n',
      'utf8',
    );

    const adapter = createTestAdapter({
      name: 'cursor',
      defaultStrategy: 'symlink',
      projectMappings: [
        {
          contentType: 'rule',
          canonicalDir: '.agents/rules',
          providerDir: '.cursor/rules',
          nativeRead: false,
          providerExtension: '.mdc',
          transformCanonical: () => '# rendered rule\n',
        },
      ],
      userMappings: [],
    });

    const plan = await computeSyncPlan({
      canonical: [createCanonicalEntry(root, 'rule', 'react-components.md')],
      adapters: [adapter],
      manifest: createEmptyManifest(),
      scope: 'project',
      config: DEFAULT_SYNC_CONFIG,
      scopeRoot: root,
    });

    expect(plan.entries).toHaveLength(1);
    expect(plan.entries[0]).toMatchObject({
      operation: 'skip',
      strategy: 'copy',
    });
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
      adapters: [createTestAdapter()],
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
      adapters: [createTestAdapter({ defaultStrategy: 'copy' })],
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

  it('plans auto strategy as symlink-first with runtime fallback in execution', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-compute-plan-'));
    tempDirs.push(root);
    await mkdir(join(root, '.agents', 'skills', 'skill-one'), {
      recursive: true,
    });

    const canonical = [createCanonicalEntry(root, 'skill', 'skill-one')];

    const plan = await computeSyncPlan({
      canonical,
      adapters: [
        createTestAdapter({
          defaultStrategy: 'auto',
        }),
      ],
      manifest: createEmptyManifest(),
      scope: 'project',
      config: {
        ...DEFAULT_SYNC_CONFIG,
        defaultStrategy: 'auto',
      },
      scopeRoot: root,
    });

    expect(plan.entries).toHaveLength(1);
    expect(plan.entries[0]).toMatchObject({
      operation: 'create_symlink',
      strategy: 'symlink',
    });
  });
});
