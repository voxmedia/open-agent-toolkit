import type { CommandContext, GlobalOptions } from '@app/command-context';
import {
  createLoggerCapture,
  type LoggerCapture,
} from '@commands/__tests__/helpers';
import type {
  MultiSelectChoice,
  SelectChoice,
} from '@commands/shared/shared.prompts';
import type { Scope } from '@shared/types';
import { Command } from 'commander';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createInitToolsCommand } from './index';

interface HarnessOptions {
  scope?: Scope;
  interactive?: boolean;
  packSelection?: Array<string[] | null>;
  scopeSelection?: Array<'project' | 'user' | null>;
}

function createHarness(options: HarnessOptions = {}) {
  const capture = createLoggerCapture();
  const packSelection = [
    ...(options.packSelection ?? [['ideas', 'workflows', 'utility']]),
  ];
  const scopeSelection = [...(options.scopeSelection ?? ['project'])];

  const selectManyWithAbort = vi.fn(
    async (_message: string, _choices: MultiSelectChoice<string>[]) => {
      const next = packSelection.shift();
      return next === undefined ? ['ideas', 'workflows', 'utility'] : next;
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
  }));
  const installUtility = vi.fn(async () => ({
    copiedSkills: ['oat-review-provide'],
    updatedSkills: [],
    skippedSkills: [],
  }));

  const command = createInitToolsCommand({
    buildCommandContext: (globalOptions: GlobalOptions): CommandContext => ({
      scope: (globalOptions.scope ?? options.scope ?? 'all') as Scope,
      apply: false,
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
  });

  return {
    capture,
    command,
    selectManyWithAbort,
    selectWithAbort,
    installIdeas,
    installWorkflows,
    installUtility,
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

  it('registers ideas, workflows, and utility subcommands', () => {
    const { command } = createHarness();
    const subcommands = command.commands.map((subcommand) => subcommand.name());
    expect(subcommands).toContain('ideas');
    expect(subcommands).toContain('workflows');
    expect(subcommands).toContain('utility');
  });

  it('bare oat init tools in interactive mode shows grouped pack list', async () => {
    const { command, selectManyWithAbort } = createHarness({
      interactive: true,
    });

    await runCommand(command);

    expect(selectManyWithAbort).toHaveBeenCalledTimes(1);
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
    const { command, installIdeas, installWorkflows, installUtility } =
      createHarness({ interactive: false });

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
  });

  it('handles scope conflicts for mixed project-only and user-eligible packs', async () => {
    const {
      command,
      selectWithAbort,
      installIdeas,
      installWorkflows,
      installUtility,
    } = createHarness({
      interactive: true,
      packSelection: [['ideas', 'workflows', 'utility']],
      scopeSelection: ['user'],
    });

    await runCommand(command, [], ['--scope', 'all']);

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
  });

  it('bare oat init tools cancellation exits without installing packs', async () => {
    const { command, capture, installIdeas, installWorkflows, installUtility } =
      createHarness({
        interactive: true,
        packSelection: [null],
      });

    await runCommand(command, [], ['--scope', 'all']);

    expect(installIdeas).not.toHaveBeenCalled();
    expect(installWorkflows).not.toHaveBeenCalled();
    expect(installUtility).not.toHaveBeenCalled();
    expect(capture.info).toContain('No tool packs selected.');
    expect(process.exitCode).toBe(0);
  });
});
