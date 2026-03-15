import type { CommandContext, GlobalOptions } from '@app/command-context';
import { createLoggerCapture } from '@commands/__tests__/helpers';
import type {
  MultiSelectChoice,
  SelectChoice,
} from '@commands/shared/shared.prompts';
import type { Scope } from '@shared/types';
import { Command } from 'commander';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { buildToolPacksSectionBody, createInitToolsCommand } from './index';

interface HarnessOptions {
  scope?: Scope;
  interactive?: boolean;
  packSelection?: Array<string[] | null>;
  scopeSelection?: Array<'project' | 'user' | null>;
}

function createHarness(options: HarnessOptions = {}) {
  const capture = createLoggerCapture();
  const packSelection = [
    ...(options.packSelection ?? [
      ['ideas', 'workflows', 'utility', 'research'],
    ]),
  ];
  const scopeSelection = [...(options.scopeSelection ?? ['project'])];

  const selectManyWithAbort = vi.fn(
    async (_message: string, _choices: MultiSelectChoice<string>[]) => {
      const next = packSelection.shift();
      return next === undefined
        ? ['ideas', 'workflows', 'utility', 'research']
        : next;
    },
  );
  const selectWithAbort = vi.fn(
    async (_message: string, _choices: SelectChoice<'project' | 'user'>[]) => {
      const next = scopeSelection.shift();
      return next === undefined ? 'project' : next;
    },
  );

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
    resolvedProjectsRoot: '.oat/projects/shared',
  }));
  const installUtility = vi.fn(async () => ({
    copiedSkills: ['oat-review-provide'],
    updatedSkills: [],
    skippedSkills: [],
    outdatedSkills: [],
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
  const copyDirWithStatus = vi.fn(async () => 'updated' as const);
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
  const resolveLocalPaths = vi.fn(
    (config: { localPaths?: string[] }) => config.localPaths ?? [],
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
      logger: capture.logger,
    }),
    resolveProjectRoot: vi.fn(async () => '/tmp/workspace'),
    resolveScopeRoot: vi.fn((_scope: 'project' | 'user', _cwd, home) => home),
    resolveAssetsRoot: vi.fn(async () => '/tmp/assets'),
    selectManyWithAbort,
    selectWithAbort,
    installIdeas,
    installWorkflows,
    installUtility,
    installResearch,
    copyDirWithStatus,
    addLocalPaths,
    applyGitignore,
    readOatConfig,
    resolveLocalPaths,
    upsertAgentsMdSection,
    removeAgentsMdSection,
  });

  return {
    capture,
    command,
    selectManyWithAbort,
    selectWithAbort,
    installIdeas,
    installWorkflows,
    installUtility,
    installResearch,
    copyDirWithStatus,
    addLocalPaths,
    applyGitignore,
    readOatConfig,
    resolveLocalPaths,
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

  it('registers ideas, workflows, utility, and research subcommands', () => {
    const { command } = createHarness();
    const subcommands = command.commands.map((subcommand) => subcommand.name());
    expect(subcommands).toContain('ideas');
    expect(subcommands).toContain('workflows');
    expect(subcommands).toContain('utility');
    expect(subcommands).toContain('research');
  });

  it('bare oat init tools in interactive mode shows grouped pack list', async () => {
    const { command, selectManyWithAbort } = createHarness({
      interactive: true,
    });

    await runCommand(command);

    // First call is pack selection, second is per-pack scope selection
    expect(selectManyWithAbort).toHaveBeenCalledTimes(2);
    const choices = selectManyWithAbort.mock.calls[0]?.[1] as Array<{
      value: string;
      checked?: boolean;
      label: string;
    }>;
    expect(
      choices.some((choice) => choice.label.includes('[project|user]')),
    ).toBe(true);
    expect(choices.every((choice) => choice.checked === true)).toBe(true);
  });

  it('non-interactive installs everything to project scope', async () => {
    const {
      command,
      installIdeas,
      installWorkflows,
      installUtility,
      installResearch,
    } = createHarness({ interactive: false });

    await runCommand(command, [], ['--scope', 'all']);

    expect(installIdeas).toHaveBeenCalledWith(
      expect.objectContaining({ targetRoot: '/tmp/workspace' }),
    );
    expect(installWorkflows).toHaveBeenCalledWith(
      expect.objectContaining({ targetRoot: '/tmp/workspace' }),
    );
    expect(installUtility).toHaveBeenCalledWith(
      expect.objectContaining({ targetRoot: '/tmp/workspace' }),
    );
    expect(installResearch).toHaveBeenCalledWith(
      expect.objectContaining({ targetRoot: '/tmp/workspace' }),
    );
  });

  it('handles scope conflicts for mixed project-only and user-eligible packs', async () => {
    const {
      command,
      selectManyWithAbort,
      selectWithAbort,
      installIdeas,
      installWorkflows,
      installUtility,
      installResearch,
    } = createHarness({
      interactive: true,
      // 1st call: pack selection, 2nd call: which packs go to user scope
      packSelection: [
        ['ideas', 'workflows', 'utility', 'research'],
        ['ideas', 'utility', 'research'],
      ],
      // Only the workflows local-paths prompt remains on selectWithAbort
      scopeSelection: ['local'],
    });

    await runCommand(command, [], ['--scope', 'all']);

    // 2 selectManyWithAbort calls: pack selection + per-pack scope
    expect(selectManyWithAbort).toHaveBeenCalledTimes(2);
    // 1 selectWithAbort call: workflows local-paths prompt
    expect(selectWithAbort).toHaveBeenCalledTimes(1);
    expect(installWorkflows).toHaveBeenCalledWith(
      expect.objectContaining({ targetRoot: '/tmp/workspace' }),
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
      // 1st call: pack selection, 2nd call: only ideas goes to user scope
      packSelection: [['ideas', 'utility', 'research'], ['ideas']],
    });

    await runCommand(command, [], ['--scope', 'all']);

    expect(selectManyWithAbort).toHaveBeenCalledTimes(2);
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

  it('bare oat init tools cancellation exits without installing packs', async () => {
    const {
      command,
      capture,
      installIdeas,
      installWorkflows,
      installUtility,
      installResearch,
    } = createHarness({
      interactive: true,
      packSelection: [null],
    });

    await runCommand(command, [], ['--scope', 'all']);

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
      packSelection: [['workflows'], ['oat-project-new']],
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
      resolvedProjectsRoot: '.oat/projects/shared',
    });

    await runCommand(command, [], ['--scope', 'all']);

    expect(capture.info.join('\n')).toContain(
      'oat-project-new  (unversioned) -> 1.1.0',
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

  it('does not call upsertAgentsMdSection when no packs are selected', async () => {
    const { command, upsertAgentsMdSection } = createHarness({
      interactive: true,
      packSelection: [null],
    });

    await runCommand(command, [], ['--scope', 'all']);

    expect(upsertAgentsMdSection).not.toHaveBeenCalled();
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
    expect(body).toContain('oat-project-subagent-implement');
    expect(body).not.toMatch(/\*\*workflows\*\*.*user scope/);
  });

  it('omits workflow continuation guidance when workflows pack is not selected', () => {
    const body = buildToolPacksSectionBody([
      { pack: 'ideas', scope: 'project' },
      { pack: 'utility', scope: 'project' },
    ]);

    expect(body).not.toContain('### Workflow Execution Continuation');
    expect(body).not.toContain('configured HiLL checkpoint');
  });
});
