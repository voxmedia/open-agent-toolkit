import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { CommandContext, GlobalOptions } from '@app/command-context';
import {
  createLoggerCapture,
  type LoggerCapture,
} from '@commands/__tests__/helpers';
import { BUILTIN_EXEC_TARGETS } from '@config/oat-config';
import { resolveEffectiveConfig, resolveExecTargets } from '@config/resolve';
import { Command } from 'commander';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createGateCommand } from './index';

interface HarnessOptions {
  cwd: string;
  home: string;
}

function createHarness(options: HarnessOptions): {
  capture: LoggerCapture;
  command: Command;
} {
  const capture = createLoggerCapture();

  const command = createGateCommand({
    buildCommandContext: (globalOptions: GlobalOptions): CommandContext => ({
      scope: (globalOptions.scope ?? 'project') as 'project' | 'user' | 'all',
      dryRun: false,
      verbose: globalOptions.verbose ?? false,
      json: globalOptions.json ?? false,
      cwd: globalOptions.cwd ?? options.cwd,
      home: options.home,
      interactive: !(globalOptions.json ?? false),
      logger: capture.logger,
    }),
    resolveProjectRoot: vi.fn(async () => options.cwd),
  });

  return { capture, command };
}

async function runCommand(
  command: Command,
  commandArgs: string[],
  globalArgs: string[] = ['--json'],
): Promise<void> {
  const program = new Command()
    .name('oat')
    .option('--json')
    .option('--verbose')
    .option('--scope <scope>')
    .option('--cwd <path>')
    .exitOverride();

  program.addCommand(command);
  await program.parseAsync([...globalArgs, 'gate', ...commandArgs], {
    from: 'user',
  });
}

async function runGateCommand(
  root: string,
  home: string,
  commandArgs: string[],
  globalArgs: string[] = ['--json'],
): Promise<LoggerCapture> {
  process.exitCode = undefined;
  const { command, capture } = createHarness({ cwd: root, home });
  await runCommand(command, commandArgs, globalArgs);
  return capture;
}

async function readJsonFile(path: string): Promise<unknown> {
  return JSON.parse(await readFile(path, 'utf8'));
}

async function readResolvedTargets(root: string, home: string) {
  const effective = await resolveEffectiveConfig(root, join(home, '.oat'), {});
  return resolveExecTargets(effective);
}

describe('oat gate', () => {
  const tempDirs: string[] = [];
  let originalExitCode: number | undefined;

  beforeEach(() => {
    originalExitCode = process.exitCode;
    process.exitCode = undefined;
  });

  afterEach(async () => {
    process.exitCode = originalExitCode;
    await Promise.all(
      tempDirs.map(async (dir) => rm(dir, { recursive: true, force: true })),
    );
    tempDirs.length = 0;
  });

  async function setup(): Promise<{ root: string; home: string }> {
    const root = await mkdtemp(join(tmpdir(), 'oat-gate-command-'));
    const home = await mkdtemp(join(tmpdir(), 'oat-gate-home-'));
    tempDirs.push(root, home);
    await mkdir(join(root, '.oat'), { recursive: true });
    return { root, home };
  }

  it('resolves a configured gate as JSON and exits zero', async () => {
    const { root, home } = await setup();
    await writeFile(
      join(root, '.oat', 'config.json'),
      `${JSON.stringify({
        version: 1,
        workflow: {
          gates: {
            skills: {
              'oat-project-plan': {
                command: 'pnpm test',
                description: 'Run the test suite before finishing.',
                onFailure: 'block',
                maxAttempts: 3,
              },
            },
          },
        },
      })}\n`,
      'utf8',
    );

    const { command, capture } = createHarness({ cwd: root, home });
    await runCommand(command, ['resolve', 'oat-project-plan']);

    expect(capture.jsonPayloads[0]).toEqual({
      command: 'pnpm test',
      description: 'Run the test suite before finishing.',
      onFailure: 'block',
      maxAttempts: 3,
    });
    expect(process.exitCode).toBe(0);
  });

  it('prints null and exits zero when a gate is absent', async () => {
    const { root, home } = await setup();

    const { command, capture } = createHarness({ cwd: root, home });
    await runCommand(command, ['resolve', 'oat-project-plan']);

    expect(capture.jsonPayloads[0]).toBeNull();
    expect(process.exitCode).toBe(0);
  });

  it('prints null and exits zero when a gate is disabled', async () => {
    const { root, home } = await setup();
    await writeFile(
      join(root, '.oat', 'config.json'),
      `${JSON.stringify({
        version: 1,
        workflow: {
          gates: {
            skills: {
              'oat-project-plan': null,
            },
          },
        },
      })}\n`,
      'utf8',
    );

    const { command, capture } = createHarness({ cwd: root, home });
    await runCommand(command, ['resolve', 'oat-project-plan']);

    expect(capture.jsonPayloads[0]).toBeNull();
    expect(process.exitCode).toBe(0);
  });

  it('prints null and exits zero for an unknown skill', async () => {
    const { root, home } = await setup();
    await writeFile(
      join(root, '.oat', 'config.json'),
      `${JSON.stringify({
        version: 1,
        workflow: {
          gates: {
            skills: {
              'oat-project-implement': {
                command: 'pnpm lint',
                onFailure: 'warn',
              },
            },
          },
        },
      })}\n`,
      'utf8',
    );

    const { command, capture } = createHarness({ cwd: root, home });
    await runCommand(command, ['resolve', 'oat-project-plan']);

    expect(capture.jsonPayloads[0]).toBeNull();
    expect(process.exitCode).toBe(0);
  });

  it('sets, disables, and unsets skill gates', async () => {
    const { root, home } = await setup();

    await runGateCommand(root, home, [
      'set',
      'oat-project-plan',
      '--command',
      'pnpm test',
      '--description',
      'Run tests before finishing.',
      '--on-failure',
      'block',
      '--max-attempts',
      '4',
      '--layer',
      'shared',
    ]);

    let capture = await runGateCommand(root, home, [
      'resolve',
      'oat-project-plan',
    ]);
    expect(capture.jsonPayloads[0]).toEqual({
      command: 'pnpm test',
      description: 'Run tests before finishing.',
      onFailure: 'block',
      maxAttempts: 4,
    });
    expect(process.exitCode).toBe(0);

    await runGateCommand(root, home, [
      'set',
      'oat-project-plan',
      '--disable',
      '--layer',
      'shared',
    ]);
    capture = await runGateCommand(root, home, ['resolve', 'oat-project-plan']);
    expect(capture.jsonPayloads[0]).toBeNull();
    expect(process.exitCode).toBe(0);

    await runGateCommand(root, home, [
      'unset',
      'oat-project-plan',
      '--layer',
      'shared',
    ]);
    const shared = (await readJsonFile(join(root, '.oat', 'config.json'))) as {
      workflow?: { gates?: { skills?: Record<string, unknown> } };
    };
    expect(
      shared.workflow?.gates?.skills?.['oat-project-plan'],
    ).toBeUndefined();
    expect(process.exitCode).toBe(0);
  });

  it('rejects invalid skill gate inputs with actionable errors', async () => {
    const { root, home } = await setup();

    let capture = await runGateCommand(root, home, [
      'set',
      'oat-project-plan',
      '--command',
      '',
      '--on-failure',
      'block',
    ]);
    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'error',
      message: expect.stringContaining('--command must be a non-empty string'),
    });
    expect(process.exitCode).toBe(1);

    capture = await runGateCommand(root, home, [
      'set',
      'oat-project-plan',
      '--command',
      'pnpm test',
      '--on-failure',
      'explode',
    ]);
    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'error',
      message: expect.stringContaining(
        '--on-failure must be one of block | prompt | warn',
      ),
    });
    expect(process.exitCode).toBe(1);
  });

  it('sets exec targets and preserves provider flags in JSON argv inputs', async () => {
    const { root, home } = await setup();

    await runGateCommand(root, home, [
      'target',
      'set',
      'claude-opus',
      '--runtime',
      'claude',
      '--base-command-json',
      '["claude","-p","--model","opus"]',
      '--host-detection-json',
      '["sh","-c","test -n \\"$CLAUDECODE\\""]',
      '--availability-json',
      '["claude","--version"]',
      '--priority',
      '50',
    ]);
    await runGateCommand(root, home, [
      'target',
      'set',
      'cursor-composer',
      '--runtime',
      'cursor',
      '--base-command-json',
      '["cursor-agent","-p","--model","composer-2.5"]',
    ]);
    await runGateCommand(root, home, [
      'target',
      'set',
      'codex-gpt',
      '--runtime',
      'codex',
      '--base-command-json',
      '["codex","exec","-m","gpt-5.5","--effort","high"]',
    ]);

    const targets = await readResolvedTargets(root, home);
    expect(targets['claude-opus']).toEqual({
      runtime: 'claude',
      baseCommand: ['claude', '-p', '--model', 'opus'],
      hostDetectionCommand: ['sh', '-c', 'test -n "$CLAUDECODE"'],
      availabilityCommand: ['claude', '--version'],
      priority: 50,
    });
    expect(targets['cursor-composer']?.baseCommand).toEqual([
      'cursor-agent',
      '-p',
      '--model',
      'composer-2.5',
    ]);
    expect(targets['codex-gpt']?.baseCommand).toEqual([
      'codex',
      'exec',
      '-m',
      'gpt-5.5',
      '--effort',
      'high',
    ]);
    expect(process.exitCode).toBe(0);
  });

  it('disables and unsets exec targets', async () => {
    const { root, home } = await setup();

    await runGateCommand(root, home, [
      'target',
      'set',
      'codex-default',
      '--disable',
      '--layer',
      'shared',
    ]);
    let targets = await readResolvedTargets(root, home);
    expect(targets['codex-default']).toBeUndefined();

    await runGateCommand(root, home, [
      'target',
      'unset',
      'codex-default',
      '--layer',
      'shared',
    ]);
    targets = await readResolvedTargets(root, home);
    expect(targets['codex-default']).toEqual(
      BUILTIN_EXEC_TARGETS['codex-default'],
    );
    expect(process.exitCode).toBe(0);
  });

  it('rejects malformed target JSON and non-array argv inputs', async () => {
    const { root, home } = await setup();

    let capture = await runGateCommand(root, home, [
      'target',
      'set',
      'bad-json',
      '--runtime',
      'claude',
      '--base-command-json',
      'not-json',
    ]);
    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'error',
      message: expect.stringContaining(
        '--base-command-json must be valid JSON',
      ),
    });
    expect(process.exitCode).toBe(1);

    capture = await runGateCommand(root, home, [
      'target',
      'set',
      'bad-argv',
      '--runtime',
      'claude',
      '--base-command-json',
      '{"cmd":"claude"}',
    ]);
    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'error',
      message: expect.stringContaining(
        '--base-command-json must be a non-empty JSON array of strings',
      ),
    });
    expect(process.exitCode).toBe(1);
  });

  it('writes the selected layer and preserves sibling gate config', async () => {
    const { root, home } = await setup();
    await writeFile(
      join(root, '.oat', 'config.json'),
      `${JSON.stringify({
        version: 1,
        workflow: {
          gates: {
            skills: {
              existing: {
                command: 'pnpm lint',
                onFailure: 'warn',
              },
            },
            execTargets: {
              existing: {
                runtime: 'custom',
                baseCommand: ['custom-review'],
                priority: 5,
              },
            },
          },
        },
      })}\n`,
      'utf8',
    );

    await runGateCommand(root, home, [
      'set',
      'oat-project-plan',
      '--command',
      'pnpm test',
      '--on-failure',
      'prompt',
      '--layer',
      'shared',
    ]);
    await runGateCommand(root, home, [
      'target',
      'set',
      'local-reviewer',
      '--runtime',
      'local',
      '--base-command-json',
      '["local-reviewer"]',
      '--layer',
      'local',
    ]);
    await runGateCommand(root, home, [
      'set',
      'user-skill',
      '--command',
      'pnpm build',
      '--on-failure',
      'warn',
      '--layer',
      'user',
    ]);

    const shared = (await readJsonFile(join(root, '.oat', 'config.json'))) as {
      workflow?: {
        gates?: {
          skills?: Record<string, unknown>;
          execTargets?: Record<string, unknown>;
        };
      };
    };
    const local = (await readJsonFile(
      join(root, '.oat', 'config.local.json'),
    )) as {
      workflow?: { gates?: { execTargets?: Record<string, unknown> } };
    };
    const user = (await readJsonFile(join(home, '.oat', 'config.json'))) as {
      workflow?: { gates?: { skills?: Record<string, unknown> } };
    };

    expect(shared.workflow?.gates?.skills).toMatchObject({
      existing: { command: 'pnpm lint', onFailure: 'warn', maxAttempts: 2 },
      'oat-project-plan': {
        command: 'pnpm test',
        onFailure: 'prompt',
        maxAttempts: 2,
      },
    });
    expect(shared.workflow?.gates?.execTargets?.existing).toEqual({
      runtime: 'custom',
      baseCommand: ['custom-review'],
      priority: 5,
    });
    expect(local.workflow?.gates?.execTargets?.['local-reviewer']).toEqual({
      runtime: 'local',
      baseCommand: ['local-reviewer'],
      priority: 0,
    });
    expect(user.workflow?.gates?.skills?.['user-skill']).toEqual({
      command: 'pnpm build',
      onFailure: 'warn',
      maxAttempts: 2,
    });
    expect(process.exitCode).toBe(0);
  });

  it('rejects auto and invalid write layers', async () => {
    const { root, home } = await setup();

    let capture = await runGateCommand(root, home, [
      'set',
      'oat-project-plan',
      '--command',
      'pnpm test',
      '--on-failure',
      'block',
      '--layer',
      'auto',
    ]);
    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'error',
      message: expect.stringContaining(
        '--layer must be one of shared | local | user',
      ),
    });
    expect(process.exitCode).toBe(1);

    capture = await runGateCommand(root, home, [
      'target',
      'set',
      'reviewer',
      '--runtime',
      'codex',
      '--base-command-json',
      '["codex","exec"]',
      '--layer',
      'global',
    ]);
    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'error',
      message: expect.stringContaining(
        '--layer must be one of shared | local | user',
      ),
    });
    expect(process.exitCode).toBe(1);
  });
});
