import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import {
  compareOperationMetrics,
  createReviewOperationTrace,
  deriveOperationMetrics,
  recordReviewOperation,
  type ReviewOperationMetricsV1,
  type ReviewOperationTraceV1,
} from './operation-metrics';

function loadFixture(name: string): unknown {
  return JSON.parse(
    readFileSync(new URL(`./__fixtures__/${name}`, import.meta.url), 'utf8'),
  ) as unknown;
}

describe('selective review operation metrics', () => {
  it('reduces broad content and semantic replay operations for the fixed large scope', () => {
    const baseline = loadFixture(
      'large-scope-baseline.v1.json',
    ) as ReviewOperationMetricsV1;
    const selectiveTrace = loadFixture('large-scope-selective.v1.json');
    const selective = deriveOperationMetrics(selectiveTrace);

    expect(selective.changedFiles).toBe(baseline.changedFiles);
    expect(compareOperationMetrics(baseline, selective)).toEqual({
      baselineFixture: 'large-scope-pre-review-plan',
      candidateFixture: 'large-scope-selective-review-plan',
      changedFiles: 237,
      broadContent: {
        baseline: 238,
        candidate: 2,
        saved: 236,
        improved: true,
      },
      semanticReplay: {
        baseline: 237,
        candidate: 1,
        saved: 236,
        improved: true,
      },
      toolSteps: {
        baseline: 481,
        candidate: 5,
        saved: 476,
      },
      completion: { baseline: 'blocked', candidate: 'complete' },
      accountingBytes: { baseline: 0, candidate: 32_768 },
      improvesBroadReview: true,
    });
  });

  it('keeps the compact small scope inline without delegation', () => {
    const compact = deriveOperationMetrics(
      loadFixture('small-scope-inline.v1.json'),
    );
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
      'tool-step': 3,
    });
  });

  it('fails a production-recorded broad and replay-heavy strategy', () => {
    const baseline = loadFixture(
      'large-scope-baseline.v1.json',
    ) as ReviewOperationMetricsV1;
    const heavy = createReviewOperationTrace({
      fixture: 'large-scope-broad-negative',
      changedFiles: 237,
      strategy: 'selective-inline',
      completion: 'complete',
      accountingBytes: 32_768,
    });
    for (let index = 0; index < 238; index += 1) {
      recordReviewOperation(heavy, {
        kind: 'full-file-read',
        source: 'evidence',
        pathIndexes: [index % 237],
      });
    }
    for (let index = 0; index < 237; index += 1) {
      recordReviewOperation(heavy, {
        kind: 'semantic-replay',
        source: 'reconciliation',
        pathIndexes: [index],
      });
    }

    const comparison = compareOperationMetrics(
      baseline,
      deriveOperationMetrics(heavy),
    );
    expect(comparison).toMatchObject({
      broadContent: { candidate: 238, improved: false },
      semanticReplay: { candidate: 237, improved: false },
      improvesBroadReview: false,
    });
  });

  it('rejects incomparable scopes and incomplete operation inventories', () => {
    const baseline = loadFixture(
      'large-scope-baseline.v1.json',
    ) as ReviewOperationMetricsV1;
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
          loadFixture(
            'large-scope-baseline.v1.json',
          ) as ReviewOperationMetricsV1,
          deriveOperationMetrics(loadFixture('large-scope-selective.v1.json')),
        ),
      ),
    ).not.toMatch(/wall.?clock|duration|elapsed|faster/i);
  });

  it('rejects traces not owned by the production recorder', () => {
    const trace = loadFixture(
      'large-scope-selective.v1.json',
    ) as ReviewOperationTraceV1;
    trace.producer = 'hand-entered';
    expect(() => deriveOperationMetrics(trace)).toThrow(
      /production operation recorder/,
    );
  });

  it('rejects hand-entered aggregate candidate counters', () => {
    expect(() =>
      deriveOperationMetrics({
        schemaVersion: 1,
        fixture: 'hand-entered',
        changedFiles: 237,
        strategy: 'selective-inline',
        producer: 'review-operation-recorder/v1',
        operations: [
          { kind: 'full-file-read', count: 1 },
          { kind: 'semantic-replay', count: 1 },
        ],
        completion: 'complete',
        accountingBytes: 32_768,
      }),
    ).toThrow(/unknown field operations/);
  });
});
