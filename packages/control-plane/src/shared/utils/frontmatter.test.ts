import { describe, expect, it } from 'vitest';

import { extractFrontmatter, parseFrontmatterRecord } from './frontmatter';

describe('frontmatter utils', () => {
  it('extracts frontmatter content from markdown', () => {
    expect(
      extractFrontmatter(`---
oat_status: complete
---
# Artifact
`),
    ).toBe('oat_status: complete');
  });

  it('parses YAML frontmatter into a record and falls back on malformed input', () => {
    expect(
      parseFrontmatterRecord(`---
oat_status: complete
oat_template: false
---
`),
    ).toEqual({
      oat_status: 'complete',
      oat_template: false,
    });

    expect(
      parseFrontmatterRecord(`---
oat_status: [unterminated
---
`),
    ).toEqual({});
  });
});
