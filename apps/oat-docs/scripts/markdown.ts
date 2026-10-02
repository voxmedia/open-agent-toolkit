import Slugger from 'github-slugger';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import { unified } from 'unified';

interface MarkdownNode {
  type: string;
  value?: string;
  url?: string;
  identifier?: string;
  children?: MarkdownNode[];
}

function headingText(node: MarkdownNode): string {
  if (node.children) return node.children.map(headingText).join('');
  return node.value ?? '';
}

export function markdownAnchors(markdown: string): Set<string> {
  const tree = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .parse(markdown.replace(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/, ''));
  const slugger = new Slugger();
  const anchors = new Set<string>();
  function visit(node: MarkdownNode): void {
    if (node.type === 'heading') {
      const last = node.children?.at(-1);
      const custom =
        last?.type === 'text' && last.value
          ? /\s*\[#([^]+?)]\s*$/.exec(last.value)
          : null;
      anchors.add(custom?.[1] ?? slugger.slug(headingText(node)));
      return;
    }
    node.children?.forEach(visit);
  }
  visit(tree);
  return anchors;
}

export function decodeMarkdownFragment(
  fragment: string,
  href: string,
  source: string,
): string {
  try {
    return decodeURIComponent(fragment);
  } catch (error) {
    throw new Error(
      `Malformed fragment "${fragment}" in Markdown link "${href}" from ${source}; use valid percent encoding`,
      { cause: error },
    );
  }
}

export function markdownInlineCode(markdown: string): string[] {
  const tree = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .parse(markdown.replace(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/, ''));
  const values: string[] = [];
  function visit(node: MarkdownNode): void {
    if (node.type === 'inlineCode') values.push(node.value ?? '');
    node.children?.forEach(visit);
  }
  visit(tree);
  return values;
}

export function markdownLinkTargets(markdown: string): string[] {
  const tree = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .parse(markdown.replace(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/, ''));
  const definitions = new Map<string, string>();
  function collectDefinitions(node: MarkdownNode): void {
    if (
      node.type === 'definition' &&
      node.identifier !== undefined &&
      node.url !== undefined &&
      !definitions.has(node.identifier)
    )
      definitions.set(node.identifier, node.url);
    node.children?.forEach(collectDefinitions);
  }
  collectDefinitions(tree);
  const targets: string[] = [];
  function visit(node: MarkdownNode): void {
    if (
      (node.type === 'link' || node.type === 'image') &&
      node.url !== undefined
    )
      targets.push(node.url);
    else if (
      (node.type === 'linkReference' || node.type === 'imageReference') &&
      node.identifier !== undefined
    ) {
      const target = definitions.get(node.identifier);
      if (target !== undefined) targets.push(target);
    }
    node.children?.forEach(visit);
  }
  visit(tree);
  return targets;
}
