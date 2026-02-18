import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  discoverArtifactCandidates,
  findReferencedArtifactCandidates,
} from './artifacts';

async function createRepoRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'oat-cleanup-artifacts-'));
  await mkdir(join(root, '.oat', 'repo', 'reviews'), { recursive: true });
  await mkdir(join(root, '.oat', 'repo', 'reference', 'external-plans'), {
    recursive: true,
  });
  await mkdir(join(root, '.oat', 'repo', 'reference'), { recursive: true });
  await mkdir(join(root, '.oat', 'projects', 'shared', 'demo'), {
    recursive: true,
  });
  return root;
}

describe('artifact stale-candidate discovery and reference guards', () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(
      tempDirs.map(async (dir) => rm(dir, { recursive: true, force: true })),
    );
    tempDirs.length = 0;
  });

  it('discovers stale candidates in reviews and external-plans', async () => {
    const root = await createRepoRoot();
    tempDirs.push(root);
    await writeFile(
      join(root, '.oat', 'repo', 'reviews', 'r1.md'),
      '# r1',
      'utf8',
    );
    await writeFile(
      join(root, '.oat', 'repo', 'reference', 'external-plans', 'p1.md'),
      '# p1',
      'utf8',
    );
    await writeFile(
      join(root, '.oat', 'repo', 'reference', 'external-plans', 'p1-v2.md'),
      '# p1-v2',
      'utf8',
    );

    const candidates = await discoverArtifactCandidates(root, [
      '.oat/repo/reference/external-plans/p1.md',
    ]);

    expect(candidates).toEqual(
      expect.arrayContaining([
        '.oat/repo/reviews/r1.md',
        '.oat/repo/reference/external-plans/p1-v2.md',
      ]),
    );
    expect(candidates).not.toContain(
      '.oat/repo/reference/external-plans/p1.md',
    );
  });

  it('detects reference guard hits in active project and repo references', async () => {
    const root = await createRepoRoot();
    tempDirs.push(root);
    await writeFile(
      join(root, '.oat', 'active-project'),
      '.oat/projects/shared/demo\n',
      'utf8',
    );
    await writeFile(
      join(root, '.oat', 'repo', 'reviews', 'r1.md'),
      '# review',
      'utf8',
    );
    await writeFile(
      join(root, '.oat', 'repo', 'reference', 'external-plans', 'p1.md'),
      '# plan',
      'utf8',
    );
    await writeFile(
      join(root, '.oat', 'repo', 'reference', 'backlog.md'),
      'See .oat/repo/reviews/r1.md for context.',
      'utf8',
    );
    await writeFile(
      join(root, '.oat', 'projects', 'shared', 'demo', 'plan.md'),
      'Depends on .oat/repo/reference/external-plans/p1.md',
      'utf8',
    );

    const hits = await findReferencedArtifactCandidates(root, [
      '.oat/repo/reviews/r1.md',
      '.oat/repo/reference/external-plans/p1.md',
    ]);

    expect([...hits].sort()).toEqual([
      '.oat/repo/reference/external-plans/p1.md',
      '.oat/repo/reviews/r1.md',
    ]);
  });
});
