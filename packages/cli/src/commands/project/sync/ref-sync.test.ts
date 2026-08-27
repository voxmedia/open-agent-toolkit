import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import { CliError } from '@errors/cli-error';
import { createSyncedFixture } from '@shared/../__tests__/synced-fixture';
import { describe, expect, it } from 'vitest';

import { defaultGitRunner, type GitRunner } from './git';
import {
  assertAllowlistedPathspecs,
  assertNestedWorktree,
  buildSyncTarget,
  createSyncedProject,
  pushSynced,
  type SyncTarget,
} from './ref-sync';

function git(cwd: string, args: string[]): string {
  return execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
}

async function materializeRemoteTarget(target: SyncTarget): Promise<void> {
  await defaultGitRunner.run(
    ['fetch', target.remote, `+${target.ref}:${target.ref}`],
    { cwd: target.repoRoot },
  );
  await mkdir(dirname(target.projectPath), { recursive: true });
  await defaultGitRunner.run(
    ['worktree', 'add', '--detach', target.projectPath, target.ref],
    { cwd: target.repoRoot },
  );
}

describe('createSyncedProject', () => {
  it('creates an empty-tree ref in a nested detached worktree', async () => {
    const fixture = await createSyncedFixture();
    try {
      const target = buildSyncTarget(
        fixture.cloneA,
        '.oat/projects/shared',
        'example',
      );

      await createSyncedProject(target, defaultGitRunner);

      expect(git(fixture.cloneA, ['rev-parse', target.ref])).toMatch(
        /^[0-9a-f]{40}$/,
      );
      expect(git(target.projectPath, ['rev-parse', 'HEAD^{tree}'])).toBe(
        '4b825dc642cb6eb9a060e54bf8d69288fbee4904',
      );
      expect(
        (await readFile(join(target.projectPath, '.git'), 'utf8')).trim(),
      ).toMatch(/^gitdir:/);
      expect(git(target.projectPath, ['rev-parse', '--show-toplevel'])).toBe(
        await defaultGitRunner
          .run(['rev-parse', '--show-toplevel'], { cwd: target.projectPath })
          .then((result) => result.stdout),
      );
      expect(git(fixture.cloneA, ['status', '--porcelain'])).toBe('');
    } finally {
      await fixture.cleanup();
    }
  });

  it('uses distinct root commits with the same empty tree per slug', async () => {
    const fixture = await createSyncedFixture();
    try {
      const alpha = buildSyncTarget(
        fixture.cloneA,
        '.oat/projects/shared',
        'alpha',
      );
      const beta = buildSyncTarget(
        fixture.cloneA,
        '.oat/projects/shared',
        'beta',
      );
      await createSyncedProject(alpha, defaultGitRunner);
      await createSyncedProject(beta, defaultGitRunner);

      expect(git(fixture.cloneA, ['rev-parse', alpha.ref])).not.toBe(
        git(fixture.cloneA, ['rev-parse', beta.ref]),
      );
      expect(git(alpha.projectPath, ['rev-parse', 'HEAD^{tree}'])).toBe(
        git(beta.projectPath, ['rev-parse', 'HEAD^{tree}']),
      );
    } finally {
      await fixture.cleanup();
    }
  });
});

describe('mutation invariants', () => {
  it('rejects a parent checkout as the nested mutation target', async () => {
    const fixture = await createSyncedFixture();
    try {
      const target = {
        ...buildSyncTarget(fixture.cloneA, '.oat/projects/shared', 'example'),
        projectPath: fixture.cloneA,
      };

      await expect(
        assertNestedWorktree(target, defaultGitRunner),
      ).rejects.toBeInstanceOf(CliError);
    } finally {
      await fixture.cleanup();
    }
  });

  it('allows only branch-side record and lifecycle pathspecs', () => {
    const repoRoot = '/repo';
    expect(() =>
      assertAllowlistedPathspecs(
        repoRoot,
        [
          '.oat/projects/synced/example.json',
          '.gitignore',
          '.gitattributes',
          '.oat/projects/shared/example',
          '.oat/repo/reference/project-summaries/2026-08-27-example.md',
        ],
        {
          summaryExportPath: '.oat/repo/reference/project-summaries',
        },
      ),
    ).not.toThrow();

    for (const pathspec of [
      'src/index.ts',
      '.oat/projects/synced/example/state.md',
      '../outside.txt',
    ]) {
      expect(() => assertAllowlistedPathspecs(repoRoot, [pathspec])).toThrow(
        CliError,
      );
    }
  });
});

describe('pushSynced', () => {
  it('publishes the initial ref and then reports a clean checkout up-to-date', async () => {
    const fixture = await createSyncedFixture();
    try {
      const target = buildSyncTarget(
        fixture.cloneA,
        '.oat/projects/shared',
        'example',
      );
      await createSyncedProject(target, defaultGitRunner);

      const first = await pushSynced(target, defaultGitRunner, {});
      const countBefore = git(target.projectPath, [
        'rev-list',
        '--count',
        'HEAD',
      ]);
      const second = await pushSynced(target, defaultGitRunner, {});

      expect(first.status).toBe('pushed');
      expect(git(fixture.originDir, ['rev-parse', target.ref])).toBe(first.sha);
      expect(git(fixture.cloneA, ['rev-parse', target.ref])).toBe(
        git(target.projectPath, ['rev-parse', 'HEAD']),
      );
      expect(second.status).toBe('up-to-date');
      expect(git(target.projectPath, ['rev-list', '--count', 'HEAD'])).toBe(
        countBefore,
      );
    } finally {
      await fixture.cleanup();
    }
  });

  it('commits pending edits with an override or default message', async () => {
    const fixture = await createSyncedFixture();
    try {
      const target = buildSyncTarget(
        fixture.cloneA,
        '.oat/projects/shared',
        'example',
      );
      await createSyncedProject(target, defaultGitRunner);
      await pushSynced(target, defaultGitRunner, {});

      await writeFile(join(target.projectPath, 'state.md'), 'first\n', 'utf8');
      await expect(
        pushSynced(target, defaultGitRunner, {
          message: 'custom sync message',
        }),
      ).resolves.toMatchObject({ status: 'pushed' });
      expect(git(target.projectPath, ['log', '-1', '--format=%s'])).toBe(
        'custom sync message',
      );

      await writeFile(join(target.projectPath, 'state.md'), 'second\n', 'utf8');
      await expect(
        pushSynced(target, defaultGitRunner, {}),
      ).resolves.toMatchObject({ status: 'pushed' });
      expect(git(target.projectPath, ['log', '-1', '--format=%s'])).toBe(
        'chore(oat): sync example artifacts',
      );
    } finally {
      await fixture.cleanup();
    }
  });

  it('rebases a pending local edit on a non-overlapping remote advance', async () => {
    const fixture = await createSyncedFixture({ secondClone: true });
    try {
      const targetA = buildSyncTarget(
        fixture.cloneA,
        '.oat/projects/shared',
        'example',
      );
      const targetB = buildSyncTarget(
        fixture.cloneB!,
        '.oat/projects/shared',
        'example',
      );
      await createSyncedProject(targetA, defaultGitRunner);
      await pushSynced(targetA, defaultGitRunner, {});
      await materializeRemoteTarget(targetB);

      await writeFile(
        join(targetB.projectPath, 'remote.md'),
        'remote\n',
        'utf8',
      );
      const remote = await pushSynced(targetB, defaultGitRunner, {
        message: 'remote edit',
      });
      await writeFile(join(targetA.projectPath, 'local.md'), 'local\n', 'utf8');
      const local = await pushSynced(targetA, defaultGitRunner, {
        message: 'local edit',
      });

      expect(remote.status).toBe('pushed');
      expect(local.status).toBe('pushed');
      expect(git(targetA.projectPath, ['log', '-2', '--format=%s'])).toBe(
        'local edit\nremote edit',
      );
    } finally {
      await fixture.cleanup();
    }
  });

  it('returns conflicts after making the local edit durable as a commit', async () => {
    const fixture = await createSyncedFixture({ secondClone: true });
    try {
      const targetA = buildSyncTarget(
        fixture.cloneA,
        '.oat/projects/shared',
        'example',
      );
      const targetB = buildSyncTarget(
        fixture.cloneB!,
        '.oat/projects/shared',
        'example',
      );
      await createSyncedProject(targetA, defaultGitRunner);
      await writeFile(join(targetA.projectPath, 'state.md'), 'base\n', 'utf8');
      await pushSynced(targetA, defaultGitRunner, { message: 'base state' });
      await materializeRemoteTarget(targetB);

      await writeFile(
        join(targetB.projectPath, 'state.md'),
        'remote\n',
        'utf8',
      );
      await pushSynced(targetB, defaultGitRunner, { message: 'remote state' });
      await writeFile(join(targetA.projectPath, 'state.md'), 'local\n', 'utf8');
      const result = await pushSynced(targetA, defaultGitRunner, {
        message: 'local state',
      });

      expect(result).toMatchObject({
        status: 'conflict',
        conflicts: ['state.md'],
      });
      expect(() =>
        execFileSync('git', ['cat-file', '-e', `${result.sha}^{commit}`], {
          cwd: targetA.projectPath,
        }),
      ).not.toThrow();
      git(targetA.projectPath, ['rebase', '--abort']);
      expect(git(targetA.projectPath, ['rev-parse', 'HEAD'])).toBe(result.sha);
    } finally {
      await fixture.cleanup();
    }
  });

  it('reports a concurrent non-fast-forward rejection without forcing', async () => {
    const fixture = await createSyncedFixture({ secondClone: true });
    try {
      const targetA = buildSyncTarget(
        fixture.cloneA,
        '.oat/projects/shared',
        'example',
      );
      const targetB = buildSyncTarget(
        fixture.cloneB!,
        '.oat/projects/shared',
        'example',
      );
      await createSyncedProject(targetA, defaultGitRunner);
      await pushSynced(targetA, defaultGitRunner, {});
      await materializeRemoteTarget(targetB);
      await writeFile(
        join(targetB.projectPath, 'remote.md'),
        'remote\n',
        'utf8',
      );
      await pushSynced(targetB, defaultGitRunner, { message: 'remote race' });
      await writeFile(join(targetA.projectPath, 'local.md'), 'local\n', 'utf8');

      const calls: string[][] = [];
      const rejectingRunner: GitRunner = {
        async run(args, options) {
          calls.push([...args]);
          if (args.includes('push')) {
            return {
              code: 1,
              stdout: '',
              stderr: 'rejected (non-fast-forward)',
            };
          }
          return defaultGitRunner.run(args, options);
        },
      };
      const result = await pushSynced(targetA, rejectingRunner, {
        message: 'local race',
      });

      expect(result.status).toBe('rejected');
      expect(calls).toContainEqual([
        'fetch',
        targetA.remote,
        `+${targetA.ref}:${targetA.ref}`,
      ]);
      expect(calls).toContainEqual([
        '-C',
        targetA.projectPath,
        'push',
        targetA.remote,
        `HEAD:${targetA.ref}`,
      ]);
      expect(calls.flat()).not.toContain('--force');
      expect(calls.flat()).not.toContain('--force-with-lease');
    } finally {
      await fixture.cleanup();
    }
  });
});
