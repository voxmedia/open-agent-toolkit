import { readdir, readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

import {
  parseDeferredFindingObligations,
  parseDeviationObligations,
  parsePlanTaskObligations,
  parseRequirementObligations,
} from './obligations';

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

  it('consumes every intended fixture in the corpus', async () => {
    expect(
      (await readdir(fixtureUrl('.'))).filter((name) => !name.startsWith('.')),
    ).toEqual([
      'implementation-v1.json',
      'implementation-v1.md',
      'plan-v1.json',
      'plan-v1.md',
      'spec-v1.json',
      'spec-v1.md',
    ]);
  });

  it('covers newline, BOM, NUL, and invalid UTF-8 lexical behavior', async () => {
    const source = await readFile(fixtureUrl('plan-v1.md'), 'utf8');
    const expected = JSON.parse(
      await readFile(fixtureUrl('plan-v1.json'), 'utf8'),
    ) as unknown;
    expect(
      parsePlanTaskObligations(source.replaceAll('\n', '\r\n'), 'plan-v1.md'),
    ).toEqual(expected);
    expect(parsePlanTaskObligations(`\uFEFF${source}`, 'plan-v1.md')).toEqual(
      expected,
    );
    expect(() =>
      parsePlanTaskObligations(Buffer.from([0xff]), 'plan-v1.md'),
    ).toThrow();
    expect(() => parsePlanTaskObligations(`${source}\0`, 'plan-v1.md')).toThrow(
      /NUL/,
    );
  });

  it('parses the spec expectation through requirement grammar', async () => {
    const source = await readFile(fixtureUrl('spec-v1.md'));
    const expected = JSON.parse(
      await readFile(fixtureUrl('spec-v1.json'), 'utf8'),
    ) as unknown;
    expect(parseRequirementObligations(source, 'spec-v1.md')).toEqual(expected);
  });

  it('parses the plan expectation through task grammar', async () => {
    const source = await readFile(fixtureUrl('plan-v1.md'));
    const expected = JSON.parse(
      await readFile(fixtureUrl('plan-v1.json'), 'utf8'),
    ) as unknown;
    expect(parsePlanTaskObligations(source, 'plan-v1.md')).toEqual(expected);
  });

  it('parses implementation expectation with deferred supersession', async () => {
    const source = await readFile(fixtureUrl('implementation-v1.md'));
    const expected = JSON.parse(
      await readFile(fixtureUrl('implementation-v1.json'), 'utf8'),
    ) as unknown;
    expect([
      ...parseDeferredFindingObligations(source, 'implementation-v1.md'),
      ...parseDeviationObligations(source, 'implementation-v1.md'),
    ]).toEqual(expected);
  });

  it('connects negative cases for every obligation grammar', () => {
    expect(() =>
      parseRequirementObligations(
        '## Requirement Index\n\n| ID | X |\n| --- | --- |\n| BAD | x |\n',
        'spec.md',
      ),
    ).toThrow();
    expect(() =>
      parsePlanTaskObligations(
        '### Task p01-t01: Missing files\n\n**Step 1: Test**\n',
        'plan.md',
      ),
    ).toThrow();
    expect(() =>
      parseDeviationObligations(
        '## Deviations from Plan / Design\n\n| Task / Review | Source Artifact | Planned / Documented | Actual / Accepted | Reason | Source of Truth | Follow-up |\n| --- | --- | --- | --- | --- | --- | --- |\n| p01-t01 | design.md | planned | - | reason | file.ts | none |\n',
        'implementation.md',
      ),
    ).toThrow();
  });
});
