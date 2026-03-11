import { describe, expect, it } from 'vitest';

import { parseCanonicalRuleMarkdown, stripTrailingOatMarker } from './parse';

describe('parseCanonicalRuleMarkdown', () => {
  it('parses canonical rule frontmatter and body', () => {
    const parsed = parseCanonicalRuleMarkdown(`---
description: React component conventions
globs:
  - src/components/**/*.tsx
activation: glob
---

# React Components

Use named exports.
`);

    expect(parsed).toMatchObject({
      description: 'React component conventions',
      globs: ['src/components/**/*.tsx'],
      activation: 'glob',
      body: '# React Components\n\nUse named exports.',
    });
  });

  it('rejects glob activation without globs', () => {
    expect(() =>
      parseCanonicalRuleMarkdown(`---
activation: glob
---

# Missing globs
`),
    ).toThrow(/globs/i);
  });

  it('strips a trailing OAT marker before parsing provider content', () => {
    const content = `# Rule body

<!-- OAT-managed: do not edit directly. Source: .agents/rules/demo.md -->`;

    expect(stripTrailingOatMarker(content)).toBe('# Rule body');
  });
});
