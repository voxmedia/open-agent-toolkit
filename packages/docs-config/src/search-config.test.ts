import { describe, expect, it } from 'vitest';

import { createSearchConfig } from './search-config.js';

describe('createSearchConfig', () => {
  it('should return a FlexSearch-based static search config', () => {
    const config = createSearchConfig();

    expect(config.engine).toBe('flexsearch');
    expect(config.type).toBe('static');
  });

  it('should be compatible with Fumadocs static search', () => {
    const config = createSearchConfig();

    // Static search requires client-side indexing
    expect(config.type).toBe('static');
  });
});
