import { describe, expect, it } from 'vitest';

import {
  parseClaudeRuleToCanonical,
  transformCanonicalToClaudeRule,
} from './rule-transform';

describe('Claude rule transforms', () => {
  it('renders glob-scoped rules with paths frontmatter and round-trips', () => {
    const canonical = `---
description: React components
globs:
  - src/components/**/*.tsx
activation: glob
---

# React Components

Use named exports.`;

    const rendered = transformCanonicalToClaudeRule(
      canonical,
      '.agents/rules/react-components.md',
    );

    expect(rendered).toContain('paths:');
    expect(rendered).toContain(
      '<!-- OAT-managed: do not edit directly. Source: .agents/rules/react-components.md -->',
    );
    const roundTripped = parseClaudeRuleToCanonical(rendered);

    expect(roundTripped).not.toContain('description:');
    expect(roundTripped).toBe(`---
globs:
  - src/components/**/*.tsx
activation: glob
---

# React Components

Use named exports.`);
  });

  it('degrades agent-requested rules to always for Claude', () => {
    const canonical = `---
description: Review when asked
activation: agent-requested
---

# Review Rule`;

    const rendered = transformCanonicalToClaudeRule(
      canonical,
      '.agents/rules/review-rule.md',
    );

    expect(rendered.startsWith('---')).toBe(false);
    expect(parseClaudeRuleToCanonical(rendered)).toContain(
      'activation: always',
    );
  });

  it('renders always activation without frontmatter and round-trips to always', () => {
    const canonical = `---
activation: always
---

# Always Rule`;

    const rendered = transformCanonicalToClaudeRule(
      canonical,
      '.agents/rules/always-rule.md',
    );

    expect(rendered.startsWith('---')).toBe(false);
    expect(parseClaudeRuleToCanonical(rendered)).toBe(canonical);
  });
});
