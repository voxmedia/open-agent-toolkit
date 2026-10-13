import { describe, expect, it } from 'vitest';

import {
  classifyMetadataField,
  normalizeTaskId,
  readFrontmatterMetadata,
  readJournalRecords,
} from './journal-records';
import { parseTaskProgress } from './tasks';

const PLAN = `## Phase 1: Foundation

### Task p01-t01: Real task
### Task p01-t02: Second task

## Phase 2: Follow-up

### Task p02-t01: Later task
`;

// The ownership fixtures below are hand-authored minimal journals (not
// captured output): a task block quoted inside a fence, a phase
// `**Status:**` marker under the next `##` heading after a task without one,
// and the minimally different block that owns its status.
const FENCED_FAKE_TASK = `---
oat_current_task_id: null
---

## Phase 1: Foundation

### Task p01-t01: Real task

**Status:** in_progress

\`\`\`markdown
### Task p01-t02: Second task
\`\`\`

**Status:** completed
`;

const LEAKED_STATUS = `---
oat_current_task_id: null
---

## Phase 1: Foundation

### Task p01-t02: Second task

**Commit:** -

## Phase 2: Follow-up

**Status:** completed
**Commit:** abc1234
`;

const OWNED_STATUS = `---
oat_current_task_id: null
---

## Phase 1: Foundation

### Task p01-t02: Second task

**Status:** completed
**Commit:** abc1234

## Phase 2: Follow-up

**Status:** pending
`;

describe('readJournalRecords ownership (guard: record-reader-ownership)', () => {
  it('opens no record for a fenced fake task heading and leaves the real block ambiguous', () => {
    const records = readJournalRecords(FENCED_FAKE_TASK);

    expect(records.tasks.map((task) => task.taskId)).toEqual(['p01-t01']);
    const [real] = records.tasks;
    // The status after the fence belongs to the enclosing real block, which
    // now owns two status lines: no single owned status is extracted.
    expect(real?.statuses.map((status) => status.value)).toEqual([
      'in_progress',
      'completed',
    ]);
    expect(real?.status).toBeNull();
  });

  it('never attributes a status from the next section to the previous task', () => {
    const records = readJournalRecords(LEAKED_STATUS);
    const [task] = records.tasks;

    expect(task?.taskId).toBe('p01-t02');
    expect(task?.statuses).toEqual([]);
    expect(task?.status).toBeNull();
    expect(task?.commit).toBe('-');
    expect(task?.endLine).toBe(10);
    const phase2 = records.sections.find(
      (section) => section.phase?.declaredPhaseId === 'p02',
    );
    expect(phase2?.status).toBe('completed');
    expect(phase2?.statuses[0]?.line).toBe(13);
  });

  it('attributes an owned status and commit to their own block', () => {
    const records = readJournalRecords(OWNED_STATUS);
    const [task] = records.tasks;

    expect(task?.status).toBe('completed');
    expect(task?.commit).toBe('abc1234');
    expect(task?.statuses).toEqual([{ value: 'completed', line: 9 }]);
    expect(task?.inOwningPhase).toBe(true);
    expect(task?.section?.phase?.declaredPhaseId).toBe('p01');
  });

  it('keeps sub-heading lines inside the owning task block', () => {
    const records = readJournalRecords(`## Phase 1: Foundation

### Task p01-t01: Real task

#### Verification

**Status:** completed
**Commit:** abc1234

### Task p01-t02: Second task
`);
    expect(records.tasks[0]?.status).toBe('completed');
    expect(records.tasks[0]?.commit).toBe('abc1234');
    expect(records.tasks[1]?.statuses).toEqual([]);
  });

  it('excludes indented code and frontmatter from records', () => {
    const records = readJournalRecords(`---
oat_status: complete
# ### Task p01-t09: frontmatter comment
---

### Task p01-t01: Real task

    ### Task p01-t02: Indented example
    **Status:** completed

**Status:** completed
`);
    expect(records.tasks.map((task) => task.taskId)).toEqual(['p01-t01']);
    expect(records.tasks[0]?.status).toBe('completed');
  });

  it('reads a plain valid journal identically to progress', () => {
    const journal = `---
oat_current_task_id: p02-t01
---

## Phase 1: Foundation

### Task p01-t01: Real task

**Status:** completed
**Commit:** 1111111

### Task p01-t02: Second task

**Status:** completed
**Commit:** 2222222

## Phase 2: Follow-up

### Task p02-t01: Later task

**Status:** pending
**Commit:** -

## References
`;
    const records = readJournalRecords(journal);
    expect(
      records.tasks.map((task) => [task.taskId, task.status, task.commit]),
    ).toEqual([
      ['p01-t01', 'completed', '1111111'],
      ['p01-t02', 'completed', '2222222'],
      ['p02-t01', 'pending', '-'],
    ]);
    expect(records.sections.map((section) => section.text)).toEqual([
      'Phase 1: Foundation',
      'Phase 2: Follow-up',
      'References',
    ]);
    expect(parseTaskProgress(PLAN, journal).completed).toBe(2);
  });

  it('returns both records of a duplicate normalized id, including revision spellings', () => {
    const records = readJournalRecords(`## Phase 1: Foundation

### Task p01-t01: Real task
**Status:** completed

### Task p1-t1: Real task again
**Status:** completed

## Phase p-rev1: Fixes

### Task prev1-t01: Fix
**Status:** completed

### Task p-rev1-t01: Fix in the legacy spelling
**Status:** completed
`);
    expect(
      records.tasks.map((task) => [task.rawTaskId, task.taskId, task.line]),
    ).toEqual([
      ['p01-t01', 'p01-t01', 3],
      ['p1-t1', 'p01-t01', 6],
      ['prev1-t01', 'prev1-t01', 11],
      ['p-rev1-t01', 'prev1-t01', 14],
    ]);
    expect(records.tasks.every((task) => task.inOwningPhase)).toBe(true);
  });
});

describe('normalizeTaskId', () => {
  it('normalizes ordinary and revision spellings and rejects anything else', () => {
    expect(normalizeTaskId('p1-t1')).toEqual({
      taskId: 'p01-t01',
      phaseId: 'p01',
      isRevision: false,
    });
    expect(normalizeTaskId('p-rev01-t3')).toEqual({
      taskId: 'prev1-t03',
      phaseId: 'p-rev1',
      isRevision: true,
    });
    expect(normalizeTaskId('prev1-t03')?.taskId).toBe('prev1-t03');
    expect(normalizeTaskId('p01')).toBeNull();
    expect(normalizeTaskId('p-rev1t03')).toBeNull();
  });
});

describe('task-mode progress adopts the shared reader', () => {
  it('counts neither the fenced fake task nor the unowned status', () => {
    expect(parseTaskProgress(PLAN, FENCED_FAKE_TASK).completed).toBe(0);
    expect(parseTaskProgress(PLAN, LEAKED_STATUS).completed).toBe(0);
  });

  it('counts the minimally different owned status', () => {
    expect(parseTaskProgress(PLAN, OWNED_STATUS)).toEqual({
      total: 3,
      completed: 1,
      currentTaskId: null,
      phases: [
        {
          phaseId: 'p01',
          name: 'Foundation',
          total: 2,
          completed: 1,
          isRevision: false,
        },
        {
          phaseId: 'p02',
          name: 'Follow-up',
          total: 1,
          completed: 0,
          isRevision: false,
        },
      ],
    });
  });
});

describe('readFrontmatterMetadata', () => {
  // Provenance: frontmatter excerpt (keys, nesting and flow-style quoting kept;
  // most map entries elided) from the archived
  // `docs-improvement-overhaul/state.md`, the audit's flow-style YAML false
  // positive.
  const FLOW_STYLE_STATE = `---
oat_current_task: null
oat_implement_exit_gate:
  {
    'status': 'allowed',
    'disposition': 'passed',
    'receive_correlation':
      {
        'run_id': '45d2802b-263d-447c-904b-5a36d35b1dd9',
        'scope': 'final',
        'type': 'code',
      },
    'receive_completed': true,
    'failure': null,
  }
oat_post_implement_sequence:
  {
    'status': 'complete',
    'final_phase': 'p06',
    'pre_approval': ['summary', 'document', 'pr'],
    'failure': null,
  }
oat_blockers: []
oat_phase: implement # Current phase: discovery | spec | design | plan | implement | decomposition
oat_phase_status: complete # Implementation approved; PR remains open, not merged.
oat_pr_status: open # null | ready | open | closed | merged — actual PR state for the current project
oat_lifecycle: complete
---

# Project State
`;

  it('parses flow-style YAML frontmatter', () => {
    const metadata = readFrontmatterMetadata(FLOW_STYLE_STATE);
    expect(metadata.state).toBe('ok');
    if (metadata.state !== 'ok') {
      return;
    }
    expect(metadata.record.oat_phase_status).toBe('complete');
    expect(metadata.record.oat_post_implement_sequence).toMatchObject({
      status: 'complete',
      pre_approval: ['summary', 'document', 'pr'],
    });
    expect(
      classifyMetadataField(metadata, 'oat_phase_status', ['complete']),
    ).toEqual({ state: 'terminal', value: 'complete' });
  });

  it('distinguishes missing, malformed and non-terminal metadata', () => {
    expect(readFrontmatterMetadata('# No frontmatter\n')).toEqual({
      state: 'missing',
    });

    const malformed = readFrontmatterMetadata(`---
oat_status: complete
oat_status: in_progress
---
`);
    expect(malformed.state).toBe('malformed');
    expect(
      classifyMetadataField(malformed, 'oat_status', ['complete']).state,
    ).toBe('malformed');

    const ok = readFrontmatterMetadata(`---
oat_status: in_progress
oat_ready_for: null
---
`);
    expect(classifyMetadataField(ok, 'oat_status', ['complete'])).toEqual({
      state: 'non-terminal',
      value: 'in_progress',
    });
    expect(classifyMetadataField(ok, 'oat_lifecycle', ['complete'])).toEqual({
      state: 'missing',
    });
    expect(classifyMetadataField(ok, 'oat_ready_for', [null])).toEqual({
      state: 'terminal',
      value: null,
    });
  });
});
