import { describe, expect, it } from 'vitest';

import { slugify } from './slug';

describe('slugify', () => {
  it('turns a title into a lowercase ASCII slug', () => {
    expect(slugify('Streaming Cache Layer')).toBe('streaming-cache-layer');
  });

  it('normalizes accented characters', () => {
    expect(slugify('Café déjà vu')).toBe('cafe-deja-vu');
  });

  it('collapses punctuation and whitespace runs', () => {
    expect(slugify('  ---Hello!!!  World??  ')).toBe('hello-world');
  });

  it('is idempotent for an already-clean slug', () => {
    expect(slugify('streaming-cache-layer')).toBe('streaming-cache-layer');
  });

  it('truncates to at most 30 characters at the last whole-word boundary', () => {
    // Words sum to 34 chars; the longest <=30 prefix stops before "design".
    expect(slugify('adopt the new pjm reference design')).toBe(
      'adopt-the-new-pjm-reference',
    );
  });

  it('keeps a boundary that lands exactly at 30 characters', () => {
    // "abcdef-ghijkl-mnopqr-stuvwx-yz" is exactly 30 chars on a word boundary.
    expect(slugify('abcdef ghijkl mnopqr stuvwx yz extra')).toBe(
      'abcdef-ghijkl-mnopqr-stuvwx-yz',
    );
  });

  it('never cuts a word mid-token when truncating', () => {
    // "supercalifragilistic" (20) + "-expialidocious" would exceed 30, so the
    // second word is dropped entirely rather than cut.
    expect(slugify('supercalifragilistic expialidocious')).toBe(
      'supercalifragilistic',
    );
  });

  it('hard-truncates a first word that alone exceeds 30 characters', () => {
    expect(slugify('a'.repeat(40))).toBe('a'.repeat(30));
  });

  it('hard-truncates an over-long first word even with later words', () => {
    expect(slugify(`${'b'.repeat(40)} tail`)).toBe('b'.repeat(30));
  });

  it('strips a single trailing stop-word', () => {
    expect(slugify('adopt the new plan for')).toBe('adopt-the-new-plan');
  });

  it('strips chained trailing stop-words', () => {
    expect(slugify('refactor the api as a')).toBe('refactor-the-api');
  });

  it('does not strip stop-words that are not trailing', () => {
    expect(slugify('the cache of records')).toBe('the-cache-of-records');
  });

  it('falls back to untitled for empty output', () => {
    expect(slugify('')).toBe('untitled');
    expect(slugify('?! --')).toBe('untitled');
  });

  it('falls back to untitled when only stop-words remain', () => {
    expect(slugify('the and of')).toBe('untitled');
  });
});
