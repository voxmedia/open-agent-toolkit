import { describe, expect, it } from 'vitest';

import {
  normalizePhaseId,
  parsePhaseMarkers,
  parseProvisionalPhaseIds,
  parseTaskProgress,
  selectPhaseUnits,
} from './tasks';

describe('parseTaskProgress', () => {
  it('parses task counts and current task across multiple phases', () => {
    const planContent = `## Phase 1: Package and Types

### Task p01-t01: Scaffold package
### Task p01-t02: Parse state
### Task p01-t03: Scan artifacts
### Task prev1-t04: Wrong canonical revision dialect
### Task p02-t03: Task from a different ordinary phase

## Phase 2: API

### Task p02-t01: Wire project state
### Task p02-t02: Add list API
`;

    const implementationContent = `---
oat_current_task_id: p02-t01
---

### Task p01-t01: Scaffold package
**Status:** completed

### Task p01-t02: Parse state
**Status:** completed

### Task p01-t03: Scan artifacts
**Status:** completed

### Task p02-t01: Wire project state
**Status:** pending
`;

    expect(parseTaskProgress(planContent, implementationContent)).toEqual({
      total: 5,
      completed: 3,
      currentTaskId: 'p02-t01',
      phases: [
        {
          phaseId: 'p01',
          name: 'Package and Types',
          total: 3,
          completed: 3,
          isRevision: false,
        },
        {
          phaseId: 'p02',
          name: 'API',
          total: 2,
          completed: 0,
          isRevision: false,
        },
      ],
    });
  });

  it('marks revision phases from revision task ids', () => {
    const planContent = `## Revision Phase 1: Review fixes

### Task p-rev1-t01: Address review
### Task p-rev1-t02: Re-run verification
### Task prev1-t03: Same revision phase in the canonical task spelling
### Task p-rev2-t01: Task from a different legacy revision
`;

    const implementationContent = `---
oat_current_task_id: p-rev1-t02
---

### Task p-rev1-t01: Address review
**Status:** completed
`;

    // `prev1-t03` counts: both task spellings normalize to phase `p-rev1`.
    // `p-rev2-t01` is still dropped — it belongs to a different phase.
    expect(parseTaskProgress(planContent, implementationContent)).toEqual({
      total: 3,
      completed: 1,
      currentTaskId: 'p-rev1-t02',
      phases: [
        {
          phaseId: 'p-rev1',
          name: 'Review fixes',
          total: 3,
          completed: 1,
          isRevision: true,
        },
      ],
    });
  });

  // Characterization: the two heading dialects that already parsed before the
  // 2026-09 heading-normalization change. These lock current behavior so the
  // widening below cannot silently move them.
  it('characterizes the bare-digit ordinary dialect that already parsed', () => {
    // Heading shape from `.oat/templates/plan.md` (`## Phase 1: <name>`), the
    // canonical authored dialect.
    const planContent = `## Phase 1: Foundation

### Task p01-t01: Verify baseline and create oat-phase-implementer agent
`;

    const implementationContent = `---
oat_current_task_id: null
---

### Task p01-t01: Verify baseline and create oat-phase-implementer agent
**Status:** completed
`;

    expect(parseTaskProgress(planContent, implementationContent)).toEqual({
      total: 1,
      completed: 1,
      currentTaskId: null,
      phases: [
        {
          phaseId: 'p01',
          name: 'Foundation',
          total: 1,
          completed: 1,
          isRevision: false,
        },
      ],
    });
  });

  it('characterizes the canonical revision dialect that already parsed', () => {
    // Heading lines copied from
    // `.oat/projects/archived/subagent-implement-refactor/plan.md:458,463`.
    const planContent = `## Phase p-rev1: Revision 1

### Task prev1-t01: (revision) Make Codex review dispatch explicitly no-fork and artifact-driven
`;

    const implementationContent = `---
oat_current_task_id: null
---

### Task prev1-t01: (revision) Make Codex review dispatch explicitly no-fork and artifact-driven
**Status:** completed
`;

    expect(parseTaskProgress(planContent, implementationContent)).toEqual({
      total: 1,
      completed: 1,
      currentTaskId: null,
      phases: [
        {
          phaseId: 'p-rev1',
          name: 'Revision 1',
          total: 1,
          completed: 1,
          isRevision: true,
        },
      ],
    });
  });

  it('counts phases declared with padded phase ids', () => {
    // `## Phase p01: Foundation` and `### Task p01-t01: …` are copied from
    // `.oat/projects/archived/subagent-implement-refactor/plan.md:33,37`; that
    // real plan parsed as zero phases before heading normalization. The second
    // phase pairs the template's bare-digit heading with an unpadded task id,
    // the spelling `parseTaskHeading` now zero-pads.
    const planContent = `## Phase p01: Foundation

### Task p01-t01: Verify baseline and create oat-phase-implementer agent
### Task p01-t02: Sync provider views

## Phase 2: Validator CLI

### Task p2-t01: Add test fixtures for phase-subagent flow
`;

    const implementationContent = `---
oat_current_task_id: p2-t01
---

### Task p01-t01: Verify baseline and create oat-phase-implementer agent
**Status:** completed

### Task p01-t02: Sync provider views
**Status:** completed

### Task p2-t01: Add test fixtures for phase-subagent flow
**Status:** pending
`;

    expect(parseTaskProgress(planContent, implementationContent)).toEqual({
      total: 3,
      completed: 2,
      currentTaskId: 'p2-t01',
      phases: [
        {
          phaseId: 'p01',
          name: 'Foundation',
          total: 2,
          completed: 2,
          isRevision: false,
        },
        {
          phaseId: 'p02',
          name: 'Validator CLI',
          total: 1,
          completed: 0,
          isRevision: false,
        },
      ],
    });
  });

  it('counts revision phases declared as Revision Phase p-revN', () => {
    // Heading and task lines copied from
    // `.oat/projects/archived/workflow-friction/plan.md:910,914,1172,1176`.
    // That plan pairs a `## Revision Phase p-revN:` heading with canonical
    // `prevN-tNN` task ids, so every one of its revision tasks was dropped
    // before the phase id and phase kind were normalized.
    const planContent = `## Revision Phase p-rev1: Final Review Fixes

### Task prev1-t01: (review) Stage moved review artifact in review-receive Step 7.6 commit

## Revision Phase p-rev2: Re-Review Polish

### Task prev2-t01: (review) Fix stale owningCommand on activeIdea user catalog row
`;

    const implementationContent = `---
oat_current_task_id: null
---

### Task prev1-t01: (review) Stage moved review artifact in review-receive Step 7.6 commit
**Status:** completed

### Task prev2-t01: (review) Fix stale owningCommand on activeIdea user catalog row
**Status:** completed
`;

    expect(parseTaskProgress(planContent, implementationContent)).toEqual({
      total: 2,
      completed: 2,
      currentTaskId: null,
      phases: [
        {
          phaseId: 'p-rev1',
          name: 'Final Review Fixes',
          total: 1,
          completed: 1,
          isRevision: true,
        },
        {
          phaseId: 'p-rev2',
          name: 'Re-Review Polish',
          total: 1,
          completed: 1,
          isRevision: true,
        },
      ],
    });
  });

  it('keeps rejecting a task id that belongs to a different phase', () => {
    // Widening heading recognition must never reattribute a task. Every task
    // below is well-formed and every one belongs to some other phase or kind.
    const planContent = `## Phase p01: Foundation

### Task p01-t01: Verify baseline and create oat-phase-implementer agent
### Task p02-t01: Task from a later ordinary phase
### Task p2-t09: Same later phase in the unpadded spelling
### Task prev1-t01: Revision task under an ordinary phase
### Task p-rev1-t01: Legacy revision task under an ordinary phase

## Phase p-rev1: Revision 1

### Task prev1-t02: Revision task for this phase
### Task p01-t02: Ordinary task under a revision phase
### Task prev2-t01: Task from a different revision phase
`;

    const implementationContent = `---
oat_current_task_id: null
---

### Task p01-t01: Verify baseline and create oat-phase-implementer agent
**Status:** completed

### Task prev1-t02: Revision task for this phase
**Status:** completed
`;

    expect(parseTaskProgress(planContent, implementationContent)).toEqual({
      total: 2,
      completed: 2,
      currentTaskId: null,
      phases: [
        {
          phaseId: 'p01',
          name: 'Foundation',
          total: 1,
          completed: 1,
          isRevision: false,
        },
        {
          phaseId: 'p-rev1',
          name: 'Revision 1',
          total: 1,
          completed: 1,
          isRevision: true,
        },
      ],
    });
  });

  it('keeps adjacent large phase ordinals distinct', () => {
    // Normalization is string-only. Parsing these ordinals as numbers would
    // collapse both onto 9007199254740992, normalize them to one phase id, and
    // attribute the second phase's task to the first.
    const planContent = `## Phase 9007199254740992: First

### Task p9007199254740993-t01: Task from the adjacent phase
`;

    const implementationContent = `---
oat_current_task_id: null
---

### Task p9007199254740993-t01: Task from the adjacent phase
**Status:** completed
`;

    expect(parseTaskProgress(planContent, implementationContent)).toEqual({
      total: 0,
      completed: 0,
      currentTaskId: null,
      phases: [],
    });
  });

  it('normalizes canonical revision phases and task ids', () => {
    const planContent = `## Phase p-rev1: Revision 1

### Task prev1-t01: Keep retro state coherent
### Task prev1-t02: Distinguish duplicate candidates
### Task prev2-t01: Task from a different revision
### Task p-rev1-t03: Same revision phase in the legacy task spelling
### Task p-rev1t03: Malformed legacy task id
`;

    const implementationContent = `---
oat_current_task_id: prev1-t02
---

### Task prev1-t01: Keep retro state coherent
**Status:** completed

### Task prev1-t02: Distinguish duplicate candidates
**Status:** pending
`;

    // `p-rev1-t03` counts: both task spellings normalize to phase `p-rev1`.
    // `prev2-t01` (different phase) and `p-rev1t03` (malformed id, matches no
    // task pattern) are still dropped.
    expect(parseTaskProgress(planContent, implementationContent)).toEqual({
      total: 3,
      completed: 1,
      currentTaskId: 'prev1-t02',
      phases: [
        {
          phaseId: 'p-rev1',
          name: 'Revision 1',
          total: 3,
          completed: 1,
          isRevision: true,
        },
      ],
    });
  });

  it('parses completed tasks from verbose implementation sections', () => {
    const planContent = `## Phase 1: Package and Types

### Task p01-t01: Scaffold package
### Task p01-t02: Parse state

## Phase 2: API

### Task p02-t01: Wire project state
`;

    const implementationContent = `---
oat_current_task_id: p02-t01
---

## Phase 1: Package and Types

### Task p01-t01: Scaffold package

**Status:** completed
**Commit:** abc1234

**Outcome (required):**

- Added package scaffolding.

---

### Task p01-t02: Parse state

**Status:** completed
**Commit:** def5678

**Verification:**

- Run: pnpm test
- Result: pass

---

## Phase 2: API

### Task p02-t01: Wire project state

**Status:** pending
**Commit:** -
`;

    expect(parseTaskProgress(planContent, implementationContent)).toEqual({
      total: 3,
      completed: 2,
      currentTaskId: 'p02-t01',
      phases: [
        {
          phaseId: 'p01',
          name: 'Package and Types',
          total: 2,
          completed: 2,
          isRevision: false,
        },
        {
          phaseId: 'p02',
          name: 'API',
          total: 1,
          completed: 0,
          isRevision: false,
        },
      ],
    });
  });

  it('returns empty progress for plans without task definitions', () => {
    expect(
      parseTaskProgress(
        '# Implementation Plan\n\n_No tasks yet_\n',
        `---
oat_current_task_id: null
---
`,
      ),
    ).toEqual({
      total: 0,
      completed: 0,
      currentTaskId: null,
      phases: [],
    });
  });
});

describe('parseTaskProgress in task mode (default)', () => {
  it('drops a taskless phase heading and adds no phase-unit fields', () => {
    const planContent = `## Phase 1: Research

**Intent:** Learn the parser contract.

## Phase 2: Build

### Task p02-t01: Wire the reader
`;
    const implementationContent = `## Phase 1: Research

**Status:** completed

### Task p02-t01: Wire the reader

**Status:** completed
`;

    const progress = parseTaskProgress(planContent, implementationContent);
    expect(progress).toEqual({
      total: 1,
      completed: 1,
      currentTaskId: null,
      phases: [
        {
          phaseId: 'p02',
          name: 'Build',
          total: 1,
          completed: 1,
          isRevision: false,
        },
      ],
    });
    expect(
      parseTaskProgress(planContent, implementationContent, {
        phaseUnits: false,
      }),
    ).toEqual(progress);
    for (const phase of progress.phases) {
      expect(phase).not.toHaveProperty('unit');
      expect(phase).not.toHaveProperty('provisional');
      expect(phase).not.toHaveProperty('taskRecords');
    }
  });
});

describe('parseTaskProgress in phase-unit mode', () => {
  const phaseUnits = { phaseUnits: true } as const;

  it('counts each taskless phase as one unit and accepts a completed phase marker', () => {
    const planContent = `## Phase p01: Research the parser contract

**Intent:** Learn the parser contract.
**Exit evidence:** Notes recorded.

## Phase p02: Build the reader

**Intent:** Wire the reader.
**Exit evidence:** Tests pass.
`;
    const implementationContent = `---
oat_current_task_id: p02
---

## Phase p01: Research the parser contract

**Status:** completed
**Base:** 531e86a0f4b2c7d9e1f3a5b7c9d1e3f5a7b9c1d3
**Head:** 9c0f3a1d2e4f6a8b0c2d4e6f8a0b2c4d6e8f0a2b

## Phase p02: Build the reader

**Status:** in_progress
`;

    expect(
      parseTaskProgress(planContent, implementationContent, phaseUnits),
    ).toEqual({
      total: 2,
      completed: 1,
      currentTaskId: 'p02',
      phases: [
        {
          phaseId: 'p01',
          name: 'Research the parser contract',
          total: 1,
          completed: 1,
          isRevision: false,
          unit: 'phase',
          provisional: false,
          taskRecords: { total: 0, completed: 0 },
        },
        {
          phaseId: 'p02',
          name: 'Build the reader',
          total: 1,
          completed: 0,
          isRevision: false,
          unit: 'phase',
          provisional: false,
          taskRecords: { total: 0, completed: 0 },
        },
      ],
    });
  });

  it('ends phase marker ownership at any heading, including a task heading', () => {
    const planContent = `## Phase p01: Research

**Intent:** Learn.
`;
    const implementationContent = `## Phase p01: Research

Summary prose without a phase status marker.

### Task p01-t01: Pin taskless-phase behavior

**Status:** completed
`;

    const progress = parseTaskProgress(
      planContent,
      implementationContent,
      phaseUnits,
    );
    expect(progress.completed).toBe(0);
    expect(progress.phases[0]).toMatchObject({
      phaseId: 'p01',
      total: 1,
      completed: 0,
      taskRecords: { total: 1, completed: 1 },
    });
  });

  it('lets a provisional plan phase override a journal completion', () => {
    const planContent = `## Phase p01: Research

**Intent:** Learn.
**Provisional:** yes
`;
    const implementationContent = `## Phase p01: Research

**Status:** completed
`;

    expect(
      parseTaskProgress(planContent, implementationContent, phaseUnits),
    ).toMatchObject({
      total: 1,
      completed: 0,
      phases: [
        {
          phaseId: 'p01',
          total: 1,
          completed: 0,
          provisional: true,
          unit: 'phase',
        },
      ],
    });
  });

  it('ignores plan task headings for totals and counts task records from the journal only', () => {
    const planContent = `## Phase p01: Research

**Intent:** Learn.

### Task p01-t01: A plan task heading
### Task p01-t02: Another plan task heading
`;
    const implementationContent = `## Phase p01: Research

**Status:** in_progress

### Task p01-t01: First record

**Status:** completed

### Task p01-t03: Second record

**Status:** in_progress

### Task p02-t01: Record from another phase

**Status:** completed
`;

    const progress = parseTaskProgress(
      planContent,
      implementationContent,
      phaseUnits,
    );
    expect(progress.total).toBe(1);
    expect(progress.completed).toBe(0);
    expect(progress.phases).toHaveLength(1);
    expect(progress.phases[0]?.taskRecords).toEqual({
      total: 2,
      completed: 1,
    });
  });

  it('counts revision phases as units', () => {
    const planContent = `## Phase p01: Research

**Intent:** Learn.

## Phase p-rev1: Address review

**Intent:** Fix findings.
`;
    const implementationContent = `## Phase p01: Research

**Status:** completed

## Phase p-rev01: Address review

**Status:** completed
`;

    expect(
      parseTaskProgress(planContent, implementationContent, phaseUnits),
    ).toMatchObject({
      total: 2,
      completed: 2,
      phases: [
        { phaseId: 'p01', isRevision: false, completed: 1 },
        { phaseId: 'p-rev1', isRevision: true, completed: 1 },
      ],
    });
  });

  it('rejects a status marker with trailing text', () => {
    const planContent = `## Phase p01: Research

**Intent:** Learn.
`;
    const implementationContent = `## Phase p01: Research

**Status:** completed # note
`;

    expect(
      parseTaskProgress(planContent, implementationContent, phaseUnits),
    ).toMatchObject({ total: 1, completed: 0 });
  });

  it('treats an extracted phase as pending in v1', () => {
    const planContent = `## Phase p01: Research

**Intent:** Learn.
`;
    const implementationContent = `## Phase p01: Research

**Status:** extracted
**Extracted to:** follow-up-project
`;

    const progress = parseTaskProgress(
      planContent,
      implementationContent,
      phaseUnits,
    );
    expect(progress).toMatchObject({ total: 1, completed: 0 });
    expect(progress.phases[0]).not.toHaveProperty('extracted');
  });

  it('reads an extracted goal phase as an extracted unit excluded from totals', () => {
    const planContent = `## Phase p01: Research

**Intent:** Learn.

## Phase p02: Build

**Intent:** Build.
**Provisional:** yes

## Phase p03: Ship

**Intent:** Ship.
`;
    const implementationContent = `## Phase p01: Research

**Status:** completed

## Phase p02: Build

**Status:** extracted
**Extracted to:** build-child

## Phase p03: Ship

**Status:** extracted
`;

    const progress = parseTaskProgress(planContent, implementationContent, {
      phaseUnits: true,
      extractedUnits: true,
    });
    expect(progress).toMatchObject({ total: 2, completed: 1 });
    expect(progress.phases).toEqual([
      expect.objectContaining({ phaseId: 'p01', total: 1, completed: 1 }),
      {
        phaseId: 'p02',
        name: 'Build',
        total: 0,
        completed: 0,
        isRevision: false,
        unit: 'phase',
        provisional: false,
        extracted: { to: 'build-child' },
        taskRecords: { total: 0, completed: 0 },
      },
      // Extracted without its target reads as pending.
      expect.objectContaining({ phaseId: 'p03', total: 1, completed: 0 }),
    ]);
    expect(progress.phases[2]).not.toHaveProperty('extracted');
    // Every selected unit stays visible; the extracted one counts zero.
    expect(
      selectPhaseUnits(progress, ['p02', 'p03']).map((phase) => phase.phaseId),
    ).toEqual(['p02', 'p03']);

    // The extraction precedence is goal-only: brief keeps reading it as
    // pending, and the option is ignored without phase-units.
    expect(
      parseTaskProgress(planContent, implementationContent, phaseUnits),
    ).toMatchObject({ total: 3, completed: 1 });
    expect(
      parseTaskProgress(planContent, implementationContent, {
        extractedUnits: true,
      }),
    ).toEqual(parseTaskProgress(planContent, implementationContent));
  });

  it('ignores phase headings and markers inside fenced examples', () => {
    const planContent = `## Phase p01: Research

**Intent:** Learn.

\`\`\`markdown
## Phase p09: Example only

**Provisional:** yes
\`\`\`
`;
    const implementationContent = `## Phase p01: Research

\`\`\`markdown
**Status:** completed
\`\`\`

**Status:** in_progress
`;

    const progress = parseTaskProgress(
      planContent,
      implementationContent,
      phaseUnits,
    );
    expect(progress.total).toBe(1);
    expect(progress.completed).toBe(0);
    expect(progress.phases.map((phase) => phase.phaseId)).toEqual(['p01']);
  });
});

describe('parsePhaseMarkers', () => {
  it('reads exact phase marker lines under each journal phase heading', () => {
    const markers = parsePhaseMarkers(`## Phase p01: Research

**Status:** completed
**Base:** 531e86a0f4b2c7d9e1f3a5b7c9d1e3f5a7b9c1d3
**Head:** 9c0f3a1d2e4f6a8b0c2d4e6f8a0b2c4d6e8f0a2b
**Executor:** root

## Phase 2: Build

**Status:** extracted
**Extracted to:** follow-up-project

## Phase p03: Ship

**Head:** abc1234

## Phase p04: Unknown status

**Status:** done
`);

    expect([...markers.entries()]).toEqual([
      [
        'p01',
        {
          status: 'completed',
          base: '531e86a0f4b2c7d9e1f3a5b7c9d1e3f5a7b9c1d3',
          head: '9c0f3a1d2e4f6a8b0c2d4e6f8a0b2c4d6e8f0a2b',
          extractedTo: null,
        },
      ],
      [
        'p02',
        {
          status: 'extracted',
          base: null,
          head: null,
          extractedTo: 'follow-up-project',
        },
      ],
      ['p03', { status: 'pending', base: null, head: null, extractedTo: null }],
      ['p04', { status: 'pending', base: null, head: null, extractedTo: null }],
    ]);
  });
});

describe('parseProvisionalPhaseIds', () => {
  it('collects phases marked provisional with the exact yes value', () => {
    expect(
      parseProvisionalPhaseIds(`## Phase p01: Research

**Provisional:** no

## Phase p02: Build

**Provisional:** yes

## Phase p03: Ship

**Provisional:** yes, probably

## Phase p04: Later

### Notes

**Provisional:** yes
`),
    ).toEqual(new Set(['p02']));
  });
});

describe('normalizePhaseId', () => {
  it('normalizes ordinary and revision spellings and rejects anything else', () => {
    expect(normalizePhaseId('p1')).toBe('p01');
    expect(normalizePhaseId('p001')).toBe('p01');
    expect(normalizePhaseId('p-rev01')).toBe('p-rev1');
    expect(normalizePhaseId('m01')).toBeNull();
    expect(normalizePhaseId('p01-t01')).toBeNull();
  });
});

describe('selectPhaseUnits', () => {
  const progress = parseTaskProgress(
    `## Phase p01: Research

**Intent:** Learn.

## Phase p02: Build

**Intent:** Build.

## Phase p03: Ship

**Intent:** Ship.
`,
    '',
    { phaseUnits: true },
  );

  it('returns scoped units in document order regardless of scope order', () => {
    expect(
      selectPhaseUnits(progress, ['p03', 'p01']).map((phase) => phase.phaseId),
    ).toEqual(['p01', 'p03']);
  });

  it('returns every unit for a null scope', () => {
    expect(
      selectPhaseUnits(progress, null).map((phase) => phase.phaseId),
    ).toEqual(['p01', 'p02', 'p03']);
  });

  it('ignores scope ids that name no phase', () => {
    expect(
      selectPhaseUnits(progress, ['p09', 'p02']).map((phase) => phase.phaseId),
    ).toEqual(['p02']);
  });
});
