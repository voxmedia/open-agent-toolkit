import { describe, expect, it } from 'vitest';

import { renderCanonicalRuleMarkdown } from './render';

describe('renderCanonicalRuleMarkdown', () => {
  it('renders canonical rule markdown with stable frontmatter', () => {
    const rendered = renderCanonicalRuleMarkdown(
      {
        activation: 'glob',
        description: 'React component conventions',
        globs: ['src/components/**/*.tsx', 'src/components/**/*.ts'],
      },
      '# React Components\n\nUse named exports.\n',
    );

    expect(rendered).toContain('description: React component conventions');
    expect(rendered).toContain('activation: glob');
    expect(rendered).toContain('- src/components/**/*.tsx');
    expect(rendered).toContain('# React Components');
  });
});
