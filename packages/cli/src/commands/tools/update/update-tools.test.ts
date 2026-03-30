import { CORE_SKILLS } from '@commands/init/tools/core/install-core';
import { DOCS_SKILLS } from '@commands/init/tools/docs/install-docs';
import { IDEA_SKILLS } from '@commands/init/tools/ideas/install-ideas';
import type { CopyStatus } from '@commands/init/tools/shared/copy-helpers';
import {
  WORKFLOW_AGENTS,
  WORKFLOW_SKILLS,
} from '@commands/init/tools/shared/skill-manifest';
import type { ToolInfo } from '@commands/tools/shared/types';
import { describe, expect, it } from 'vitest';

import {
  type UpdateTarget,
  type UpdateToolsDependencies,
  updateTools,
} from './update-tools';

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
): UpdateToolsDependencies & {
  copies: Array<{ source: string; dest: string }>;
} {
  const copies: Array<{ source: string; dest: string }> = [];
  return {
    copies,
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
    expect(deps.copies).toHaveLength(expectedUpdated.length);
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
});
