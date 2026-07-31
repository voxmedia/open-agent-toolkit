import { describe, expect, it } from 'vitest';

import {
  classifyReviewBoundaryError,
  deserializeReviewError,
  mapReviewBoundaryErrors,
  ReviewDomainError,
  serializeReviewError,
} from './errors';

describe('review boundary errors', () => {
  it('classifies expected expiry and capability rejections', () => {
    expect(
      classifyReviewBoundaryError(new Error('validation state has expired')),
    ).toMatchObject({
      category: 'validation',
      code: 'validation-state-expired',
    });
    expect(
      classifyReviewBoundaryError(
        new Error('invalid or consumed checkpoint capability'),
      ),
    ).toMatchObject({
      category: 'contract',
      code: 'command-capability-rejected',
    });
  });

  it('preserves typed and unknown failures without inventing classifications', async () => {
    const domain = new ReviewDomainError({
      category: 'validation',
      code: 'known',
      message: 'safe',
    });
    expect(classifyReviewBoundaryError(domain)).toBe(domain);
    const system = new Error('private filesystem path');
    expect(classifyReviewBoundaryError(system)).toBe(system);
    await expect(
      mapReviewBoundaryErrors(async () => {
        throw new Error('validation state has expired');
      }),
    ).rejects.toMatchObject({ code: 'validation-state-expired' });
  });

  it('round-trips strict domain envelopes and redacts runtime failures', () => {
    const domain = new ReviewDomainError({
      category: 'validation',
      code: 'plan-receipt-expired',
      message: 'plan receipt has expired',
      details: { retryable: false },
    });
    const envelope = serializeReviewError(domain);
    expect(envelope).toEqual({
      schemaVersion: 1,
      category: 'validation',
      code: 'plan-receipt-expired',
      message: 'plan receipt has expired',
      details: { retryable: false },
    });
    expect(deserializeReviewError(envelope)).toMatchObject({
      name: 'ReviewDomainError',
      category: 'validation',
      code: 'plan-receipt-expired',
      details: { retryable: false },
    });
    expect(
      serializeReviewError(new Error('/private/state.json failed')),
    ).toEqual({
      schemaVersion: 1,
      category: 'system',
      code: 'validation-authority-broker-system-error',
      message: 'validation authority broker failed unexpectedly',
      details: null,
    });
  });

  it('rejects malformed broker error envelopes', () => {
    for (const malformed of [
      null,
      {
        schemaVersion: 2,
        category: 'validation',
        code: 'expired',
        message: 'expired',
        details: null,
      },
      {
        schemaVersion: 1,
        category: 'validation',
        code: 'expired',
        message: 'expired',
        details: null,
        unknown: true,
      },
      {
        schemaVersion: 1,
        category: 'private',
        code: 'expired',
        message: 'expired',
        details: null,
      },
    ]) {
      expect(() => deserializeReviewError(malformed)).toThrow(
        /error envelope is invalid/,
      );
    }
  });
});
