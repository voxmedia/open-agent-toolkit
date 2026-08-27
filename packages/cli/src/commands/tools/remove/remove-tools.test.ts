import { lstat, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  UTILITY_SKILLS,
  WORKFLOW_AGENTS,
  WORKFLOW_SCRIPTS,
  WORKFLOW_TEMPLATES,
} from '@commands/init/tools/shared/skill-manifest';
import {
  hasScopedPackOwnershipEvidence,
  readScopedPackIntent,
  writeScopedPackIntent,
} from '@commands/tools/shared/scoped-pack-intent';
import type { ToolInfo } from '@commands/tools/shared/types';
import { Command } from 'commander';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@fs/paths', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@fs/paths')>();
  return {
    ...actual,
    resolveManagedScopeRoots: async (scopeRoot: string) => ({
      '.agents': {
        name: '.agents',
        logicalRoot: join(scopeRoot, '.agents'),
        realRoot: join(scopeRoot, '.agents'),
        exists: true,
      },
      '.oat': {
        name: '.oat',
        logicalRoot: join(scopeRoot, '.oat'),
        realRoot: join(scopeRoot, '.oat'),
        exists: true,
      },
    }),
    validateManagedPath: async (candidatePath: string) => ({
      realManagedRoot: join(candidatePath, '..'),
      realPath: candidatePath,
    }),
  };
});

import { createToolsRemoveCommand } from './index';
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
    pathExists: async () => false,
    hasPackOwnershipEvidence: async () => false,
  };
}

const tempDirs: string[] = [];

async function pathExists(path: string): Promise<boolean> {
  try {
    await lstat(path);
    return true;
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'ENOENT'
    ) {
      return false;
    }
    throw error;
  }
}

async function makeScopeRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'oat-remove-tools-'));
  tempDirs.push(root);
  return root;
}

async function materialize(path: string, directory = false): Promise<void> {
  if (directory) {
    await mkdir(path, { recursive: true });
    return;
  }
  await mkdir(join(path, '..'), { recursive: true });
  await writeFile(path, 'managed\n');
}

function filesystemDeps(scopeRoot: string): RemoveToolsDependencies {
  return {
    scanTools: async () => [],
    resolveScopeRoot: async () => scopeRoot,
    resolveAssetsRoot: async () => '/assets',
    removeDirectory: async (path) => rm(path, { recursive: true, force: true }),
    removeFile: async (path) => rm(path, { force: true }),
    pathExists,
    hasPackOwnershipEvidence: async (pack, scope, root) =>
      hasScopedPackOwnershipEvidence({ pack, scope, scopeRoot: root }),
  };
}

async function runRemoveCommand(
  scopeRoot: string,
  args: string[],
): Promise<void> {
  const program = new Command()
    .name('oat')
    .option('--json')
    .option('--verbose')
    .option('--scope <scope>')
    .option('--cwd <path>')
    .exitOverride();
  const tools = new Command('tools');
  tools.addCommand(
    createToolsRemoveCommand(filesystemDeps(scopeRoot), {
      runSync: async () => {},
    }),
  );
  program.addCommand(tools);

  await program.parseAsync(
    ['--scope', 'user', '--cwd', scopeRoot, 'tools', 'remove', ...args],
    { from: 'user' },
  );
}

describe('removeTools', () => {
  afterEach(async () => {
    await Promise.all(
      tempDirs.map((dir) => rm(dir, { recursive: true, force: true })),
    );
    tempDirs.length = 0;
  });
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
    expect(deps.removedDirs).toContain('/project/.agents/skills/oat-idea-new');
    expect(deps.removedDirs).toContain(
      '/project/.agents/skills/oat-idea-ideate',
    );
  });

  it('removes the brainstorm pack and its skill directory', async () => {
    const tools = [
      createTool({ name: 'oat-brainstorm', pack: 'brainstorm' }),
      createTool({ name: 'oat-idea-new', pack: 'ideas' }),
    ];
    const deps = createDeps({ project: tools });

    const result = await removeTools(
      { kind: 'pack', pack: 'brainstorm' },
      ['project'],
      '/cwd',
      '/home',
      false,
      deps,
    );

    expect(result.removed.map((t) => t.name)).toEqual(['oat-brainstorm']);
    expect(deps.removedDirs).toEqual([
      '/project/.agents/skills/oat-brainstorm',
    ]);
  });

  it('removes both orchestration skills as explicit utility pack members', async () => {
    const tools = UTILITY_SKILLS.map((name) =>
      createTool({ name, pack: 'utility' }),
    );
    const deps = createDeps({ project: tools });

    const result = await removeTools(
      { kind: 'pack', pack: 'utility' },
      ['project'],
      '/cwd',
      '/home',
      false,
      deps,
    );

    expect(UTILITY_SKILLS).toContain('oat-dispatch-subagents');
    expect(UTILITY_SKILLS).toContain('subagent-orchestration');
    expect(result.removed.map((tool) => tool.name)).toEqual([
      ...UTILITY_SKILLS,
    ]);
    expect(deps.removedDirs).toContain(
      '/project/.agents/skills/oat-dispatch-subagents',
    );
    expect(deps.removedDirs).toContain(
      '/project/.agents/skills/subagent-orchestration',
    );
  });

  it('removes workflow agents, templates, and scripts with a user-scope pack', async () => {
    const tools = [
      createTool({
        name: 'oat-project-new',
        scope: 'user',
        pack: 'workflows',
      }),
    ];
    const deps = createDeps({ user: tools });

    await removeTools(
      { kind: 'pack', pack: 'workflows' },
      ['user'],
      '/cwd',
      '/home',
      false,
      deps,
    );

    for (const agent of WORKFLOW_AGENTS) {
      expect(deps.removedFiles).toContain(`/home/user/.agents/agents/${agent}`);
    }
    for (const template of WORKFLOW_TEMPLATES) {
      expect(deps.removedFiles).toContain(
        `/home/user/.oat/templates/${template}`,
      );
    }
    for (const script of WORKFLOW_SCRIPTS) {
      expect(deps.removedFiles).toContain(`/home/user/.oat/scripts/${script}`);
    }
  });

  it('retains the shared tracking script while docs remains intended', async () => {
    const deps = createDeps({
      user: [
        createTool({
          name: 'oat-project-new',
          scope: 'user',
          pack: 'workflows',
        }),
      ],
    });
    deps.hasPackOwnershipEvidence = async (pack) => pack === 'docs';

    await removeTools(
      { kind: 'pack', pack: 'workflows' },
      ['user'],
      '/cwd',
      '/home',
      false,
      deps,
    );

    expect(deps.removedFiles).not.toContain(
      '/home/user/.oat/scripts/resolve-tracking.sh',
    );
    expect(deps.removedFiles).toContain(
      '/home/user/.oat/scripts/generate-oat-state.sh',
    );
  });

  it('retains the shared tracking script while workflows remains intended', async () => {
    const deps = createDeps({
      user: [
        createTool({
          name: 'oat-docs-analyze',
          scope: 'user',
          pack: 'docs',
        }),
      ],
    });
    deps.hasPackOwnershipEvidence = async (pack) => pack === 'workflows';

    await removeTools(
      { kind: 'pack', pack: 'docs' },
      ['user'],
      '/cwd',
      '/home',
      false,
      deps,
    );

    expect(deps.removedFiles).not.toContain(
      '/home/user/.oat/scripts/resolve-tracking.sh',
    );
  });

  it('removes the shared tracking script when the other owner is not intended', async () => {
    const deps = createDeps({
      user: [
        createTool({
          name: 'oat-docs-analyze',
          scope: 'user',
          pack: 'docs',
        }),
      ],
    });
    deps.hasPackOwnershipEvidence = async () => false;

    await removeTools(
      { kind: 'pack', pack: 'docs' },
      ['user'],
      '/cwd',
      '/home',
      false,
      deps,
    );

    expect(deps.removedFiles).toContain(
      '/home/user/.oat/scripts/resolve-tracking.sh',
    );
  });

  it('removes all tools with --all', async () => {
    const tools = [
      createTool({ name: 'oat-idea-new', pack: 'ideas' }),
      createTool({
        name: 'oat-reviewer',
        type: 'agent',
        pack: 'workflows',
      }),
      createTool({ name: 'oat-docs-analyze', pack: 'docs' }),
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
    expect(deps.removedDirs).toContain('/project/.agents/skills/oat-idea-new');
    expect(deps.removedDirs).toContain(
      '/project/.agents/skills/oat-docs-analyze',
    );
    expect(deps.removedFiles).toContain(
      '/project/.agents/agents/oat-reviewer.md',
    );
    expect(
      deps.removedFiles.filter(
        (path) => path === '/project/.oat/scripts/resolve-tracking.sh',
      ),
    ).toHaveLength(1);
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

  it.each([
    {
      pack: 'docs' as const,
      ownAsset: '.agents/skills/oat-docs-analyze',
    },
    {
      pack: 'workflows' as const,
      ownAsset: '.agents/skills/oat-project-implement',
    },
  ])(
    'does not let the shared script manufacture a legacy $pack owner',
    async ({ pack, ownAsset }) => {
      const scopeRoot = await makeScopeRoot();
      const shared = join(scopeRoot, '.oat', 'scripts', 'resolve-tracking.sh');
      await materialize(join(scopeRoot, ownAsset), true);
      await materialize(shared);

      await runRemoveCommand(scopeRoot, ['--pack', pack, '--no-sync']);

      await expect(pathExists(shared)).resolves.toBe(false);
      await expect(
        readScopedPackIntent({ pack, scope: 'user', scopeRoot }),
      ).resolves.toMatchObject({ enabled: false, source: 'none' });
    },
  );

  it('retains a shared script for the other declared owner', async () => {
    const scopeRoot = await makeScopeRoot();
    const shared = join(scopeRoot, '.oat', 'scripts', 'resolve-tracking.sh');
    await writeScopedPackIntent({
      pack: 'docs',
      scope: 'user',
      scopeRoot,
      enabled: true,
    });
    await writeScopedPackIntent({
      pack: 'workflows',
      scope: 'user',
      scopeRoot,
      enabled: true,
    });
    await materialize(shared);

    await runRemoveCommand(scopeRoot, ['--pack', 'docs', '--no-sync']);

    await expect(pathExists(shared)).resolves.toBe(true);
    await expect(
      readScopedPackIntent({ pack: 'docs', scope: 'user', scopeRoot }),
    ).resolves.toMatchObject({ enabled: false, source: 'none' });
    await expect(
      readScopedPackIntent({ pack: 'workflows', scope: 'user', scopeRoot }),
    ).resolves.toMatchObject({ enabled: true, source: 'declared' });
  });

  it('retains a shared script for a legacy owner and removes it with the last owner', async () => {
    const scopeRoot = await makeScopeRoot();
    const docsAsset = join(scopeRoot, '.agents', 'skills', 'oat-docs-analyze');
    const workflowsAsset = join(
      scopeRoot,
      '.agents',
      'skills',
      'oat-project-implement',
    );
    const shared = join(scopeRoot, '.oat', 'scripts', 'resolve-tracking.sh');
    await materialize(docsAsset, true);
    await materialize(workflowsAsset, true);
    await materialize(shared);

    await runRemoveCommand(scopeRoot, ['--pack', 'docs', '--no-sync']);
    await expect(pathExists(docsAsset)).resolves.toBe(false);
    await expect(pathExists(workflowsAsset)).resolves.toBe(true);
    await expect(pathExists(shared)).resolves.toBe(true);

    await runRemoveCommand(scopeRoot, ['--pack', 'workflows', '--no-sync']);
    await expect(pathExists(workflowsAsset)).resolves.toBe(false);
    await expect(pathExists(shared)).resolves.toBe(false);
  });

  it('removes every managed asset kind with --all while preserving seeded data', async () => {
    const scopeRoot = await makeScopeRoot();
    const managedPaths = [
      ['.agents/skills/oat-docs', true],
      ['.agents/agents/oat-reviewer.md', false],
      ['.oat/docs', true],
      ['.oat/templates/docs-app-fuma', true],
      ['.oat/templates/ideas/idea-discovery.md', false],
      ['.oat/templates/backlog-item.md', false],
      ['.oat/templates/state.md', false],
      ['.oat/scripts/resolve-tracking.sh', false],
    ] as const;
    const seed = join(scopeRoot, '.oat', 'ideas', 'backlog.md');
    for (const pack of [
      'core',
      'ideas',
      'docs',
      'workflows',
      'project-management',
    ] as const) {
      await writeScopedPackIntent({
        pack,
        scope: 'user',
        scopeRoot,
        enabled: true,
      });
    }
    for (const [relativePath, directory] of managedPaths) {
      await materialize(join(scopeRoot, relativePath), directory);
    }
    await materialize(seed);

    await runRemoveCommand(scopeRoot, ['--all', '--no-sync']);

    for (const [relativePath] of managedPaths) {
      await expect(pathExists(join(scopeRoot, relativePath))).resolves.toBe(
        false,
      );
    }
    await expect(pathExists(seed)).resolves.toBe(true);
    for (const pack of [
      'core',
      'ideas',
      'docs',
      'workflows',
      'project-management',
    ] as const) {
      await expect(
        readScopedPackIntent({ pack, scope: 'user', scopeRoot }),
      ).resolves.toMatchObject({ enabled: false, source: 'none' });
    }
  });
});
