import { describe, expect, it, vi } from 'vitest';

import {
  decidePatchCounting,
  NUMSTAT_LINES_PER_TOKEN_DENIAL_FACTOR,
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
