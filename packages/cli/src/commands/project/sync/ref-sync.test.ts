import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import { CliError } from '@errors/cli-error';
import {
  addLinkedWorktree,
  createSyncedFixture,
} from '@test-support/synced-fixture';
import { describe, expect, it } from 'vitest';

import { defaultGitRunner, type GitRunner } from './git';
import { buildSyncedRecord, writeSyncedRecord } from './record';
import {
  assertAllowlistedPathspecs,
  assertNestedWorktree,
  abortSynced,
  buildSyncTarget,
  commitRecordChange,
  continueSynced,
  createSyncedProject,
  preflightSyncedCheckout,
  pullChildren,
  pullSynced,
  pushSynced,
  removeSyncedCheckout,
  rollbackCreatedSyncedProject,
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

async function installRejectingHook(
  repoRoot: string,
  hookName: string,
): Promise<void> {
  const hooksDir = git(repoRoot, [
    'rev-parse',
    '--path-format=absolute',
    '--git-path',
    'hooks',
  ]);
  await mkdir(hooksDir, { recursive: true });
  await writeFile(join(hooksDir, hookName), '#!/bin/sh\nexit 97\n', {
    mode: 0o755,
  });
}

function rejectingInheritedHookRunner(): GitRunner {
  return {
    async run(args, options) {
      const hookCapable =
        args.includes('commit') ||
        args.includes('push') ||
        args.includes('rebase');
      const hooksSuppressed =
        args[0] === '-c' && args[1] === 'core.hooksPath=/dev/null';
      if (hookCapable && !hooksSuppressed) {
        return {
          code: 97,
          stdout: '',
          stderr: 'inherited common hook rejected minimal synced worktree',
        };
      }
      return defaultGitRunner.run(args, options);
    },
  };
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

  it('does not run the common post-checkout hook for empty-tree creation', async () => {
    const fixture = await createSyncedFixture();
    try {
      const target = buildSyncTarget(
        fixture.cloneA,
        '.oat/projects/shared',
        'hook-safe-create',
      );
      await installRejectingHook(fixture.cloneA, 'post-checkout');

      await createSyncedProject(target, defaultGitRunner);

      expect(git(target.projectPath, ['rev-parse', 'HEAD'])).toBe(
        git(fixture.cloneA, ['rev-parse', target.ref]),
      );
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

  it('refuses duplicate creation without changing the existing ref or files', async () => {
    const fixture = await createSyncedFixture();
    try {
      const target = buildSyncTarget(
        fixture.cloneA,
        '.oat/projects/shared',
        'example',
      );
      await createSyncedProject(target, defaultGitRunner);
      await writeFile(
        join(target.projectPath, 'draft.md'),
        'preserve me\n',
        'utf8',
      );
      git(target.projectPath, ['add', 'draft.md']);
      git(target.projectPath, ['commit', '-m', 'unpushed draft']);
      const existingRef = git(fixture.cloneA, ['rev-parse', target.ref]);
      const existingHead = git(target.projectPath, ['rev-parse', 'HEAD']);

      await expect(
        createSyncedProject(target, defaultGitRunner),
      ).rejects.toThrow(/already exists/i);

      expect(git(fixture.cloneA, ['rev-parse', target.ref])).toBe(existingRef);
      expect(git(target.projectPath, ['rev-parse', 'HEAD'])).toBe(existingHead);
      expect(await readFile(join(target.projectPath, 'draft.md'), 'utf8')).toBe(
        'preserve me\n',
      );
    } finally {
      await fixture.cleanup();
    }
  });

  it('refuses a remote ref collision before creating local state', async () => {
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

      await expect(
        createSyncedProject(targetB, defaultGitRunner),
      ).rejects.toThrow(/remote ref.*already exists/i);
      expect(() =>
        execFileSync('git', ['show-ref', '--verify', '--quiet', targetB.ref], {
          cwd: fixture.cloneB!,
          stdio: 'ignore',
        }),
      ).toThrow();
      expect(existsSync(targetB.projectPath)).toBe(false);
    } finally {
      await fixture.cleanup();
    }
  });

  it('rolls back only its new ref when worktree creation fails', async () => {
    const fixture = await createSyncedFixture();
    try {
      const target = buildSyncTarget(
        fixture.cloneA,
        '.oat/projects/shared',
        'example',
      );
      const failingRunner: GitRunner = {
        async run(args, options) {
          if (
            args[0] === '-c' &&
            args[1] === 'core.hooksPath=/dev/null' &&
            args[2] === 'worktree' &&
            args[3] === 'add'
          ) {
            throw new CliError('injected worktree failure', 2);
          }
          return defaultGitRunner.run(args, options);
        },
      };

      await expect(createSyncedProject(target, failingRunner)).rejects.toThrow(
        /injected worktree failure/,
      );
      expect(() =>
        execFileSync('git', ['show-ref', '--verify', '--quiet', target.ref], {
          cwd: fixture.cloneA,
          stdio: 'ignore',
        }),
      ).toThrow();
      expect(existsSync(target.projectPath)).toBe(false);
    } finally {
      await fixture.cleanup();
    }
  });

  it('refuses a stale worktree registration before replacing its ref', async () => {
    const fixture = await createSyncedFixture();
    try {
      const target = buildSyncTarget(
        fixture.cloneA,
        '.oat/projects/shared',
        'stale-create',
      );
      await createSyncedProject(target, defaultGitRunner);
      const existingRef = git(fixture.cloneA, ['rev-parse', target.ref]);
      await rm(target.projectPath, { recursive: true, force: true });

      await expect(
        createSyncedProject(target, defaultGitRunner),
      ).rejects.toThrow(/registered worktree/i);
      expect(git(fixture.cloneA, ['rev-parse', target.ref])).toBe(existingRef);
    } finally {
      await fixture.cleanup();
    }
  });

  it('removes the new worktree and ref when nested assertion fails', async () => {
    const fixture = await createSyncedFixture();
    try {
      const target = buildSyncTarget(
        fixture.cloneA,
        '.oat/projects/shared',
        'assertion-failure',
      );
      const failingRunner: GitRunner = {
        async run(args, options) {
          if (
            options.cwd === target.projectPath &&
            args[0] === 'rev-parse' &&
            args[1] === '--show-toplevel'
          ) {
            return {
              code: 0,
              stdout: fixture.cloneA,
              stderr: '',
            };
          }
          return defaultGitRunner.run(args, options);
        },
      };

      await expect(createSyncedProject(target, failingRunner)).rejects.toThrow(
        /expected nested toplevel/i,
      );
      expect(() =>
        execFileSync('git', ['show-ref', '--verify', '--quiet', target.ref], {
          cwd: fixture.cloneA,
          stdio: 'ignore',
        }),
      ).toThrow();
      expect(existsSync(target.projectPath)).toBe(false);
      expect(
        git(fixture.cloneA, ['worktree', 'list', '--porcelain']),
      ).not.toContain(target.projectPath);
    } finally {
      await fixture.cleanup();
    }
  });
});

describe('mutation invariants', () => {
  it.each([
    [
      'create',
      (target: SyncTarget, runner: GitRunner) =>
        createSyncedProject(target, runner),
    ],
    [
      'push',
      (target: SyncTarget, runner: GitRunner) => pushSynced(target, runner, {}),
    ],
    [
      'pull',
      (target: SyncTarget, runner: GitRunner) => pullSynced(target, runner),
    ],
    [
      'continue',
      (target: SyncTarget, runner: GitRunner) => continueSynced(target, runner),
    ],
    [
      'abort',
      (target: SyncTarget, runner: GitRunner) => abortSynced(target, runner),
    ],
    [
      'preflight',
      (target: SyncTarget, runner: GitRunner) =>
        preflightSyncedCheckout(target, runner),
    ],
    [
      'remove',
      (target: SyncTarget, runner: GitRunner) =>
        removeSyncedCheckout(target, runner),
    ],
    [
      'rollback',
      (target: SyncTarget, runner: GitRunner) =>
        rollbackCreatedSyncedProject(target, runner),
    ],
  ] as const)(
    'rejects a sibling checkout symlink before %s can run git',
    async (_operation, mutate) => {
      const fixture = await createSyncedFixture();
      try {
        const sibling = buildSyncTarget(
          fixture.cloneA,
          '.oat/projects/shared',
          'sibling',
        );
        const target = buildSyncTarget(
          fixture.cloneA,
          '.oat/projects/shared',
          'alias',
        );
        await createSyncedProject(sibling, defaultGitRunner);
        await writeFile(
          join(sibling.projectPath, 'preserve.md'),
          'preserve sibling\n',
          'utf8',
        );
        const siblingStatus = git(sibling.projectPath, [
          'status',
          '--porcelain',
        ]);
        await symlink(sibling.projectPath, target.projectPath, 'dir');
        const calls: string[][] = [];
        const recordingRunner: GitRunner = {
          async run(args) {
            calls.push([...args]);
            throw new Error('git should not run');
          },
        };

        await expect(mutate(target, recordingRunner)).rejects.toMatchObject({
          message: expect.stringContaining('canonical direct child'),
        });
        expect(calls).toEqual([]);
        expect(
          await readFile(join(sibling.projectPath, 'preserve.md'), 'utf8'),
        ).toBe('preserve sibling\n');
        expect(git(sibling.projectPath, ['status', '--porcelain'])).toBe(
          siblingStatus,
        );
      } finally {
        await fixture.cleanup();
      }
    },
  );

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

  it('does not run inherited commit or push hooks for pending synced edits', async () => {
    const fixture = await createSyncedFixture();
    try {
      const target = buildSyncTarget(
        fixture.cloneA,
        '.oat/projects/shared',
        'hook-safe-push',
      );
      await createSyncedProject(target, defaultGitRunner);
      await installRejectingHook(fixture.cloneA, 'pre-commit');
      await installRejectingHook(fixture.cloneA, 'pre-push');
      await writeFile(join(target.projectPath, 'state.md'), 'pending\n');

      await expect(
        pushSynced(target, defaultGitRunner, { message: 'hook-safe push' }),
      ).resolves.toMatchObject({ status: 'pushed' });
      expect(git(target.projectPath, ['log', '-1', '--format=%s'])).toBe(
        'hook-safe push',
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
      await installRejectingHook(fixture.cloneA, 'pre-rebase');
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

      const retryCalls: string[][] = [];
      const recordingRunner: GitRunner = {
        async run(args, options) {
          retryCalls.push([...args]);
          return defaultGitRunner.run(args, options);
        },
      };
      await expect(
        pushSynced(targetA, recordingRunner, { message: 'unsafe retry' }),
      ).resolves.toMatchObject({
        status: 'conflict',
        conflicts: ['state.md'],
      });
      expect(retryCalls).not.toContainEqual(['add', '-A']);
      expect(retryCalls.flat()).not.toContain('fetch');
      expect(retryCalls.flat()).not.toContain('rebase');
      expect(retryCalls.flat()).not.toContain('push');

      git(targetA.projectPath, ['rebase', '--abort']);
      expect(git(targetA.projectPath, ['rev-parse', 'HEAD'])).toBe(result.sha);
    } finally {
      await fixture.cleanup();
    }
  });

  it('reports every rename/rename unmerged path from a push rebase', async () => {
    const fixture = await createSyncedFixture({ secondClone: true });
    try {
      const targetA = buildSyncTarget(
        fixture.cloneA,
        '.oat/projects/shared',
        'rename-push',
      );
      const targetB = buildSyncTarget(
        fixture.cloneB!,
        '.oat/projects/shared',
        'rename-push',
      );
      await createSyncedProject(targetA, defaultGitRunner);
      await writeFile(join(targetA.projectPath, 'old.md'), 'base\n', 'utf8');
      await pushSynced(targetA, defaultGitRunner, { message: 'base rename' });
      await materializeRemoteTarget(targetB);

      git(targetA.projectPath, ['mv', 'old.md', 'remote-name.md']);
      await pushSynced(targetA, defaultGitRunner, { message: 'remote rename' });
      git(targetB.projectPath, ['mv', 'old.md', 'local-name.md']);

      await expect(
        pushSynced(targetB, defaultGitRunner, { message: 'local rename' }),
      ).resolves.toMatchObject({
        status: 'conflict',
        conflicts: ['local-name.md', 'old.md', 'remote-name.md'],
      });
      await abortSynced(targetB, defaultGitRunner);
      expect(git(targetB.projectPath, ['status', '--porcelain'])).toBe('');
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
        '-c',
        'core.hooksPath=/dev/null',
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

  it.each([
    [
      'missing remote',
      "fatal: 'missing' does not appear to be a git repository",
    ],
    ['network failure', 'ssh: Could not resolve hostname example.invalid'],
  ])('preserves diagnostics for a %s push failure', async (_name, stderr) => {
    const fixture = await createSyncedFixture();
    try {
      const target = buildSyncTarget(
        fixture.cloneA,
        '.oat/projects/shared',
        'push-error',
      );
      await createSyncedProject(target, defaultGitRunner);
      const failingRunner: GitRunner = {
        async run(args, options) {
          if (args.includes('push')) {
            return { code: 128, stdout: '', stderr };
          }
          return defaultGitRunner.run(args, options);
        },
      };

      await expect(pushSynced(target, failingRunner, {})).rejects.toMatchObject(
        {
          name: 'CliError',
          message: expect.stringContaining(stderr),
        },
      );
    } finally {
      await fixture.cleanup();
    }
  });
});

describe('pullSynced', () => {
  it('materializes a fresh-clone checkout and is idempotent', async () => {
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
      await writeFile(
        join(targetA.projectPath, 'state.md'),
        'published\n',
        'utf8',
      );
      await pushSynced(targetA, defaultGitRunner, {});

      const created = await pullSynced(targetB, defaultGitRunner);
      const repeated = await pullSynced(targetB, defaultGitRunner);

      expect(created.status).toBe('created');
      expect(
        await readFile(join(targetB.projectPath, 'state.md'), 'utf8'),
      ).toBe('published\n');
      expect(
        git(fixture.cloneB!, ['worktree', 'list', '--porcelain']),
      ).toContain(targetB.projectPath);
      expect(repeated.status).toBe('up-to-date');
    } finally {
      await fixture.cleanup();
    }
  });

  it('does not run the common post-checkout hook for fresh pull materialization', async () => {
    const fixture = await createSyncedFixture({ secondClone: true });
    try {
      const targetA = buildSyncTarget(
        fixture.cloneA,
        '.oat/projects/shared',
        'hook-safe-pull',
      );
      const targetB = buildSyncTarget(
        fixture.cloneB!,
        '.oat/projects/shared',
        'hook-safe-pull',
      );
      await createSyncedProject(targetA, defaultGitRunner);
      await writeFile(join(targetA.projectPath, 'state.md'), 'published\n');
      await pushSynced(targetA, defaultGitRunner, {});
      await installRejectingHook(fixture.cloneB!, 'post-checkout');

      const result = await pullSynced(targetB, defaultGitRunner);

      expect(result.status).toBe('created');
      expect(
        await readFile(join(targetB.projectPath, 'state.md'), 'utf8'),
      ).toBe('published\n');
    } finally {
      await fixture.cleanup();
    }
  });

  it('refuses to disturb uncommitted checkout edits', async () => {
    const fixture = await createSyncedFixture();
    try {
      const target = buildSyncTarget(
        fixture.cloneA,
        '.oat/projects/shared',
        'example',
      );
      await createSyncedProject(target, defaultGitRunner);
      await pushSynced(target, defaultGitRunner, {});
      await writeFile(
        join(target.projectPath, 'draft.md'),
        'do not touch\n',
        'utf8',
      );

      const result = await pullSynced(target, defaultGitRunner);

      expect(result.status).toBe('dirty');
      expect(await readFile(join(target.projectPath, 'draft.md'), 'utf8')).toBe(
        'do not touch\n',
      );
    } finally {
      await fixture.cleanup();
    }
  });

  it('does not run an inherited pre-rebase hook while updating a synced checkout', async () => {
    const fixture = await createSyncedFixture({ secondClone: true });
    try {
      const targetA = buildSyncTarget(
        fixture.cloneA,
        '.oat/projects/shared',
        'hook-safe-pull-rebase',
      );
      const targetB = buildSyncTarget(
        fixture.cloneB!,
        '.oat/projects/shared',
        'hook-safe-pull-rebase',
      );
      await createSyncedProject(targetA, defaultGitRunner);
      await writeFile(join(targetA.projectPath, 'state.md'), 'base\n');
      await pushSynced(targetA, defaultGitRunner, { message: 'base' });
      await pullSynced(targetB, defaultGitRunner);
      await writeFile(join(targetA.projectPath, 'state.md'), 'remote\n');
      await pushSynced(targetA, defaultGitRunner, { message: 'remote' });
      await installRejectingHook(fixture.cloneB!, 'pre-rebase');

      await expect(
        pullSynced(targetB, defaultGitRunner),
      ).resolves.toMatchObject({ status: 'updated' });
      expect(
        await readFile(join(targetB.projectPath, 'state.md'), 'utf8'),
      ).toBe('remote\n');
    } finally {
      await fixture.cleanup();
    }
  });

  it('continues a resolved divergent rebase and can publish it', async () => {
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
      await pushSynced(targetA, defaultGitRunner, { message: 'base' });
      await pullSynced(targetB, defaultGitRunner);

      await writeFile(join(targetB.projectPath, 'state.md'), 'local\n', 'utf8');
      git(targetB.projectPath, ['add', 'state.md']);
      git(targetB.projectPath, ['commit', '-m', 'local before pull']);
      await writeFile(
        join(targetA.projectPath, 'state.md'),
        'remote\n',
        'utf8',
      );
      await pushSynced(targetA, defaultGitRunner, { message: 'remote' });

      const conflict = await pullSynced(targetB, defaultGitRunner);
      expect(conflict).toMatchObject({
        status: 'conflict',
        conflicts: ['state.md'],
      });
      await writeFile(
        join(targetB.projectPath, 'state.md'),
        'resolved\n',
        'utf8',
      );
      git(targetB.projectPath, ['add', 'state.md']);
      await expect(
        continueSynced(targetB, rejectingInheritedHookRunner()),
      ).resolves.toMatchObject({ status: 'updated' });
      await expect(
        pushSynced(targetB, defaultGitRunner, {}),
      ).resolves.toMatchObject({ status: 'pushed' });
    } finally {
      await fixture.cleanup();
    }
  });

  it('reports every rename/rename unmerged path from a pull rebase', async () => {
    const fixture = await createSyncedFixture({ secondClone: true });
    try {
      const targetA = buildSyncTarget(
        fixture.cloneA,
        '.oat/projects/shared',
        'rename-pull',
      );
      const targetB = buildSyncTarget(
        fixture.cloneB!,
        '.oat/projects/shared',
        'rename-pull',
      );
      await createSyncedProject(targetA, defaultGitRunner);
      await writeFile(join(targetA.projectPath, 'old.md'), 'base\n', 'utf8');
      await pushSynced(targetA, defaultGitRunner, { message: 'base rename' });
      await pullSynced(targetB, defaultGitRunner);

      git(targetB.projectPath, ['mv', 'old.md', 'local-name.md']);
      git(targetB.projectPath, ['commit', '-m', 'local rename']);
      git(targetA.projectPath, ['mv', 'old.md', 'remote-name.md']);
      await pushSynced(targetA, defaultGitRunner, { message: 'remote rename' });

      await expect(
        pullSynced(targetB, defaultGitRunner),
      ).resolves.toMatchObject({
        status: 'conflict',
        conflicts: ['local-name.md', 'old.md', 'remote-name.md'],
      });
      await abortSynced(targetB, rejectingInheritedHookRunner());
      expect(git(targetB.projectPath, ['status', '--porcelain'])).toBe('');
    } finally {
      await fixture.cleanup();
    }
  });

  it('aborts a conflict back to the pre-rebase local commit', async () => {
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
      await pushSynced(targetA, defaultGitRunner, { message: 'base' });
      await pullSynced(targetB, defaultGitRunner);
      await writeFile(join(targetB.projectPath, 'state.md'), 'local\n', 'utf8');
      git(targetB.projectPath, ['add', 'state.md']);
      git(targetB.projectPath, ['commit', '-m', 'local']);
      const localHead = git(targetB.projectPath, ['rev-parse', 'HEAD']);
      await writeFile(
        join(targetA.projectPath, 'state.md'),
        'remote\n',
        'utf8',
      );
      await pushSynced(targetA, defaultGitRunner, { message: 'remote' });
      await expect(
        pullSynced(targetB, defaultGitRunner),
      ).resolves.toMatchObject({
        status: 'conflict',
      });

      await abortSynced(targetB, defaultGitRunner);

      expect(git(targetB.projectPath, ['rev-parse', 'HEAD'])).toBe(localHead);
      expect(git(targetB.projectPath, ['status', '--porcelain'])).toBe('');
    } finally {
      await fixture.cleanup();
    }
  });

  it('keeps independent nested checkouts across linked worktrees', async () => {
    const fixture = await createSyncedFixture();
    try {
      const linkedRoot = await addLinkedWorktree(fixture.cloneA, 'feat');
      const targetA = buildSyncTarget(
        fixture.cloneA,
        '.oat/projects/shared',
        'example',
      );
      const linkedTarget = buildSyncTarget(
        linkedRoot,
        '.oat/projects/shared',
        'example',
      );
      await createSyncedProject(targetA, defaultGitRunner);
      await writeFile(join(targetA.projectPath, 'state.md'), 'base\n', 'utf8');
      await pushSynced(targetA, defaultGitRunner, {});
      await pullSynced(linkedTarget, defaultGitRunner);

      await writeFile(
        join(linkedTarget.projectPath, 'linked.md'),
        'linked\n',
        'utf8',
      );
      await pushSynced(linkedTarget, defaultGitRunner, {});
      await expect(
        pullSynced(targetA, defaultGitRunner),
      ).resolves.toMatchObject({
        status: 'updated',
      });
      expect(
        git(targetA.projectPath, ['ls-tree', '-r', '--name-only', 'HEAD']),
      ).toBe(
        git(linkedTarget.projectPath, ['ls-tree', '-r', '--name-only', 'HEAD']),
      );

      git(fixture.cloneA, ['worktree', 'remove', linkedRoot]);
      await expect(
        pullSynced(targetA, defaultGitRunner),
      ).resolves.toMatchObject({
        status: 'up-to-date',
      });
    } finally {
      await fixture.cleanup();
    }
  });

  it('prunes a stale registration before recreating a missing checkout', async () => {
    const fixture = await createSyncedFixture();
    try {
      const target = buildSyncTarget(
        fixture.cloneA,
        '.oat/projects/shared',
        'example',
      );
      await createSyncedProject(target, defaultGitRunner);
      await pushSynced(target, defaultGitRunner, {});
      await rm(target.projectPath, { recursive: true, force: true });

      await expect(pullSynced(target, defaultGitRunner)).resolves.toMatchObject(
        {
          status: 'created',
        },
      );
      expect(
        git(target.projectPath, ['rev-parse', '--show-toplevel']),
      ).toContain('.oat/projects/synced/example');
    } finally {
      await fixture.cleanup();
    }
  });
});

describe('pullChildren', () => {
  it('isolates an aliased first child while adopting and committing a healthy later child', async () => {
    const fixture = await createSyncedFixture({ secondClone: true });
    try {
      const laterRemote = buildSyncTarget(
        fixture.cloneA,
        '.oat/projects/shared',
        'later',
      );
      const parent = buildSyncTarget(
        fixture.cloneB!,
        '.oat/projects/shared',
        'parent',
      );
      const sibling = buildSyncTarget(
        fixture.cloneB!,
        '.oat/projects/shared',
        'sibling',
      );
      const alias = buildSyncTarget(
        fixture.cloneB!,
        '.oat/projects/shared',
        'alias',
      );
      await createSyncedProject(laterRemote, defaultGitRunner);
      await writeFile(
        join(laterRemote.projectPath, 'state.md'),
        'healthy later child\n',
        'utf8',
      );
      await pushSynced(laterRemote, defaultGitRunner, {
        message: 'publish later child',
      });
      await createSyncedProject(parent, defaultGitRunner);
      await writeFile(
        join(parent.projectPath, 'state.md'),
        '---\noat_kind: coordination\noat_children:\n  - alias\n  - later\n---\n',
        'utf8',
      );
      await createSyncedProject(sibling, defaultGitRunner);
      await writeFile(
        join(sibling.projectPath, 'preserve.md'),
        'preserve sibling\n',
        'utf8',
      );
      await symlink(sibling.projectPath, alias.projectPath, 'dir');
      const aliasRecordPath = join(
        fixture.cloneB!,
        '.oat/projects/synced/alias.json',
      );
      await mkdir(dirname(aliasRecordPath), { recursive: true });
      await writeFile(aliasRecordPath, '{ invalid json\n', 'utf8');
      const siblingHead = git(sibling.projectPath, ['rev-parse', 'HEAD']);
      const siblingStatus = git(sibling.projectPath, ['status', '--porcelain']);
      const calls: Array<{ args: string[]; cwd: string }> = [];
      const recordingRunner: GitRunner = {
        async run(args, options) {
          calls.push({ args: [...args], cwd: options.cwd });
          return defaultGitRunner.run(args, options);
        },
      };

      const results = await pullChildren(parent, recordingRunner);

      expect(results).toEqual([
        expect.objectContaining({
          slug: 'alias',
          status: 'error',
          exitCode: 2,
          message: expect.stringContaining('canonical direct child'),
        }),
        expect.objectContaining({
          slug: 'later',
          status: 'created',
          adopted: true,
          pendingRecordPaths: [
            join(fixture.cloneB!, '.oat/projects/synced/later.json'),
          ],
        }),
      ]);
      expect(
        calls.some(
          (call) =>
            call.cwd === alias.projectPath || call.args.includes(alias.ref),
        ),
      ).toBe(false);
      expect(
        await readFile(join(sibling.projectPath, 'preserve.md'), 'utf8'),
      ).toBe('preserve sibling\n');
      expect(git(sibling.projectPath, ['rev-parse', 'HEAD'])).toBe(siblingHead);
      expect(git(sibling.projectPath, ['status', '--porcelain'])).toBe(
        siblingStatus,
      );
      const pendingRecordPaths = results.flatMap(
        (result) => result.pendingRecordPaths ?? [],
      );
      const recordCommit = await commitRecordChange(
        fixture.cloneB!,
        pendingRecordPaths,
        'chore(oat): adopt healthy coordination children',
        defaultGitRunner,
      );
      expect(recordCommit?.sha).toMatch(/^[0-9a-f]{40}$/);
      expect(
        git(fixture.cloneB!, ['show', '--format=', '--name-only', 'HEAD']),
      ).toBe('.oat/projects/synced/later.json');
    } finally {
      await fixture.cleanup();
    }
  });

  it('adopts available coordination children and reports missing children', async () => {
    const fixture = await createSyncedFixture({ secondClone: true });
    try {
      const parentA = buildSyncTarget(
        fixture.cloneA,
        '.oat/projects/shared',
        'parent',
      );
      const childA = buildSyncTarget(
        fixture.cloneA,
        '.oat/projects/shared',
        'child',
      );
      const parentB = buildSyncTarget(
        fixture.cloneB!,
        '.oat/projects/shared',
        'parent',
      );
      await createSyncedProject(childA, defaultGitRunner);
      await writeFile(join(childA.projectPath, 'state.md'), 'child\n', 'utf8');
      await pushSynced(childA, defaultGitRunner, {});
      await createSyncedProject(parentA, defaultGitRunner);
      await writeFile(
        join(parentA.projectPath, 'state.md'),
        '---\noat_kind: coordination\noat_children:\n  - child\n  - missing\n---\n',
        'utf8',
      );
      await pushSynced(parentA, defaultGitRunner, {});
      await pullSynced(parentB, defaultGitRunner);

      const results = await pullChildren(parentB, defaultGitRunner);

      expect(results).toEqual([
        expect.objectContaining({
          slug: 'child',
          status: 'created',
          adopted: true,
        }),
        expect.objectContaining({
          slug: 'missing',
          status: 'missing',
          exitCode: 1,
          message: expect.stringContaining('is absent'),
        }),
      ]);
      expect(
        await readFile(
          join(fixture.cloneB!, '.oat/projects/synced/child.json'),
          'utf8',
        ),
      ).toContain('"slug": "child"');
    } finally {
      await fixture.cleanup();
    }
  });

  it('preserves real child conflict paths', async () => {
    const fixture = await createSyncedFixture({ secondClone: true });
    try {
      const parentA = buildSyncTarget(
        fixture.cloneA,
        '.oat/projects/shared',
        'parent',
      );
      const parentB = buildSyncTarget(
        fixture.cloneB!,
        '.oat/projects/shared',
        'parent',
      );
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
      await pullSynced(childB, defaultGitRunner);
      await writeFile(join(childB.projectPath, 'state.md'), 'local\n', 'utf8');
      git(childB.projectPath, ['add', 'state.md']);
      git(childB.projectPath, ['commit', '-m', 'local child']);
      await writeFile(join(childA.projectPath, 'state.md'), 'remote\n', 'utf8');
      await pushSynced(childA, defaultGitRunner, { message: 'remote child' });

      await createSyncedProject(parentA, defaultGitRunner);
      await writeFile(
        join(parentA.projectPath, 'state.md'),
        '---\noat_kind: coordination\noat_children:\n  - child\n---\n',
        'utf8',
      );
      await pushSynced(parentA, defaultGitRunner, { message: 'parent' });
      await pullSynced(parentB, defaultGitRunner);

      await expect(pullChildren(parentB, defaultGitRunner)).resolves.toEqual([
        expect.objectContaining({
          slug: 'child',
          status: 'conflict',
          conflicts: ['state.md'],
          exitCode: 1,
        }),
      ]);
      await abortSynced(childB, defaultGitRunner);
    } finally {
      await fixture.cleanup();
    }
  });

  it('preserves child transport failures as system errors', async () => {
    const fixture = await createSyncedFixture();
    try {
      const target = buildSyncTarget(
        fixture.cloneA,
        '.oat/projects/shared',
        'parent',
      );
      await mkdir(target.projectPath, { recursive: true });
      await writeFile(
        join(target.projectPath, 'state.md'),
        '---\noat_kind: coordination\noat_children:\n  - child\n---\n',
        'utf8',
      );
      const runner: GitRunner = {
        async run(args) {
          expect(args[0]).toBe('ls-remote');
          return {
            code: 128,
            stdout: '',
            stderr: 'fatal: authentication failed',
          };
        },
      };

      await expect(pullChildren(target, runner)).resolves.toEqual([
        expect.objectContaining({
          slug: 'child',
          status: 'error',
          exitCode: 2,
          message: expect.stringContaining('authentication failed'),
        }),
      ]);
    } finally {
      await fixture.cleanup();
    }
  });

  it('rejects every invalid child slug before running git', async () => {
    const fixture = await createSyncedFixture();
    try {
      const target = buildSyncTarget(
        fixture.cloneA,
        '.oat/projects/shared',
        'parent',
      );
      await mkdir(target.projectPath, { recursive: true });
      await writeFile(
        join(target.projectPath, 'state.md'),
        '---\noat_kind: coordination\noat_children:\n  - valid\n  - ../invalid\n---\n',
        'utf8',
      );
      const calls: string[][] = [];
      const recordingRunner: GitRunner = {
        async run(args) {
          calls.push([...args]);
          throw new Error('git should not run');
        },
      };

      await expect(pullChildren(target, recordingRunner)).rejects.toThrow(
        /invalid child slug/i,
      );
      expect(calls).toEqual([]);
    } finally {
      await fixture.cleanup();
    }
  });

  it.each([
    '---\noat_kind: coordination\n---\n',
    '---\noat_kind: coordination\noat_children: child\n---\n',
  ])('rejects a malformed coordination child list', async (state) => {
    const fixture = await createSyncedFixture();
    try {
      const target = buildSyncTarget(
        fixture.cloneA,
        '.oat/projects/shared',
        'parent',
      );
      await mkdir(target.projectPath, { recursive: true });
      await writeFile(join(target.projectPath, 'state.md'), state, 'utf8');
      const calls: string[][] = [];
      const recordingRunner: GitRunner = {
        async run(args) {
          calls.push([...args]);
          throw new Error('git should not run');
        },
      };

      await expect(pullChildren(target, recordingRunner)).rejects.toThrow(
        /oat_children must be an array/i,
      );
      expect(calls).toEqual([]);
    } finally {
      await fixture.cleanup();
    }
  });
});

describe('commitRecordChange', () => {
  it('stages and commits exactly the allowlisted record path', async () => {
    const fixture = await createSyncedFixture();
    try {
      const recordPath = join(
        fixture.cloneA,
        '.oat/projects/synced/example.json',
      );
      await mkdir(dirname(recordPath), { recursive: true });
      await writeFile(recordPath, '{"slug":"example"}\n', 'utf8');
      await writeFile(join(fixture.cloneA, 'unrelated.txt'), 'dirty\n', 'utf8');
      const calls: string[][] = [];
      const recordingRunner: GitRunner = {
        async run(args, options) {
          calls.push([...args]);
          return defaultGitRunner.run(args, options);
        },
      };

      const result = await commitRecordChange(
        fixture.cloneA,
        [recordPath],
        'chore: add record',
        recordingRunner,
      );

      expect(result?.sha).toBe(git(fixture.cloneA, ['rev-parse', 'HEAD']));
      expect(calls).toContainEqual([
        'add',
        '--',
        '.oat/projects/synced/example.json',
      ]);
      expect(
        git(fixture.cloneA, [
          'diff-tree',
          '--no-commit-id',
          '--name-only',
          '-r',
          'HEAD',
        ]),
      ).toBe('.oat/projects/synced/example.json');
      expect(git(fixture.cloneA, ['status', '--porcelain'])).toContain(
        '?? unrelated.txt',
      );
      await expect(
        commitRecordChange(
          fixture.cloneA,
          [recordPath],
          'chore: no change',
          defaultGitRunner,
        ),
      ).resolves.toBeNull();
    } finally {
      await fixture.cleanup();
    }
  });

  it('leaves a pre-staged unrelated change outside the path-limited commit', async () => {
    const fixture = await createSyncedFixture();
    try {
      const unrelated = join(fixture.cloneA, 'src/unrelated.ts');
      const recordPath = join(
        fixture.cloneA,
        '.oat/projects/synced/example.json',
      );
      await mkdir(dirname(unrelated), { recursive: true });
      await mkdir(dirname(recordPath), { recursive: true });
      await writeFile(unrelated, 'export const unrelated = true;\n', 'utf8');
      await writeFile(recordPath, '{"slug":"example"}\n', 'utf8');
      git(fixture.cloneA, ['add', 'src/unrelated.ts']);

      await commitRecordChange(
        fixture.cloneA,
        [recordPath],
        'chore: add record only',
        defaultGitRunner,
      );

      expect(
        git(fixture.cloneA, [
          'diff-tree',
          '--no-commit-id',
          '--name-only',
          '-r',
          'HEAD',
        ]),
      ).toBe('.oat/projects/synced/example.json');
      expect(git(fixture.cloneA, ['diff', '--cached', '--name-only'])).toBe(
        'src/unrelated.ts',
      );
    } finally {
      await fixture.cleanup();
    }
  });

  it('rejects non-allowlisted pathspecs before invoking git add', async () => {
    const calls: string[][] = [];
    const runner: GitRunner = {
      async run(args) {
        calls.push([...args]);
        return { code: 0, stdout: '', stderr: '' };
      },
    };

    await expect(
      commitRecordChange('/repo', ['src/index.ts'], 'bad', runner),
    ).rejects.toBeInstanceOf(CliError);
    expect(calls.some((args) => args[0] === 'add')).toBe(false);
  });

  it('keeps independently added records mergeable across branches', async () => {
    const fixture = await createSyncedFixture({ secondClone: true });
    try {
      git(fixture.cloneA, ['checkout', '-q', '-b', 'feat-a']);
      git(fixture.cloneB!, ['checkout', '-q', '-b', 'feat-b']);
      const recordA = join(fixture.cloneA, '.oat/projects/synced/alpha.json');
      const recordB = join(fixture.cloneB!, '.oat/projects/synced/beta.json');
      await mkdir(dirname(recordA), { recursive: true });
      await mkdir(dirname(recordB), { recursive: true });
      await writeFile(recordA, '{"slug":"alpha"}\n', 'utf8');
      await writeFile(recordB, '{"slug":"beta"}\n', 'utf8');
      await commitRecordChange(
        fixture.cloneA,
        [recordA],
        'add alpha',
        defaultGitRunner,
      );
      await commitRecordChange(
        fixture.cloneB!,
        [recordB],
        'add beta',
        defaultGitRunner,
      );
      git(fixture.cloneB!, ['push', '-q', 'origin', 'feat-b']);
      git(fixture.cloneA, ['checkout', '-q', 'main']);
      git(fixture.cloneA, ['merge', '-q', '--no-edit', 'feat-a']);
      git(fixture.cloneA, ['fetch', '-q', 'origin', 'feat-b']);
      git(fixture.cloneA, ['merge', '-q', '--no-edit', 'origin/feat-b']);

      expect(
        git(fixture.cloneA, [
          'ls-tree',
          '--name-only',
          'HEAD',
          '.oat/projects/synced',
        ]),
      ).toContain('.oat/projects/synced');
      expect(
        existsSync(join(fixture.cloneA, '.oat/projects/synced/alpha.json')),
      ).toBe(true);
      expect(
        existsSync(join(fixture.cloneA, '.oat/projects/synced/beta.json')),
      ).toBe(true);
    } finally {
      await fixture.cleanup();
    }
  });
});

describe('synced checkout removal', () => {
  it('preflights without removal and removes a clean pushed checkout safely', async () => {
    const fixture = await createSyncedFixture();
    try {
      const target = buildSyncTarget(
        fixture.cloneA,
        '.oat/projects/shared',
        'example',
      );
      await createSyncedProject(target, defaultGitRunner);
      await pushSynced(target, defaultGitRunner, {});
      const calls: string[][] = [];
      const recordingRunner: GitRunner = {
        async run(args, options) {
          calls.push([...args]);
          return defaultGitRunner.run(args, options);
        },
      };

      await expect(
        preflightSyncedCheckout(target, recordingRunner),
      ).resolves.toMatchObject({ status: 'clean' });
      expect(calls.some((args) => args.includes('remove'))).toBe(false);
      await expect(
        removeSyncedCheckout(target, recordingRunner),
      ).resolves.toMatchObject({ status: 'removed' });
      expect(existsSync(target.projectPath)).toBe(false);
      expect(
        git(fixture.cloneA, ['worktree', 'list', '--porcelain']),
      ).not.toContain(target.projectPath);
      expect(calls.flat()).not.toContain('--force');
    } finally {
      await fixture.cleanup();
    }
  });

  it('leaves dirty and unpushed checkouts in place', async () => {
    const dirtyFixture = await createSyncedFixture();
    try {
      const dirtyTarget = buildSyncTarget(
        dirtyFixture.cloneA,
        '.oat/projects/shared',
        'dirty',
      );
      await createSyncedProject(dirtyTarget, defaultGitRunner);
      await pushSynced(dirtyTarget, defaultGitRunner, {});
      await writeFile(
        join(dirtyTarget.projectPath, 'draft.md'),
        'dirty\n',
        'utf8',
      );
      await expect(
        removeSyncedCheckout(dirtyTarget, defaultGitRunner),
      ).resolves.toMatchObject({ status: 'dirty' });
      expect(existsSync(dirtyTarget.projectPath)).toBe(true);
    } finally {
      await dirtyFixture.cleanup();
    }

    const unpushedFixture = await createSyncedFixture();
    try {
      const unpushedTarget = buildSyncTarget(
        unpushedFixture.cloneA,
        '.oat/projects/shared',
        'unpushed',
      );
      await createSyncedProject(unpushedTarget, defaultGitRunner);
      await pushSynced(unpushedTarget, defaultGitRunner, {});
      await writeFile(
        join(unpushedTarget.projectPath, 'local.md'),
        'local\n',
        'utf8',
      );
      git(unpushedTarget.projectPath, ['add', 'local.md']);
      git(unpushedTarget.projectPath, ['commit', '-m', 'unpushed local']);

      await expect(
        preflightSyncedCheckout(unpushedTarget, defaultGitRunner),
      ).resolves.toMatchObject({ status: 'unpushed' });
      await expect(
        removeSyncedCheckout(unpushedTarget, defaultGitRunner),
      ).resolves.toMatchObject({ status: 'unpushed' });
      expect(existsSync(unpushedTarget.projectPath)).toBe(true);
    } finally {
      await unpushedFixture.cleanup();
    }
  });

  it('allows explicit force removal of a dirty checkout', async () => {
    const fixture = await createSyncedFixture();
    try {
      const target = buildSyncTarget(
        fixture.cloneA,
        '.oat/projects/shared',
        'example',
      );
      await createSyncedProject(target, defaultGitRunner);
      await pushSynced(target, defaultGitRunner, {});
      await writeFile(
        join(target.projectPath, 'draft.md'),
        'discard\n',
        'utf8',
      );

      await expect(
        removeSyncedCheckout(target, defaultGitRunner, { force: true }),
      ).resolves.toMatchObject({ status: 'removed' });
      expect(existsSync(target.projectPath)).toBe(false);
    } finally {
      await fixture.cleanup();
    }
  });

  it('prunes a stale registration when the checkout directory is absent', async () => {
    const fixture = await createSyncedFixture();
    try {
      const target = buildSyncTarget(
        fixture.cloneA,
        '.oat/projects/shared',
        'stale-remove',
      );
      await createSyncedProject(target, defaultGitRunner);
      await pushSynced(target, defaultGitRunner, {});
      await rm(target.projectPath, { recursive: true, force: true });
      expect(
        git(fixture.cloneA, ['worktree', 'list', '--porcelain']),
      ).toContain(target.projectPath);

      await expect(
        removeSyncedCheckout(target, defaultGitRunner),
      ).resolves.toEqual({ status: 'absent' });
      expect(
        git(fixture.cloneA, ['worktree', 'list', '--porcelain']),
      ).not.toContain(target.projectPath);
    } finally {
      await fixture.cleanup();
    }
  });

  it('returns an existing pending adoption record without rewriting its ownership metadata', async () => {
    const fixture = await createSyncedFixture();
    try {
      const target = buildSyncTarget(
        fixture.cloneA,
        '.oat/projects/shared',
        'pending-adoption',
      );
      await createSyncedProject(target, defaultGitRunner);
      await writeFile(
        join(target.projectPath, 'state.md'),
        '# state\n',
        'utf8',
      );
      await pushSynced(target, defaultGitRunner, {});
      const recordPath = join(target.syncedRoot, 'pending-adoption.json');
      await writeSyncedRecord(
        recordPath,
        buildSyncedRecord(target.slug, new Date('2026-08-27T00:00:00.000Z')),
      );
      const before = await readFile(recordPath, 'utf8');

      await expect(
        pullSynced(target, defaultGitRunner, {
          adopt: true,
          adoptionRecord: 'pending',
          now: new Date('2026-08-28T00:00:00.000Z'),
        }),
      ).resolves.toMatchObject({
        adopted: true,
        adoptionRecordOwnership: 'existing',
        pendingRecordPaths: [recordPath],
      });
      await expect(readFile(recordPath, 'utf8')).resolves.toBe(before);
    } finally {
      await fixture.cleanup();
    }
  });
});
