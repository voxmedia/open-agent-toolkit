import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  parseReviewArtifactIdentity,
  parseReviewTable,
  scanUnprocessedReviews,
} from './reviews';

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

  it('preserves duplicate-scope rows as distinct review events', () => {
    const planContent = `## Reviews

| Scope | Type | Status   | Date       | Artifact                         |
| ----- | ---- | -------- | ---------- | -------------------------------- |
| final | code | passed   | 2026-04-09 | reviews/final-root-review.md     |
| final | code | received | 2026-04-10 | reviews/final-gate-review-v2.md  |
`;

    expect(parseReviewTable(planContent)).toEqual([
      {
        scope: 'final',
        type: 'code',
        status: 'passed',
        date: '2026-04-09',
        artifact: 'reviews/final-root-review.md',
      },
      {
        scope: 'final',
        type: 'code',
        status: 'received',
        date: '2026-04-10',
        artifact: 'reviews/final-gate-review-v2.md',
      },
    ]);
  });

  it('parses only the exact Reviews heading through the next level-two section', () => {
    const planContent = [
      '## Phase 1: Example',
      '',
      'Reader guidance mentions `## Reviews` inline.',
      '',
      '## Reviews',
      '',
      '| Scope | Type | Status | Date       | Artifact                  |',
      '| ----- | ---- | ------ | ---------- | ------------------------- |',
      '| p01   | code | passed | 2026-07-13 | reviews/p01-review.md     |',
      '| final | code | passed | 2026-07-14 | reviews/final-review.md   |',
      '',
      '## Implementation Complete',
      '',
      '| final | code | received | 2026-07-15 | reviews/not-ledger.md |',
    ].join('\n');

    const reviews = parseReviewTable(planContent);

    expect(reviews).toHaveLength(2);
    expect(reviews.at(-1)).toEqual({
      scope: 'final',
      type: 'code',
      status: 'passed',
      date: '2026-07-14',
      artifact: 'reviews/final-review.md',
    });
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

describe('parseReviewArtifactIdentity', () => {
  it('reads scope and type from review artifact frontmatter', () => {
    expect(
      parseReviewArtifactIdentity(`---
oat_review_scope: p05
oat_review_type: code
---
`),
    ).toEqual({ scope: 'p05', type: 'code' });
  });

  it('returns null when either identity field is missing', () => {
    expect(
      parseReviewArtifactIdentity(`---
oat_review_scope: p05
---
`),
    ).toBeNull();
  });
});
