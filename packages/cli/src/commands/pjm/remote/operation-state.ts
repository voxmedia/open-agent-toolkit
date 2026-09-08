export const OPERATION_STATES = [
  'planned',
  'pending',
  'authorized',
  'attempt-started',
  'verification-pending',
  'blocked',
  'verified',
  'partial',
  'uncertain',
  'failed',
  'rejected',
] as const;

export type OperationState = (typeof OPERATION_STATES)[number];

const VALID_TRANSITIONS: Readonly<
  Record<OperationState, ReadonlySet<OperationState>>
> = {
  planned: new Set(['pending', 'authorized', 'blocked', 'failed']),
  pending: new Set(['authorized', 'blocked', 'failed']),
  authorized: new Set(['attempt-started', 'blocked', 'failed']),
  'attempt-started': new Set([
    'verification-pending',
    'partial',
    'uncertain',
    'rejected',
  ]),
  'verification-pending': new Set(['verified', 'partial', 'uncertain']),
  blocked: new Set(),
  verified: new Set(),
  partial: new Set(),
  uncertain: new Set(),
  failed: new Set(),
  rejected: new Set(),
};

const ATTEMPTED_STATES = new Set<OperationState>([
  'attempt-started',
  'verification-pending',
  'verified',
  'partial',
  'uncertain',
  'rejected',
]);
const ADVERSE_STATES = new Set<OperationState>([
  'partial',
  'uncertain',
  'rejected',
  'blocked',
  'failed',
]);

export function transitionRemoteOperation(
  current: OperationState,
  next: OperationState,
  subject: 'parent' | 'substep' = 'parent',
): OperationState {
  if (!VALID_TRANSITIONS[current].has(next)) {
    throw new Error(
      `Invalid remote ${subject} transition from '${current}' to '${next}'.`,
    );
  }
  return next;
}

export interface CompositeSubstepState {
  substepId: string;
  state: OperationState;
}

export interface CompositeOperationStateReduction {
  state: OperationState;
  verifiedSubstepIds: string[];
  continuableSubstepId: string | null;
  retryDisposition:
    | 'not-applicable'
    | 'safe-before-attempt'
    | 'reconcile-required';
}

export function reduceCompositeOperationState(
  substeps: readonly CompositeSubstepState[],
): CompositeOperationStateReduction {
  if (substeps.length === 0) {
    throw new Error('Composite operation reduction requires substeps.');
  }
  const ids = substeps.map((substep) => substep.substepId);
  if (new Set(ids).size !== ids.length) {
    throw new Error('Composite substep IDs must be unique.');
  }
  for (const [index, substep] of substeps.entries()) {
    if (
      index > 0 &&
      ATTEMPTED_STATES.has(substep.state) &&
      substeps
        .slice(0, index)
        .some((dependency) => dependency.state !== 'verified')
    ) {
      throw new Error(
        `Composite substep '${substep.substepId}' attempted before its dependency verified.`,
      );
    }
  }

  const verifiedSubstepIds = substeps
    .filter((substep) => substep.state === 'verified')
    .map((substep) => substep.substepId);
  const allVerified = verifiedSubstepIds.length === substeps.length;
  if (allVerified) {
    return {
      state: 'verified',
      verifiedSubstepIds,
      continuableSubstepId: null,
      retryDisposition: 'not-applicable',
    };
  }

  const states = new Set(substeps.map((substep) => substep.state));
  let state: OperationState;
  if (
    states.has('partial') ||
    (verifiedSubstepIds.length > 0 &&
      substeps.some((substep) => ADVERSE_STATES.has(substep.state)))
  ) {
    state = 'partial';
  } else if (states.has('uncertain')) {
    state = 'uncertain';
  } else if (states.has('rejected')) {
    state = 'rejected';
  } else if (states.has('verification-pending')) {
    state = 'verification-pending';
  } else if (states.has('attempt-started')) {
    state = 'attempt-started';
  } else if (states.has('failed')) {
    state = 'failed';
  } else if (states.has('blocked')) {
    state = 'blocked';
  } else {
    const next = firstContinuableSubstep(substeps);
    state = next?.state ?? 'planned';
  }

  const reconcileRequired =
    state === 'partial' ||
    state === 'uncertain' ||
    state === 'rejected' ||
    state === 'attempt-started' ||
    state === 'verification-pending';
  const continuable = reconcileRequired
    ? null
    : (firstContinuableSubstep(substeps)?.substepId ?? null);

  return {
    state,
    verifiedSubstepIds,
    continuableSubstepId: continuable,
    retryDisposition: reconcileRequired
      ? 'reconcile-required'
      : continuable
        ? 'safe-before-attempt'
        : 'not-applicable',
  };
}

function firstContinuableSubstep(
  substeps: readonly CompositeSubstepState[],
): CompositeSubstepState | null {
  for (const [index, substep] of substeps.entries()) {
    if (substep.state === 'verified') continue;
    if (
      !['planned', 'pending', 'authorized'].includes(substep.state) ||
      substeps
        .slice(0, index)
        .some((dependency) => dependency.state !== 'verified')
    ) {
      return null;
    }
    return substep;
  }
  return null;
}
