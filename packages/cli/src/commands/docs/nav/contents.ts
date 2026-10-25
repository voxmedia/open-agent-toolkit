import { readdir, readFile } from 'node:fs/promises';
import {
  basename,
  dirname,
  extname,
  join,
  posix,
  relative,
  resolve,
} from 'node:path';

import {
  createExclusionMatcher,
  isExcludedPath,
  type ExclusionMatcher,
} from '@commands/docs/shared/exclusions';
import { dirExists, fileExists } from '@fs/io';
import remarkParse from 'remark-parse';
import { unified } from 'unified';

export interface DocsContentsEntry {
  title: string;
  href: string;
  line?: number;
  description?: string;
  separator?: string;
  /**
   * The authored line from the link's opening `[` onward. `href` is captured
   * only up to the first `)`, so Markdown-level validation reads this instead.
   */
  source?: string;
  group?: { title: string; line: number };
}

/**
 * A defect in one index.md Contents map. `indexPath` is the index file that
 * contains it, as the caller named it, and `line` the entry line when the
 * entries were parsed with locations, so a consumer that only sees the thrown
 * error can still report it against the file that contains it.
 */
export class DocsContentsError extends Error {
  constructor(
    message: string,
    readonly indexPath: string,
    readonly line?: number,
  ) {
    super(message);
    this.name = 'DocsContentsError';
  }
}

export interface DocsInventory {
  /** Docs-relative POSIX directory paths, `.` for the docs root. */
  directories: string[];
  /** Docs-relative POSIX page paths. */
  pages: string[];
}

/** Reader page extensions: Fumadocs renders `.md` and `.mdx` pages. */
export const PAGE_EXTENSIONS: readonly string[] = ['.md', '.mdx'];

/** Every non-excluded directory and reader page under the docs root. */
export async function inventoryDocs(
  docsRoot: string,
  matcher: ExclusionMatcher,
): Promise<DocsInventory> {
  const directories: string[] = [];
  const pages: string[] = [];

  async function walk(relativeDir: string): Promise<void> {
    directories.push(relativeDir);
    const entries = await readdir(join(docsRoot, relativeDir), {
      withFileTypes: true,
    });
    for (const entry of entries) {
      if (entry.name.startsWith('.') || entry.name === 'node_modules') {
        continue;
      }
      const entryPath = posix.join(relativeDir, entry.name);
      if (entry.isDirectory()) {
        if (matcher.excludesDirectory(entryPath)) continue;
        await walk(entryPath);
      } else if (
        entry.isFile() &&
        PAGE_EXTENSIONS.includes(extname(entry.name))
      ) {
        if (!matcher.excludesFile(entryPath)) pages.push(entryPath);
      }
    }
  }

  await walk('.');
  directories.sort();
  pages.sort();
  return { directories, pages };
}

/**
 * Whether a directory is an index-only leaf: its own `index.md` is the only
 * reader page in it or below it, so it renders as a single-page section.
 * `pagePaths` are docs-relative POSIX reader page paths.
 */
export function isIndexOnlyLeaf(
  dirRelativePath: string,
  pagePaths: readonly string[],
): boolean {
  const prefix = dirRelativePath === '.' ? '' : `${dirRelativePath}/`;
  const ownIndex = `${prefix}index.md`;
  let hasIndex = false;
  for (const path of pagePaths) {
    if (!path.startsWith(prefix)) continue;
    if (path !== ownIndex) return false;
    hasIndex = true;
  }
  return hasIndex;
}

/** A Contents href naming a heading on the same page, such as `#setup`. */
export function isSamePageAnchor(href: string): boolean {
  return href.trim().startsWith('#');
}

interface InlineNode {
  type: string;
  url?: string;
  children?: InlineNode[];
  position?: { start: { offset?: number } };
}

const inlineMarkdown = unified().use(remarkParse);

/**
 * Whether a Contents entry is a real Markdown link to a same-page fragment.
 * The Contents grammar is line-based, so it captures destinations such as
 * `#a b`, `#a(b` or `#a\` that Markdown does not parse as links; those render
 * as plain text and no link rule would ever validate them. The CommonMark
 * parser the reader check uses decides, over the authored link text rather
 * than the `href` truncated at the first `)`, so balanced `#a(b)` and escaped
 * `#a\(b\)` fragments stay links. The links rule then checks the URL remark
 * parsed against the page's headings.
 */
function isMarkdownSamePageLink(entry: DocsContentsEntry): boolean {
  const tree = inlineMarkdown.parse(
    entry.source ?? `[${entry.title}](${entry.href})`,
  ) as InlineNode;
  const paragraph = tree.children?.length === 1 ? tree.children[0] : undefined;
  const link =
    paragraph?.type === 'paragraph' ? paragraph.children?.[0] : undefined;
  return (
    link?.type === 'link' &&
    link.position?.start.offset === 0 &&
    (link.url ?? '').startsWith('#')
  );
}

/** Mask fenced examples without changing authored source line numbers. */
function unfencedLines(markdown: string): string[] {
  let fence: { marker: string; length: number } | undefined;
  return markdown.split(/\r?\n/).map((line) => {
    if (fence) {
      const closing = line.match(/^ {0,3}(`{3,}|~{3,})[ \t]*$/);
      if (
        closing &&
        closing[1]![0] === fence.marker &&
        closing[1]!.length >= fence.length
      ) {
        fence = undefined;
      }
      return '';
    }
    const opening = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
    if (opening && (opening[1]![0] === '~' || !opening[2]!.includes('`'))) {
      fence = { marker: opening[1]![0]!, length: opening[1]!.length };
      return '';
    }
    return line;
  });
}

function contentsHeadingIndex(lines: string[]): number {
  return lines.findIndex((line) => /^##\s+Contents\s*$/.test(line.trim()));
}

/** Shared discovery lets inventory generation retain its no-map fallback. */
export function hasIndexContents(markdown: string): boolean {
  return contentsHeadingIndex(unfencedLines(markdown)) >= 0;
}

export function parseIndexContents(
  markdown: string,
  sourcePath = 'index.md',
  options: { allowEmpty?: boolean; locations?: boolean } = {},
): DocsContentsEntry[] {
  const lines = unfencedLines(markdown);
  const headingIndex = contentsHeadingIndex(lines);

  if (headingIndex < 0) {
    throw new DocsContentsError(
      `Missing required ## Contents section in ${sourcePath}`,
      sourcePath,
    );
  }

  const entries: DocsContentsEntry[] = [];
  let group: DocsContentsEntry['group'];
  let groupEntries = 0;
  const checkGroup = (): void => {
    if (group && groupEntries === 0) {
      throw new DocsContentsError(
        `${sourcePath}:${group.line}: Contents group "${group.title}" has no entries`,
        sourcePath,
      );
    }
  };
  for (let i = headingIndex + 1; i < lines.length; i += 1) {
    const line = lines[i]!;
    if (/^##\s+/.test(line.trim())) break;
    const heading = line.match(/^###\s+(.+?)\s*$/);
    if (heading) {
      checkGroup();
      group = { title: heading[1]!.trim(), line: i + 1 };
      groupEntries = 0;
      continue;
    }
    if (/^\s*[*+]\s+\[[^\]]+\]\([^)]+\)/.test(line)) {
      throw new DocsContentsError(
        `${sourcePath}:${i + 1}: Contents links must use a dash (-) bullet`,
        sourcePath,
      );
    }
    const match = line.match(/^\s*-\s+\[([^\]]+)\]\(([^)]+)\)/);
    if (match) {
      entries.push({
        title: match[1]!.trim(),
        href: match[2]!.trim(),
        ...(group ? { group } : {}),
        ...(options.locations
          ? {
              line: i + 1,
              description: line
                .slice(match[0].length)
                .replace(/^\s*[-–—:]\s*/, '')
                .trim(),
              separator: /^\s*([-–—:])/.exec(line.slice(match[0].length))?.[1],
              source: line.slice(match[0].indexOf('[')),
            }
          : {}),
      });
      groupEntries += 1;
    }
  }
  checkGroup();

  if (entries.length === 0 && !options.allowEmpty) {
    throw new DocsContentsError(
      `No machine-readable links found under ## Contents in ${sourcePath}`,
      sourcePath,
    );
  }

  return entries;
}

export type DocsNavTree = Array<Record<string, DocsNavTree | string> | string>;

interface BuildDocsNavTreeOptions {
  docsRoot: string;
  dirRelativePath?: string;
  visitedDirectories?: Set<string>;
  nonReaderPaths?: readonly string[];
  /** Reader page inventory; the root call computes it once. */
  pagePaths?: readonly string[];
}

function toPosixPath(path: string): string {
  return path.replaceAll('\\', '/');
}

/**
 * Resolve one Contents entry to the page or section it places in navigation.
 *
 * Contents is machine-readable navigation, so every entry must target a page
 * or a section index. The one exception is an index-only leaf: a single-page
 * section may list same-page heading anchors as an in-page table of contents.
 * Those resolve to `anchor` and place nothing in navigation; the `links` check
 * rule validates that each heading exists.
 */
export async function resolveEntryTarget(
  docsRoot: string,
  directoryPath: string,
  dirRelativePath: string,
  entry: DocsContentsEntry,
  /**
   * Page extensions a Contents link may target. MkDocs renders only `.md`;
   * Fumadocs also renders `.mdx` pages.
   */
  pageExtensions: readonly string[] = ['.md'],
  matcher?: ExclusionMatcher,
  options: {
    /** The directory is an index-only leaf (see {@link isIndexOnlyLeaf}). */
    indexOnlyLeaf?: boolean;
  } = {},
): Promise<{
  kind: 'page' | 'section' | 'excluded' | 'anchor';
  path: string;
}> {
  const indexPath = join(docsRoot, dirRelativePath, 'index.md');
  const fail = (message: string): never => {
    throw new DocsContentsError(message, indexPath, entry.line);
  };
  if (isSamePageAnchor(entry.href)) {
    if (!options.indexOnlyLeaf) {
      fail(
        `Contents link "${entry.href}" in ${indexPath} is a same-page anchor; Contents must link pages or sections unless index.md is the only reader page in its directory and it has no child sections.`,
      );
    }
    if (!isMarkdownSamePageLink(entry)) {
      fail(
        `Contents link "${entry.href}" in ${indexPath} is not a valid Markdown link; fix its destination (escape or remove spaces and unbalanced parentheses).`,
      );
    }
    return {
      kind: 'anchor',
      path: toPosixPath(posix.join(dirRelativePath, 'index.md')),
    };
  }
  const href = entry.href.split('#', 1)[0]?.trim() ?? '';
  if (!href) {
    fail(`Invalid contents link "${entry.href}" in ${indexPath}`);
  }

  let targetPath = resolve(directoryPath, href);

  if (!href.endsWith('.md')) {
    const directoryTarget = resolve(directoryPath, href);
    if (await dirExists(directoryTarget)) {
      targetPath = join(directoryTarget, 'index.md');
    }
  }

  const relativeTargetPath = toPosixPath(relative(docsRoot, targetPath));
  if (
    relativeTargetPath.startsWith('../') ||
    relativeTargetPath === '..' ||
    relativeTargetPath.length === 0
  ) {
    fail(
      `Contents link "${entry.href}" escapes the docs directory from ${indexPath}`,
    );
  }

  if (matcher && isExcludedPath(matcher, relativeTargetPath)) {
    return { kind: 'excluded', path: relativeTargetPath };
  }

  if (!(await fileExists(targetPath))) {
    fail(
      `Contents link "${entry.href}" in ${indexPath} does not resolve to a Markdown file`,
    );
  }

  if (!pageExtensions.includes(extname(targetPath))) {
    fail(
      `Contents link "${entry.href}" in ${indexPath} must point to a Markdown file or directory index`,
    );
  }

  if (basename(targetPath) === 'index.md') {
    return {
      kind: 'section',
      path: relativeTargetPath,
    };
  }

  return {
    kind: 'page',
    path: relativeTargetPath,
  };
}

export async function buildDocsNavTree(
  options: BuildDocsNavTreeOptions,
): Promise<DocsNavTree> {
  const dirRelativePath = options.dirRelativePath ?? '.';
  const visitedDirectories =
    options.visitedDirectories ?? new Set<string>([dirRelativePath]);
  const directoryPath = resolve(options.docsRoot, dirRelativePath);
  const indexPath = join(directoryPath, 'index.md');

  if (!(await fileExists(indexPath))) {
    throw new Error(`Missing required index.md at ${indexPath}`);
  }

  const indexMarkdown = await readFile(indexPath, 'utf8');
  const contentsEntries = parseIndexContents(indexMarkdown, indexPath, {
    locations: true,
  });

  const matcher = createExclusionMatcher(options.nonReaderPaths ?? []);
  const pagePaths =
    options.pagePaths ?? (await inventoryDocs(options.docsRoot, matcher)).pages;
  const indexOnlyLeaf = isIndexOnlyLeaf(dirRelativePath, pagePaths);
  const nav: DocsNavTree =
    dirRelativePath === '.'
      ? [{ Home: 'index.md' }]
      : [toPosixPath(join(dirRelativePath, 'index.md'))];

  let currentGroup: DocsContentsEntry['group'];
  let groupNav: DocsNavTree = nav;
  for (const entry of contentsEntries) {
    const resolvedTarget = await resolveEntryTarget(
      options.docsRoot,
      directoryPath,
      dirRelativePath,
      entry,
      ['.md'],
      matcher,
      { indexOnlyLeaf },
    );
    if (resolvedTarget.kind === 'excluded' || resolvedTarget.kind === 'anchor')
      continue;

    if (
      resolvedTarget.kind === 'section' &&
      resolvedTarget.path === toPosixPath(join(dirRelativePath, 'index.md'))
    ) {
      continue;
    }

    if (entry.group !== currentGroup) {
      currentGroup = entry.group;
      groupNav = [];
      nav.push({ [currentGroup!.title]: groupNav });
    }
    if (resolvedTarget.kind === 'page') {
      groupNav.push({ [entry.title]: resolvedTarget.path });
      continue;
    }

    const childDirRelativePath = toPosixPath(dirname(resolvedTarget.path));
    if (visitedDirectories.has(childDirRelativePath)) {
      throw new Error(
        `Circular docs navigation detected at ${join(
          options.docsRoot,
          childDirRelativePath,
          'index.md',
        )}`,
      );
    }

    const childVisitedDirectories = new Set(visitedDirectories);
    childVisitedDirectories.add(childDirRelativePath);
    groupNav.push({
      [entry.title]: await buildDocsNavTree({
        docsRoot: options.docsRoot,
        dirRelativePath: childDirRelativePath,
        visitedDirectories: childVisitedDirectories,
        nonReaderPaths: options.nonReaderPaths,
        pagePaths,
      }),
    });
  }

  return nav;
}
