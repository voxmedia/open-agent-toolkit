import { describe, expect, it } from 'vitest';

import {
  buildVerificationRequestDigest,
  verifyRemotePostconditions,
  type PostconditionVerificationInput,
} from './verification';

const exactInput: PostconditionVerificationInput = {
  operationId: 'op_operation_123',
  requested: {
    fieldMask: ['title', 'priority'],
    expected: { title: 'Updated title', priority: 'high' },
  },
  providerOutcome: 'accepted',
  commandExitCode: 0,
  revisionEvidence: {
    attemptedRevisionDigest: 'sha256:before',
    readbackBaseRevisionDigest: 'sha256:before',
  },
  readback: {
    values: { title: 'Updated title', priority: 'high' },
    unavailableFields: [],
  },
  priorVerification: null,
};

describe('verifyRemotePostconditions', () => {
  it('verifies exact authoritative read-back for the requested field mask', () => {
    const result = verifyRemotePostconditions(exactInput);
    expect(result.classification).toBe('verified');
    expect(result.fields.map((field) => field.status)).toEqual([
      'verified',
      'verified',
    ]);
    expect(result.retryDisposition).toBe('not-applicable');
    expect(result.requiresReconciliation).toBe(false);
  });

  it('classifies a mixed read-back as partial and blocks retry', () => {
    const result = verifyRemotePostconditions({
      ...exactInput,
      readback: {
        values: { title: 'Updated title', priority: 'medium' },
        unavailableFields: [],
      },
    });
    expect(result.classification).toBe('partial');
    expect(result.fields.map((field) => field.status)).toEqual([
      'verified',
      'mismatch',
    ]);
    expect(result.retryDisposition).toBe('reconcile-required');
  });

  it('preserves an authoritative provider rejection as rejected', () => {
    const result = verifyRemotePostconditions({
      ...exactInput,
      providerOutcome: 'rejected',
      readback: null,
    });
    expect(result).toMatchObject({
      classification: 'rejected',
      reason: 'provider-rejected',
      retryDisposition: 'not-applicable',
    });
  });

  it('treats ambiguous provider evidence as uncertain', () => {
    const result = verifyRemotePostconditions({
      ...exactInput,
      providerOutcome: 'ambiguous',
    });
    expect(result).toMatchObject({
      classification: 'uncertain',
      reason: 'ambiguous-provider-outcome',
      retryDisposition: 'reconcile-required',
    });
  });

  it('does not accept command exit alone when authoritative read-back is missing', () => {
    const result = verifyRemotePostconditions({
      ...exactInput,
      commandExitCode: 0,
      readback: null,
    });
    expect(result).toMatchObject({
      classification: 'uncertain',
      reason: 'missing-readback',
      requiresReconciliation: true,
    });
  });

  it('makes unavailable requested fields partial or uncertain rather than successful', () => {
    const result = verifyRemotePostconditions({
      ...exactInput,
      readback: {
        values: { title: 'Updated title' },
        unavailableFields: ['priority'],
      },
    });
    expect(result.classification).toBe('partial');
    expect(result.fields[1]?.status).toBe('unavailable');
    expect(result.requiresReconciliation).toBe(true);
  });

  it('treats revision drift as uncertain even when requested values match', () => {
    const result = verifyRemotePostconditions({
      ...exactInput,
      revisionEvidence: {
        attemptedRevisionDigest: 'sha256:before',
        readbackBaseRevisionDigest: 'sha256:other-writer',
      },
    });
    expect(result).toMatchObject({
      classification: 'uncertain',
      reason: 'revision-drift',
      retryDisposition: 'reconcile-required',
    });
  });

  it('recognizes matching durable verification and never repeats the effect', () => {
    const requestDigest = buildVerificationRequestDigest(exactInput);
    const result = verifyRemotePostconditions({
      ...exactInput,
      readback: null,
      priorVerification: {
        requestDigest,
        classification: 'verified',
      },
    });
    expect(result).toMatchObject({
      classification: 'already-verified',
      reason: 'durable-verification-match',
      retryDisposition: 'not-applicable',
    });
  });
});
