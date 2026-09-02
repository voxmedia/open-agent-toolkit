import { execFileSync } from 'node:child_process';
import { access, mkdir, readFile, realpath, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

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
  const inspectTerminalRefs = vi.fn(async () => null);
  const deleteCompletedSyncedRefForPrune = vi.fn(async () => ({
    completedRef: 'refs/oat/completed/demo',
    deleted: true,
  }));
  return {
    capture,
    pruneSynced: pruneSyncedMock,
    resolveSyncedTarget,
    inspectTerminalRefs,
    deleteCompletedSyncedRefForPrune,
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
      resolveProjectsRoot: async () => '.oat/projects/shared',
      resolveSyncedTarget,
      inspectTerminalRefs,
      deleteCompletedSyncedRefForPrune,
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

  it('cleans interrupted local state before deleting a completed-only terminal ref', async () => {
    const setup = harness('# archived state\n');
    setup.inspectTerminalRefs.mockResolvedValueOnce({
      state: 'completed-only',
      activeRef: 'refs/oat/projects/demo',
      completedRef: 'refs/oat/completed/demo',
      expectedSha: 'a'.repeat(40),
      activeSha: null,
      completedSha: 'a'.repeat(40),
    });

    await run(setup.command, ['demo', '--force']);

    expect(setup.pruneSynced).toHaveBeenCalledWith(
      expect.objectContaining({ slug: 'demo' }),
      expect.anything(),
      {
        force: true,
        commit: true,
        expectedActiveAliasSha: 'a'.repeat(40),
      },
    );
    expect(setup.deleteCompletedSyncedRefForPrune).toHaveBeenCalledOnce();
    expect(setup.capture.warn[0]).toContain(
      'Durable local/S3 archives are preserved',
    );
    expect(process.exitCode).toBe(0);
  });

  it('retains the completed ref when interrupted local cleanup fails', async () => {
    const setup = harness('# archived state\n');
    setup.inspectTerminalRefs.mockResolvedValueOnce({
      state: 'completed-only',
      activeRef: 'refs/oat/projects/demo',
      completedRef: 'refs/oat/completed/demo',
      expectedSha: 'a'.repeat(40),
      activeSha: null,
      completedSha: 'a'.repeat(40),
    });
    setup.pruneSynced.mockRejectedValueOnce(
      new Error('interrupted local cleanup failed'),
    );

    await run(setup.command, ['demo', '--force']);

    expect(setup.deleteCompletedSyncedRefForPrune).not.toHaveBeenCalled();
    expect(setup.capture.error[0]).toContain('local cleanup failed');
    expect(process.exitCode).toBe(2);
  });

  it('deletes a matching active alias and completed ref through explicit prune', async () => {
    const setup = harness('# archived state\n');
    setup.inspectTerminalRefs.mockResolvedValueOnce({
      state: 'both',
      activeRef: 'refs/oat/projects/demo',
      completedRef: 'refs/oat/completed/demo',
      expectedSha: 'a'.repeat(40),
      activeSha: 'a'.repeat(40),
      completedSha: 'a'.repeat(40),
    });

    await run(setup.command, ['demo', '--force']);

    expect(setup.pruneSynced).toHaveBeenCalledOnce();
    expect(setup.deleteCompletedSyncedRefForPrune).toHaveBeenCalledOnce();
    expect(setup.capture.warn[0]).toContain(
      'refs/oat/projects/demo and refs/oat/completed/demo',
    );
  });

  it('retains both refs when terminal inspection reports a mismatch', async () => {
    const setup = harness('# archived state\n');
    setup.inspectTerminalRefs.mockRejectedValueOnce(
      new Error('Repair the terminal ref mismatch before retrying'),
    );

    await run(setup.command, ['demo', '--force']);

    expect(setup.pruneSynced).not.toHaveBeenCalled();
    expect(setup.deleteCompletedSyncedRefForPrune).not.toHaveBeenCalled();
    expect(setup.capture.error[0]).toContain('terminal ref mismatch');
    expect(process.exitCode).toBe(2);
  });
});

describe('prune command integration', () => {
  it('retries completed-only cleanup before deleting terminal history', async () => {
    const fixture = await createSyncedFixture();
    try {
      const slug = 'terminal-prune';
      const target = buildSyncTarget(
        fixture.cloneA,
        '.oat/projects/shared',
        slug,
      );
      await createSyncedProject(target, defaultGitRunner);
      await writeFile(join(target.projectPath, 'state.md'), '# state\n');
      const pushed = await pushSynced(target, defaultGitRunner, {});
      const sourceSha = pushed.sha;
      execFileSync(
        'git',
        ['push', '-q', 'origin', `${sourceSha}:refs/oat/completed/${slug}`],
        { cwd: fixture.cloneA },
      );
      const recordPath = syncedRecordPath(target.syncedRoot, slug);
      await writeSyncedRecord(
        recordPath,
        buildSyncedRecord(slug, new Date('2026-08-31T00:00:00Z')),
      );
      execFileSync('git', ['push', '-q', 'origin', `:${target.ref}`], {
        cwd: fixture.cloneA,
      });
      const archivePath = join(
        fixture.cloneA,
        '.oat/projects/archived',
        slug,
        'state.md',
      );
      await mkdir(dirname(archivePath), { recursive: true });
      await writeFile(archivePath, '# durable archive\n');

      const capture = createLoggerCapture();
      const interruptedCleanup = vi.fn(
        async (..._args: Parameters<typeof pruneSynced>) => {
          throw new Error('injected local cleanup interruption');
        },
      );
      const interruptedCommand = createProjectPruneCommand({
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
        pruneSynced: interruptedCleanup,
        processEnv: {},
      });
      await run(interruptedCommand, [slug, '--force', '--no-commit']);

      expect(process.exitCode).toBe(2);
      expect(capture.error[0]).toContain('local cleanup interruption');
      await expect(access(target.projectPath)).resolves.toBeUndefined();
      await expect(access(recordPath)).resolves.toBeUndefined();
      expect(
        (
          await defaultGitRunner.run(
            ['show-ref', '--verify', '--quiet', target.ref],
            { cwd: fixture.cloneA, allowFailure: true },
          )
        ).code,
      ).toBe(0);
      expect(
        execFileSync(
          'git',
          ['ls-remote', 'origin', `refs/oat/completed/${slug}`],
          {
            cwd: fixture.cloneA,
            encoding: 'utf8',
          },
        ),
      ).toContain(sourceSha);

      process.exitCode = undefined;
      const retryCommand = createProjectPruneCommand({
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
      await run(retryCommand, [slug, '--force', '--no-commit']);

      expect(process.exitCode).toBe(0);
      await expect(access(target.projectPath)).rejects.toThrow();
      await expect(access(recordPath)).rejects.toThrow();
      expect(
        (
          await defaultGitRunner.run(
            ['show-ref', '--verify', '--quiet', target.ref],
            { cwd: fixture.cloneA, allowFailure: true },
          )
        ).code,
      ).toBe(1);
      expect(
        execFileSync(
          'git',
          ['ls-remote', 'origin', target.ref, `refs/oat/completed/${slug}`],
          { cwd: fixture.cloneA, encoding: 'utf8' },
        ).trim(),
      ).toBe('');
      expect(await readFile(archivePath, 'utf8')).toBe('# durable archive\n');
    } finally {
      await fixture.cleanup();
    }
  });

  it('retains an active alias that advances after terminal inspection', async () => {
    const fixture = await createSyncedFixture();
    try {
      const slug = 'terminal-prune-race';
      const target = buildSyncTarget(
        fixture.cloneA,
        '.oat/projects/shared',
        slug,
      );
      await createSyncedProject(target, defaultGitRunner);
      await writeFile(join(target.projectPath, 'state.md'), '# state\n');
      const pushed = await pushSynced(target, defaultGitRunner, {});
      const sourceSha = pushed.sha;
      const completedRef = `refs/oat/completed/${slug}`;
      execFileSync(
        'git',
        ['push', '-q', 'origin', `${sourceSha}:${completedRef}`],
        { cwd: fixture.cloneA },
      );
      const recordPath = syncedRecordPath(target.syncedRoot, slug);
      await writeSyncedRecord(
        recordPath,
        buildSyncedRecord(slug, new Date('2026-08-31T00:00:00Z')),
      );
      await writeFile(join(target.projectPath, 'advanced.md'), 'new work\n');
      execFileSync('git', ['add', 'advanced.md'], { cwd: target.projectPath });
      execFileSync('git', ['commit', '-q', '-m', 'advance active ref'], {
        cwd: target.projectPath,
      });
      const advancedSha = execFileSync('git', ['rev-parse', 'HEAD'], {
        cwd: target.projectPath,
        encoding: 'utf8',
      }).trim();
      let raced = false;
      const raceAfterInspection = vi.fn(
        async (...args: Parameters<typeof pruneSynced>) => {
          if (!raced) {
            raced = true;
            execFileSync(
              'git',
              [
                'push',
                '-q',
                '--force',
                'origin',
                `${advancedSha}:${target.ref}`,
              ],
              { cwd: target.projectPath },
            );
          }
          return pruneSynced(...args);
        },
      );
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
        pruneSynced: raceAfterInspection,
        processEnv: {},
      });

      await run(command, [slug, '--force', '--no-commit']);

      expect(process.exitCode).toBe(1);
      expect(capture.error[0]).toMatch(/active alias .* advanced .* retained/i);
      expect(raceAfterInspection).toHaveBeenCalledWith(
        expect.objectContaining({ slug }),
        expect.anything(),
        {
          force: true,
          commit: false,
          expectedActiveAliasSha: sourceSha,
        },
      );
      await expect(access(target.projectPath)).resolves.toBeUndefined();
      await expect(access(recordPath)).resolves.toBeUndefined();
      expect(
        execFileSync('git', ['ls-remote', 'origin', target.ref], {
          cwd: fixture.cloneA,
          encoding: 'utf8',
        }),
      ).toContain(advancedSha);
      expect(
        execFileSync('git', ['ls-remote', 'origin', completedRef], {
          cwd: fixture.cloneA,
          encoding: 'utf8',
        }),
      ).toContain(sourceSha);
    } finally {
      await fixture.cleanup();
    }
  });

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

  it('preserves staged deletion and unrelated state when retry remote lookup fails', async () => {
    const fixture = await createSyncedFixture();
    try {
      const target = buildSyncTarget(
        fixture.cloneA,
        '.oat/projects/shared',
        'retry-prune-lookup',
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
      execFileSync('git', ['commit', '-m', 'seed prune lookup retry'], {
        cwd: fixture.cloneA,
      });
      await writeFile(join(fixture.cloneA, 'unrelated.txt'), 'staged\n');
      execFileSync('git', ['add', 'unrelated.txt'], { cwd: fixture.cloneA });
      await writeFile(join(fixture.cloneA, 'unrelated.txt'), 'working\n');

      const failingCommitGit = {
        run: vi.fn(async (...args: Parameters<typeof defaultGitRunner.run>) => {
          if (args[0][0] === 'commit') {
            throw new Error('injected final prune commit failure');
          }
          return defaultGitRunner.run(...args);
        }),
      };
      await expect(
        pruneSynced(target, failingCommitGit, { force: true, commit: true }),
      ).rejects.toThrow('injected final prune commit failure');
      const headBeforeRetry = execFileSync('git', ['rev-parse', 'HEAD'], {
        cwd: fixture.cloneA,
        encoding: 'utf8',
      }).trim();

      let remoteLookups = 0;
      const retryGit = {
        run: vi.fn(async (...args: Parameters<typeof defaultGitRunner.run>) => {
          if (args[0][0] === 'ls-remote') {
            remoteLookups += 1;
            if (remoteLookups === 2) {
              return {
                code: 128,
                stdout: '',
                stderr: 'fatal: injected retry remote lookup failure',
              };
            }
          }
          return defaultGitRunner.run(...args);
        }),
      };
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
        gitRunner: retryGit,
        processEnv: {},
      });

      await run(command, [target.projectPath, '--force']);

      expect(remoteLookups).toBe(2);
      expect(capture.error[0]).toContain(
        'injected retry remote lookup failure',
      );
      expect(process.exitCode).toBe(2);
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
      ).toBe('.oat/projects/synced/retry-prune-lookup.json');
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
        execFileSync('git', ['rev-parse', 'HEAD'], {
          cwd: fixture.cloneA,
          encoding: 'utf8',
        }).trim(),
      ).toBe(headBeforeRetry);
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
