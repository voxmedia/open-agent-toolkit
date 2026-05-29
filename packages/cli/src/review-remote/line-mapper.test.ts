import { describe, expect, it } from 'vitest';

import {
  classifyFinding,
  parsePullFilesPatch,
  parseUnifiedDiff,
} from './line-mapper';

// A `patch` field as returned per-file by `gh api /repos/.../pulls/<N>/files`.
// Two hunks: lines 1-3 (context+addition) and 10-12 (context+addition).
const FILE_PATCH = [
  '@@ -1,2 +1,3 @@',
  ' context line a',
  '+added line b',
  ' context line c',
  '@@ -9,2 +10,3 @@',
  ' context line x',
  '+added line y',
  ' context line z',
].join('\n');

// A multi-file unified diff as produced by `gh pr diff <N>`, including a
// renamed file and a binary file.
const UNIFIED_DIFF = [
  'diff --git a/src/keep.ts b/src/keep.ts',
  'index 1111111..2222222 100644',
  '--- a/src/keep.ts',
  '+++ b/src/keep.ts',
  '@@ -1,4 +1,4 @@',
  ' line one',
  '+new line two',
  ' line three',
  '-removed line four',
  ' line five',
  'diff --git a/src/old-name.ts b/src/new-name.ts',
  'similarity index 90%',
  'rename from src/old-name.ts',
  'rename to src/new-name.ts',
  'index 3333333..4444444 100644',
  '--- a/src/old-name.ts',
  '+++ b/src/new-name.ts',
  '@@ -5,2 +5,3 @@',
  ' renamed context',
  '+renamed addition',
  ' renamed tail',
  'diff --git a/assets/logo.png b/assets/logo.png',
  'index 5555555..6666666 100644',
  'Binary files a/assets/logo.png and b/assets/logo.png differ',
].join('\n');

describe('parsePullFilesPatch', () => {
  it('parses additions/context hunk ranges from a per-file patch', () => {
    const ranges = parsePullFilesPatch(FILE_PATCH);
    expect(ranges).toHaveLength(2);
    // First hunk new-side starts at 1, spans 3 lines.
    expect(ranges[0]).toMatchObject({ newStart: 1, newCount: 3 });
    expect(ranges[1]).toMatchObject({ newStart: 10, newCount: 3 });
  });

  it('returns an empty array for an empty/undefined patch (binary file)', () => {
    expect(parsePullFilesPatch('')).toEqual([]);
  });
});

describe('parseUnifiedDiff', () => {
  it('maps each changed file to its hunk ranges', () => {
    const byFile = parseUnifiedDiff(UNIFIED_DIFF);

    expect(byFile['src/keep.ts']).toBeDefined();
    expect(byFile['src/keep.ts']).toHaveLength(1);
    expect(byFile['src/keep.ts']?.[0]).toMatchObject({
      newStart: 1,
      newCount: 4,
      oldStart: 1,
      oldCount: 4,
    });
  });

  it('keys a renamed file under its post-rename path and records previousFilename', () => {
    const byFile = parseUnifiedDiff(UNIFIED_DIFF);
    expect(byFile['src/new-name.ts']).toBeDefined();
    expect(byFile['src/new-name.ts']?.[0]?.previousFilename).toBe(
      'src/old-name.ts',
    );
    expect(byFile['src/old-name.ts']).toBeUndefined();
  });

  it('records a binary file with no hunk ranges', () => {
    const byFile = parseUnifiedDiff(UNIFIED_DIFF);
    expect(byFile['assets/logo.png']).toBeDefined();
    expect(byFile['assets/logo.png']).toEqual([]);
  });
});

describe('classifyFinding', () => {
  const ranges = parseUnifiedDiff(UNIFIED_DIFF);

  it('classifies an addition line as in-diff on the RIGHT side', () => {
    const result = classifyFinding(
      { file: 'src/keep.ts', line: 2 },
      ranges['src/keep.ts'] ?? [],
    );
    expect(result.status).toBe('in-diff');
    if (result.status === 'in-diff') {
      expect(result.side).toBe('RIGHT');
      expect(result.line).toBe(2);
    }
  });

  it('classifies a context line within the hunk as in-diff RIGHT', () => {
    const result = classifyFinding(
      { file: 'src/keep.ts', line: 4 },
      ranges['src/keep.ts'] ?? [],
    );
    expect(result.status).toBe('in-diff');
  });

  it('classifies an explicit removed-code finding on the LEFT side', () => {
    const result = classifyFinding(
      { file: 'src/keep.ts', line: 4, removed: true },
      ranges['src/keep.ts'] ?? [],
    );
    expect(result.status).toBe('in-diff');
    if (result.status === 'in-diff') {
      expect(result.side).toBe('LEFT');
    }
  });

  it('classifies a line outside any hunk as out-of-diff carrying file:line', () => {
    const result = classifyFinding(
      { file: 'src/keep.ts', line: 999 },
      ranges['src/keep.ts'] ?? [],
    );
    expect(result.status).toBe('out-of-diff');
    if (result.status === 'out-of-diff') {
      expect(result.file).toBe('src/keep.ts');
      expect(result.line).toBe(999);
    }
  });

  it('treats a binary file (no ranges) as always out-of-diff', () => {
    const result = classifyFinding(
      { file: 'assets/logo.png', line: 1 },
      ranges['assets/logo.png'] ?? [],
    );
    expect(result.status).toBe('out-of-diff');
  });

  it('does not mutate the input finding', () => {
    const finding = { file: 'src/keep.ts', line: 999 };
    const snapshot = { ...finding };
    classifyFinding(finding, ranges['src/keep.ts'] ?? []);
    expect(finding).toEqual(snapshot);
  });

  it('classifies findings in a renamed file under its post-rename path', () => {
    const result = classifyFinding(
      { file: 'src/new-name.ts', line: 6 },
      ranges['src/new-name.ts'] ?? [],
    );
    expect(result.status).toBe('in-diff');
  });

  it('shares one HunkRange shape across both parsers', () => {
    const patchRanges = parsePullFilesPatch(FILE_PATCH);
    const result = classifyFinding(
      { file: 'whatever.ts', line: 2 },
      patchRanges,
    );
    // classifyFinding accepts ranges from parsePullFilesPatch without overloads.
    expect(result.status).toBe('in-diff');
  });
});
