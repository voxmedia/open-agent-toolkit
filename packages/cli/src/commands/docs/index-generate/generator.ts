import { readdir, readFile } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';

import {
  parseIndexContents,
  resolveEntryTarget,
} from '@commands/docs/nav/contents';
import { resolveFolderTitle } from '@commands/docs/nav/fumadocs';
import {
  createExclusionMatcher,
  type ExclusionMatcher,
} from '@commands/docs/shared/exclusions';
export { createExclusionMatcher } from '@commands/docs/shared/exclusions';
export type { ExclusionMatcher } from '@commands/docs/shared/exclusions';

export interface IndexEntry {
  title: string;
  description?: string;
  path: string;
  children?: IndexEntry[];
  /** Present Contents did not list this direct reader entry. */
  unlisted?: boolean;
}

export interface GenerateIndexOptions {
  /**
   * Glob patterns whose matches are left out of the index. See
   * {@link createExclusionMatcher} for the grammar; an empty or omitted list
   * indexes everything, byte-identically to the pre-exclusion behavior.
   */
  excludes?: string[];
}

const FRONTMATTER_RE = /^---\n([\s\S]*?)\n---/;
const HEADING_RE = /^#\s+(.+)$/m;

function fileNameToTitle(fileName: string): string {
  return fileName
    .replace(/\.md$/, '')
    .split(/[-_]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function parseFrontmatter(content: string): {
  title?: string;
  description?: string;
} {
  const match = FRONTMATTER_RE.exec(content);
  if (!match) {
    return {};
  }

  const fm = match[1]!;
  const titleMatch = /^title:\s*(.+)$/m.exec(fm);
  const descMatch = /^description:\s*(.+)$/m.exec(fm);

  return {
    title: titleMatch?.[1]?.trim().replace(/^["']|["']$/g, '') || undefined,
    description:
      descMatch?.[1]?.trim().replace(/^["']|["']$/g, '') || undefined,
  };
}

function resolveTitle(
  content: string,
  fileName: string,
): { title: string; description?: string } {
  const fm = parseFrontmatter(content);

  if (fm.title) {
    return { title: fm.title, description: fm.description };
  }

  const headingMatch = HEADING_RE.exec(content);
  if (headingMatch) {
    return { title: headingMatch[1]!.trim(), description: fm.description };
  }

  return { title: fileNameToTitle(fileName), description: fm.description };
}

function sortEntries(entries: IndexEntry[]): IndexEntry[] {
  return entries.sort((a, b) => {
    // index.md always first
    const aIsIndex = a.path.endsWith('index.md');
    const bIsIndex = b.path.endsWith('index.md');
    if (aIsIndex && !bIsIndex) return -1;
    if (!aIsIndex && bIsIndex) return 1;
    // directories (entries with children) before files
    const aIsDir = a.children !== undefined;
    const bIsDir = b.children !== undefined;
    if (aIsDir && !bIsDir) return -1;
    if (!aIsDir && bIsDir) return 1;
    return a.path.localeCompare(b.path);
  });
}

function prefixEntryPath(entry: IndexEntry, prefix: string): IndexEntry {
  return {
    ...entry,
    path: join(prefix, entry.path),
    children: entry.children?.map((child) => prefixEntryPath(child, prefix)),
  };
}

/** Docs-root-relative POSIX path used for matching, never for reading files. */
function relativeKey(base: string, name: string): string {
  return base ? `${base}/${name}` : name;
}

async function collectEntries(
  docsDir: string,
  relativeBase: string,
  matcher: ExclusionMatcher,
  docsRoot: string,
): Promise<IndexEntry[]> {
  const entries: IndexEntry[] = [];
  const subdirs: string[] = [];
  let indexMarkdown: string | undefined;

  const dirEntries = await readdir(docsDir, { withFileTypes: true });

  for (const entry of dirEntries) {
    const relativePath = relativeKey(relativeBase, entry.name);
    if (entry.isDirectory()) {
      if (!matcher.excludesDirectory(relativePath)) {
        subdirs.push(entry.name);
      }
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      if (matcher.excludesFile(relativePath)) {
        continue;
      }
      const filePath = join(docsDir, entry.name);
      const content = await readFile(filePath, 'utf8');
      if (entry.name === 'index.md') indexMarkdown = content;
      const { title, description } = resolveTitle(content, entry.name);
      entries.push({
        title,
        description: description || undefined,
        path: entry.name,
      });
    }
  }

  for (const subdir of subdirs.sort()) {
    const children = await collectEntries(
      join(docsDir, subdir),
      relativeKey(relativeBase, subdir),
      matcher,
      docsRoot,
    );
    // A directory with no surviving children emits no heading. This already
    // pruned genuinely empty directories; exclusion simply empties more of
    // them, and it composes upward through the recursion.
    if (children.length > 0) {
      entries.push({
        title: children.find((child) => child.path === 'index.md')
          ? (resolveFolderTitle(
              await readFile(join(docsDir, subdir, 'index.md'), 'utf8'),
            ) ?? fileNameToTitle(subdir))
          : fileNameToTitle(subdir),
        path: subdir,
        children: children.map((child) => prefixEntryPath(child, subdir)),
      });
    }
  }

  const fallback = sortEntries(entries);
  if (indexMarkdown === undefined || !/^##\s+Contents\s*$/m.test(indexMarkdown))
    return fallback;
  const contents = parseIndexContents(indexMarkdown, join(docsDir, 'index.md'));
  const ordered: IndexEntry[] = [];
  const add = (entry: IndexEntry | undefined): void => {
    if (entry && !ordered.includes(entry)) ordered.push(entry);
  };
  add(entries.find((entry) => entry.path === 'index.md'));
  for (const entry of contents) {
    const target = await resolveEntryTarget(
      docsRoot,
      docsDir,
      relativeBase,
      entry,
      ['.md'],
      matcher,
    );
    if (target.kind === 'excluded') continue;
    const local = relative(docsDir, resolve(docsRoot, target.path)).replaceAll(
      '\\',
      '/',
    );
    if (local === '..' || local.startsWith('../')) continue;
    const direct = local.split('/')[0];
    add(entries.find((candidate) => candidate.path === direct));
  }
  for (const entry of fallback) {
    if (!ordered.includes(entry)) ordered.push({ ...entry, unlisted: true });
  }
  return ordered;
}

export async function generateIndex(
  docsDir: string,
  options: GenerateIndexOptions = {},
): Promise<IndexEntry[]> {
  return collectEntries(
    docsDir,
    '',
    createExclusionMatcher(options.excludes ?? []),
    docsDir,
  );
}

function renderEntries(entries: IndexEntry[], indent: number): string[] {
  const lines: string[] = [];
  const prefix = '  '.repeat(indent);

  for (const entry of entries) {
    if (entry.children) {
      lines.push(
        `${prefix}- ${entry.title}${entry.unlisted ? ' [unlisted in Contents]' : ''}`,
      );
      lines.push(...renderEntries(entry.children, indent + 1));
    } else {
      const desc = entry.description ? ` — ${entry.description}` : '';
      lines.push(
        `${prefix}- [${entry.title}](${entry.path})${desc}${entry.unlisted ? ' [unlisted in Contents]' : ''}`,
      );
    }
  }

  return lines;
}

export function renderIndex(entries: IndexEntry[]): string {
  if (entries.length === 0) {
    return '';
  }

  return `${renderEntries(entries, 0).join('\n')}\n`;
}
