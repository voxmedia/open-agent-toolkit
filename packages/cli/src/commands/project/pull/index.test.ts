import { execFileSync } from 'node:child_process';

import type { CommandContext, GlobalOptions } from '@app/command-context';
import { createLoggerCapture } from '@commands/__tests__/helpers';
import { scaffoldProject } from '@commands/project/new/scaffold';
import { CliError } from '@errors/cli-error';
import { createSyncedFixture } from '@shared/../__tests__/synced-fixture';
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
  const pullChildren = vi.fn(async () => []);
  const commitRecordChange = vi.fn(async () => null);
  const resolveTarget = vi.fn(async () => ({
    repoRoot: '/repo',
    slug: 'demo',
    projectPath: '/repo/.oat/projects/synced/demo',
    ref: 'refs/oat/projects/demo',
    remote: 'origin',
    adopt: false,
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
    pullChildren,
    commitRecordChange,
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
    pullChildren,
    commitRecordChange,
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

  it('prints continue and abort recovery commands for a conflict', async () => {
    const { command, capture } = harness('conflict');
    await run(command, ['other-project']);
    expect(capture.error[0]).toContain(
      "oat project pull 'other-project' --continue",
    );
    expect(capture.error[0]).toContain(
      "oat project pull 'other-project' --abort",
    );
    expect(capture.error[0]).toContain('state.md');
    expect(process.exitCode).toBe(1);
  });

  it('prints push or stash/clean guidance for a dirty checkout', async () => {
    const { command, capture } = harness('dirty');
    await run(command, ['other-project']);
    expect(capture.error[0]).toContain("oat project push 'other-project'");
    expect(capture.error[0]).toContain('stash/clean');
    expect(capture.error[0]).not.toContain('--continue');
    expect(capture.error[0]).not.toContain('--abort');
    expect(process.exitCode).toBe(1);
  });

  it('preserves injected system exit codes and JSON diagnostics', async () => {
    const { command, capture, resolveTarget } = harness('created');
    resolveTarget.mockRejectedValueOnce(
      new CliError('origin DNS lookup failed', 2),
    );

    await run(command, ['demo'], ['--json']);

    expect(capture.jsonPayloads[0]).toEqual({
      status: 'error',
      message: 'origin DNS lookup failed',
    });
    expect(process.exitCode).toBe(2);
  });

  it('emits the json envelope', async () => {
    const { command, capture } = harness('up-to-date');
    await run(command, ['demo'], ['--json']);
    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'up-to-date',
      sha: '1234567890123456789012345678901234567890',
      ref: 'refs/oat/projects/demo',
    });
  });

  it('commits successful parent and child adoptions once despite a missing child', async () => {
    const setup = harness('created');
    setup.resolveTarget.mockResolvedValueOnce({
      repoRoot: '/repo',
      slug: 'parent',
      projectPath: '/repo/.oat/projects/synced/parent',
      ref: 'refs/oat/projects/parent',
      remote: 'origin',
      adopt: true,
    });
    setup.pullSynced.mockResolvedValueOnce({
      status: 'created',
      sha: '1234567890123456789012345678901234567890',
      adopted: true,
      pendingRecordPaths: ['/repo/.oat/projects/synced/parent.json'],
    });
    setup.pullChildren.mockResolvedValueOnce([
      {
        slug: 'a',
        status: 'created',
        sha: '1234567890123456789012345678901234567890',
        adopted: true,
        pendingRecordPaths: ['/repo/.oat/projects/synced/a.json'],
      },
      { slug: 'b', status: 'missing', message: 'missing ref' },
    ]);

    await run(setup.command, ['parent'], ['--json']);

    expect(setup.commitRecordChange).toHaveBeenCalledOnce();
    expect(setup.commitRecordChange).toHaveBeenCalledWith(
      '/repo',
      [
        '/repo/.oat/projects/synced/parent.json',
        '/repo/.oat/projects/synced/a.json',
      ],
      'chore(oat): adopt synced projects parent, a',
      expect.anything(),
    );
    expect(setup.capture.jsonPayloads[0]).toMatchObject({
      adopted: true,
      children: [
        expect.objectContaining({ slug: 'a', adopted: true }),
        expect.objectContaining({ slug: 'b', status: 'missing' }),
      ],
    });
    expect(process.exitCode).toBe(1);
  });

  it('reports each failed coordination child with a targeted human retry', async () => {
    const setup = harness('updated');
    setup.pullChildren.mockResolvedValueOnce([
      {
        slug: 'conflicted-child',
        status: 'conflict',
        message: 'state.md is unmerged',
      },
      {
        slug: 'missing-child',
        status: 'missing',
        message: 'remote ref is absent',
      },
    ]);

    await run(setup.command, ['parent']);

    const output = setup.capture.error.join('\n');
    expect(output).toContain('Child conflicted-child conflict');
    expect(output).toContain('state.md is unmerged');
    expect(output).toContain("oat project pull 'conflicted-child' --continue");
    expect(output).toContain('Child missing-child missing');
    expect(output).toContain('remote ref is absent');
    expect(output).toContain("oat project pull 'missing-child'");
    expect(process.exitCode).toBe(1);
  });

  it('adopts an origin-only ref without rewriting it and is idempotent', async () => {
    const fixture = await createSyncedFixture({ secondClone: true });
    try {
      await scaffoldProject({
        repoRoot: fixture.cloneA,
        projectName: 'adopt-me',
        scope: 'synced',
        commit: false,
        refreshDashboard: false,
        setActive: false,
      });
      const originBefore = execFileSync(
        'git',
        ['rev-parse', 'refs/oat/projects/adopt-me'],
        { cwd: fixture.originDir, encoding: 'utf8' },
      ).trim();

      const capture = createLoggerCapture();
      const command = createProjectPullCommand({
        buildCommandContext: (options: GlobalOptions): CommandContext => ({
          scope: 'project',
          dryRun: false,
          verbose: false,
          json: options.json ?? false,
          cwd: fixture.cloneB!,
          home: '/home',
          interactive: false,
          logger: capture.logger,
        }),
        resolveProjectRoot: async () => fixture.cloneB!,
      });
      await run(command, ['adopt-me'], ['--json']);
      expect(capture.jsonPayloads[0]).toMatchObject({
        status: 'created',
        adopted: true,
      });
      expect(
        execFileSync(
          'git',
          [
            'ls-tree',
            '--name-only',
            'HEAD',
            '.oat/projects/synced/adopt-me.json',
          ],
          { cwd: fixture.cloneB, encoding: 'utf8' },
        ).trim(),
      ).toBe('.oat/projects/synced/adopt-me.json');
      expect(
        execFileSync('git', ['rev-parse', 'refs/oat/projects/adopt-me'], {
          cwd: fixture.originDir,
          encoding: 'utf8',
        }).trim(),
      ).toBe(originBefore);

      const secondCapture = createLoggerCapture();
      const second = createProjectPullCommand({
        buildCommandContext: (options: GlobalOptions): CommandContext => ({
          scope: 'project',
          dryRun: false,
          verbose: false,
          json: options.json ?? false,
          cwd: fixture.cloneB!,
          home: '/home',
          interactive: false,
          logger: secondCapture.logger,
        }),
        resolveProjectRoot: async () => fixture.cloneB!,
      });
      await run(second, ['adopt-me'], ['--json']);
      expect(secondCapture.jsonPayloads[0]).toMatchObject({
        status: 'up-to-date',
        adopted: false,
      });
    } finally {
      await fixture.cleanup();
    }
  });
});
