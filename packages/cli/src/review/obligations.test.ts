import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

import {
  collectReviewObligations,
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
    '## Requirement Index\n\n| ID | X |\n| --- | --- |\n| FR1 | x |\n\ntrailing after blank\n',
    '## Requirement Index\n\n| ID | X |\n| --- | --- |\n| FR1 | x |\n\n| Extra | Table |\n| --- | --- |\n| value | value |\n',
  ])('rejects malformed Requirement Index input', (source) => {
    expect(() => parseRequirementObligations(source, 'spec.md')).toThrow();
  });

  it('ends the Requirement Index at the next structural heading', () => {
    expect(
      parseRequirementObligations(
        '## Requirement Index\n\n| ID | X |\n| --- | --- |\n| FR1 | x |\n\n## Requirements\n\n### FR1\n',
        'spec.md',
      ),
    ).toMatchObject([{ id: 'FR1' }]);
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
  it.each([
    '../../../../.oat/templates/implementation.md',
    '../../../../.oat/projects/shared/review-plan-workflow/implementation.md',
  ])('parses the canonical deviations table in %s', async (relativePath) => {
    const source = await readFile(new URL(relativePath, import.meta.url));
    expect(() => parseDeviationObligations(source, relativePath)).not.toThrow();
  });

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

  it('skips explanatory prose and rejects duplicate canonical tables', () => {
    const table = `| Task / Review | Source Artifact | Planned / Documented | Actual / Accepted | Reason | Source of Truth | Follow-up |
| --- | --- | --- | --- | --- | --- | --- |
| p02-t10 | design.md | standalone Step line | inline or standalone Step line | canonical plans use inline prose | obligations.ts | align design |
`;
    expect(
      parseDeviationObligations(
        `## Deviations from Plan / Design

Document intentional deviations before the table.

${table}`,
        'implementation.md',
      ),
    ).toMatchObject([{ id: 'deviation:p02-t10:1' }]);
    expect(() =>
      parseDeviationObligations(
        `## Deviations from Plan / Design\n\n${table}\n${table}`,
        'implementation.md',
      ),
    ).toThrow(/exactly one/);
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

describe('exact scope obligation collection', () => {
  async function sources() {
    return {
      plan: {
        source: await readFile(fixture('plan-v1.md')),
        path: 'plan-v1.md',
      },
      spec: {
        source: await readFile(fixture('spec-v1.md')),
        path: 'spec-v1.md',
      },
      implementation: {
        source: await readFile(fixture('implementation-v1.md')),
        path: 'implementation-v1.md',
      },
    };
  }

  it('selects a named task plus additive implementation obligations', async () => {
    const input = await sources();
    const result = await collectReviewObligations({
      workflowMode: 'spec-driven',
      scope: 'p02-t01',
      ...input,
    });
    expect(result.map(({ id }) => id)).toEqual([
      'deferred-finding:REV-2',
      'deviation:p02-t01:2',
      'p02-t01',
    ]);
  });

  it('selects a phase prefix exactly', async () => {
    const input = await sources();
    const result = await collectReviewObligations({
      workflowMode: 'spec-driven',
      scope: 'p02',
      ...input,
      implementation: null,
    });
    expect(result.map(({ id }) => id)).toEqual(['p02-t01', 'p02-t02']);
  });

  it('selects Requirement Index rows for spec-driven final', async () => {
    const input = await sources();
    const result = await collectReviewObligations({
      workflowMode: 'spec-driven',
      scope: 'final',
      ...input,
      implementation: null,
    });
    expect(result.map(({ id }) => id)).toEqual(['FR1', 'NFR1']);
  });

  it.each(['quick', 'import'] as const)(
    'selects all plan tasks for %s final',
    async (workflowMode) => {
      const input = await sources();
      const result = await collectReviewObligations({
        workflowMode,
        scope: 'final',
        ...input,
        implementation: null,
      });
      expect(result.map(({ id }) => id)).toEqual(['p02-t01', 'p02-t02']);
    },
  );
});
