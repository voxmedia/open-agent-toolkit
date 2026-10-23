import { execFile } from 'node:child_process';
import { readFile, readdir } from 'node:fs/promises';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { promisify } from 'node:util';

import { DOCS_CHECK_THRESHOLDS } from '@config/documentation-check';

import type { Report } from './check.types';
import {
  containedFile,
  inside,
  posix,
  present,
  type CheckTarget,
} from './files';
import {
  attributes,
  htmlNodes,
  parsePage,
  type MarkdownNode,
  type ParsedPage,
} from './markdown';
import { parseMermaid } from './mermaid-runtime';

const exec = promisify(execFile);
async function git(target: CheckTarget, args: string[]): Promise<string> {
  return (
    await exec('git', ['-C', target.repoRoot, ...args], {
      maxBuffer: 16 * 1024 * 1024,
    })
  ).stdout;
}
function sourceDiagrams(page: ParsedPage): MarkdownNode[] {
  return page.nodes.filter(
    (n) => n.type === 'code' && n.lang?.toLowerCase() === 'mermaid',
  );
}
function imageFile(
  target: CheckTarget,
  page: ParsedPage,
  href: string,
): { root: string; path: string } | undefined {
  if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(href)) return undefined;
  let decoded: string;
  try {
    decoded = decodeURIComponent(href.split(/[?#]/)[0]!);
  } catch {
    return undefined;
  }
  const root = decoded.startsWith('/')
    ? join(target.appRoot, 'public')
    : target.contentRoot;
  const path = decoded.startsWith('/')
    ? resolve(root, `.${decoded}`)
    : resolve(target.contentRoot, dirname(page.path), decoded);
  return inside(root, path) ? { root, path } : undefined;
}
function diagramSection(
  page: ParsedPage,
  node: MarkdownNode,
  tabsOnly = true,
): { start: number; end: number } {
  const line = node.position?.start.line ?? 1;
  const tabs = page.nodes
    .filter(
      (n) =>
        n.name === 'Tabs' &&
        (n.position?.start.line ?? Infinity) <= line &&
        (n.position?.end.line ?? 0) >= line,
    )
    .at(-1);
  if (tabsOnly && tabs?.position)
    return { start: tabs.position.start.line, end: tabs.position.end.line + 1 };
  // The containing authored section (and nested tab group) owns association;
  // diagrams in another heading never satisfy this diagram's pair contract.
  const headings = page.nodes.filter(
    (n) => n.type === 'heading' && (n.depth ?? 7) <= 3,
  );
  const before = headings
    .filter((n) => (n.position?.start.line ?? 1) < line)
    .at(-1);
  const after = headings.find(
    (n) =>
      (n.position?.start.line ?? 1) > line &&
      (n.depth ?? 7) <= (before?.depth ?? 3),
  );
  return {
    start: before?.position?.start.line ?? 1,
    end: after?.position?.start.line ?? Infinity,
  };
}
export async function checkDiagrams(
  target: CheckTarget,
  pages: ParsedPage[],
  report: Report,
): Promise<void> {
  const altMax =
    target.documentation.check?.thresholds?.altMax ??
    DOCS_CHECK_THRESHOLDS.altMax;
  const assets = new Map<string, { root: string; path: string }>();
  const associations: Array<{
    page: ParsedPage;
    node: MarkdownNode;
    pairs: string[];
  }> = [];
  for (const page of pages) {
    for (const image of page.links.filter((l) => l.image)) {
      const alt = image.alt?.trim() ?? '';
      const slug = basename(image.href)
        .replace(/\.[^.]+$/, '')
        .replace(/[-_]/g, ' ')
        .toLowerCase();
      if (
        !alt ||
        alt.length > altMax ||
        !/\s/.test(alt) ||
        alt.toLowerCase().replace(/[-_]/g, ' ') === slug
      )
        report(
          'image-alt',
          'warn',
          page.path,
          `Image alt text is empty, filename/slug-like or longer than ${altMax} characters.`,
          image.line,
        );
      const asset = imageFile(target, page, image.href);
      if (!asset || !/\.svg$/i.test(asset.path)) continue;
      if (
        /(?:^|[\\/])diagrams[\\/]/.test(asset.path) ||
        /-(light|dark)\.svg$/.test(asset.path)
      )
        assets.set(asset.path, asset);
      if (/-(light|dark)\.svg$/.test(asset.path)) {
        const other = asset.path.replace(
          /-(light|dark)\.svg$/,
          (_, theme: string) => `-${theme === 'light' ? 'dark' : 'light'}.svg`,
        );
        const referenced = page.links.some(
          (l) => l.image && imageFile(target, page, l.href)?.path === other,
        );
        if (!referenced)
          report(
            'diagram-pairs',
            'error',
            page.path,
            `Diagram must reference both light and dark SVGs: ${basename(asset.path)}.`,
            image.line,
          );
      }
      const section = diagramSection(
        page,
        {
          type: 'image',
          position: {
            start: { line: image.line, column: 1 },
            end: { line: image.line, column: 1 },
          },
        },
        false,
      );
      const description = page.nodes.some(
        (n) =>
          n.type === 'paragraph' &&
          (n.position?.start.line ?? 0) >= section.start &&
          (n.position?.end.line ?? Infinity) < section.end &&
          n.children?.some((c) => c.type === 'text' && c.value?.trim()),
      );
      const associated = image.describedBy
        ?.split(/\s+/)
        .some((id) => page.anchors.has(id));
      if (assets.has(asset.path) && !description && !associated)
        report(
          'diagram-accessibility',
          'warn',
          page.path,
          'Rendered diagram needs page-visible explanatory text or an associated HTML long description; SVG desc alone is insufficient.',
          image.line,
        );
    }
    for (const node of sourceDiagrams(page)) {
      const line = node.position?.start.line ?? 1;
      try {
        await parseMermaid(node.value ?? '');
      } catch (error) {
        report(
          'mermaid',
          'error',
          page.path,
          `Invalid Mermaid: ${(error as Error).message}`,
          line,
        );
      }
      if (
        !/^\s*accTitle\s*:/m.test(node.value ?? '') ||
        !/^\s*accDescr\s*(?::|\{)/m.test(node.value ?? '')
      )
        report(
          'mermaid',
          'warn',
          page.path,
          'Mermaid needs accTitle and accDescr for accessibility.',
          line,
        );
      const section = diagramSection(page, node);
      const pairs = page.links
        .filter(
          (l) => l.image && l.line >= section.start && l.line < section.end,
        )
        .map((l) => imageFile(target, page, l.href)?.path)
        .filter((p): p is string => !!p && /-(light|dark)\.svg$/.test(p));
      if (pairs.length) associations.push({ page, node, pairs });
    }
  }
  // Inspect only conventional diagram directories or explicit paired refs;
  // ordinary SVG logos remain ordinary assets.
  for (const root of [join(target.appRoot, 'public'), target.contentRoot]) {
    const diagrams = join(root, 'diagrams');
    if (!(await present(diagrams))) continue;
    const walk = async (dir: string): Promise<void> => {
      for (const entry of await readdir(dir, { withFileTypes: true })) {
        const path = join(dir, entry.name);
        if (entry.isDirectory()) await walk(path);
        else if (entry.isFile() && path.endsWith('.svg'))
          assets.set(path, { root, path });
      }
    };
    await walk(diagrams);
  }
  for (const { root, path } of assets.values()) {
    const label = posix(relative(target.contentRoot, path));
    if (!(await containedFile(root, path))) {
      report(
        'diagram-pairs',
        'error',
        label,
        'Referenced diagram SVG does not exist inside its asset root.',
      );
      continue;
    }
    if (/-(light|dark)\.svg$/.test(path)) {
      const sibling = path.replace(
        /-(light|dark)\.svg$/,
        (_, theme: string) => `-${theme === 'light' ? 'dark' : 'light'}.svg`,
      );
      if (!(await containedFile(root, sibling)))
        report(
          'diagram-pairs',
          'error',
          label,
          'Diagram SVG is missing its light/dark sibling.',
        );
    }
    const nodes = htmlNodes(await readFile(path, 'utf8'));
    const svg = nodes.find((n) => n.nodeName === 'svg');
    const title = nodes.find(
      (n) =>
        n.nodeName === 'title' && n.childNodes?.some((c) => c.value?.trim()),
    );
    const desc = nodes.find(
      (n) =>
        n.nodeName === 'desc' && n.childNodes?.some((c) => c.value?.trim()),
    );
    if (!svg || attributes(svg).role !== 'img' || !title || !desc)
      report(
        'diagram-accessibility',
        'error',
        label,
        'Diagram SVG requires role="img", a nonempty title and desc.',
      );
  }
  if (!associations.length) return;
  const base = target.documentation.check?.diagramBaseRef ?? 'origin/main';
  try {
    const mergeBase = (await git(target, ['merge-base', 'HEAD', base])).trim();
    const committed = (
      await git(target, ['diff', '--name-only', '-z', mergeBase, 'HEAD', '--'])
    ).split('\0');
    const working = (
      await git(target, ['diff', '--name-only', '-z', 'HEAD', '--'])
    ).split('\0');
    const untracked = (
      await git(target, [
        'ls-files',
        '--others',
        '--exclude-standard',
        '-z',
        '--',
      ])
    ).split('\0');
    const changed = new Set([...committed, ...working, ...untracked]);
    for (const { page, node, pairs } of associations) {
      const sourcePath = posix(
        relative(target.repoRoot, join(target.contentRoot, page.path)),
      );
      if (!changed.has(sourcePath)) continue;
      let old: ParsedPage | undefined;
      try {
        old = parsePage(
          page.path,
          await git(target, ['show', `${mergeBase}:${sourcePath}`]),
        );
      } catch {
        /* new page */
      }
      const current = sourceDiagrams(page).map((n) => n.value);
      const previous = old ? sourceDiagrams(old).map((n) => n.value) : [];
      const index = sourceDiagrams(page).indexOf(node);
      if (current[index] === previous[index] || previous.includes(node.value))
        continue;
      if (
        pairs.some(
          (path) => !changed.has(posix(relative(target.repoRoot, path))),
        )
      )
        report(
          'diagram-freshness',
          'warn',
          page.path,
          'Mermaid source changed without both associated SVGs in the same committed/working-tree change.',
          node.position?.start.line,
        );
    }
  } catch {
    report(
      'diagram-freshness',
      'warn',
      'index.md',
      `Diagram diff check unverified: no usable Git merge base for "${base}"; static checks still ran.`,
    );
  }
}
