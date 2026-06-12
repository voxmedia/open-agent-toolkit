import type { Dirent } from 'node:fs';
import * as fsp from 'node:fs/promises';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { expandLocalPaths } from './expand';

vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof fsp>();
  return { ...actual, readdir: vi.fn() };
});

type DirectoryTree = Record<string, Dirent[]>;

function fakeDirent(name: string, directory = false): Dirent {
  return {
    name,
    isDirectory: () => directory,
  } as Dirent;
}

function normalizeFsPath(path: unknown): string {
  return String(path).replaceAll('\\', '/');
}

function mockDirectoryTree(tree: DirectoryTree): string[] {
  const calls: string[] = [];

  vi.mocked(fsp.readdir).mockImplementation(async (path) => {
    const normalizedPath = normalizeFsPath(path);
    calls.push(normalizedPath);
    return (tree[normalizedPath] ?? []) as any;
  });

  return calls;
}

describe('expandLocalPaths', () => {
  afterEach(() => {
    vi.mocked(fsp.readdir).mockReset();
  });

  it('prunes generated and cache directories from glob candidates', async () => {
    const root = '/repo';
    const prunedDirectories = [
      '.git',
      '.worktrees',
      'node_modules',
      'dist',
      '.turbo',
    ];
    const tree: DirectoryTree = {
      [root]: [
        fakeDirent('.oat', true),
        ...prunedDirectories.map((name) => fakeDirent(name, true)),
      ],
      [`${root}/.oat`]: [fakeDirent('projects', true)],
      [`${root}/.oat/projects`]: [fakeDirent('shared', true)],
      [`${root}/.oat/projects/shared`]: [fakeDirent('alpha', true)],
      [`${root}/.oat/projects/shared/alpha`]: [fakeDirent('reviews', true)],
      [`${root}/.oat/projects/shared/alpha/reviews`]: [],
    };

    for (const directory of prunedDirectories) {
      tree[`${root}/${directory}`] = [fakeDirent('nested', true)];
      tree[`${root}/${directory}/nested`] = [fakeDirent('reviews', true)];
      tree[`${root}/${directory}/nested/reviews`] = [];
    }

    const calls = mockDirectoryTree(tree);

    await expect(expandLocalPaths(root, ['**'])).resolves.toEqual({
      resolved: [
        '.oat',
        '.oat/projects',
        '.oat/projects/shared',
        '.oat/projects/shared/alpha',
        '.oat/projects/shared/alpha/reviews',
      ],
      missingGlobs: [],
    });

    for (const directory of prunedDirectories) {
      expect(calls).not.toContain(`${root}/${directory}`);
    }
  });

  it('appends large matched child collections without overflowing', async () => {
    const root = '/large-repo';
    const matchCount = 150_000;
    const tree: DirectoryTree = {
      [root]: [fakeDirent('.oat', true)],
      [`${root}/.oat`]: [fakeDirent('projects', true)],
      [`${root}/.oat/projects`]: Array.from(
        { length: matchCount },
        (_, index) => fakeDirent(`review-${String(index).padStart(6, '0')}.md`),
      ),
    };
    mockDirectoryTree(tree);

    const result = await expandLocalPaths(root, ['.oat/projects/review-*']);

    expect(result.missingGlobs).toEqual([]);
    expect(result.resolved).toHaveLength(matchCount);
    expect(result.resolved[0]).toBe('.oat/projects/review-000000.md');
    expect(result.resolved.at(-1)).toBe('.oat/projects/review-149999.md');
  });

  it('resolves expected project review directories', async () => {
    const root = '/repo';
    mockDirectoryTree({
      [root]: [fakeDirent('.oat', true)],
      [`${root}/.oat`]: [fakeDirent('projects', true)],
      [`${root}/.oat/projects`]: [fakeDirent('shared', true)],
      [`${root}/.oat/projects/shared`]: [
        fakeDirent('alpha', true),
        fakeDirent('beta', true),
        fakeDirent('dist', true),
      ],
      [`${root}/.oat/projects/shared/alpha`]: [
        fakeDirent('reviews', true),
        fakeDirent('pr', true),
      ],
      [`${root}/.oat/projects/shared/alpha/reviews`]: [
        fakeDirent('artifact.md'),
      ],
      [`${root}/.oat/projects/shared/alpha/pr`]: [],
      [`${root}/.oat/projects/shared/beta`]: [fakeDirent('reviews', true)],
      [`${root}/.oat/projects/shared/beta/reviews`]: [],
      [`${root}/.oat/projects/shared/dist`]: [fakeDirent('reviews', true)],
      [`${root}/.oat/projects/shared/dist/reviews`]: [],
    });

    await expect(
      expandLocalPaths(root, ['.oat/projects/**/reviews']),
    ).resolves.toEqual({
      resolved: [
        '.oat/projects/shared/alpha/reviews',
        '.oat/projects/shared/beta/reviews',
        '.oat/projects/shared/dist/reviews',
      ],
      missingGlobs: [],
    });
  });
});
