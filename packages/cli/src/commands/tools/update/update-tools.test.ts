import {
  chmod,
  lstat,
  mkdir,
  mkdtemp,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { CORE_SKILLS } from '@commands/init/tools/core/install-core';
import { DOCS_SKILLS } from '@commands/init/tools/docs/install-docs';
import { IDEA_SKILLS } from '@commands/init/tools/ideas/install-ideas';
import {
  copyDirWithStatus,
  copyFileWithStatus,
  type CopyStatus,
} from '@commands/init/tools/shared/copy-helpers';
import {
  BRAINSTORM_SKILLS,
  DOCS_SCRIPTS,
  RESEARCH_AGENTS,
  RESEARCH_SKILLS,
  UTILITY_SKILLS,
  WORKFLOW_AGENTS,
  WORKFLOW_SKILLS,
  WORKFLOW_SCRIPTS,
  WORKFLOW_TEMPLATES,
} from '@commands/init/tools/shared/skill-manifest';
import { removeTools } from '@commands/tools/remove/remove-tools';
import { inventoryScopedPack } from '@commands/tools/shared/pack-inventory';
import { reconcilePackLifecycles } from '@commands/tools/shared/pack-lifecycle';
import {
  hasScopedPackOwnershipEvidence,
  readScopedPackIntent,
  writeScopedPackIntent,
} from '@commands/tools/shared/scoped-pack-intent';
import type { ToolInfo } from '@commands/tools/shared/types';
import { readOatConfig, writeOatConfig } from '@config/oat-config';
import { resolveAssetsRoot } from '@fs/assets';
import { describe, expect, it, vi } from 'vitest';

import {
  type UpdateTarget,
  type UpdateToolsDependencies,
  updateTools,
} from './update-tools';

async function pathExists(path: string): Promise<boolean> {
  try {
    await lstat(path);
    return true;
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}

function createTool(overrides: Partial<ToolInfo> = {}): ToolInfo {
  return {
    name: 'oat-idea-new',
    type: 'skill',
    scope: 'project',
    version: '1.0.0',
    bundledVersion: '2.0.0',
    pack: 'ideas',
    status: 'outdated',
    ...overrides,
  };
}

function createDeps(
  toolsByScope: Record<string, ToolInfo[]> = {},
  missingPaths: string[] = [],
): UpdateToolsDependencies & {
  copies: Array<{ source: string; dest: string }>;
  chmods: Array<{ path: string; mode: number }>;
} {
  const copies: Array<{ source: string; dest: string }> = [];
  const chmods: Array<{ path: string; mode: number }> = [];
  const missing = new Set(missingPaths);
  return {
    copies,
    chmods,
    scanTools: async (options) => toolsByScope[options.scope] ?? [],
    resolveScopeRoot: async (scope) =>
      scope === 'project' ? '/project' : '/home/user',
    resolveAssetsRoot: async () => '/assets',
    copyDirWithStatus: async (source, dest): Promise<CopyStatus> => {
      copies.push({ source, dest });
      return 'updated';
    },
    copyFileWithStatus: async (source, dest): Promise<CopyStatus> => {
      copies.push({ source, dest });
      return 'updated';
    },
    fileExists: async (path) => !missing.has(path),
    chmod: async (path, mode) => {
      chmods.push({ path, mode });
    },
  };
}

describe('updateTools', () => {
  it('updates a single outdated skill by name', async () => {
    const tool = createTool();
    const deps = createDeps({ project: [tool] });
    const target: UpdateTarget = { kind: 'name', name: 'oat-idea-new' };

    const result = await updateTools(
      target,
      ['project'],
      '/cwd',
      '/home',
      false,
      deps,
    );

    expect(result.updated).toHaveLength(1);
    expect(result.updated[0]!.name).toBe('oat-idea-new');
    expect(deps.copies).toHaveLength(1);
    expect(deps.copies[0]!.source).toContain('skills/oat-idea-new');
  });

  it('keeps name-targeted updates scoped to the named tool', async () => {
    const tool = createTool({ name: IDEA_SKILLS[0] });
    const deps = createDeps({ project: [tool] });

    const result = await updateTools(
      { kind: 'name', name: IDEA_SKILLS[0]! },
      ['project'],
      '/cwd',
      '/home',
      false,
      deps,
    );

    expect(result.updated.map((entry) => entry.name)).toEqual([IDEA_SKILLS[0]]);
    expect(deps.copies).toHaveLength(1);
    expect(deps.copies[0]!.source).toContain(`skills/${IDEA_SKILLS[0]}`);
    expect(
      deps.copies.some((copy) =>
        copy.source.includes(`skills/${IDEA_SKILLS[1]}`),
      ),
    ).toBe(false);
  });

  it('updates a single outdated agent by name', async () => {
    const tool = createTool({
      name: 'oat-reviewer',
      type: 'agent',
    });
    const deps = createDeps({ project: [tool] });

    const result = await updateTools(
      { kind: 'name', name: 'oat-reviewer' },
      ['project'],
      '/cwd',
      '/home',
      false,
      deps,
    );

    expect(result.updated).toHaveLength(1);
    expect(deps.copies[0]!.source).toContain('agents/oat-reviewer.md');
  });

  it('reports current tool without copying', async () => {
    const tool = createTool({
      status: 'current',
      version: '1.0.0',
      bundledVersion: '1.0.0',
    });
    const deps = createDeps({ project: [tool] });

    const result = await updateTools(
      { kind: 'name', name: 'oat-idea-new' },
      ['project'],
      '/cwd',
      '/home',
      false,
      deps,
    );

    expect(result.current).toHaveLength(1);
    expect(result.updated).toHaveLength(0);
    expect(deps.copies).toHaveLength(0);
  });

  it('reports newer tool without copying', async () => {
    const tool = createTool({
      status: 'newer',
      version: '3.0.0',
      bundledVersion: '1.0.0',
    });
    const deps = createDeps({ project: [tool] });

    const result = await updateTools(
      { kind: 'name', name: 'oat-idea-new' },
      ['project'],
      '/cwd',
      '/home',
      false,
      deps,
    );

    expect(result.newer).toHaveLength(1);
    expect(deps.copies).toHaveLength(0);
  });

  it('errors when tool name not found', async () => {
    const deps = createDeps({ project: [] });

    const result = await updateTools(
      { kind: 'name', name: 'nonexistent' },
      ['project'],
      '/cwd',
      '/home',
      false,
      deps,
    );

    expect(result.notInstalled).toEqual(['nonexistent']);
  });

  it('updates all outdated tools in a pack', async () => {
    const tools = [
      createTool({ name: 'oat-idea-new' }),
      createTool({ name: 'oat-idea-ideate' }),
      createTool({
        name: 'oat-project-new',
        pack: 'workflows',
        status: 'current',
      }),
    ];
    const deps = createDeps({ project: tools });

    const result = await updateTools(
      { kind: 'pack', pack: 'ideas' },
      ['project'],
      '/cwd',
      '/home',
      false,
      deps,
    );

    expect(result.updated.map((tool) => tool.name).sort()).toEqual(
      [...IDEA_SKILLS].sort(),
    );
    expect(result.current).toHaveLength(0);
    expect(deps.copies).toHaveLength(IDEA_SKILLS.length);
  });

  it('updates the brainstorm pack to bundled versions', async () => {
    const tools = BRAINSTORM_SKILLS.map((name) =>
      createTool({ name, pack: 'brainstorm' }),
    );
    const deps = createDeps({ project: tools });

    const result = await updateTools(
      { kind: 'pack', pack: 'brainstorm' },
      ['project'],
      '/cwd',
      '/home',
      false,
      deps,
    );

    expect(result.updated.map((tool) => tool.name).sort()).toEqual(
      [...BRAINSTORM_SKILLS].sort(),
    );
    expect(deps.copies).toHaveLength(BRAINSTORM_SKILLS.length);
    for (const skill of BRAINSTORM_SKILLS) {
      expect(
        deps.copies.some((copy) => copy.source.includes(`skills/${skill}`)),
      ).toBe(true);
    }
  });

  it('reconciles both orchestration skills in the utility pack', async () => {
    const tools = [
      createTool({
        name: 'oat-dispatch-subagents',
        pack: 'utility',
        status: 'current',
        version: '1.0.0',
        bundledVersion: '1.0.0',
      }),
    ];
    const deps = createDeps({ project: tools });

    const result = await updateTools(
      { kind: 'pack', pack: 'utility' },
      ['project'],
      '/cwd',
      '/home',
      false,
      deps,
    );

    expect(UTILITY_SKILLS).toContain('oat-dispatch-subagents');
    expect(UTILITY_SKILLS).toContain('subagent-orchestration');
    expect(result.current.map((tool) => tool.name)).toEqual([
      'oat-dispatch-subagents',
    ]);
    expect(result.updated.map((tool) => tool.name)).toContain(
      'subagent-orchestration',
    );
    expect(deps.copies).toContainEqual({
      source: '/assets/skills/subagent-orchestration',
      dest: '/project/.agents/skills/subagent-orchestration',
    });
  });

  it('installs missing bundled members for a targeted installed pack', async () => {
    const tools = [
      createTool({
        name: IDEA_SKILLS[0],
        status: 'current',
        version: '1.0.0',
        bundledVersion: '1.0.0',
      }),
    ];
    const deps = createDeps({ project: tools });

    const result = await updateTools(
      { kind: 'pack', pack: 'ideas' },
      ['project'],
      '/cwd',
      '/home',
      false,
      deps,
    );

    expect(result.current.map((tool) => tool.name)).toEqual([IDEA_SKILLS[0]]);
    expect(result.updated.map((tool) => tool.name).sort()).toEqual(
      IDEA_SKILLS.slice(1).sort(),
    );
    expect(deps.copies).toHaveLength(IDEA_SKILLS.length - 1);
  });

  it('updates all outdated tools when --all', async () => {
    const tools = [
      createTool({ name: 'oat-idea-new' }),
      createTool({ name: 'oat-project-new', pack: 'workflows' }),
      createTool({
        name: 'oat-docs-analyze',
        pack: 'docs',
        status: 'current',
      }),
    ];
    const deps = createDeps({ project: tools });

    const result = await updateTools(
      { kind: 'all' },
      ['project'],
      '/cwd',
      '/home',
      false,
      deps,
    );

    const expectedUpdated = [
      ...IDEA_SKILLS,
      ...WORKFLOW_SKILLS,
      ...WORKFLOW_AGENTS.map((name) => name.replace(/\.md$/, '')),
      ...DOCS_SKILLS.filter((name) => name !== 'oat-docs-analyze'),
    ].sort();

    expect(result.updated.map((tool) => tool.name).sort()).toEqual(
      expectedUpdated,
    );
    expect(result.current).toHaveLength(1);
    expect(
      deps.copies.some((copy) => copy.source === `/assets/templates/plan.md`),
    ).toBe(false);
    expect(
      deps.copies.some(
        (copy) => copy.source === '/assets/scripts/resolve-tracking.sh',
      ),
    ).toBe(true);
  });

  it('reconciles only packs already installed in a scope when using --all', async () => {
    const tools = [
      createTool({
        name: CORE_SKILLS[0],
        scope: 'user',
        pack: 'core',
        status: 'current',
        version: '1.0.0',
        bundledVersion: '1.0.0',
      }),
    ];
    const deps = createDeps({ user: tools });

    const result = await updateTools(
      { kind: 'all' },
      ['user'],
      '/cwd',
      '/home',
      false,
      deps,
    );

    expect(result.current.map((tool) => tool.name)).toEqual([CORE_SKILLS[0]]);
    expect(result.updated.map((tool) => tool.name)).toEqual([CORE_SKILLS[1]]);
    expect(result.updated.every((tool) => tool.pack === 'core')).toBe(true);
    expect(deps.copies).toHaveLength(1);
    expect(deps.copies[0]!.dest).toContain(
      `/home/user/.agents/skills/${CORE_SKILLS[1]}`,
    );
  });

  it('dry-run reports without copying', async () => {
    const tool = createTool();
    const deps = createDeps({ project: [tool] });

    const result = await updateTools(
      { kind: 'name', name: 'oat-idea-new' },
      ['project'],
      '/cwd',
      '/home',
      true,
      deps,
    );

    expect(result.updated).toHaveLength(1);
    expect(deps.copies).toHaveLength(0);
  });

  it('treats a declared-only pack as not installed without reconciling or writing', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-update-pack-lifecycle-'));
    try {
      const assetsRoot = await resolveAssetsRoot();
      await writeScopedPackIntent({
        pack: 'docs',
        scope: 'user',
        scopeRoot: root,
        enabled: true,
      });
      const deps = createDeps();
      deps.resolveAssetsRoot = async () => assetsRoot;
      deps.resolveScopeRoot = async () => root;
      deps.inventoryScopedPack = inventoryScopedPack;
      const reconcilePacks = vi.fn(reconcilePackLifecycles);
      deps.reconcilePacks = reconcilePacks;

      const dryRun = await updateTools(
        { kind: 'pack', pack: 'docs' },
        ['user'],
        '/cwd',
        '/home',
        true,
        deps,
      );
      expect(dryRun.notInstalled).toEqual(['docs']);
      expect(dryRun.plans).toEqual([]);
      expect(reconcilePacks).not.toHaveBeenCalled();

      const applied = await updateTools(
        { kind: 'pack', pack: 'docs' },
        ['user'],
        '/cwd',
        '/home',
        false,
        deps,
      );
      expect(applied.notInstalled).toEqual(['docs']);
      expect(applied.plans).toEqual([]);
      expect(reconcilePacks).not.toHaveBeenCalled();
      await expect(
        inventoryScopedPack({
          pack: 'docs',
          scope: 'user',
          scopeRoot: root,
          assetsRoot,
        }),
      ).resolves.toMatchObject({ completeness: 'absent' });
      await expect(
        readScopedPackIntent({ pack: 'docs', scope: 'user', scopeRoot: root }),
      ).resolves.toMatchObject({ enabled: true, source: 'declared' });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('preserves defaultScope while update backfills the projects root', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-update-project-root-'));
    try {
      const assetsRoot = await resolveAssetsRoot();
      await writeOatConfig(root, {
        version: 1,
        projects: { defaultScope: 'local' },
        tools: { workflows: true },
      });
      const deps = createDeps();
      deps.resolveAssetsRoot = async () => assetsRoot;
      deps.resolveScopeRoot = async () => root;
      deps.inventoryScopedPack = inventoryScopedPack;
      deps.reconcilePacks = reconcilePackLifecycles;

      await updateTools(
        { kind: 'pack', pack: 'workflows' },
        ['project'],
        root,
        root,
        false,
        deps,
      );

      await expect(readOatConfig(root)).resolves.toMatchObject({
        projects: {
          defaultScope: 'local',
        },
      });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it.each([
    { removed: 'docs' as const, retained: 'workflows' as const },
    { removed: 'workflows' as const, retained: 'docs' as const },
  ])(
    'does not recreate removed $removed from shared data retained by $retained during update-all',
    async ({ removed, retained }) => {
      const root = await mkdtemp(join(tmpdir(), 'oat-update-shared-owner-'));
      try {
        const assetsRoot = await resolveAssetsRoot();
        await reconcilePackLifecycles(
          [removed, retained].map((pack) => ({
            pack,
            scope: 'user' as const,
            scopeRoot: root,
            assetsRoot,
            action: 'install' as const,
          })),
        );
        await removeTools(
          { kind: 'pack', pack: removed },
          ['user'],
          root,
          root,
          false,
          {
            scanTools: async () => [],
            resolveScopeRoot: async () => root,
            resolveAssetsRoot: async () => assetsRoot,
            removeDirectory: async (path) =>
              rm(path, { recursive: true, force: true }),
            removeFile: async (path) => rm(path, { force: true }),
            pathExists,
            hasPackOwnershipEvidence: async (pack, scope, scopeRoot) =>
              hasScopedPackOwnershipEvidence({ pack, scope, scopeRoot }),
          },
        );
        await writeScopedPackIntent({
          pack: removed,
          scope: 'user',
          scopeRoot: root,
          enabled: false,
        });

        const deps = createDeps();
        deps.resolveAssetsRoot = async () => assetsRoot;
        deps.resolveScopeRoot = async () => root;
        deps.inventoryScopedPack = inventoryScopedPack;
        deps.reconcilePacks = reconcilePackLifecycles;

        const dryRun = await updateTools(
          { kind: 'all' },
          ['user'],
          root,
          root,
          true,
          deps,
        );
        expect(dryRun.plans.map(({ pack }) => pack)).not.toContain(removed);
        expect(dryRun.plans.map(({ pack }) => pack)).toContain(retained);
        await expect(
          readScopedPackIntent({
            pack: removed,
            scope: 'user',
            scopeRoot: root,
          }),
        ).resolves.toMatchObject({ enabled: false, source: 'none' });

        const applied = await updateTools(
          { kind: 'all' },
          ['user'],
          root,
          root,
          false,
          deps,
        );
        expect(applied.plans.map(({ pack }) => pack)).not.toContain(removed);
        await expect(
          inventoryScopedPack({
            pack: removed,
            scope: 'user',
            scopeRoot: root,
            assetsRoot,
          }),
        ).resolves.toMatchObject({
          completeness: 'partial',
          intent: { enabled: false, source: 'none' },
        });
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    },
  );

  it('handles not-bundled tools', async () => {
    const tool = createTool({
      name: 'custom-skill',
      status: 'not-bundled',
      pack: 'custom',
      bundledVersion: null,
    });
    const deps = createDeps({ project: [tool] });

    const result = await updateTools(
      { kind: 'name', name: 'custom-skill' },
      ['project'],
      '/cwd',
      '/home',
      false,
      deps,
    );

    expect(result.notBundled).toHaveLength(1);
    expect(result.updated).toHaveLength(0);
  });

  it('copies skill directories with force=true', async () => {
    const tool = createTool();
    const deps = createDeps({ project: [tool] });

    await updateTools(
      { kind: 'name', name: 'oat-idea-new' },
      ['project'],
      '/cwd',
      '/home',
      false,
      deps,
    );

    expect(deps.copies[0]).toEqual({
      source: '/assets/skills/oat-idea-new',
      dest: '/project/.agents/skills/oat-idea-new',
    });
  });

  it('makes mode-normalized scripts inside updated skills executable', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-update-skill-'));

    try {
      const assetsRoot = join(root, 'assets');
      const projectRoot = join(root, 'project');
      const tool = createTool();
      const sourceSkill = join(assetsRoot, 'skills', tool.name);
      const sourceScript = join(sourceSkill, 'scripts', 'bootstrap-group.sh');
      await mkdir(join(sourceSkill, 'scripts'), { recursive: true });
      await writeFile(
        join(sourceSkill, 'SKILL.md'),
        `---\nname: ${tool.name}\nversion: 2.0.0\n---\n`,
      );
      await writeFile(sourceScript, '#!/bin/sh\nexit 0\n', { mode: 0o644 });
      expect((await stat(sourceScript)).mode & 0o111).toBe(0);

      const deps = createDeps({ project: [tool] });
      deps.resolveAssetsRoot = async () => assetsRoot;
      deps.resolveScopeRoot = async () => projectRoot;
      deps.copyDirWithStatus = copyDirWithStatus;

      await updateTools(
        { kind: 'name', name: tool.name },
        ['project'],
        '/cwd',
        '/home',
        false,
        deps,
      );

      const installedScript = join(
        projectRoot,
        '.agents',
        'skills',
        tool.name,
        'scripts',
        'bootstrap-group.sh',
      );
      expect((await stat(installedScript)).mode & 0o111).not.toBe(0);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('copies agent files with force=true', async () => {
    const tool = createTool({ name: 'oat-reviewer', type: 'agent' });
    const deps = createDeps({ project: [tool] });

    await updateTools(
      { kind: 'name', name: 'oat-reviewer' },
      ['project'],
      '/cwd',
      '/home',
      false,
      deps,
    );

    expect(deps.copies[0]).toEqual({
      source: '/assets/agents/oat-reviewer.md',
      dest: '/project/.agents/agents/oat-reviewer.md',
    });
  });

  it('retains project workflow template overrides while refreshing scripts', async () => {
    const tool = createTool({
      name: 'oat-project-new',
      pack: 'workflows',
      status: 'current',
      version: '1.0.0',
      bundledVersion: '1.0.0',
    });
    const deps = createDeps({ project: [tool] });

    await updateTools(
      { kind: 'pack', pack: 'workflows' },
      ['project'],
      '/cwd',
      '/home',
      false,
      deps,
    );

    expect(
      deps.copies.some(
        (copy) => copy.source === `/assets/templates/${WORKFLOW_TEMPLATES[0]}`,
      ),
    ).toBe(false);
    expect(
      deps.copies.some(
        (copy) => copy.source === `/assets/scripts/${WORKFLOW_SCRIPTS[0]}`,
      ),
    ).toBe(true);
  });

  it('repairs a fully missing intended pack from scoped inventory', async () => {
    const deps = createDeps({ user: [] });
    deps.inventoryScopedPack = async ({ pack, scope, scopeRoot }) => ({
      pack,
      scope,
      intent: {
        pack,
        scope,
        enabled: pack === 'research',
        source: pack === 'research' ? 'declared' : 'none',
        configPath: `${scopeRoot}/.oat/config.json`,
        diagnostics: [],
      },
      completeness: 'absent',
      assets:
        pack === 'research'
          ? [
              ...RESEARCH_SKILLS.map((name) => ({
                definition: {
                  id: `skill:${name}`,
                  kind: 'skill' as const,
                  source: `skills/${name}`,
                  destination: `.agents/skills/${name}`,
                  scopes: ['project', 'user'] as const,
                  ownership: {
                    project: 'managed' as const,
                    user: 'managed' as const,
                  },
                },
                path: `${scopeRoot}/.agents/skills/${name}`,
                status: 'missing' as const,
                installedVersion: null,
                bundledVersion: null,
              })),
              ...RESEARCH_AGENTS.map((name) => ({
                definition: {
                  id: `agent:${name}`,
                  kind: 'agent' as const,
                  source: `agents/${name}`,
                  destination: `.agents/agents/${name}`,
                  scopes: ['project', 'user'] as const,
                  ownership: {
                    project: 'managed' as const,
                    user: 'managed' as const,
                  },
                },
                path: `${scopeRoot}/.agents/agents/${name}`,
                status: 'missing' as const,
                installedVersion: null,
                bundledVersion: null,
              })),
            ]
          : [],
      diagnostics: [],
    });
    const result = await updateTools(
      { kind: 'pack', pack: 'research' },
      ['user'],
      '/cwd',
      '/home',
      false,
      deps,
    );
    expect(result.updated).toHaveLength(
      RESEARCH_SKILLS.length + RESEARCH_AGENTS.length,
    );
  });

  it('refreshes all four workflows asset classes at user scope', async () => {
    const staleSkill = createTool({
      name: WORKFLOW_SKILLS[0],
      scope: 'user',
      pack: 'workflows',
      status: 'outdated',
      version: '0.9.0',
      bundledVersion: '1.0.0',
    });
    const deps = createDeps({ user: [staleSkill] });

    const result = await updateTools(
      { kind: 'pack', pack: 'workflows' },
      ['user'],
      '/cwd',
      '/home',
      false,
      deps,
    );

    expect(result.updated).toContainEqual(staleSkill);
    for (const skill of WORKFLOW_SKILLS) {
      expect(deps.copies).toContainEqual({
        source: `/assets/skills/${skill}`,
        dest: `/home/user/.agents/skills/${skill}`,
      });
    }
    for (const agent of WORKFLOW_AGENTS) {
      expect(deps.copies).toContainEqual({
        source: `/assets/agents/${agent}`,
        dest: `/home/user/.agents/agents/${agent}`,
      });
    }
    for (const template of WORKFLOW_TEMPLATES) {
      expect(deps.copies).toContainEqual({
        source: `/assets/templates/${template}`,
        dest: `/home/user/.oat/templates/${template}`,
      });
    }
    for (const script of WORKFLOW_SCRIPTS) {
      expect(deps.copies).toContainEqual({
        source: `/assets/scripts/${script}`,
        dest: `/home/user/.oat/scripts/${script}`,
      });
      expect(deps.chmods).toContainEqual({
        path: `/home/user/.oat/scripts/${script}`,
        mode: 0o755,
      });
    }
  });

  it('reports user-scope pack assets without writing during dry-run', async () => {
    const currentSkill = createTool({
      name: WORKFLOW_SKILLS[0],
      scope: 'user',
      pack: 'workflows',
      status: 'current',
      version: '1.0.0',
      bundledVersion: '1.0.0',
    });
    const deps = createDeps({ user: [currentSkill] });

    const result = await updateTools(
      { kind: 'pack', pack: 'workflows' },
      ['user'],
      '/cwd',
      '/home',
      true,
      deps,
    );

    expect(deps.copies).toEqual([]);
    expect(deps.chmods).toEqual([]);
    expect(result.assetRefreshes).toEqual([
      ...WORKFLOW_TEMPLATES.map((name) => ({
        name,
        type: 'template' as const,
        pack: 'workflows' as const,
        scope: 'user' as const,
        status: 'planned' as const,
      })),
      ...WORKFLOW_SCRIPTS.map((name) => ({
        name,
        type: 'script' as const,
        pack: 'workflows' as const,
        scope: 'user' as const,
        status: 'planned' as const,
      })),
    ]);
  });

  it('preserves executable script modes during pack refresh', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-update-tools-'));

    try {
      const assetsRoot = join(root, 'assets');
      const userRoot = join(root, 'user');
      await mkdir(join(assetsRoot, 'templates'), { recursive: true });
      await mkdir(join(assetsRoot, 'scripts'), { recursive: true });

      for (const template of WORKFLOW_TEMPLATES) {
        await writeFile(join(assetsRoot, 'templates', template), template);
      }
      for (const script of WORKFLOW_SCRIPTS) {
        await writeFile(
          join(assetsRoot, 'scripts', script),
          '#!/bin/sh\nexit 0\n',
          { mode: 0o644 },
        );
      }

      const currentTools = [
        ...WORKFLOW_SKILLS.map((name) =>
          createTool({
            name,
            scope: 'user',
            pack: 'workflows',
            status: 'current',
            version: '1.0.0',
            bundledVersion: '1.0.0',
          }),
        ),
        ...WORKFLOW_AGENTS.map((name) =>
          createTool({
            name: name.replace(/\.md$/, ''),
            type: 'agent',
            scope: 'user',
            pack: 'workflows',
            status: 'current',
            version: '1.0.0',
            bundledVersion: '1.0.0',
          }),
        ),
      ];
      const deps = createDeps({ user: currentTools });
      deps.resolveAssetsRoot = async () => assetsRoot;
      deps.resolveScopeRoot = async () => userRoot;
      deps.copyFileWithStatus = copyFileWithStatus;
      deps.chmod = chmod;

      await updateTools(
        { kind: 'pack', pack: 'workflows' },
        ['user'],
        '/cwd',
        '/home',
        false,
        deps,
      );

      for (const script of WORKFLOW_SCRIPTS) {
        const scriptStat = await stat(
          join(userRoot, '.oat', 'scripts', script),
        );
        expect(scriptStat.mode & 0o111).not.toBe(0);
      }
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('reconciles docs scripts during pack updates', async () => {
    const tool = createTool({
      name: 'oat-docs-analyze',
      pack: 'docs',
      status: 'current',
      version: '1.0.0',
      bundledVersion: '1.0.0',
    });
    const deps = createDeps({ project: [tool] });

    await updateTools(
      { kind: 'pack', pack: 'docs' },
      ['project'],
      '/cwd',
      '/home',
      false,
      deps,
    );

    expect(
      deps.copies.some(
        (copy) => copy.source === `/assets/scripts/${DOCS_SCRIPTS[0]}`,
      ),
    ).toBe(true);
  });

  it('skips pack scripts that are not bundled in assets', async () => {
    const tool = createTool({
      name: 'oat-project-new',
      pack: 'workflows',
      status: 'current',
      version: '1.0.0',
      bundledVersion: '1.0.0',
    });
    const deps = createDeps({ project: [tool] }, [
      '/assets/scripts/generate-oat-state.sh',
      '/assets/scripts/generate-thin-index.sh',
    ]);

    await updateTools(
      { kind: 'pack', pack: 'workflows' },
      ['project'],
      '/cwd',
      '/home',
      false,
      deps,
    );

    expect(
      deps.copies.some(
        (copy) => copy.source === '/assets/scripts/generate-oat-state.sh',
      ),
    ).toBe(false);
    expect(
      deps.copies.some(
        (copy) => copy.source === '/assets/scripts/generate-thin-index.sh',
      ),
    ).toBe(false);
    expect(
      deps.copies.some(
        (copy) => copy.source === '/assets/scripts/resolve-tracking.sh',
      ),
    ).toBe(true);
  });
});
