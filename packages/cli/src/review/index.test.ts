import { REVIEW_CONTRACT_VERSION } from '@review/index';
import { describe, expect, it } from 'vitest';

describe('review runtime boundary', () => {
  it('exports the versioned review contract through the review alias', () => {
    expect(REVIEW_CONTRACT_VERSION).toBe(1);
  });
});
