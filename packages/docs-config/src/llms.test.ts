import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { loader } from 'fumadocs-core/source';
import { server } from 'fumadocs-mdx/runtime/server';
import { expect, it } from 'vitest';

import { createLlmsRoutes } from './llms.js';

// External API provenance: installed core 16.10.2 loader and MDX 14.3.2
// server.docs call shape emitted by actual apps/oat-docs/.source/server.ts.
// Use real runtime getText('raw') filesystem reads, never a mocked text method.
it.each(['/site', '/docs', ''])(
  'serves one loaded Markdown set with real raw-source methods under base %j, independent of sidebar',
  async (basePath) => {
    const root = await mkdtemp(join(tmpdir(), 'oat-llms-'));
    const raw =
      '---\ntitle: Reader\n---\n# Reader\n\n[Source link](other.md)\n';
    try {
      await mkdir(join(root, 'docs'));
      const names = [
        'index.md',
        'unlisted.md',
        'widget.mdx',
        'docs/index.md',
        'docs/guide.md',
        'my guide.md',
      ];
      for (const name of names) await writeFile(join(root, name), raw);
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
        Object.fromEntries(names.map((name) => [name, compiled])),
      );
      const source = loader({ baseUrl: '/', source: docs.toFumadocsSource() });
      const routes = createLlmsRoutes(source, { basePath });
      const index = await routes.index().text();
      expect(index).toContain(
        `Rendered: ${basePath}/\nMarkdown: ${basePath}/llms/content.md`,
      );
      expect(index).toContain(
        `Rendered: ${basePath}/docs/guide/\nMarkdown: ${basePath}/llms/docs/guide/content.md`,
      );
      expect(index).toContain(
        `Rendered: ${basePath}/docs/\nMarkdown: ${basePath}/llms/docs/content.md`,
      );
      expect(index).toContain(
        `Rendered: ${basePath}/my%20guide/\nMarkdown: ${basePath}/llms/my%20guide/content.md`,
      );
      expect(routes.generateStaticParams()).toHaveLength(5);
      expect(routes.generateStaticParams()).toEqual(
        expect.arrayContaining([
          { slug: ['content.md'] },
          { slug: ['unlisted', 'content.md'] },
          { slug: ['docs', 'guide', 'content.md'] },
          { slug: ['my guide', 'content.md'] },
          { slug: ['docs', 'content.md'] },
        ]),
      );
      // Loader slugs are encodeURI values; Next supplies decoded params.
      expect(
        source.getPages().find((page) => page.path === 'my guide.md')?.slugs,
      ).toEqual(['my%20guide']);
      const spaced = await routes.page(['my guide', 'content.md']);
      expect(spaced.status).toBe(200);
      const spacedText = await spaced.text();
      expect(spacedText).toContain(raw);
      expect(spacedText).toContain('Source: my guide.md');
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
  },
);
