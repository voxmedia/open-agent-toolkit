import { describe, expect, it } from 'vitest';

import {
  adaptPriorReviewEvidence,
  type PriorReviewEvidenceCandidate,
} from './prior-evidence';

const candidate = (
  overrides: Partial<PriorReviewEvidenceCandidate> = {},
): PriorReviewEvidenceCandidate => ({
  artifactRef: 'reviews/one.md',
  lineage: { project: 'project', target: 'p02', gateId: 'gate-1' },
  reviewedRange: { baseSha: 'a'.repeat(40), headSha: 'b'.repeat(40) },
  riskHints: ['boundary'],
  verificationHistory: [
    {
      check: 'test',
      scopePaths: ['z.ts', 'a.ts'],
      result: 'pass',
      provenance: 'ci',
    },
  ],
  deferredFindingIds: ['REV-2', 'REV-1'],
  verdict: 'pass',
  severity: 'critical',
  disposition: 'valid',
  ...overrides,
});

describe('adaptPriorReviewEvidence', () => {
  it('retains navigation evidence but strips verdict authority', () => {
    const [result] = adaptPriorReviewEvidence({
      project: 'project',
      target: 'p02',
      gateId: 'gate-1',
      candidates: [candidate()],
    });
    expect(result?.verificationHistory[0]?.scopePaths).toEqual([
      'a.ts',
      'z.ts',
    ]);
    expect(result?.deferredFindingIds).toEqual(['REV-1', 'REV-2']);
    expect(result).not.toHaveProperty('verdict');
    expect(result).not.toHaveProperty('severity');
    expect(result).not.toHaveProperty('disposition');
  });

  it.each([
    candidate({
      lineage: { project: 'other', target: 'p02', gateId: 'gate-1' },
    }),
    candidate({
      lineage: { project: 'project', target: 'final', gateId: 'gate-1' },
    }),
    candidate({
      lineage: { project: 'project', target: 'p02', gateId: 'gate-2' },
    }),
  ])('rejects project, target, or gate lineage mismatch', (prior) => {
    expect(() =>
      adaptPriorReviewEvidence({
        project: 'project',
        target: 'p02',
        gateId: 'gate-1',
        candidates: [prior],
      }),
    ).toThrow(/mismatch/);
  });
});
