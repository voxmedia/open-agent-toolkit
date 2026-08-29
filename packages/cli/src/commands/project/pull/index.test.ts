import { execFileSync } from 'node:child_process';
import { readFile, symlink, writeFile } from 'node:fs/promises';
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
import { createSyncedFixture } from '@test-support/synced-fixture';
import { Command } from 'commander';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createProjectPullCommand } from './index';

function git(cwd: string, args: string[]): string {
  return execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
}

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
    adoptionRecord: 'durable' as const,
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

  it('finishes parent adoption and coordination children after continue', async () => {
    const setup = harness('updated');
    setup.resolveTarget.mockResolvedValueOnce({
      repoRoot: '/repo',
      slug: 'parent',
      projectPath: '/repo/.oat/projects/synced/parent',
      ref: 'refs/oat/projects/parent',
      remote: 'origin',
      adopt: false,
      adoptionRecord: 'create',
    });
    setup.continueSynced.mockResolvedValueOnce({
      status: 'updated',
      sha: '1234567890123456789012345678901234567890',
      adopted: true,
      pendingRecordPaths: ['/repo/.oat/projects/synced/parent.json'],
    });
    setup.pullChildren.mockResolvedValueOnce([
      {
        slug: 'child',
        status: 'created',
        sha: '1234567890123456789012345678901234567890',
        adopted: true,
        pendingRecordPaths: ['/repo/.oat/projects/synced/child.json'],
      },
    ]);

    await run(setup.command, ['parent', '--continue'], ['--json']);

    expect(setup.continueSynced).toHaveBeenCalledWith(
      expect.objectContaining({ slug: 'parent' }),
      expect.anything(),
      { adopt: true, adoptionRecord: 'create' },
    );
    expect(setup.pullChildren).toHaveBeenCalledOnce();
    expect(setup.commitRecordChange).toHaveBeenCalledWith(
      '/repo',
      [
        '/repo/.oat/projects/synced/parent.json',
        '/repo/.oat/projects/synced/child.json',
      ],
      'chore(oat): adopt synced projects parent, child',
      expect.anything(),
      {
        additionalAllowlistedPaths: [
          '/repo/.oat/projects/synced/parent.json',
          '/repo/.oat/projects/synced/child.json',
        ],
      },
    );
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
      {
        additionalAllowlistedPaths: [
          '/repo/.oat/projects/synced/parent.json',
          '/repo/.oat/projects/synced/a.json',
        ],
      },
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

  it('commits an adoption record after resolving an origin-only pull conflict', async () => {
    const fixture = await createSyncedFixture({ secondClone: true });
    try {
      const slug = 'adopt-after-continue';
      const targetA = buildSyncTarget(
        fixture.cloneA,
        '.oat/projects/shared',
        slug,
      );
      const targetB = buildSyncTarget(
        fixture.cloneB!,
        '.oat/projects/shared',
        slug,
      );
      await createSyncedProject(targetA, defaultGitRunner);
      await writeFile(join(targetA.projectPath, 'state.md'), 'base\n');
      await pushSynced(targetA, defaultGitRunner, { message: 'base' });
      await pullSyncedReal(targetB, defaultGitRunner);
      await writeFile(join(targetB.projectPath, 'state.md'), 'local\n');
      execFileSync('git', ['add', 'state.md'], { cwd: targetB.projectPath });
      execFileSync('git', ['commit', '-m', 'local state'], {
        cwd: targetB.projectPath,
      });
      await writeFile(join(targetA.projectPath, 'state.md'), 'remote\n');
      await pushSynced(targetA, defaultGitRunner, { message: 'remote state' });

      const command = createProjectPullCommand({
        buildCommandContext: (options: GlobalOptions): CommandContext => ({
          scope: 'project',
          dryRun: false,
          verbose: false,
          json: options.json ?? false,
          cwd: fixture.cloneB!,
          home: '/home',
          interactive: false,
          logger: createLoggerCapture().logger,
        }),
        resolveProjectRoot: async () => fixture.cloneB!,
      });
      await run(command, [slug]);
      expect(process.exitCode).toBe(1);

      const recordPath = `.oat/projects/synced/${slug}.json`;
      expect(git(fixture.cloneB!, ['ls-files', recordPath])).toBe('');
      await writeFile(join(targetB.projectPath, 'state.md'), 'resolved\n');
      execFileSync('git', ['add', 'state.md'], { cwd: targetB.projectPath });
      process.exitCode = undefined;
      const continued = createProjectPullCommand({
        buildCommandContext: (options: GlobalOptions): CommandContext => ({
          scope: 'project',
          dryRun: false,
          verbose: false,
          json: options.json ?? false,
          cwd: fixture.cloneB!,
          home: '/home',
          interactive: false,
          logger: createLoggerCapture().logger,
        }),
        resolveProjectRoot: async () => fixture.cloneB!,
      });
      await run(continued, [slug, '--continue']);

      expect(process.exitCode).toBe(0);
      expect(
        git(fixture.cloneB!, ['ls-tree', '--name-only', 'HEAD', recordPath]),
      ).toBe(recordPath);
      expect(
        JSON.parse(git(fixture.cloneB!, ['show', `HEAD:${recordPath}`])),
      ).toMatchObject({ slug, status: 'active' });
    } finally {
      await fixture.cleanup();
    }
  });

  it('materializes coordination children after resolving a parent conflict', async () => {
    const fixture = await createSyncedFixture({ secondClone: true });
    try {
      const child = buildSyncTarget(
        fixture.cloneA,
        '.oat/projects/shared',
        'continued-child',
      );
      await createSyncedProject(child, defaultGitRunner);
      await writeFile(join(child.projectPath, 'state.md'), '# child\n');
      await pushSynced(child, defaultGitRunner, { message: 'child' });

      const parentA = buildSyncTarget(
        fixture.cloneA,
        '.oat/projects/shared',
        'continued-parent',
      );
      const parentB = buildSyncTarget(
        fixture.cloneB!,
        '.oat/projects/shared',
        'continued-parent',
      );
      const coordinationState =
        '---\noat_kind: coordination\noat_children:\n  - continued-child\n---\n';
      await createSyncedProject(parentA, defaultGitRunner);
      await writeFile(join(parentA.projectPath, 'state.md'), coordinationState);
      await pushSynced(parentA, defaultGitRunner, { message: 'parent base' });
      await pullSyncedReal(parentB, defaultGitRunner);
      await writeFile(
        join(parentB.projectPath, 'state.md'),
        `${coordinationState}local\n`,
      );
      execFileSync('git', ['add', 'state.md'], { cwd: parentB.projectPath });
      execFileSync('git', ['commit', '-m', 'parent local'], {
        cwd: parentB.projectPath,
      });
      await writeFile(
        join(parentA.projectPath, 'state.md'),
        `${coordinationState}remote\n`,
      );
      await pushSynced(parentA, defaultGitRunner, { message: 'parent remote' });

      const buildCommand = () =>
        createProjectPullCommand({
          buildCommandContext: (options: GlobalOptions): CommandContext => ({
            scope: 'project',
            dryRun: false,
            verbose: false,
            json: options.json ?? false,
            cwd: fixture.cloneB!,
            home: '/home',
            interactive: false,
            logger: createLoggerCapture().logger,
          }),
          resolveProjectRoot: async () => fixture.cloneB!,
        });
      await run(buildCommand(), ['continued-parent']);
      expect(process.exitCode).toBe(1);

      await writeFile(
        join(parentB.projectPath, 'state.md'),
        `${coordinationState}resolved\n`,
      );
      execFileSync('git', ['add', 'state.md'], { cwd: parentB.projectPath });
      process.exitCode = undefined;
      await run(buildCommand(), ['continued-parent', '--continue']);

      expect(process.exitCode).toBe(0);
      await expect(
        readFile(
          join(
            fixture.cloneB!,
            '.oat/projects/synced/continued-child/state.md',
          ),
          'utf8',
        ),
      ).resolves.toBe('# child\n');
      for (const slug of ['continued-parent', 'continued-child']) {
        const recordPath = `.oat/projects/synced/${slug}.json`;
        expect(
          git(fixture.cloneB!, ['ls-tree', '--name-only', 'HEAD', recordPath]),
        ).toBe(recordPath);
      }
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

  it('adopts an origin-only ref under a relative custom root and keeps the parent clean', async () => {
    const fixture = await createSyncedFixture({ secondClone: true });
    try {
      const projectsRoot = '.oat/custom-pull/team';
      const slug = 'custom-pull-adoption';
      const source = buildSyncTarget(fixture.cloneA, projectsRoot, slug);
      await createSyncedProject(source, defaultGitRunner);
      await writeFile(join(source.projectPath, 'state.md'), '# custom pull\n');
      await pushSynced(source, defaultGitRunner, {
        message: 'seed custom pull project',
      });
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
        processEnv: { OAT_PROJECTS_ROOT: projectsRoot },
      });

      await run(command, [slug], ['--json']);

      expect(capture.jsonPayloads[0]).toMatchObject({
        status: 'created',
        adopted: true,
      });
      const recordRelative = `.oat/custom-pull/synced/${slug}.json`;
      expect(
        execFileSync('git', ['show', '--format=', '--name-only', 'HEAD'], {
          cwd: fixture.cloneB!,
          encoding: 'utf8',
        })
          .trim()
          .split('\n')
          .sort(),
      ).toEqual(['.gitignore', recordRelative]);
      expect(
        execFileSync('git', ['status', '--porcelain=v1'], {
          cwd: fixture.cloneB!,
          encoding: 'utf8',
        }).trim(),
      ).toBe('');
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

  it('rejects an ignored untracked adoption record until the exact record is durable', async () => {
    const fixture = await createSyncedFixture({ secondClone: true });
    try {
      const slug = 'pull-ignored-retry';
      const recordRelativePath = `.oat/projects/synced/${slug}.json`;
      await scaffoldProject({
        repoRoot: fixture.cloneA,
        projectName: slug,
        scope: 'synced',
        commit: false,
        refreshDashboard: false,
        setActive: false,
      });
      const excludePath = execFileSync(
        'git',
        ['rev-parse', '--path-format=absolute', '--git-path', 'info/exclude'],
        { cwd: fixture.cloneB, encoding: 'utf8' },
      ).trim();
      const originalExclude = await readFile(excludePath, 'utf8');
      await writeFile(
        excludePath,
        `${originalExclude}\n${recordRelativePath}\n`,
      );

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
        commitRecordChange: async () => {
          throw new Error('injected ignored pull record commit failure');
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
      await run(second, [slug]);
      expect(process.exitCode).toBe(2);
      expect(secondCapture.error.join('\n')).toContain(recordRelativePath);
      expect(
        execFileSync(
          'git',
          ['ls-tree', '--name-only', 'HEAD', recordRelativePath],
          {
            cwd: fixture.cloneB,
            encoding: 'utf8',
          },
        ).trim(),
      ).toBe('');

      await writeFile(excludePath, originalExclude);
      process.exitCode = undefined;
      const third = createProjectPullCommand({
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
      await run(third, [slug]);
      expect(process.exitCode).toBe(0);
      expect(
        execFileSync(
          'git',
          ['ls-tree', '--name-only', 'HEAD', recordRelativePath],
          {
            cwd: fixture.cloneB,
            encoding: 'utf8',
          },
        ).trim(),
      ).toBe(recordRelativePath);
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
