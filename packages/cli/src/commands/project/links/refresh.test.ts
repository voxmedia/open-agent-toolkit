import type { GitRunner } from '@commands/project/sync/git';
import type { SyncTarget } from '@commands/project/sync/ref-sync';
import { describe, expect, it, vi } from 'vitest';

import { refreshPrLinks, type GhRunner } from './refresh';

const target: SyncTarget = {
  repoRoot: '/repo',
  sharedRoot: '/repo/.oat/projects/shared',
  syncedRoot: '/repo/.oat/projects/synced',
  projectPath: '/repo/.oat/projects/synced/demo',
  slug: 'demo',
  ref: 'refs/oat/projects/demo',
  remote: 'origin',
};

const linksInput = {
  slug: 'demo',
  sha: 'a'.repeat(40),
  ref: target.ref,
  originUrl: 'git@github.com:o/r.git',
  present: ['summary.md'] as const,
  pinnedAt: '2026-08-27',
};

function dependencies(gh: GhRunner) {
  return {
    gh,
    git: { run: vi.fn() } as GitRunner,
    computeLinksInput: vi.fn(async () => linksInput),
    now: () => new Date('2026-08-27T12:00:00Z'),
    warn: vi.fn(),
  };
}

describe('refreshPrLinks', () => {
  it('replaces the delimited block through a body file', async () => {
    const gh = {
      run: vi
        .fn()
        .mockResolvedValueOnce({
          code: 0,
          stdout: JSON.stringify({ body: 'Intro' }),
          stderr: '',
        })
        .mockResolvedValueOnce({ code: 0, stdout: '', stderr: '' }),
    };
    await expect(
      refreshPrLinks(target, 'https://github.com/o/r/pull/1', dependencies(gh)),
    ).resolves.toBe('refreshed');
    expect(gh.run).toHaveBeenNthCalledWith(1, [
      'pr',
      'view',
      'https://github.com/o/r/pull/1',
      '--json',
      'body',
    ]);
    expect(gh.run.mock.calls[1]?.[0]).toEqual([
      'pr',
      'edit',
      'https://github.com/o/r/pull/1',
      '--body-file',
      expect.stringContaining('oat-pr-body-'),
    ]);
  });

  it.each([
    [
      { code: 127, stdout: '', stderr: 'spawn gh ENOENT', missing: true },
      'skipped',
    ],
    [{ code: 1, stdout: '', stderr: 'authentication required' }, 'failed'],
  ] as const)('warns and returns %s', async (result, expected) => {
    const gh = { run: vi.fn(async () => result) };
    const deps = dependencies(gh);
    await expect(refreshPrLinks(target, 'pr-url', deps)).resolves.toBe(
      expected,
    );
    expect(deps.warn).toHaveBeenCalledOnce();
  });

  it('skips a malformed existing block', async () => {
    const gh = {
      run: vi.fn(async () => ({
        code: 0,
        stdout: JSON.stringify({
          body: 'Intro\n<!-- oat:project-links:start -->\nold',
        }),
        stderr: '',
      })),
    };
    const deps = dependencies(gh);
    await expect(refreshPrLinks(target, 'pr-url', deps)).resolves.toBe(
      'skipped',
    );
    expect(gh.run).toHaveBeenCalledOnce();
    expect(deps.warn).toHaveBeenCalledOnce();
  });
});
