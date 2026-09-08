import { describe, expect, it } from 'vitest';

import {
  OPERATION_STATES,
  reduceCompositeOperationState,
  transitionRemoteOperation,
  type OperationState,
} from './operation-state';

const validTransitions: Record<OperationState, OperationState[]> = {
  planned: ['pending', 'authorized', 'blocked', 'failed'],
  pending: ['authorized', 'blocked', 'failed'],
  authorized: ['attempt-started', 'blocked', 'failed'],
  'attempt-started': [
    'verification-pending',
    'partial',
    'uncertain',
    'rejected',
  ],
  'verification-pending': ['verified', 'partial', 'uncertain'],
  blocked: [],
  verified: [],
  partial: [],
  uncertain: [],
  failed: [],
  rejected: [],
};

describe('transitionRemoteOperation', () => {
  it.each(['parent', 'substep'] as const)(
    'accepts every declared %s transition and rejects every other edge',
    (subject) => {
      for (const current of OPERATION_STATES) {
        for (const next of OPERATION_STATES) {
          if (validTransitions[current].includes(next)) {
            expect(transitionRemoteOperation(current, next, subject)).toBe(
              next,
            );
          } else {
            expect(() =>
              transitionRemoteOperation(current, next, subject),
            ).toThrow(/invalid.*transition/i);
          }
        }
      }
    },
  );
});

describe('reduceCompositeOperationState', () => {
  it('reduces all verified substeps to verified', () => {
    expect(
      reduceCompositeOperationState([
        { substepId: 'step_annotation_123', state: 'verified' },
        { substepId: 'step_transition_123', state: 'verified' },
      ]),
    ).toEqual({
      state: 'verified',
      verifiedSubstepIds: ['step_annotation_123', 'step_transition_123'],
      continuableSubstepId: null,
      retryDisposition: 'not-applicable',
    });
  });

  it.each([
    ['uncertain', 'uncertain'],
    ['partial', 'partial'],
    ['rejected', 'rejected'],
    ['blocked', 'blocked'],
    ['failed', 'failed'],
  ] as const)(
    'reduces one unverified %s substep safely',
    (stepState, parentState) => {
      expect(
        reduceCompositeOperationState([
          { substepId: 'step_annotation_123', state: stepState },
        ]),
      ).toMatchObject({
        state: parentState,
        continuableSubstepId: null,
      });
    },
  );

  it('marks a verified effect plus a later adverse sibling partial and never repeats it', () => {
    const result = reduceCompositeOperationState([
      { substepId: 'step_annotation_123', state: 'verified' },
      { substepId: 'step_transition_123', state: 'failed' },
    ]);

    expect(result).toEqual({
      state: 'partial',
      verifiedSubstepIds: ['step_annotation_123'],
      continuableSubstepId: null,
      retryDisposition: 'reconcile-required',
    });
  });

  it('continues only the first never-attempted substep whose dependencies verified', () => {
    expect(
      reduceCompositeOperationState([
        { substepId: 'step_annotation_123', state: 'verified' },
        { substepId: 'step_transition_123', state: 'authorized' },
      ]),
    ).toEqual({
      state: 'authorized',
      verifiedSubstepIds: ['step_annotation_123'],
      continuableSubstepId: 'step_transition_123',
      retryDisposition: 'safe-before-attempt',
    });
  });

  it('rejects duplicate IDs and out-of-order attempted dependencies', () => {
    expect(() =>
      reduceCompositeOperationState([
        { substepId: 'step_duplicate_123', state: 'verified' },
        { substepId: 'step_duplicate_123', state: 'planned' },
      ]),
    ).toThrow(/unique/i);
    expect(() =>
      reduceCompositeOperationState([
        { substepId: 'step_annotation_123', state: 'authorized' },
        { substepId: 'step_transition_123', state: 'attempt-started' },
      ]),
    ).toThrow(/dependency/i);
  });
});
