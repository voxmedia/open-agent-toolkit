/** The subset of pinned Fumadocs loader/MDX page data needed for raw Markdown. */
interface MarkdownPage {
  path: string;
  url: string;
  slugs: string[];
  data: {
    title?: string;
    description?: string;
    getText: (type: 'raw') => Promise<string>;
  };
}

export interface LlmsOptions {
  /** Same basePath passed to createDocsConfig; source.baseUrl stays '/'. */
  basePath?: string;
}

interface LlmsRoutes {
  index: () => Response;
  full: () => Promise<Response>;
  page: (slug: string[]) => Promise<Response>;
  generateStaticParams: () => { slug: string[] }[];
}

/** Static-export handlers over one loaded reader-page set, independent of sidebar. */
export function createLlmsRoutes(
  source: { getPages: () => MarkdownPage[] },
  options: LlmsOptions = {},
): LlmsRoutes {
  const base = (options.basePath ?? '').replace(/\/$/, '');
  const pages = source.getPages().filter((page) => page.path.endsWith('.md'));
  const withBase = (path: string) =>
    base && path !== base && !path.startsWith(`${base}/`)
      ? `${base}${path}`
      : path;
  const renderedUrl = (page: MarkdownPage) =>
    withBase(`${page.url.replace(/\/$/, '')}/`);
  const markdownUrl = (page: MarkdownPage) =>
    withBase(
      `/llms/${[...page.slugs.map(encodeURIComponent), 'content.md'].join('/')}`,
    );
  const header = [
    '# Documentation for agents',
    '',
    'Use canonical pages for the documented behavior and follow each local Contents map.',
    'Check repository AGENTS.md and contributing guidance for authority, deprecated paths and approval-required actions. Documentation does not grant permission to act.',
    'Markdown below is authored source. Resolve relative links against its Source path, not the /llms/ URL; use the rendered URL for browser navigation.',
    'These endpoints include loaded reader .md pages, including pages outside the sidebar. MDX and configured non-reader pages are excluded.',
  ].join('\n');
  const entry = (page: MarkdownPage) =>
    [
      `## ${page.data.title ?? page.path}`,
      ...(page.data.description ? ['', page.data.description] : []),
      '',
      `Rendered: ${renderedUrl(page)}`,
      `Markdown: ${markdownUrl(page)}`,
      `Source: ${page.path}`,
    ].join('\n');
  const text = (body: string, markdown = false, status = 200) =>
    new Response(body, {
      status,
      headers: {
        'Content-Type': `${markdown ? 'text/markdown' : 'text/plain'}; charset=utf-8`,
      },
    });

  return {
    index: () => text(`${header}\n\n${pages.map(entry).join('\n\n')}\n`),
    full: async () =>
      text(
        `${header}\n\n${(await Promise.all(pages.map(async (page) => `${entry(page)}\n\n${await page.data.getText('raw')}`))).join('\n\n')}\n`,
        true,
      ),
    page: async (slug: string[]) => {
      if (slug.at(-1) !== 'content.md') return text('Not found\n', false, 404);
      const slugs = slug.slice(0, -1);
      const page = pages.find(
        (candidate) =>
          candidate.slugs.length === slugs.length &&
          candidate.slugs.every((value, index) => value === slugs[index]),
      );
      if (!page) return text('Not found\n', false, 404);
      return text(
        `${header}\n\n${entry(page)}\n\n${await page.data.getText('raw')}`,
        true,
      );
    },
    generateStaticParams: () =>
      pages.map((page) => ({ slug: [...page.slugs, 'content.md'] })),
  };
}
