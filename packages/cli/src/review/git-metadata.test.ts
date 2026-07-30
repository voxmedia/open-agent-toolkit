import { describe, expect, it } from 'vitest';

import { parseNameStatusZ } from './git-metadata';

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
