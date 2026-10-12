/**
 * Journal evaluator fixtures.
 *
 * Provenance: hand-authored minimal projects shaped on the current templates
 * (`.oat/templates/implementation.md`, `implementation-brief.md`) and on this
 * repository's own quick journal (`.oat/projects/shared/artifact-cleanup/
 * implementation.md`: phase sections, `### Task` blocks, `### Review
 * Received: pNN` receipts). Run lines come from the real projection
 * (`recordProjectDispatch` + `projectDispatchRunLine`, the code
 * `oat project dispatch record --format line` runs), never typed by hand.
 * The flow-style state frontmatter is an excerpt of the archived
 * `docs-improvement-overhaul/state.md`.
 */
import {
  projectDispatchRunLine,
  recordProjectDispatch,
} from '@commands/project/dispatch/record';
import type { GenericDispatchRecord } from '@providers/identity/generic-dispatch-record';

export const PLAN = `---
oat_status: complete
oat_ready_for: oat-project-implement
oat_plan_source: quick
---

# Implementation Plan: demo

## Phase 1: Foundation

### Task p01-t01: Add reader

**Files:** \`src/reader.ts\`

### Task p01-t02: Add command

**Files:** \`src/command.ts\`

## Phase 2: Docs

### Task p02-t01: Document it

**Files:** \`docs/reader.md\`

## Reviews

| Scope | Type | Status | Date | Artifact |
| ----- | ---- | ------ | ---- | -------- |
| p01   | code | passed | 2026-10-12 | reviews/archived/p01.md |
`;

/**
 * `PLAN` with a fenced example task heading under Phase 2. The example is
 * not a plan record, so the plan still declares three tasks (p02: 1).
 */
export const PLAN_WITH_FENCED_EXAMPLE = PLAN.replace(
  '**Files:** `docs/reader.md`\n',
  '**Files:** `docs/reader.md`\n\nA task heading looks like this:\n\n```markdown\n### Task p02-t02: Example\n```\n',
);

/** `PLAN` declaring p01-t01 a second time under another spelling. */
export const PLAN_WITH_DUPLICATE_TASK = PLAN.replace(
  '### Task p01-t02: Add command',
  '### Task p1-t1: Add reader again\n\n### Task p01-t02: Add command',
);

/** `PLAN` with p01-t02 declared under Phase 2 instead of Phase 1. */
export const PLAN_WITH_MISPLACED_TASK = PLAN.replace(
  '### Task p01-t02: Add command\n\n**Files:** `src/command.ts`\n\n## Phase 2: Docs\n',
  '## Phase 2: Docs\n\n### Task p01-t02: Add command\n\n**Files:** `src/command.ts`\n',
);

/** A journal whose overview counts the fenced example as a plan task. */
export function overviewCountingFencedExample(valid: string): string {
  return replaceOnce(
    replaceOnce(
      valid,
      '| Phase 2 | complete | 1     | 1/1       |',
      '| Phase 2 | complete | 2     | 1/2       |',
    ),
    '**Total:** 3/3 tasks completed',
    '**Total:** 3/4 tasks completed',
  );
}

export const STATE = `---
oat_phase: implement
oat_phase_status: complete
oat_current_task: null
oat_workflow_mode: quick
oat_blockers: []
---

# Project State
`;

/** Flow-style state frontmatter (archived docs-improvement-overhaul excerpt). */
export const FLOW_STYLE_STATE = `---
oat_current_task: null
oat_implement_exit_gate:
  {
    'status': 'allowed',
    'disposition': 'passed',
    'receive_correlation':
      {
        'run_id': '45d2802b-263d-447c-904b-5a36d35b1dd9',
        'scope': 'final',
      },
    'failure': null,
  }
oat_post_implement_sequence:
  {
    'status': 'complete',
    'final_phase': 'p02',
    'pre_approval': ['summary', 'document', 'pr'],
    'pre_approval_completed': ['summary', 'document', 'pr'],
    'approval': 'approved',
    'approval_source': 'user',
    'post_approval': [],
    'post_approval_completed': [],
    'failure': null,
  }
oat_blockers: []
oat_phase: implement # Current phase: discovery | spec | design | plan | implement | decomposition
oat_phase_status: complete # Implementation approved; PR remains open, not merged.
oat_workflow_mode: quick # spec-driven | quick | import | lite
oat_pr_status: open # null | ready | open | closed | merged — actual PR state for the current project
---

# Project State
`;

function dispatchRecord(
  overrides: Partial<GenericDispatchRecord>,
): GenericDispatchRecord {
  return {
    request_id: 'demo-p01-implementation',
    caller: 'oat-project-implement',
    scope: 'p01',
    objective: 'Implement phase p01',
    action: 'implementation',
    role_name: 'oat-phase-implementer',
    role_class: 'implementation',
    provider: 'claude',
    dispatch_context: 'phase-dispatch',
    dispatch_policy: 'frontier',
    dispatch_ceiling: 'high',
    catalog_snapshot: {
      id: 'catalog-1',
      source: 'user-sync',
      observed_at: '2026-10-12T00:00:00.000Z',
    },
    authority: 'phase-files',
    role_selector: 'oat-phase-implementer-claude-claude-opus-5-5-high',
    model_selector: 'claude-opus-5-5',
    model_selector_granularity: 'exact-native-model-choice',
    effort_selector: 'high',
    reasoning_mode_selector: null,
    service_tier_selector: null,
    selection_source: 'policy-resolved',
    candidates_considered: [
      'oat-phase-implementer-claude-claude-opus-5-5-high',
    ],
    selection_reason: 'native-catalog',
    selected_route: 'native',
    deadline_seconds: 7200,
    retry_limit: 0,
    payload: { variant: 'oat-phase-implementer-claude-claude-opus-5-5-high' },
    launch_status: 'accepted',
    child_outcome: 'DONE',
    configured_invocation_evidence: ['dispatch ceiling resolver'],
    runtime_confirmation: 'not-reported',
    diagnostics: [],
    continuation_events: [],
    ...overrides,
  };
}

/** One real run line, as `dispatch record --format line` renders it. */
export async function realRunLine(
  overrides: Partial<GenericDispatchRecord> = {},
): Promise<string> {
  const record = dispatchRecord(overrides);
  const result = await recordProjectDispatch({
    input: {
      record,
      event: {
        kind: 'canonical-role-resolution',
        requestId: record.request_id,
        source: 'canonical-role-resolver',
        evidence: {
          status: 'resolved',
          dependency: 'workflows',
          canonicalRole: 'oat-phase-implementer',
          tier: 'user',
          validation: 'direct-canonical',
          canonicalPath: '<user>/agents/oat-phase-implementer.md',
          selectedPath: '<user>/agents/oat-phase-implementer.md',
          roleVersion: '1.2.3',
          contentDigest: `sha256:${'a'.repeat(64)}`,
          candidateMisses: [],
        },
      },
    },
  });
  return projectDispatchRunLine(result, {
    dispatchStamp:
      'Dispatch: scope=p01 action=implementation role=implementer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5 effort_axis=selected:high dispatch_policy=frontier dispatch_ceiling=high target=oat-phase-implementer-claude-claude-opus-5-5-high',
  }).line;
}

/** A valid, completed quick journal. `runLine` comes from `realRunLine()`. */
export function journal(runLine: string): string {
  return `---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-10-12
oat_current_task_id: null
oat_generated: false
---

# Implementation: demo

**Started:** 2026-10-11
**Last Updated:** 2026-10-12

## Progress Overview

| Phase   | Status   | Tasks | Completed |
| ------- | -------- | ----- | --------- |
| Phase 1 | complete | 2     | 2/2       |
| Phase 2 | complete | 1     | 1/1       |

**Total:** 3/3 tasks completed

---

## Phase 1: Foundation

**Status:** complete
**Started:** 2026-10-11
**Completed:** 2026-10-12

Verification: \`pnpm test\` 12/12 pass.

### Task p01-t01: Add reader

**Status:** completed
**Commit:** 1111111

- Reader reads records.

### Task p01-t02: Add command

**Status:** completed
**Commit:** 2222222

- Command prints records.

### Review Received: p01

- Round 1: 0/0/1/0. M1 (missing help line) fixed in p01-t02; no deferral.

## Phase 2: Docs

**Status:** complete
**Started:** 2026-10-12
**Completed:** 2026-10-12

### Task p02-t01: Document it

**Status:** completed
**Commit:** 3333333

## Orchestration Runs

<!-- orchestration-runs-start -->

- ${runLine}

<!-- orchestration-runs-end -->

## Reviews and Gates

**Gate:** final code review · **Scope:** final · **Outcome:** passed

## Deferred Findings

- None.

## Deviations from Plan / Design

- None.

## Final Summary (for PR/docs)

**What shipped:**

- A record reader and its command.

## References

- Plan: \`plan.md\`
`;
}

export const GOAL_PLAN = `---
oat_status: complete
oat_plan_source: brief
---

# Project Brief: goal-demo

## Outcomes

1. **Readers exist** — Evidence: reader tests
2. **Later work is deferred** — Evidence: scope decision

## Milestones

| Milestone | Phases |
| --------- | ------ |
| m01       | p01, p02, p03 |

## Phase p01: Readers

**Intent:** Build readers.
**Exit evidence:** Tests.

## Phase p02: Extracted

**Intent:** Split out.
**Exit evidence:** Child project.

## Phase p03: Later

**Intent:** Later.
**Exit evidence:** Later.
`;

const SHA_A = 'a'.repeat(40);
const SHA_B = 'b'.repeat(40);

export const GOAL_JOURNAL = `---
oat_status: complete
oat_ready_for: null
oat_current_task_id: null
oat_generated: false
---

# Implementation: goal-demo

## Phase p01: Readers

**Status:** completed
**Base:** ${SHA_A}
**Head:** ${SHA_B}
**Executor:** phase-implementer:p01

Verified with the reader tests.

### Task p01-t01: First attempt

**Status:** failed
**Executor:** worker:w1

The first approach failed; no commit.

### Task p01-t02: Reader

**Status:** completed
**Commit:** ${SHA_B}

## Phase p02: Extracted

**Status:** extracted
**Extracted to:** goal-demo-child

## Phase p03: Later

**Status:** pending

## Orchestration Runs

## Reviews and Gates

## Deferred Findings

- p03 deferred by scope decision DR-261012-defer-p03 (approved by the operator).

## Deviations from Plan / Design

- None.

## References

- Brief: \`plan.md\`
`;

export const GOAL_STATE = `---
oat_phase: implement
oat_phase_status: complete
oat_current_task: null
oat_workflow_mode: goal
oat_goal_outcome_audit:
  disposition: met_with_deferrals
  decided_at: '2026-10-12T00:00:00Z'
  declaration_ref: abc1234
  brief_identity: plan.md@abc1234
  phases:
    p01: { disposition: accepted }
    p02: { disposition: extracted }
    p03:
      disposition: deferred
      reason: Later work moves to a follow-up.
      scope_decision_ref: DR-261012-defer-p03
  outcomes:
    '1':
      disposition: met
      evidence_or_ref: p01
      text: '**Readers exist** — Evidence: reader tests'
    '2':
      disposition: deferred
      evidence_or_ref: DR-261012-defer-p03
      text: '**Later work is deferred** — Evidence: scope decision'
---

# Project State
`;

function replaceOnce(source: string, from: string, to: string): string {
  if (!source.includes(from)) {
    throw new Error(`fixture anchor missing: ${from}`);
  }
  return source.replace(from, to);
}

/**
 * Replaces the request identity of the first real run line in `source`
 * (`request=<id>` → `request=<value>`); `~` is the projection's null.
 */
export function withRunLineRequest(source: string, value: string): string {
  const pattern = /^(- run\/v1[^\n]*?[ \t]request=)[^ \t\n]*/m;
  if (!pattern.test(source)) {
    throw new Error('fixture anchor missing: run line request field');
  }
  return source.replace(pattern, (_match, head: string) => `${head}${value}`);
}

/**
 * The p02-t03 negative controls as journal transforms over the valid journal,
 * each with the reason code the evaluator must refuse it for. Shared by the
 * public `complete-state` boundary suite.
 */
export const NEGATIVE_VARIANTS: ReadonlyArray<{
  name: string;
  code: string;
  apply: (valid: string, runningLine: string) => string;
  /** The plan the variant runs against; `PLAN` when omitted. */
  plan?: string;
}> = [
  {
    name: 'fenced fake task heading',
    code: 'task-block-missing',
    apply: (valid) =>
      replaceOnce(
        valid,
        '### Task p02-t01: Document it\n\n**Status:** completed\n**Commit:** 3333333',
        '```markdown\n### Task p02-t01: Document it\n\n**Status:** completed\n**Commit:** 3333333\n```',
      ),
  },
  {
    name: 'leaked status and SHA',
    code: 'task-status-missing',
    apply: (valid) =>
      replaceOnce(
        replaceOnce(
          valid,
          '**Status:** completed\n**Commit:** 3333333',
          '- Docs written.',
        ),
        '## Orchestration Runs\n',
        '## Orchestration Runs\n\n**Status:** completed\n**Commit:** 3333333\n',
      ),
  },
  {
    name: 'duplicate normalized ids',
    code: 'task-duplicate-block',
    apply: (valid) =>
      replaceOnce(
        valid,
        '### Review Received: p01',
        '### Task p1-t2: Add command again\n\n**Status:** completed\n**Commit:** 4444444\n\n### Review Received: p01',
      ),
  },
  {
    name: 'blocked header under a completed overview',
    code: 'phase-status-disagrees',
    apply: (valid) =>
      replaceOnce(
        valid,
        '## Phase 1: Foundation\n\n**Status:** complete',
        '## Phase 1: Foundation\n\n**Status:** blocked',
      ),
  },
  {
    name: 'plan task without a block',
    code: 'task-block-missing',
    apply: (valid) =>
      replaceOnce(
        valid,
        '### Task p02-t01: Document it\n\n**Status:** completed\n**Commit:** 3333333\n',
        '',
      ),
  },
  {
    name: 'checklist instead of blocks',
    code: 'task-block-missing',
    apply: (valid) =>
      replaceOnce(
        valid,
        '### Task p02-t01: Document it\n\n**Status:** completed\n**Commit:** 3333333\n',
        '- [x] p02-t01: Document it - 3333333\n',
      ),
  },
  {
    name: 'payload under Deferred Findings with the run slot empty',
    code: 'dispatch-payload',
    apply: (valid) =>
      replaceOnce(
        valid.replace(/^- run\/v1[^\n]*\n/m, ''),
        '## Deferred Findings\n\n- None.',
        '## Deferred Findings\n\n```json\n{ "request_id": "demo-p01", "caller": "oat-project-implement", "role_name": "oat-phase-implementer" }\n```',
      ),
  },
  {
    name: 'unresolved run line',
    code: 'run-line-unresolved',
    apply: (valid, runningLine) =>
      replaceOnce(
        valid,
        '<!-- orchestration-runs-end -->',
        `- ${runningLine}\n\n<!-- orchestration-runs-end -->`,
      ),
  },
  {
    name: 'run line without a request identity',
    code: 'run-line-malformed',
    apply: (valid) => withRunLineRequest(valid, '~'),
  },
  {
    name: 'unfilled inline-code path slot',
    code: 'template-residue',
    apply: (valid) =>
      replaceOnce(
        valid,
        '- Reader reads records.',
        '- Reader reads records.\n- `{path}` - Reader module.',
      ),
  },
  {
    name: 'duplicate plan task identity',
    code: 'plan-task-duplicate',
    // The overview agrees with the progress the duplicate produces, so
    // nothing but the plan record itself is wrong.
    apply: (valid) =>
      withOverview(valid, '| Phase 1 | complete | 3     | 3/3       |', '4/4'),
    plan: PLAN_WITH_DUPLICATE_TASK,
  },
  {
    name: 'plan task outside its phase',
    code: 'plan-task-misplaced',
    apply: (valid) =>
      withOverview(valid, '| Phase 1 | complete | 1     | 1/1       |', '2/2'),
    plan: PLAN_WITH_MISPLACED_TASK,
  },
  {
    name: '{Task Name} residue',
    code: 'template-residue',
    apply: (valid) =>
      replaceOnce(
        valid,
        '**Commit:** 3333333',
        '**Commit:** 3333333\n\n- {Task Name}',
      ),
  },
];

/** Rewrites the Phase 1 overview row and the overview total. */
export function withOverview(
  valid: string,
  phaseOneRow: string,
  total: string,
): string {
  return replaceOnce(
    replaceOnce(
      valid,
      '| Phase 1 | complete | 2     | 2/2       |',
      phaseOneRow,
    ),
    '**Total:** 3/3 tasks completed',
    `**Total:** ${total} tasks completed`,
  );
}

/** The one eligible gap the override controls use. */
export function commitGap(valid: string): string {
  return replaceOnce(
    valid,
    '**Status:** completed\n**Commit:** 1111111',
    '**Status:** completed',
  );
}

export function withDeviation(source: string, line: string): string {
  return replaceOnce(
    source,
    '## Deviations from Plan / Design\n\n- None.',
    `## Deviations from Plan / Design\n\n${line}`,
  );
}
