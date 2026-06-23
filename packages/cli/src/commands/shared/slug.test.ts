import { describe, expect, it } from 'vitest';

import { slugify } from './slug';

describe('slugify', () => {
  it('turns a title into a lowercase ASCII slug', () => {
    expect(slugify('Streaming Cache Layer')).toBe('streaming-cache-layer');
  });

  it('normalizes accented characters', () => {
    expect(slugify('Cafe\u0301 de\u0301ja\u0300 vu')).toBe('cafe-deja-vu');
  });

  it('collapses punctuation and whitespace runs', () => {
    expect(slugify('  ---Hello!!!  World??  ')).toBe('hello-world');
  });

  it('is idempotent for an already-clean slug', () => {
    expect(slugify('streaming-cache-layer')).toBe('streaming-cache-layer');
  });

  it('truncates to 48 characters', () => {
    expect(slugify('a'.repeat(60))).toBe('a'.repeat(48));
  });

  it('trims a trailing separator after truncation', () => {
    expect(slugify(`${'a'.repeat(47)} b`)).toBe('a'.repeat(47));
  });

  it('falls back to untitled for empty output', () => {
    expect(slugify('')).toBe('untitled');
    expect(slugify('?! --')).toBe('untitled');
  });
});
