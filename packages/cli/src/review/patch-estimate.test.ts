import { describe, expect, it, vi } from 'vitest';

import {
  computePreparationDeadline,
  countPatchBytes,
  decidePatchCounting,
  MAX_PATCH_COUNT_BYTES,
  NUMSTAT_LINES_PER_TOKEN_DENIAL_FACTOR,
  PATCH_BYTES_PER_TOKEN,
} from './patch-estimate';

describe('decidePatchCounting', () => {
  it('uses the named conservative denial factor', () => {
    expect(NUMSTAT_LINES_PER_TOKEN_DENIAL_FACTOR).toBe(4);
    expect(
      decidePatchCounting({
        additions: 5,
        deletions: 4,
        remainingTokens: 3,
      }),
    ).toEqual({ kind: 'count', numstatTokenDenialEstimate: 3 });
  });

  it('denies missing telemetry without invoking downstream work', () => {
    const counter = vi.fn();
    const result = decidePatchCounting({
      additions: 1,
      deletions: 1,
      remainingTokens: null,
    });
    if (result.kind === 'count') counter();
    expect(result).toMatchObject({
      kind: 'coarse-denied',
      reason: 'missing-context-telemetry',
    });
    expect(counter).not.toHaveBeenCalled();
  });

  it('denies an estimate above the remaining tokens', () => {
    expect(
      decidePatchCounting({
        additions: 400,
        deletions: 4,
        remainingTokens: 100,
      }),
    ).toMatchObject({ kind: 'coarse-denied', reason: 'numstat-denial' });
  });
});

describe('patch byte counting', () => {
  async function* chunks(...sizes: number[]): AsyncIterable<Uint8Array> {
    for (const size of sizes) yield new Uint8Array(size);
  }

  it('returns an exact byte and conservative token estimate', async () => {
    expect(PATCH_BYTES_PER_TOKEN).toBe(3);
    await expect(
      countPatchBytes(chunks(2, 3, 4), { deadlineMs: 100, now: () => 0 }),
    ).resolves.toEqual({
      patchEstimateState: 'exact',
      patchBytes: 9,
      patchByteLowerBound: null,
      estimatedPatchTokens: 3,
    });
  });

  it('returns a lower bound and stops at the byte cap', async () => {
    const stop = vi.fn();
    await expect(
      countPatchBytes(chunks(4, 4), {
        deadlineMs: 100,
        now: () => 0,
        maxBytes: 6,
        stop,
      }),
    ).resolves.toMatchObject({
      patchEstimateState: 'lower-bound',
      patchByteLowerBound: 6,
      stoppedBy: 'byte-cap',
    });
    expect(stop).toHaveBeenCalledOnce();
    expect(MAX_PATCH_COUNT_BYTES).toBe(64 * 1024 * 1024);
  });

  it('returns a lower bound when the deadline terminates streaming', async () => {
    let now = 0;
    await expect(
      countPatchBytes(chunks(3, 3, 3), {
        deadlineMs: 2,
        now: () => now++,
      }),
    ).resolves.toMatchObject({
      patchEstimateState: 'lower-bound',
      patchByteLowerBound: 6,
      stoppedBy: 'deadline',
    });
  });

  it('enforces the wall-clock deadline while the iterator is stalled', async () => {
    const stop = vi.fn(async () => undefined);
    const stalled: AsyncIterable<Uint8Array> = {
      [Symbol.asyncIterator]: () => ({
        next: () => new Promise(() => undefined),
      }),
    };
    const startedAt = Date.now();

    await expect(
      countPatchBytes(stalled, {
        deadlineMs: startedAt + 20,
        stop,
      }),
    ).resolves.toMatchObject({
      patchEstimateState: 'lower-bound',
      patchByteLowerBound: 0,
      stoppedBy: 'deadline',
    });
    expect(Date.now() - startedAt).toBeLessThan(500);
    expect(stop).toHaveBeenCalledOnce();
  });

  it('awaits producer cleanup before returning a lower bound', async () => {
    let cleaned = false;
    await countPatchBytes(chunks(8), {
      deadlineMs: Date.now() + 1_000,
      maxBytes: 4,
      stop: async () => {
        await new Promise((resolve) => setTimeout(resolve, 5));
        cleaned = true;
      },
    });
    expect(cleaned).toBe(true);
  });

  it('computes the bounded preparation deadline', () => {
    expect(computePreparationDeadline(1_000, null)).toBe(31_000);
    expect(computePreparationDeadline(1_000, 1_000)).toBe(6_000);
    expect(computePreparationDeadline(1_000, 100_000)).toBe(11_000);
    expect(computePreparationDeadline(1_000, 1_000_000)).toBe(31_000);
  });
});
