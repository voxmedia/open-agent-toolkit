import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';

import { DEFAULT_SYNC_CONFIG } from '@config/sync-config';
import { computeDirectoryHash } from '@manifest/hash';
import { createEmptyManifest } from '@manifest/manager';
import type { Manifest, ManifestEntry } from '@manifest/manifest.types';
import type { ProviderAdapter } from '@providers/shared/adapter.types';
import { afterEach, describe, expect, it } from 'vitest';

import { computeSyncPlan } from './compute-plan';
import { OAT_DIRECTORY_SENTINEL, OAT_MARKER_PREFIX } from './markers';
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

function createCursorNativeSkillAdapter(): ProviderAdapter {
  return createTestAdapter({
    name: 'cursor',
    projectMappings: [
      {
        contentType: 'skill',
        canonicalDir: '.agents/skills',
        providerDir: '.agents/skills',
        nativeRead: true,
        adoptionSourceDirs: ['.cursor/skills'],
      },
      {
        contentType: 'agent',
        canonicalDir: '.agents/agents',
        providerDir: '.cursor/agents',
        nativeRead: false,
      },
    ],
  });
}

function createCursorSkillManifestEntry(
  overrides: Partial<ManifestEntry> = {},
): ManifestEntry {
  return {
    canonicalPath: '.agents/skills/skill-one',
    providerPath: '.cursor/skills/skill-one',
    provider: 'cursor',
    contentType: 'skill',
    strategy: 'symlink',
    contentHash: null,
    isFile: false,
    lastSynced: new Date().toISOString(),
    ...overrides,
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

  it('refuses to classify entries beneath a symlinked provider parent', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-compute-plan-'));
    tempDirs.push(root);
    await mkdir(join(root, '.agents', 'skills', 'skill-one'), {
      recursive: true,
    });
    await mkdir(join(root, '.claude'), { recursive: true });
    await symlink(
      join('..', '.agents', 'skills'),
      join(root, '.claude', 'skills'),
      'dir',
    );

    await expect(
      computeSyncPlan({
        canonical: [createCanonicalEntry(root, 'skill', 'skill-one')],
        adapters: [createTestAdapter()],
        manifest: createEmptyManifest(),
        scope: 'project',
        config: DEFAULT_SYNC_CONFIG,
        scopeRoot: root,
      }),
    ).rejects.toThrow(/symbolic link/i);
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

  it('removes verified clean symlinks when a mapping becomes native-read', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-compute-plan-'));
    tempDirs.push(root);
    const canonicalPath = join(root, '.agents', 'skills', 'skill-one');
    const providerPath = join(root, '.cursor', 'skills', 'skill-one');
    await mkdir(canonicalPath, { recursive: true });
    await mkdir(join(root, '.cursor', 'skills'), { recursive: true });
    await symlink(canonicalPath, providerPath, 'dir');

    const plan = await computeSyncPlan({
      canonical: [createCanonicalEntry(root, 'skill', 'skill-one')],
      adapters: [createCursorNativeSkillAdapter()],
      manifest: manifestWithEntry(createCursorSkillManifestEntry()),
      scope: 'project',
      config: DEFAULT_SYNC_CONFIG,
      scopeRoot: root,
    });

    expect(plan.removals).toEqual([
      expect.objectContaining({
        operation: 'remove',
        reason: 'obsolete mapping has verified clean managed symlink',
        providerPath,
      }),
    ]);
  });

  it('detaches missing obsolete mapping rows without planning deletion', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-compute-plan-'));
    tempDirs.push(root);
    await mkdir(join(root, '.agents', 'skills', 'skill-one'), {
      recursive: true,
    });

    const plan = await computeSyncPlan({
      canonical: [createCanonicalEntry(root, 'skill', 'skill-one')],
      adapters: [createCursorNativeSkillAdapter()],
      manifest: manifestWithEntry(createCursorSkillManifestEntry()),
      scope: 'project',
      config: DEFAULT_SYNC_CONFIG,
      scopeRoot: root,
    });

    expect(plan.removals).toEqual([
      expect.objectContaining({
        operation: 'detach',
        reason:
          'obsolete mapping provider path is missing; detach manifest ownership',
      }),
    ]);
  });

  it.each([
    {
      name: 'replaced path',
      seedProvider: async (root: string) => {
        const providerPath = join(root, '.cursor', 'skills', 'skill-one');
        await mkdir(providerPath, { recursive: true });
        await writeFile(join(providerPath, 'SKILL.md'), 'user content', 'utf8');
      },
    },
    {
      name: 'broken symlink',
      seedProvider: async (root: string) => {
        await mkdir(join(root, '.cursor', 'skills'), { recursive: true });
        await symlink(
          join(root, '.agents', 'skills', 'missing'),
          join(root, '.cursor', 'skills', 'skill-one'),
          'dir',
        );
      },
    },
  ])('preserves and detaches an obsolete $name', async ({ seedProvider }) => {
    const root = await mkdtemp(join(tmpdir(), 'oat-compute-plan-'));
    tempDirs.push(root);
    await mkdir(join(root, '.agents', 'skills', 'skill-one'), {
      recursive: true,
    });
    await seedProvider(root);

    const plan = await computeSyncPlan({
      canonical: [createCanonicalEntry(root, 'skill', 'skill-one')],
      adapters: [createCursorNativeSkillAdapter()],
      manifest: manifestWithEntry(createCursorSkillManifestEntry()),
      scope: 'project',
      config: DEFAULT_SYNC_CONFIG,
      scopeRoot: root,
    });

    expect(plan.removals).toEqual([
      expect.objectContaining({
        operation: 'detach',
        reason:
          'obsolete mapping provider path is changed or unverified; preserve and detach manifest ownership',
      }),
    ]);
  });

  it('removes a verified clean generated directory copy for an obsolete mapping', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-compute-plan-'));
    tempDirs.push(root);
    const canonicalPath = join(root, '.agents', 'skills', 'skill-one');
    const providerPath = join(root, '.cursor', 'skills', 'skill-one');
    await mkdir(canonicalPath, { recursive: true });
    await writeFile(join(canonicalPath, 'SKILL.md'), '# skill\n', 'utf8');
    const contentHash = await computeDirectoryHash(canonicalPath);
    await mkdir(providerPath, { recursive: true });
    const marker = `${OAT_MARKER_PREFIX} Source: ${canonicalPath} -->`;
    await writeFile(
      join(providerPath, 'SKILL.md'),
      `${marker}\n# skill\n`,
      'utf8',
    );
    await writeFile(
      join(providerPath, OAT_DIRECTORY_SENTINEL),
      `${marker}\n`,
      'utf8',
    );

    const plan = await computeSyncPlan({
      canonical: [createCanonicalEntry(root, 'skill', 'skill-one')],
      adapters: [createCursorNativeSkillAdapter()],
      manifest: manifestWithEntry(
        createCursorSkillManifestEntry({
          strategy: 'copy',
          contentHash,
        }),
      ),
      scope: 'project',
      config: DEFAULT_SYNC_CONFIG,
      scopeRoot: root,
    });

    expect(plan.removals).toEqual([
      expect.objectContaining({
        operation: 'remove',
        reason: 'obsolete mapping has verified clean managed copy',
      }),
    ]);
  });

  it('preserves a modified generated copy while detaching obsolete ownership', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-compute-plan-'));
    tempDirs.push(root);
    const canonicalPath = join(root, '.agents', 'skills', 'skill-one');
    const providerPath = join(root, '.cursor', 'skills', 'skill-one');
    await mkdir(canonicalPath, { recursive: true });
    await writeFile(join(canonicalPath, 'SKILL.md'), '# skill\n', 'utf8');
    const contentHash = await computeDirectoryHash(canonicalPath);
    await mkdir(providerPath, { recursive: true });
    const marker = `${OAT_MARKER_PREFIX} Source: ${canonicalPath} -->`;
    await writeFile(
      join(providerPath, 'SKILL.md'),
      `${marker}\n# user-modified skill\n`,
      'utf8',
    );
    await writeFile(
      join(providerPath, OAT_DIRECTORY_SENTINEL),
      `${marker}\n`,
      'utf8',
    );

    const plan = await computeSyncPlan({
      canonical: [createCanonicalEntry(root, 'skill', 'skill-one')],
      adapters: [createCursorNativeSkillAdapter()],
      manifest: manifestWithEntry(
        createCursorSkillManifestEntry({
          strategy: 'copy',
          contentHash,
        }),
      ),
      scope: 'project',
      config: DEFAULT_SYNC_CONFIG,
      scopeRoot: root,
    });

    expect(plan.removals).toEqual([
      expect.objectContaining({
        operation: 'detach',
        reason:
          'obsolete mapping provider path is changed or unverified; preserve and detach manifest ownership',
      }),
    ]);
  });

  it.each([
    {
      allowedCanonicalPaths: undefined,
      expectedRemovals: ['.claude/skills/oat-project-new'],
    },
    {
      allowedCanonicalPaths: ['.agents/skills/oat-docs-analyze'],
      expectedRemovals: [],
    },
  ])(
    'scopes stale manifest removals to install-triggered canonical filters ($allowedCanonicalPaths)',
    async ({ allowedCanonicalPaths, expectedRemovals }) => {
      const root = await mkdtemp(join(tmpdir(), 'oat-compute-plan-'));
      tempDirs.push(root);
      const claudeAdapter = createTestAdapter({ name: 'claude' });
      await mkdir(join(root, '.agents', 'skills', 'oat-docs-analyze'), {
        recursive: true,
      });

      const plan = await computeSyncPlan({
        canonical: [createCanonicalEntry(root, 'skill', 'oat-docs-analyze')],
        adapters: [claudeAdapter],
        manifest: {
          ...createEmptyManifest(),
          entries: [
            {
              canonicalPath: '.agents/skills/oat-project-new',
              providerPath: '.claude/skills/oat-project-new',
              provider: 'claude',
              contentType: 'skill',
              strategy: 'symlink',
              contentHash: null,
              lastSynced: new Date().toISOString(),
            },
          ],
        },
        scope: 'project',
        config: DEFAULT_SYNC_CONFIG,
        scopeRoot: root,
        allowedCanonicalPaths,
      });

      expect(
        plan.removals.map((entry) => relative(root, entry.providerPath)),
      ).toEqual(expectedRemovals);
    },
  );

  it('scopes install-triggered sync entries to the allowed canonical paths', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-compute-plan-'));
    tempDirs.push(root);
    await mkdir(join(root, '.agents', 'skills', 'oat-docs-analyze'), {
      recursive: true,
    });
    await mkdir(join(root, '.agents', 'skills', 'analyze'), {
      recursive: true,
    });

    const plan = await computeSyncPlan({
      canonical: [
        createCanonicalEntry(root, 'skill', 'oat-docs-analyze'),
        createCanonicalEntry(root, 'skill', 'analyze'),
      ],
      adapters: [createTestAdapter({ name: 'claude' })],
      manifest: createEmptyManifest(),
      scope: 'project',
      config: DEFAULT_SYNC_CONFIG,
      scopeRoot: root,
      allowedCanonicalPaths: ['.agents/skills/oat-docs-analyze'],
    });

    expect(plan.entries.map((entry) => entry.canonical.name)).toEqual([
      'oat-docs-analyze',
    ]);
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

  it('excludes provider-owned extension agents from core user planning', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-compute-plan-'));
    tempDirs.push(root);
    await mkdir(join(root, '.agents', 'agents'), { recursive: true });
    await writeFile(
      join(root, '.agents', 'agents', 'oat-reviewer.md'),
      '# reviewer\n',
      'utf8',
    );
    const adapter = createTestAdapter({
      userMappings: [
        {
          contentType: 'agent',
          canonicalDir: '.agents/agents',
          providerDir: '.provider/agents',
          nativeRead: false,
        },
      ],
    });

    const plan = await computeSyncPlan({
      canonical: [createCanonicalEntry(root, 'agent', 'oat-reviewer.md')],
      adapters: [adapter],
      manifest: createEmptyManifest(),
      scope: 'user',
      config: DEFAULT_SYNC_CONFIG,
      scopeRoot: root,
      extensionOwnedCanonicalPathsByProvider: {
        [adapter.name]: ['.agents/agents/oat-reviewer.md'],
      },
    });

    expect(plan.entries).toEqual([]);
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
