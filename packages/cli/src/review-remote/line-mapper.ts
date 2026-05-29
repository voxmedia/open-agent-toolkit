/**
 * Inline-comment line-mapping validator (see design.md → Error Handling →
 * Inline-comment line mapping).
 *
 * GitHub's `POST /repos/:owner/:repo/pulls/:N/reviews` rejects inline comments
 * at file:line positions not present in the PR diff. Before adding a finding to
 * the `comments[]` payload, the caller classifies it against the parsed hunk
 * ranges. Out-of-diff findings are NOT silently dropped or shifted — the caller
 * downgrades them to a top-level "Findings outside the PR diff" subsection.
 *
 * Two parsers feed one classifier with a single shared {@link HunkRange} shape:
 *  - {@link parsePullFilesPatch} for the per-file `patch` field of
 *    `gh api /repos/.../pulls/<N>/files` (rich-context mode).
 *  - {@link parseUnifiedDiff} for `gh pr diff <N>` (diff-only fallback mode).
 */

/** A single diff hunk's old- and new-side ranges. Shared by both parsers. */
export interface HunkRange {
  /** 1-based start line on the old (LEFT) side. */
  oldStart: number;
  /** Line count on the old side. */
  oldCount: number;
  /** 1-based start line on the new (RIGHT) side. */
  newStart: number;
  /** Line count on the new side. */
  newCount: number;
  /** Pre-rename path, when the owning file was renamed. */
  previousFilename?: string;
}

/** A finding location to classify against a file's hunk ranges. */
export interface FindingLocation {
  file: string;
  line: number;
  /** Set when the finding is explicitly about removed code (LEFT side). */
  removed?: boolean;
}

export interface InDiffClassification {
  status: 'in-diff';
  side: 'RIGHT' | 'LEFT';
  line: number;
}

export interface OutOfDiffClassification {
  status: 'out-of-diff';
  /** Original file reference, carried through for the downgrade subsection. */
  file: string;
  /** Original line reference, carried through for the downgrade subsection. */
  line: number;
}

export type FindingClassification =
  | InDiffClassification
  | OutOfDiffClassification;

/** Matches a unified-diff hunk header: `@@ -a,b +c,d @@`. */
const HUNK_HEADER_PATTERN = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/;

function parseHunkHeader(line: string): HunkRange | null {
  const match = line.match(HUNK_HEADER_PATTERN);
  if (!match) {
    return null;
  }
  const oldStart = Number(match[1]);
  // A missing count means 1 per unified-diff convention.
  const oldCount = match[2] === undefined ? 1 : Number(match[2]);
  const newStart = Number(match[3]);
  const newCount = match[4] === undefined ? 1 : Number(match[4]);
  return { oldStart, oldCount, newStart, newCount };
}

/**
 * Parse the `patch` field of a single `gh api .../pulls/<N>/files` entry into
 * its hunk ranges. Returns `[]` for an empty patch (e.g., a binary file, whose
 * entry has no `patch`).
 */
export function parsePullFilesPatch(patch: string): HunkRange[] {
  if (!patch) {
    return [];
  }
  const ranges: HunkRange[] = [];
  for (const line of patch.split('\n')) {
    const hunk = parseHunkHeader(line);
    if (hunk) {
      ranges.push(hunk);
    }
  }
  return ranges;
}

/** Strip a leading `a/` or `b/` diff prefix from a path token. */
function stripDiffPrefix(path: string): string {
  if (path.startsWith('a/') || path.startsWith('b/')) {
    return path.slice(2);
  }
  return path;
}

/**
 * Parse a full `gh pr diff <N>` unified diff into a map of post-image file path
 * → hunk ranges. Renamed files are keyed under their post-rename path with
 * `previousFilename` recorded; binary files map to an empty array.
 */
export function parseUnifiedDiff(diff: string): Record<string, HunkRange[]> {
  const byFile: Record<string, HunkRange[]> = {};
  if (!diff) {
    return byFile;
  }

  const lines = diff.split('\n');
  let currentFile: string | null = null;
  let previousFilename: string | undefined;
  let renameFrom: string | undefined;

  const ensureFile = (path: string): HunkRange[] => {
    if (!byFile[path]) {
      byFile[path] = [];
    }
    return byFile[path];
  };

  for (const line of lines) {
    if (line.startsWith('diff --git ')) {
      // `diff --git a/<old> b/<new>` — default the file to the new path.
      const parts = line.slice('diff --git '.length).trim().split(' ');
      const newPath =
        parts.length >= 2 ? stripDiffPrefix(parts[parts.length - 1]!) : null;
      currentFile = newPath;
      previousFilename = undefined;
      renameFrom = undefined;
      if (currentFile) {
        ensureFile(currentFile);
      }
      continue;
    }

    if (line.startsWith('rename from ')) {
      renameFrom = line.slice('rename from '.length).trim();
      continue;
    }
    if (line.startsWith('rename to ')) {
      const renameTo = line.slice('rename to '.length).trim();
      // Re-key under the post-rename path and drop the placeholder key.
      if (currentFile && currentFile !== renameTo) {
        delete byFile[currentFile];
      }
      currentFile = renameTo;
      previousFilename = renameFrom;
      ensureFile(currentFile);
      continue;
    }

    if (line.startsWith('+++ ')) {
      const token = line.slice('+++ '.length).trim();
      if (token !== '/dev/null') {
        const path = stripDiffPrefix(token);
        if (path && path !== currentFile) {
          if (currentFile) {
            delete byFile[currentFile];
          }
          currentFile = path;
          ensureFile(currentFile);
        }
      }
      continue;
    }

    if (line.startsWith('Binary files ')) {
      // Binary file: no hunks, keep the (already-ensured) empty array.
      continue;
    }

    const hunk = parseHunkHeader(line);
    if (hunk && currentFile) {
      if (previousFilename) {
        hunk.previousFilename = previousFilename;
      }
      ensureFile(currentFile).push(hunk);
    }
  }

  return byFile;
}

/**
 * Classify a finding against a file's hunk ranges.
 *
 * A line inside any hunk's new-side range is `in-diff` on the `RIGHT` side
 * (additions/context); when the finding is explicitly about removed code it is
 * mapped to the `LEFT` side instead. A line outside every hunk — or a file with
 * no ranges (binary) — is `out-of-diff`, carrying the original `file:line` so
 * the caller can downgrade it without mutating the source finding.
 */
export function classifyFinding(
  finding: FindingLocation,
  ranges: HunkRange[],
): FindingClassification {
  for (const range of ranges) {
    if (finding.removed) {
      const oldEnd = range.oldStart + range.oldCount - 1;
      if (finding.line >= range.oldStart && finding.line <= oldEnd) {
        return { status: 'in-diff', side: 'LEFT', line: finding.line };
      }
      continue;
    }
    const newEnd = range.newStart + range.newCount - 1;
    if (finding.line >= range.newStart && finding.line <= newEnd) {
      return { status: 'in-diff', side: 'RIGHT', line: finding.line };
    }
  }
  return { status: 'out-of-diff', file: finding.file, line: finding.line };
}
