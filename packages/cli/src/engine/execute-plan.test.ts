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
import { dirname, join, resolve } from 'node:path';

import { computeFileHash } from '@manifest/hash';
import { createEmptyManifest, loadManifest } from '@manifest/manager';
import { OAT_VERSION } from '@shared/oat-version';
import { afterEach, describe, expect, it } from 'vitest';

import type {
  RemovalSyncPlanEntry,
  SyncPlan,
  SyncPlanEntry,
} from './engine.types';
import { executeSyncPlan, inferScopeRoot } from './execute-plan';
import { OAT_DIRECTORY_SENTINEL, OAT_MARKER_PREFIX } from './markers';

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
