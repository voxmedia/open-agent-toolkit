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
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createEmptyManifest, loadManifest } from '../manifest/manager';
import type { SyncPlan, SyncPlanEntry } from './engine.types';
import { executeSyncPlan } from './execute-plan';
import { OAT_MARKER_PREFIX } from './markers';

function createCanonicalEntry(
  root: string,
  type: 'skill' | 'agent',
  name: string,
) {
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

function createPlan(
  entries: SyncPlanEntry[],
  removals: SyncPlanEntry[] = [],
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

describe('executeSyncPlan', () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(
      tempDirs.map(async (dir) => {
        await rm(dir, { recursive: true, force: true });
      }),
    );
    tempDirs.length = 0;
  });

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
    expect(copied.startsWith(OAT_MARKER_PREFIX)).toBe(true);
    expect(copied).toContain('copy me');
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
    expect(content.startsWith(OAT_MARKER_PREFIX)).toBe(true);
    expect(content).toContain('fresh');
  });

  it('removes provider path for remove entries', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-execute-plan-'));
    tempDirs.push(root);
    const manifestPath = join(root, '.oat', 'sync', 'manifest.json');
    await seedCanonical(root, 'skill-one');
    await mkdir(join(root, '.claude', 'skills', 'skill-one'), {
      recursive: true,
    });

    const removal = createEntry(root, 'skill-one', 'remove', 'symlink');
    const plan = createPlan([], [removal]);
    await executeSyncPlan(plan, createEmptyManifest(), manifestPath);

    await expect(
      lstat(join(root, '.claude', 'skills', 'skill-one')),
    ).rejects.toThrow();
  });

  it('skips skip entries (no filesystem changes)', async () => {
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
  });
});
