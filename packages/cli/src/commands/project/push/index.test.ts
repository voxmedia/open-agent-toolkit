import { execFileSync } from 'node:child_process';
import { symlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { CommandContext, GlobalOptions } from '@app/command-context';
import { createLoggerCapture } from '@commands/__tests__/helpers';
import { defaultGitRunner, type GitRunner } from '@commands/project/sync/git';
import {
  buildSyncTarget,
  createSyncedProject,
  pushSynced as pushSyncedReal,
} from '@commands/project/sync/ref-sync';
import { CliError } from '@errors/cli-error';
import { createSyncedFixture } from '@shared/../__tests__/synced-fixture';
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
  const refreshPrLinks = vi.fn(async () => 'refreshed' as const);
  const readFile = vi.fn(async () =>
    [
      '---',
      'oat_pr_status: open',
      'oat_pr_url: https://github.com/o/r/pull/1',
      '---',
      '',
    ].join('\n'),
  );
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
    refreshPrLinks,
    readFile,
    processEnv: {},
  });
  return {
    command,
    capture,
    pushSynced,
    resolveTarget,
    refreshPrLinks,
    readFile,
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

  it('rejects an explicit real-worktree alias before staging its sibling', async () => {
    const fixture = await createSyncedFixture();
    try {
      const sibling = buildSyncTarget(
        fixture.cloneA,
        '.oat/projects/shared',
        'reviews',
      );
      await createSyncedProject(sibling, defaultGitRunner);
      await writeFile(join(sibling.projectPath, 'state.md'), 'base\n', 'utf8');
      await pushSyncedReal(sibling, defaultGitRunner, {
        message: 'base sibling',
      });
      await symlink(
        sibling.projectPath,
        join(fixture.cloneA, '.oat/projects/synced/demo'),
        'dir',
      );
      await writeFile(
        join(sibling.projectPath, 'pending.md'),
        'must remain uncommitted\n',
        'utf8',
      );
      const siblingHead = execFileSync(
        'git',
        ['-C', sibling.projectPath, 'rev-parse', 'HEAD'],
        { encoding: 'utf8' },
      ).trim();
      const capture = createLoggerCapture();
      const gitCalls: string[][] = [];
      const gitRunner: GitRunner = {
        async run(args, options) {
          gitCalls.push([...args]);
          return defaultGitRunner.run(args, options);
        },
      };
      const command = createProjectPushCommand({
        buildCommandContext: (options: GlobalOptions): CommandContext => ({
          scope: 'project',
          dryRun: false,
          verbose: false,
          json: options.json ?? false,
          cwd: fixture.cloneA,
          home: '/home',
          interactive: false,
          logger: capture.logger,
        }),
        resolveProjectRoot: async () => fixture.cloneA,
        gitRunner,
        processEnv: {},
      });

      await run(command, ['.oat/projects/synced/demo']);

      expect(capture.error.join('\n')).toContain('canonical direct child');
      expect(gitCalls).toEqual([]);
      expect(
        execFileSync('git', ['-C', sibling.projectPath, 'rev-parse', 'HEAD'], {
          encoding: 'utf8',
        }).trim(),
      ).toBe(siblingHead);
      expect(
        execFileSync(
          'git',
          ['-C', sibling.projectPath, 'status', '--porcelain'],
          { encoding: 'utf8' },
        ),
      ).toContain('?? pending.md');
      expect(process.exitCode).toBe(1);
    } finally {
      await fixture.cleanup();
    }
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

  it('refreshes an open PR after a successful push', async () => {
    const { command, refreshPrLinks, capture } = harness('pushed');
    await run(command, ['demo'], ['--json']);
    expect(refreshPrLinks).toHaveBeenCalledWith(
      expect.objectContaining({ slug: 'demo' }),
      'https://github.com/o/r/pull/1',
      expect.objectContaining({ warn: expect.any(Function) }),
    );
    expect(capture.jsonPayloads[0]).toMatchObject({ prRefresh: 'refreshed' });
  });

  it('skips refresh when disabled or the PR is not open', async () => {
    const disabled = harness('pushed');
    await run(disabled.command, ['demo', '--no-refresh-pr']);
    expect(disabled.refreshPrLinks).not.toHaveBeenCalled();

    const closed = harness('pushed');
    closed.readFile.mockResolvedValueOnce(
      '---\noat_pr_status: closed\noat_pr_url: https://github.com/o/r/pull/1\n---\n',
    );
    await run(closed.command, ['demo']);
    expect(closed.refreshPrLinks).not.toHaveBeenCalled();
  });

  it('does not change push success when refresh fails', async () => {
    const setup = harness('pushed');
    setup.refreshPrLinks.mockResolvedValueOnce('failed');
    await run(setup.command, ['demo']);
    expect(process.exitCode).toBe(0);
  });

  it.each([
    ['link computation', new Error('could not read synced ref')],
    ['body-file cleanup', new Error('could not remove temporary body file')],
  ])(
    'preserves push success when %s throws during PR refresh',
    async (_failurePoint, failure) => {
      const setup = harness('pushed');
      setup.refreshPrLinks.mockRejectedValueOnce(failure);

      await run(setup.command, ['demo'], ['--json']);

      expect(setup.pushSynced).toHaveBeenCalledOnce();
      expect(setup.refreshPrLinks).toHaveBeenCalledOnce();
      expect(setup.capture.warn).toEqual([
        expect.stringContaining(failure.message),
      ]);
      expect(setup.capture.error).toEqual([]);
      expect(setup.capture.jsonPayloads).toEqual([
        expect.objectContaining({
          status: 'pushed',
          sha: '1234567890123456789012345678901234567890',
          ref: 'refs/oat/projects/demo',
          prRefresh: 'failed',
        }),
      ]);
      expect(process.exitCode).toBe(0);
    },
  );
});
