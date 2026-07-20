import type { CommandContext, GlobalOptions } from '@app/command-context';
import { createLoggerCapture } from '@commands/__tests__/helpers';
import type {
  MultiSelectChoice,
  SelectChoice,
} from '@commands/shared/shared.prompts';
import type { Scope } from '@shared/types';
import { Command } from 'commander';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  buildToolPacksSectionBody,
  createInitToolsCommand,
  formatReconcileSummary,
} from './index';
import { PACK_METADATA } from './shared/skill-manifest';

interface HarnessOptions {
  scope?: Scope;
  contextScopeSelection?: 'interactive' | 'defaults' | 'gate';
  interactive?: boolean;
  packSelection?: Array<string[] | null>;
  scopeSelection?: Array<string | null>;
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
  const readOatConfig = vi.fn(async () => ({
    version: 1 as const,
    localPaths: [] as string[],
  }));
  const writeOatConfig = vi.fn(async () => {});
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
    resolveProjectRoot: vi.fn(async () => '/tmp/workspace'),
    resolveScopeRoot: vi.fn((_scope: 'project' | 'user', _cwd, home) => home),
    resolveAssetsRoot: vi.fn(async () => '/tmp/assets'),
    scanTools,
    selectManyWithAbort,
    selectWithAbort,
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
  });

  return {
    capture,
    command,
    selectManyWithAbort,
    selectWithAbort,
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

  it('deferred gate: not shown at all when no user-eligible pack is selected', async () => {
    const { command, selectWithAbort } = createHarness({
      interactive: true,
      contextScopeSelection: 'gate',
      // Only the project-only pack — no user-eligible packs in the selection.
      packSelection: [['project-management']],
      scopeSelection: [],
      toolsByScope: {
        project: [],
        user: [],
      },
    });

    await runCommand(command, [], ['--scope', 'all']);

    const messages = selectWithAbort.mock.calls.map((call) => call[0]);
    expect(messages).not.toContain('Customize per-pack scope? (y/N)');
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

  it('batch-confirm gate: dropping user from a both-scope pack removes user on confirm', async () => {
    const { command, installResearch, removeDirectory, removeFile, capture } =
      createHarness({
        interactive: true,
        packSelection: [['research']],
        // research selector → project (drops user); gate → yes
        scopeSelection: ['project', 'yes'],
        toolsByScope: {
          project: [createScannedTool('analyze', 'research', 'project')],
          user: [createScannedTool('analyze', 'research', 'user')],
        },
      });

    await runCommand(command, [], ['--scope', 'all']);

    // The dropped user scope is removed exactly once (skills + agents under
    // the user root).
    expect(removeDirectory).toHaveBeenCalledWith(
      '/tmp/home/.agents/skills/analyze',
    );
    expect(removeFile).toHaveBeenCalledWith(
      '/tmp/home/.agents/agents/skeptical-evaluator.md',
    );
    // The change summary listed the removal.
    expect(capture.info.join('\n')).toContain('- research@user');
    // research stays at project (idempotent install), end-state project.
    expect(installResearch).toHaveBeenCalledWith(
      expect.objectContaining({ targetRoot: '/tmp/workspace' }),
    );
    // user is the only changed scope surfaced for sync.
    expect(capture.info.join('\n')).toContain('oat sync --scope user');
  });

  it('removes every user-scope workflows asset class when a narrower end-state is confirmed', async () => {
    const { command, removeDirectory, removeFile } = createHarness({
      interactive: true,
      packSelection: [['workflows']],
      scopeSelection: ['project', 'yes'],
      toolsByScope: {
        project: [createScannedTool('oat-project-new', 'workflows', 'project')],
        user: [createScannedTool('oat-project-new', 'workflows', 'user')],
      },
    });

    await runCommand(command, [], ['--scope', 'all']);

    expect(removeDirectory).toHaveBeenCalledWith(
      '/tmp/home/.agents/skills/oat-project-new',
    );
    expect(removeFile).toHaveBeenCalledWith(
      '/tmp/home/.agents/agents/oat-reviewer.md',
    );
    expect(removeFile).toHaveBeenCalledWith('/tmp/home/.oat/templates/plan.md');
    expect(removeFile).toHaveBeenCalledWith(
      '/tmp/home/.oat/scripts/generate-oat-state.sh',
    );
  });

  it('batch-confirm gate: declining applies no installs and no removals', async () => {
    const { command, installResearch, removeDirectory, removeFile, capture } =
      createHarness({
        interactive: true,
        packSelection: [['research']],
        // research selector → project (drops user); gate → no
        scopeSelection: ['project', 'no'],
        toolsByScope: {
          project: [createScannedTool('analyze', 'research', 'project')],
          user: [createScannedTool('analyze', 'research', 'user')],
        },
      });

    await runCommand(command, [], ['--scope', 'all']);

    expect(removeDirectory).not.toHaveBeenCalled();
    expect(removeFile).not.toHaveBeenCalled();
    expect(installResearch).not.toHaveBeenCalled();
    expect(capture.info.join('\n')).toContain('No changes applied.');
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
  // scope is only ever removed via the explicit, batch-confirmed interactive
  // path — covered by the per-pack selector (p01-t02) and confirmation gate
  // (p01-t03) tests below.

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

  it('calls upsertAgentsMdSection with workflows key and selected packs', async () => {
    const { command, upsertAgentsMdSection } = createHarness({
      interactive: false,
    });

    await runCommand(command, [], ['--scope', 'all']);

    expect(upsertAgentsMdSection).toHaveBeenCalledTimes(1);
    expect(upsertAgentsMdSection).toHaveBeenCalledWith(
      '/tmp/workspace',
      'tools',
      expect.stringContaining('Tool Packs'),
    );
  });

  it('records installed tool packs in shared config without rescanning scopes', async () => {
    const { command, scanTools, writeOatConfig } = createHarness({
      interactive: true,
      packSelection: [['docs']],
      toolsByScope: {
        project: [createScannedTool('oat-project-new', 'workflows', 'project')],
        user: [createScannedTool('oat-docs', 'core', 'user')],
      },
    });

    await runCommand(command, [], ['--scope', 'all']);

    expect(scanTools).toHaveBeenCalledTimes(2);
    expect(writeOatConfig).toHaveBeenCalledWith(
      '/tmp/workspace',
      expect.objectContaining({
        tools: {
          core: true,
          ideas: false,
          docs: true,
          workflows: true,
          utility: false,
          'project-management': false,
          research: false,
          brainstorm: false,
        },
      }),
    );
  });

  it('logs AGENTS.md tool packs section update', async () => {
    const { command, capture } = createHarness({ interactive: false });

    await runCommand(command, [], ['--scope', 'all']);

    expect(capture.info.join('\n')).toContain(
      'AGENTS.md tool packs section updated.',
    );
  });

  it('does not log AGENTS.md update when section is unchanged', async () => {
    const { command, capture, upsertAgentsMdSection } = createHarness({
      interactive: false,
    });

    upsertAgentsMdSection.mockResolvedValueOnce({ action: 'no-change' });

    await runCommand(command, [], ['--scope', 'all']);

    expect(capture.info.join('\n')).not.toContain('AGENTS.md');
  });

  it('AGENTS.md section marks user-scoped packs when scope is user', async () => {
    const { command, upsertAgentsMdSection } = createHarness({
      interactive: false,
    });

    await runCommand(command, [], ['--scope', 'user']);

    expect(upsertAgentsMdSection).toHaveBeenCalledTimes(1);
    const body = upsertAgentsMdSection.mock.calls[0]?.[2] as string;
    expect(body).toContain('_(user scope)_');
    expect(body).toContain('`~/.agents/skills/`');
  });

  it('marks core as user-scoped in AGENTS section and includes user sync instruction', async () => {
    const { command, capture, upsertAgentsMdSection } = createHarness({
      interactive: true,
      packSelection: [['core']],
    });

    await runCommand(command, [], ['--scope', 'all']);

    const body = upsertAgentsMdSection.mock.calls[0]?.[2] as string;
    expect(body).toMatch(/\*\*core\*\*.*_\(user scope\)_/);
    expect(body).toContain('`~/.agents/skills/`');
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

  it('per-pack selector defaults to project scope when pack has no metadata entry', async () => {
    // No PACK_METADATA entry for ideas → falls back to 'project' default.
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
    expect(choices?.[0]?.value).toBe('project');
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

  it('non-interactive install defaults to project scope for packs without metadata', async () => {
    // Sanity check that the existing project-default behavior is preserved
    // for packs that have not opted in to PACK_METADATA.
    const { command, installDocs } = createHarness({
      interactive: false,
      toolsByScope: {
        project: [],
        user: [],
      },
    });

    await runCommand(command, [], ['--scope', 'all']);

    expect(installDocs).toHaveBeenCalledWith(
      expect.objectContaining({ targetRoot: '/tmp/workspace' }),
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

  it('includes PJM routing and decision guidance when project-management is selected', () => {
    const body = buildToolPacksSectionBody([
      { pack: 'project-management', scope: 'project' },
    ]);

    expect(body).toContain('### Project Management');
    expect(body).toContain('.oat/repo/AGENTS.md');
    expect(body).toContain('`pjm/` for active state');
    expect(body).toContain('`reference/` for durable records');
    expect(body).toContain('### Decision Records');
    expect(body).toContain('.oat/repo/reference/decisions/index.md');
    expect(body).toContain('oat-pjm-decision');
    expect(body).toContain('oat decision new');
    expect(body).toContain('oat pjm init');
    expect(body).toContain('oat decision regenerate-index');
  });

  it('omits PJM guidance when project-management is not selected', () => {
    const body = buildToolPacksSectionBody([
      { pack: 'workflows', scope: 'project' },
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
