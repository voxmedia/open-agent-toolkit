import type { CommandContext, GlobalOptions } from '@app/command-context';
import { createLoggerCapture } from '@commands/__tests__/helpers';
import { Command } from 'commander';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createProjectPullCommand } from './index';

function harness(
  status: 'created' | 'updated' | 'up-to-date' | 'conflict' | 'dirty',
) {
  const capture = createLoggerCapture();
  const result = {
    status,
    sha: '1234567890123456789012345678901234567890',
    ...(status === 'conflict' ? { conflicts: ['state.md', 'plan.md'] } : {}),
  };
  const pullSynced = vi.fn(async () => result);
  const continueSynced = vi.fn(async () => result);
  const abortSynced = vi.fn(async () => undefined);
  const resolveTarget = vi.fn(async () => ({
    repoRoot: '/repo',
    slug: 'demo',
    projectPath: '/repo/.oat/projects/synced/demo',
    ref: 'refs/oat/projects/demo',
    remote: 'origin',
  }));
  const command = createProjectPullCommand({
    buildCommandContext: (options: GlobalOptions): CommandContext => ({
      scope: 'project',
      dryRun: false,
      verbose: false,
      json: options.json ?? false,
      cwd: '/repo',
      home: '/home',
      interactive: false,
      logger: capture.logger,
    }),
    resolveProjectRoot: async () => '/repo',
    resolveSyncedTarget: resolveTarget,
    pullSynced,
    continueSynced,
    abortSynced,
    gitRunner: { run: vi.fn() },
    processEnv: {},
  });
  return {
    command,
    capture,
    resolveTarget,
    pullSynced,
    continueSynced,
    abortSynced,
  };
}

async function run(
  command: Command,
  args: string[],
  globals: string[] = [],
): Promise<void> {
  const program = new Command().name('oat').option('--json').exitOverride();
  const project = new Command('project');
  project.addCommand(command);
  program.addCommand(project);
  await program.parseAsync([...globals, 'project', 'pull', ...args], {
    from: 'user',
  });
}

describe('createProjectPullCommand', () => {
  let previousExitCode: number | undefined;
  beforeEach(() => {
    previousExitCode = process.exitCode;
    process.exitCode = undefined;
  });
  afterEach(() => {
    process.exitCode = previousExitCode;
  });

  it('resolves absent checkouts from records and pulls them', async () => {
    const { command, resolveTarget, pullSynced } = harness('created');
    await run(command, ['demo']);
    expect(resolveTarget).toHaveBeenCalledWith(
      { repoRoot: '/repo', env: {} },
      'demo',
      {},
      { allowMissingCheckout: true },
    );
    expect(pullSynced).toHaveBeenCalledOnce();
    expect(process.exitCode).toBe(0);
  });

  it('routes continue and abort recovery actions', async () => {
    const continued = harness('updated');
    await run(continued.command, ['demo', '--continue']);
    expect(continued.continueSynced).toHaveBeenCalledOnce();
    expect(process.exitCode).toBe(0);

    const aborted = harness('updated');
    await run(aborted.command, ['demo', '--abort']);
    expect(aborted.abortSynced).toHaveBeenCalledOnce();
    expect(process.exitCode).toBe(0);
  });

  it('rejects continue and abort together', async () => {
    const { command, capture } = harness('updated');
    await run(command, ['demo', '--continue', '--abort']);
    expect(capture.error[0]).toContain('mutually exclusive');
    expect(process.exitCode).toBe(1);
  });

  it.each(['conflict', 'dirty'] as const)(
    'prints target-preserving recovery commands for %s',
    async (status) => {
      const { command, capture } = harness(status);
      await run(command, ['other-project']);
      expect(capture.error[0]).toContain(
        "oat project pull 'other-project' --continue",
      );
      expect(capture.error[0]).toContain(
        "oat project pull 'other-project' --abort",
      );
      if (status === 'conflict') {
        expect(capture.error[0]).toContain('state.md');
      }
      expect(process.exitCode).toBe(1);
    },
  );

  it('emits the json envelope', async () => {
    const { command, capture } = harness('up-to-date');
    await run(command, ['demo'], ['--json']);
    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'up-to-date',
      sha: '1234567890123456789012345678901234567890',
      ref: 'refs/oat/projects/demo',
    });
  });
});
