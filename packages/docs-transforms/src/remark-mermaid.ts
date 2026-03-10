import type { Code, Root } from 'mdast';
import type { Plugin } from 'unified';
import { visit } from 'unist-util-visit';

/**
 * Remark plugin that transforms fenced code blocks with `lang: "mermaid"`
 * into `<Mermaid chart="...">` MDX JSX elements.
 *
 * Paired with the `Mermaid` component from `@oat/docs-theme` for client-side rendering.
 */
export const remarkMermaid: Plugin<[], Root> = function remarkMermaid() {
  return (tree: Root) => {
    visit(tree, 'code', (node: Code, index, parent) => {
      if (node.lang !== 'mermaid' || index === undefined || !parent) {
        return;
      }

      const jsxNode = {
        type: 'mdxJsxFlowElement' as const,
        name: 'Mermaid',
        attributes: [
          {
            type: 'mdxJsxAttribute' as const,
            name: 'chart',
            value: node.value,
          },
        ],
        children: [],
        data: { _mdxExplicitJsx: true },
      };

      (parent.children as unknown[])[index] = jsxNode;
    });
  };
};
