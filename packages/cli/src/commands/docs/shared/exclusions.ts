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

/** Explicit Contents targets must also respect pruned ancestor directories. */
export function isExcludedPath(
  matcher: ExclusionMatcher,
  path: string,
  directory = false,
): boolean {
  const parts = path.split('/');
  for (let i = 1; i < parts.length; i += 1) {
    if (matcher.excludesDirectory(parts.slice(0, i).join('/'))) return true;
  }
  return directory
    ? matcher.excludesDirectory(path)
    : matcher.excludesFile(path);
}
