import { posix as path } from 'node:path';

import type { InlineCode, Link, Root } from 'mdast';
import type { Plugin } from 'unified';
import { visit } from 'unist-util-visit';

/**
 * Strip markdown extension and collapse `/index` from a relative path.
 * Returns null if the path is not a markdown link that should be rewritten.
 */
function cleanMdPath(raw: string): string | null {
  const extension = raw.endsWith('.mdx')
    ? '.mdx'
    : raw.endsWith('.md')
      ? '.md'
      : null;
  if (!extension) return null;

  let cleaned = raw.slice(0, -extension.length);

  if (cleaned.endsWith('/index')) {
    cleaned = cleaned.slice(0, -'/index'.length) || '.';
  }
  if (cleaned === 'index') {
    cleaned = '.';
  }

  return cleaned;
}

function normalizeFsPath(raw: string): string {
  return raw.replaceAll('\\', '/');
}

function docsRelativeFilePath(filePath: string): string | null {
  const normalized = normalizeFsPath(filePath);
  const marker = '/docs/';
  const index = normalized.lastIndexOf(marker);
  if (index === -1) return null;

  return normalized.slice(index + marker.length);
}

function routePathFromDocsFile(filePath: string): string | null {
  const cleaned = cleanMdPath(filePath);
  if (cleaned === null) return null;
  if (cleaned === '.') return '/';

  return path.normalize(`/${cleaned}`);
}

/**
 * Append a trailing slash to the path portion of a rewritten URL so it works
 * on static hosts (e.g., S3) where pages live at `<route>/index.html` and
 * `/foo` returns 403 — only `/foo/` resolves the index file. Skips URLs
 * whose last segment looks like a file with an extension (e.g., `.png`),
 * URLs that already end in `/`, and empty paths. Preserves any `#fragment`
 * or `?query` suffix.
 *
 * Assumes markdown slugs are dot-free (kebab-case). A page named
 * `release-1.0.md` would rewrite to `./release-1.0` and be treated as an
 * asset by the extension check, leaving it without a trailing slash.
 */
function appendTrailingSlash(url: string): string {
  const suffixIndex = url.search(/[#?]/);
  const pathPortion = suffixIndex >= 0 ? url.slice(0, suffixIndex) : url;
  const suffix = suffixIndex >= 0 ? url.slice(suffixIndex) : '';

  if (!pathPortion || pathPortion.endsWith('/')) return url;

  const lastSegment = pathPortion.slice(pathPortion.lastIndexOf('/') + 1);
  if (/\.[^.]+$/.test(lastSegment)) return url;

  return `${pathPortion}/${suffix}`;
}

function resolveRelativeDocsLink(
  sourceFilePath: string,
  targetPath: string,
): string | null {
  const sourceDocsFile = docsRelativeFilePath(sourceFilePath);
  if (!sourceDocsFile) return null;

  const targetDocsFile = path
    .normalize(path.join('/', path.dirname(sourceDocsFile), targetPath))
    .slice(1);

  const currentRoute = routePathFromDocsFile(sourceDocsFile);
  const targetRoute = routePathFromDocsFile(targetDocsFile);
  if (!currentRoute || !targetRoute) return null;

  const relativeRoute = path.relative(currentRoute, targetRoute) || '.';
  return relativeRoute.startsWith('.') ? relativeRoute : `./${relativeRoute}`;
}

/**
 * Remark plugin that rewrites source-relative markdown links to routed,
 * extensionless URLs that still work once pages are emitted with trailing
 * slashes.
 *
 * URL rewriting:
 * - `quickstart.md` from `docs/index.md` → `./quickstart/`
 * - `documentation/commands.md` from `docs/guide/cli-reference.md`
 *   → `../documentation/commands/`
 * - `../reference/index.md` from `docs/guide/concepts.md` → `../../reference/`
 * - `quickstart.md#setup` → `./quickstart/#setup`
 * - Absolute URLs and anchors are left unchanged.
 *
 * Display text cleanup:
 * - When a link's only child is an `inlineCode` node whose value looks like
 *   a `.md` path (e.g., `` [`cli/index.md`](cli/index.md) ``), the extension
 *   is stripped from the display text too, keeping the raw markdown AI-navigable
 *   while rendering clean labels on the web.
 */
export const remarkLinks: Plugin<[], Root> = function remarkLinks() {
  return (tree: Root, file?: { path?: string }) => {
    visit(tree, 'link', (node: Link) => {
      const { url } = node;

      // Skip absolute URLs, protocol links, and pure anchors
      if (/^[a-z]+:/i.test(url) || url.startsWith('#')) {
        return;
      }

      // Split off any anchor fragment or query string
      const suffixIndex = url.search(/[#?]/);
      const urlPath = suffixIndex >= 0 ? url.slice(0, suffixIndex) : url;
      const fragment = suffixIndex >= 0 ? url.slice(suffixIndex) : '';

      const cleaned = cleanMdPath(urlPath);

      if (cleaned !== null) {
        const rewrittenPath =
          typeof file?.path === 'string'
            ? (resolveRelativeDocsLink(file.path, urlPath) ?? cleaned)
            : cleaned;

        const prefix =
          rewrittenPath.startsWith('.') || rewrittenPath.startsWith('/')
            ? ''
            : './';
        node.url = prefix + rewrittenPath + fragment;

        // Clean display text when it's a single inlineCode child with a .md path
        const firstChild = node.children[0];
        if (node.children.length === 1 && firstChild?.type === 'inlineCode') {
          const code = firstChild as InlineCode;
          const cleanedText = cleanMdPath(code.value);
          if (cleanedText !== null) {
            code.value = cleanedText;
          }
        }
      }

      node.url = appendTrailingSlash(node.url);
    });
  };
};
