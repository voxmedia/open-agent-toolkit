import { execFileSync } from 'node:child_process';
import { access, writeFile } from 'node:fs/promises';
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
  pruneSynced,
  pullSynced,
  pushSynced,
} from '@commands/project/sync/ref-sync';
import { syncedRecordPath } from '@commands/shared/project-scope';
import {
  addLinkedWorktree,
  createSyncedFixture,
} from '@shared/../__tests__/synced-fixture';
import { Command } from 'commander';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createProjectPruneCommand } from './index';

function harness(state: string) {
  const capture = createLoggerCapture();
  const target = {
    repoRoot: '/repo',
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
  return {
    capture,
    pruneSynced: pruneSyncedMock,
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
      resolveSyncedTarget: async () => target,
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
});
