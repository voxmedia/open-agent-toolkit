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

  it('names the file when frontmatter is missing', () => {
    expect(() =>
      parseCanonicalRuleMarkdown('# No frontmatter\n', '.agents/rules/bare.md'),
    ).toThrow(
      'Rule markdown in .agents/rules/bare.md must include YAML frontmatter.',
    );
  });

  it('names the file when activation is invalid', () => {
    expect(() =>
      parseCanonicalRuleMarkdown(
        `---
activation: sometimes
---

# Bad activation
`,
        '.agents/rules/bad.md',
      ),
    ).toThrow(/"activation" in \.agents\/rules\/bad\.md must be one of/);
  });

  describe('alwaysApply alias', () => {
    // Provenance: GitHub issue #316 reports that `argent init` writes
    // `.agents/rules/argent.md` with Cursor-style frontmatter carrying
    // `description` plus `alwaysApply: true` and no `activation`.
    const argentRule = `---
description: Argent agent guidance
alwaysApply: true
---

# Argent
`;

    it('parses description plus alwaysApply: true as activation always', () => {
      const parsed = parseCanonicalRuleMarkdown(
        argentRule,
        '.agents/rules/argent.md',
      );

      expect(parsed).toMatchObject({
        activation: 'always',
        description: 'Argent agent guidance',
        globs: undefined,
        frontmatter: {
          activation: 'always',
          description: 'Argent agent guidance',
        },
      });
    });

    it.each([
      ['null', 'globs:\n'],
      ['an empty string', 'globs: ""\n'],
    ])('ignores Cursor-style globs given as %s', (_label, globsLine) => {
      const parsed = parseCanonicalRuleMarkdown(
        `---
description: Argent agent guidance
${globsLine}alwaysApply: true
---

# Argent
`,
        '.agents/rules/argent.md',
      );

      expect(parsed.activation).toBe('always');
      expect(parsed.globs).toBeUndefined();
    });

    it('rejects a non-empty Cursor-style globs string and names the file', () => {
      expect(() =>
        parseCanonicalRuleMarkdown(
          `---
description: Argent agent guidance
globs: src/**/*.ts
alwaysApply: true
---

# Argent
`,
          '.agents/rules/argent.md',
        ),
      ).toThrow(/\.agents\/rules\/argent\.md/);
    });

    it('lets an explicit activation win over alwaysApply', () => {
      const parsed = parseCanonicalRuleMarkdown(
        `---
description: Ask first
alwaysApply: true
activation: agent-requested
---

# Ask
`,
        '.agents/rules/ask.md',
      );

      expect(parsed.activation).toBe('agent-requested');
    });

    it.each([['false'], ['"true"'], ['1']])(
      'keeps alwaysApply: %s without activation an activation error naming the file',
      (value) => {
        expect(() =>
          parseCanonicalRuleMarkdown(
            `---
description: Not always
alwaysApply: ${value}
---

# Not always
`,
            '.agents/rules/not-always.md',
          ),
        ).toThrow(
          /"activation" in \.agents\/rules\/not-always\.md must be one of/,
        );
      },
    );
  });

  it('strips a trailing OAT marker before parsing provider content', () => {
    const content = `# Rule body

<!-- OAT-managed: do not edit directly. Source: .agents/rules/demo.md -->`;

    expect(stripTrailingOatMarker(content)).toBe('# Rule body');
  });
});
