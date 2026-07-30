import { describe, expect, it } from 'vitest';

import { normalizeReviewPath, normalizeReviewPaths } from './review-paths';

describe('review path normalization', () => {
  it('normalizes separators and sorts paths', () => {
    expect(normalizeReviewPaths(['z\\file.ts', './a//file.ts'])).toEqual([
      'a/file.ts',
      'z/file.ts',
    ]);
    expect(normalizeReviewPath('a/b/../c.ts')).toBe('a/c.ts');
  });

  it.each(['', '/', '/tmp/a', 'C:\\tmp\\a', '\\\\host\\share', '..', '../a'])(
    'rejects unsafe path %j',
    (path) => expect(() => normalizeReviewPath(path)).toThrow(),
  );

  it('rejects NUL and duplicate normalized paths', () => {
    expect(() => normalizeReviewPath('a\0b')).toThrow();
    expect(() => normalizeReviewPaths(['a/b', 'a\\b'])).toThrow(/duplicate/);
  });
});
