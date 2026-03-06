import type { CommandContext, GlobalOptions } from '@app/command-context';
import {
  createLoggerCapture,
  type LoggerCapture,
} from '@commands/__tests__/helpers';
import type { MultiSelectChoice } from '@commands/shared/shared.prompts';
import type { Scope } from '@shared/types';
import { Command } from 'commander';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createInitToolsUtilityCommand } from './index';

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
  installUtility: ReturnType<typeof vi.fn>;
} {
  const capture = createLoggerCapture();
  const selectResponses = [
    ...(options.selectResponses ?? [['oat-review-provide']]),
  ];
  const confirmResponses = [...(options.confirmResponses ?? [true])];

  const selectManyWithAbort = vi.fn(
    async (_message: string, _choices: MultiSelectChoice<string>[]) =>
      selectResponses.shift() ?? ['oat-review-provide'],
  );
  const confirmAction = vi.fn(async () => confirmResponses.shift() ?? true);
  const installUtility = vi.fn(async () => ({
    copiedSkills: ['oat-review-provide'],
    updatedSkills: [],
    skippedSkills: [],
  }));

  const command = createInitToolsUtilityCommand({
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
    installUtility,
    selectManyWithAbort,
    confirmAction,
  });

  return {
    capture,
    command,
    selectManyWithAbort,
    confirmAction,
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
  const tools = new Command('tools');
  tools.addCommand(command);
  init.addCommand(tools);
  program.addCommand(init);

  await program.parseAsync(
    [...globalArgs, 'init', 'tools', 'utility', ...args],
    {
      from: 'user',
    },
  );
}

describe('createInitToolsUtilityCommand', () => {
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
      choices.find((choice) => choice.value === 'oat-review-provide')?.checked,
    ).toBe(true);
  });

  it('non-interactive installs all utility skills', async () => {
    const { command, selectManyWithAbort, installUtility } = createHarness({
      interactive: false,
    });

    await runCommand(command, [], ['--scope', 'project']);

    expect(selectManyWithAbort).not.toHaveBeenCalled();
    expect(installUtility).toHaveBeenCalledWith(
      expect.objectContaining({
        skills: [
          'oat-review-provide',
          'oat-review-receive',
          'oat-review-receive-remote',
          'oat-agent-instructions-analyze',
          'oat-agent-instructions-apply',
          'oat-repo-maintainability-review',
        ],
      }),
    );
  });

  it('--scope user works', async () => {
    const { command, installUtility } = createHarness({ interactive: false });

    await runCommand(command, [], ['--scope', 'user']);

    expect(installUtility).toHaveBeenCalledWith(
      expect.objectContaining({ targetRoot: '/tmp/home' }),
    );
  });

  it('--scope project works', async () => {
    const { command, installUtility } = createHarness({ interactive: false });

    await runCommand(command, [], ['--scope', 'project']);

    expect(installUtility).toHaveBeenCalledWith(
      expect.objectContaining({ targetRoot: '/tmp/workspace' }),
    );
  });

  it('--force with interactive confirms before overwriting (decline)', async () => {
    const { command, confirmAction, installUtility, capture } = createHarness({
      interactive: true,
      confirmResponses: [false],
    });

    await runCommand(command, ['--force'], ['--scope', 'project']);

    expect(confirmAction).toHaveBeenCalledTimes(1);
    expect(installUtility).not.toHaveBeenCalled();
    expect(capture.info).toContain('Cancelled: no files were overwritten.');
    expect(process.exitCode).toBe(0);
  });

  it('--force with interactive confirms before overwriting (accept)', async () => {
    const { command, confirmAction, installUtility } = createHarness({
      interactive: true,
      confirmResponses: [true],
    });

    await runCommand(command, ['--force'], ['--scope', 'project']);

    expect(confirmAction).toHaveBeenCalledTimes(1);
    expect(installUtility).toHaveBeenCalledTimes(1);
    expect(installUtility).toHaveBeenCalledWith(
      expect.objectContaining({ force: true }),
    );
  });
});
