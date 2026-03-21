import type { CommandContext, GlobalOptions } from '@app/command-context';
import {
  createLoggerCapture,
  type LoggerCapture,
} from '@commands/__tests__/helpers';
import type { MultiSelectChoice } from '@commands/shared/shared.prompts';
import type { Scope } from '@shared/types';
import { Command } from 'commander';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createInitToolsDocsCommand } from './index';
import { DOCS_SKILLS } from './install-docs';

interface HarnessOptions {
  scope?: Scope;
  interactive?: boolean;
  selectResponses?: Array<string[] | null>;
  confirmResponses?: boolean[];
}

function createHarness(options: HarnessOptions = {}): {
  capture: LoggerCapture;
  command: Command;
  selectManyWithAbort: ReturnType<typeof vi.fn>;
  confirmAction: ReturnType<typeof vi.fn>;
  installDocs: ReturnType<typeof vi.fn>;
} {
  const capture = createLoggerCapture();
  const selectResponses = [
    ...(options.selectResponses ?? [['oat-docs-analyze']]),
  ];
  const confirmResponses = [...(options.confirmResponses ?? [true])];

  const selectManyWithAbort = vi.fn(
    async (_message: string, _choices: MultiSelectChoice<string>[]) =>
      selectResponses.shift() ?? ['oat-docs-analyze'],
  );
  const confirmAction = vi.fn(async () => confirmResponses.shift() ?? true);
  const installDocs = vi.fn(async () => ({
    copiedSkills: ['oat-docs-analyze'],
    updatedSkills: [],
    skippedSkills: [],
    outdatedSkills: [],
    copiedScripts: ['resolve-tracking.sh'],
    updatedScripts: [],
    skippedScripts: [],
  }));

  const command = createInitToolsDocsCommand({
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
    installDocs,
    selectManyWithAbort,
    confirmAction,
  });

  return {
    capture,
    command,
    selectManyWithAbort,
    confirmAction,
    installDocs,
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
  const tools = new Command('tools');
  tools.addCommand(command);
  init.addCommand(tools);
  program.addCommand(init);

  await program.parseAsync([...globalArgs, 'init', 'tools', 'docs', ...args], {
    from: 'user',
  });
}

describe('createInitToolsDocsCommand', () => {
  let originalExitCode: number | undefined;

  beforeEach(() => {
    originalExitCode = process.exitCode;
    process.exitCode = undefined;
  });

  afterEach(() => {
    process.exitCode = originalExitCode;
  });

  it('interactive mode shows multi-select with all checked', async () => {
    const { command, selectManyWithAbort } = createHarness({
      interactive: true,
    });

    await runCommand(command, [], ['--scope', 'project']);

    expect(selectManyWithAbort).toHaveBeenCalledTimes(1);
    const choices = selectManyWithAbort.mock.calls[0]?.[1] as Array<{
      value: string;
      checked?: boolean;
    }>;
    expect(
      choices.find((choice) => choice.value === 'oat-docs-analyze')?.checked,
    ).toBe(true);
  });

  it('non-interactive installs all docs skills', async () => {
    const { command, selectManyWithAbort, installDocs } = createHarness({
      interactive: false,
    });

    await runCommand(command, [], ['--scope', 'project']);

    expect(selectManyWithAbort).not.toHaveBeenCalled();
    expect(installDocs).toHaveBeenCalledWith(
      expect.objectContaining({
        skills: [...DOCS_SKILLS],
      }),
    );
  });

  it('--scope user works', async () => {
    const { command, installDocs } = createHarness({ interactive: false });

    await runCommand(command, [], ['--scope', 'user']);

    expect(installDocs).toHaveBeenCalledWith(
      expect.objectContaining({ targetRoot: '/tmp/home' }),
    );
  });
});
