import { execFileSync } from 'node:child_process';
import { symlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { CommandContext, GlobalOptions } from '@app/command-context';
import { createLoggerCapture } from '@commands/__tests__/helpers';
import { scaffoldProject } from '@commands/project/new/scaffold';
import { defaultGitRunner, type GitRunner } from '@commands/project/sync/git';
import {
  buildSyncTarget,
  createSyncedProject,
  pullSynced as pullSyncedReal,
  pushSynced,
} from '@commands/project/sync/ref-sync';
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

  it('does not pull when an explicit descendant target is rejected', async () => {
    const setup = harness('created');
    setup.resolveTarget.mockRejectedValueOnce(
      new CliError(
        'Project path must identify exactly one direct child of the synced project root',
        1,
      ),
    );

    await run(setup.command, ['.oat/projects/synced/demo/reviews']);

    expect(setup.pullSynced).not.toHaveBeenCalled();
    expect(process.exitCode).toBe(1);
  });

  it('rejects a bare-slug real-worktree alias before fetching for its sibling', async () => {
    const fixture = await createSyncedFixture();
    try {
      const sibling = buildSyncTarget(
        fixture.cloneA,
        '.oat/projects/shared',
        'reviews',
      );
      await createSyncedProject(sibling, defaultGitRunner);
      await writeFile(join(sibling.projectPath, 'state.md'), 'base\n', 'utf8');
      await pushSynced(sibling, defaultGitRunner, { message: 'base sibling' });
      await symlink(
        sibling.projectPath,
        join(fixture.cloneA, '.oat/projects/synced/demo'),
        'dir',
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
      const command = createProjectPullCommand({
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

      await run(command, ['demo']);

      expect(capture.error.join('\n')).toContain('canonical direct child');
      expect(gitCalls).toEqual([]);
      expect(
        execFileSync('git', ['-C', sibling.projectPath, 'rev-parse', 'HEAD'], {
          encoding: 'utf8',
        }).trim(),
      ).toBe(siblingHead);
      expect(process.exitCode).toBe(1);
    } finally {
      await fixture.cleanup();
    }
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
        conflicts: ['state.md'],
        exitCode: 1,
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
    expect(output).toContain('conflicts: state.md');
    expect(output).toContain("oat project pull 'conflicted-child' --continue");
    expect(output).toContain('Child missing-child missing');
    expect(output).toContain('remote ref is absent');
    expect(output).toContain("oat project pull 'missing-child'");
    expect(process.exitCode).toBe(1);
  });

  it.each([{ globals: [] as string[] }, { globals: ['--json'] }])(
    'reports child transport failures as exit 2 in human and JSON output',
    async ({ globals }) => {
      const setup = harness('updated');
      setup.pullChildren.mockResolvedValueOnce([
        {
          slug: 'offline-child',
          status: 'error',
          message: 'origin authentication failed',
          exitCode: 2,
        },
      ]);

      await run(setup.command, ['parent'], globals);

      const output = globals.includes('--json')
        ? JSON.stringify(setup.capture.jsonPayloads[0])
        : setup.capture.error.join('\n');
      expect(output).toContain('offline-child');
      expect(output).toContain('origin authentication failed');
      expect(process.exitCode).toBe(2);
    },
  );

  it('reports a real child conflict while committing the successful parent adoption', async () => {
    const fixture = await createSyncedFixture({ secondClone: true });
    try {
      const childA = buildSyncTarget(
        fixture.cloneA,
        '.oat/projects/shared',
        'child',
      );
      const childB = buildSyncTarget(
        fixture.cloneB!,
        '.oat/projects/shared',
        'child',
      );
      await createSyncedProject(childA, defaultGitRunner);
      await writeFile(join(childA.projectPath, 'state.md'), 'base\n', 'utf8');
      await pushSynced(childA, defaultGitRunner, { message: 'base child' });
      await pullSyncedReal(childB, defaultGitRunner);
      await writeFile(join(childB.projectPath, 'state.md'), 'local\n', 'utf8');
      execFileSync('git', ['-C', childB.projectPath, 'add', 'state.md']);
      execFileSync('git', [
        '-C',
        childB.projectPath,
        'commit',
        '-q',
        '-m',
        'local child',
      ]);
      await writeFile(join(childA.projectPath, 'state.md'), 'remote\n', 'utf8');
      await pushSynced(childA, defaultGitRunner, { message: 'remote child' });

      const parentA = buildSyncTarget(
        fixture.cloneA,
        '.oat/projects/shared',
        'parent',
      );
      await createSyncedProject(parentA, defaultGitRunner);
      await writeFile(
        join(parentA.projectPath, 'state.md'),
        '---\noat_kind: coordination\noat_children:\n  - child\n---\n',
        'utf8',
      );
      await pushSynced(parentA, defaultGitRunner, { message: 'parent' });

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

      await run(command, ['parent']);

      expect(capture.error.join('\n')).toContain('Child child conflict');
      expect(capture.error.join('\n')).toContain('state.md');
      expect(process.exitCode).toBe(1);
      expect(
        execFileSync(
          'git',
          [
            '-C',
            fixture.cloneB!,
            'show',
            'HEAD:.oat/projects/synced/parent.json',
          ],
          { encoding: 'utf8' },
        ),
      ).toContain('"slug": "parent"');
    } finally {
      await fixture.cleanup();
    }
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

  it('retries a failed adoption record commit and preserves unrelated staged work', async () => {
    const fixture = await createSyncedFixture({ secondClone: true });
    try {
      const slug = 'pull-retry';
      await scaffoldProject({
        repoRoot: fixture.cloneA,
        projectName: slug,
        scope: 'synced',
        commit: false,
        refreshDashboard: false,
        setActive: false,
      });
      await writeFile(join(fixture.cloneB, 'unrelated.txt'), 'user work\n');
      execFileSync('git', ['add', 'unrelated.txt'], { cwd: fixture.cloneB });
      const firstCapture = createLoggerCapture();
      const first = createProjectPullCommand({
        buildCommandContext: (options: GlobalOptions): CommandContext => ({
          scope: 'project',
          dryRun: false,
          verbose: false,
          json: options.json ?? false,
          cwd: fixture.cloneB,
          home: '/home',
          interactive: false,
          logger: firstCapture.logger,
        }),
        resolveProjectRoot: async () => fixture.cloneB,
        commitRecordChange: async () => {
          throw new Error('injected first pull record commit failure');
        },
      });
      await run(first, [slug]);
      expect(process.exitCode).toBe(2);

      process.exitCode = undefined;
      const secondCapture = createLoggerCapture();
      const second = createProjectPullCommand({
        buildCommandContext: (options: GlobalOptions): CommandContext => ({
          scope: 'project',
          dryRun: false,
          verbose: false,
          json: options.json ?? false,
          cwd: fixture.cloneB,
          home: '/home',
          interactive: false,
          logger: secondCapture.logger,
        }),
        resolveProjectRoot: async () => fixture.cloneB,
      });
      await run(second, [slug], ['--json']);

      expect(process.exitCode).toBe(0);
      expect(secondCapture.jsonPayloads[0]).toMatchObject({ adopted: true });
      expect(
        execFileSync('git', ['show', '--format=', '--name-only', 'HEAD'], {
          cwd: fixture.cloneB,
          encoding: 'utf8',
        }).trim(),
      ).toBe(`.oat/projects/synced/${slug}.json`);
      expect(
        execFileSync(
          'git',
          ['status', '--porcelain=v1', '--untracked-files=all'],
          {
            cwd: fixture.cloneB,
            encoding: 'utf8',
          },
        ),
      ).toContain('A  unrelated.txt');
    } finally {
      await fixture.cleanup();
    }
  });

  it('leaves an adopted record pending under --no-commit and commits it on a normal retry', async () => {
    const fixture = await createSyncedFixture({ secondClone: true });
    try {
      const slug = 'pull-no-commit';
      await scaffoldProject({
        repoRoot: fixture.cloneA,
        projectName: slug,
        scope: 'synced',
        commit: false,
        refreshDashboard: false,
        setActive: false,
      });
      const first = createProjectPullCommand({
        buildCommandContext: (options: GlobalOptions): CommandContext => ({
          scope: 'project',
          dryRun: false,
          verbose: false,
          json: options.json ?? false,
          cwd: fixture.cloneB,
          home: '/home',
          interactive: false,
          logger: createLoggerCapture().logger,
        }),
        resolveProjectRoot: async () => fixture.cloneB,
      });
      await run(first, [slug, '--no-commit']);
      expect(process.exitCode).toBe(0);
      expect(
        execFileSync(
          'git',
          ['status', '--porcelain=v1', '--untracked-files=all'],
          {
            cwd: fixture.cloneB,
            encoding: 'utf8',
          },
        ),
      ).toContain(`?? .oat/projects/synced/${slug}.json`);

      process.exitCode = undefined;
      const second = createProjectPullCommand({
        buildCommandContext: (options: GlobalOptions): CommandContext => ({
          scope: 'project',
          dryRun: false,
          verbose: false,
          json: options.json ?? false,
          cwd: fixture.cloneB,
          home: '/home',
          interactive: false,
          logger: createLoggerCapture().logger,
        }),
        resolveProjectRoot: async () => fixture.cloneB,
      });
      await run(second, [slug]);
      expect(process.exitCode).toBe(0);
      expect(
        execFileSync(
          'git',
          [
            'ls-tree',
            '--name-only',
            'HEAD',
            `.oat/projects/synced/${slug}.json`,
          ],
          {
            cwd: fixture.cloneB,
            encoding: 'utf8',
          },
        ).trim(),
      ).toBe(`.oat/projects/synced/${slug}.json`);
    } finally {
      await fixture.cleanup();
    }
  });
});
