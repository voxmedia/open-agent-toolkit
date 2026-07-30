import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

import { parseRequirementObligations } from './obligations';

const fixture = (name: string) =>
  new URL(`./__fixtures__/obligations/${name}`, import.meta.url);

describe('requirement obligations', () => {
  it('parses the canonical fixture exactly', async () => {
    const source = await readFile(fixture('spec-v1.md'));
    const expected = JSON.parse(
      await readFile(fixture('spec-v1.json'), 'utf8'),
    ) as unknown;
    expect(parseRequirementObligations(source, 'spec-v1.md')).toEqual(expected);
  });

  it.each([
    '## Requirement Index\n\n| ID | X |\n| --- | --- |\n| BAD | x |\n',
    '## Requirement Index\n## Requirement Index\n',
    '## Requirement Index\n\n| ID | X |\n| --- | --- |\n| FR1 | x |\n| FR1 | x |\n',
    '## Requirement Index\n\n| ID | X |\n| --- | --- |\n| FR1 | x | extra |\n',
    '## Requirement Index\n\n| Wrong | X |\n| --- | --- |\n| FR1 | x |\n',
    '## Requirement Index\n\n| ID | X |\n| --- | --- |\n| FR1 | x |\ntrailing\n',
  ])('rejects malformed Requirement Index input', (source) => {
    expect(() => parseRequirementObligations(source, 'spec.md')).toThrow();
  });
});
