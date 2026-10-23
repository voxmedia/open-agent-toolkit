import { readFile } from 'node:fs/promises';
import { basename, dirname, extname, join, relative, resolve } from 'node:path';

import {
  createExclusionMatcher,
  isExcludedPath,
  type ExclusionMatcher,
} from '@commands/docs/shared/exclusions';
import { dirExists, fileExists } from '@fs/io';

export interface DocsContentsEntry {
  title: string;
  href: string;
  group?: { title: string; line: number };
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
  options: { allowEmpty?: boolean } = {},
): DocsContentsEntry[] {
  const lines = unfencedLines(markdown);
  const headingIndex = contentsHeadingIndex(lines);

  if (headingIndex < 0) {
    throw new Error(`Missing required ## Contents section in ${sourcePath}`);
  }

  const entries: DocsContentsEntry[] = [];
  let group: DocsContentsEntry['group'];
  let groupEntries = 0;
  const checkGroup = (): void => {
    if (group && groupEntries === 0) {
      throw new Error(
        `${sourcePath}:${group.line}: Contents group "${group.title}" has no entries`,
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
      throw new Error(
        `${sourcePath}:${i + 1}: Contents links must use a dash (-) bullet`,
      );
    }
    const match = line.match(/^\s*-\s+\[([^\]]+)\]\(([^)]+)\)/);
    if (match) {
      entries.push({
        title: match[1]!.trim(),
        href: match[2]!.trim(),
        ...(group ? { group } : {}),
      });
      groupEntries += 1;
    }
  }
  checkGroup();

  if (entries.length === 0 && !options.allowEmpty) {
    throw new Error(
      `No machine-readable links found under ## Contents in ${sourcePath}`,
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
}

function toPosixPath(path: string): string {
  return path.replaceAll('\\', '/');
}

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
): Promise<{ kind: 'page' | 'section' | 'excluded'; path: string }> {
  const href = entry.href.split('#', 1)[0]?.trim() ?? '';
  if (!href) {
    throw new Error(
      `Invalid contents link "${entry.href}" in ${join(
        docsRoot,
        dirRelativePath,
        'index.md',
      )}`,
    );
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
    throw new Error(
      `Contents link "${entry.href}" escapes the docs directory from ${join(
        docsRoot,
        dirRelativePath,
        'index.md',
      )}`,
    );
  }

  if (matcher && isExcludedPath(matcher, relativeTargetPath)) {
    return { kind: 'excluded', path: relativeTargetPath };
  }

  if (!(await fileExists(targetPath))) {
    throw new Error(
      `Contents link "${entry.href}" in ${join(
        docsRoot,
        dirRelativePath,
        'index.md',
      )} does not resolve to a Markdown file`,
    );
  }

  if (!pageExtensions.includes(extname(targetPath))) {
    throw new Error(
      `Contents link "${entry.href}" in ${join(
        docsRoot,
        dirRelativePath,
        'index.md',
      )} must point to a Markdown file or directory index`,
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
  const contentsEntries = parseIndexContents(indexMarkdown, indexPath);

  const matcher = createExclusionMatcher(options.nonReaderPaths ?? []);
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
    );
    if (resolvedTarget.kind === 'excluded') continue;

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
      }),
    });
  }

  return nav;
}
