import type { CommandContext, GlobalOptions } from '@app/command-context';
import {
  createLoggerCapture,
  type LoggerCapture,
} from '@commands/__tests__/helpers';
import { CliError } from '@errors/cli-error';
import { Command } from 'commander';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createProjectScopeCommand } from './index';

function createHarness(
  activeProject?: string,
  resolveError?: Error,
): {
  command: Command;
  capture: LoggerCapture;
} {
  const capture = createLoggerCapture();
  return {
    capture,
    command: createProjectScopeCommand({
      buildCommandContext: (options: GlobalOptions): CommandContext => ({
        scope: 'project',
        dryRun: false,
        verbose: options.verbose ?? false,
        json: options.json ?? false,
        cwd: '/repo',
        home: '/home',
        interactive: false,
        logger: capture.logger,
      }),
      resolveProjectRoot: async () => {
        if (resolveError) throw resolveError;
        return '/repo';
      },
      resolveProjectsRoot: async () => '.oat/projects/shared',
      readOatLocalConfig: async () => ({ version: 1, activeProject }),
      readSyncedRecord: async (path) =>
        path.endsWith('/demo.json')
          ? {
              schemaVersion: 1,
              slug: 'demo',
              scope: 'synced',
              ref: 'refs/oat/projects/demo',
              remote: 'origin',
              status: 'active',
              createdAt: '2026-08-27T00:00:00.000Z',
              completedAt: null,
            }
          : null,
      isSyncedCheckout: async (path) => path.endsWith('/demo'),
      processEnv: {},
    }),
  };
}

async function run(
  command: Command,
  args: string[],
  globals: string[] = [],
): Promise<void> {
  const program = new Command()
    .name('oat')
    .option('--json')
    .option('--verbose')
    .exitOverride();
  const project = new Command('project');
  project.addCommand(command);
  program.addCommand(project);
  await program.parseAsync([...globals, 'project', 'scope', ...args], {
    from: 'user',
  });
}

describe('createProjectScopeCommand', () => {
  let previousExitCode: number | undefined;
  beforeEach(() => {
    previousExitCode = process.exitCode;
    process.exitCode = undefined;
  });
  afterEach(() => {
    process.exitCode = previousExitCode;
  });

  it.each([
    ['.oat/projects/shared/demo', 'shared'],
    ['.oat/projects/local/demo', 'local'],
    ['.oat/projects/synced/demo', 'synced'],
  ])('resolves %s as %s', async (path, scope) => {
    const { command, capture } = createHarness();
    await run(command, [path, '--format', 'value'], ['--verbose']);
    expect(capture.info).toEqual([scope]);
    expect(process.exitCode).toBe(0);
  });

  it('uses the active project when no path is passed', async () => {
    const { command, capture } = createHarness('.oat/projects/local/active');
    await run(command, ['--format', 'value']);
    expect(capture.info).toEqual(['local']);
  });

  it('fails clearly when no path or active project exists', async () => {
    const { command, capture } = createHarness();
    await run(command, []);
    expect(capture.error[0]).toContain('No active project');
    expect(process.exitCode).toBe(1);
  });

  it('returns synced record and checkout state as json', async () => {
    const { command, capture } = createHarness();
    await run(command, ['.oat/projects/synced/demo'], ['--json']);
    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'ok',
      projectPath: '.oat/projects/synced/demo',
      scope: 'synced',
      ref: 'refs/oat/projects/demo',
      record: { slug: 'demo' },
      checkout: 'present',
    });
  });

  it('returns n/a checkout state for shared projects', async () => {
    const { command, capture } = createHarness();
    await run(command, ['.oat/projects/shared/demo'], ['--json']);
    expect(capture.jsonPayloads[0]).toMatchObject({
      scope: 'shared',
      checkout: 'n/a',
    });
    expect(capture.jsonPayloads[0]).not.toHaveProperty('ref');
  });

  it('rejects archived projects because archive is not a scope', async () => {
    const { command, capture } = createHarness();
    await run(command, ['.oat/projects/archived/demo']);
    expect(capture.error[0]).toContain('Archived projects have no');
    expect(process.exitCode).toBe(1);
  });

  it.each([
    {
      error: new CliError('invalid scope input', 1),
      exitCode: 1,
      globals: [] as string[],
    },
    {
      error: new CliError('scope storage unavailable', 2),
      exitCode: 2,
      globals: ['--json'],
    },
    {
      error: new Error('unknown scope filesystem failure'),
      exitCode: 2,
      globals: ['--json'],
    },
  ])(
    'classifies command failure $exitCode',
    async ({ error, exitCode, globals }) => {
      const { command, capture } = createHarness(undefined, error);

      await run(command, [], globals);

      const output = globals.includes('--json')
        ? JSON.stringify(capture.jsonPayloads[0])
        : capture.error.join('\n');
      expect(output).toContain(error.message);
      expect(process.exitCode).toBe(exitCode);
    },
  );
});
