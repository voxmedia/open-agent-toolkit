import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { upsertAgentsMdSection } from './agents-md';

describe('upsertAgentsMdSection', () => {
  let root: string;

  afterEach(async () => {
    if (root) {
      await rm(root, { recursive: true, force: true });
    }
  });

  async function setup(existingContent?: string): Promise<string> {
    root = await mkdtemp(join(tmpdir(), 'agents-md-test-'));
    if (existingContent !== undefined) {
      await writeFile(join(root, 'AGENTS.md'), existingContent, 'utf8');
    }
    return root;
  }

  async function readAgentsMd(): Promise<string> {
    return readFile(join(root, 'AGENTS.md'), 'utf8');
  }

  it('creates AGENTS.md with the section when file does not exist', async () => {
    await setup();

    const result = await upsertAgentsMdSection(
      root,
      'docs',
      '## Docs\nPath: docs/',
    );

    expect(result.action).toBe('created');
    const content = await readAgentsMd();
    expect(content).toBe(
      '<!-- OAT docs -->\n## Docs\nPath: docs/\n<!-- END OAT docs -->\n',
    );
  });

  it('appends section to existing AGENTS.md without markers', async () => {
    await setup('# My Project\n\nSome content.\n');

    const result = await upsertAgentsMdSection(
      root,
      'docs',
      '## Docs\nPath: docs/',
    );

    expect(result.action).toBe('updated');
    const content = await readAgentsMd();
    expect(content).toBe(
      '# My Project\n\nSome content.\n\n<!-- OAT docs -->\n## Docs\nPath: docs/\n<!-- END OAT docs -->\n',
    );
  });

  it('replaces existing section content when markers are present', async () => {
    await setup(
      '# Header\n\n<!-- OAT docs -->\nold content\n<!-- END OAT docs -->\n\n# Footer\n',
    );

    const result = await upsertAgentsMdSection(root, 'docs', 'new content');

    expect(result.action).toBe('updated');
    const content = await readAgentsMd();
    expect(content).toBe(
      '# Header\n\n<!-- OAT docs -->\nnew content\n<!-- END OAT docs -->\n\n# Footer\n',
    );
  });

  it('returns no-change when content is identical', async () => {
    await setup(
      '# Header\n\n<!-- OAT docs -->\nsame content\n<!-- END OAT docs -->\n',
    );

    const result = await upsertAgentsMdSection(root, 'docs', 'same content');

    expect(result.action).toBe('no-change');
  });

  it('handles different section keys independently', async () => {
    await setup('<!-- OAT docs -->\ndocs section\n<!-- END OAT docs -->\n');

    const result = await upsertAgentsMdSection(
      root,
      'workflows',
      'workflows section',
    );

    expect(result.action).toBe('updated');
    const content = await readAgentsMd();
    expect(content).toContain('<!-- OAT docs -->');
    expect(content).toContain('<!-- OAT workflows -->');
    expect(content).toContain('docs section');
    expect(content).toContain('workflows section');
  });

  it('appends with double newline when file does not end with newline', async () => {
    await setup('# Header');

    const result = await upsertAgentsMdSection(root, 'docs', 'content');

    expect(result.action).toBe('updated');
    const content = await readAgentsMd();
    expect(content).toBe(
      '# Header\n\n<!-- OAT docs -->\ncontent\n<!-- END OAT docs -->\n',
    );
  });
});
