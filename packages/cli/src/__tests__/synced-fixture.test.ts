import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  addLinkedWorktree,
  createSyncedFixture,
  originRefs,
  readRef,
} from './synced-fixture';

describe('createSyncedFixture', () => {
  it('creates a configured clone backed by an absolute bare origin', async () => {
    const fixture = await createSyncedFixture();
    try {
      expect(existsSync(fixture.originDir)).toBe(true);
      expect(existsSync(fixture.cloneA)).toBe(true);
      expect(fixture.cloneB).toBeUndefined();
      expect(
        execFileSync('git', ['remote', 'get-url', 'origin'], {
          cwd: fixture.cloneA,
          encoding: 'utf8',
        }).trim(),
      ).toBe(fixture.originDir);
      expect(
        execFileSync('git', ['config', 'user.email'], {
          cwd: fixture.cloneA,
          encoding: 'utf8',
        }).trim(),
      ).toBe('synced-fixture@example.com');
      expect(
        execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
          cwd: fixture.cloneA,
          encoding: 'utf8',
        }).trim(),
      ).toBe('main');
      expect(
        await readFile(join(fixture.cloneA, '.gitignore'), 'utf8'),
      ).toContain('.oat/projects/synced/*/');
      expect(await originRefs(fixture.originDir)).toContain('refs/heads/main');
      expect(await readRef(fixture.cloneA, 'HEAD')).toMatch(/^[0-9a-f]{40}$/);
    } finally {
      await fixture.cleanup();
    }
    expect(existsSync(fixture.rootDir)).toBe(false);
  });

  it('optionally creates a second clone and linked worktrees', async () => {
    const fixture = await createSyncedFixture({ secondClone: true });
    try {
      expect(fixture.cloneB).toBeDefined();
      const worktree = await addLinkedWorktree(fixture.cloneA, 'feat');
      expect(existsSync(worktree)).toBe(true);
      expect(
        execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
          cwd: worktree,
          encoding: 'utf8',
        }).trim(),
      ).toBe('feat');
      expect(
        execFileSync('git', ['worktree', 'list', '--porcelain'], {
          cwd: fixture.cloneA,
          encoding: 'utf8',
        }),
      ).toContain(`worktree ${worktree}`);
    } finally {
      await fixture.cleanup();
    }
  });
});
