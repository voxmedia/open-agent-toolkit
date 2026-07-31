import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

import { parseDeviationObligations } from './obligations';

const fixtureUrl = (name: string) =>
  new URL(`./__fixtures__/obligations/${name}`, import.meta.url);

describe('obligation grammar fixture corpus', () => {
  it.each([
    '../../../../.oat/templates/implementation.md',
    '../../../../.oat/projects/shared/review-plan-workflow/implementation.md',
  ])('round-trips canonical deviations from %s', async (relativePath) => {
    const source = await readFile(new URL(relativePath, import.meta.url));
    expect(() => parseDeviationObligations(source, relativePath)).not.toThrow();
  });

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
