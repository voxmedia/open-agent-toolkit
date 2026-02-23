import { describe, expect, it } from 'vitest';
import { parseCanonicalAgentMarkdown } from './parse';
import { renderCanonicalAgentMarkdown } from './render';

describe('renderCanonicalAgentMarkdown', () => {
  it('renders markdown with frontmatter and body', () => {
    const parsed = parseCanonicalAgentMarkdown(
      `---\nname: oat-review\ndescription: Reviewer\ntools: Read\n---\n\n## Role\nReview.`,
    );
    const rendered = renderCanonicalAgentMarkdown(parsed);

    expect(rendered.startsWith('---\n')).toBe(true);
    expect(rendered).toContain('name: oat-review');
    expect(rendered).toContain('description: Reviewer');
    expect(rendered).toContain('## Role');
  });

  it('preserves x_* extension maps during render', () => {
    const parsed = parseCanonicalAgentMarkdown(
      `---\nname: oat-review\ndescription: Reviewer\nx_codex:\n  sandbox_mode: read-only\n---\n\nBody`,
    );
    const rendered = renderCanonicalAgentMarkdown(parsed);
    const reparsed = parseCanonicalAgentMarkdown(rendered);

    expect(reparsed.extensions).toEqual({
      x_codex: { sandbox_mode: 'read-only' },
    });
    expect(reparsed.body.trim()).toBe('Body');
  });
});
