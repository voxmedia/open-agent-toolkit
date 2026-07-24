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

import { DEFAULT_SYNC_CONFIG } from '@config/sync-config';
import { createSymlink } from '@fs/io';
import { createEmptyManifest, loadManifest } from '@manifest/manager';
import { cursorAdapter } from '@providers/cursor/adapter';
import type { ProviderAdapter } from '@providers/shared/adapter.types';
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
      config: DEFAULT_SYNC_CONFIG,
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
});
