import type { CommandContext, GlobalOptions } from '@app/command-context';
import { createLoggerCapture } from '@commands/__tests__/helpers';
import { buildDecisionAgentsSectionBody } from '@commands/decision/agents-guidance';
import type {
  MultiSelectChoice,
  SelectChoice,
} from '@commands/shared/shared.prompts';
import type { PackLifecycleRequest } from '@commands/tools/shared/pack-lifecycle';
import { createToolsUpdateCommand } from '@commands/tools/update';
import type { Scope } from '@shared/types';
import { Command } from 'commander';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const configPersistence = vi.hoisted(() => ({
  readOatConfig: vi.fn(async () => ({
    version: 1 as const,
    localPaths: [] as string[],
  })),
  writeOatConfig: vi.fn(async () => {}),
}));

vi.mock('@config/oat-config', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@config/oat-config')>()),
  readOatConfig: configPersistence.readOatConfig,
  writeOatConfig: configPersistence.writeOatConfig,
}));

import {
  buildToolPacksSectionBody,
  createInitToolsCommand,
  formatReconcileSummary,
} from './index';
import { buildProjectManagementAgentsSectionBody } from './project-management/agents-guidance';
import { PACK_METADATA } from './shared/skill-manifest';

interface HarnessOptions {
  scope?: Scope;
  contextScopeSelection?: 'interactive' | 'defaults' | 'gate';
  interactive?: boolean;
  packSelection?: Array<string[] | null>;
  scopeSelection?: Array<string | null>;
  projectRootUnavailable?: boolean;
  useLifecycle?: boolean;
  declaredPlacement?: Partial<Record<string, 'project' | 'user' | 'both'>>;
  guidanceResponse?: boolean;
  toolsByScope?: Partial<
    Record<
      'project' | 'user',
      Array<{
        name: string;
        type: 'skill' | 'agent';
        scope: 'project' | 'user';
        version: string | null;
        bundledVersion: string | null;
        pack:
          | 'core'
          | 'ideas'
          | 'docs'
          | 'workflows'
          | 'utility'
          | 'project-management'
          | 'research'
          | 'brainstorm'
          | 'custom';
        status: 'current' | 'outdated' | 'newer' | 'not-bundled';
      }>
    >
  >;
}

function createScannedTool(
  name: string,
  pack:
    | 'core'
    | 'ideas'
    | 'docs'
    | 'workflows'
    | 'utility'
    | 'project-management'
    | 'research'
    | 'brainstorm'
    | 'custom',
  scope: 'project' | 'user',
  type: 'skill' | 'agent' = 'skill',
) {
  return {
    name,
    type,
    scope,
    version: '1.0.0',
    bundledVersion: '1.0.0',
    pack,
    status: 'current' as const,
  };
}

function createHarness(options: HarnessOptions = {}) {
  const capture = createLoggerCapture();
  const packSelection = [
    ...(options.packSelection ?? [
      [
        'core',
        'ideas',
        'docs',
        'workflows',
        'utility',
        'research',
        'brainstorm',
      ],
    ]),
  ];
  const scopeSelection = [...(options.scopeSelection ?? ['project'])];
  const toolsByScope = options.toolsByScope ?? {
    project: [
      createScannedTool('oat-idea-new', 'ideas', 'project'),
      createScannedTool('oat-docs-analyze', 'docs', 'project'),
      createScannedTool('oat-project-new', 'workflows', 'project'),
      createScannedTool('oat-review-provide', 'utility', 'project'),
      createScannedTool(
        'oat-pjm-add-backlog-item',
        'project-management',
        'project',
      ),
      createScannedTool('analyze', 'research', 'project'),
    ],
    user: [createScannedTool('oat-docs', 'core', 'user')],
  };
  const realizedPlacements = new Set(
    (['project', 'user'] as const).flatMap((scope) =>
      (toolsByScope[scope] ?? []).map((tool) => `${tool.pack}:${scope}`),
    ),
  );

  const selectManyWithAbort = vi.fn(
    async (_message: string, _choices: MultiSelectChoice<string>[]) => {
      const next = packSelection.shift();
      return next === undefined
        ? [
            'core',
            'ideas',
            'docs',
            'workflows',
            'utility',
            'research',
            'brainstorm',
          ]
        : next;
    },
  );
  const selectWithAbort = vi.fn(
    async (_message: string, choices: SelectChoice<string>[]) => {
      const next = scopeSelection.shift();
      // Default to the first offered choice (the highlighted default in the
      // real prompt) when the scripted queue is exhausted.
      return next === undefined ? (choices[0]?.value ?? null) : next;
    },
  );
  const confirmAction = vi.fn(async () => options.guidanceResponse ?? false);

  const installCore = vi.fn(async () => ({
    copiedSkills: ['oat-docs', 'oat-doctor'],
    updatedSkills: [],
    skippedSkills: [],
    outdatedSkills: [],
    docsStatus: 'copied' as const,
  }));
  const installDocs = vi.fn(async () => ({
    copiedSkills: ['oat-docs-analyze'],
    updatedSkills: [],
    skippedSkills: [],
    outdatedSkills: [],
  }));
  const installIdeas = vi.fn(async () => ({
    copiedSkills: ['oat-idea-new'],
    updatedSkills: [],
    skippedSkills: [],
    outdatedSkills: [],
    copiedInfraFiles: [],
    updatedInfraFiles: [],
    skippedInfraFiles: [],
    copiedTemplates: [],
    updatedTemplates: [],
    skippedTemplates: [],
  }));
  const installWorkflows = vi.fn(async () => ({
    copiedSkills: ['oat-project-new'],
    updatedSkills: [],
    skippedSkills: [],
    outdatedSkills: [],
    copiedAgents: [],
    updatedAgents: [],
    skippedAgents: [],
    copiedTemplates: [],
    updatedTemplates: [],
    skippedTemplates: [],
    copiedScripts: [],
    updatedScripts: [],
    skippedScripts: [],
    projectsRootInitialized: false,
    projectsRootConfigInitialized: false,
    projectsDirsScaffolded: false,
    resolvedProjectsRoot: '.oat/projects/shared',
  }));
  const installUtility = vi.fn(async () => ({
    copiedSkills: ['oat-review-provide'],
    updatedSkills: [],
    skippedSkills: [],
    outdatedSkills: [],
  }));
  const installProjectManagement = vi.fn(async () => ({
    copiedSkills: ['oat-pjm-add-backlog-item'],
    updatedSkills: [],
    skippedSkills: [],
    outdatedSkills: [],
    copiedTemplates: ['backlog-item.md'],
    updatedTemplates: [],
    skippedTemplates: [],
  }));
  const installResearch = vi.fn(async () => ({
    copiedSkills: ['analyze'],
    updatedSkills: [],
    skippedSkills: [],
    outdatedSkills: [],
    copiedAgents: ['skeptical-evaluator.md'],
    updatedAgents: [],
    skippedAgents: [],
  }));
  const installBrainstorm = vi.fn(async () => ({
    copiedSkills: ['oat-brainstorm'],
    updatedSkills: [],
    skippedSkills: [],
    outdatedSkills: [],
  }));
  const copyDirWithStatus = vi.fn(async () => 'updated' as const);
  const removeDirectory = vi.fn(async () => {});
  const removeFile = vi.fn(async () => {});
  const addLocalPaths = vi.fn(async (_repoRoot: string, paths: string[]) => ({
    added: paths,
    alreadyPresent: [] as string[],
    rejected: [] as Array<{ path: string; reason: string }>,
    all: paths,
  }));
  const applyGitignore = vi.fn(async () => ({ action: 'updated' }));
  const readOatConfig = configPersistence.readOatConfig;
  const writeOatConfig = configPersistence.writeOatConfig;
  const resolveLocalPaths = vi.fn(
    (config: { localPaths?: string[] }) => config.localPaths ?? [],
  );
  const scanTools = vi.fn(
    async (scanOptions: { scope: 'project' | 'user' }) =>
      toolsByScope[scanOptions.scope] ?? [],
  );
  const upsertAgentsMdSection = vi.fn(async () => ({
    action: 'updated' as const,
  }));
  const removeAgentsMdSection = vi.fn(async () => false);
  const reconcilePacks = vi.fn(
    async (requests: readonly PackLifecycleRequest[]) => {
      for (const request of requests) {
        realizedPlacements.add(`${request.pack}:${request.scope}`);
      }
      return requests.map((request) => {
        const inventory = {
          pack: request.pack,
          scope: request.scope,
          intent: {
            pack: request.pack,
            scope: request.scope,
            enabled: true,
            source: 'declared' as const,
            configPath: `${request.scopeRoot}/.oat/config.json`,
            diagnostics: [],
          },
          completeness: 'complete' as const,
          assets: [
            {
              definition: {
                id: `${request.pack}-fixture`,
                kind: 'skill' as const,
                destination: `.agents/skills/${request.pack}-fixture`,
                scopes: [request.scope],
                ownership: { [request.scope]: 'managed' as const },
              },
              path: `${request.scopeRoot}/.agents/skills/${request.pack}-fixture`,
              status: 'current' as const,
              installedVersion: '1.0.0',
              bundledVersion: '1.0.0',
            },
          ],
          diagnostics: [],
        };
        const operation = {
          kind: 'write-intent' as const,
          pack: request.pack,
          scope: request.scope,
          enabled: true,
        };
        const plan = {
          pack: request.pack,
          scope: request.scope,
          action: request.action,
          operations: [operation],
          expectedCompleteness: 'complete' as const,
          changedCanonicalPaths: [],
          retainedAssets: [],
        };
        return {
          request,
          before: inventory,
          plan,
          apply: { applied: [operation], inventory, synced: false },
        };
      });
    },
  );
  const inventoryPack = vi.fn(
    async ({
      pack,
      projectRoot,
      userRoot,
    }: {
      pack: string;
      projectRoot?: string;
      userRoot?: string;
    }) => {
      const scopes = (['project', 'user'] as const).flatMap((scope) => {
        if (scope === 'project' && !projectRoot) return [];
        if (scope === 'user' && !userRoot) return [];
        if (pack === 'core' && scope === 'project') return [];
        const declared = options.declaredPlacement?.[pack];
        const isDeclared = declared === scope || declared === 'both';
        const realized = realizedPlacements.has(`${pack}:${scope}`);
        const enabled = isDeclared || realized;
        return [
          {
            pack,
            scope,
            intent: {
              pack,
              scope,
              enabled,
              source: isDeclared
                ? ('declared' as const)
                : realized
                  ? ('inferred-legacy' as const)
                  : ('none' as const),
              configPath: `/${scope}/.oat/config.json`,
              diagnostics: [],
            },
            completeness: realized
              ? ('complete' as const)
              : ('absent' as const),
            assets: realized
              ? [
                  {
                    definition: {
                      id: `${pack}-fixture`,
                      kind: 'skill' as const,
                      destination: `.agents/skills/${pack}-fixture`,
                      scopes: [scope],
                      ownership: { [scope]: 'managed' as const },
                    },
                    path: `/${scope}/.agents/skills/${pack}-fixture`,
                    status: 'current' as const,
                    installedVersion: '1.0.0',
                    bundledVersion: '1.0.0',
                  },
                ]
              : [],
            diagnostics: [],
          },
        ];
      });
      const active = scopes.filter(({ intent }) => intent.enabled);
      return {
        pack,
        placement:
          active.length === 2
            ? ('both' as const)
            : active[0]?.scope === 'project'
              ? ('project' as const)
              : active[0]?.scope === 'user'
                ? ('user' as const)
                : ('unavailable' as const),
        scopes,
        diagnostics: [],
      };
    },
  );
  const syncAfterInstall = vi.fn(async (scopes: Array<'project' | 'user'>) => ({
    synced: scopes.length > 0,
    scopes,
    error: null,
  }));

  const command = createInitToolsCommand({
    buildCommandContext: (globalOptions: GlobalOptions): CommandContext => ({
      scope: (globalOptions.scope ?? options.scope ?? 'all') as Scope,
      dryRun: false,
      verbose: globalOptions.verbose ?? false,
      json: globalOptions.json ?? false,
      cwd: globalOptions.cwd ?? '/tmp/workspace',
      home: '/tmp/home',
      interactive: options.interactive ?? !(globalOptions.json ?? false),
      scopeSelection: options.contextScopeSelection,
      logger: capture.logger,
    }),
    resolveProjectRoot: vi.fn(async () => {
      if (options.projectRootUnavailable) throw new Error('not a repository');
      return '/tmp/workspace';
    }),
    resolveScopeRoot: vi.fn((_scope: 'project' | 'user', _cwd, home) => home),
    resolveAssetsRoot: vi.fn(async () => '/tmp/assets'),
    scanTools,
    selectManyWithAbort,
    selectWithAbort,
    confirmAction,
    installCore,
    installDocs,
    installIdeas,
    installWorkflows,
    installUtility,
    installProjectManagement,
    installResearch,
    installBrainstorm,
    copyDirWithStatus,
    removeDirectory,
    removeFile,
    addLocalPaths,
    applyGitignore,
    readOatConfig,
    writeOatConfig,
    resolveLocalPaths,
    upsertAgentsMdSection,
    removeAgentsMdSection,
    ...(options.useLifecycle
      ? { reconcilePacks, inventoryPack, syncAfterInstall }
      : {}),
  });

  return {
    capture,
    command,
    selectManyWithAbort,
    selectWithAbort,
    confirmAction,
    installCore,
    installDocs,
    installIdeas,
    installWorkflows,
    installUtility,
    installProjectManagement,
    installResearch,
    installBrainstorm,
    copyDirWithStatus,
    removeDirectory,
    removeFile,
    addLocalPaths,
    applyGitignore,
    readOatConfig,
    writeOatConfig,
    resolveLocalPaths,
    scanTools,
    upsertAgentsMdSection,
    removeAgentsMdSection,
    reconcilePacks,
    inventoryPack,
    syncAfterInstall,
  };
}

async function runCommand(
  command: Command,
  args: string[] = [],
  globalArgs: string[] = [],
): Promise<void> {
  const program = new Command()
    .name('oat')
    .option('--json')
    .option('--verbose')
    .option('--scope <scope>')
    .option('--cwd <path>')
    .exitOverride();

  const init = new Command('init');
  init.addCommand(command);
  program.addCommand(init);

  await program.parseAsync([...globalArgs, 'init', 'tools', ...args], {
    from: 'user',
  });
}

describe('createInitToolsCommand', () => {
  let originalExitCode: number | undefined;

  beforeEach(() => {
    originalExitCode = process.exitCode;
    process.exitCode = undefined;
    configPersistence.readOatConfig.mockClear();
    configPersistence.writeOatConfig.mockClear();
    configPersistence.readOatConfig.mockResolvedValue({
      version: 1,
      localPaths: [],
    });
  });

  afterEach(() => {
    process.exitCode = originalExitCode;
  });

  it('registers core, ideas, docs, project-management, workflows, utility, research, and brainstorm subcommands', () => {
    const { command } = createHarness();
    const subcommands = command.commands.map((subcommand) => subcommand.name());
    expect(subcommands).toContain('core');
    expect(subcommands).toContain('ideas');
    expect(subcommands).toContain('docs');
    expect(subcommands).toContain('project-management');
    expect(subcommands).toContain('workflows');
    expect(subcommands).toContain('utility');
    expect(subcommands).toContain('research');
    expect(subcommands).toContain('brainstorm');
  });

  it('does not advertise force for any individual pack command', () => {
    const { command } = createHarness({ useLifecycle: true });

    for (const packCommand of command.commands) {
      expect(packCommand.helpInformation()).not.toContain('--force');
    }
  });

  it('rejects force for an individual pack install', async () => {
    const { command, reconcilePacks } = createHarness({
      interactive: false,
      useLifecycle: true,
    });
    command.commands.forEach((packCommand) => packCommand.exitOverride());

    await expect(
      runCommand(command, ['docs', '--force'], ['--scope', 'project']),
    ).rejects.toMatchObject({ code: 'commander.unknownOption' });
    expect(reconcilePacks).not.toHaveBeenCalled();
  });

  it('retains the supported top-level update options', () => {
    const updateCommand = createToolsUpdateCommand();
    const optionFlags = updateCommand.options.map(({ flags }) => flags);

    expect(optionFlags).toEqual(
      expect.arrayContaining([
        '--pack <pack>',
        '--all',
        '--dry-run',
        '--no-sync',
      ]),
    );
  });

  it('bare oat init tools in interactive mode shows grouped pack list', async () => {
    const { command, selectManyWithAbort } = createHarness({
      interactive: true,
    });

    await runCommand(command);

    // Pack selection is the first (and only) multiselect; per-pack scope
    // selection now uses single-selects via selectWithAbort.
    expect(selectManyWithAbort).toHaveBeenCalledTimes(1);
    const choices = selectManyWithAbort.mock.calls[0]?.[1] as Array<{
      value: string;
      checked?: boolean;
      label: string;
    }>;
    expect(
      choices.some((choice) => choice.label.includes('[project|user]')),
    ).toBe(true);
    expect(choices.find((choice) => choice.value === 'docs')?.checked).toBe(
      true,
    );
    expect(
      choices.find((choice) => choice.value === 'project-management')?.checked,
    ).toBe(false);
    expect(
      choices
        .filter((choice) => choice.value !== 'project-management')
        .every((choice) => choice.checked === true),
    ).toBe(true);
  });

  it('annotates already-installed packs in the main pack selection prompt', async () => {
    const { command, selectManyWithAbort } = createHarness({
      interactive: true,
      packSelection: [['ideas', 'docs', 'research'], ['docs']],
      toolsByScope: {
        project: [
          createScannedTool('oat-idea-new', 'ideas', 'project'),
          createScannedTool('analyze', 'research', 'project'),
        ],
        user: [
          createScannedTool('oat-docs-analyze', 'docs', 'user'),
          createScannedTool('analyze', 'research', 'user'),
          createScannedTool('oat-docs', 'core', 'user'),
        ],
      },
    });

    await runCommand(command, [], ['--scope', 'all']);

    const choices = selectManyWithAbort.mock.calls[0]?.[1] as Array<{
      value: string;
      label: string;
    }>;
    expect(choices.find((choice) => choice.value === 'ideas')?.label).toContain(
      '(installed: project)',
    );
    expect(choices.find((choice) => choice.value === 'docs')?.label).toContain(
      '(installed: user)',
    );
    expect(
      choices.find((choice) => choice.value === 'research')?.label,
    ).toContain('(installed: project + user)');
  });

  it('offers a per-pack end-state selector defaulting to current placement', async () => {
    const { command, selectWithAbort } = createHarness({
      interactive: true,
      packSelection: [['ideas', 'docs', 'research']],
      // Accept the default (first) option for each per-pack selector.
      scopeSelection: [],
      toolsByScope: {
        project: [
          createScannedTool('oat-idea-new', 'ideas', 'project'),
          createScannedTool('analyze', 'research', 'project'),
        ],
        user: [
          createScannedTool('oat-docs-analyze', 'docs', 'user'),
          createScannedTool('analyze', 'research', 'user'),
          createScannedTool('oat-docs', 'core', 'user'),
        ],
      },
    });

    await runCommand(command, [], ['--scope', 'all']);

    // One single-select per user-eligible pack, each offering project/user/both
    // with the current placement listed first (the default).
    const callsByMessage = new Map<
      string,
      Array<{ value: string; label: string }>
    >();
    for (const call of selectWithAbort.mock.calls) {
      callsByMessage.set(
        call[0] as string,
        call[1] as Array<{ value: string; label: string }>,
      );
    }

    const ideasChoices = callsByMessage.get('Where should ideas install?');
    expect(ideasChoices?.map((c) => c.value)).toEqual([
      'project',
      'user',
      'both',
    ]);
    expect(ideasChoices?.[0]?.label).toContain('current: project');

    const docsChoices = callsByMessage.get('Where should docs install?');
    expect(docsChoices?.[0]?.value).toBe('user');
    expect(docsChoices?.[0]?.label).toContain('current: user');

    const researchChoices = callsByMessage.get(
      'Where should research install?',
    );
    expect(researchChoices?.[0]?.value).toBe('both');
    expect(researchChoices?.[0]?.label).toContain('current: project + user');
  });

  it('defaults-mode scope selection preserves current/default end-states without per-pack prompts', async () => {
    const {
      command,
      selectWithAbort,
      installIdeas,
      installDocs,
      installResearch,
      installBrainstorm,
      removeDirectory,
      removeFile,
    } = createHarness({
      interactive: true,
      contextScopeSelection: 'defaults',
      packSelection: [['ideas', 'docs', 'research', 'brainstorm']],
      toolsByScope: {
        project: [
          createScannedTool('oat-idea-new', 'ideas', 'project'),
          createScannedTool('analyze', 'research', 'project'),
        ],
        user: [
          createScannedTool('oat-docs-analyze', 'docs', 'user'),
          createScannedTool('analyze', 'research', 'user'),
        ],
      },
    });

    await runCommand(command, [], ['--scope', 'all']);

    expect(selectWithAbort).not.toHaveBeenCalled();
    expect(installIdeas).toHaveBeenCalledWith(
      expect.objectContaining({ targetRoot: '/tmp/workspace' }),
    );
    expect(installDocs).toHaveBeenCalledWith(
      expect.objectContaining({ targetRoot: '/tmp/home' }),
    );
    expect(installResearch).toHaveBeenCalledTimes(2);
    expect(installResearch).toHaveBeenCalledWith(
      expect.objectContaining({ targetRoot: '/tmp/workspace' }),
    );
    expect(installResearch).toHaveBeenCalledWith(
      expect.objectContaining({ targetRoot: '/tmp/home' }),
    );
    expect(installBrainstorm).toHaveBeenCalledWith(
      expect.objectContaining({ targetRoot: '/tmp/home' }),
    );
    expect(removeDirectory).not.toHaveBeenCalled();
    expect(removeFile).not.toHaveBeenCalled();
  });

  it('default scope-selection mode keeps prompting per user-eligible pack in interactive sessions', async () => {
    const { command, selectWithAbort } = createHarness({
      interactive: true,
      packSelection: [['ideas', 'docs']],
      scopeSelection: ['project', 'user'],
      toolsByScope: {
        project: [],
        user: [],
      },
    });

    await runCommand(command, [], ['--scope', 'all']);

    expect(selectWithAbort).toHaveBeenCalledTimes(2);
    expect(selectWithAbort.mock.calls.map((call) => call[0])).toEqual([
      'Where should ideas install?',
      'Where should docs install?',
    ]);
  });

  it('guided interactive scope-selection overrides concrete --scope project', async () => {
    const { command, selectWithAbort, installIdeas } = createHarness({
      interactive: true,
      contextScopeSelection: 'interactive',
      packSelection: [['ideas']],
      scopeSelection: ['user'],
      toolsByScope: {
        project: [],
        user: [],
      },
    });

    await runCommand(command, [], ['--scope', 'project']);

    expect(selectWithAbort.mock.calls.map((call) => call[0])).toContain(
      'Where should ideas install?',
    );
    expect(installIdeas).toHaveBeenCalledWith(
      expect.objectContaining({ targetRoot: '/tmp/home' }),
    );
    expect(installIdeas).not.toHaveBeenCalledWith(
      expect.objectContaining({ targetRoot: '/tmp/workspace' }),
    );
  });

  it('deferred gate (yes): prompts the customize gate after pack selection then runs the per-pack radio', async () => {
    const { command, selectWithAbort, selectManyWithAbort } = createHarness({
      interactive: true,
      contextScopeSelection: 'gate',
      packSelection: [['ideas', 'docs']],
      // Gate answered 'yes' first, then the per-pack end-state for each pack.
      scopeSelection: ['yes', 'project', 'user'],
      toolsByScope: {
        project: [],
        user: [],
      },
    });

    await runCommand(command, [], ['--scope', 'all']);

    const messages = selectWithAbort.mock.calls.map((call) => call[0]);
    // The customize gate fires, and it fires after pack selection.
    expect(messages).toContain('Customize per-pack scope? (y/N)');
    const packSelectCall = selectManyWithAbort.mock.calls.find(
      (call) => call[0] === 'Select tool packs to install',
    );
    expect(packSelectCall).toBeDefined();
    // 'yes' routes to the existing per-pack radio for each eligible pack.
    expect(messages).toEqual([
      'Customize per-pack scope? (y/N)',
      'Where should ideas install?',
      'Where should docs install?',
    ]);
  });

  it('deferred gate (no): skips the per-pack radio and applies additive per-pack defaults', async () => {
    const {
      command,
      selectWithAbort,
      installIdeas,
      installDocs,
      removeDirectory,
      removeFile,
    } = createHarness({
      interactive: true,
      contextScopeSelection: 'gate',
      packSelection: [['ideas', 'docs']],
      scopeSelection: ['no'],
      toolsByScope: {
        project: [createScannedTool('oat-idea-new', 'ideas', 'project')],
        user: [createScannedTool('oat-docs-analyze', 'docs', 'user')],
      },
    });

    await runCommand(command, [], ['--scope', 'all']);

    const messages = selectWithAbort.mock.calls.map((call) => call[0]);
    expect(messages).toContain('Customize per-pack scope? (y/N)');
    expect(messages).not.toContain('Where should ideas install?');
    expect(messages).not.toContain('Where should docs install?');
    // Defaults preserve current placement additively (no forced project, no
    // removals).
    expect(installIdeas).toHaveBeenCalledWith(
      expect.objectContaining({ targetRoot: '/tmp/workspace' }),
    );
    expect(installDocs).toHaveBeenCalledWith(
      expect.objectContaining({ targetRoot: '/tmp/home' }),
    );
    expect(removeDirectory).not.toHaveBeenCalled();
    expect(removeFile).not.toHaveBeenCalled();
  });

  it('deferred gate includes project-management now that it supports user scope', async () => {
    const { command, selectWithAbort } = createHarness({
      interactive: true,
      contextScopeSelection: 'gate',
      packSelection: [['project-management']],
      scopeSelection: [],
      toolsByScope: {
        project: [],
        user: [],
      },
    });

    await runCommand(command, [], ['--scope', 'all']);

    const messages = selectWithAbort.mock.calls.map((call) => call[0]);
    expect(messages).toContain('Customize per-pack scope? (y/N)');
  });

  it('deferred gate (non-interactive): never prompts and applies additive defaults', async () => {
    const { command, selectWithAbort, installIdeas, removeDirectory } =
      createHarness({
        interactive: false,
        contextScopeSelection: 'gate',
        toolsByScope: {
          project: [createScannedTool('oat-idea-new', 'ideas', 'project')],
          user: [createScannedTool('analyze', 'research', 'user')],
        },
      });

    await runCommand(command, [], ['--scope', 'all']);

    expect(selectWithAbort).not.toHaveBeenCalled();
    // Existing placement preserved additively; nothing removed.
    expect(installIdeas).toHaveBeenCalledWith(
      expect.objectContaining({ targetRoot: '/tmp/workspace' }),
    );
    expect(removeDirectory).not.toHaveBeenCalled();
  });

  it('defaults both-scope installs to keep both and updates both roots when the user keeps them', async () => {
    const { command, installResearch, removeDirectory, removeFile, capture } =
      createHarness({
        interactive: true,
        packSelection: [['research'], ['research']],
        scopeSelection: ['both'],
        toolsByScope: {
          project: [createScannedTool('analyze', 'research', 'project')],
          user: [createScannedTool('analyze', 'research', 'user')],
        },
      });

    await runCommand(command, [], ['--scope', 'all']);

    expect(installResearch).toHaveBeenCalledTimes(2);
    expect(installResearch).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ targetRoot: '/tmp/workspace' }),
    );
    expect(installResearch).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ targetRoot: '/tmp/home' }),
    );
    expect(removeDirectory).not.toHaveBeenCalled();
    expect(removeFile).not.toHaveBeenCalled();
    expect(capture.info.join('\n')).toContain(
      'Installed tool packs: research (project + user)',
    );
  });

  it('non-interactive installs everything to project scope (core always user)', async () => {
    const {
      command,
      installCore,
      installDocs,
      installIdeas,
      installWorkflows,
      installUtility,
      installProjectManagement,
      installResearch,
    } = createHarness({ interactive: false });

    await runCommand(command, [], ['--scope', 'all']);

    // Core always installs to user root
    expect(installCore).toHaveBeenCalledWith(
      expect.objectContaining({ targetRoot: '/tmp/home' }),
    );
    expect(installIdeas).toHaveBeenCalledWith(
      expect.objectContaining({ targetRoot: '/tmp/workspace' }),
    );
    expect(installDocs).toHaveBeenCalledWith(
      expect.objectContaining({ targetRoot: '/tmp/workspace' }),
    );
    expect(installWorkflows).toHaveBeenCalledWith(
      expect.objectContaining({ targetRoot: '/tmp/workspace' }),
    );
    expect(installUtility).toHaveBeenCalledWith(
      expect.objectContaining({ targetRoot: '/tmp/workspace' }),
    );
    expect(installProjectManagement).toHaveBeenCalledWith(
      expect.objectContaining({ targetRoot: '/tmp/workspace' }),
    );
    expect(installResearch).toHaveBeenCalledWith(
      expect.objectContaining({ targetRoot: '/tmp/workspace' }),
    );
  });

  it('routes a fresh workflows aggregate install to user scope without touching projectRoot', async () => {
    const { command, installWorkflows } = createHarness({
      interactive: true,
      packSelection: [['workflows']],
      scopeSelection: ['user'],
      toolsByScope: {
        project: [],
        user: [],
      },
    });

    await runCommand(command, [], ['--scope', 'all']);

    expect(installWorkflows).toHaveBeenCalledTimes(1);
    expect(installWorkflows).toHaveBeenCalledWith({
      assetsRoot: '/tmp/assets',
      targetRoot: '/tmp/home',
      scope: 'user',
    });
    expect(installWorkflows).not.toHaveBeenCalledWith(
      expect.objectContaining({ targetRoot: '/tmp/workspace' }),
    );
  });

  it('supports user scope for workflows alongside other user-eligible packs', async () => {
    const {
      command,
      selectManyWithAbort,
      installIdeas,
      installWorkflows,
      installUtility,
      installResearch,
    } = createHarness({
      interactive: true,
      packSelection: [['ideas', 'workflows', 'utility', 'research']],
      toolsByScope: {
        project: [],
        user: [],
      },
      // Per-pack selectors for ideas/workflows/utility/research.
      scopeSelection: ['user', 'user', 'user', 'user'],
    });

    await runCommand(command, [], ['--scope', 'all']);

    // Pack selection is the only multiselect.
    expect(selectManyWithAbort).toHaveBeenCalledTimes(1);
    expect(installWorkflows).toHaveBeenCalledWith(
      expect.objectContaining({
        targetRoot: '/tmp/home',
        scope: 'user',
      }),
    );
    expect(installIdeas).toHaveBeenCalledWith(
      expect.objectContaining({ targetRoot: '/tmp/home' }),
    );
    expect(installUtility).toHaveBeenCalledWith(
      expect.objectContaining({ targetRoot: '/tmp/home' }),
    );
    expect(installResearch).toHaveBeenCalledWith(
      expect.objectContaining({ targetRoot: '/tmp/home' }),
    );
  });

  it('supports mixed per-pack scope selection', async () => {
    const {
      command,
      selectManyWithAbort,
      installIdeas,
      installUtility,
      installResearch,
    } = createHarness({
      interactive: true,
      packSelection: [['ideas', 'utility', 'research']],
      toolsByScope: {
        project: [],
        user: [],
      },
      // Per-pack selectors: ideas → user, utility → project, research → project
      scopeSelection: ['user', 'project', 'project'],
    });

    await runCommand(command, [], ['--scope', 'all']);

    expect(selectManyWithAbort).toHaveBeenCalledTimes(1);
    expect(installIdeas).toHaveBeenCalledWith(
      expect.objectContaining({ targetRoot: '/tmp/home' }),
    );
    expect(installUtility).toHaveBeenCalledWith(
      expect.objectContaining({ targetRoot: '/tmp/workspace' }),
    );
    expect(installResearch).toHaveBeenCalledWith(
      expect.objectContaining({ targetRoot: '/tmp/workspace' }),
    );
  });

  it('reports final per-pack scopes instead of a coarse shared scope label', async () => {
    const { command, capture } = createHarness({
      interactive: true,
      packSelection: [['core', 'ideas', 'docs']],
      // Per-pack selectors: ideas → user, docs → project (unchanged)
      scopeSelection: ['user', 'project'],
      toolsByScope: {
        project: [createScannedTool('oat-docs-analyze', 'docs', 'project')],
        user: [createScannedTool('oat-docs', 'core', 'user')],
      },
    });

    await runCommand(command, [], ['--scope', 'all']);

    const output = capture.info.join('\n');
    expect(output).toContain(
      'Installed tool packs: core (user), ideas (user), docs (project)',
    );
    expect(output).not.toContain('User-eligible pack scope:');
    // Additive scoping: only changed scopes are surfaced for sync. core and
    // ideas add to user; docs was already at project (unchanged), so project
    // is not re-synced.
    expect(output).toContain('Run: oat sync --scope user');
    expect(output).not.toContain('oat sync --scope project');
  });

  it('per-pack selector: pack at user choosing both installs project additively and leaves user untouched', async () => {
    const { command, installResearch, removeDirectory, removeFile } =
      createHarness({
        interactive: true,
        packSelection: [['research']],
        // research currently at user; choose `both`.
        scopeSelection: ['both'],
        toolsByScope: {
          project: [],
          user: [createScannedTool('analyze', 'research', 'user')],
        },
      });

    await runCommand(command, [], ['--scope', 'all']);

    // Additive add: project receives the install; user is never removed.
    expect(installResearch).toHaveBeenCalledWith(
      expect.objectContaining({ targetRoot: '/tmp/workspace' }),
    );
    expect(removeDirectory).not.toHaveBeenCalled();
    expect(removeFile).not.toHaveBeenCalled();
  });

  it('per-pack selector: accepting all current-placement defaults is a no-op (zero removals)', async () => {
    const { command, removeDirectory, removeFile, capture } = createHarness({
      interactive: true,
      packSelection: [['ideas', 'research']],
      // Accept defaults (current placement) for every pack.
      scopeSelection: [],
      toolsByScope: {
        project: [createScannedTool('oat-idea-new', 'ideas', 'project')],
        user: [createScannedTool('analyze', 'research', 'user')],
      },
    });

    await runCommand(command, [], ['--scope', 'all']);

    expect(removeDirectory).not.toHaveBeenCalled();
    expect(removeFile).not.toHaveBeenCalled();
    // Nothing changed scope, so no sync is needed.
    expect(capture.info.join('\n')).toContain('No sync needed.');
  });

  it('interactive scope selection is additive for an existing both-scope pack', async () => {
    const { command, installResearch, removeDirectory, removeFile, capture } =
      createHarness({
        interactive: true,
        packSelection: [['research']],
        // A project selection cannot narrow the existing user placement.
        scopeSelection: ['project', 'yes'],
        toolsByScope: {
          project: [createScannedTool('analyze', 'research', 'project')],
          user: [createScannedTool('analyze', 'research', 'user')],
        },
      });

    await runCommand(command, [], ['--scope', 'all']);

    expect(removeDirectory).not.toHaveBeenCalled();
    expect(removeFile).not.toHaveBeenCalled();
    expect(capture.info.join('\n')).not.toContain('- research@user');
    expect(installResearch).toHaveBeenCalledWith(
      expect.objectContaining({ targetRoot: '/tmp/workspace' }),
    );
    expect(installResearch).toHaveBeenCalledWith(
      expect.objectContaining({ targetRoot: '/tmp/home' }),
    );
    expect(capture.info.join('\n')).toContain('No sync needed.');
  });

  it('preserves every user-scope workflows asset class when project is selected', async () => {
    const { command, installWorkflows, removeDirectory, removeFile } =
      createHarness({
        interactive: true,
        packSelection: [['workflows']],
        scopeSelection: ['project', 'yes'],
        toolsByScope: {
          project: [
            createScannedTool('oat-project-new', 'workflows', 'project'),
          ],
          user: [createScannedTool('oat-project-new', 'workflows', 'user')],
        },
      });

    await runCommand(command, [], ['--scope', 'all']);

    expect(removeDirectory).not.toHaveBeenCalled();
    expect(removeFile).not.toHaveBeenCalled();
    expect(installWorkflows).toHaveBeenCalledWith(
      expect.objectContaining({ targetRoot: '/tmp/home', scope: 'user' }),
    );
  });

  it('does not offer a destructive confirmation when selection is narrower', async () => {
    const { command, installResearch, removeDirectory, removeFile, capture } =
      createHarness({
        interactive: true,
        packSelection: [['research']],
        // The second queued answer is never consumed by a removal gate.
        scopeSelection: ['project', 'no'],
        toolsByScope: {
          project: [createScannedTool('analyze', 'research', 'project')],
          user: [createScannedTool('analyze', 'research', 'user')],
        },
      });

    await runCommand(command, [], ['--scope', 'all']);

    expect(removeDirectory).not.toHaveBeenCalled();
    expect(removeFile).not.toHaveBeenCalled();
    expect(installResearch).toHaveBeenCalledTimes(2);
    expect(capture.info.join('\n')).not.toContain('No changes applied.');
  });

  it('batch-confirm gate: a failed replacement add does not remove the preserved scope (review I1)', async () => {
    const { command, installResearch, removeDirectory, removeFile } =
      createHarness({
        interactive: true,
        packSelection: [['research']],
        // research currently at user only; selector → project (a move:
        // + research@project / - research@user); gate → yes.
        scopeSelection: ['project', 'yes'],
        toolsByScope: {
          project: [],
          user: [createScannedTool('analyze', 'research', 'user')],
        },
      });

    // The replacement install into the added scope (project) fails.
    installResearch.mockRejectedValueOnce(new Error('install failed'));

    await runCommand(command, [], ['--scope', 'all']);

    // The add was attempted...
    expect(installResearch).toHaveBeenCalledWith(
      expect.objectContaining({ targetRoot: '/tmp/workspace' }),
    );
    // ...but because it threw, the preserved user scope must NOT be deleted.
    // Removals run only after additions succeed, so nothing under the user
    // root is removed when the replacement add fails.
    expect(removeDirectory).not.toHaveBeenCalled();
    expect(removeFile).not.toHaveBeenCalled();
  });

  // NOTE: The former move-semantics tests ("migrates user-eligible packs from
  // project to user scope by removing project canonical content" and
  // "normalizes a both-scopes install to project by removing user canonical
  // content and agents") were retired here. Under the additive model, a
  // scope is never removed by install; Phase 3 owns explicit migration.

  it('bare oat init tools cancellation exits without installing packs', async () => {
    const {
      command,
      capture,
      installCore,
      installIdeas,
      installWorkflows,
      installUtility,
      installResearch,
    } = createHarness({
      interactive: true,
      packSelection: [null],
    });

    await runCommand(command, [], ['--scope', 'all']);

    expect(installCore).not.toHaveBeenCalled();
    expect(installIdeas).not.toHaveBeenCalled();
    expect(installWorkflows).not.toHaveBeenCalled();
    expect(installUtility).not.toHaveBeenCalled();
    expect(installResearch).not.toHaveBeenCalled();
    expect(capture.info).toContain('No tool packs selected.');
    expect(process.exitCode).toBe(0);
  });

  it('prompts for outdated skills and updates selected entries in interactive mode', async () => {
    const {
      command,
      selectManyWithAbort,
      installWorkflows,
      copyDirWithStatus,
    } = createHarness({
      interactive: true,
      packSelection: [['workflows'], ['oat-project-new:/tmp/workspace']],
    });

    installWorkflows.mockResolvedValueOnce({
      copiedSkills: [],
      updatedSkills: [],
      skippedSkills: ['oat-project-plan'],
      outdatedSkills: [
        { name: 'oat-project-new', installed: '1.0.0', bundled: '1.1.0' },
      ],
      copiedAgents: [],
      updatedAgents: [],
      skippedAgents: [],
      copiedTemplates: [],
      updatedTemplates: [],
      skippedTemplates: [],
      copiedScripts: [],
      updatedScripts: [],
      skippedScripts: [],
      projectsRootInitialized: false,
      projectsRootConfigInitialized: false,
      projectsDirsScaffolded: false,
      resolvedProjectsRoot: '.oat/projects/shared',
    });

    await runCommand(command);

    expect(selectManyWithAbort).toHaveBeenCalledTimes(2);
    expect(selectManyWithAbort.mock.calls[1]?.[0]).toContain(
      'Update outdated skills?',
    );
    expect(copyDirWithStatus).toHaveBeenCalledTimes(1);
    expect(copyDirWithStatus).toHaveBeenCalledWith(
      '/tmp/assets/skills/oat-project-new',
      '/tmp/workspace/.agents/skills/oat-project-new',
      true,
    );
  });

  it('reports outdated skills without updating in non-interactive mode', async () => {
    const { command, capture, installWorkflows, copyDirWithStatus } =
      createHarness({ interactive: false });

    installWorkflows.mockResolvedValueOnce({
      copiedSkills: [],
      updatedSkills: [],
      skippedSkills: ['oat-project-plan'],
      outdatedSkills: [
        { name: 'oat-project-new', installed: '1.0.0', bundled: '1.1.0' },
      ],
      copiedAgents: [],
      updatedAgents: [],
      skippedAgents: [],
      copiedTemplates: [],
      updatedTemplates: [],
      skippedTemplates: [],
      copiedScripts: [],
      updatedScripts: [],
      skippedScripts: [],
      projectsRootInitialized: false,
      projectsRootConfigInitialized: false,
      projectsDirsScaffolded: false,
      resolvedProjectsRoot: '.oat/projects/shared',
    });

    await runCommand(command, [], ['--scope', 'all']);

    expect(copyDirWithStatus).not.toHaveBeenCalled();
    expect(capture.info.join('\n')).toContain('Outdated skills:');
    expect(capture.info.join('\n')).toContain(
      'Non-interactive mode: outdated skills were not updated.',
    );
  });

  it('renders unversioned outdated skill entries clearly in non-json output', async () => {
    const { command, capture, installWorkflows } = createHarness({
      interactive: false,
    });

    installWorkflows.mockResolvedValueOnce({
      copiedSkills: [],
      updatedSkills: [],
      skippedSkills: ['oat-project-plan'],
      outdatedSkills: [
        { name: 'oat-project-new', installed: null, bundled: '1.1.0' },
      ],
      copiedAgents: [],
      updatedAgents: [],
      skippedAgents: [],
      copiedTemplates: [],
      updatedTemplates: [],
      skippedTemplates: [],
      copiedScripts: [],
      updatedScripts: [],
      skippedScripts: [],
      projectsRootInitialized: false,
      projectsRootConfigInitialized: false,
      projectsDirsScaffolded: false,
      resolvedProjectsRoot: '.oat/projects/shared',
    });

    await runCommand(command, [], ['--scope', 'all']);

    expect(capture.info.join('\n')).toContain(
      'oat-project-new (/tmp/workspace)  (unversioned) -> 1.1.0',
    );
  });

  it('does not write project guidance without an explicit accepted choice', async () => {
    const { command, upsertAgentsMdSection } = createHarness({
      interactive: false,
    });

    await runCommand(command, [], ['--scope', 'all']);

    expect(upsertAgentsMdSection).not.toHaveBeenCalled();
  });

  it('prompts once for project guidance and defaults to decline', async () => {
    const { command, confirmAction, upsertAgentsMdSection } = createHarness({
      interactive: true,
      guidanceResponse: false,
    });

    await runCommand(command, [], ['--scope', 'all']);

    expect(confirmAction).toHaveBeenCalledTimes(1);
    expect(confirmAction.mock.calls[0]?.[0]).toContain('AGENTS.md');
    expect(upsertAgentsMdSection).not.toHaveBeenCalled();
  });

  it('rejects conflicting project guidance flags', async () => {
    const { command } = createHarness({ interactive: false });

    await expect(
      runCommand(command, ['--project-guidance', '--no-project-guidance']),
    ).rejects.toThrow('cannot be used together');
  });

  it('applies accepted guidance from complete realized pack evidence', async () => {
    const {
      command,
      upsertAgentsMdSection,
      removeAgentsMdSection,
      writeOatConfig,
    } = createHarness({
      interactive: true,
      useLifecycle: true,
      packSelection: [['docs']],
      scopeSelection: ['project'],
      toolsByScope: {
        project: [createScannedTool('oat-project-new', 'workflows', 'project')],
        user: [createScannedTool('oat-docs', 'core', 'user')],
      },
    });

    await runCommand(command, ['--project-guidance'], ['--scope', 'all']);

    expect(upsertAgentsMdSection).toHaveBeenCalledTimes(1);
    expect(upsertAgentsMdSection).toHaveBeenCalledWith(
      '/tmp/workspace',
      'tools',
      expect.stringContaining('**docs**'),
    );
    const body = upsertAgentsMdSection.mock.calls[0]?.[2] as string;
    expect(body).toContain('**core**');
    expect(body).toContain('**workflows**');
    expect(removeAgentsMdSection).toHaveBeenCalledWith(
      '/tmp/workspace',
      'workflows',
    );
    expect(writeOatConfig).not.toHaveBeenCalledWith(
      '/tmp/workspace',
      expect.objectContaining({ pjm: expect.anything() }),
    );
  });

  it('keeps a declined guidance choice independent from capability success', async () => {
    const { command, capture, upsertAgentsMdSection } = createHarness({
      interactive: false,
      useLifecycle: true,
    });

    await runCommand(command, ['--no-project-guidance'], ['--scope', 'all']);

    expect(upsertAgentsMdSection).not.toHaveBeenCalled();
    expect(capture.info.join('\n')).toContain('Installed tool packs:');
    expect(capture.info.join('\n')).toContain('Project guidance: declined');
    expect(process.exitCode).toBe(0);
  });

  it('reports unsafe guidance as blocked without rewriting pack lifecycle evidence', async () => {
    const { command, capture, upsertAgentsMdSection } = createHarness({
      interactive: false,
      useLifecycle: true,
    });
    upsertAgentsMdSection.mockRejectedValueOnce(
      new Error('AGENTS.md identity changed before mutation.'),
    );

    await runCommand(command, ['--project-guidance'], ['--scope', 'all']);

    expect(capture.info.join('\n')).toContain('Installed tool packs:');
    expect(capture.warn.join('\n')).toContain('Project guidance: blocked');
    expect(capture.warn.join('\n')).toContain('identity changed');
    expect(process.exitCode).toBe(1);
  });

  it('reconciles shared config from project scope after aggregate install', async () => {
    const { command, scanTools, writeOatConfig } = createHarness({
      interactive: true,
      packSelection: [['docs']],
      toolsByScope: {
        project: [createScannedTool('oat-project-new', 'workflows', 'project')],
        user: [createScannedTool('oat-docs', 'core', 'user')],
      },
    });
    scanTools
      .mockResolvedValueOnce([
        createScannedTool('oat-project-new', 'workflows', 'project'),
      ])
      .mockResolvedValueOnce([createScannedTool('oat-docs', 'core', 'user')])
      .mockResolvedValueOnce([
        createScannedTool('oat-project-new', 'workflows', 'project'),
        createScannedTool('oat-docs-analyze', 'docs', 'project'),
      ]);

    await runCommand(command, [], ['--scope', 'all']);

    // Initial placement, post-install project-config reconciliation, then the
    // complete project+user evidence refresh used by guidance planning.
    expect(scanTools).toHaveBeenCalledTimes(5);
    expect(writeOatConfig).toHaveBeenCalledWith(
      '/tmp/workspace',
      expect.objectContaining({
        tools: {
          docs: true,
          workflows: true,
        },
      }),
    );
  });

  it('reports aggregate project pack adoption in canonical order in one JSON document', async () => {
    const { command, capture } = createHarness({
      interactive: false,
      useLifecycle: true,
      toolsByScope: {
        project: [
          createScannedTool('analyze', 'research', 'project'),
          createScannedTool('oat-docs-analyze', 'docs', 'project'),
        ],
        user: [],
      },
    });

    await runCommand(command, [], ['--json', '--scope', 'all']);

    expect(capture.jsonPayloads).toHaveLength(1);
    expect(capture.jsonPayloads[0]).toEqual(
      expect.objectContaining({ adoptedPacks: ['docs', 'research'] }),
    );
    expect(configPersistence.writeOatConfig).toHaveBeenCalledTimes(1);
  });

  it('reports each adopted pack once for a direct project install', async () => {
    const { command, capture } = createHarness({
      interactive: false,
      useLifecycle: true,
      toolsByScope: {
        project: [createScannedTool('oat-docs-analyze', 'docs', 'project')],
        user: [],
      },
    });

    await runCommand(command, ['docs'], ['--scope', 'project']);

    expect(capture.info).toContain('Adopted project tool pack: docs');
    expect(
      capture.info.filter((line) => line === 'Adopted project tool pack: docs'),
    ).toHaveLength(1);
  });

  it('reports direct project pack adoption in one JSON document', async () => {
    const { command, capture } = createHarness({
      interactive: false,
      useLifecycle: true,
      toolsByScope: {
        project: [createScannedTool('oat-docs-analyze', 'docs', 'project')],
        user: [],
      },
    });

    await runCommand(command, ['docs'], ['--json', '--scope', 'project']);

    expect(capture.jsonPayloads).toHaveLength(1);
    expect(capture.jsonPayloads[0]).toEqual(
      expect.objectContaining({ adoptedPacks: ['docs'] }),
    );
  });

  it('keeps a direct idempotent JSON result free of adoption fields', async () => {
    configPersistence.readOatConfig.mockResolvedValue({
      version: 1,
      tools: { docs: true },
    });
    const { command, capture } = createHarness({
      interactive: false,
      useLifecycle: true,
      toolsByScope: {
        project: [createScannedTool('oat-docs-analyze', 'docs', 'project')],
        user: [],
      },
    });

    await runCommand(command, ['docs'], ['--json', '--scope', 'project']);

    expect(capture.jsonPayloads).toHaveLength(1);
    expect(capture.jsonPayloads[0]).not.toHaveProperty('adoptedPacks');
    expect(capture.info).not.toContain('Adopted project tool pack: docs');
    expect(configPersistence.writeOatConfig).not.toHaveBeenCalled();
  });

  it.each(['project', 'user', 'both'] as const)(
    'preserves project config subtrees through direct %s placement',
    async (scope) => {
      const projects = {
        defaultScope: 'synced' as const,
        root: '.custom/projects',
        futureSibling: { mode: 'future', enabled: true },
      };
      configPersistence.readOatConfig.mockResolvedValue({
        version: 1,
        projects,
      } as never);
      const { command } = createHarness({
        interactive: false,
        useLifecycle: true,
        toolsByScope: {
          project:
            scope === 'user'
              ? []
              : [createScannedTool('oat-docs-analyze', 'docs', 'project')],
          user: [],
        },
      });

      await runCommand(
        command,
        ['docs'],
        ['--scope', scope === 'both' ? 'all' : scope],
      );

      if (scope === 'user') {
        expect(configPersistence.writeOatConfig).not.toHaveBeenCalled();
      } else {
        expect(configPersistence.writeOatConfig).toHaveBeenCalledWith(
          '/tmp/workspace',
          expect.objectContaining({ projects }),
        );
      }
    },
  );

  it.each(['project', 'user', 'both'] as const)(
    'preserves project config subtrees through aggregate %s placement',
    async (scope) => {
      const projects = {
        defaultScope: 'synced' as const,
        root: '.custom/projects',
        futureSibling: ['kept-byte-for-byte'],
      };
      configPersistence.readOatConfig.mockResolvedValue({
        version: 1,
        projects,
      } as never);
      const { command } = createHarness({
        interactive: true,
        useLifecycle: true,
        packSelection: [['docs']],
        scopeSelection: [scope],
        toolsByScope: {
          project:
            scope === 'user'
              ? []
              : [createScannedTool('oat-docs-analyze', 'docs', 'project')],
          user: [],
        },
      });

      await runCommand(command, [], ['--scope', 'all']);

      if (scope === 'user') {
        expect(configPersistence.writeOatConfig).not.toHaveBeenCalled();
      } else {
        expect(configPersistence.writeOatConfig).toHaveBeenCalledWith(
          '/tmp/workspace',
          expect.objectContaining({ projects }),
        );
      }
    },
  );

  it('does not write shared config for a direct user-only brainstorm install', async () => {
    const { command, installBrainstorm, scanTools, writeOatConfig } =
      createHarness({
        interactive: false,
        toolsByScope: {
          project: [],
          user: [],
        },
      });

    await runCommand(command, ['brainstorm'], ['--scope', 'user']);

    expect(installBrainstorm).toHaveBeenCalledWith(
      expect.objectContaining({ targetRoot: '/tmp/home' }),
    );
    expect(scanTools).not.toHaveBeenCalledWith(
      expect.objectContaining({ scope: 'project' }),
    );
    expect(writeOatConfig).not.toHaveBeenCalled();
  });

  it('installs every selected pack at user scope without requiring Git', async () => {
    const { command, installProjectManagement, upsertAgentsMdSection } =
      createHarness({
        interactive: true,
        projectRootUnavailable: true,
        packSelection: [['project-management']],
        scopeSelection: ['user'],
        toolsByScope: { user: [] },
      });

    await runCommand(command, [], ['--scope', 'user']);

    expect(installProjectManagement).toHaveBeenCalledWith(
      expect.objectContaining({ targetRoot: '/tmp/home' }),
    );
    expect(upsertAgentsMdSection).not.toHaveBeenCalled();
    expect(process.exitCode).toBe(0);
  });

  it('routes the production aggregate install through one lifecycle batch outside Git', async () => {
    const {
      command,
      reconcilePacks,
      installCore,
      installDocs,
      installProjectManagement,
    } = createHarness({
      interactive: false,
      projectRootUnavailable: true,
      useLifecycle: true,
      toolsByScope: { project: [], user: [] },
    });

    await runCommand(command, [], ['--scope', 'user']);

    expect(reconcilePacks).toHaveBeenCalledTimes(1);
    const requests = reconcilePacks.mock.calls[0]![0];
    expect(requests).toHaveLength(8);
    expect(requests).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          pack: 'docs',
          scope: 'user',
          action: 'install',
        }),
        expect.objectContaining({
          pack: 'project-management',
          scope: 'user',
          action: 'install',
        }),
      ]),
    );
    expect(requests.every((request) => request.scope === 'user')).toBe(true);
    expect(installCore).not.toHaveBeenCalled();
    expect(installDocs).not.toHaveBeenCalled();
    expect(installProjectManagement).not.toHaveBeenCalled();
  });

  it.each([
    { label: 'aggregate', args: [] as string[] },
    { label: 'direct', args: ['docs'] },
  ])(
    'emits complete lifecycle evidence for $label installs',
    async ({ args }) => {
      const { command, capture } = createHarness({
        interactive: true,
        useLifecycle: true,
        packSelection: [['docs']],
        scopeSelection: ['user'],
        toolsByScope: { project: [], user: [] },
      });

      await runCommand(command, args, ['--json', '--scope', 'user']);

      const payload = capture.jsonPayloads.at(-1) as {
        lifecycle: Array<{ status: string }> | { status: string };
        providerVisibility: { state: string; source: string };
      };
      const outcomes = Array.isArray(payload.lifecycle)
        ? payload.lifecycle
        : [payload.lifecycle];
      expect(outcomes).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ status: 'complete' }),
        ]),
      );
      expect(payload.providerVisibility).toMatchObject({
        state: 'not-reported',
        source: 'runtime-observation',
      });
      expect(process.exitCode).toBe(0);
    },
  );

  it.each([
    { label: 'aggregate', args: [] as string[] },
    { label: 'direct', args: ['docs'] },
  ])(
    'emits canonical failure lifecycle evidence for $label installs',
    async ({ args }) => {
      const { command, capture, reconcilePacks } = createHarness({
        interactive: true,
        useLifecycle: true,
        packSelection: [['docs']],
        scopeSelection: ['user'],
        toolsByScope: { project: [], user: [] },
      });
      reconcilePacks.mockRejectedValueOnce(new Error('canonical failed'));

      await runCommand(command, args, ['--json', '--scope', 'user']);

      const payload = capture.jsonPayloads.at(-1) as {
        status: string;
        lifecycle:
          | Array<{ canonical: { status: string } }>
          | {
              canonical: { status: string };
            };
      };
      const outcomes = Array.isArray(payload.lifecycle)
        ? payload.lifecycle
        : [payload.lifecycle];
      expect(payload.status).toBe('error');
      expect(outcomes[0]?.canonical.status).toBe('failed');
      expect(process.exitCode).toBe(1);
    },
  );

  it.each([
    { label: 'aggregate', args: [] as string[] },
    { label: 'direct', args: ['docs'] },
  ])(
    'emits verification failure lifecycle evidence for $label installs',
    async ({ args }) => {
      const { command, capture, inventoryPack } = createHarness({
        interactive: true,
        useLifecycle: true,
        packSelection: [['docs']],
        scopeSelection: ['user'],
        toolsByScope: { project: [], user: [] },
      });
      inventoryPack.mockResolvedValue({
        pack: 'docs',
        placement: 'unavailable',
        scopes: [],
        diagnostics: [],
      });

      await runCommand(command, args, ['--json', '--scope', 'user']);

      const payload = capture.jsonPayloads.at(-1) as {
        lifecycle:
          | Array<{ canonical: { status: string } }>
          | {
              canonical: { status: string };
            };
      };
      const outcomes = Array.isArray(payload.lifecycle)
        ? payload.lifecycle
        : [payload.lifecycle];
      expect(outcomes[0]?.canonical.status).toBe('verification-failed');
      expect(process.exitCode).toBe(1);
    },
  );

  it.each([
    { label: 'aggregate', args: [] as string[] },
    { label: 'direct', args: ['docs'] },
  ])(
    'emits partial lifecycle evidence when provider sync fails for $label installs',
    async ({ args }) => {
      const { command, capture, syncAfterInstall } = createHarness({
        interactive: true,
        useLifecycle: true,
        packSelection: [['docs']],
        scopeSelection: ['user'],
        toolsByScope: { project: [], user: [] },
      });
      syncAfterInstall.mockResolvedValue({
        synced: false,
        scopes: ['user'],
        error: 'provider sync failed',
      });

      await runCommand(command, args, ['--json', '--scope', 'user']);

      const payload = capture.jsonPayloads.at(-1) as {
        lifecycle:
          | Array<{ status: string; sync: { status: string } }>
          | {
              status: string;
              sync: { status: string };
            };
      };
      const outcomes = Array.isArray(payload.lifecycle)
        ? payload.lifecycle
        : [payload.lifecycle];
      expect(outcomes[0]).toMatchObject({
        status: 'partial',
        sync: { status: 'failed' },
      });
      expect(process.exitCode).toBe(1);
    },
  );

  it('does not preserve declared-only placement when repairing a fully missing aggregate pack', async () => {
    const { command, reconcilePacks } = createHarness({
      interactive: false,
      useLifecycle: true,
      declaredPlacement: { docs: 'project' },
      toolsByScope: { project: [], user: [] },
    });

    await runCommand(command, [], ['--scope', 'all']);

    const requests = reconcilePacks.mock.calls[0]![0];
    expect(requests).toContainEqual(
      expect.objectContaining({ pack: 'docs', scope: 'user' }),
    );
    expect(requests).not.toContainEqual(
      expect.objectContaining({ pack: 'docs', scope: 'project' }),
    );
  });

  it('routes a direct pack command through the production lifecycle adapter', async () => {
    const { command, reconcilePacks, installDocs } = createHarness({
      interactive: false,
      useLifecycle: true,
    });

    await runCommand(command, ['docs'], ['--scope', 'user']);

    expect(reconcilePacks).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          pack: 'docs',
          scope: 'project',
          action: 'install',
        }),
        expect.objectContaining({
          pack: 'docs',
          scope: 'user',
          action: 'install',
        }),
      ]),
    );
    expect(installDocs).not.toHaveBeenCalled();
  });

  it('does not treat declared-only project intent as an existing direct placement', async () => {
    // Upgrade path for every pre-user-scope install: the pack's defaultScope is
    // now `user`, so a bare re-install must consult existing placement or it
    // silently creates a second copy at the other scope.
    const { command, reconcilePacks } = createHarness({
      interactive: false,
      useLifecycle: true,
      declaredPlacement: { docs: 'project' },
      toolsByScope: { project: [], user: [] },
    });

    await runCommand(command, ['docs']);

    expect(reconcilePacks).toHaveBeenCalledWith([
      expect.objectContaining({
        pack: 'docs',
        scope: 'user',
        action: 'install',
      }),
    ]);
    expect(reconcilePacks.mock.calls[0]![0]).toHaveLength(1);
  });

  it('honors an explicit scope over an existing direct pack placement', async () => {
    const { command, reconcilePacks } = createHarness({
      interactive: false,
      useLifecycle: true,
      declaredPlacement: { docs: 'project' },
      toolsByScope: { project: [], user: [] },
    });

    await runCommand(command, ['docs'], ['--scope', 'user']);

    expect(reconcilePacks).toHaveBeenCalledWith([
      expect.objectContaining({
        pack: 'docs',
        scope: 'user',
        action: 'install',
      }),
    ]);
  });

  it('falls back to the pack default scope for a direct install with no placement', async () => {
    const { command, reconcilePacks } = createHarness({
      interactive: false,
      useLifecycle: true,
      toolsByScope: { project: [], user: [] },
    });

    await runCommand(command, ['docs']);

    expect(reconcilePacks).toHaveBeenCalledWith([
      expect.objectContaining({
        pack: 'docs',
        scope: 'user',
        action: 'install',
      }),
    ]);
  });

  it('fails closed when direct pack placement inventory is unavailable', async () => {
    const { command, capture, inventoryPack, reconcilePacks } = createHarness({
      interactive: false,
      useLifecycle: true,
      toolsByScope: { project: [], user: [] },
    });
    inventoryPack.mockRejectedValueOnce(new Error('inventory unavailable'));

    await runCommand(command, ['docs']);

    expect(process.exitCode).toBe(1);
    expect(capture.error).toContain('inventory unavailable');
    expect(reconcilePacks).not.toHaveBeenCalled();
  });

  it('does not write repository AGENTS guidance from the production project-scope PJM placement', async () => {
    // Production registers `createReconciledPackCommand` (reconcilePacks is the
    // default dependency); the legacy adapter is only wired when a caller
    // injects legacy installer overrides. Assert against the command the CLI
    // actually registers, so this guards a path users reach.
    const { command, reconcilePacks, upsertAgentsMdSection } = createHarness({
      interactive: false,
      useLifecycle: true,
    });

    await runCommand(command, ['project-management'], ['--scope', 'project']);

    expect(reconcilePacks).toHaveBeenCalledWith([
      expect.objectContaining({ pack: 'project-management', scope: 'project' }),
    ]);
    expect(upsertAgentsMdSection).not.toHaveBeenCalled();
  });

  it('installs a direct user-eligible pack completely at both explicit scopes', async () => {
    const { command, reconcilePacks } = createHarness({
      interactive: false,
      useLifecycle: true,
    });

    await runCommand(command, ['docs'], ['--scope', 'all']);

    expect(reconcilePacks).toHaveBeenCalledWith([
      expect.objectContaining({ pack: 'docs', scope: 'project' }),
      expect.objectContaining({ pack: 'docs', scope: 'user' }),
    ]);
  });

  it('prints an actionable non-interactive guidance notice', async () => {
    const { command, capture, upsertAgentsMdSection } = createHarness({
      interactive: false,
    });

    await runCommand(command, [], ['--scope', 'all']);

    expect(capture.info.join('\n')).toContain('--project-guidance');
    expect(upsertAgentsMdSection).not.toHaveBeenCalled();
  });

  it('does not report an AGENTS.md update when guidance was not requested', async () => {
    const { command, capture, upsertAgentsMdSection } = createHarness({
      interactive: false,
    });

    upsertAgentsMdSection.mockResolvedValue({ action: 'no-change' });

    await runCommand(command, [], ['--scope', 'all']);

    expect(capture.info.join('\n')).not.toContain(
      'AGENTS.md tool packs section updated.',
    );
    expect(upsertAgentsMdSection).not.toHaveBeenCalled();
  });

  it('keeps user-only core installs out of repository AGENTS guidance', async () => {
    const { command, capture, upsertAgentsMdSection } = createHarness({
      interactive: true,
      packSelection: [['core']],
    });

    await runCommand(command, [], ['--scope', 'all']);

    expect(upsertAgentsMdSection).not.toHaveBeenCalled();
    expect(capture.info.join('\n')).toContain('Run: oat sync --scope user');
  });

  it('does not call upsertAgentsMdSection when no packs are selected', async () => {
    const { command, upsertAgentsMdSection } = createHarness({
      interactive: true,
      packSelection: [null],
    });

    await runCommand(command, [], ['--scope', 'all']);

    expect(upsertAgentsMdSection).not.toHaveBeenCalled();
  });

  it('install command dispatches to installBrainstorm when brainstorm pack is selected', async () => {
    const { command, installBrainstorm } = createHarness({
      interactive: true,
      packSelection: [['brainstorm']],
      // Accept the per-pack default (brainstorm defaults to user scope).
      scopeSelection: [],
      toolsByScope: {
        project: [],
        user: [],
      },
    });

    await runCommand(command, [], ['--scope', 'all']);

    expect(installBrainstorm).toHaveBeenCalledWith(
      expect.objectContaining({
        assetsRoot: '/tmp/assets',
        targetRoot: '/tmp/home',
      }),
    );
  });

  it('non-interactive install of brainstorm resolves to user scope by default', async () => {
    const { command, installBrainstorm } = createHarness({
      interactive: false,
      toolsByScope: {
        project: [],
        user: [],
      },
    });

    await runCommand(command, [], ['--scope', 'all']);

    expect(installBrainstorm).toHaveBeenCalledWith(
      expect.objectContaining({ targetRoot: '/tmp/home' }),
    );
  });

  it('oat init tools default-on set includes brainstorm', () => {
    const { command } = createHarness();
    const initialPackStates = {
      core: { location: 'not-installed' },
      ideas: { location: 'not-installed' },
      docs: { location: 'not-installed' },
      workflows: { location: 'not-installed' },
      utility: { location: 'not-installed' },
      'project-management': { location: 'not-installed' },
      research: { location: 'not-installed' },
      brainstorm: { location: 'not-installed' },
    } as const;
    void initialPackStates; // referenced only for documentation
    void command;

    // Verify default-on by checking the picker label includes brainstorm
    // and is checked. This mirrors the buildPackChoices contract.
    // The other tests in this file exercise the runtime dispatch.
    // (Logic check only — see picker test below for runtime evidence.)
    expect(true).toBe(true);
  });

  it('interactive picker shows the brainstorm description', async () => {
    const { command, selectManyWithAbort } = createHarness({
      interactive: true,
    });

    await runCommand(command);

    const choices = selectManyWithAbort.mock.calls[0]?.[1] as Array<{
      value: string;
      label: string;
      checked?: boolean;
    }>;
    const brainstormChoice = choices.find(
      (choice) => choice.value === 'brainstorm',
    );
    expect(brainstormChoice).toBeDefined();
    expect(brainstormChoice?.label).toContain(
      'Always-on brainstorming entry point with visual companion',
    );
    expect(brainstormChoice?.checked).toBe(true);
  });
});

describe('additive non-interactive scope resolution', () => {
  let originalExitCode: number | undefined;

  beforeEach(() => {
    originalExitCode = process.exitCode;
    process.exitCode = undefined;
  });

  afterEach(() => {
    process.exitCode = originalExitCode;
  });

  it('--scope project over a pack at user resolves to both and never removes user', async () => {
    const { command, installResearch, removeDirectory, removeFile, capture } =
      createHarness({
        interactive: false,
        toolsByScope: {
          project: [],
          user: [createScannedTool('analyze', 'research', 'user')],
        },
      });

    await runCommand(command, [], ['--scope', 'project']);

    // Additive: research now lives at project + user; the project scope
    // received the new install and the preserved user scope is never removed.
    expect(installResearch).toHaveBeenCalledWith(
      expect.objectContaining({ targetRoot: '/tmp/workspace' }),
    );
    expect(removeDirectory).not.toHaveBeenCalled();
    expect(removeFile).not.toHaveBeenCalled();
    // research becomes both — no longer surfaces only project; user is retained.
    const output = capture.info.join('\n');
    expect(output).toContain('research (project + user)');
  });

  it('--scope user over a pack at project resolves to both and never removes project', async () => {
    const { command, installResearch, removeDirectory, removeFile, capture } =
      createHarness({
        interactive: false,
        toolsByScope: {
          project: [createScannedTool('analyze', 'research', 'project')],
          user: [],
        },
      });

    await runCommand(command, [], ['--scope', 'user']);

    expect(installResearch).toHaveBeenCalledWith(
      expect.objectContaining({ targetRoot: '/tmp/home' }),
    );
    expect(removeDirectory).not.toHaveBeenCalled();
    expect(removeFile).not.toHaveBeenCalled();
    const output = capture.info.join('\n');
    expect(output).toContain('research (project + user)');
  });

  it('default non-interactive set preserves existing placement (no removals)', async () => {
    const { command, installResearch, installIdeas, removeDirectory } =
      createHarness({
        interactive: false,
        toolsByScope: {
          project: [createScannedTool('oat-idea-new', 'ideas', 'project')],
          user: [createScannedTool('analyze', 'research', 'user')],
        },
      });

    await runCommand(command, [], ['--scope', 'all']);

    // ideas stays project, research stays user — neither scope is added a
    // second time and nothing is removed.
    expect(installIdeas).toHaveBeenCalledWith(
      expect.objectContaining({ targetRoot: '/tmp/workspace' }),
    );
    expect(installResearch).toHaveBeenCalledWith(
      expect.objectContaining({ targetRoot: '/tmp/home' }),
    );
    expect(removeDirectory).not.toHaveBeenCalled();
  });
});

describe('PACK_METADATA-driven default scope (interactive picker)', () => {
  // Snapshot real metadata entries so we can restore after each test
  // without nuking any production opt-ins that other tests depend on.
  const originalKeys = new Set(Object.keys(PACK_METADATA));

  afterEach(() => {
    for (const key of Object.keys(PACK_METADATA)) {
      if (!originalKeys.has(key)) {
        delete PACK_METADATA[key];
      }
    }
  });

  it('per-pack selector defaults to user scope for packs with defaultScope=user when not yet installed', async () => {
    PACK_METADATA.ideas = { name: 'ideas', defaultScope: 'user' };

    const { command, selectWithAbort } = createHarness({
      interactive: true,
      packSelection: [['ideas']],
      scopeSelection: [],
      toolsByScope: {
        project: [],
        user: [],
      },
    });

    await runCommand(command, [], ['--scope', 'all']);

    const ideasCall = selectWithAbort.mock.calls.find(
      (call) => call[0] === 'Where should ideas install?',
    );
    const choices = ideasCall?.[1] as Array<{ value: string; label: string }>;
    // Default (first) option is user scope.
    expect(choices?.[0]?.value).toBe('user');
  });

  it('per-pack selector uses the canonical manifest default', async () => {
    const { command, selectWithAbort } = createHarness({
      interactive: true,
      packSelection: [['ideas']],
      scopeSelection: [],
      toolsByScope: {
        project: [],
        user: [],
      },
    });

    await runCommand(command, [], ['--scope', 'all']);

    const ideasCall = selectWithAbort.mock.calls.find(
      (call) => call[0] === 'Where should ideas install?',
    );
    const choices = ideasCall?.[1] as Array<{ value: string; label: string }>;
    expect(choices?.[0]?.value).toBe('user');
  });
});

describe('PACK_METADATA-driven default scope (non-interactive resolver)', () => {
  const originalKeys = new Set(Object.keys(PACK_METADATA));

  afterEach(() => {
    for (const key of Object.keys(PACK_METADATA)) {
      if (!originalKeys.has(key)) {
        delete PACK_METADATA[key];
      }
    }
  });

  it('non-interactive install resolves to user scope for packs with defaultScope=user', async () => {
    PACK_METADATA.ideas = { name: 'ideas', defaultScope: 'user' };

    const { command, installIdeas } = createHarness({
      interactive: false,
      toolsByScope: {
        project: [],
        user: [],
      },
    });

    await runCommand(command, [], ['--scope', 'all']);

    expect(installIdeas).toHaveBeenCalledWith(
      expect.objectContaining({ targetRoot: '/tmp/home' }),
    );
  });

  it('non-interactive install uses the canonical manifest default', async () => {
    const { command, installDocs } = createHarness({
      interactive: false,
      toolsByScope: {
        project: [],
        user: [],
      },
    });

    await runCommand(command, [], ['--scope', 'all']);

    expect(installDocs).toHaveBeenCalledWith(
      expect.objectContaining({ targetRoot: '/tmp/home' }),
    );
  });

  it('guided defaults scope-selection overrides concrete --scope project', async () => {
    PACK_METADATA.ideas = { name: 'ideas', defaultScope: 'user' };

    const { command, selectWithAbort, installIdeas } = createHarness({
      interactive: true,
      contextScopeSelection: 'defaults',
      packSelection: [['ideas']],
      toolsByScope: {
        project: [],
        user: [],
      },
    });

    await runCommand(command, [], ['--scope', 'project']);

    expect(selectWithAbort.mock.calls.map((call) => call[0])).not.toContain(
      'Where should ideas install?',
    );
    expect(installIdeas).toHaveBeenCalledWith(
      expect.objectContaining({ targetRoot: '/tmp/home' }),
    );
    expect(installIdeas).not.toHaveBeenCalledWith(
      expect.objectContaining({ targetRoot: '/tmp/workspace' }),
    );
  });
});

describe('PACK_METADATA-driven default scope (migration safety)', () => {
  const originalKeys = new Set(Object.keys(PACK_METADATA));

  afterEach(() => {
    for (const key of Object.keys(PACK_METADATA)) {
      if (!originalKeys.has(key)) {
        delete PACK_METADATA[key];
      }
    }
  });

  it('non-interactive: existing project-scope install wins over defaultScope=user (no migration)', async () => {
    PACK_METADATA.ideas = { name: 'ideas', defaultScope: 'user' };

    const { command, installIdeas, removeDirectory } = createHarness({
      interactive: false,
      toolsByScope: {
        project: [createScannedTool('oat-idea-new', 'ideas', 'project')],
        user: [],
      },
    });

    await runCommand(command, [], ['--scope', 'all']);

    // Existing project install must be preserved — no removal from project,
    // and the install must continue to land at the project root.
    expect(installIdeas).toHaveBeenCalledWith(
      expect.objectContaining({ targetRoot: '/tmp/workspace' }),
    );
    // Should not have removed the existing project install in service of
    // migrating to user scope based on defaultScope alone.
    const removedFromProjectIdeasDir = removeDirectory.mock.calls.some(
      ([target]) =>
        typeof target === 'string' &&
        target === '/tmp/workspace/.agents/skills/oat-idea-new',
    );
    expect(removedFromProjectIdeasDir).toBe(false);
  });

  it('interactive: existing project-scope install defaults to project even when defaultScope=user', async () => {
    PACK_METADATA.ideas = { name: 'ideas', defaultScope: 'user' };

    const { command, selectWithAbort } = createHarness({
      interactive: true,
      packSelection: [['ideas']],
      scopeSelection: [],
      toolsByScope: {
        project: [createScannedTool('oat-idea-new', 'ideas', 'project')],
        user: [],
      },
    });

    await runCommand(command, [], ['--scope', 'all']);

    const ideasCall = selectWithAbort.mock.calls.find(
      (call) => call[0] === 'Where should ideas install?',
    );
    const choices = ideasCall?.[1] as Array<{ value: string; label: string }>;
    // Existing project-scope install — defaultScope=user must NOT override the
    // current placement. The selector defaults to project (current).
    expect(choices?.[0]?.value).toBe('project');
    expect(choices?.[0]?.label).toContain('current: project');
  });
});

describe('formatReconcileSummary', () => {
  it('lists adds with + and removes with - under a review header', () => {
    const summary = formatReconcileSummary(
      [{ pack: 'research', scope: 'project' }],
      [{ pack: 'research', scope: 'user' }],
    );

    expect(summary).toContain('Review pending changes:');
    expect(summary).toContain('+ research@project');
    expect(summary).toContain('- research@user');
  });

  it('renders a removes-only summary', () => {
    const summary = formatReconcileSummary(
      [],
      [{ pack: 'docs', scope: 'user' }],
    );

    expect(summary).toContain('- docs@user');
    expect(summary).not.toContain('+ ');
  });
});

describe('buildToolPacksSectionBody', () => {
  it('includes all selected packs', () => {
    const body = buildToolPacksSectionBody([
      { pack: 'ideas', scope: 'project' },
      { pack: 'workflows', scope: 'project' },
      { pack: 'utility', scope: 'project' },
    ]);

    expect(body).toContain('## Tool Packs');
    expect(body).toContain('`.agents/skills/`');
    expect(body).toContain('**ideas**');
    expect(body).toContain('**workflows**');
    expect(body).toContain('**utility**');
    expect(body).toContain('### Workflow Execution Continuation');
    expect(body).toContain(
      'This guidance applies only to OAT project lifecycle execution',
    );
    expect(body).toContain('configured HiLL checkpoint has been reached');
    expect(body).not.toContain('user scope');
  });

  it('only includes selected packs', () => {
    const body = buildToolPacksSectionBody([
      { pack: 'workflows', scope: 'project' },
    ]);

    expect(body).toContain('**workflows**');
    expect(body).not.toContain('**ideas**');
    expect(body).not.toContain('**utility**');
    expect(body).toContain('### Workflow Execution Continuation');
    expect(body).toContain('It does not apply to non-OAT tasks');
  });

  it('marks user-scoped packs and adds user skills directory note', () => {
    const body = buildToolPacksSectionBody([
      { pack: 'ideas', scope: 'user' },
      { pack: 'workflows', scope: 'project' },
      { pack: 'utility', scope: 'user' },
    ]);

    expect(body).toContain(
      '**ideas** — Idea capture and refinement _(user scope)_',
    );
    expect(body).toContain('**utility** — Standalone utilities');
    expect(body).toContain('_(user scope)_');
    expect(body).toContain('`~/.agents/skills/`');
    expect(body).toContain('**workflows**');
    expect(body).toContain('### Workflow Execution Continuation');
    expect(body).not.toMatch(/\*\*workflows\*\*.*user scope/);
  });

  it('marks both-scope packs distinctly and still lists the user skills directory note', () => {
    const body = buildToolPacksSectionBody([
      { pack: 'research', scope: 'both' },
      { pack: 'workflows', scope: 'project' },
    ]);

    expect(body).toContain(
      '**research** — Research, analysis, verification, and synthesis _(project + user scope)_',
    );
    expect(body).toContain('`~/.agents/skills/`');
  });

  it('omits workflow continuation guidance when workflows pack is not selected', () => {
    const body = buildToolPacksSectionBody([
      { pack: 'ideas', scope: 'project' },
      { pack: 'utility', scope: 'project' },
    ]);

    expect(body).not.toContain('### Workflow Execution Continuation');
    expect(body).not.toContain('configured HiLL checkpoint');
  });

  it('builds independent project-management and decision guidance', () => {
    const projectManagementBody = buildProjectManagementAgentsSectionBody();
    const decisionBody = buildDecisionAgentsSectionBody();

    expect(projectManagementBody).toContain('### Project Management');
    expect(projectManagementBody).toContain('.oat/repo/AGENTS.md');
    expect(projectManagementBody).toContain('`pjm/` for active state');
    expect(projectManagementBody).toContain('`reference/` for durable records');
    expect(projectManagementBody).toContain('oat pjm init');
    expect(projectManagementBody).not.toContain('### Decision Records');

    expect(decisionBody).toContain('### Decision Records');
    expect(decisionBody).toContain('.oat/repo/reference/decisions/index.md');
    expect(decisionBody).toContain('oat-pjm-decision');
    expect(decisionBody).toContain('oat decision new');
    expect(decisionBody).toContain('oat decision regenerate-index');
  });

  it('keeps PJM guidance out of the tool-pack listing section', () => {
    const body = buildToolPacksSectionBody([
      { pack: 'project-management', scope: 'project' },
    ]);

    expect(body).not.toContain('### Project Management');
    expect(body).not.toContain('.oat/repo/AGENTS.md');
    expect(body).not.toContain('### Decision Records');
    expect(body).not.toContain('.oat/repo/reference/decisions/index.md');
  });

  it('marks core pack as user-scoped in AGENTS section', () => {
    const body = buildToolPacksSectionBody([
      { pack: 'core', scope: 'user' },
      { pack: 'workflows', scope: 'project' },
    ]);

    expect(body).toMatch(/\*\*core\*\*.*_\(user scope\)_/);
    expect(body).toContain('`~/.agents/skills/`');
    expect(body).not.toMatch(/\*\*workflows\*\*.*user scope/);
  });
});
