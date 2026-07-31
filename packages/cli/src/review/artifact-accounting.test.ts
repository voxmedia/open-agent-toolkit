import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  extractReviewAccounting,
  MAX_REVIEW_ACCOUNTING_BYTES,
  parseStrictReviewAccountingJson,
} from './artifact-accounting';
import type { ReviewAccountingV1 } from './types';

function accounting(
  overrides: Partial<ReviewAccountingV1> = {},
): ReviewAccountingV1 {
  return {
    schemaVersion: 1,
    receipt: 'receipt',
    contextDigest: 'context',
    planDigest: 'plan',
    assignmentDigest: 'assignment',
    strategy: 'selective-inline',
    completion: 'complete',
    evidence: [],
    lanes: [],
    classifications: [],
    verification: [],
    budget: {
      evidenceStoppedAt: null,
      outputReservePreserved: null,
    },
    ...overrides,
  };
}

function artifact(
  value: ReviewAccountingV1 = accounting(),
  newline = '\n',
): string {
  return [
    '# Review',
    'Findings: 0 critical, 0 important, 0 medium, 0 minor',
    '',
    '## Review Accounting',
    '',
    '```json',
    JSON.stringify(value, null, 2),
    '```',
    '',
    '## Recommended Next Step',
    '',
  ].join(newline);
}

describe('artifact accounting grammar', () => {
  it('decodes strict UTF-8, normalizes newlines, and parses schema v1', () => {
    expect(
      extractReviewAccounting(Buffer.from(artifact(accounting(), '\r\n'))),
    ).toMatchObject({
      schemaVersion: 1,
      receipt: 'receipt',
    });
    expect(() => extractReviewAccounting(Buffer.from([0xff]))).toThrow(
      /UTF-8|encoded/i,
    );
    expect(() =>
      extractReviewAccounting(artifact().replace('# Review', '#\0')),
    ).toThrow(/NUL/);
  });

  it('tracks unrelated fences and requires one exact accounting block', () => {
    const source = [
      '~~~md',
      '## Review Accounting',
      '```json',
      '{}',
      '```',
      '~~~',
      artifact(),
    ].join('\n');
    expect(extractReviewAccounting(source)).toEqual(accounting());

    for (const invalid of [
      artifact().replace('## Review Accounting', ' ## Review Accounting'),
      `${artifact()}\n${artifact()}`,
      artifact().replace('```json', '````json'),
      artifact().replace('```json', '~~~json'),
      artifact().replace(/\n```\n\n## Recommended/, '\n````\n\n## Recommended'),
      artifact().replace(
        '\n```\n\n## Recommended',
        '\n```\ntrailing\n## Recommended',
      ),
      artifact().replace('\n```\n\n## Recommended', '\n'),
    ]) {
      expect(() => extractReviewAccounting(invalid)).toThrow();
    }
  });

  it('caps the encoded accounting block at one MiB', () => {
    const oversized = artifact(
      accounting({ receipt: 'x'.repeat(MAX_REVIEW_ACCOUNTING_BYTES) }),
    );
    expect(() => extractReviewAccounting(oversized)).toThrow(/1048576/);
  });

  it('rejects duplicate keys, trailing JSON, and schema mismatch', () => {
    const base = JSON.stringify(accounting());
    expect(() =>
      parseStrictReviewAccountingJson(
        base.replace('"receipt":"receipt"', '"receipt":"a","receipt":"b"'),
      ),
    ).toThrow(/duplicate/i);
    expect(() => parseStrictReviewAccountingJson(`${base}\n{}`)).toThrow();
    expect(() =>
      parseStrictReviewAccountingJson(
        base.replace('"schemaVersion":1', '"schemaVersion":2'),
      ),
    ).toThrow(/schemaVersion/);
  });

  it('round-trips the canonical reviewer template without weakening counts', () => {
    const reviewer = readFileSync(
      join(import.meta.dirname, '../../../../.agents/agents/oat-reviewer.md'),
      'utf8',
    );
    const template = reviewer.match(
      /^## Review Accounting\n\n?```json\n([\s\S]*?)\n```$/m,
    );
    expect(template).not.toBeNull();
    const concreteJson = template![1]!
      .replace('{opaque receipt}', 'receipt')
      .replace('{context digest}', 'context')
      .replace('{plan digest}', 'plan')
      .replace('{assignment digest}', 'assignment')
      .replace(
        '{whole-diff-inline | selective-inline | delegated}',
        'selective-inline',
      )
      .replace('{complete | blocked-incomplete}', 'complete');
    expect(
      extractReviewAccounting(
        `## Review Accounting\n\n\`\`\`json\n${concreteJson}\n\`\`\`\n`,
      ),
    ).toMatchObject({ schemaVersion: 1, completion: 'complete' });
    expect(reviewer).toMatch(
      /Findings:\s*\{N\} critical,\s*\{N\} important,\s*\{N\} medium,\s*\{N\} minor/,
    );
  });
});
