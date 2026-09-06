import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

export interface IndexEntry {
  title: string;
  description?: string;
  path: string;
  children?: IndexEntry[];
}

export interface GenerateIndexOptions {
  /**
   * Glob patterns whose matches are left out of the index. See
   * {@link createExclusionMatcher} for the grammar; an empty or omitted list
   * indexes everything, byte-identically to the pre-exclusion behavior.
   */
  excludes?: string[];
}

/**
 * A compiled exclusion list.
 *
 * Files and directories are asked separately so a trailing-slash pattern can
 * mean "directories only" while every other pattern applies to both.
 */
export interface ExclusionMatcher {
  excludesFile: (relativePath: string) => boolean;
  excludesDirectory: (relativePath: string) => boolean;
}

const NO_EXCLUSIONS: ExclusionMatcher = {
  excludesFile: () => false,
  excludesDirectory: () => false,
};

/**
 * Match one path segment against one pattern segment, where `*` is the only
 * metacharacter and never crosses `/`.
 *
 * This is the classic greedy two-pointer wildcard match, deliberately not a
 * compiled regular expression: a pattern like `*a*a*a...` translates to
 * nested-quantifier alternatives that backtrack exponentially, and exclusion
 * patterns come from config and flags where a typo should not hang generation.
 * Restarting from the last `*` instead bounds the work at O(pattern x text).
 */
function matchSegment(pattern: string, text: string): boolean {
  let patternIndex = 0;
  let textIndex = 0;
  let starPatternIndex = -1;
  let starTextIndex = 0;

  while (textIndex < text.length) {
    if (pattern[patternIndex] === '*') {
      // Collapse a run of stars: within a segment they are all equivalent.
      while (pattern[patternIndex] === '*') {
        patternIndex += 1;
      }
      if (patternIndex === pattern.length) {
        return true;
      }
      starPatternIndex = patternIndex;
      starTextIndex = textIndex;
      continue;
    }

    if (
      patternIndex < pattern.length &&
      pattern[patternIndex] === text[textIndex]
    ) {
      patternIndex += 1;
      textIndex += 1;
      continue;
    }

    if (starPatternIndex === -1) {
      return false;
    }

    // Give the last star one more character and retry from just after it.
    starTextIndex += 1;
    patternIndex = starPatternIndex;
    textIndex = starTextIndex;
  }

  while (pattern[patternIndex] === '*') {
    patternIndex += 1;
  }
  return patternIndex === pattern.length;
}

/**
 * Match a docs-root-relative path against a pattern, segment by segment, where
 * a whole-segment `**` spans zero or more path segments.
 *
 * Same greedy-restart shape as {@link matchSegment}, one level up, so a pattern
 * full of `**` segments stays bounded too.
 */
function matchPath(
  patternSegments: readonly string[],
  pathSegments: readonly string[],
): boolean {
  let patternIndex = 0;
  let pathIndex = 0;
  let starPatternIndex = -1;
  let starPathIndex = 0;

  while (pathIndex < pathSegments.length) {
    if (patternSegments[patternIndex] === '**') {
      while (patternSegments[patternIndex] === '**') {
        patternIndex += 1;
      }
      if (patternIndex === patternSegments.length) {
        return true;
      }
      starPatternIndex = patternIndex;
      starPathIndex = pathIndex;
      continue;
    }

    if (
      patternIndex < patternSegments.length &&
      matchSegment(patternSegments[patternIndex]!, pathSegments[pathIndex]!)
    ) {
      patternIndex += 1;
      pathIndex += 1;
      continue;
    }

    if (starPatternIndex === -1) {
      return false;
    }

    starPathIndex += 1;
    patternIndex = starPatternIndex;
    pathIndex = starPathIndex;
  }

  while (patternSegments[patternIndex] === '**') {
    patternIndex += 1;
  }
  return patternIndex === patternSegments.length;
}

/**
 * Compile exclusion globs matched against **docs-root-relative POSIX paths**
 * (`api/auth.md`, `api/nested`), never against absolute or CWD-relative ones.
 *
 * Grammar, defined once and documented in
 * `apps/oat-docs/docs/reference/oat-directory-structure.md`:
 *
 * - `*` matches any run of characters inside a single path segment.
 * - `**` spans `/` only as a whole segment, where it covers zero or more
 *   segments: `**\/CLAUDE.md` matches `CLAUDE.md` and `api/CLAUDE.md`. Inside a
 *   segment (`a**b`) it is an ordinary single-segment wildcard.
 * - Patterns are anchored at both ends against the whole relative path, so a
 *   bare `CLAUDE.md` matches only the root-level file. Use `**\/CLAUDE.md` for
 *   every depth.
 * - A trailing `/` restricts a pattern to directories: `drafts/` prunes the
 *   `drafts` directory and everything beneath it, and never matches a file.
 *   Without it, a pattern that matches a directory path prunes it too.
 * - Matching is case-sensitive, and `/` is the separator on every platform.
 *
 * Entries are trimmed; a leading `./` or `/` is stripped so both spellings
 * anchor at the docs root. Blank entries are ignored.
 */
/**
 * Compile exclusion globs matched against **docs-root-relative POSIX paths**
 * (`api/auth.md`, `api/nested`), never against absolute or CWD-relative ones.
 *
 * Grammar, defined once and documented in
 * `apps/oat-docs/docs/reference/oat-directory-structure.md`:
 *
 * - `*` matches any run of characters inside a single path segment.
 * - `**` spans `/` only as a whole segment, where it covers zero or more
 *   segments: `**\/CLAUDE.md` matches `CLAUDE.md` and `api/CLAUDE.md`. Inside a
 *   segment (`a**b`) it is an ordinary single-segment wildcard.
 * - Patterns are anchored at both ends against the whole relative path, so a
 *   bare `CLAUDE.md` matches only the root-level file. Use `**\/CLAUDE.md` for
 *   every depth.
 * - A trailing `/` restricts a pattern to directories: `drafts/` prunes the
 *   `drafts` directory and everything beneath it, and never matches a file.
 *   Without it, a pattern that matches a directory path prunes it too.
 * - Matching is case-sensitive, `/` is the separator on every platform, and
 *   `*` is the only metacharacter — `.`, `+`, and friends are literal.
 *
 * Entries are trimmed; a leading `./` or `/` is stripped so both spellings
 * anchor at the docs root. Blank entries are ignored.
 */
export function createExclusionMatcher(
  patterns: readonly string[],
): ExclusionMatcher {
  const filePatterns: string[][] = [];
  const directoryPatterns: string[][] = [];

  for (const rawPattern of patterns) {
    const trimmedPattern = rawPattern.trim();
    if (!trimmedPattern) {
      continue;
    }

    const directoryOnly = trimmedPattern.endsWith('/');
    const normalized = trimmedPattern
      .replace(/\/+$/, '')
      .replace(/^\.\//, '')
      .replace(/^\/+/, '');
    if (!normalized) {
      continue;
    }

    const segments = normalized.split('/');
    directoryPatterns.push(segments);
    if (!directoryOnly) {
      filePatterns.push(segments);
    }
  }

  if (directoryPatterns.length === 0) {
    return NO_EXCLUSIONS;
  }

  const matches = (compiled: string[][], relativePath: string): boolean => {
    const pathSegments = relativePath.split('/');
    return compiled.some((segments) => matchPath(segments, pathSegments));
  };

  return {
    excludesFile: (relativePath) => matches(filePatterns, relativePath),
    excludesDirectory: (relativePath) =>
      matches(directoryPatterns, relativePath),
  };
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
): Promise<IndexEntry[]> {
  const entries: IndexEntry[] = [];
  const subdirs: string[] = [];

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
    );
    // A directory with no surviving children emits no heading. This already
    // pruned genuinely empty directories; exclusion simply empties more of
    // them, and it composes upward through the recursion.
    if (children.length > 0) {
      entries.push({
        title: fileNameToTitle(subdir),
        path: subdir,
        children: children.map((child) => prefixEntryPath(child, subdir)),
      });
    }
  }

  return sortEntries(entries);
}

export async function generateIndex(
  docsDir: string,
  options: GenerateIndexOptions = {},
): Promise<IndexEntry[]> {
  return collectEntries(
    docsDir,
    '',
    createExclusionMatcher(options.excludes ?? []),
  );
}

function renderEntries(entries: IndexEntry[], indent: number): string[] {
  const lines: string[] = [];
  const prefix = '  '.repeat(indent);

  for (const entry of entries) {
    if (entry.children) {
      lines.push(`${prefix}- ${entry.title}`);
      lines.push(...renderEntries(entry.children, indent + 1));
    } else {
      const desc = entry.description ? ` — ${entry.description}` : '';
      lines.push(`${prefix}- [${entry.title}](${entry.path})${desc}`);
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
