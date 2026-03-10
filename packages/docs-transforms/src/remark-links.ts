import type { InlineCode, Link, Root } from 'mdast';
import type { Plugin } from 'unified';
import { visit } from 'unist-util-visit';

/**
 * Strip `.md` extension and collapse `/index` from a relative path.
 * Returns null if the path is not a `.md` link that should be rewritten.
 */
function cleanMdPath(raw: string): string | null {
  if (!raw.endsWith('.md')) return null;

  let cleaned = raw.slice(0, -3);

  if (cleaned.endsWith('/index')) {
    cleaned = cleaned.slice(0, -'/index'.length) || '.';
  }
  if (cleaned === 'index') {
    cleaned = '.';
  }

  return cleaned;
}

/**
 * Remark plugin that rewrites relative `.md` links to extensionless paths
 * for Fumadocs routing.
 *
 * URL rewriting:
 * - `quickstart.md` → `./quickstart`
 * - `cli/index.md` → `./cli`
 * - `../reference/index.md` → `../reference`
 * - Absolute URLs and anchors are left unchanged.
 *
 * Display text cleanup:
 * - When a link's only child is an `inlineCode` node whose value looks like
 *   a `.md` path (e.g., `` [`cli/index.md`](cli/index.md) ``), the extension
 *   is stripped from the display text too, keeping the raw markdown AI-navigable
 *   while rendering clean labels on the web.
 */
export const remarkLinks: Plugin<[], Root> = function remarkLinks() {
  return (tree: Root) => {
    visit(tree, 'link', (node: Link) => {
      const { url } = node;

      // Skip absolute URLs, protocol links, and pure anchors
      if (/^[a-z]+:/i.test(url) || url.startsWith('#')) {
        return;
      }

      // Split off any anchor fragment
      const hashIndex = url.indexOf('#');
      const path = hashIndex >= 0 ? url.slice(0, hashIndex) : url;
      const fragment = hashIndex >= 0 ? url.slice(hashIndex) : '';

      const cleaned = cleanMdPath(path);
      if (cleaned === null) return;

      // Rewrite URL
      const prefix =
        cleaned.startsWith('.') || cleaned.startsWith('/') ? '' : './';
      node.url = prefix + cleaned + fragment;

      // Clean display text when it's a single inlineCode child with a .md path
      const firstChild = node.children[0];
      if (node.children.length === 1 && firstChild?.type === 'inlineCode') {
        const code = firstChild as InlineCode;
        const cleanedText = cleanMdPath(code.value);
        if (cleanedText !== null) {
          code.value = cleanedText;
        }
      }
    });
  };
};
