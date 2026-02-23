import { describe, expect, it } from 'vitest';
import {
  exportMarkdownAgentRecord,
  importMarkdownAgentRecord,
} from './markdown-agent-codec';

describe('markdown-agent-codec', () => {
  it('imports markdown records into canonical documents', () => {
    const agent = importMarkdownAgentRecord({
      provider: 'claude',
      identifier: 'oat-reviewer',
      content: `---\nname: oat-reviewer\ndescription: Reviewer\n---\n\nBody`,
    });

    expect(agent.name).toBe('oat-reviewer');
    expect(agent.description).toBe('Reviewer');
    expect(agent.body.trim()).toBe('Body');
  });

  it('exports canonical documents to markdown provider records', () => {
    const imported = importMarkdownAgentRecord({
      provider: 'cursor',
      identifier: 'oat-reviewer',
      content: `---\nname: oat-reviewer\ndescription: Reviewer\n---\n\nBody`,
    });
    const exported = exportMarkdownAgentRecord(
      'cursor',
      'oat-reviewer',
      imported,
    );

    expect(exported.provider).toBe('cursor');
    expect(exported.identifier).toBe('oat-reviewer');
    expect(exported.content).toContain('name: oat-reviewer');
    expect(exported.content).toContain('Body');
  });
});
