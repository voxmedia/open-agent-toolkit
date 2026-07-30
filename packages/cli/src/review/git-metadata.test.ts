import { describe, expect, it } from 'vitest';

import {
  mergeChangeMetadata,
  parseNameStatusZ,
  parseNumstatZ,
} from './git-metadata';

describe('parseNameStatusZ', () => {
  it('parses add, modify, delete, and rename provenance', () => {
    const result = parseNameStatusZ(
      Buffer.from(
        'M\0src/m.ts\0A\0src/a.ts\0D\0src/d.ts\0R100\0src/old.ts\0src/new.ts\0',
      ),
    );
    expect(
      result.map(({ path, status, previousPath }) => ({
        path,
        status,
        previousPath,
      })),
    ).toEqual([
      { path: 'src/a.ts', status: 'added', previousPath: undefined },
      { path: 'src/d.ts', status: 'deleted', previousPath: undefined },
      { path: 'src/m.ts', status: 'modified', previousPath: undefined },
      {
        path: 'src/new.ts',
        status: 'renamed',
        previousPath: 'src/old.ts',
      },
    ]);
  });

  it.each([
    'A\0missing-terminator',
    'X\0a.ts\0',
    'R100\0old.ts\0',
    'A\0a.ts\0M\0a.ts\0',
    'A\0../escape\0',
  ])('rejects malformed output %j', (source) => {
    expect(() => parseNameStatusZ(Buffer.from(source))).toThrow();
  });
});

describe('numstat metadata', () => {
  it('parses numeric, binary, and rename rows', () => {
    expect(
      parseNumstatZ(
        Buffer.from(
          ['2\t3\ta.ts', '-\t-\tb.bin', '10\t1\t', 'old.ts', 'new.ts', ''].join(
            '\0',
          ),
        ),
      ),
    ).toEqual([
      {
        path: 'a.ts',
        additions: 2,
        deletions: 3,
        isBinary: false,
      },
      {
        path: 'b.bin',
        additions: null,
        deletions: null,
        isBinary: true,
      },
      {
        path: 'new.ts',
        previousPath: 'old.ts',
        additions: 10,
        deletions: 1,
        isBinary: false,
      },
    ]);
  });

  it('merges deterministic totals and non-authoritative hints', () => {
    const statuses = parseNameStatusZ(
      Buffer.from('A\0dist/a.js\0M\0pnpm-lock.yaml\0D\0image.bin\0'),
    );
    const merged = mergeChangeMetadata(
      statuses,
      parseNumstatZ(
        Buffer.from(
          '3\t1\tdist/a.js\0' + '5\t2\tpnpm-lock.yaml\0-\t-\timage.bin\0',
        ),
      ),
    );
    expect(merged.totals).toEqual({
      additions: 8,
      deletions: 3,
      binaryFiles: 1,
      numstatChangedLines: 11,
      numstatTokenDenialEstimate: 3,
    });
    expect(merged.files[0]?.generatedHint).toBe(true);
    expect(merged.files[2]?.bookkeepingHint).toBe(true);
  });

  it('rejects missing and conflicting paths', () => {
    const status = parseNameStatusZ(Buffer.from('A\0a.ts\0'));
    expect(() => mergeChangeMetadata(status, [])).toThrow(/missing/);
    expect(() =>
      mergeChangeMetadata(status, parseNumstatZ(Buffer.from('1\t1\tb.ts\0'))),
    ).toThrow();
  });
});
