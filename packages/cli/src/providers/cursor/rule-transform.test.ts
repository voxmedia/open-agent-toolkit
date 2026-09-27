import { describe, expect, it } from 'vitest';

import {
  parseCursorRuleToCanonical,
  transformCanonicalToCursorRule,
} from './rule-transform';

describe('Cursor rule transforms', () => {
  it('renders always activation with alwaysApply: true', () => {
    const canonical = `---
description: Always apply
activation: always
---

# Always`;

    const rendered = transformCanonicalToCursorRule(
      canonical,
      '.agents/rules/always.md',
    );

    expect(rendered).toContain('alwaysApply: true');
    expect(rendered).not.toContain('globs:');
    expect(parseCursorRuleToCanonical(rendered)).toBe(canonical);
  });

  it('renders glob activation with globs and round-trips', () => {
    const canonical = `---
description: React components
globs:
  - src/components/**/*.tsx
activation: glob
---

# React Components`;

    const rendered = transformCanonicalToCursorRule(
      canonical,
      '.agents/rules/react-components.md',
    );

    expect(rendered).toContain('alwaysApply: false');
    expect(rendered).toContain('globs:');
    expect(parseCursorRuleToCanonical(rendered)).toBe(canonical);
  });

  it('renders agent-requested activation as description plus alwaysApply false', () => {
    const canonical = `---
description: Ask before applying
activation: agent-requested
---

# Ask First`;

    const rendered = transformCanonicalToCursorRule(
      canonical,
      '.agents/rules/ask-first.md',
    );

    expect(rendered).toContain('alwaysApply: false');
    expect(rendered).not.toContain('globs:');
    expect(parseCursorRuleToCanonical(rendered)).toBe(canonical);
  });

  it('renders manual activation without frontmatter and round-trips', () => {
    const canonical = `---
activation: manual
---

# Manual Rule`;

    const rendered = transformCanonicalToCursorRule(
      canonical,
      '.agents/rules/manual.md',
    );

    expect(rendered.startsWith('---')).toBe(false);
    expect(parseCursorRuleToCanonical(rendered)).toBe(canonical);
  });

  it('names the canonical file in parse errors', () => {
    expect(() =>
      transformCanonicalToCursorRule(
        `---
activation: sometimes
---

# Bad`,
        '.agents/rules/bad.md',
      ),
    ).toThrow(/\.agents\/rules\/bad\.md/);
    expect(() =>
      transformCanonicalToCursorRule('# Bare', '.agents/rules/bare.md'),
    ).toThrow(/\.agents\/rules\/bare\.md/);
    expect(() =>
      transformCanonicalToCursorRule(
        `---
activation: sometimes
---

# Bad`,
        '.agents/rules/bad.md',
      ),
    ).not.toThrow(/<inline>/);
  });

  it('renders an alwaysApply: true rule without activation as always', () => {
    // Provenance: GitHub issue #316 (\`argent init\` writes this shape).
    const rendered = transformCanonicalToCursorRule(
      `---
description: Argent agent guidance
alwaysApply: true
---

# Argent`,
      '.agents/rules/argent.md',
    );

    expect(rendered).toContain('# Argent');
    expect(rendered).toContain('alwaysApply: true');
  });
});
