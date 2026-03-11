import { CliError } from '@errors/index';
import { describe, expect, it } from 'vitest';

import {
  parseCopilotRuleToCanonical,
  transformCanonicalToCopilotRule,
} from './rule-transform';

describe('Copilot rule transforms', () => {
  it('renders glob activation with applyTo and round-trips', () => {
    const canonical = `---
description: React components
globs:
  - src/components/**/*.tsx
  - src/components/**/*.ts
activation: glob
---

# React Components`;

    const rendered = transformCanonicalToCopilotRule(
      canonical,
      '.agents/rules/react-components.md',
    );

    expect(rendered).toContain(
      'applyTo: src/components/**/*.tsx,src/components/**/*.ts',
    );
    expect(parseCopilotRuleToCanonical(rendered)).toBe(canonical);
  });

  it('degrades agent-requested rules to always for Copilot', () => {
    const canonical = `---
description: Review when asked
activation: agent-requested
---

# Review Rule`;

    const rendered = transformCanonicalToCopilotRule(
      canonical,
      '.agents/rules/review-rule.md',
    );

    expect(rendered).not.toContain('applyTo:');
    expect(parseCopilotRuleToCanonical(rendered)).toContain(
      'activation: always',
    );
  });

  it('renders always activation without applyTo and round-trips to always', () => {
    const canonical = `---
description: Always apply
activation: always
---

# Always Rule`;

    const rendered = transformCanonicalToCopilotRule(
      canonical,
      '.agents/rules/always-rule.md',
    );

    expect(rendered).not.toContain('applyTo:');
    expect(parseCopilotRuleToCanonical(rendered)).toBe(canonical);
  });

  it('rejects canonical comma-containing globs that Copilot cannot represent', () => {
    const canonical = `---
description: Brace expansion
globs:
  - src/{components,pages}/**/*.tsx
activation: glob
---

# Brace Expansion`;

    expect(() =>
      transformCanonicalToCopilotRule(
        canonical,
        '.agents/rules/brace-expansion.md',
      ),
    ).toThrowError(
      new CliError(
        'Copilot rule applyTo cannot represent globs containing commas: src/{components,pages}/**/*.tsx',
      ),
    );
  });

  it('degrades manual rules to always for Copilot', () => {
    const canonical = `---
description: Run manually
activation: manual
---

# Manual Rule`;

    const rendered = transformCanonicalToCopilotRule(
      canonical,
      '.agents/rules/manual-rule.md',
    );

    expect(rendered).not.toContain('applyTo:');
    expect(parseCopilotRuleToCanonical(rendered)).toContain(
      'activation: always',
    );
  });

  it('rejects ambiguous provider applyTo values with comma-containing globs', () => {
    const provider = `---
description: Brace expansion
applyTo: src/{components,pages}/**/*.tsx
---

# Brace Expansion`;

    expect(() => parseCopilotRuleToCanonical(provider)).toThrowError(
      new CliError(
        'Copilot rule applyTo cannot be losslessly parsed when a glob contains commas: src/{components,pages}/**/*.tsx',
      ),
    );
  });
});
