import type { CommandContext, GlobalOptions } from '@app/command-context';
import {
  createLoggerCapture,
  type LoggerCapture,
} from '@commands/__tests__/helpers';
import { UTILITY_SKILLS } from '@commands/init/tools/utility/install-utility';
import { WORKFLOW_SKILLS } from '@commands/init/tools/workflows/install-workflows';
import type { Scope } from '@shared/types';
import { Command } from 'commander';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDefaultRemoveSkillDependencies } from '../skill/remove-skill';
import { createRemoveSkillsCommand } from './remove-skills';

interface HarnessOptions {
  scope?: Scope;
  interactive?: boolean;
  confirmResponses?: boolean[];
}

function createHarness(options: HarnessOptions = {}): {
  capture: LoggerCapture;
  command: Command;
  confirmAction: ReturnType<typeof vi.fn>;
  runRemoveSkill: ReturnType<typeof vi.fn>;
} {
  const capture = createLoggerCapture();
  const confirmQueue = [...(options.confirmResponses ?? [true])];

  const confirmAction = vi.fn(async () => confirmQueue.shift() ?? true);
  const runRemoveSkill = vi.fn(async () => true);

  const command = createRemoveSkillsCommand({
    buildCommandContext: (globalOptions: GlobalOptions): CommandContext => ({
      scope: (globalOptions.scope ?? options.scope ?? 'project') as Scope,
      apply: false,
      verbose: globalOptions.verbose ?? false,
      json: globalOptions.json ?? false,
      cwd: '/tmp/workspace',
      home: '/tmp/home',
      interactive: options.interactive ?? !(globalOptions.json ?? false),
      logger: capture.logger,
    }),
    confirmAction,
    runRemoveSkill,
    removeSkillDependencies: createDefaultRemoveSkillDependencies(),
  });

  return { capture, command, confirmAction, runRemoveSkill };
}

async function runCommand(
  command: Command,
  globalArgs: string[] = [],
  commandArgs: string[] = [],
): Promise<void> {
  const program = new Command()
    .name('oat')
    .option('--json')
    .option('--verbose')
    .option('--scope <scope>')
    .option('--cwd <path>')
    .exitOverride();

  const remove = new Command('remove');
  remove.addCommand(command);
  program.addCommand(remove);

  await program.parseAsync(
    [...globalArgs, 'remove', 'skills', ...commandArgs],
    {
      from: 'user',
    },
  );
}

describe('createRemoveSkillsCommand', () => {
  let originalExitCode: number | undefined;

  beforeEach(() => {
    originalExitCode = process.exitCode;
    process.exitCode = undefined;
  });

  afterEach(() => {
    process.exitCode = originalExitCode;
  });

  it('rejects invalid pack values', async () => {
    const { command, capture } = createHarness();
    await runCommand(command, [], ['--pack', 'unknown']);

    expect(process.exitCode).toBe(2);
    expect(capture.error[0]).toContain('Invalid pack');
  });

  it('runs remove-skill workflow for utility pack members', async () => {
    const { command, runRemoveSkill } = createHarness({ interactive: false });
    await runCommand(command, [], ['--pack', 'utility']);

    expect(runRemoveSkill).toHaveBeenCalledTimes(UTILITY_SKILLS.length);
    expect(process.exitCode).toBe(0);
  });

  it('asks for confirmation when interactive and pack has more than 3 skills', async () => {
    const { command, confirmAction, runRemoveSkill, capture } = createHarness({
      interactive: true,
      confirmResponses: [false],
    });

    await runCommand(command, [], ['--pack', 'workflows']);

    expect(confirmAction).toHaveBeenCalledTimes(1);
    expect(runRemoveSkill).not.toHaveBeenCalled();
    expect(capture.info).toContain('Removal cancelled.');
    expect(process.exitCode).toBe(0);
  });

  it('continues when confirmation passes for large packs', async () => {
    const { command, confirmAction, runRemoveSkill } = createHarness({
      interactive: true,
      confirmResponses: [true],
    });

    await runCommand(command, [], ['--pack', 'workflows']);

    expect(confirmAction).toHaveBeenCalledTimes(1);
    expect(runRemoveSkill).toHaveBeenCalledTimes(WORKFLOW_SKILLS.length);
    expect(process.exitCode).toBe(0);
  });

  it('reports removed and skipped counts from runRemoveSkill results', async () => {
    const { command, runRemoveSkill, capture } = createHarness({
      interactive: false,
    });

    runRemoveSkill
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);

    await runCommand(command, [], ['--pack', 'ideas']);

    expect(capture.info.join('\n')).toContain(
      "Pack 'ideas' processed. Removed: 2. Skipped: 2.",
    );
    expect(process.exitCode).toBe(0);
  });

  it('passes scope=all through to remove-skill invocations', async () => {
    const { command, runRemoveSkill } = createHarness({ interactive: false });
    await runCommand(command, ['--scope', 'all'], ['--pack', 'utility']);

    expect(runRemoveSkill).toHaveBeenCalledTimes(UTILITY_SKILLS.length);
    expect(runRemoveSkill).toHaveBeenCalledWith(
      expect.objectContaining({ scope: 'all' }),
      expect.any(String),
      false,
      expect.any(Object),
    );
    expect(process.exitCode).toBe(0);
  });

  it('emits a single aggregate json payload in json mode', async () => {
    const { command, runRemoveSkill, capture } = createHarness({
      interactive: false,
    });

    runRemoveSkill.mockImplementation(async (context: CommandContext) => {
      if (context.json) {
        context.logger.json({ status: 'not_found', skill: 'oat-missing' });
      }
      return false;
    });

    await runCommand(command, ['--json'], ['--pack', 'utility']);

    expect(capture.jsonPayloads).toEqual([
      {
        status: 'ok',
        pack: 'utility',
        removedCount: 0,
        skippedCount: UTILITY_SKILLS.length,
      },
    ]);
    expect(process.exitCode).toBe(0);
  });
});
