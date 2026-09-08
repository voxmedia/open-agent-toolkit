import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

import type { CommandContext, GlobalOptions } from '@app/command-context';
import {
  createLoggerCapture,
  type LoggerCapture,
} from '@commands/__tests__/helpers';
import {
  validateChangedSkillVersionBumps as runVersionBumpValidation,
  type ValidateChangedSkillVersionBumpsOptions,
  type ValidateChangedSkillVersionBumpsResult,
} from '@validation/index';
import { Command } from 'commander';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createValidateSkillVersionBumpsCommand } from './validate-skill-version-bumps';

const execFileAsync = promisify(execFile);

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

describe('validate-skill-version-bumps gate outcomes', () => {
  const tempDirs: string[] = [];
  let originalExitCode: typeof process.exitCode;

  beforeEach(() => {
    originalExitCode = process.exitCode;
    process.exitCode = undefined;
  });

  afterEach(async () => {
    process.exitCode = originalExitCode;
    await Promise.all(
      tempDirs.map((dir) => rm(dir, { recursive: true, force: true })),
    );
    tempDirs.length = 0;
  });

  function skillContent(versionLines: readonly string[], body: string): string {
    return [
      '---',
      'name: oat-gate-fixture',
      ...versionLines,
      'description: Use when proving the bump gate outcome. Fixture skill.',
      'disable-model-invocation: true',
      'user-invocable: true',
      'allowed-tools: Read, Write',
      '---',
      '',
      '# Gate fixture',
      '',
      body,
    ].join('\n');
  }

  async function git(root: string, args: string[]): Promise<void> {
    await execFileAsync('git', args, {
      cwd: root,
      env: {
        ...process.env,
        GIT_AUTHOR_NAME: 'oat',
        GIT_AUTHOR_EMAIL: 'oat@example.com',
        GIT_COMMITTER_NAME: 'oat',
        GIT_COMMITTER_EMAIL: 'oat@example.com',
      },
    });
  }

  /**
   * Build a real two-commit repository so the gate outcome comes from the
   * production validator and real `git diff`/`git show` reads, not a stub.
   */
  async function createRepo(
    baseVersionLines: readonly string[],
    headVersionLines: readonly string[],
  ): Promise<string> {
    const root = await mkdtemp(join(tmpdir(), 'oat-bump-gate-'));
    tempDirs.push(root);
    const skillDir = join(root, '.agents', 'skills', 'oat-gate-fixture');
    await mkdir(skillDir, { recursive: true });
    const skillPath = join(skillDir, 'SKILL.md');

    await git(root, ['init', '--initial-branch=base', '--quiet', root]);
    await writeFile(
      skillPath,
      skillContent(baseVersionLines, 'Base instructions.'),
      'utf8',
    );
    await git(root, ['add', '.']);
    await git(root, ['commit', '--quiet', '-m', 'base']);
    await git(root, ['checkout', '--quiet', '-b', 'work']);
    await writeFile(
      skillPath,
      skillContent(headVersionLines, 'Changed instructions.'),
      'utf8',
    );
    await git(root, ['add', '.']);
    await git(root, ['commit', '--quiet', '-m', 'change']);

    return root;
  }

  function createGateHarness(
    repoRoot: string,
    validate: (
      repoRoot: string,
      options: ValidateChangedSkillVersionBumpsOptions,
    ) => Promise<ValidateChangedSkillVersionBumpsResult> = (root, options) =>
      runVersionBumpValidation(root, options),
  ): { capture: LoggerCapture; command: Command } {
    const capture = createLoggerCapture();
    const command = createValidateSkillVersionBumpsCommand({
      buildCommandContext: (globalOptions: GlobalOptions): CommandContext => ({
        scope: 'project',
        dryRun: false,
        verbose: false,
        json: globalOptions.json ?? false,
        cwd: repoRoot,
        home: '/tmp/home',
        interactive: !(globalOptions.json ?? false),
        logger: capture.logger,
      }),
      validateChangedSkillVersionBumps: validate,
    });
    return { capture, command };
  }

  it('exits 0 for an alias-only skill with a valid bump', async () => {
    const repoRoot = await createRepo(['version: 1.2.3'], ['version: 1.2.4']);
    const { command, capture } = createGateHarness(repoRoot);

    await runCommand(command, [], ['--base-ref', 'base']);

    expect(process.exitCode).toBe(0);
    expect(capture.error).toEqual([]);
    expect(capture.info.join('\n')).toContain(
      'OK: validated 1 changed canonical skill version bump checks against base',
    );
  });

  it('exits 1 for a real missing bump', async () => {
    const repoRoot = await createRepo(['version: 1.2.3'], ['version: 1.2.3']);
    const { command, capture } = createGateHarness(repoRoot);

    await runCommand(command, [], ['--base-ref', 'base']);

    expect(process.exitCode).toBe(1);
    expect(capture.error.join('\n')).toContain(
      'Changed canonical skill must bump frontmatter version relative to base (still 1.2.3)',
    );
  });

  it('exits 1 for a conflicting skill', async () => {
    const repoRoot = await createRepo(
      ['version: 1.2.3'],
      ['version: 1.2.4', 'metadata:', '  version: 2.0.0'],
    );
    const { command, capture } = createGateHarness(repoRoot);

    await runCommand(command, [], ['--base-ref', 'base']);

    expect(process.exitCode).toBe(1);
    expect(capture.error.join('\n')).toContain(
      'Frontmatter metadata.version (2.0.0) and top-level version (1.2.4) differ',
    );
  });

  it('exits 0 for a skill migrated to metadata.version with a valid bump', async () => {
    const repoRoot = await createRepo(
      ['version: 1.2.3'],
      ['metadata:', '  version: 1.2.4'],
    );
    const { command } = createGateHarness(repoRoot);

    await runCommand(command, [], ['--base-ref', 'base']);

    expect(process.exitCode).toBe(0);
  });

  it('fails the gate when an alias warning is routed into the bump result', async () => {
    // Negative control for the routing boundary: the wrapper sets exit 1 on
    // any finding regardless of severity, so an alias deprecation warning
    // emitted here would fail the bump gate for every unmigrated skill. This
    // is why `skill-version-alias` is emitted only by structural validation.
    const repoRoot = await createRepo(['version: 1.2.3'], ['version: 1.2.4']);
    const { command, capture } = createGateHarness(
      repoRoot,
      async (root, options) => {
        const result = await runVersionBumpValidation(root, options);
        return {
          ...result,
          findings: [
            ...result.findings,
            {
              file: join(
                root,
                '.agents',
                'skills',
                'oat-gate-fixture',
                'SKILL.md',
              ),
              code: 'skill-version-alias',
              severity: 'warning' as const,
              message:
                'Frontmatter version 1.2.4 uses the deprecated top-level alias; move it to metadata.version (metadata.version wins when both are present)',
            },
          ],
        };
      },
    );

    await runCommand(command, [], ['--base-ref', 'base']);

    expect(process.exitCode).toBe(1);
    expect(capture.error.join('\n')).toContain(
      'uses the deprecated top-level alias',
    );
  });
});
