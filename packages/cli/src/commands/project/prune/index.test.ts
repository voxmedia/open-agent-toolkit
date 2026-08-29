import { execFileSync } from 'node:child_process';
import { access, mkdir, readFile, realpath, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { CommandContext, GlobalOptions } from '@app/command-context';
import { createLoggerCapture } from '@commands/__tests__/helpers';
import { defaultGitRunner } from '@commands/project/sync/git';
import {
  buildSyncedRecord,
  writeSyncedRecord,
} from '@commands/project/sync/record';
import {
  buildSyncTarget,
  createSyncedProject,
  preflightSyncedCheckout,
  pruneSynced,
  pullSynced,
  pushSynced,
} from '@commands/project/sync/ref-sync';
import { syncedRecordPath } from '@commands/shared/project-scope';
import {
  addLinkedWorktree,
  createSyncedFixture,
} from '@test-support/synced-fixture';
import { Command } from 'commander';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createProjectPruneCommand } from './index';

function harness(state: string) {
  const capture = createLoggerCapture();
  const target = {
    repoRoot: '/repo',
    sharedRoot: '/repo/.oat/projects/shared',
    syncedRoot: '/repo/.oat/projects/synced',
    projectPath: '/repo/.oat/projects/synced/demo',
    slug: 'demo',
    ref: 'refs/oat/projects/demo',
    remote: 'origin',
    adopt: false,
  };
  const pruneSyncedMock = vi.fn(async () => ({
    status: 'pruned' as const,
    lifecycleCommit: 'a'.repeat(40),
  }));
  const resolveSyncedTarget = vi.fn(async () => target);
  return {
    capture,
    pruneSynced: pruneSyncedMock,
    resolveSyncedTarget,
    command: createProjectPruneCommand({
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
      resolveSyncedTarget,
      pruneSynced: pruneSyncedMock,
      readProjectState: async () => state,
      gitRunner: { run: vi.fn() },
      processEnv: {},
    }),
  };
}

async function run(command: Command, args: string[]): Promise<void> {
  const program = new Command().name('oat').option('--json').exitOverride();
  const project = new Command('project');
  project.addCommand(command);
  program.addCommand(project);
  await program.parseAsync(['project', 'prune', ...args], { from: 'user' });
}

describe('createProjectPruneCommand', () => {
  let previousExitCode: number | undefined;
  beforeEach(() => {
    previousExitCode = process.exitCode;
    process.exitCode = undefined;
  });
  afterEach(() => {
    process.exitCode = previousExitCode;
  });

  it('refuses an open PR without --force', async () => {
    const setup = harness(
      '---\noat_pr_status: open\noat_pr_url: https://github.com/o/r/pull/1\n---\n',
    );
    await run(setup.command, ['demo']);
    expect(setup.pruneSynced).not.toHaveBeenCalled();
    expect(setup.capture.error[0]).toContain('--force');
    expect(setup.capture.error[0]).toContain('pinned links');
    expect(process.exitCode).toBe(1);
  });

  it('forces prune, warns about links, and forwards --no-commit', async () => {
    const setup = harness('---\noat_pr_status: open\n---\n');
    await run(setup.command, ['demo', '--force', '--no-commit']);
    expect(setup.pruneSynced).toHaveBeenCalledWith(
      expect.objectContaining({ slug: 'demo' }),
      expect.anything(),
      { force: true, commit: false },
    );
    expect(setup.capture.warn[0]).toContain('pinned links');
    expect(process.exitCode).toBe(0);
  });

  it('fails closed with recovery guidance for a malformed discovery record', async () => {
    const fixture = await createSyncedFixture();
    try {
      const syncedRoot = join(fixture.cloneA, '.oat', 'projects', 'synced');
      await mkdir(syncedRoot, { recursive: true });
      await writeFile(join(syncedRoot, 'demo.json'), '{ malformed\n', 'utf8');
      const capture = createLoggerCapture();
      const pruneSyncedMock = vi.fn();
      const command = createProjectPruneCommand({
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
        pruneSynced: pruneSyncedMock,
        processEnv: {},
      });

      await run(command, ['demo']);

      expect(capture.error[0]).toContain(
        `Invalid JSON in synced project record ${join(syncedRoot, 'demo.json')}`,
      );
      expect(capture.error[0]).toContain(
        'Restore this exact record from a trusted Git revision before retrying.',
      );
      expect(pruneSyncedMock).not.toHaveBeenCalled();
      expect(process.exitCode).toBe(1);
    } finally {
      await fixture.cleanup();
    }
  });
});

describe('prune command integration', () => {
  it('removes the checkout, refs, and record in one parent commit', async () => {
    const fixture = await createSyncedFixture();
    try {
      const target = buildSyncTarget(
        fixture.cloneA,
        '.oat/projects/shared',
        'prune-me',
      );
      await createSyncedProject(target, defaultGitRunner);
      await writeFile(
        join(target.projectPath, 'state.md'),
        '# state\n',
        'utf8',
      );
      await pushSynced(target, defaultGitRunner, {});
      const recordPath = syncedRecordPath(target.syncedRoot, target.slug);
      await writeSyncedRecord(
        recordPath,
        buildSyncedRecord('prune-me', new Date('2026-08-27T00:00:00Z')),
      );
      execFileSync('git', ['add', recordPath], { cwd: fixture.cloneA });
      execFileSync('git', ['commit', '-m', 'add prune record'], {
        cwd: fixture.cloneA,
      });

      const command = createProjectPruneCommand({
        buildCommandContext: (options: GlobalOptions): CommandContext => ({
          scope: 'project',
          dryRun: false,
          verbose: false,
          json: options.json ?? false,
          cwd: fixture.cloneA,
          home: '/home',
          interactive: false,
          logger: createLoggerCapture().logger,
        }),
        resolveProjectRoot: async () => fixture.cloneA,
        processEnv: {},
      });
      await run(command, ['prune-me', '--force']);

      expect(
        execFileSync('git', ['ls-remote', 'origin', target.ref], {
          cwd: fixture.cloneA,
          encoding: 'utf8',
        }).trim(),
      ).toBe('');
      expect(
        (
          await defaultGitRunner.run(['show-ref', '--verify', target.ref], {
            cwd: fixture.cloneA,
            allowFailure: true,
          })
        ).code,
      ).not.toBe(0);
      await expect(access(target.projectPath)).rejects.toThrow();
      await expect(access(recordPath)).rejects.toThrow();
      expect(
        execFileSync('git', ['show', '-1', '--format=%s', '--name-only'], {
          cwd: fixture.cloneA,
          encoding: 'utf8',
        }),
      ).toContain('chore(oat): prune synced project prune-me');
    } finally {
      await fixture.cleanup();
    }
  });

  it('retries an exact-path prune after the final record commit fails', async () => {
    const fixture = await createSyncedFixture();
    try {
      const target = buildSyncTarget(
        fixture.cloneA,
        '.oat/projects/shared',
        'retry-prune-commit',
      );
      await createSyncedProject(target, defaultGitRunner);
      await writeFile(join(target.projectPath, 'state.md'), '# state\n');
      await pushSynced(target, defaultGitRunner, {});
      const recordPath = syncedRecordPath(target.syncedRoot, target.slug);
      await writeSyncedRecord(
        recordPath,
        buildSyncedRecord(target.slug, new Date('2026-08-29T00:00:00Z')),
      );
      await writeFile(join(fixture.cloneA, 'unrelated.txt'), 'base\n');
      execFileSync('git', ['add', recordPath, 'unrelated.txt'], {
        cwd: fixture.cloneA,
      });
      execFileSync('git', ['commit', '-m', 'seed prune retry'], {
        cwd: fixture.cloneA,
      });
      await writeFile(join(fixture.cloneA, 'unrelated.txt'), 'staged\n');
      execFileSync('git', ['add', 'unrelated.txt'], { cwd: fixture.cloneA });
      await writeFile(join(fixture.cloneA, 'unrelated.txt'), 'working\n');

      const failingGit = {
        run: vi.fn(async (...args: Parameters<typeof defaultGitRunner.run>) => {
          if (args[0][0] === 'commit') {
            throw new Error('injected final prune commit failure');
          }
          return defaultGitRunner.run(...args);
        }),
      };
      await expect(
        pruneSynced(target, failingGit, { force: true, commit: true }),
      ).rejects.toThrow('injected final prune commit failure');
      expect(
        execFileSync(
          'git',
          [
            'diff',
            '--cached',
            '--diff-filter=D',
            '--name-only',
            '--',
            recordPath,
          ],
          { cwd: fixture.cloneA, encoding: 'utf8' },
        ).trim(),
      ).toBe('.oat/projects/synced/retry-prune-commit.json');

      const capture = createLoggerCapture();
      const command = createProjectPruneCommand({
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
        processEnv: {},
      });
      await run(command, [target.projectPath, '--force']);

      expect(capture.error).toEqual([]);
      expect(process.exitCode).toBe(0);
      expect(
        execFileSync(
          'git',
          ['status', '--porcelain=v1', '--', 'unrelated.txt'],
          {
            cwd: fixture.cloneA,
            encoding: 'utf8',
          },
        ).trim(),
      ).toBe('MM unrelated.txt');
      expect(
        execFileSync('git', ['show', '-1', '--format=%s', '--name-only'], {
          cwd: fixture.cloneA,
          encoding: 'utf8',
        }),
      ).toContain('chore(oat): prune synced project retry-prune-commit');
      expect(
        execFileSync('git', ['show', '-1', '--format=', '--name-only'], {
          cwd: fixture.cloneA,
          encoding: 'utf8',
        }).trim(),
      ).toBe('.oat/projects/synced/retry-prune-commit.json');
    } finally {
      await fixture.cleanup();
    }
  });

  it('prunes an environment-root project without leaving a half-pruned parent', async () => {
    const fixture = await createSyncedFixture();
    try {
      const projectsRoot = '.oat/custom-prune/team';
      const slug = 'custom-prune';
      await writeFile(
        join(fixture.cloneA, '.gitignore'),
        `${await readFile(join(fixture.cloneA, '.gitignore'), 'utf8')}/.oat/custom-prune/synced/*/\n`,
        'utf8',
      );
      execFileSync('git', ['add', '.gitignore'], { cwd: fixture.cloneA });
      execFileSync('git', ['commit', '-m', 'ignore custom prune root'], {
        cwd: fixture.cloneA,
      });
      const target = buildSyncTarget(fixture.cloneA, projectsRoot, slug);
      await createSyncedProject(target, defaultGitRunner);
      await writeFile(join(target.projectPath, 'state.md'), '# state\n');
      await pushSynced(target, defaultGitRunner, {});
      const recordPath = syncedRecordPath(target.syncedRoot, target.slug);
      await writeSyncedRecord(
        recordPath,
        buildSyncedRecord(slug, new Date('2026-08-29T00:00:00Z')),
      );
      execFileSync('git', ['add', recordPath], { cwd: fixture.cloneA });
      execFileSync('git', ['commit', '-m', 'add custom prune record'], {
        cwd: fixture.cloneA,
      });
      const capture = createLoggerCapture();
      const command = createProjectPruneCommand({
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
        processEnv: { OAT_PROJECTS_ROOT: projectsRoot },
      });

      await run(command, [slug, '--force']);

      expect(capture.error).toEqual([]);
      expect(process.exitCode).toBe(0);
      await expect(access(target.projectPath)).rejects.toThrow();
      await expect(access(recordPath)).rejects.toThrow();
      expect(
        execFileSync('git', ['status', '--porcelain=v1'], {
          cwd: fixture.cloneA,
          encoding: 'utf8',
        }).trim(),
      ).toBe('');
      expect(
        execFileSync('git', ['ls-remote', 'origin', target.ref], {
          cwd: fixture.cloneA,
          encoding: 'utf8',
        }).trim(),
      ).toBe('');
    } finally {
      await fixture.cleanup();
    }
  });

  it('preflights and removes every registered checkout for the slug', async () => {
    const fixture = await createSyncedFixture();
    try {
      const target = buildSyncTarget(
        fixture.cloneA,
        '.oat/projects/shared',
        'multi',
      );
      await createSyncedProject(target, defaultGitRunner);
      await writeFile(
        join(target.projectPath, 'state.md'),
        '# state\n',
        'utf8',
      );
      await pushSynced(target, defaultGitRunner, {});
      const linkedRoot = await addLinkedWorktree(fixture.cloneA, 'linked');
      const linkedTarget = buildSyncTarget(
        linkedRoot,
        '.oat/projects/shared',
        'multi',
      );
      await pullSynced(linkedTarget, defaultGitRunner, {});
      await writeFile(
        join(linkedTarget.projectPath, 'pending.md'),
        'dirty\n',
        'utf8',
      );

      await expect(
        pruneSynced(target, defaultGitRunner, {
          force: false,
          commit: false,
        }),
      ).rejects.toThrow(linkedTarget.projectPath);
      await expect(access(target.projectPath)).resolves.toBeUndefined();
      await expect(access(linkedTarget.projectPath)).resolves.toBeUndefined();

      await expect(
        pruneSynced(target, defaultGitRunner, {
          force: true,
          commit: false,
        }),
      ).resolves.toMatchObject({ status: 'pruned' });
      await expect(access(target.projectPath)).rejects.toThrow();
      await expect(access(linkedTarget.projectPath)).rejects.toThrow();
    } finally {
      await fixture.cleanup();
    }
  });

  it.each([false, true])(
    'leaves an unrelated suffix-matching worktree intact when force=%s',
    async (force) => {
      const fixture = await createSyncedFixture();
      try {
        const slug = `suffix-${force ? 'forced' : 'normal'}`;
        const target = buildSyncTarget(
          fixture.cloneA,
          '.oat/projects/shared',
          slug,
        );
        await createSyncedProject(target, defaultGitRunner);
        await writeFile(
          join(target.projectPath, 'state.md'),
          '# canonical state\n',
          'utf8',
        );
        await expect(
          pushSynced(target, defaultGitRunner, {}),
        ).resolves.toMatchObject({ status: 'pushed' });

        const unrelatedPath = join(
          fixture.rootDir,
          'unrelated',
          'synced',
          slug,
        );
        await mkdir(join(fixture.rootDir, 'unrelated', 'synced'), {
          recursive: true,
        });
        execFileSync(
          'git',
          [
            'worktree',
            'add',
            '-q',
            '-b',
            `unrelated-${force ? 'forced' : 'normal'}`,
            unrelatedPath,
          ],
          { cwd: fixture.cloneA },
        );
        const sentinel = join(unrelatedPath, 'do-not-delete.txt');
        await writeFile(sentinel, 'unrelated worktree\n', 'utf8');

        await expect(
          preflightSyncedCheckout(target, defaultGitRunner),
        ).resolves.toMatchObject({ status: 'clean' });

        await expect(
          pruneSynced(target, defaultGitRunner, {
            force,
            commit: false,
          }),
        ).resolves.toMatchObject({ status: 'pruned' });

        await expect(access(target.projectPath)).rejects.toThrow();
        await expect(access(sentinel)).resolves.toBeUndefined();
        const canonicalUnrelatedPath = await realpath(unrelatedPath);
        expect(
          execFileSync('git', ['worktree', 'list', '--porcelain'], {
            cwd: fixture.cloneA,
            encoding: 'utf8',
          }),
        ).toContain(`worktree ${canonicalUnrelatedPath}`);
      } finally {
        await fixture.cleanup();
      }
    },
  );
});
