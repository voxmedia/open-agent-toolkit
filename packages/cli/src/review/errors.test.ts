import { describe, expect, it } from 'vitest';

import {
  classifyReviewBoundaryError,
  mapReviewBoundaryErrors,
  ReviewDomainError,
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
});
