import { describe, expect, it } from 'vitest';

import {
  buildReviewedBatch,
  reduceReviewedBatchOutcomes,
  resumeReviewedBatch,
} from './batch';

const NOW = '2026-09-05T12:00:00.000Z';

const members = [
  {
    bindingId: 'bnd_batch_002',
    operationId: 'op_batch_002',
    bindingPreviewDigest: 'sha256:preview-2',
  },
  {
    bindingId: 'bnd_batch_001',
    operationId: 'op_batch_001',
    bindingPreviewDigest: 'sha256:preview-1',
  },
];

describe('reviewed remote batches', () => {
  it('builds deterministic immutable membership and preview digests', () => {
    const first = buildReviewedBatch({
      batchId: 'batch_reviewed_001',
      lifecycleOperation: 'closeout',
      members,
      authority: { effective: 'user-approved', sourceDigest: 'sha256:policy' },
      createdAt: NOW,
    });
    const second = buildReviewedBatch({
      batchId: 'batch_reviewed_001',
      lifecycleOperation: 'closeout',
      members: [...members].reverse(),
      authority: { effective: 'user-approved', sourceDigest: 'sha256:policy' },
      createdAt: NOW,
    });

    expect(first.members).toEqual(second.members);
    expect(first.members.map((member) => member.bindingId)).toEqual([
      'bnd_batch_001',
      'bnd_batch_002',
    ]);
    expect(first.membershipDigest).toBe(second.membershipDigest);
    expect(first.previewDigest).toBe(second.previewDigest);
    expect(first.outcomes).toEqual({
      op_batch_001: 'planned',
      op_batch_002: 'planned',
    });
  });

  it('invalidates approval when any reviewed input changes', () => {
    const reviewed = buildReviewedBatch({
      batchId: 'batch_reviewed_001',
      lifecycleOperation: 'closeout',
      members,
      authority: { effective: 'user-approved', sourceDigest: 'sha256:policy' },
      approval: {
        previewDigest: 'sha256:stale',
        approvedAt: NOW,
        source: 'operator',
      },
      createdAt: NOW,
    });

    expect(reviewed.approval).toBeNull();
    expect(reviewed.state).toBe('pending');
  });

  it('resumes only an identical reviewed batch', () => {
    const reviewed = buildReviewedBatch({
      batchId: 'batch_reviewed_001',
      lifecycleOperation: 'closeout',
      members,
      authority: { effective: 'user-approved', sourceDigest: 'sha256:policy' },
      createdAt: NOW,
    });

    expect(resumeReviewedBatch(reviewed, [...members].reverse())).toEqual(
      reviewed,
    );
    expect(() =>
      resumeReviewedBatch(reviewed, [
        ...members,
        {
          bindingId: 'bnd_batch_003',
          operationId: 'op_batch_003',
          bindingPreviewDigest: 'sha256:preview-3',
        },
      ]),
    ).toThrow('membership changed');
  });

  it.each([
    [['verified', 'verified'], 'complete'],
    [['verified', 'blocked'], 'partial'],
    [['blocked', 'uncertain'], 'uncertain'],
    [['blocked', 'blocked'], 'blocked'],
  ] as const)('reduces independent outcomes %j to %s', (states, expected) => {
    const reviewed = buildReviewedBatch({
      batchId: 'batch_reviewed_001',
      lifecycleOperation: 'closeout',
      members,
      authority: { effective: 'user-approved', sourceDigest: 'sha256:policy' },
      createdAt: NOW,
    });
    const reduced = reduceReviewedBatchOutcomes(
      reviewed,
      {
        op_batch_001: states[0],
        op_batch_002: states[1],
      },
      '2026-09-05T12:01:00.000Z',
    );

    expect(reduced.state).toBe(expected);
    expect(reduced.outcomes).toEqual({
      op_batch_001: states[0],
      op_batch_002: states[1],
    });
  });

  it('never rolls back a verified member when another member fails', () => {
    const reviewed = buildReviewedBatch({
      batchId: 'batch_reviewed_001',
      lifecycleOperation: 'closeout',
      members,
      authority: { effective: 'user-approved', sourceDigest: 'sha256:policy' },
      createdAt: NOW,
    });
    const partial = reduceReviewedBatchOutcomes(
      reviewed,
      { op_batch_001: 'verified', op_batch_002: 'failed' },
      NOW,
    );

    expect(partial.state).toBe('partial');
    expect(partial.outcomes.op_batch_001).toBe('verified');
  });

  it.each(['verified', 'blocked', 'uncertain', 'partial'] as const)(
    'rejects stale replay after terminal %s outcome',
    (terminal) => {
      const reviewed = buildReviewedBatch({
        batchId: 'batch_reviewed_001',
        lifecycleOperation: 'closeout',
        members,
        authority: {
          effective: 'user-approved',
          sourceDigest: 'sha256:policy',
        },
        createdAt: NOW,
      });
      const terminalBatch = reduceReviewedBatchOutcomes(
        reviewed,
        { op_batch_001: terminal },
        NOW,
      );
      expect(() =>
        reduceReviewedBatchOutcomes(
          terminalBatch,
          { op_batch_001: 'planned' },
          NOW,
        ),
      ).toThrow(/cannot regress/i);
    },
  );
});
