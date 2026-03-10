import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { convertAdmonitions } from './codemod';
import { injectFrontmatter } from './frontmatter';

const THIS_DIR = dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = join(THIS_DIR, 'fixtures');

async function readFixture(name: string): Promise<string> {
  return readFile(join(FIXTURES_DIR, name), 'utf8');
}

describe('migrate fixtures', () => {
  it('converts admonitions in real-world patterns', async () => {
    const input = await readFixture('admonitions-input.md');
    const expected = await readFixture('admonitions-expected.md');

    const result = convertAdmonitions(input);

    expect(result.content).toBe(expected);
    expect(result.admonitionsConverted).toBe(6);
  });

  it('injects frontmatter for file without it', async () => {
    const input = await readFixture('frontmatter-input.md');
    const expected = await readFixture('frontmatter-expected.md');

    const result = injectFrontmatter(input, {
      fileName: 'getting-started.md',
    });

    expect(result.content).toBe(expected);
    expect(result.titleInjected).toBe(true);
    expect(result.descriptionSeeded).toBe(true);
  });

  it('handles combined admonition conversion + frontmatter injection', async () => {
    const input = await readFixture('combined-input.md');
    const expected = await readFixture('combined-expected.md');

    // Apply codemod first, then frontmatter — same order as the migrate command
    const codemodResult = convertAdmonitions(input);
    const frontmatterResult = injectFrontmatter(codemodResult.content, {
      fileName: 'api-reference.md',
    });

    expect(frontmatterResult.content).toBe(expected);
    expect(codemodResult.admonitionsConverted).toBe(3);
    expect(frontmatterResult.titleInjected).toBe(false);
    expect(frontmatterResult.descriptionSeeded).toBe(true);
  });

  it('passes through mermaid and code blocks unchanged', async () => {
    const input = await readFixture('admonitions-input.md');
    const result = convertAdmonitions(input);

    // Mermaid block preserved
    expect(result.content).toContain('```mermaid');
    expect(result.content).toContain('graph TD');

    // Code block preserved
    expect(result.content).toContain('```typescript');
    expect(result.content).toContain("host: 'localhost'");
  });
});
