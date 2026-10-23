import { remarkTabs } from '@open-agent-toolkit/docs-transforms';
import Slugger from 'github-slugger';
import { parseFragment } from 'parse5';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import { unified } from 'unified';
import YAML from 'yaml';

export interface MarkdownNode {
  type: string;
  name?: string;
  value?: string;
  depth?: number;
  url?: string;
  alt?: string;
  identifier?: string;
  lang?: string | null;
  children?: MarkdownNode[];
  position?: {
    start: { line: number; column: number; offset?: number };
    end: { line: number; column: number; offset?: number };
  };
}
export interface PageLink {
  href: string;
  line: number;
  image: boolean;
  alt?: string;
  html?: boolean;
  describedBy?: string;
}
export interface ParsedPage {
  path: string;
  source: string;
  body: string;
  frontmatter: Record<string, unknown>;
  frontmatterError?: string;
  nodes: MarkdownNode[];
  anchors: Set<string>;
  links: PageLink[];
  text: string;
}
export function nodeText(node: MarkdownNode): string {
  return node.children
    ? node.children.map(nodeText).join('')
    : (node.value ?? '');
}
interface HtmlNode {
  nodeName: string;
  value?: string;
  attrs?: Array<{ name: string; value: string }>;
  childNodes?: HtmlNode[];
  sourceCodeLocation?: { startLine: number };
}
export function htmlNodes(html: string): HtmlNode[] {
  const nodes: HtmlNode[] = [];
  const walk = (n: HtmlNode): void => {
    nodes.push(n);
    n.childNodes?.forEach(walk);
  };
  walk(parseFragment(html, { sourceCodeLocationInfo: true }) as HtmlNode);
  return nodes;
}
export function attributes(node: HtmlNode): Record<string, string> {
  return Object.fromEntries(node.attrs?.map((a) => [a.name, a.value]) ?? []);
}
export function parsePage(path: string, source: string): ParsedPage {
  let body = source;
  let frontmatter: Record<string, unknown> = {};
  let frontmatterError: string | undefined;
  const match = /^(?:\uFEFF)?---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(
    source,
  );
  if (match) {
    // Preserve physical positions for both AST and Contents diagnostics.
    body = match[0].replace(/[^\r\n]/g, ' ') + source.slice(match[0].length);
    try {
      const doc = YAML.parseDocument(match[1]!);
      if (doc.errors.length)
        frontmatterError = `Invalid YAML frontmatter: ${doc.errors[0]!.message}`;
      else {
        const data: unknown = doc.toJS();
        if (typeof data !== 'object' || data === null || Array.isArray(data))
          frontmatterError = 'Frontmatter must be a YAML mapping';
        else frontmatter = data as Record<string, unknown>;
      }
    } catch (error) {
      frontmatterError = `Invalid YAML frontmatter: ${(error as Error).message}`;
    }
  }
  const processor = unified().use(remarkParse).use(remarkGfm).use(remarkTabs);
  const tree = processor.runSync(processor.parse(body), {
    value: body,
  }) as MarkdownNode;
  const nodes: MarkdownNode[] = [];
  const walk = (node: MarkdownNode): void => {
    nodes.push(node);
    node.children?.forEach(walk);
  };
  walk(tree);
  const definitions = new Map<string, string>();
  for (const n of nodes)
    if (
      n.type === 'definition' &&
      n.identifier &&
      n.url &&
      !definitions.has(n.identifier)
    )
      definitions.set(n.identifier, n.url);
  const anchors = new Set<string>();
  const slugger = new Slugger();
  const links: PageLink[] = [];
  for (const n of nodes) {
    const line = n.position?.start.line ?? 1;
    if (n.type === 'heading') {
      const text = nodeText(n);
      const custom = /\s*(?:\[#([^\]]+)\]|\{#([^}]+)\})\s*$/.exec(text);
      anchors.add(custom?.[1] ?? custom?.[2] ?? slugger.slug(text));
    }
    if (['link', 'image', 'linkReference', 'imageReference'].includes(n.type)) {
      const href = n.url ?? definitions.get(n.identifier ?? '');
      if (href !== undefined)
        links.push({
          href,
          line,
          image: n.type.startsWith('image'),
          alt: n.alt,
        });
    }
    if (n.type === 'html')
      for (const element of htmlNodes(n.value ?? '')) {
        const a = attributes(element);
        if (a.id) anchors.add(a.id);
        if (element.nodeName === 'a' && a.name) anchors.add(a.name);
        if (element.nodeName === 'a' && a.href)
          links.push({
            href: a.href,
            image: false,
            html: true,
            line: line + (element.sourceCodeLocation?.startLine ?? 1) - 1,
          });
        if (element.nodeName === 'img' && a.src)
          links.push({
            href: a.src,
            alt: a.alt,
            image: true,
            html: true,
            describedBy: a['aria-describedby'],
            line: line + (element.sourceCodeLocation?.startLine ?? 1) - 1,
          });
      }
  }
  return {
    path,
    source,
    body,
    frontmatter,
    ...(frontmatterError ? { frontmatterError } : {}),
    nodes,
    anchors,
    links,
    text: nodes
      .filter((n) => n.type === 'text')
      .map((n) => n.value ?? '')
      .join(' '),
  };
}
