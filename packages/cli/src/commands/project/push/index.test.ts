import type { CommandContext, GlobalOptions } from '@app/command-context';
import { createLoggerCapture } from '@commands/__tests__/helpers';
import { CliError } from '@errors/cli-error';
import { Command } from 'commander';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createProjectPushCommand } from './index';

function harness(status: 'pushed' | 'up-to-date' | 'rejected' | 'conflict') {
  const capture = createLoggerCapture();
  const pushSynced = vi.fn(async () => ({
    status,
    sha: '1234567890123456789012345678901234567890',
    ...(status === 'conflict' ? { conflicts: ['state.md'] } : {}),
  }));
  const resolveTarget = vi.fn(async () => ({
    repoRoot: '/repo',
    slug: 'demo',
    projectPath: '/repo/.oat/projects/synced/demo',
    ref: 'refs/oat/projects/demo',
    remote: 'origin',
  }));
  const command = createProjectPushCommand({
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
    pushSynced,
    gitRunner: { run: vi.fn() },
    processEnv: {},
  });
  return { command, capture, pushSynced, resolveTarget };
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
  await program.parseAsync([...globals, 'project', 'push', ...args], {
    from: 'user',
  });
}

describe('createProjectPushCommand', () => {
  let previousExitCode: number | undefined;
  beforeEach(() => {
    previousExitCode = process.exitCode;
    process.exitCode = undefined;
  });
  afterEach(() => {
    process.exitCode = previousExitCode;
  });

  it('resolves the target and forwards the message', async () => {
    const { command, pushSynced, resolveTarget } = harness('pushed');
    await run(command, ['demo', '--message', 'update artifacts']);
    expect(resolveTarget).toHaveBeenCalledWith(
      { repoRoot: '/repo', env: {} },
      'demo',
    );
    expect(pushSynced).toHaveBeenCalledWith(
      expect.objectContaining({ slug: 'demo' }),
      expect.anything(),
      { message: 'update artifacts' },
    );
    expect(process.exitCode).toBe(0);
  });

  it('uses normal pull then push guidance for a rejection', async () => {
    const { command, capture } = harness('rejected');
    await run(command, ['demo']);
    expect(capture.error[0]).toContain("oat project pull 'demo'");
    expect(capture.error[0]).not.toContain('--continue');
    expect(capture.error[0]).toContain("oat project push 'demo'");
    expect(process.exitCode).toBe(1);
  });

  it('uses continue and abort guidance only for a conflict', async () => {
    const { command, capture } = harness('conflict');
    await run(command, ['demo']);
    expect(capture.error[0]).toContain("oat project pull 'demo' --continue");
    expect(capture.error[0]).toContain("oat project pull 'demo' --abort");
    expect(capture.error[0]).toContain('state.md');
    expect(process.exitCode).toBe(1);
  });

  it('preserves injected system exit codes and JSON diagnostics', async () => {
    const { command, capture, resolveTarget } = harness('pushed');
    resolveTarget.mockRejectedValueOnce(
      new CliError('origin authentication failed', 2),
    );

    await run(command, ['demo'], ['--json']);

    expect(capture.jsonPayloads[0]).toEqual({
      status: 'error',
      message: 'origin authentication failed',
    });
    expect(process.exitCode).toBe(2);
  });

  it('does not push when an explicit descendant target is rejected', async () => {
    const { command, pushSynced, resolveTarget } = harness('pushed');
    resolveTarget.mockRejectedValueOnce(
      new CliError(
        'Project path must identify exactly one direct child of the synced project root',
        1,
      ),
    );

    await run(command, ['.oat/projects/synced/demo/reviews']);

    expect(pushSynced).not.toHaveBeenCalled();
    expect(process.exitCode).toBe(1);
  });

  it('emits the stable json envelope', async () => {
    const { command, capture } = harness('pushed');
    await run(command, ['demo', '--no-refresh-pr'], ['--json']);
    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'pushed',
      sha: '1234567890123456789012345678901234567890',
      ref: 'refs/oat/projects/demo',
    });
    expect(capture.jsonPayloads[0]).toHaveProperty('prRefresh', undefined);
  });
});
