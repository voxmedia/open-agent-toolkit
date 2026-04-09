import { describe, expect, it } from 'vitest';

import { parseTaskProgress } from './tasks';

describe('parseTaskProgress', () => {
  it('parses task counts and current task across multiple phases', () => {
    const planContent = `## Phase 1: Package and Types

### Task p01-t01: Scaffold package
### Task p01-t02: Parse state
### Task p01-t03: Scan artifacts

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
`;

    const implementationContent = `---
oat_current_task_id: p-rev1-t02
---

### Task p-rev1-t01: Address review
**Status:** completed
`;

    expect(parseTaskProgress(planContent, implementationContent)).toEqual({
      total: 2,
      completed: 1,
      currentTaskId: 'p-rev1-t02',
      phases: [
        {
          phaseId: 'p-rev1',
          name: 'Review fixes',
          total: 2,
          completed: 1,
          isRevision: true,
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
