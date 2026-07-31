import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import {
  compareOperationMetrics,
  type ReviewOperationMetricsV1,
} from './operation-metrics';

function loadFixture(name: string): ReviewOperationMetricsV1 {
  return JSON.parse(
    readFileSync(new URL(`./__fixtures__/${name}`, import.meta.url), 'utf8'),
  ) as ReviewOperationMetricsV1;
}

describe('selective review operation metrics', () => {
  it('reduces broad content and semantic replay operations for the fixed large scope', () => {
    const baseline = loadFixture('large-scope-baseline.v1.json');
    const selective = loadFixture('large-scope-selective.v1.json');

    expect(selective.changedFiles).toBe(baseline.changedFiles);
    expect(compareOperationMetrics(baseline, selective)).toEqual({
      baselineFixture: 'large-scope-pre-review-plan',
      candidateFixture: 'large-scope-selective-review-plan',
      changedFiles: 237,
      broadContent: {
        baseline: 238,
        candidate: 18,
        saved: 220,
        improved: true,
      },
      semanticReplay: {
        baseline: 237,
        candidate: 12,
        saved: 225,
        improved: true,
      },
      toolSteps: {
        baseline: 481,
        candidate: 55,
        saved: 426,
      },
      completion: { baseline: 'blocked', candidate: 'complete' },
      accountingBytes: { baseline: 0, candidate: 32_768 },
      improvesBroadReview: true,
    });
  });

  it('keeps the compact small scope inline without delegation', () => {
    const compact = loadFixture('small-scope-inline.v1.json');
    const operations = Object.fromEntries(
      compact.operations.map(({ kind, count }) => [kind, count]),
    );

    expect(compact).toMatchObject({
      changedFiles: 3,
      strategy: 'whole-diff-inline',
      completion: 'complete',
    });
    expect(operations).toEqual({
      'content-diff': 1,
      'full-file-read': 0,
      'semantic-replay': 0,
      'tool-step': 5,
    });
  });

  it('rejects incomparable scopes and incomplete operation inventories', () => {
    const baseline = loadFixture('large-scope-baseline.v1.json');
    const wrongScope = structuredClone(baseline);
    wrongScope.changedFiles = 236;
    const missingMetric = structuredClone(baseline);
    missingMetric.operations.pop();

    expect(() => compareOperationMetrics(baseline, wrongScope)).toThrow(
      /same changed-file scope/,
    );
    expect(() => compareOperationMetrics(baseline, missingMetric)).toThrow(
      /exactly one count/,
    );
  });

  it('contains no wall-clock metric or performance claim', () => {
    for (const fixture of [
      loadFixture('large-scope-selective.v1.json'),
      loadFixture('small-scope-inline.v1.json'),
    ]) {
      expect(JSON.stringify(fixture)).not.toMatch(
        /wall.?clock|duration|elapsed|faster/i,
      );
    }
    expect(
      JSON.stringify(
        compareOperationMetrics(
          loadFixture('large-scope-baseline.v1.json'),
          loadFixture('large-scope-selective.v1.json'),
        ),
      ),
    ).not.toMatch(/wall.?clock|duration|elapsed|faster/i);
  });
});
