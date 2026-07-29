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

  it('parses widened rows with reviewed-head and lineage provenance', () => {
    const reviewedHead = 'a'.repeat(40);
    const planContent = `## Reviews

| Scope | Type | Status | Date       | Artifact                    | Reviewed Head                              | Invocation | Gate Target   |
| ----- | ---- | ------ | ---------- | --------------------------- | ------------------------------------------ | ---------- | ------------- |
| p02   | code | passed | 2026-07-28 | reviews/p02-review.md       | ${reviewedHead} | gate       | codex-default |
`;

    expect(parseReviewTable(planContent)).toEqual([
      {
        scope: 'p02',
        type: 'code',
        status: 'passed',
        date: '2026-07-28',
        artifact: 'reviews/p02-review.md',
        reviewedHead,
        invocation: 'gate',
        gateTarget: 'codex-default',
      },
    ]);
  });

  it('parses reordered known columns with unknown columns interleaved', () => {
    const reviewedHead = 'c'.repeat(40);
    const planContent = `## Reviews

| Notes  | Artifact              | Gate Target   | Scope | Owner | Status   | Reviewed Head                              | Date       | Invocation | Type |
| ------ | --------------------- | ------------- | ----- | ----- | -------- | ------------------------------------------ | ---------- | ---------- | ---- |
| first  | reviews/p04-review.md | codex-default | p04   | team  | passed   | ${reviewedHead} | 2026-07-28 | gate       | code |
| second | reviews/p05-review.md | -             | p05   | team  | received | -                                          | 2026-07-29 | auto       | code |
`;

    expect(parseReviewTable(planContent)).toEqual([
      {
        scope: 'p04',
        type: 'code',
        status: 'passed',
        date: '2026-07-28',
        artifact: 'reviews/p04-review.md',
        reviewedHead,
        invocation: 'gate',
        gateTarget: 'codex-default',
      },
      {
        scope: 'p05',
        type: 'code',
        status: 'received',
        date: '2026-07-29',
        artifact: 'reviews/p05-review.md',
        invocation: 'auto',
      },
    ]);
  });

  it('treats empty widened provenance cells as absent', () => {
    const planContent = `## Reviews

| Scope | Type | Status  | Date | Artifact | Reviewed Head | Invocation | Gate Target |
| ----- | ---- | ------- | ---- | -------- | ------------- | ---------- | ----------- |
| p02   | code | pending | -    | -        |               |            |             |
`;

    expect(parseReviewTable(planContent)).toEqual([
      {
        scope: 'p02',
        type: 'code',
        status: 'pending',
        date: '-',
        artifact: '-',
      },
    ]);
  });

  it('rejects a non-full reviewed head without rejecting the row', () => {
    const planContent = `## Reviews

| Scope | Type | Status | Date       | Artifact              | Reviewed Head | Invocation | Gate Target |
| ----- | ---- | ------ | ---------- | --------------------- | ------------- | ---------- | ----------- |
| final | code | passed | 2026-07-28 | reviews/final.md      | abc1234       | manual     |             |
`;

    expect(parseReviewTable(planContent)).toEqual([
      {
        scope: 'final',
        type: 'code',
        status: 'passed',
        date: '2026-07-28',
        artifact: 'reviews/final.md',
        invocation: 'manual',
      },
    ]);
  });

  it('preserves row count and ordering in a mixed legacy and widened table', () => {
    const reviewedHead = 'b'.repeat(40);
    const planContent = `## Reviews

| Scope | Type | Status   | Date       | Artifact                    | Reviewed Head                              | Invocation | Gate Target |
| ----- | ---- | -------- | ---------- | --------------------------- | ------------------------------------------ | ---------- | ----------- |
| p01   | code | passed   | 2026-07-27 | reviews/p01-review.md       |
| p02   | code | received | 2026-07-28 | reviews/p02-review.md       | ${reviewedHead} | auto       |             |
| p03   | code | pending  | -          | -                           |
`;

    const reviews = parseReviewTable(planContent);

    expect(reviews).toHaveLength(3);
    expect(reviews.map(({ scope }) => scope)).toEqual(['p01', 'p02', 'p03']);
    expect(reviews[1]).toMatchObject({
      reviewedHead,
      invocation: 'auto',
    });
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
