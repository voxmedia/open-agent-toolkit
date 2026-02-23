import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parseCanonicalAgentFile, parseCanonicalAgentMarkdown } from './parse';

function repoFilePath(relativePath: string): string {
  return fileURLToPath(
    new URL(`../../../../../${relativePath}`, import.meta.url),
  );
}

describe('parseCanonicalAgentMarkdown', () => {
  it('parses required and optional top-level fields', () => {
    const parsed = parseCanonicalAgentMarkdown(
      `---\nname: oat-review\ndescription: Reviewer\ntools: Read, Bash\nmodel: gpt-5\nreadonly: true\ncolor: cyan\n---\n\n## Role\nReview.`,
    );

    expect(parsed.name).toBe('oat-review');
    expect(parsed.description).toBe('Reviewer');
    expect(parsed.tools).toBe('Read, Bash');
    expect(parsed.model).toBe('gpt-5');
    expect(parsed.readonly).toBe(true);
    expect(parsed.color).toBe('cyan');
    expect(parsed.body).toContain('## Role');
  });

  it('preserves x_* extensions', () => {
    const parsed = parseCanonicalAgentMarkdown(
      `---\nname: oat-review\ndescription: Reviewer\nx_codex:\n  sandbox_mode: read-only\n---\n\nBody`,
    );

    expect(parsed.extensions).toEqual({
      x_codex: { sandbox_mode: 'read-only' },
    });
    expect(parsed.frontmatter.x_codex).toEqual({ sandbox_mode: 'read-only' });
  });

  it('rejects invalid name values', () => {
    expect(() => {
      parseCanonicalAgentMarkdown(
        `---\nname: "invalid name"\ndescription: Nope\n---\n\nBody`,
      );
    }).toThrow(/must match/);
  });

  it('rejects missing required fields', () => {
    expect(() => {
      parseCanonicalAgentMarkdown(`---\nname: oat-review\n---\n\nBody`);
    }).toThrow(/description/);
  });
});

describe('parseCanonicalAgentFile', () => {
  it('parses existing oat-reviewer canonical file', async () => {
    const reviewerFile = repoFilePath('.agents/agents/oat-reviewer.md');
    const parsed = await parseCanonicalAgentFile(reviewerFile);

    expect(parsed.name).toBe('oat-reviewer');
    expect(parsed.description.length).toBeGreaterThan(0);
    expect(parsed.color).toBe('yellow');
    expect(parsed.body).toContain('## Role');
  });

  it('parses existing oat-codebase-mapper canonical file', async () => {
    const mapperFile = repoFilePath('.agents/agents/oat-codebase-mapper.md');
    const parsed = await parseCanonicalAgentFile(mapperFile);

    expect(parsed.name).toBe('oat-codebase-mapper');
    expect(parsed.description.length).toBeGreaterThan(0);
    expect(parsed.color).toBe('cyan');
    expect(parsed.body).toContain('## Role');
  });

  it('round-trips existing files without losing markdown body content', async () => {
    const reviewerFile = repoFilePath('.agents/agents/oat-reviewer.md');
    const source = await readFile(reviewerFile, 'utf8');
    const parsed = await parseCanonicalAgentFile(reviewerFile);

    expect(source).toContain(parsed.body.trim().slice(0, 32));
  });
});
