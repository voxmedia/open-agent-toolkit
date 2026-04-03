import type { CommandContext, GlobalOptions } from '@app/command-context';
import {
  createLoggerCapture,
  type LoggerCapture,
} from '@commands/__tests__/helpers';
import type {
  ValidateChangedSkillVersionBumpsOptions,
  ValidateChangedSkillVersionBumpsResult,
} from '@validation/index';
import { Command } from 'commander';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createValidateSkillVersionBumpsCommand } from './validate-skill-version-bumps';

interface HarnessOptions {
  findings?: Array<{ file: string; message: string }>;
  validatedSkillCount?: number;
  throwError?: boolean;
}

function createHarness(options: HarnessOptions = {}): {
  capture: LoggerCapture;
  command: Command;
  validateChangedSkillVersionBumps: ReturnType<typeof vi.fn>;
} {
  const capture = createLoggerCapture();
  const validateChangedSkillVersionBumps = vi.fn(
    async (
      _repoRoot: string,
      _options: ValidateChangedSkillVersionBumpsOptions,
    ): Promise<ValidateChangedSkillVersionBumpsResult> => {
      if (options.throwError) {
        throw new Error('boom');
      }
      return {
        validatedSkillCount: options.validatedSkillCount ?? 2,
        findings: options.findings ?? [],
      };
    },
  );

  const command = createValidateSkillVersionBumpsCommand({
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
    validateChangedSkillVersionBumps,
  });

  return { capture, command, validateChangedSkillVersionBumps };
}

async function runCommand(
  command: Command,
  globalArgs: string[] = [],
  commandArgs: string[] = [],
) {
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
  await program.parseAsync(
    [...globalArgs, 'internal', 'validate-skill-version-bumps', ...commandArgs],
    {
      from: 'user',
    },
  );
}

describe('createValidateSkillVersionBumpsCommand', () => {
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
      validatedSkillCount: 3,
      findings: [],
    });

    await runCommand(command, [], ['--base-ref', 'origin/main']);

    expect(capture.info[0]).toContain(
      'OK: validated 3 changed canonical skill version bump checks against origin/main',
    );
    expect(process.exitCode).toBe(0);
  });

  it('uses a clearer success message when no skills changed', async () => {
    const { command, capture } = createHarness({
      validatedSkillCount: 0,
      findings: [],
    });

    await runCommand(command, [], ['--base-ref', 'origin/main']);

    expect(capture.info[0]).toContain(
      'OK: 0 canonical skills changed relative to origin/main - nothing to validate',
    );
    expect(process.exitCode).toBe(0);
  });

  it('returns validation failures with exit code 1', async () => {
    const { command, capture } = createHarness({
      findings: [
        {
          file: '/tmp/workspace/.agents/skills/oat-demo/SKILL.md',
          message:
            'Changed canonical skill must bump frontmatter version relative to origin/main (still 1.2.3)',
        },
      ],
    });

    await runCommand(command, [], ['--base-ref', 'origin/main']);

    expect(capture.error.join('\n')).toContain(
      'Canonical skill version validation failed:',
    );
    expect(capture.error.join('\n')).toContain(
      'Changed canonical skill must bump frontmatter version',
    );
    expect(capture.error.join('\n')).toContain(
      'oat internal validate-skill-version-bumps --base-ref origin/main',
    );
    expect(process.exitCode).toBe(1);
  });

  it('outputs JSON when --json is set', async () => {
    const { command, capture } = createHarness({
      validatedSkillCount: 1,
      findings: [],
    });

    await runCommand(command, ['--json'], ['--base-ref', 'origin/main']);

    expect(capture.info).toHaveLength(0);
    expect(capture.error).toHaveLength(0);
    expect(capture.jsonPayloads[0]).toMatchObject({
      baseRef: 'origin/main',
      validatedSkillCount: 1,
      findings: [],
      status: 'ok',
    });
    expect(process.exitCode).toBe(0);
  });

  it('passes base-ref through to validation', async () => {
    const { command, validateChangedSkillVersionBumps } = createHarness();

    await runCommand(command, [], ['--base-ref', 'origin/main']);

    expect(validateChangedSkillVersionBumps).toHaveBeenCalledWith(
      '/tmp/workspace',
      { baseRef: 'origin/main' },
    );
  });
});
