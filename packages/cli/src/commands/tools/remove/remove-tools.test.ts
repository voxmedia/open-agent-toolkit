import type { ToolInfo } from '@commands/tools/shared/types';
import { describe, expect, it } from 'vitest';
import {
  type RemoveTarget,
  type RemoveToolsDependencies,
  removeTools,
} from './remove-tools';

function createTool(overrides: Partial<ToolInfo> = {}): ToolInfo {
  return {
    name: 'oat-idea-new',
    type: 'skill',
    scope: 'project',
    version: '1.0.0',
    bundledVersion: '1.0.0',
    pack: 'ideas',
    status: 'current',
    ...overrides,
  };
}

function createDeps(
  toolsByScope: Record<string, ToolInfo[]> = {},
): RemoveToolsDependencies & {
  removedDirs: string[];
  removedFiles: string[];
} {
  const removedDirs: string[] = [];
  const removedFiles: string[] = [];
  return {
    removedDirs,
    removedFiles,
    scanTools: async (options) => toolsByScope[options.scope] ?? [],
    resolveScopeRoot: async (scope) =>
      scope === 'project' ? '/project' : '/home/user',
    resolveAssetsRoot: async () => '/assets',
    removeDirectory: async (path) => {
      removedDirs.push(path);
    },
    removeFile: async (path) => {
      removedFiles.push(path);
    },
  };
}

describe('removeTools', () => {
  it('removes a single skill by name', async () => {
    const tool = createTool();
    const deps = createDeps({ project: [tool] });
    const target: RemoveTarget = { kind: 'name', name: 'oat-idea-new' };

    const result = await removeTools(
      target,
      ['project'],
      '/cwd',
      '/home',
      false,
      deps,
    );

    expect(result.removed).toHaveLength(1);
    expect(result.removed[0]!.name).toBe('oat-idea-new');
    expect(deps.removedDirs).toEqual(['/project/.agents/skills/oat-idea-new']);
    expect(deps.removedFiles).toHaveLength(0);
  });

  it('removes a single agent by name by deleting its .md file', async () => {
    const tool = createTool({
      name: 'oat-reviewer',
      type: 'agent',
    });
    const deps = createDeps({ project: [tool] });

    const result = await removeTools(
      { kind: 'name', name: 'oat-reviewer' },
      ['project'],
      '/cwd',
      '/home',
      false,
      deps,
    );

    expect(result.removed).toHaveLength(1);
    expect(deps.removedFiles).toEqual([
      '/project/.agents/agents/oat-reviewer.md',
    ]);
    expect(deps.removedDirs).toHaveLength(0);
  });

  it('removes all tools in a pack', async () => {
    const tools = [
      createTool({ name: 'oat-idea-new', pack: 'ideas' }),
      createTool({ name: 'oat-idea-ideate', pack: 'ideas' }),
      createTool({
        name: 'oat-project-new',
        pack: 'workflows',
      }),
    ];
    const deps = createDeps({ project: tools });

    const result = await removeTools(
      { kind: 'pack', pack: 'ideas' },
      ['project'],
      '/cwd',
      '/home',
      false,
      deps,
    );

    expect(result.removed).toHaveLength(2);
    expect(deps.removedDirs).toHaveLength(2);
  });

  it('removes all tools with --all', async () => {
    const tools = [
      createTool({ name: 'oat-idea-new', pack: 'ideas' }),
      createTool({
        name: 'oat-reviewer',
        type: 'agent',
        pack: 'workflows',
      }),
      createTool({ name: 'oat-docs-analyze', pack: 'utility' }),
    ];
    const deps = createDeps({ project: tools });

    const result = await removeTools(
      { kind: 'all' },
      ['project'],
      '/cwd',
      '/home',
      false,
      deps,
    );

    expect(result.removed).toHaveLength(3);
    expect(deps.removedDirs).toHaveLength(2); // two skills
    expect(deps.removedFiles).toHaveLength(1); // one agent
  });

  it('dry-run previews removal without deleting', async () => {
    const tool = createTool();
    const deps = createDeps({ project: [tool] });

    const result = await removeTools(
      { kind: 'name', name: 'oat-idea-new' },
      ['project'],
      '/cwd',
      '/home',
      true,
      deps,
    );

    expect(result.removed).toHaveLength(1);
    expect(deps.removedDirs).toHaveLength(0);
    expect(deps.removedFiles).toHaveLength(0);
  });

  it('errors when tool name not found in any scope', async () => {
    const deps = createDeps({ project: [] });

    const result = await removeTools(
      { kind: 'name', name: 'nonexistent' },
      ['project'],
      '/cwd',
      '/home',
      false,
      deps,
    );

    expect(result.notInstalled).toEqual(['nonexistent']);
    expect(result.removed).toHaveLength(0);
  });

  it('removes tools across multiple scopes', async () => {
    const deps = createDeps({
      project: [createTool({ name: 'oat-idea-new', scope: 'project' })],
      user: [createTool({ name: 'oat-idea-new', scope: 'user' })],
    });

    const result = await removeTools(
      { kind: 'name', name: 'oat-idea-new' },
      ['project', 'user'],
      '/cwd',
      '/home',
      false,
      deps,
    );

    expect(result.removed).toHaveLength(2);
    expect(deps.removedDirs).toEqual([
      '/project/.agents/skills/oat-idea-new',
      '/home/user/.agents/skills/oat-idea-new',
    ]);
  });

  it('removes custom tools by name', async () => {
    const tool = createTool({
      name: 'my-custom-skill',
      pack: 'custom',
      status: 'not-bundled',
      bundledVersion: null,
    });
    const deps = createDeps({ project: [tool] });

    const result = await removeTools(
      { kind: 'name', name: 'my-custom-skill' },
      ['project'],
      '/cwd',
      '/home',
      false,
      deps,
    );

    expect(result.removed).toHaveLength(1);
    expect(deps.removedDirs).toEqual([
      '/project/.agents/skills/my-custom-skill',
    ]);
  });
});
