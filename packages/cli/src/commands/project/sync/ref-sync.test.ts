import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { CliError } from '@errors/cli-error';
import { createSyncedFixture } from '@shared/../__tests__/synced-fixture';
import { describe, expect, it } from 'vitest';

import { defaultGitRunner } from './git';
import {
  assertAllowlistedPathspecs,
  assertNestedWorktree,
  buildSyncTarget,
  createSyncedProject,
} from './ref-sync';

function git(cwd: string, args: string[]): string {
  return execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
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
