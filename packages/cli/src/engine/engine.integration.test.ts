import {
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readlink,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { DEFAULT_SYNC_CONFIG } from '@config/sync-config';
import { createSymlink } from '@fs/io';
import { createEmptyManifest, loadManifest } from '@manifest/manager';
import { afterEach, describe, expect, it } from 'vitest';

import { computeSyncPlan } from './compute-plan';
import { executeSyncPlan } from './execute-plan';
import { OAT_DIRECTORY_SENTINEL, OAT_MARKER_PREFIX } from './markers';
import { scanCanonical } from './scanner';
import { createTestAdapter } from './test-helpers';

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
      config: DEFAULT_SYNC_CONFIG,
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
      config: DEFAULT_SYNC_CONFIG,
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
});
