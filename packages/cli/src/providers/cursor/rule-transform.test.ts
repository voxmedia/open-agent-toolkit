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
});
