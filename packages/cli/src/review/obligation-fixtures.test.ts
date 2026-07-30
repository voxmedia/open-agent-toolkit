import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

const fixtureUrl = (name: string) =>
  new URL(`./__fixtures__/obligations/${name}`, import.meta.url);

describe('obligation grammar fixture corpus', () => {
  for (const stem of ['spec-v1', 'plan-v1', 'implementation-v1']) {
    it(`loads and preserves ${stem} source bytes`, async () => {
      const first = await readFile(fixtureUrl(`${stem}.md`));
      const second = await readFile(fixtureUrl(`${stem}.md`));
      expect(second.equals(first)).toBe(true);
      expect(first.byteLength).toBeGreaterThan(0);

      const expectation = JSON.parse(
        await readFile(fixtureUrl(`${stem}.json`), 'utf8'),
      ) as unknown;
      expect(Array.isArray(expectation)).toBe(true);
    });
  }

  it.todo('normalizes strict UTF-8 and newline variants in the lexical parser');
  it.todo('parses the spec expectation through requirement grammar');
  it.todo('parses the plan expectation through task grammar');
  it.todo('parses the implementation expectation with deferred supersession');
});
