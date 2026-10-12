import { evaluateCloseout } from '@commands/project/closeout-check/closeout-invariant';
import { parseTaskProgress } from '@open-agent-toolkit/control-plane';
import { beforeAll, describe, expect, it } from 'vitest';

import {
  FLOW_STYLE_STATE,
  GOAL_JOURNAL,
  GOAL_PLAN,
  GOAL_STATE,
  journal,
  PLAN,
  realRunLine,
  STATE,
} from './__tests__/fixtures';
import { evaluateJournal } from './evaluator';
import type { JournalCheckBoundary } from './types';

let VALID = '';
let RUNNING_LINE = '';

beforeAll(async () => {
  VALID = journal(await realRunLine());
  RUNNING_LINE = await realRunLine({
    request_id: 'demo-p02-implementation',
    scope: 'p02',
    child_outcome: 'running',
  });
});

function check(
  journalContent: string,
  options: {
    boundary?: JournalCheckBoundary;
    scope?: string[];
    plan?: string;
    state?: string;
  } = {},
) {
  return evaluateJournal({
    boundary: options.boundary ?? 'completion',
    scope: options.scope ?? null,
    planContent: options.plan ?? PLAN,
    journalContent,
    stateContent: options.state ?? STATE,
  });
}

function codes(journalContent: string, options?: Parameters<typeof check>[1]) {
  return check(journalContent, options).reasons.map((reason) => reason.code);
}

/**
 * Baseline: the closeout invariant `complete-state` evaluated before this
 * change. It never read the journal, so every otherwise-valid fixture below
 * was accepted by it; the cases prove the new evaluator refuses them.
 */
async function oldCompleteStateAccepts(state = STATE): Promise<boolean> {
  const result = await evaluateCloseout({
    stateContent: state,
    autonomousFlag: false,
    env: {},
    resolveConfigured: async () => false,
  });
  return result.status !== 'incomplete';
}

function replaceOnce(source: string, from: string, to: string): string {
  if (!source.includes(from)) {
    throw new Error(`fixture anchor missing: ${from}`);
  }
  return source.replace(from, to);
}

describe('valid baseline', () => {
  it('accepts the valid journal at every boundary', async () => {
    expect(await oldCompleteStateAccepts()).toBe(true);
    expect(check(VALID)).toMatchObject({ status: 'ok', reasons: [] });
    expect(check(VALID, { boundary: 'implement-preflight' }).status).toBe('ok');
    expect(check(VALID, { boundary: 'review', scope: ['p01'] }).status).toBe(
      'ok',
    );
  });
});

describe('negative controls at completion (baseline accepted, refused for the named reason)', () => {
  it('fenced fake task heading', async () => {
    const fake = replaceOnce(
      VALID,
      `### Task p02-t01: Document it

**Status:** completed
**Commit:** 3333333`,
      `\`\`\`markdown
### Task p02-t01: Document it

**Status:** completed
**Commit:** 3333333
\`\`\``,
    );
    expect(await oldCompleteStateAccepts()).toBe(true);
    const result = check(fake);
    expect(result.status).toBe('refused');
    expect(result.reasons.map((reason) => reason.code)).toContain(
      'task-block-missing',
    );
  });

  it('leaked status and SHA from the next section', () => {
    const leaked = replaceOnce(
      replaceOnce(
        VALID,
        `**Status:** completed
**Commit:** 3333333`,
        '- Docs written.',
      ),
      `## Orchestration Runs
`,
      `## Orchestration Runs

**Status:** completed
**Commit:** 3333333
`,
    );
    const result = check(leaked);
    expect(result.reasons).toContainEqual(
      expect.objectContaining({
        code: 'task-status-missing',
        line: expect.any(Number),
      }),
    );
  });

  it('duplicate normalized ids, including a second spelling', () => {
    const duplicate = replaceOnce(
      VALID,
      '### Review Received: p01',
      `### Task p1-t2: Add command again

**Status:** completed
**Commit:** 4444444

### Review Received: p01`,
    );
    expect(codes(duplicate)).toContain('task-duplicate-block');
  });

  it('duplicate revision spellings for one id', () => {
    const plan = `${PLAN}
## Phase p-rev1: Review fixes

### Task prev1-t01: Fix it
`;
    const revisionJournal = (blocks: string) =>
      replaceOnce(
        replaceOnce(VALID, '**Total:** 3/3', '**Total:** 4/4'),
        '## Orchestration Runs',
        `## Phase p-rev1: Review fixes

**Status:** complete

${blocks}
## Orchestration Runs`,
      );
    const single = revisionJournal(`### Task prev1-t01: Fix it

**Status:** completed
**Commit:** 5555555
`);
    const double = revisionJournal(`### Task prev1-t01: Fix it

**Status:** completed
**Commit:** 5555555

### Task p-rev1-t01: Fix it (legacy spelling)

**Status:** completed
**Commit:** 6666666
`);
    // Compatibility: one spelling is accepted.
    expect(check(single, { plan }).status).toBe('ok');
    expect(codes(double, { plan })).toContain('task-duplicate-block');
  });

  it('blocked header under a completed overview', () => {
    const blocked = replaceOnce(
      VALID,
      `## Phase 1: Foundation

**Status:** complete`,
      `## Phase 1: Foundation

**Status:** blocked`,
    );
    const line =
      blocked.split('\n').findIndex((text) => text === '**Status:** blocked') +
      1;
    const result = check(blocked);
    expect(result.reasons).toContainEqual(
      expect.objectContaining({ code: 'phase-status-disagrees', line }),
    );
  });

  it('plan task without a block', () => {
    const missing = replaceOnce(
      VALID,
      `### Task p02-t01: Document it

**Status:** completed
**Commit:** 3333333
`,
      '',
    );
    expect(codes(missing)).toContain('task-block-missing');
  });

  it('checklist instead of blocks', () => {
    const checklist = replaceOnce(
      VALID,
      `### Task p02-t01: Document it

**Status:** completed
**Commit:** 3333333
`,
      `- [x] p02-t01: Document it - 3333333
`,
    );
    const result = check(checklist);
    const reason = result.reasons.find(
      (entry) => entry.code === 'task-block-missing',
    );
    expect(reason?.message).toMatch(/checklist is a display/);
  });

  it('payload under Deferred Findings with the run slot empty, ownership never length (guard: journal-check-placement)', () => {
    const payload = replaceOnce(
      replaceOnce(VALID, `- ${VALID.match(/run\/v1[^\n]*/)?.[0] ?? ''}\n`, ''),
      `## Deferred Findings

- None.`,
      `## Deferred Findings

\`\`\`json
{ "request_id": "demo-p01", "caller": "oat-project-implement", "role_name": "oat-phase-implementer" }
\`\`\``,
    );
    const result = check(payload);
    expect(result.reasons).toContainEqual(
      expect.objectContaining({ code: 'dispatch-payload' }),
    );
    // A three-line payload: refused for what it is, not for its size.
    expect(
      result.reasons.find((reason) => reason.code === 'dispatch-payload')
        ?.message,
    ).toMatch(/Deferred Findings/);
    // The same block marked as quoted evidence is accepted.
    const quoted = payload.replace('```json', '```json quoted-evidence');
    expect(codes(quoted)).not.toContain('dispatch-payload');
  });

  it('unresolved run line at completion, from real --format line output (guard: journal-check-terminal-shape)', () => {
    const unresolved = replaceOnce(
      VALID,
      '<!-- orchestration-runs-end -->',
      `- ${RUNNING_LINE}

<!-- orchestration-runs-end -->`,
    );
    expect(codes(unresolved)).toContain('run-line-unresolved');
    // At review the same live line warns and does not refuse.
    const review = check(unresolved, { boundary: 'review', scope: ['p02'] });
    expect(review.status).toBe('ok');
    expect(review.warnings.map((warning) => warning.code)).toContain(
      'run-line-unresolved',
    );
  });

  it('{Task Name} residue', () => {
    const residue = replaceOnce(
      VALID,
      '**Commit:** 3333333',
      `**Commit:** 3333333

- {Task Name}`,
    );
    expect(codes(residue)).toEqual(['template-residue']);
  });

  it('ordinary brace prose is not template residue', () => {
    const prose = replaceOnce(
      VALID,
      '- Reader reads records.',
      '- Reader reads records and returns {status, reasons} to the caller.',
    );
    expect(check(prose)).toMatchObject({ status: 'ok', reasons: [] });
    // Placeholder vocabulary and slot-shaped braces stay residue.
    for (const residue of [
      '- Reader reads records for {Task Name}.',
      '- {anything the template asked for}',
      '**Verification:** {command(s) and result}',
    ]) {
      expect(
        codes(replaceOnce(VALID, '- Reader reads records.', residue)),
      ).toEqual(['template-residue']);
    }
  });

  it('receipt appended after References', () => {
    const appended = `${VALID}
### Review Received: p02

- Round 1: 0/0/0/0.
`;
    expect(codes(appended)).toContain('receipt-misplaced');
  });

  it('task-scoped receipt in its task phase is accepted', () => {
    const taskScoped = replaceOnce(
      VALID,
      '### Review Received: p01',
      '### Review Received: p01-t02',
    );
    expect(check(taskScoped).status).toBe('ok');
    // The same task-scoped receipt under another phase is refused.
    const elsewhere = replaceOnce(
      VALID,
      '### Review Received: p01',
      '### Review Received: p02-t01',
    );
    expect(codes(elsewhere)).toEqual(['receipt-misplaced']);
  });

  it('p-revN receipt in its own revision phase is accepted, in the corrected phase refused', () => {
    const plan = `${PLAN}
## Phase p-rev1: Review fixes

### Task prev1-t01: Fix it
`;
    const revision = (receiptInRevision: boolean) =>
      replaceOnce(
        replaceOnce(
          replaceOnce(VALID, '**Total:** 3/3', '**Total:** 4/4'),
          '### Review Received: p01',
          receiptInRevision
            ? '### Review Received: p01 (round 1)'
            : '### Review Received: p-rev1',
        ),
        '## Orchestration Runs',
        `## Phase p-rev1: Review fixes

**Status:** complete

### Task prev1-t01: Fix it

**Status:** completed
**Commit:** 5555555
${receiptInRevision ? '\n### Review Received: p-rev1\n\n- Round 1: 0/0/0/0.\n' : ''}
## Orchestration Runs`,
      );
    expect(check(revision(true), { plan })).toMatchObject({
      status: 'ok',
      reasons: [],
    });
    expect(codes(revision(false), { plan })).toEqual(['receipt-misplaced']);
  });
});

describe('override controls (one eligible gap: completed task without commit evidence)', () => {
  const gap = () =>
    replaceOnce(
      VALID,
      `**Status:** completed
**Commit:** 1111111`,
      '**Status:** completed',
    );
  const withOverride = (line: string) =>
    replaceOnce(
      gap(),
      `## Deviations from Plan / Design

- None.`,
      `## Deviations from Plan / Design

${line}`,
    );

  it('refuses the gap without an override', async () => {
    expect(await oldCompleteStateAccepts()).toBe(true);
    expect(codes(gap())).toEqual(['task-commit-missing']);
  });

  it('accepts a matching code, scope and decision id', () => {
    const result = check(
      withOverride(
        '**Override:** evidence-lost · **Authorized by:** DR-261012-lost-sha · **Scope:** p01-t01 · the commit was squashed away',
      ),
    );
    expect(result.status).toBe('ok');
    expect(result.overrides).toEqual([
      expect.objectContaining({
        code: 'evidence-lost',
        authorizedBy: 'DR-261012-lost-sha',
        scope: 'p01-t01',
        applied: true,
      }),
    ]);
  });

  it('refuses when only the scope changes to another task or phase (guard: journal-check-override-scope)', () => {
    for (const scope of ['p01-t02', 'p02']) {
      const result = check(
        withOverride(
          `**Override:** evidence-lost · **Authorized by:** DR-261012-lost-sha · **Scope:** ${scope} · the commit was squashed away`,
        ),
      );
      expect(result.status).toBe('refused');
      expect(result.reasons.map((reason) => reason.code)).toEqual([
        'task-commit-missing',
      ]);
      expect(result.warnings.map((warning) => warning.code)).toContain(
        'override-unused',
      );
    }
  });

  it('refuses a malformed override line', () => {
    const result = check(
      withOverride(
        '**Override:** evidence-lost · **Scope:** p01-t01 · no authorizing decision',
      ),
    );
    expect(result.reasons.map((reason) => reason.code)).toEqual(
      expect.arrayContaining(['override-malformed', 'task-commit-missing']),
    );
  });

  it('never covers a non-overridable finding', () => {
    const result = check(
      replaceOnce(
        withOverride(
          '**Override:** operator-accepted-gap · **Authorized by:** DR-261012-gap · **Scope:** p01 · accepted',
        ),
        '- Round 1:',
        '- {Task Name} Round 1:',
      ),
    );
    expect(result.reasons.map((reason) => reason.code)).toEqual([
      'template-residue',
    ]);
  });
});

describe('compatibility (accepted by both versions)', () => {
  it('flow-style YAML state frontmatter', async () => {
    expect(await oldCompleteStateAccepts(FLOW_STYLE_STATE)).toBe(true);
    expect(check(VALID, { state: FLOW_STYLE_STATE }).status).toBe('ok');
  });

  it('a goal journal with a failed record, an extracted phase and an approved deferral', () => {
    const result = check(GOAL_JOURNAL, {
      plan: GOAL_PLAN,
      state: GOAL_STATE,
    });
    expect(result).toMatchObject({ status: 'ok', workflowMode: 'goal' });
    // The deferral is never normalized into an accepted phase.
    const progress = parseTaskProgress(GOAL_PLAN, GOAL_JOURNAL, {
      phaseUnits: true,
      extractedUnits: true,
    });
    expect(
      progress.phases.find((phase) => phase.phaseId === 'p03'),
    ).toMatchObject({
      total: 1,
      completed: 0,
    });
  });

  it('refuses the same goal journal when the deferral is not approved by the audit', () => {
    const unapproved = GOAL_STATE.replace(
      /\n {4}p03:\n[\s\S]*?scope_decision_ref: DR-261012-defer-p03\n/,
      '\n',
    );
    expect(
      codes(GOAL_JOURNAL, { plan: GOAL_PLAN, state: unapproved }),
    ).toContain('phase-not-accepted');
  });
});

describe('caller boundaries', () => {
  const preStep16 = () =>
    VALID.replace('oat_status: complete', 'oat_status: in_progress').replace(
      'oat_current_task_id: null',
      'oat_current_task_id: p02-t01',
    );
  const preStep16State = STATE.replace(
    'oat_phase_status: complete',
    'oat_phase_status: in_progress',
  ).replace('oat_current_task: null', 'oat_current_task: p02-t01');

  it('implement-preflight accepts unwritten terminal headers and pointers', () => {
    expect(
      check(preStep16(), {
        boundary: 'implement-preflight',
        state: preStep16State,
      }).status,
    ).toBe('ok');
    expect(
      codes(preStep16(), { boundary: 'completion', state: preStep16State }),
    ).toEqual(
      expect.arrayContaining([
        'journal-status-not-terminal',
        'journal-pointer-not-cleared',
        'state-status-disagrees',
        'state-pointer-not-cleared',
      ]),
    );
  });

  it('refuses a stale oat_ready_for under oat_status: complete and accepts null or a closeout skill', () => {
    const stale = VALID.replace(
      'oat_ready_for: null',
      'oat_ready_for: oat-project-implement',
    );
    const result = check(stale);
    expect(result.reasons).toEqual([
      expect.objectContaining({
        code: 'state-status-disagrees',
        path: 'implementation.md',
        line: 3,
      }),
    ]);
    expect(result.reasons[0]?.message).toContain('oat_ready_for');
    expect(check(VALID).status).toBe('ok');
    expect(
      check(
        VALID.replace(
          'oat_ready_for: null',
          'oat_ready_for: oat-project-complete',
        ),
      ).status,
    ).toBe('ok');
    // Implement's pre-Step-16 boundary does not own this header.
    expect(check(stale, { boundary: 'implement-preflight' }).status).toBe('ok');
  });

  it('accepts pr_open as a completion posture', () => {
    expect(
      check(VALID, {
        state: STATE.replace(
          'oat_phase_status: complete',
          'oat_phase_status: pr_open',
        ),
      }).status,
    ).toBe('ok');
  });

  it('review --scope p01 ignores future phases', () => {
    const inFlight = replaceOnce(
      VALID,
      `### Task p02-t01: Document it

**Status:** completed
**Commit:** 3333333`,
      `### Task p02-t01: Document it

**Status:** in_progress
**Commit:** -`,
    );
    expect(check(inFlight, { boundary: 'review', scope: ['p01'] }).status).toBe(
      'ok',
    );
    expect(codes(inFlight, { boundary: 'review', scope: ['p02'] })).toContain(
      'task-not-completed',
    );
  });
});

describe('same bytes through control-plane progress and the evaluator', () => {
  // Expected values are written out by hand from the fixture text, never
  // derived from either implementation: plan declares p01-t01, p01-t02,
  // p02-t01 and prev1-t01. The journal owns completed statuses for p01-t01,
  // p01-t02 and two spellings of prev1-t01, while p02-t01 exists only inside
  // a fence. Completion count: 3 of 4 (p01-t01, p01-t02, prev1-t01 once).
  const plan = `${PLAN}
## Phase p-rev1: Review fixes

### Task prev1-t01: Fix it
`;
  const bytes = `---
oat_status: complete
oat_current_task_id: null
---

## Phase 1: Foundation

**Status:** complete

### Task p01-t01: Add reader

**Status:** completed
**Commit:** 1111111

### Task p01-t02: Add command

**Status:** completed
**Commit:** 2222222

## Phase 2: Docs

**Status:** in_progress

\`\`\`markdown
### Task p02-t01: Document it

**Status:** completed
**Commit:** 3333333
\`\`\`

## Phase p-rev1: Review fixes

**Status:** complete

### Task p-rev1-t1: Fix it

**Status:** completed
**Commit:** 5555555

### Task prev1-t01: Fix it again

**Status:** completed
**Commit:** 6666666

## References
`;

  it('agrees on the completion count and reports the owned-record findings', () => {
    const progress = parseTaskProgress(plan, bytes);
    expect(progress.total).toBe(4);
    expect(progress.completed).toBe(3);
    expect(
      progress.phases.map((phase) => [
        phase.phaseId,
        phase.completed,
        phase.total,
      ]),
    ).toEqual([
      ['p01', 2, 2],
      ['p02', 0, 1],
      ['p-rev1', 1, 1],
    ]);

    const result = check(bytes, { plan });
    expect(result.reasons.map((reason) => [reason.code, reason.line])).toEqual([
      // The legacy (line 35) and canonical (line 40, counted by hand) revision
      // spellings are one normalized id, and both raw records stay visible.
      ['task-duplicate-block', 40],
      // The fenced p02-t01 is not a record: its plan task has no block.
      ['task-block-missing', null],
    ]);
  });
});
