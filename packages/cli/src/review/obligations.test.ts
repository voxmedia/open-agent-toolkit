import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

import {
  parseDeferredFindingObligations,
  parseDeviationObligations,
  parsePlanTaskObligations,
  parseRequirementObligations,
} from './obligations';

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

describe('plan task obligations', () => {
  it('parses the canonical fixture exactly', async () => {
    const source = await readFile(fixture('plan-v1.md'));
    const expected = JSON.parse(
      await readFile(fixture('plan-v1.json'), 'utf8'),
    ) as unknown;
    expect(parsePlanTaskObligations(source, 'plan-v1.md')).toEqual(expected);
  });

  it('accepts standalone and canonical inline-prose Step terminators', () => {
    const prefix =
      '### Task p01-t01: Test\n\n**Files:**\n\n- Create: `a.ts`\n\n';
    expect(
      parsePlanTaskObligations(
        `${prefix}**Step 1: Write test (RED)**\n`,
        'plan.md',
      ),
    ).toHaveLength(1);
    expect(
      parsePlanTaskObligations(
        `${prefix}**Step 1: Write test (RED)** Cover behavior.\n`,
        'plan.md',
      ),
    ).toHaveLength(1);
  });

  it.each([
    '### Task p01-t01: Test\n\n- Create: `a.ts`\n\n**Step 1: Test**\n',
    '### Task p01-t01: Test\n\n**Files:**\n\n**Step 1: Test**\n',
    '### Task p01-t01: Test\n\n**Files:**\n\n- Create: `a.ts`\n- Modify: `a.ts`\n\n**Step 1: Test**\n',
    '### Task p01-t01: Test\n\n**Files:**\n\n- Create: `../a.ts`\n\n**Step 1: Test**\n',
    '### Task p01-t01: Test\n\n**Files:**\n\n- Create: `a.ts`\nprose\n\n**Step 1: Test**\n',
    '### Task p01-t01: Test\n\n**Files:**\n\n- Create: `a.ts`\n\n**Step 1:** malformed\n',
    '### Task p01-t01: One\n\n**Files:**\n\n- Create: `a.ts`\n\n**Step 1: Test**\n### Task p01-t01: Two\n\n**Files:**\n\n- Create: `b.ts`\n\n**Step 1: Test**\n',
  ])('rejects malformed task structures', (source) => {
    expect(() => parsePlanTaskObligations(source, 'plan.md')).toThrow();
  });
});

describe('implementation obligations', () => {
  it('parses deviations and latest deferred state', async () => {
    const source = await readFile(fixture('implementation-v1.md'));
    const expected = JSON.parse(
      await readFile(fixture('implementation-v1.json'), 'utf8'),
    ) as Array<{ kind: string }>;
    expect([
      ...parseDeferredFindingObligations(source, 'implementation-v1.md'),
      ...parseDeviationObligations(source, 'implementation-v1.md'),
    ]).toEqual(expected);
  });

  it('rejects a partially populated deviation', () => {
    const source = `## Deviations from Plan / Design

| Task / Review | Planned / Expected | Actual / Accepted | Why | Impact | Approval / Source | Source of Truth |
| --- | --- | --- | --- | --- | --- | --- |
| p01-t01 | planned | - | why | impact | approval | file.ts |
`;
    expect(() =>
      parseDeviationObligations(source, 'implementation.md'),
    ).toThrow(/incomplete/);
  });

  it('rejects duplicate IDs within one deferred block', () => {
    const source = `**Deferred Findings:**

- \`REV-1\` first
  - Disposition: deferred
- \`REV-1\` second
  - Disposition: resolved
`;
    expect(() =>
      parseDeferredFindingObligations(source, 'implementation.md'),
    ).toThrow(/duplicate/);
  });

  it('applies deferred, resolved, and dismissed supersession', () => {
    const source = `**Deferred Findings:**
- \`A\` first
  - Disposition: deferred
- \`B\` second
  - Disposition: deferred
---
**Deferred Findings:**
- \`A\` first
  - Disposition: resolved fixed
- \`B\` second
  - Disposition: dismissed not applicable
`;
    expect(
      parseDeferredFindingObligations(source, 'implementation.md'),
    ).toEqual([]);
  });
});
