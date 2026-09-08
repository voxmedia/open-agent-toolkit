import { describe, expect, it } from 'vitest';

import { parseTaskProgress } from './tasks';

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
