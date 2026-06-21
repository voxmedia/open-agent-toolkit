import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { CommandContext, GlobalOptions } from '@app/command-context';
import {
  createLoggerCapture,
  type LoggerCapture,
} from '@commands/__tests__/helpers';
import type { ValidateOatSkillsOptions } from '@validation/index';
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
  validateOatSkills: ReturnType<typeof vi.fn>;
} {
  const capture = createLoggerCapture();
  const validateOatSkills = vi.fn(
    async (_repoRoot: string, _options?: ValidateOatSkillsOptions) => {
      if (options.throwError) {
        throw new Error('boom');
      }
      return {
        validatedSkillCount: options.validatedSkillCount ?? 3,
        findings: options.findings ?? [],
      };
    },
  );

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
    validateOatSkills,
  });

  return { capture, command, validateOatSkills };
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
    [...globalArgs, 'internal', 'validate-oat-skills', ...commandArgs],
    {
      from: 'user',
    },
  );
}

describe('createValidateOatSkillsCommand', () => {
  let originalExitCode: number | undefined;
  const tempDirs: string[] = [];

  beforeEach(() => {
    originalExitCode = process.exitCode;
    process.exitCode = undefined;
  });

  afterEach(async () => {
    process.exitCode = originalExitCode;
    await Promise.all(
      tempDirs.map(async (dir) => {
        await rm(dir, { recursive: true, force: true });
      }),
    );
    tempDirs.length = 0;
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

  it('passes base-ref through to validation', async () => {
    const { command, validateOatSkills } = createHarness();

    await runCommand(command, [], ['--base-ref', 'origin/main']);

    expect(validateOatSkills).toHaveBeenCalledWith('/tmp/workspace', {
      baseRef: 'origin/main',
    });
  });

  it('resolves gates.skills config and surfaces non-gateable warnings', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'oat-validate-command-'));
    const home = await mkdtemp(join(tmpdir(), 'oat-validate-home-'));
    tempDirs.push(repoRoot, home);
    const skillDir = join(repoRoot, '.agents', 'skills', 'oat-not-gateable');
    await mkdir(skillDir, { recursive: true });
    const skillPath = join(skillDir, 'SKILL.md');
    await writeFile(
      skillPath,
      [
        '---',
        'name: oat-not-gateable',
        'description: Use when validating command-level gateability warnings.',
        'disable-model-invocation: true',
        'user-invocable: true',
        'allowed-tools: Read, Write',
        '---',
        '',
        '# Demo',
        '',
        '## Progress Indicators (User-Facing)',
        '',
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        ' OAT ▸ DEMO',
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      ].join('\n'),
      'utf8',
    );
    await mkdir(join(repoRoot, '.oat'), { recursive: true });
    await writeFile(
      join(repoRoot, '.oat', 'config.json'),
      JSON.stringify(
        {
          version: 1,
          workflow: {
            gates: {
              skills: {
                'oat-not-gateable': {
                  command: 'pnpm test',
                  onFailure: 'warn',
                },
              },
            },
          },
        },
        null,
        2,
      ),
      'utf8',
    );
    const capture = createLoggerCapture();
    const command = createValidateOatSkillsCommand({
      buildCommandContext: (globalOptions: GlobalOptions): CommandContext => ({
        scope: (globalOptions.scope ?? 'project') as 'project' | 'user' | 'all',
        dryRun: false,
        verbose: globalOptions.verbose ?? false,
        json: globalOptions.json ?? false,
        cwd: repoRoot,
        home,
        interactive: !(globalOptions.json ?? false),
        logger: capture.logger,
      }),
    });

    await runCommand(command, ['--json']);

    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'failed',
      validatedSkillCount: 1,
      findings: [
        {
          file: skillPath,
          message: 'Configured gate targets skill without oat_gateable: true',
          severity: 'warning',
        },
      ],
    });
    expect(process.exitCode).toBe(1);
  });
});
