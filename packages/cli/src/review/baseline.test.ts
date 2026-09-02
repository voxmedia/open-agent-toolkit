import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

interface ReviewCostBaselineV1 {
  schemaVersion: 1;
  fixture: string;
  changedFiles: number;
  operations: Array<{
    kind: 'content-diff' | 'full-file-read' | 'semantic-replay' | 'tool-step';
    count: number;
  }>;
  completion: 'complete' | 'blocked';
  accountingBytes: number;
}

const fixtureUrl = new URL(
  './__fixtures__/large-scope-baseline.v1.json',
  import.meta.url,
);

function loadBaseline(): ReviewCostBaselineV1 {
  return JSON.parse(readFileSync(fixtureUrl, 'utf8')) as ReviewCostBaselineV1;
}

describe('large review operation baseline', () => {
  it('pins the deterministic 237-file scope', () => {
    expect(loadBaseline().changedFiles).toBe(237);
  });

  it('records all six exact baseline metrics', () => {
    const baseline = loadBaseline();
    expect(
      Object.fromEntries(
        baseline.operations.map(({ kind, count }) => [kind, count]),
      ),
    ).toEqual({
      'content-diff': 1,
      'full-file-read': 237,
      'semantic-replay': 237,
      'tool-step': 481,
    });
    expect(baseline.completion).toBe('blocked');
    expect(baseline.accountingBytes).toBe(0);
  });

  it('uses machine-exact values rather than approximate prose', () => {
    const baseline = loadBaseline();
    expect(baseline.schemaVersion).toBe(1);
    expect(
      baseline.operations.every(({ count }) => Number.isSafeInteger(count)),
    ).toBe(true);
    expect(Number.isSafeInteger(baseline.accountingBytes)).toBe(true);
  });
});
