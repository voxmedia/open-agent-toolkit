import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { getProjectState, listProjects } from './project';

describe('project state integration', () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(
      tempDirs.map(async (dir) => rm(dir, { recursive: true, force: true })),
    );
    tempDirs.length = 0;
  });

  async function createDir(prefix: string): Promise<string> {
    const dir = await mkdtemp(join(tmpdir(), prefix));
    tempDirs.push(dir);
    return dir;
  }

  it('assembles a full ProjectState for a project directory', async () => {
    const repoRoot = await createDir('oat-control-plane-project-');
    const projectDir = join(repoRoot, '.oat', 'projects', 'shared', 'demo');
    await mkdir(join(repoRoot, '.oat'), { recursive: true });
    await mkdir(projectDir, { recursive: true });

    await Promise.all([
      writeFile(
        join(repoRoot, '.oat', 'config.json'),
        `${JSON.stringify({ version: 1 })}\n`,
        'utf8',
      ),
      writeFile(
        join(projectDir, 'state.md'),
        `---
oat_current_task: p02-t01
oat_last_commit: abc1234
oat_blockers:
  - task_id: p01-t03
    reason: Waiting on API contract
    since: '2026-10-03'
  - waiting on review
oat_hill_checkpoints: ["design"]
oat_hill_completed: []
oat_parallel_execution: false
oat_phase: plan
oat_phase_status: complete
oat_execution_mode: single-thread
oat_lifecycle: paused
oat_pause_timestamp: '2026-04-09T21:00:00Z'
oat_pause_reason: waiting on review
oat_workflow_mode: quick
oat_workflow_origin: native
oat_docs_updated: null
oat_pr_status: null
oat_pr_url: null
oat_project_created: '2026-04-08T17:16:52.421Z'
oat_project_completed: null
oat_project_state_updated: '2026-04-09T22:00:00Z'
oat_project_explainer:
  decision: generate
  source: interactive
  decided_at: '2026-04-09T21:30:00Z'
oat_project_recap:
  decision: generate
  source: autonomous_policy
  decided_at: '2026-04-09T21:35:00Z'
oat_generated: false
---
`,
        'utf8',
      ),
      writeFile(
        join(projectDir, 'discovery.md'),
        `---
oat_status: complete
oat_ready_for: oat-project-plan
oat_template: false
---
`,
        'utf8',
      ),
      writeFile(
        join(projectDir, 'plan.md'),
        `---
oat_status: complete
oat_ready_for: oat-project-implement
oat_template: false
---

## Phase 1: Control Plane

### Task p01-t01: Scaffold
### Task p01-t02: Parse state

## Reviews

| Scope | Type     | Status | Date       | Artifact              |
| ----- | -------- | ------ | ---------- | --------------------- |
| plan  | artifact | passed | 2026-04-09 | reviews/plan-review.md |
`,
        'utf8',
      ),
      writeFile(
        join(projectDir, 'implementation.md'),
        `---
oat_current_task_id: p02-t01
---

### Task p01-t01: Scaffold
**Status:** completed

### Task p01-t02: Parse state
**Status:** completed
`,
        'utf8',
      ),
      writeFile(
        join(projectDir, 'design.md'),
        `---
oat_status: complete
oat_template: false
---
`,
        'utf8',
      ),
      mkdir(join(projectDir, 'reviews'), { recursive: true }),
    ]);

    const projectState = await getProjectState(projectDir);

    expect(projectState.blockers).toEqual([
      {
        task_id: 'p01-t03',
        reason: 'Waiting on API contract',
        since: '2026-10-03',
      },
      'waiting on review',
    ]);
    expect(JSON.parse(JSON.stringify(projectState)).blockers).toEqual(
      projectState.blockers,
    );
    expect(projectState.name).toBe(basename(projectDir));
    expect(projectState.path).toBe('.oat/projects/shared/demo');
    expect(projectState.phase).toBe('plan');
    expect(projectState.phaseStatus).toBe('complete');
    expect(projectState.workflowMode).toBe('quick');
    expect(projectState.lifecycle).toBe('paused');
    expect(projectState.pauseTimestamp).toBe('2026-04-09T21:00:00Z');
    expect(projectState.pauseReason).toBe('waiting on review');
    expect(projectState.projectExplainer).toEqual({
      decision: 'generate',
      source: 'interactive',
      decided_at: '2026-04-09T21:30:00Z',
    });
    expect(projectState.projectRecap).toEqual({
      decision: 'generate',
      source: 'autonomous_policy',
      decided_at: '2026-04-09T21:35:00Z',
    });
    expect(projectState.progress).toEqual({
      total: 2,
      completed: 2,
      currentTaskId: 'p02-t01',
      phases: [
        {
          phaseId: 'p01',
          name: 'Control Plane',
          total: 2,
          completed: 2,
          isRevision: false,
        },
      ],
    });
    expect(projectState.reviews).toEqual([
      {
        scope: 'plan',
        type: 'artifact',
        status: 'passed',
        date: '2026-04-09',
        artifact: 'reviews/plan-review.md',
      },
    ]);
    expect(projectState.recommendation.skill).toBe('oat-project-implement');
  });

  it('lists project summaries sorted by name', async () => {
    const repoRoot = await createDir('oat-control-plane-projects-root-');
    const projectsRoot = join(repoRoot, '.oat', 'projects', 'shared');

    await mkdir(join(repoRoot, '.oat'), { recursive: true });
    await Promise.all([
      mkdir(projectsRoot, { recursive: true }),
      writeFile(
        join(repoRoot, '.oat', 'config.json'),
        `${JSON.stringify({ version: 1 })}\n`,
        'utf8',
      ),
    ]);

    await Promise.all([
      createProject(projectsRoot, 'beta', 'design', 'complete', 'complete'),
      createProject(projectsRoot, 'alpha', 'discovery', 'in_progress'),
      createProject(projectsRoot, 'gamma', 'implement', 'pr_open'),
    ]);

    const projects = await listProjects(projectsRoot);

    expect(projects.map((project) => project.name)).toEqual([
      'alpha',
      'beta',
      'gamma',
    ]);
    expect(projects[0]).toMatchObject({
      path: '.oat/projects/shared/alpha',
      phase: 'discovery',
      phaseStatus: 'in_progress',
      lifecycle: 'active',
    });
    expect(projects[1]).toMatchObject({
      path: '.oat/projects/shared/beta',
      lifecycle: 'complete',
    });
    expect(projects[2]).toMatchObject({
      path: '.oat/projects/shared/gamma',
      phase: 'implement',
      phaseStatus: 'pr_open',
      lifecycle: 'active',
    });
  });

  it('exposes null explainer decisions for existing projects without intent', async () => {
    const repoRoot = await createDir('oat-control-plane-legacy-project-');
    const projectDir = join(repoRoot, '.oat', 'projects', 'shared', 'legacy');
    await mkdir(projectDir, { recursive: true });
    await writeFile(
      join(projectDir, 'state.md'),
      `---
oat_phase: discovery
oat_phase_status: in_progress
oat_workflow_mode: spec-driven
---
`,
      'utf8',
    );

    await expect(getProjectState(projectDir)).resolves.toMatchObject({
      projectExplainer: null,
      projectRecap: null,
    });
  });

  it('recommends review-receive when an active top-level review artifact exists', async () => {
    const repoRoot = await createDir('oat-control-plane-active-review-');
    const projectDir = join(repoRoot, '.oat', 'projects', 'shared', 'demo');

    await createReviewRoutingProject(projectDir, 'complete', 'received');
    await mkdir(join(projectDir, 'reviews'), { recursive: true });
    await writeFile(
      join(projectDir, 'reviews', 'p01-review.md'),
      `---
oat_review_scope: p01
oat_review_type: code
---

# Active review
`,
      'utf8',
    );

    const projectState = await getProjectState(projectDir);

    expect(projectState.activeReviewArtifacts).toEqual([
      {
        path: 'reviews/p01-review.md',
        archived: false,
        actionable: true,
      },
    ]);
    expect(projectState.recommendation).toMatchObject({
      skill: 'oat-project-review-receive',
      reason: 'Unprocessed review feedback exists',
    });
  });

  it('rejects a received row whose scope and type do not match the artifact identity', async () => {
    const repoRoot = await createDir('oat-control-plane-mismatch-review-');
    const projectDir = join(repoRoot, '.oat', 'projects', 'shared', 'demo');

    await createReviewRoutingProject(projectDir, 'pr_open');
    await mkdir(join(projectDir, 'reviews'), { recursive: true });
    await writeFile(
      join(projectDir, 'reviews', 'p01-review.md'),
      `---
oat_review_scope: p01
oat_review_type: code
---

# Consumed review
`,
      'utf8',
    );
    await writeFile(
      join(projectDir, 'plan.md'),
      `---
oat_status: complete
oat_template: false
---

## Reviews

| Scope | Type | Status | Date | Artifact |
| ----- | ---- | ------ | ---- | -------- |
| p01 | code | passed | 2026-06-12 | reviews/p01-review.md |
| p02 | artifact | received | 2026-06-13 | reviews/p01-review.md |
| final | code | passed | 2026-06-14 | reviews/final-review.md |
`,
      'utf8',
    );

    const projectState = await getProjectState(projectDir);

    expect(projectState.activeReviewArtifacts).toEqual([
      {
        path: 'reviews/p01-review.md',
        archived: false,
        actionable: false,
      },
    ]);
    expect(projectState.recommendation.skill).toBe('oat-project-complete');
  });

  it('does not recommend review-receive for archived review history when review rows passed and the PR is open', async () => {
    const repoRoot = await createDir('oat-control-plane-archived-review-');
    const projectDir = join(repoRoot, '.oat', 'projects', 'shared', 'demo');

    await createReviewRoutingProject(projectDir, 'pr_open');
    await mkdir(join(projectDir, 'reviews', 'archived'), { recursive: true });
    await writeFile(
      join(projectDir, 'reviews', 'archived', 'p01-review.md'),
      '# Archived review\n',
      'utf8',
    );

    const projectState = await getProjectState(projectDir);

    expect(projectState.activeReviewArtifacts).toEqual([]);
    expect(projectState.recommendation.skill).not.toBe(
      'oat-project-review-receive',
    );
    expect(projectState.recommendation.skill).toBe('oat-project-complete');
  });

  it('preserves completed decomposition coordination parents in state and summaries', async () => {
    const repoRoot = await createDir('oat-control-plane-coordination-');
    const projectsRoot = join(repoRoot, '.oat', 'projects', 'shared');
    const projectDir = join(projectsRoot, 'platform-split');

    await mkdir(join(repoRoot, '.oat'), { recursive: true });
    await Promise.all([
      mkdir(projectsRoot, { recursive: true }),
      writeFile(
        join(repoRoot, '.oat', 'config.json'),
        `${JSON.stringify({ version: 1 })}\n`,
        'utf8',
      ),
    ]);
    await createProject(
      projectsRoot,
      'platform-split',
      'decomposition',
      'complete',
    );

    const projectState = await getProjectState(projectDir);
    expect(projectState).toMatchObject({
      name: 'platform-split',
      phase: 'decomposition',
      phaseStatus: 'complete',
      recommendation: {
        skill: 'none',
        reason:
          'Coordination decomposition is complete; continue one of the child implementation projects',
      },
    });

    const projects = await listProjects(projectsRoot);
    expect(projects).toHaveLength(1);
    expect(projects[0]).toMatchObject({
      name: 'platform-split',
      phase: 'decomposition',
      phaseStatus: 'complete',
      recommendation: {
        skill: 'none',
      },
    });
  });

  it('reports terminal totals for a plan with ordinary and completed revision phases', async () => {
    const repoRoot = await createDir('oat-control-plane-terminal-revision-');
    const projectDir = join(repoRoot, '.oat', 'projects', 'shared', 'demo');

    await createMixedPhaseProject(projectDir, {
      lifecycle: 'complete',
      revisionTaskStatus: 'completed',
    });

    const projectState = await getProjectState(projectDir);

    expect(projectState.progress.total).toBe(4);
    expect(projectState.progress.completed).toBe(projectState.progress.total);
    expect(projectState.progress.currentTaskId).toBeNull();
    expect(projectState.progress.phases.map((phase) => phase.phaseId)).toEqual([
      'p01',
      'p02',
      'p-rev1',
      'p-rev2',
    ]);
    expect(projectState.recommendation.skill).not.toBe('oat-project-implement');
  });

  it('does not recommend implement for a complete-lifecycle project whose revision phase is still incomplete', async () => {
    const repoRoot = await createDir('oat-control-plane-terminal-stale-');
    const projectDir = join(repoRoot, '.oat', 'projects', 'shared', 'demo');

    // Exercises the terminal guard end to end: the revision task is pending, so
    // the pre-guard recommender returned `oat-project-implement` here.
    await createMixedPhaseProject(projectDir, {
      lifecycle: 'complete',
      revisionTaskStatus: 'pending',
    });

    const projectState = await getProjectState(projectDir);

    expect(
      projectState.progress.phases.find((phase) => phase.phaseId === 'p-rev2'),
    ).toMatchObject({ total: 1, completed: 0, isRevision: true });
    expect(projectState.recommendation.skill).not.toBe('oat-project-implement');
  });

  it('still recommends implement for an active project with a null current task and an incomplete revision phase', async () => {
    const repoRoot = await createDir('oat-control-plane-active-revision-');
    const projectDir = join(repoRoot, '.oat', 'projects', 'shared', 'demo');

    await createMixedPhaseProject(projectDir, {
      lifecycle: 'active',
      revisionTaskStatus: 'pending',
    });

    const projectState = await getProjectState(projectDir);

    expect(projectState.progress.currentTaskId).toBeNull();
    expect(projectState.recommendation).toMatchObject({
      skill: 'oat-project-implement',
      reason: 'Revision work remains incomplete',
    });
  });

  it('counts a taskless accepted brief phase as one completed unit through both readers', async () => {
    const repoRoot = await createDir('oat-control-plane-brief-units-');
    const projectsRoot = join(repoRoot, '.oat', 'projects', 'shared');
    const projectDir = join(projectsRoot, 'brief-demo');
    await mkdir(join(repoRoot, '.oat'), { recursive: true });

    await createBriefProject(projectDir, {
      workflowMode: 'brief',
      journal: `## Phase p01: Research the parser contract

**Status:** completed
`,
    });

    const projectState = await getProjectState(projectDir);
    expect(projectState.workflowMode).toBe('brief');
    expect(projectState.progress).toMatchObject({ total: 1, completed: 1 });
    expect(projectState.progress.phases).toEqual([
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
    ]);

    const [summary] = await listProjects(projectsRoot);
    expect(summary).toMatchObject({
      name: 'brief-demo',
      workflowMode: 'brief',
      progress: { total: 1, completed: 1 },
    });
  });

  it('keeps the task contract for the same files under quick mode', async () => {
    const repoRoot = await createDir('oat-control-plane-brief-as-quick-');
    const projectsRoot = join(repoRoot, '.oat', 'projects', 'shared');
    const projectDir = join(projectsRoot, 'quick-demo');
    await mkdir(join(repoRoot, '.oat'), { recursive: true });

    await createBriefProject(projectDir, {
      workflowMode: 'quick',
      journal: `## Phase p01: Research the parser contract

**Status:** completed
`,
    });

    const projectState = await getProjectState(projectDir);
    expect(projectState.progress).toEqual({
      total: 0,
      completed: 0,
      currentTaskId: null,
      phases: [],
    });

    const [summary] = await listProjects(projectsRoot);
    expect(summary?.progress).toEqual({ total: 0, completed: 0 });
  });

  it('leaves a brief phase pending when only a journal task record is completed', async () => {
    const repoRoot = await createDir('oat-control-plane-brief-records-');
    const projectsRoot = join(repoRoot, '.oat', 'projects', 'shared');
    const projectDir = join(projectsRoot, 'brief-demo');
    await mkdir(join(repoRoot, '.oat'), { recursive: true });

    await createBriefProject(projectDir, {
      workflowMode: 'brief',
      journal: `## Phase p01: Research the parser contract

**Status:** in_progress

### Task p01-t01: Pin taskless-phase behavior

**Status:** completed
`,
    });

    const projectState = await getProjectState(projectDir);
    expect(projectState.progress).toMatchObject({ total: 1, completed: 0 });
    expect(projectState.progress.phases[0]).toMatchObject({
      completed: 0,
      taskRecords: { total: 1, completed: 1 },
    });

    const [summary] = await listProjects(projectsRoot);
    expect(summary?.progress).toEqual({ total: 1, completed: 0 });
  });

  it('exposes goal state, milestone membership and recovery through both readers', async () => {
    const repoRoot = await createDir('oat-control-plane-goal-state-');
    const projectsRoot = join(repoRoot, '.oat', 'projects', 'shared');
    const projectDir = join(projectsRoot, 'goal-demo');
    await mkdir(join(repoRoot, '.oat'), { recursive: true });

    await createGoalProject(projectDir, {
      state: `oat_milestone: m02
oat_milestone_status: implementing
oat_goal_status: active
oat_goal_recovery:
  milestone: m01
  delivery_id: d01
  phase_ids: [p01, p02]
  stage: reviewing
  review_artifact: null`,
      milestones: `| m01 | p01, p02 |
| m02 | p03, p04 |`,
      journal: GOAL_JOURNAL,
    });

    const projectState = await getProjectState(projectDir);
    expect(projectState).toMatchObject({
      workflowMode: 'goal',
      milestone: 'm02',
      milestoneStatus: 'implementing',
      goalStatus: 'active',
      goalOutcomeAudit: null,
      goalOutcomeAuditValidation: null,
      goalRecovery: {
        milestone: 'm01',
        delivery_id: 'd01',
        phase_ids: ['p01', 'p02'],
        stage: 'reviewing',
        review_artifact: null,
      },
      deliveries: [],
      milestoneGates: {},
      milestoneMembership: {
        present: true,
        milestones: [
          { milestoneId: 'm01', phaseIds: ['p01', 'p02'] },
          { milestoneId: 'm02', phaseIds: ['p03', 'p04'] },
        ],
        errors: [],
      },
    });
    // p04 is extracted: identity kept, excluded from totals.
    expect(projectState.progress).toMatchObject({ total: 3, completed: 2 });
    expect(projectState.progress.phases[3]).toMatchObject({
      phaseId: 'p04',
      total: 0,
      extracted: { to: 'p04-child' },
    });

    const [summary] = await listProjects(projectsRoot);
    expect(summary).toMatchObject({
      name: 'goal-demo',
      workflowMode: 'goal',
      progress: { total: 3, completed: 2 },
    });
  });

  it.each([
    [
      'a malformed Milestones table',
      '| m01 p01, p02 |\n| m02 | p03, p04 |',
      ['milestones-malformed'],
    ],
    [
      'an unknown phase id',
      '| m01 | p01, p02, p09 |\n| m02 | p03, p04 |',
      ['milestone-unknown-phase'],
    ],
    [
      'a phase in two milestones',
      '| m01 | p01, p02, p03 |\n| m02 | p03, p04 |',
      ['phase-in-multiple-milestones'],
    ],
  ])(
    'surfaces %s as a membership error instead of dropping the phase from progress',
    async (_label, milestones, expectedCodes) => {
      const repoRoot = await createDir('oat-control-plane-goal-membership-');
      const projectDir = join(repoRoot, '.oat', 'projects', 'shared', 'goal');
      await mkdir(join(repoRoot, '.oat'), { recursive: true });
      await createGoalProject(projectDir, {
        state: 'oat_milestone: m02\noat_milestone_status: implementing',
        milestones,
        journal: GOAL_JOURNAL,
      });

      const projectState = await getProjectState(projectDir);
      const membership = projectState.milestoneMembership;
      expect(membership?.errors.map((error) => error.code)).toEqual(
        expect.arrayContaining(expectedCodes),
      );
      expect(membership?.errors.length).toBeGreaterThan(0);
      // Every brief phase is still visible to progress.
      expect(
        projectState.progress.phases.map((phase) => phase.phaseId),
      ).toEqual(['p01', 'p02', 'p03', 'p04']);
    },
  );

  it('exposes the terminal audit validation result when the goal is declared met', async () => {
    const repoRoot = await createDir('oat-control-plane-goal-audit-');
    const projectDir = join(repoRoot, '.oat', 'projects', 'shared', 'goal');
    await mkdir(join(repoRoot, '.oat'), { recursive: true });
    const audit = (p03Line: string) => `oat_goal_outcome_audit:
  disposition: met
  decided_at: '2026-10-11T12:00:00Z'
  declaration_ref: project-log.md#declared
  brief_identity: plan.md@abc1234
  phases:
    p01: { disposition: accepted, reason: null, scope_decision_ref: null }
    p02: { disposition: accepted, reason: null, scope_decision_ref: null }
${p03Line}    p04: { disposition: extracted, reason: null, scope_decision_ref: null }
  outcomes:
    1: { disposition: met, evidence_or_ref: reader tests, text: '**Goal works** — Evidence: tests' }`;
    const declaredState = (p03Line: string) => `oat_milestone: m02
oat_milestone_status: delivered
oat_goal_status: declared_met
${audit(p03Line)}`;
    const completedJournal = GOAL_JOURNAL.replace(
      '**Status:** in_progress',
      '**Status:** completed',
    );

    await createGoalProject(projectDir, {
      state: declaredState(''),
      milestones: '| m01 | p01, p02 |\n| m02 | p03, p04 |',
      journal: completedJournal,
    });
    const omitted = await getProjectState(projectDir);
    expect(omitted.goalOutcomeAuditValidation).toMatchObject({
      valid: false,
      audit: null,
      errors: [
        expect.objectContaining({
          code: 'audit-phase-omitted',
          subject: 'p03',
        }),
      ],
    });

    await createGoalProject(projectDir, {
      state: declaredState(
        '    p03: { disposition: accepted, reason: null, scope_decision_ref: null }\n',
      ),
      milestones: '| m01 | p01, p02 |\n| m02 | p03, p04 |',
      journal: completedJournal,
    });
    const exhaustive = await getProjectState(projectDir);
    expect(exhaustive.goalOutcomeAuditValidation).toMatchObject({
      valid: true,
      errors: [],
    });

    await createGoalProject(projectDir, {
      state: 'oat_milestone: m02\noat_goal_status: declared_met',
      milestones: '| m01 | p01, p02 |\n| m02 | p03, p04 |',
      journal: GOAL_JOURNAL,
    });
    const undeclared = await getProjectState(projectDir);
    expect(undeclared.goalOutcomeAuditValidation?.errors).toEqual([
      expect.objectContaining({ code: 'audit-missing' }),
    ]);
  });

  it('exposes no goal fields for a brief project', async () => {
    const repoRoot = await createDir('oat-control-plane-brief-no-goal-');
    const projectDir = join(repoRoot, '.oat', 'projects', 'shared', 'brief');
    await mkdir(join(repoRoot, '.oat'), { recursive: true });
    await createBriefProject(projectDir, {
      workflowMode: 'brief',
      journal: '## Phase p01: Research the parser contract\n',
    });

    const projectState = await getProjectState(projectDir);
    for (const key of [
      'milestone',
      'milestoneStatus',
      'goalStatus',
      'goalOutcomeAuditValidation',
      'goalRecovery',
      'deliveries',
      'milestoneGates',
      'milestoneMembership',
    ]) {
      expect(projectState).not.toHaveProperty(key);
    }
  });
});

const GOAL_JOURNAL = `## Phase p01: Research

**Status:** completed

## Phase p02: Build

**Status:** completed

## Phase p03: Ship

**Status:** in_progress

## Phase p04: Spin out

**Status:** extracted
**Extracted to:** p04-child
`;

/**
 * A goal project with four phases, one outcome, the supplied `## Milestones`
 * rows under the canonical header, the supplied extra state lines and journal.
 */
async function createGoalProject(
  projectDir: string,
  options: { state: string; milestones: string; journal: string },
): Promise<void> {
  await mkdir(projectDir, { recursive: true });
  const phases = ['Research', 'Build', 'Ship', 'Spin out']
    .map(
      (name, index) => `## Phase p0${index + 1}: ${name}

**Intent:** ${name}.
**Exit evidence:** ${name} done.
**Provisional:** no
`,
    )
    .join('\n');
  await Promise.all([
    writeFile(
      join(projectDir, 'state.md'),
      `---
oat_current_task: null
oat_blockers: []
oat_hill_checkpoints: []
oat_hill_completed: []
oat_phase: implement
oat_phase_status: in_progress
oat_execution_mode: single-thread
oat_lifecycle: active
oat_workflow_mode: goal
${options.state}
---
`,
      'utf8',
    ),
    writeFile(
      join(projectDir, 'plan.md'),
      `---
oat_status: complete
oat_ready_for: oat-project-implement
oat_plan_source: goal
oat_template: false
---

# Project Brief: goal

## Outcomes

1. **Goal works** — Evidence: tests

## Milestones

| Milestone | Phases |
| --------- | ------ |
${options.milestones}

${phases}`,
      'utf8',
    ),
    writeFile(
      join(projectDir, 'implementation.md'),
      `---
oat_current_task_id: null
---

${options.journal}`,
      'utf8',
    ),
  ]);
}

/**
 * A minimal brief-mode project: one taskless phase in the plan and the
 * supplied journal body. `workflowMode` is written to `state.md` so the same
 * files can be read under the brief and task contracts.
 */
async function createBriefProject(
  projectDir: string,
  options: { workflowMode: 'brief' | 'quick'; journal: string },
): Promise<void> {
  await mkdir(projectDir, { recursive: true });
  await Promise.all([
    writeFile(
      join(projectDir, 'state.md'),
      `---
oat_current_task: null
oat_blockers: []
oat_hill_checkpoints: []
oat_hill_completed: []
oat_phase: implement
oat_phase_status: in_progress
oat_execution_mode: single-thread
oat_lifecycle: active
oat_workflow_mode: ${options.workflowMode}
oat_project_created: '2026-10-10T00:00:00Z'
oat_project_state_updated: '2026-10-10T00:00:00Z'
---
`,
      'utf8',
    ),
    writeFile(
      join(projectDir, 'plan.md'),
      `---
oat_status: complete
oat_ready_for: oat-project-implement
oat_template: false
---

# Project Brief

## Phase p01: Research the parser contract

**Intent:** Learn the parser contract.
**Exit evidence:** Notes recorded.
**Provisional:** no
`,
      'utf8',
    ),
    writeFile(
      join(projectDir, 'implementation.md'),
      `---
oat_current_task_id: null
---

${options.journal}`,
      'utf8',
    ),
  ]);
}

/**
 * A plan that mixes ordinary and revision phases across the heading dialects
 * real OAT plans use.
 *
 * Provenance — every heading and task line below is copied verbatim from a
 * captured real plan; none is invented:
 *
 * - `## Phase p01: Foundation` / `### Task p01-t01: …` and
 *   `## Phase p02: Validator CLI` / `### Task p02-t01: …` from
 *   `.oat/projects/archived/subagent-implement-refactor/plan.md:33,37,72,76`.
 * - `## Revision Phase p-rev1: Final Review Fixes` / `### Task prev1-t01: …`
 *   and `## Revision Phase p-rev2: Re-Review Polish` /
 *   `### Task prev2-t01: …` from
 *   `.oat/projects/archived/workflow-friction/plan.md:910,914,1172,1176`.
 *
 * The archives are evidence only: they are never read or mutated by this test.
 */
async function createMixedPhaseProject(
  projectDir: string,
  options: { lifecycle: string; revisionTaskStatus: string },
): Promise<void> {
  await mkdir(projectDir, { recursive: true });
  await Promise.all([
    writeFile(
      join(projectDir, 'state.md'),
      `---
oat_current_task: null
oat_last_commit: null
oat_blockers: []
oat_hill_checkpoints: []
oat_hill_completed: []
oat_parallel_execution: false
oat_phase: implement
oat_phase_status: complete
oat_execution_mode: single-thread
oat_lifecycle: ${options.lifecycle}
oat_workflow_mode: spec-driven
oat_workflow_origin: native
oat_docs_updated: null
oat_pr_status: null
oat_pr_url: null
oat_project_created: '2026-04-08T17:16:52.421Z'
oat_project_completed: null
oat_project_state_updated: '2026-04-09T22:00:00Z'
oat_generated: false
---
`,
      'utf8',
    ),
    writeFile(
      join(projectDir, 'plan.md'),
      `---
oat_status: complete
oat_template: false
---

## Phase p01: Foundation

### Task p01-t01: Verify baseline and create oat-phase-implementer agent

## Phase p02: Validator CLI

### Task p02-t01: Add test fixtures for phase-subagent flow

## Revision Phase p-rev1: Final Review Fixes

### Task prev1-t01: (review) Stage moved review artifact in review-receive Step 7.6 commit

## Revision Phase p-rev2: Re-Review Polish

### Task prev2-t01: (review) Fix stale owningCommand on activeIdea user catalog row
`,
      'utf8',
    ),
    writeFile(
      join(projectDir, 'implementation.md'),
      `---
oat_current_task_id: null
---

### Task p01-t01: Verify baseline and create oat-phase-implementer agent
**Status:** completed

### Task p02-t01: Add test fixtures for phase-subagent flow
**Status:** completed

### Task prev1-t01: (review) Stage moved review artifact in review-receive Step 7.6 commit
**Status:** completed

### Task prev2-t01: (review) Fix stale owningCommand on activeIdea user catalog row
**Status:** ${options.revisionTaskStatus}
`,
      'utf8',
    ),
  ]);
}

async function createReviewRoutingProject(
  projectDir: string,
  phaseStatus: string,
  p01ReviewStatus = 'passed',
): Promise<void> {
  await mkdir(projectDir, { recursive: true });
  await Promise.all([
    writeFile(
      join(projectDir, 'state.md'),
      `---
oat_current_task: null
oat_last_commit: null
oat_blockers: []
oat_hill_checkpoints: []
oat_hill_completed: []
oat_parallel_execution: false
oat_phase: implement
oat_phase_status: ${phaseStatus}
oat_execution_mode: single-thread
oat_lifecycle: active
oat_workflow_mode: quick
oat_workflow_origin: native
oat_docs_updated: null
oat_pr_status: open
oat_pr_url: https://example.test/pr/1
oat_project_created: '2026-04-08T17:16:52.421Z'
oat_project_completed: null
oat_project_state_updated: '2026-04-09T22:00:00Z'
oat_generated: false
---
`,
      'utf8',
    ),
    writeFile(
      join(projectDir, 'plan.md'),
      `---
oat_status: complete
oat_template: false
---

## Phase 1: Example

### Task p01-t01: Example

## Reviews

| Scope | Type | Status | Date | Artifact |
| ----- | ---- | ------ | ---- | -------- |
| p01 | code | ${p01ReviewStatus} | 2026-06-12 | reviews/p01-review.md |
| final | code | passed | 2026-06-12 | reviews/final-review.md |
`,
      'utf8',
    ),
    writeFile(
      join(projectDir, 'implementation.md'),
      `---
oat_current_task_id: null
---

### Task p01-t01: Example
**Status:** completed
`,
      'utf8',
    ),
    writeFile(
      join(projectDir, 'summary.md'),
      `---
oat_status: complete
oat_template: false
---
`,
      'utf8',
    ),
  ]);
}

async function createProject(
  projectsRoot: string,
  name: string,
  phase: string,
  phaseStatus: string,
  lifecycle = 'active',
): Promise<void> {
  const projectDir = join(projectsRoot, name);
  await mkdir(projectDir, { recursive: true });
  await Promise.all([
    writeFile(
      join(projectDir, 'state.md'),
      `---
oat_current_task: null
oat_last_commit: null
oat_blockers: []
oat_hill_checkpoints: []
oat_hill_completed: []
oat_parallel_execution: false
oat_phase: ${phase}
oat_phase_status: ${phaseStatus}
oat_execution_mode: single-thread
oat_lifecycle: ${lifecycle}
oat_workflow_mode: spec-driven
oat_workflow_origin: native
oat_docs_updated: null
oat_pr_status: null
oat_pr_url: null
oat_project_created: '2026-04-08T17:16:52.421Z'
oat_project_completed: null
oat_project_state_updated: '2026-04-09T22:00:00Z'
oat_generated: false
---
`,
      'utf8',
    ),
    writeFile(
      join(projectDir, 'plan.md'),
      `---
oat_status: in_progress
oat_template: false
---

## Phase 1: Example

### Task p01-t01: Example
`,
      'utf8',
    ),
    writeFile(
      join(projectDir, 'implementation.md'),
      `---
oat_current_task_id: p01-t01
---
`,
      'utf8',
    ),
    writeFile(
      join(projectDir, 'discovery.md'),
      `---
oat_status: in_progress
oat_template: false
---
`,
      'utf8',
    ),
  ]);
}
