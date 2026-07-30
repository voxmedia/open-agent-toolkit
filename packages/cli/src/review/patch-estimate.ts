export const NUMSTAT_LINES_PER_TOKEN_DENIAL_FACTOR = 4;
export const PATCH_BYTES_PER_TOKEN = 3;
export const MAX_PATCH_COUNT_BYTES = 64 * 1024 * 1024;

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

export function computePreparationDeadline(
  nowMs: number,
  outerBudgetMs: number | null,
): number {
  if (!Number.isSafeInteger(nowMs) || nowMs < 0) {
    throw new Error('current time must be a non-negative safe integer');
  }
  if (
    outerBudgetMs !== null &&
    (!Number.isSafeInteger(outerBudgetMs) || outerBudgetMs < 0)
  ) {
    throw new Error('outer budget must be a non-negative safe integer');
  }
  const duration =
    outerBudgetMs === null
      ? 30_000
      : Math.min(30_000, Math.max(5_000, Math.floor(outerBudgetMs * 0.1)));
  return nowMs + duration;
}

export type PatchByteEstimate =
  | {
      patchEstimateState: 'exact';
      patchBytes: number;
      patchByteLowerBound: null;
      estimatedPatchTokens: number;
    }
  | {
      patchEstimateState: 'lower-bound';
      patchBytes: null;
      patchByteLowerBound: number;
      estimatedPatchTokens: null;
      stoppedBy: 'byte-cap' | 'deadline';
    };

export async function countPatchBytes(
  source: AsyncIterable<Uint8Array>,
  options: {
    deadlineMs: number;
    now?: () => number;
    maxBytes?: number;
    stop?: () => void;
  },
): Promise<PatchByteEstimate> {
  const now = options.now ?? Date.now;
  const maxBytes = options.maxBytes ?? MAX_PATCH_COUNT_BYTES;
  let bytes = 0;
  for await (const chunk of source) {
    if (now() >= options.deadlineMs) {
      options.stop?.();
      return {
        patchEstimateState: 'lower-bound',
        patchBytes: null,
        patchByteLowerBound: bytes,
        estimatedPatchTokens: null,
        stoppedBy: 'deadline',
      };
    }
    bytes += chunk.byteLength;
    if (bytes >= maxBytes) {
      options.stop?.();
      return {
        patchEstimateState: 'lower-bound',
        patchBytes: null,
        patchByteLowerBound: Math.min(bytes, maxBytes),
        estimatedPatchTokens: null,
        stoppedBy: 'byte-cap',
      };
    }
  }
  return {
    patchEstimateState: 'exact',
    patchBytes: bytes,
    patchByteLowerBound: null,
    estimatedPatchTokens: Math.ceil(bytes / PATCH_BYTES_PER_TOKEN),
  };
}
