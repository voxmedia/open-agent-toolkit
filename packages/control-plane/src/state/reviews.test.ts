import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { parseReviewTable, scanUnprocessedReviews } from './reviews';

describe('parseReviewTable', () => {
  it('parses rows from the plan reviews table', () => {
    const planContent = `## Reviews

| Scope | Type     | Status         | Date       | Artifact                     |
| ----- | -------- | -------------- | ---------- | ---------------------------- |
| p01   | code     | passed         | 2026-04-01 | reviews/p01-review.md        |
| p02   | code     | fixes_added    | 2026-04-02 | reviews/p02-review.md        |
| p03   | code     | pending        | -          | -                            |
| final | code     | pending        | -          | -                            |
| plan  | artifact | passed         | 2026-04-09 | reviews/artifact-plan.md     |
`;

    expect(parseReviewTable(planContent)).toEqual([
      {
        scope: 'p01',
        type: 'code',
        status: 'passed',
        date: '2026-04-01',
        artifact: 'reviews/p01-review.md',
      },
      {
        scope: 'p02',
        type: 'code',
        status: 'fixes_added',
        date: '2026-04-02',
        artifact: 'reviews/p02-review.md',
      },
      {
        scope: 'p03',
        type: 'code',
        status: 'pending',
        date: '-',
        artifact: '-',
      },
      {
        scope: 'final',
        type: 'code',
        status: 'pending',
        date: '-',
        artifact: '-',
      },
      {
        scope: 'plan',
        type: 'artifact',
        status: 'passed',
        date: '2026-04-09',
        artifact: 'reviews/artifact-plan.md',
      },
    ]);
  });

  it('returns an empty array when the plan has no reviews section', () => {
    expect(parseReviewTable('# Plan\n\n## Phase 1: Example\n')).toEqual([]);
  });
});

describe('scanUnprocessedReviews', () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(
      tempDirs.map(async (dir) => rm(dir, { recursive: true, force: true })),
    );
    tempDirs.length = 0;
  });

  async function createProjectDir(): Promise<string> {
    const dir = await mkdtemp(join(tmpdir(), 'oat-control-plane-reviews-'));
    tempDirs.push(dir);
    return dir;
  }

  it('returns markdown files from reviews/ excluding archived/', async () => {
    const projectDir = await createProjectDir();
    const reviewsDir = join(projectDir, 'reviews');
    const archivedDir = join(reviewsDir, 'archived');

    await mkdir(archivedDir, { recursive: true });
    await Promise.all([
      writeFile(join(reviewsDir, 'p01-review.md'), '# p01\n', 'utf8'),
      writeFile(join(reviewsDir, 'final-review.md'), '# final\n', 'utf8'),
      writeFile(
        join(archivedDir, 'artifact-plan-review.md'),
        '# archived\n',
        'utf8',
      ),
    ]);

    const reviews = await scanUnprocessedReviews(projectDir);

    expect(reviews).toEqual([
      join(reviewsDir, 'final-review.md'),
      join(reviewsDir, 'p01-review.md'),
    ]);
  });

  it('returns an empty array when the project has no reviews directory', async () => {
    const projectDir = await createProjectDir();

    await expect(scanUnprocessedReviews(projectDir)).resolves.toEqual([]);
  });
});
