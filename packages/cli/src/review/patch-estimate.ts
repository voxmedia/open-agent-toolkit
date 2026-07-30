export const NUMSTAT_LINES_PER_TOKEN_DENIAL_FACTOR = 4;

export type PatchCountingDecision =
  | {
      kind: 'count';
      numstatTokenDenialEstimate: number;
    }
  | {
      kind: 'coarse-denied';
      reason: 'missing-context-telemetry' | 'numstat-denial';
      numstatTokenDenialEstimate: number;
    };

export function decidePatchCounting(input: {
  additions: number;
  deletions: number;
  remainingTokens: number | null;
}): PatchCountingDecision {
  for (const value of [input.additions, input.deletions]) {
    if (!Number.isSafeInteger(value) || value < 0) {
      throw new Error('numstat counts must be non-negative safe integers');
    }
  }
  const numstatTokenDenialEstimate = Math.ceil(
    (input.additions + input.deletions) / NUMSTAT_LINES_PER_TOKEN_DENIAL_FACTOR,
  );
  if (input.remainingTokens === null) {
    return {
      kind: 'coarse-denied',
      reason: 'missing-context-telemetry',
      numstatTokenDenialEstimate,
    };
  }
  if (
    !Number.isSafeInteger(input.remainingTokens) ||
    input.remainingTokens < 0
  ) {
    throw new Error('remaining tokens must be a non-negative safe integer');
  }
  if (numstatTokenDenialEstimate > input.remainingTokens) {
    return {
      kind: 'coarse-denied',
      reason: 'numstat-denial',
      numstatTokenDenialEstimate,
    };
  }
  return { kind: 'count', numstatTokenDenialEstimate };
}
