import { rm } from 'node:fs/promises';
import { join } from 'node:path';

import { createLoggerCapture } from '@commands/__tests__/helpers';
import { createProjectCompleteStateCommand } from '@commands/project/complete-state/index';
import {
  createGoalRepo,
  GATE_REVIEW_ARTIFACT,
  goalState,
  OUTCOME as GOAL_REPO_OUTCOME,
  PROJECT_REL,
  removeRepo,
  sharedMemberScenario,
  type GoalRepo,
} from '@commands/project/delivery/__tests__/goal-repo';
import type { GhRunner } from '@commands/project/links/refresh';
import { getProjectState } from '@open-agent-toolkit/control-plane';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { contextFactory, runProjectSubcommand } from './__tests__/fixtures';
import { createProjectCloseoutCheckCommand } from './index';

/**
 * The goal closeout boundary end to end (p10-t03): real files in a scratch
 * Git repository, the real project reader and the shared evidence evaluator,
 * a stubbed `gh`. One fixture combines extraction, a changed member revision,
 * a stale milestone gate, correction supersession and terminal coverage
 * without a duplicate PR.
 */

const OUTCOME = '**Goal ships** — Evidence: the boundary tests';
const REVIEW = 'reviews/archived/d02-review.md';

function plan(reviews = ''): string {
  return `---
oat_status: complete
oat_ready_for: oat-project-implement
oat_plan_source: goal
oat_template: false
---

# Project Brief: goal

## Outcomes

1. ${OUTCOME}

## Milestones

| Milestone | Phases |
| --------- | ------ |
| m01 | p01, p02, p03 |

## Phase p01: Research

**Intent:** Research.
**Exit evidence:** Research done.
**Provisional:** no

## Phase p02: Build

**Intent:** Build.
**Exit evidence:** Build done.
**Provisional:** no

## Phase p03: Correct

**Intent:** Correct the build after the d01 review.
**Exit evidence:** Correction done.
**Provisional:** no

## Phase p04: Spin out

**Intent:** Spin out.
**Exit evidence:** Child complete.
**Provisional:** no
**Extracted to:** child-goal

## Reviews

| Scope | Type | Status | Date | Artifact | Reviewed Head | Invocation |
| ----- | ---- | ------ | ---- | -------- | ------------- | ---------- |
${reviews}
`;
}

// Accepted phases carry their **Head:** line and a completed journal its
// terminal oat_status: complete-state also runs the final journal evaluator.
const EARLIER_HEAD = 'e'.repeat(40);

function journal(p03 = 'completed', p03Head = '-'): string {
  return `---
oat_status: ${p03 === 'completed' ? 'complete' : 'in_progress'}
oat_current_task_id: null
---

# Implementation: goal

## Phase p01: Research

**Status:** completed
**Head:** ${EARLIER_HEAD}

## Phase p02: Build

**Status:** completed
**Head:** ${EARLIER_HEAD}

## Phase p03: Correct

**Status:** ${p03}
**Head:** ${p03Head}

## Phase p04: Spin out

**Status:** extracted
**Extracted to:** child-goal
`;
}

interface StateOptions {
  reviewed: string;
  base: string;
  exitGate?: string;
}

function state(options: StateOptions | null): string {
  const registry =
    options === null
      ? 'oat_goal_status: active'
      : `oat_goal_status: declared_met
oat_goal_outcome_audit:
  disposition: met
  decided_at: '2026-10-11T12:00:00Z'
  declaration_ref: project-log.md#declared
  brief_identity: plan.md@abc1234
  phases:
    p01: { disposition: accepted, reason: null, scope_decision_ref: null }
    p02: { disposition: accepted, reason: null, scope_decision_ref: null }
    p03: { disposition: accepted, reason: null, scope_decision_ref: null }
    p04: { disposition: extracted, reason: null, scope_decision_ref: null }
  outcomes:
    1: { disposition: met, evidence_or_ref: boundary tests, text: '${OUTCOME}' }
oat_deliveries:
  - delivery_id: d01
    milestone: m01
    scope: [p01, p02]
    endpoint: merged
    kind: pr
    status: superseded
    superseded_by: d02
    corrects_delivery_id: null
    covers_scope_of: null
    members:
      - url: https://github.com/owner/name/pull/1
        base: '${options.base}'
        reviewed_head: '${options.base}'
        observed_head: null
        observed_base: null
        status: closed
  - delivery_id: d02
    milestone: m01
    scope: [p03]
    endpoint: merged
    kind: pr
    status: open
    superseded_by: null
    corrects_delivery_id: null
    covers_scope_of: d01
    members:
      - url: https://github.com/owner/name/pull/2
        base: '${options.base}'
        reviewed_head: '${options.reviewed}'
        observed_head: null
        observed_base: null
        status: open
    integrated_review:
      artifact: ${REVIEW}
      scope: [p01, p02, p03]
      bound_revisions: [{ member: 0, base: '${options.base}', head: '${options.reviewed}' }]
      disposition: passed
    exit_gate:
${
  options.exitGate ??
  `      status: allowed
      resolution: no_gate
      disposition: no_gate
      config_fingerprint: null
      reviewed_head: null
      subject: { kind: code, scope: [p01, p02, p03] }
      decided_at: '2026-10-11T11:00:00Z'`
}
oat_milestone_gates:
  m01:
    exit:
      status: allowed
      resolution: no_gate
      disposition: no_gate
      config_fingerprint: null
      reviewed_head: null
      subject: { kind: code, scope: [p01, p02] }
      decided_at: '2026-10-10T11:00:00Z'
      freshness: stale
      freshness_reason: 'review-receive: fixes queued from the d01 review'
oat_post_implement_sequence:
  status: complete
  source: configured
  pre_approval: [summary, pr]
  pre_approval_completed: [summary, pr]
  approval: not_required
  post_approval: []
  post_approval_completed: []
  satisfied_by: { pr: delivery-coverage }`;
  return `---
oat_phase: implement
oat_phase_status: complete
oat_lifecycle: active
oat_execution_mode: single-thread
oat_workflow_mode: goal
oat_milestone: m01
oat_milestone_status: delivered
${registry}
---

# State
`;
}

function stubGh(
  observe: () => { state: string; head: string; base: string } | 'fail',
): GhRunner & { calls: string[][] } {
  const calls: string[][] = [];
  return {
    calls,
    run: (args) => {
      calls.push(args);
      const observation = observe();
      return Promise.resolve(
        observation === 'fail'
          ? { code: 1, stdout: '', stderr: 'HTTP 502' }
          : {
              code: 0,
              stdout: JSON.stringify({
                state: observation.state,
                headRefOid: observation.head,
                baseRefOid: observation.base,
              }),
              stderr: '',
            },
      );
    },
  };
}

interface Scenario {
  repo: GoalRepo;
  reviewed: string;
  published: string;
}

/**
 * Build the end-to-end history: the child and the brief land first, the
 * correction p03 is the reviewed revision, then one bookkeeping commit
 * records the head, the passed review, the registry and the closeout.
 */
async function scenario(
  options: Partial<Omit<StateOptions, 'reviewed' | 'base'>> & {
    gateArtifact?: 'matching' | 'mismatched';
  } = {},
): Promise<Scenario> {
  const repo = await createGoalRepo('oat-goal-boundary-');
  await repo.writeRepo(
    '.oat/projects/shared/child-goal/state.md',
    '---\noat_lifecycle: complete\noat_workflow_mode: quick\noat_extracted_from: goal\n---\n',
  );
  await repo.write('plan.md', plan());
  await repo.write('implementation.md', journal('in_progress'));
  await repo.write('state.md', state(null));
  repo.commitAll('chore(oat): goal brief and child');

  await repo.writeRepo('src/app.ts', 'export const value = 3;\n');
  const reviewed = repo.commitAll('fix(p03): correct the build');

  await repo.write(REVIEW, '# d02 review\n\nNo findings.\n');
  await repo.write(
    'plan.md',
    plan(`| d02 | code | passed | 2026-10-11 | ${REVIEW} | ${reviewed} |`),
  );
  await repo.write('implementation.md', journal('completed', reviewed));
  const { gateArtifact, ...stateOptions } = options;
  const configuredCarrier = `      status: allowed
      resolution: configured
      disposition: passed
      config_fingerprint: null
      reviewed_head: '${reviewed}'
      subject: { kind: code, scope: [p01, p02, p03] }
      decided_at: '2026-10-11T11:00:00Z'`;
  await repo.write(
    'state.md',
    state({
      reviewed,
      base: repo.baseSha,
      ...stateOptions,
      ...(gateArtifact === undefined ? {} : { exitGate: configuredCarrier }),
    }),
  );
  let published = repo.commitAll(
    'chore(oat): record, receive and register d02',
  );
  if (gateArtifact !== undefined) {
    await repo.write(
      GATE_REVIEW_ARTIFACT,
      '# final gate review\n\nNo findings.\n',
    );
    await repo.write(
      'plan.md',
      plan(
        [
          `| d02 | code | passed | 2026-10-11 | ${REVIEW} | ${reviewed} | auto |`,
          `| final | code | passed | 2026-10-11 | ${GATE_REVIEW_ARTIFACT} | ${gateArtifact === 'matching' ? reviewed : published} | gate |`,
        ].join('\n'),
      ),
    );
    published = repo.commitAll('chore(oat): record final gate review');
  }
  return { repo, reviewed, published };
}

async function stackedScenario(topology: 'linear' | 'misordered'): Promise<{
  repo: GoalRepo;
  gh: GhRunner;
}> {
  const target = await createGoalRepo('oat-goal-stack-boundary-');
  await target.writeRepo(
    '.oat/projects/shared/child-goal/state.md',
    '---\noat_lifecycle: complete\noat_workflow_mode: quick\noat_extracted_from: goal\n---\n',
  );
  await target.write('plan.md', plan());
  await target.write('implementation.md', journal('in_progress'));
  await target.write('state.md', state(null));
  target.commitAll('chore(oat): goal brief and child');

  let lower: string;
  if (topology === 'misordered') {
    target.git(['checkout', '-q', '-b', 'lower']);
    await target.writeRepo('src/lower.ts', 'export const lower = 1;\n');
    lower = target.commitAll('feat: unrelated lower layer');
    target.git(['checkout', '-q', 'main']);
  } else {
    await target.writeRepo('src/app.ts', 'export const value = 2;\n');
    lower = target.commitAll('feat: lower layer');
  }
  await target.writeRepo('src/app.ts', 'export const value = 3;\n');
  const middle = target.commitAll('feat: middle layer');
  await target.writeRepo('src/app.ts', 'export const value = 4;\n');
  const tip = target.commitAll('feat: tip layer');

  await target.write(REVIEW, '# d02 stack review\n\nNo findings.\n');
  await target.write(
    'plan.md',
    plan(`| d02 | code | passed | 2026-10-11 | ${REVIEW} | ${tip} |`),
  );
  await target.write('implementation.md', journal('completed', tip));
  const stackEntry = `  - delivery_id: d02
    milestone: m01
    scope: [p03]
    endpoint: merged
    kind: stack
    status: open
    superseded_by: null
    corrects_delivery_id: null
    covers_scope_of: d01
    members:
      - url: https://github.com/owner/name/pull/2
        base: '${target.baseSha}'
        reviewed_head: '${lower}'
        observed_head: null
        observed_base: null
        status: open
      - url: https://github.com/owner/name/pull/3
        base: '${target.baseSha}'
        reviewed_head: '${middle}'
        observed_head: null
        observed_base: null
        status: open
      - url: https://github.com/owner/name/pull/4
        base: '${target.baseSha}'
        reviewed_head: '${tip}'
        observed_head: null
        observed_base: null
        status: open
    integrated_review:
      artifact: ${REVIEW}
      scope: [p01, p02, p03]
      bound_revisions:
        - { member: 0, base: '${target.baseSha}', head: '${lower}' }
        - { member: 1, base: '${target.baseSha}', head: '${middle}' }
        - { member: 2, base: '${target.baseSha}', head: '${tip}' }
      disposition: passed
    exit_gate:
      status: allowed
      resolution: configured
      disposition: passed
      config_fingerprint: null
      reviewed_head: '${tip}'
      subject: { kind: code, scope: [p01, p02, p03] }
      decided_at: '2026-10-11T11:00:00Z'
`;
  await target.write(
    'state.md',
    state({ reviewed: tip, base: target.baseSha }).replace(
      /  - delivery_id: d02[\s\S]*?(?=oat_milestone_gates:)/,
      stackEntry,
    ),
  );
  target.commitAll(`chore(oat): register ${topology} stack`);

  const observations = [lower, middle, tip];
  let index = 0;
  return {
    repo: target,
    gh: stubGh(() => ({
      state: 'MERGED',
      head: observations[index++]!,
      base: target.baseSha,
    })),
  };
}

describe('goal closeout boundary (end to end)', () => {
  let repo: GoalRepo | undefined;
  let originalExitCode: number | undefined;

  beforeEach(() => {
    originalExitCode = process.exitCode as number | undefined;
    process.exitCode = undefined;
  });

  afterEach(async () => {
    process.exitCode = originalExitCode;
    await removeRepo(repo);
    repo = undefined;
  });

  function dependencies(gh: GhRunner) {
    return {
      resolveProjectRoot: async () => repo!.root,
      env: {},
      gh,
    };
  }

  async function closeoutCheck(gh: GhRunner) {
    const capture = createLoggerCapture();
    process.exitCode = undefined;
    await runProjectSubcommand(
      createProjectCloseoutCheckCommand({
        ...dependencies(gh),
        buildCommandContext: contextFactory(
          { root: repo!.root, home: repo!.root },
          capture,
        ),
      }),
      'closeout-check',
      [PROJECT_REL],
      ['--json'],
    );
    return {
      payload: capture.jsonPayloads[0] as Record<string, unknown>,
      exitCode: process.exitCode as number | undefined,
    };
  }

  async function completeState(gh: GhRunner) {
    const capture = createLoggerCapture();
    process.exitCode = undefined;
    await runProjectSubcommand(
      createProjectCompleteStateCommand({
        ...dependencies(gh),
        buildCommandContext: contextFactory(
          { root: repo!.root, home: repo!.root },
          capture,
        ),
        now: () => new Date('2026-10-11T13:00:00Z'),
      }),
      'complete-state',
      [PROJECT_REL],
      ['--json'],
    );
    return {
      payload: capture.jsonPayloads[0] as Record<string, unknown>,
      exitCode: process.exitCode as number | undefined,
    };
  }

  function observed(head: () => string, prState = 'MERGED') {
    return stubGh(() => ({
      state: prState,
      head: head(),
      base: repo!.baseSha,
    }));
  }

  it('completes extraction + changed member revision + stale milestone gate + correction supersession without a duplicate PR', async () => {
    const built = await scenario();
    repo = built.repo;
    const gh = observed(() => built.published);
    const before = repo.git(['status', '--porcelain', '--untracked-files=all']);

    const checked = await closeoutCheck(gh);
    expect(checked.payload).toMatchObject({ status: 'complete' });
    expect(checked.exitCode).toBe(0);
    // Read-only observation: only the terminal delivery's member is viewed,
    // nothing is created, and no file changes.
    expect(gh.calls).toEqual([
      [
        'pr',
        'view',
        'https://github.com/owner/name/pull/2',
        '--json',
        'state,headRefOid,baseRefOid',
      ],
    ]);
    expect(repo.git(['status', '--porcelain', '--untracked-files=all'])).toBe(
      before,
    );
    // The changed member revision is a bookkeeping successor, not the review.
    expect(built.published).not.toBe(built.reviewed);

    const completed = await completeState(gh);
    expect(completed.payload).toMatchObject({ status: 'ok' });
    expect(await repo.read('state.md')).toContain('oat_lifecycle: complete');
    expect(gh.calls.flat()).not.toContain('create');
  });

  describe('guard goal-terminal-observation', () => {
    it('refuses completion without writes when a member cannot be observed', async () => {
      const built = await scenario();
      repo = built.repo;
      const stateBefore = await repo.read('state.md');

      const completed = await completeState(stubGh(() => 'fail'));
      expect(completed.exitCode).toBe(1);
      expect(String(completed.payload['message'])).toContain(
        'goal_observation_failed',
      );
      expect(await repo.read('state.md')).toBe(stateBefore);
    });

    it('refuses completion without writes when a required input is unreadable', async () => {
      const built = await scenario();
      repo = built.repo;
      await rm(join(repo.projectPath, 'implementation.md'));
      const stateBefore = await repo.read('state.md');
      const gh = observed(() => built.published);

      const checked = await closeoutCheck(gh);
      expect(checked.payload).toMatchObject({
        status: 'incomplete',
        invariant: 'goal_inputs_unreadable',
        route: 'oat-project-goal',
      });
      const completed = await completeState(gh);
      expect(completed.exitCode).toBe(1);
      expect(await repo.read('state.md')).toBe(stateBefore);
    });
  });

  describe('guard goal-carrier-subject at the closeout boundary', () => {
    const exitGate = (subject: string, reviewedHead = 'null') =>
      `      status: allowed
      resolution: no_gate
      disposition: no_gate
      config_fingerprint: null
      reviewed_head: ${reviewedHead}
      subject: { kind: code, scope: ${subject} }
      decided_at: '2026-10-11T11:00:00Z'`;

    it.each([
      ['a changed subject', exitGate('[p03]'), /subject-changed/],
      [
        'a fabricated reviewed head',
        exitGate('[p01, p02, p03]', `'${'c'.repeat(40)}'`),
        /no review occurred/,
      ],
    ])('refuses %s on a no_gate carrier', async (_label, gate, pattern) => {
      const built = await scenario({ exitGate: gate });
      repo = built.repo;
      const checked = await closeoutCheck(observed(() => built.published));
      expect(checked.payload).toMatchObject({
        status: 'incomplete',
        invariant: 'goal_coverage_incomplete',
        route: 'oat-project-implement',
      });
      expect(String(checked.payload['message'])).toMatch(pattern);
    });

    it('keeps an unchanged no_gate carrier valid while the milestone working carrier is stale', async () => {
      const built = await scenario();
      repo = built.repo;
      const checked = await closeoutCheck(observed(() => built.published));
      expect(checked.payload).toMatchObject({ status: 'complete' });
    });
  });

  it('keeps a delivery exit binding fresh across its matching gate artifact commit', async () => {
    const built = await scenario({ gateArtifact: 'matching' });
    repo = built.repo;

    const checked = await closeoutCheck(observed(() => built.published));

    expect(checked.payload).toMatchObject({ status: 'complete' });
    expect(checked.exitCode).toBe(0);
  });

  it('rejects a delivery gate artifact whose reviewed head differs from the binding', async () => {
    const built = await scenario({ gateArtifact: 'mismatched' });
    repo = built.repo;

    const checked = await closeoutCheck(observed(() => built.published));

    expect(checked.payload).toMatchObject({
      status: 'incomplete',
      invariant: 'goal_coverage_incomplete',
    });
    expect(JSON.stringify(checked.payload)).toContain('disallowed-path');
    expect(checked.exitCode).toBe(1);
  });

  it('refuses a substantive successor of the reviewed revision and names the review owner', async () => {
    const built = await scenario();
    repo = built.repo;
    await repo.writeRepo('src/app.ts', 'export const value = 4;\n');
    const substantive = repo.commitAll('feat: after review');
    const checked = await closeoutCheck(observed(() => substantive));
    expect(checked.payload).toMatchObject({
      status: 'incomplete',
      invariant: 'goal_coverage_incomplete',
      route: 'oat-project-review-provide',
    });
  });

  it('accepts a linear terminal stack whose exit carrier was reviewed at the tip', async () => {
    const built = await stackedScenario('linear');
    repo = built.repo;

    const checked = await closeoutCheck(built.gh);

    expect(checked.payload).toMatchObject({ status: 'complete' });
    expect(checked.exitCode).toBe(0);
  });

  it('refuses a terminal stack whose lower member is not an ancestor of the tip', async () => {
    const built = await stackedScenario('misordered');
    repo = built.repo;

    const checked = await closeoutCheck(built.gh);

    expect(checked.payload).toMatchObject({
      status: 'incomplete',
      invariant: 'goal_coverage_incomplete',
    });
    expect(JSON.stringify(checked.payload)).toContain('stack-order');
    expect(checked.exitCode).toBe(1);
  });

  it('refuses an open member against a merged endpoint', async () => {
    const built = await scenario();
    repo = built.repo;
    const checked = await closeoutCheck(
      observed(() => built.published, 'OPEN'),
    );
    expect(checked.payload).toMatchObject({
      status: 'incomplete',
      route: 'oat-project-pr-progress',
    });
    expect(String(checked.payload['message'])).toContain('endpoint-unmet');
  });

  it('agrees with the router on the same audit fixture', async () => {
    const built = await scenario();
    repo = built.repo;
    const gh = observed(() => built.published);
    const valid = await getProjectState(repo.projectPath);
    expect(valid.goalOutcomeAuditValidation?.valid).toBe(true);
    expect((await closeoutCheck(gh)).payload).toMatchObject({
      status: 'complete',
    });

    // Omit p03 from the audit: both name oat-project-goal for audit repair.
    await repo.write(
      'state.md',
      (await repo.read('state.md')).replace(
        '    p03: { disposition: accepted, reason: null, scope_decision_ref: null }\n',
        '',
      ),
    );
    const omitted = await getProjectState(repo.projectPath);
    expect(omitted.goalOutcomeAuditValidation?.valid).toBe(false);
    expect(omitted.recommendation.skill).toBe('oat-project-goal');
    expect((await closeoutCheck(gh)).payload).toMatchObject({
      status: 'incomplete',
      invariant: 'goal_audit_invalid',
      route: 'oat-project-goal',
    });
  });

  it('refuses a wrong child backlink and accepts the matching completed child', async () => {
    const built = await scenario();
    repo = built.repo;
    const gh = observed(() => built.published);
    await repo.writeRepo(
      '.oat/projects/shared/child-goal/state.md',
      '---\noat_lifecycle: complete\noat_extracted_from: other-goal\n---\n',
    );
    const wrong = await closeoutCheck(gh);
    expect(wrong.payload).toMatchObject({
      status: 'incomplete',
      invariant: 'goal_extraction_unresolved',
    });
    expect(String(wrong.payload['message'])).toContain(
      'child-backlink-mismatch',
    );

    await repo.writeRepo(
      '.oat/projects/shared/child-goal/state.md',
      '---\noat_lifecycle: complete\noat_extracted_from: goal\n---\n',
    );
    expect((await closeoutCheck(gh)).payload).toMatchObject({
      status: 'complete',
    });
  });
  describe('shared member PR (probe row 22, M2)', () => {
    const sharedJournal = `---
oat_current_task_id: null
---

# Implementation: goal

## Phase p01: Research

**Status:** completed

## Phase p02: Build

**Status:** completed

## Phase p03: Ship

**Status:** completed

## Final Summary (for PR/docs)

**Goal declared met:** 2026-10-11 by user at abc1234
`;
    const declared = `oat_goal_status: declared_met
oat_goal_outcome_audit:
  disposition: met
  decided_at: '2026-10-11T12:00:00Z'
  declaration_ref: implementation.md#final-summary-for-prdocs
  brief_identity: plan.md@abc1234
  phases:
    p01: { disposition: accepted, reason: null, scope_decision_ref: null }
    p02: { disposition: accepted, reason: null, scope_decision_ref: null }
    p03: { disposition: accepted, reason: null, scope_decision_ref: null }
  outcomes:
    1: { disposition: met, evidence_or_ref: evaluator tests, text: '${GOAL_REPO_OUTCOME}' }`;

    async function sharedTerminal(omit?: 'd02') {
      repo = await createGoalRepo('oat-goal-shared-');
      await repo.write('implementation.md', sharedJournal);
      repo.commitAll('chore(oat): record phase heads');
      const shared = await sharedMemberScenario(repo);
      await repo.write(
        'state.md',
        goalState(
          `oat_milestone: m02\noat_milestone_status: delivered\n${declared.replace('oat_goal_status: declared_met\n', '')}\n${shared.registry(omit ? { omit } : {})}`,
        ).replace('oat_goal_status: active', 'oat_goal_status: declared_met'),
      );
      const head = repo.commitAll('chore(oat): declare and register d01, d02');
      return observed(() => head);
    }

    it('accepts two terminal deliveries on one member PR, each judged on its own scope', async () => {
      const gh = await sharedTerminal();
      const checked = await closeoutCheck(gh);
      expect(JSON.stringify(checked.payload)).not.toContain('review-not-fresh');
      expect(['complete', 'not_required']).toContain(checked.payload['status']);
      expect(checked.exitCode ?? 0).toBe(0);
    });

    it('reports the sibling-only phase uncovered when one shared delivery is removed', async () => {
      const gh = await sharedTerminal('d02');
      const checked = await closeoutCheck(gh);
      expect(checked.payload).toMatchObject({
        status: 'incomplete',
        invariant: 'goal_coverage_incomplete',
      });
      expect(JSON.stringify(checked.payload)).toContain('phase-uncovered');
      expect(checked.exitCode).toBe(1);
    });
  });
});
