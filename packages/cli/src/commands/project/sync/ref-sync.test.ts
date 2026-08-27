import { execFileSync } from 'node:child_process';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import { CliError } from '@errors/cli-error';
import {
  addLinkedWorktree,
  createSyncedFixture,
} from '@shared/../__tests__/synced-fixture';
import { describe, expect, it } from 'vitest';

import { defaultGitRunner, type GitRunner } from './git';
import {
  assertAllowlistedPathspecs,
  assertNestedWorktree,
  abortSynced,
  buildSyncTarget,
  continueSynced,
  createSyncedProject,
  pullSynced,
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
        continueSynced(targetB, defaultGitRunner),
      ).resolves.toMatchObject({ status: 'updated' });
      await expect(
        pushSynced(targetB, defaultGitRunner, {}),
      ).resolves.toMatchObject({ status: 'pushed' });
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
