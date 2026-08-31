import { lstat, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  DOCS_SKILLS,
  UTILITY_SKILLS,
  WORKFLOW_AGENTS,
  WORKFLOW_SCRIPTS,
  WORKFLOW_TEMPLATES,
} from '@commands/init/tools/shared/skill-manifest';
import type { AutoSyncDependencies } from '@commands/tools/shared/auto-sync';
import {
  attributeSharedOwnerDiagnostics,
  inventoryPack,
  type ScopedPackInventory,
} from '@commands/tools/shared/pack-inventory';
import {
  hasScopedPackOwnershipEvidence,
  readScopedPackIntent,
  writeScopedPackIntent,
} from '@commands/tools/shared/scoped-pack-intent';
import type { ToolInfo } from '@commands/tools/shared/types';
import { resolveAssetsRoot } from '@fs/assets';
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
  failedRemovalLifecycleOutcomes,
  failedPostRemovalLifecycleOutcomes,
  removalLifecycleOutcomes,
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

function lifecycleInventory(
  pack: 'ideas',
  scope: 'project' | 'user',
  present: boolean,
): ScopedPackInventory {
  return {
    pack,
    scope,
    intent: {
      pack,
      scope,
      enabled: present,
      source: present ? 'declared' : 'none',
      configPath: '/scope/.oat/config.json',
      diagnostics: [],
    },
    completeness: present ? 'complete' : 'absent',
    assets: [
      {
        definition: {
          id: 'skill:oat-idea-new',
          kind: 'skill',
          destination: '.agents/skills/oat-idea-new',
          scopes: [scope],
          ownership: { [scope]: 'managed' },
        },
        path: '/scope/.agents/skills/oat-idea-new',
        status: present ? 'current' : 'missing',
        installedVersion: null,
        bundledVersion: null,
      },
    ],
    diagnostics: [],
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
  runSync: AutoSyncDependencies['runSync'] = async () => {},
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
      runSync,
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
    deps.inventoryScopedPack = async ({ pack, scope }) =>
      lifecycleInventory(pack as 'ideas', scope, true);

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
    expect(result.lifecycle).toEqual([]);
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
    expect(result).not.toHaveProperty('lifecycle');
  });

  it('preserves current pack evidence during a pack dry-run', async () => {
    const deps = createDeps({ project: [createTool()] });
    deps.inventoryScopedPack = async ({ pack, scope }) =>
      lifecycleInventory(pack as 'ideas', scope, true);

    const result = await removeTools(
      { kind: 'pack', pack: 'ideas' },
      ['project'],
      '/cwd',
      '/home',
      true,
      deps,
    );

    expect(result.lifecycle).toMatchObject([
      {
        canonical: { status: 'unchanged' },
        selection: { retainedRealizedScopes: ['project'] },
        finalEvidence: { realizedPlacement: 'project' },
      },
    ]);
  });

  it('reports only re-inventoried remaining scopes after partial removal', async () => {
    const deps = createDeps({
      project: [createTool({ scope: 'project' })],
      user: [createTool({ scope: 'user' })],
    });
    deps.inventoryScopedPack = async ({ pack, scope }) => {
      return lifecycleInventory(pack as 'ideas', scope, true);
    };

    const result = await removeTools(
      { kind: 'pack', pack: 'ideas' },
      ['project', 'user'],
      '/cwd',
      '/home',
      false,
      deps,
    );

    const lifecycle = removalLifecycleOutcomes(
      ['ideas'],
      ['project', 'user'],
      result.packOutcomes,
      false,
      [
        lifecycleInventory('ideas', 'project', false),
        lifecycleInventory('ideas', 'user', true),
      ],
    );
    expect(lifecycle).toMatchObject([
      {
        status: 'partial',
        selection: { retainedRealizedScopes: ['user'] },
        finalEvidence: { realizedPlacement: 'user' },
        recovery: [
          {
            message: expect.stringContaining('--pack ideas --scope user'),
          },
        ],
      },
    ]);
  });

  it('reports post-write disabled intent in command lifecycle evidence', async () => {
    const scopeRoot = await makeScopeRoot();
    await materialize(
      join(scopeRoot, '.agents', 'skills', 'oat-idea-new'),
      true,
    );
    await writeScopedPackIntent({
      pack: 'ideas',
      scope: 'user',
      scopeRoot,
      enabled: true,
    });
    const deps = filesystemDeps(scopeRoot);
    deps.inventoryScopedPack = async ({ pack, scope, scopeRoot: root }) => {
      const intent = await readScopedPackIntent({
        pack,
        scope,
        scopeRoot: root,
      });
      const present = await pathExists(
        join(root, '.agents', 'skills', 'oat-idea-new'),
      );
      return {
        ...lifecycleInventory('ideas', scope, present),
        intent,
      };
    };
    const stdout: string[] = [];
    const write = vi
      .spyOn(process.stdout, 'write')
      .mockImplementation((chunk) => {
        stdout.push(String(chunk));
        return true;
      });
    try {
      const program = new Command()
        .name('oat')
        .option('--json')
        .option('--scope <scope>')
        .option('--cwd <path>')
        .exitOverride();
      const tools = new Command('tools');
      tools.addCommand(
        createToolsRemoveCommand(deps, { runSync: async () => {} }),
      );
      program.addCommand(tools);
      await program.parseAsync(
        [
          '--json',
          '--scope',
          'user',
          '--cwd',
          scopeRoot,
          'tools',
          'remove',
          '--pack',
          'ideas',
          '--no-sync',
        ],
        { from: 'user' },
      );
    } finally {
      write.mockRestore();
    }

    const payload = JSON.parse(stdout.join('')) as {
      lifecycle: Array<{
        status: string;
        finalEvidence: {
          scopes: Array<{ intent: { enabled: boolean; source: string } }>;
        };
      }>;
    };
    expect(payload.lifecycle[0]).toMatchObject({
      status: 'complete',
      finalEvidence: {
        scopes: [{ intent: { enabled: false, source: 'none' } }],
      },
    });
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

  it('normalizes a pack removal failure into structured lifecycle evidence', () => {
    expect(
      failedRemovalLifecycleOutcomes(
        { kind: 'pack', pack: 'docs' },
        ['user'],
        new Error('managed assets remain'),
      ),
    ).toMatchObject([
      {
        status: 'failed',
        selection: { pack: 'docs', targetScopes: ['user'] },
        recovery: [
          {
            code: 'canonical-apply-failed',
            message: 'managed assets remain',
          },
        ],
      },
    ]);
  });

  for (const stage of ['intent-write', 'final-inventory'] as const) {
    for (const json of [false, true]) {
      it(`reports ${stage} failure after canonical removal in ${json ? 'JSON' : 'human'} mode`, async () => {
        const deps = createDeps({ project: [createTool()] });
        let inventoryCalls = 0;
        deps.writeScopedPackIntent = async () => {
          if (stage === 'intent-write') throw new Error('intent store offline');
        };
        deps.inventoryScopedPack = async ({ pack, scope }) => {
          inventoryCalls += 1;
          if (stage === 'final-inventory' && inventoryCalls > 1) {
            throw new Error('inventory unreadable');
          }
          return lifecycleInventory(pack as 'ideas', scope, true);
        };
        const stdout: string[] = [];
        const stderr: string[] = [];
        const stdoutWrite = vi
          .spyOn(process.stdout, 'write')
          .mockImplementation((chunk) => {
            stdout.push(String(chunk));
            return true;
          });
        const stderrWrite = vi
          .spyOn(process.stderr, 'write')
          .mockImplementation((chunk) => {
            stderr.push(String(chunk));
            return true;
          });
        const previousExitCode = process.exitCode;
        try {
          process.exitCode = 0;
          const program = new Command()
            .name('oat')
            .option('--json')
            .option('--scope <scope>')
            .option('--cwd <path>')
            .exitOverride();
          const tools = new Command('tools');
          tools.addCommand(
            createToolsRemoveCommand(deps, { runSync: async () => {} }),
          );
          program.addCommand(tools);
          await program.parseAsync(
            [
              ...(json ? ['--json'] : []),
              '--scope',
              'project',
              '--cwd',
              '/project',
              'tools',
              'remove',
              '--pack',
              'ideas',
              '--no-sync',
            ],
            { from: 'user' },
          );

          expect(process.exitCode).toBe(1);
          expect(deps.removedDirs).toContain(
            '/project/.agents/skills/oat-idea-new',
          );
          const expectedStage =
            stage === 'intent-write'
              ? 'durable intent update failed'
              : 'final inventory failed';
          if (json) {
            const payload = JSON.parse(stdout.join('')) as {
              result: { removed: Array<{ name: string }> };
              lifecycle: Array<{
                canonical: { status: string };
                finalEvidence: unknown;
                status: string;
                recovery: Array<{ message: string }>;
              }>;
            };
            expect(payload.result.removed).toEqual([
              expect.objectContaining({ name: 'oat-idea-new' }),
            ]);
            expect(payload.lifecycle[0]).toMatchObject({
              canonical: { status: 'applied' },
              finalEvidence: null,
              status: 'failed',
              recovery: [
                {
                  message: expect.stringContaining(
                    `${expectedStage} for ideas at project scope`,
                  ),
                },
              ],
            });
          } else {
            expect(stdout.join('')).toContain('Removed: oat-idea-new');
            expect(`${stdout.join('')} ${stderr.join('')}`).toContain(
              expectedStage,
            );
          }
        } finally {
          process.exitCode = previousExitCode;
          stdoutWrite.mockRestore();
          stderrWrite.mockRestore();
        }
      });
    }
  }

  it('projects post-removal failures as applied but unverified', () => {
    expect(
      failedPostRemovalLifecycleOutcomes(
        { kind: 'pack', pack: 'ideas' },
        ['project'],
        [{ pack: 'ideas', scope: 'project', removed: true }],
        'intent-write',
        'ideas',
        'project',
        new Error('intent store offline'),
      ),
    ).toMatchObject([
      {
        canonical: { status: 'applied' },
        finalEvidence: null,
        status: 'failed',
      },
    ]);
  });

  for (const stage of ['intent-write', 'final-inventory'] as const) {
    for (const json of [false, true]) {
      it(`covers every pack and scope after later ${stage} failure in ${json ? 'JSON' : 'human'} mode`, async () => {
        const deps = createDeps({
          project: [
            createTool({ scope: 'project' }),
            createTool({
              name: 'oat-docs-analyze',
              pack: 'docs',
              scope: 'project',
            }),
          ],
          user: [
            createTool({ scope: 'user' }),
            createTool({
              name: 'oat-docs-analyze',
              pack: 'docs',
              scope: 'user',
            }),
          ],
        });
        let inventoryCalls = 0;
        deps.writeScopedPackIntent = async ({ pack, scope }) => {
          if (stage === 'intent-write' && pack === 'docs' && scope === 'user') {
            throw new Error('later intent failure');
          }
        };
        deps.inventoryScopedPack = async ({ pack, scope }) => {
          inventoryCalls += 1;
          if (
            stage === 'final-inventory' &&
            inventoryCalls > 16 &&
            pack === 'docs' &&
            scope === 'user'
          ) {
            throw new Error('later inventory failure');
          }
          return {
            ...lifecycleInventory('ideas', scope, true),
            pack,
            intent: {
              ...lifecycleInventory('ideas', scope, true).intent,
              pack,
            },
          };
        };
        const stdout: string[] = [];
        const stderr: string[] = [];
        const stdoutWrite = vi
          .spyOn(process.stdout, 'write')
          .mockImplementation((chunk) => {
            stdout.push(String(chunk));
            return true;
          });
        const stderrWrite = vi
          .spyOn(process.stderr, 'write')
          .mockImplementation((chunk) => {
            stderr.push(String(chunk));
            return true;
          });
        const previousExitCode = process.exitCode;
        try {
          process.exitCode = 0;
          const program = new Command()
            .name('oat')
            .option('--json')
            .option('--scope <scope>')
            .option('--cwd <path>')
            .exitOverride();
          const tools = new Command('tools');
          tools.addCommand(
            createToolsRemoveCommand(deps, { runSync: async () => {} }),
          );
          program.addCommand(tools);
          await program.parseAsync(
            [
              ...(json ? ['--json'] : []),
              '--scope',
              'all',
              '--cwd',
              '/project',
              'tools',
              'remove',
              '--all',
              '--no-sync',
            ],
            { from: 'user' },
          );

          expect(process.exitCode).toBe(1);
          const packs = [
            'core',
            'ideas',
            'docs',
            'workflows',
            'utility',
            'project-management',
            'research',
            'brainstorm',
          ];
          const expectedCommands = packs.flatMap((pack) =>
            ['project', 'user'].map(
              (scope) => `oat tools remove --pack ${pack} --scope ${scope}`,
            ),
          );
          if (json) {
            const payload = JSON.parse(stdout.join('')) as {
              lifecycle: Array<{
                selection: { pack: string };
                recovery: Array<{ message: string }>;
              }>;
            };
            const recoveryCommands = payload.lifecycle.flatMap(({ recovery }) =>
              recovery.map(({ message }) =>
                message.slice(message.indexOf('Rerun ') + 6),
              ),
            );
            expect(recoveryCommands).toEqual(expectedCommands);
          } else {
            const output = `${stdout.join('')} ${stderr.join('')}`;
            for (const command of expectedCommands) {
              expect(output).toContain(`Rerun ${command}`);
            }
          }
        } finally {
          process.exitCode = previousExitCode;
          stdoutWrite.mockRestore();
          stderrWrite.mockRestore();
        }
      });
    }
  }

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

  it.each([
    { removed: 'docs' as const, retained: 'workflows' as const },
    { removed: 'workflows' as const, retained: 'docs' as const },
  ])(
    'reports $removed unavailable after removal retains shared data for $retained',
    async ({ removed, retained }) => {
      const scopeRoot = await makeScopeRoot();
      const shared = join(scopeRoot, '.oat', 'scripts', 'resolve-tracking.sh');
      await writeScopedPackIntent({
        pack: removed,
        scope: 'user',
        scopeRoot,
        enabled: true,
      });
      await writeScopedPackIntent({
        pack: retained,
        scope: 'user',
        scopeRoot,
        enabled: true,
      });
      await materialize(shared);

      await runRemoveCommand(scopeRoot, ['--pack', removed, '--no-sync']);

      await expect(pathExists(shared)).resolves.toBe(true);
      const assetsRoot = await resolveAssetsRoot();
      const inventories = attributeSharedOwnerDiagnostics(
        await Promise.all(
          [removed, retained].map((pack) =>
            inventoryPack({
              pack,
              assetsRoot,
              userRoot: scopeRoot,
            }),
          ),
        ),
      );
      const removedInventory = inventories.find(({ pack }) => pack === removed);
      const retainedInventory = inventories.find(
        ({ pack }) => pack === retained,
      );

      expect(removedInventory).toMatchObject({ placement: 'unavailable' });
      expect(removedInventory?.diagnostics).not.toEqual(
        expect.arrayContaining([
          expect.objectContaining({ code: 'shared-owner-observation' }),
        ]),
      );
      const retainedDiagnostics = retainedInventory?.scopes.flatMap(
        ({ diagnostics }) => diagnostics,
      );
      expect(retainedDiagnostics).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: 'shared-owner-observation',
            message: expect.stringContaining(retained),
          }),
        ]),
      );
    },
  );

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

  it('syncs exact removed canonical paths once per affected scope', async () => {
    const scopeRoot = await makeScopeRoot();
    const calls: Parameters<AutoSyncDependencies['runSync']>[0][] = [];

    await runRemoveCommand(scopeRoot, ['--pack', 'docs'], async (options) => {
      calls.push(options);
    });

    expect(calls).toEqual([
      expect.objectContaining({
        scope: 'user',
        installedCanonicalPaths: undefined,
        removedCanonicalPaths: DOCS_SKILLS.map(
          (skill) => `.agents/skills/${skill}`,
        ),
      }),
    ]);
  });
});
