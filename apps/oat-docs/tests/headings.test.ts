import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import { validateDocumentHeadings } from '@docs-tools/validate';

// Synthetic Markdown inputs exercise our document contract, not an external schema.
for (const extension of ['md', 'mdx']) {
  for (const [name, markdown, count] of [
    ['zero', '## Section\n', 0],
    ['one', '# Title\n\n## Section\n', 1],
    ['two', '# Title\n\n# Another title\n', 2],
    [
      'frontmatter and code',
      '---\ntitle: Title\nexample: |\n  # Metadata\n---\n# Title\n\n```markdown\n# Example\n```\n\n    # Indented code\n\n`# Inline code`\n',
      1,
    ],
    ['Setext', 'Title\n=====\n\nSection\n-------\n', 1],
    ['nested blockquote', '# Title\n\n> # Quoted heading\n', 2],
    ['nested list', '# Title\n\n- Item\n\n  # List heading\n', 2],
  ] as const) {
    test(`document H1 count: ${name}.${extension}`, async () => {
      const root = await mkdtemp(join(tmpdir(), 'oat-docs-headings-'));
      const page = join(root, `${name}.${extension}`);
      try {
        await writeFile(page, markdown);
        if (count === 1) await validateDocumentHeadings(root);
        else
          await assert.rejects(
            validateDocumentHeadings(root),
            (error: unknown) => {
              assert.ok(error instanceof Error);
              assert.ok(error.message.includes(page));
              assert.ok(error.message.includes(`found ${count}`));
              return true;
            },
          );
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    });
  }
}
