import { readFile } from 'node:fs/promises';
import { basename, dirname, extname, join, relative, resolve } from 'node:path';

import { dirExists, fileExists } from '@fs/io';

export interface DocsContentsEntry {
  title: string;
  href: string;
}

export function parseIndexContents(
  markdown: string,
  sourcePath = 'index.md',
): DocsContentsEntry[] {
  const lines = markdown.split(/\r?\n/);
  const contentsHeadingIndex = lines.findIndex((line) =>
    /^##\s+Contents\s*$/.test(line.trim()),
  );

  if (contentsHeadingIndex < 0) {
    throw new Error(`Missing required ## Contents section in ${sourcePath}`);
  }

  const sectionLines = lines.slice(contentsHeadingIndex + 1);
  const nextHeadingIndex = sectionLines.findIndex((line) =>
    /^##\s+/.test(line.trim()),
  );
  const contentsLines =
    nextHeadingIndex >= 0
      ? sectionLines.slice(0, nextHeadingIndex)
      : sectionLines;

  const entries = contentsLines
    .map((line) => line.match(/^\s*-\s+\[([^\]]+)\]\(([^)]+)\)/))
    .filter((match): match is RegExpMatchArray => match !== null)
    .map((match) => {
      const [, title = '', href = ''] = match;
      return {
        title: title.trim(),
        href: href.trim(),
      };
    });

  if (entries.length === 0) {
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
}

function toPosixPath(path: string): string {
  return path.replaceAll('\\', '/');
}

async function resolveEntryTarget(
  docsRoot: string,
  directoryPath: string,
  dirRelativePath: string,
  entry: DocsContentsEntry,
): Promise<{ kind: 'page' | 'section'; path: string }> {
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

  if (!(await fileExists(targetPath))) {
    throw new Error(
      `Contents link "${entry.href}" in ${join(
        docsRoot,
        dirRelativePath,
        'index.md',
      )} does not resolve to a Markdown file`,
    );
  }

  if (extname(targetPath) !== '.md') {
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

  const nav: DocsNavTree =
    dirRelativePath === '.'
      ? [{ Home: 'index.md' }]
      : [toPosixPath(join(dirRelativePath, 'index.md'))];

  for (const entry of contentsEntries) {
    const resolvedTarget = await resolveEntryTarget(
      options.docsRoot,
      directoryPath,
      dirRelativePath,
      entry,
    );

    if (
      resolvedTarget.kind === 'section' &&
      resolvedTarget.path === toPosixPath(join(dirRelativePath, 'index.md'))
    ) {
      continue;
    }

    if (resolvedTarget.kind === 'page') {
      nav.push({ [entry.title]: resolvedTarget.path });
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
    nav.push({
      [entry.title]: await buildDocsNavTree({
        docsRoot: options.docsRoot,
        dirRelativePath: childDirRelativePath,
        visitedDirectories: childVisitedDirectories,
      }),
    });
  }

  return nav;
}
