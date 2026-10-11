import { describe, expect, it } from 'vitest';

import {
  MILESTONES_TABLE_HEADER,
  milestonePhaseScope,
  readMilestoneMembership,
} from './milestones';

const PHASES = `## Phase p01: Research

**Intent:** Learn.
**Exit evidence:** Notes.

## Phase p02: Build

**Intent:** Build.
**Exit evidence:** Tests.

## Phase p03: Ship

**Intent:** Ship.
**Exit evidence:** Released.
`;

function goalPlan(milestones: string, phases = PHASES): string {
  return `# Project Brief: demo

## Outcomes

1. **Works** — Evidence: tests

## Milestones

${milestones}

${phases}`;
}

const TWO_MILESTONES = `<!-- Each row lists one milestone's ordered phase set. -->

${MILESTONES_TABLE_HEADER}
| m01       | p01, p02 |
| m02       | \`p03\`  |`;

describe('readMilestoneMembership', () => {
  it('reads exact membership from a well-formed two-milestone table', () => {
    expect(readMilestoneMembership(goalPlan(TWO_MILESTONES))).toEqual({
      present: true,
      milestones: [
        { milestoneId: 'm01', phaseIds: ['p01', 'p02'] },
        { milestoneId: 'm02', phaseIds: ['p03'] },
      ],
      errors: [],
    });
  });

  it('normalizes milestone and phase spellings and keeps trailing columns out of membership', () => {
    const table = `| Milestone | Phases | Summary |
| --- | --- | --- |
| m1 | p1, p-rev01 | First |
| m2 | p03 | Second |`;
    const phases = `${PHASES}
## Phase p-rev1: Correct p01

**Intent:** Fix.
**Exit evidence:** Fixed.
`;
    expect(readMilestoneMembership(goalPlan(table, phases))).toEqual({
      present: true,
      milestones: [
        { milestoneId: 'm01', phaseIds: ['p01', 'p-rev1'] },
        { milestoneId: 'm02', phaseIds: ['p03'] },
      ],
      errors: [
        expect.objectContaining({
          code: 'phase-without-milestone',
          phaseId: 'p02',
        }),
      ],
    });
  });

  it('reports a missing section', () => {
    const plan = `# Project Brief: demo\n\n${PHASES}`;
    expect(readMilestoneMembership(plan)).toEqual({
      present: false,
      milestones: [],
      errors: [expect.objectContaining({ code: 'milestones-missing' })],
    });
  });

  it('reports a malformed table instead of reading no membership', () => {
    const noHeader = readMilestoneMembership(
      goalPlan('| m01 | p01, p02, p03 |'),
    );
    expect(noHeader.present).toBe(false);
    expect(noHeader.errors.map((error) => error.code)).toEqual([
      'milestones-malformed',
    ]);

    const noSeparator = readMilestoneMembership(
      goalPlan('| Milestone | Phases |\n| m01 | p01, p02, p03 |'),
    );
    expect(noSeparator.errors.map((error) => error.code)).toEqual([
      'milestones-malformed',
    ]);

    const badRow = readMilestoneMembership(
      goalPlan(`${MILESTONES_TABLE_HEADER}\n| first | p01, p02, p03 |`),
    );
    expect(badRow.errors.map((error) => error.code)).toEqual([
      'milestones-malformed',
      'phase-without-milestone',
      'phase-without-milestone',
      'phase-without-milestone',
    ]);

    const badToken = readMilestoneMembership(
      goalPlan(`${MILESTONES_TABLE_HEADER}\n| m01 | p01, phase two, p03 |`),
    );
    expect(badToken.errors.map((error) => error.code)).toEqual([
      'milestones-malformed',
      'phase-without-milestone',
    ]);

    const twoTables = readMilestoneMembership(
      goalPlan(
        `${MILESTONES_TABLE_HEADER}\n| m01 | p01, p02 |\n\n${MILESTONES_TABLE_HEADER}\n| m02 | p03 |`,
      ),
    );
    expect(twoTables.errors.map((error) => error.code)).toEqual([
      'milestones-malformed',
    ]);
  });

  it('surfaces an unknown phase id as an error', () => {
    const membership = readMilestoneMembership(
      goalPlan(`${MILESTONES_TABLE_HEADER}\n| m01 | p01, p02, p03, p09 |`),
    );
    expect(membership.errors).toEqual([
      expect.objectContaining({
        code: 'milestone-unknown-phase',
        milestoneId: 'm01',
        phaseId: 'p09',
      }),
    ]);
  });

  it('surfaces a phase in two milestones and a phase listed twice', () => {
    const membership = readMilestoneMembership(
      goalPlan(
        `${MILESTONES_TABLE_HEADER}\n| m01 | p01, p02, p01 |\n| m02 | p02, p03 |`,
      ),
    );
    expect(membership.errors).toEqual([
      expect.objectContaining({
        code: 'phase-in-multiple-milestones',
        milestoneId: 'm01',
        phaseId: 'p01',
      }),
      expect.objectContaining({
        code: 'phase-in-multiple-milestones',
        milestoneId: 'm02',
        phaseId: 'p02',
      }),
    ]);
  });

  it('surfaces duplicate and empty milestones and phases in no milestone', () => {
    const membership = readMilestoneMembership(
      goalPlan(
        `${MILESTONES_TABLE_HEADER}\n| m01 | p01 |\n| m01 | p02 |\n| m02 | |`,
      ),
    );
    expect(membership.errors.map((error) => error.code)).toEqual([
      'milestone-duplicate',
      'milestone-empty',
      'phase-without-milestone',
      'phase-without-milestone',
    ]);
  });

  it('exempts an extracted phase from membership but still accepts it in a row', () => {
    const journal = `## Phase p02: Build

**Status:** extracted
**Extracted to:** build-child
`;
    const plan = goalPlan(`${MILESTONES_TABLE_HEADER}\n| m01 | p01, p03 |`);
    expect(readMilestoneMembership(plan, journal).errors).toEqual([]);
    expect(readMilestoneMembership(plan).errors).toEqual([
      expect.objectContaining({
        code: 'phase-without-milestone',
        phaseId: 'p02',
      }),
    ]);
  });

  it('ignores tables and headings inside fenced examples', () => {
    const plan = goalPlan(`\`\`\`markdown
## Milestones

| Milestone | Phases |
| --- | --- |
| m09 | p09 |
\`\`\`

${MILESTONES_TABLE_HEADER}
| m01 | p01, p02, p03 |`);
    expect(readMilestoneMembership(plan)).toEqual({
      present: true,
      milestones: [{ milestoneId: 'm01', phaseIds: ['p01', 'p02', 'p03'] }],
      errors: [],
    });
  });

  it('reads the scaffolded header with no rows as present and reports unowned phases', () => {
    const membership = readMilestoneMembership(
      goalPlan(MILESTONES_TABLE_HEADER),
    );
    expect(membership.present).toBe(true);
    expect(membership.milestones).toEqual([]);
    expect(membership.errors.map((error) => error.phaseId)).toEqual([
      'p01',
      'p02',
      'p03',
    ]);
  });
});

describe('milestonePhaseScope', () => {
  it('returns the ordered phase set only for valid membership', () => {
    const valid = readMilestoneMembership(goalPlan(TWO_MILESTONES));
    expect(milestonePhaseScope(valid, 'm01')).toEqual(['p01', 'p02']);
    expect(milestonePhaseScope(valid, 'm03')).toBeNull();
    expect(milestonePhaseScope(valid, null)).toBeNull();

    const invalid = readMilestoneMembership(
      goalPlan(`${MILESTONES_TABLE_HEADER}\n| m01 | p01, p02, p03, p09 |`),
    );
    expect(milestonePhaseScope(invalid, 'm01')).toBeNull();
  });
});
