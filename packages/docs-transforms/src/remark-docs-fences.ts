import type { Code, Root, RootContent } from 'mdast';
import type { Plugin } from 'unified';

import { reparseMarkdown } from './reparse.js';

/** How a fence body becomes the figure element's children. */
export type DocsFenceBody = 'markdown' | 'raw';

/**
 * The `docs-*` figure fences, each mapped to the MDX component that renders
 * it and its body mode. `markdown` bodies are reparsed as GFM; `raw` bodies
 * stay one `code` child, so lines such as `# comment` keep their text.
 *
 * This is the single fence-name list: docs-theme's figure components and the
 * CLI's `docs check` rule are verified against it.
 */
export const DOCS_FENCES: Record<
  string,
  { component: string; body: DocsFenceBody }
> = {
  'docs-steps': { component: 'DocsSteps', body: 'markdown' },
  'docs-tree': { component: 'DocsTree', body: 'markdown' },
  'docs-timeline': { component: 'DocsTimeline', body: 'markdown' },
  'docs-terminal': { component: 'DocsTerminal', body: 'raw' },
  'docs-decision': { component: 'DocsDecision', body: 'markdown' },
  'docs-check': { component: 'DocsCheck', body: 'markdown' },
  'docs-compare': { component: 'DocsCompare', body: 'markdown' },
  'docs-annotate': { component: 'DocsAnnotate', body: 'markdown' },
};

const DOCS_FENCE_PREFIX = 'docs-';

// `key="v"`, `key='v'`, `key=v` or a bare `flag`, each a whitespace-separated token.
const META_TOKEN_RE =
  /(?<=^|\s)([A-Za-z_][\w-]*)(?:=(?:"([^"]*)"|'([^']*)'|(\S+)))?(?=\s|$)/g;

interface JsxAttribute {
  type: 'mdxJsxAttribute';
  name: string;
  /** `null` is the JSX boolean shorthand: the component receives `true`. */
  value: string | null;
}

function parseMeta(meta: string | null | undefined): JsxAttribute[] {
  const attributes: JsxAttribute[] = [];
  for (const match of (meta ?? '').matchAll(META_TOKEN_RE)) {
    const [, name, doubleQuoted, singleQuoted, bare] = match;
    attributes.push({
      type: 'mdxJsxAttribute',
      name: name!,
      value: doubleQuoted ?? singleQuoted ?? bare ?? null,
    });
  }
  return attributes;
}

interface Parent {
  children: RootContent[];
}

function figureChildren(node: Code, body: DocsFenceBody): RootContent[] {
  if (body === 'raw') {
    return [
      {
        type: 'code',
        lang: null,
        meta: null,
        value: node.value,
        position: node.position,
      },
    ];
  }
  const start = node.position?.start;
  // The fence body begins on the line after the opening fence, at the
  // fence's own column (container indentation is already removed).
  return reparseMarkdown(
    node.value,
    start ? { line: start.line + 1, column: start.column } : undefined,
  );
}

/**
 * Remark plugin that turns `docs-*` fenced code blocks into `Docs*` MDX JSX
 * flow elements, for example ` ```docs-tree title="App" ` into
 * `<DocsTree title="App">`. Fence meta becomes string attributes; bare flags
 * become `true`. An unknown `docs-*` name fails the file.
 *
 * Runs after `remarkTabs`, so figures inside tab bodies are transformed, and
 * before `remarkLinks`, so links inside figures are normalized.
 */
export const remarkDocsFences: Plugin<[], Root> = function remarkDocsFences() {
  return (tree, file) => {
    const walk = (parent: Parent): void => {
      parent.children.forEach((child, index) => {
        if (child.type !== 'code') {
          if ('children' in child) walk(child as unknown as Parent);
          return;
        }
        if (!child.lang?.startsWith(DOCS_FENCE_PREFIX)) return;

        const entry = Object.hasOwn(DOCS_FENCES, child.lang)
          ? DOCS_FENCES[child.lang]
          : undefined;
        if (!entry) {
          const line = child.position?.start.line;
          // `fail` throws; `return` makes the narrowing explicit for tsc.
          return file.fail(
            `Unknown docs fence \`${child.lang}\`${
              line === undefined ? '' : ` at line ${line}`
            }. Known docs fences: ${Object.keys(DOCS_FENCES).join(', ')}.`,
            { place: child.position, ruleId: 'unknown-docs-fence' },
          );
        }

        parent.children[index] = {
          type: 'mdxJsxFlowElement',
          name: entry.component,
          attributes: parseMeta(child.meta),
          children: figureChildren(child, entry.body),
          position: child.position,
        } as unknown as RootContent;
      });
    };
    walk(tree);
  };
};
