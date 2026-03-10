import type { CommandContext, GlobalOptions } from '@app/command-context';
import {
  createLoggerCapture,
  type LoggerCapture,
} from '@commands/__tests__/helpers';
import { Command } from 'commander';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createValidateOatSkillsCommand } from './validate-oat-skills';

interface HarnessOptions {
  findings?: Array<{ file: string; message: string }>;
  validatedSkillCount?: number;
  throwError?: boolean;
}

function createHarness(options: HarnessOptions = {}): {
  capture: LoggerCapture;
  command: Command;
} {
  const capture = createLoggerCapture();

  const command = createValidateOatSkillsCommand({
    buildCommandContext: (globalOptions: GlobalOptions): CommandContext => ({
      scope: (globalOptions.scope ?? 'project') as 'project' | 'user' | 'all',
      dryRun: false,
      verbose: globalOptions.verbose ?? false,
      json: globalOptions.json ?? false,
      cwd: '/tmp/workspace',
      home: '/tmp/home',
      interactive: !(globalOptions.json ?? false),
      logger: capture.logger,
    }),
    validateOatSkills: vi.fn(async () => {
      if (options.throwError) {
        throw new Error('boom');
      }
      return {
        validatedSkillCount: options.validatedSkillCount ?? 3,
        findings: options.findings ?? [],
      };
    }),
  });

  return { capture, command };
}

async function runCommand(command: Command, globalArgs: string[] = []) {
  const program = new Command()
    .name('oat')
    .option('--json')
    .option('--verbose')
    .option('--scope <scope>')
    .option('--cwd <path>')
    .exitOverride();

  const internal = new Command('internal');
  internal.addCommand(command);
  program.addCommand(internal);
  await program.parseAsync([...globalArgs, 'internal', 'validate-oat-skills'], {
    from: 'user',
  });
}

describe('createValidateOatSkillsCommand', () => {
  let originalExitCode: number | undefined;

  beforeEach(() => {
    originalExitCode = process.exitCode;
    process.exitCode = undefined;
  });

  afterEach(() => {
    process.exitCode = originalExitCode;
  });

  it('returns success output when no findings', async () => {
    const { command, capture } = createHarness({
      validatedSkillCount: 5,
      findings: [],
    });

    await runCommand(command);

    expect(capture.info[0]).toContain('OK: validated 5 oat-* skills');
    expect(process.exitCode).toBe(0);
  });

  it('returns validation failures with exit code 1', async () => {
    const { command, capture } = createHarness({
      findings: [
        {
          file: '/tmp/workspace/.agents/skills/oat-demo/SKILL.md',
          message: 'Missing frontmatter block (--- ... ---)',
        },
      ],
    });

    await runCommand(command);

    expect(capture.error.join('\n')).toContain('OAT skill validation failed:');
    expect(capture.error.join('\n')).toContain('Missing frontmatter block');
    expect(capture.error.join('\n')).toContain(
      'Fix the issues above, then re-run: pnpm oat:validate-skills',
    );
    expect(process.exitCode).toBe(1);
  });

  it('outputs JSON when --json is set', async () => {
    const { command, capture } = createHarness({
      validatedSkillCount: 2,
      findings: [],
    });

    await runCommand(command, ['--json']);

    expect(capture.info).toHaveLength(0);
    expect(capture.error).toHaveLength(0);
    expect(capture.jsonPayloads[0]).toMatchObject({
      validatedSkillCount: 2,
      findings: [],
      status: 'ok',
    });
    expect(process.exitCode).toBe(0);
  });

  it('returns exit code 2 for runtime errors', async () => {
    const { command, capture } = createHarness({ throwError: true });

    await runCommand(command);

    expect(capture.error[0]).toContain('boom');
    expect(process.exitCode).toBe(2);
  });
});
