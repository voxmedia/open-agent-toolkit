import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { loader } from 'fumadocs-core/source';
import { server } from 'fumadocs-mdx/runtime/server';
import { expect, it } from 'vitest';

import { createLlmsRoutes } from './llms.js';

// External API provenance: installed core 16.10.2 loader and MDX 14.3.2
// server.docs call shape emitted by actual apps/oat-docs/.source/server.ts.
// Use real runtime getText('raw') filesystem reads, never a mocked text method.
it('serves one loaded Markdown set with real raw-source methods, independent of sidebar', async () => {
  const root = await mkdtemp(join(tmpdir(), 'oat-llms-'));
  const raw = '---\ntitle: Reader\n---\n# Reader\n\n[Source link](other.md)\n';
  try {
    for (const name of ['index.md', 'unlisted.md', 'widget.mdx'])
      await writeFile(join(root, name), raw);
    const compiled = {
      default: () => null,
      frontmatter: { title: 'Reader', description: 'Raw Markdown control' },
      toc: [],
      structuredData: { headings: [], contents: [] },
    };
    const docs = await server().docs(
      'docs',
      root,
      { 'meta.json': { pages: ['index'] } },
      {
        'index.md': compiled,
        'unlisted.md': compiled,
        'widget.mdx': compiled,
      },
    );
    const source = loader({ baseUrl: '/', source: docs.toFumadocsSource() });
    const routes = createLlmsRoutes(source, { basePath: '/site' });
    expect(routes.generateStaticParams()).toEqual([
      { slug: ['content.md'] },
      { slug: ['unlisted', 'content.md'] },
    ]);
    const index = await routes.index().text();
    expect(index).toContain(
      'Rendered: /site/\nMarkdown: /site/llms/content.md',
    );
    expect(index).toContain('Source: unlisted.md');
    expect(index).not.toContain('Source: widget.mdx');
    const page = await routes.page(['unlisted', 'content.md']);
    expect(page.status).toBe(200);
    expect(await page.text()).toMatch(
      new RegExp(`${raw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`),
    );
    expect(await (await routes.full()).text()).toContain(raw);
    for (const slug of [
      ['missing', 'content.md'],
      ['widget', 'content.md'],
      ['unlisted'],
    ]) {
      expect((await routes.page(slug)).status).toBe(404);
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
