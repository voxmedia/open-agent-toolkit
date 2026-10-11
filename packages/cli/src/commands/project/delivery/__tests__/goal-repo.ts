import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

/**
 * A scratch git repository holding one goal project, for the delivery
 * evaluator, refresh and check suites. Commits are real, so the evaluator's
 * ancestry and per-commit inspection run against actual Git objects.
 */

export const PROJECT_REL = '.oat/projects/shared/goal';

export const REVIEW_ARTIFACT = 'reviews/m01-code-review.md';
export const ARCHIVED_REVIEW_ARTIFACT = 'reviews/archived/m01-code-review.md';

export interface GoalRepo {
  root: string;
  /** The initial commit: the delivery members' base. */
  baseSha: string;
  projectPath: string;
  git: (args: string[]) => string;
  write: (projectRelative: string, content: string) => Promise<void>;
  writeRepo: (repoRelative: string, content: string) => Promise<void>;
  read: (projectRelative: string) => Promise<string>;
  commitAll: (message: string) => string;
}

export interface PlanOptions {
  outcome?: string;
  delivery?: string;
  milestones?: string;
  reviews?: string;
}

export const OUTCOME =
  '**Delivery evidence holds** — Evidence: the evaluator tests';

/** A goal brief with outcomes, delivery authority, Milestones and three phases. */
export function goalPlan(options: PlanOptions = {}): string {
  return `---
oat_status: complete
oat_ready_for: oat-project-implement
oat_plan_source: goal
oat_template: false
---

# Project Brief: goal

## Outcomes

1. ${options.outcome ?? OUTCOME}

## Delivery

**Endpoint:** ${options.delivery ?? 'merged'}

## Milestones

| Milestone | Phases |
| --------- | ------ |
${options.milestones ?? '| m01 | p01, p02 |\n| m02 | p03 |'}

## Phase p01: Research

**Intent:** Research.
**Exit evidence:** Research done.
**Provisional:** no

## Phase p02: Build

**Intent:** Build.
**Exit evidence:** Build done.
**Provisional:** no

## Phase p03: Ship

**Intent:** Ship.
**Exit evidence:** Ship done.
**Provisional:** no

## Reviews

| Scope | Type | Status | Date | Artifact | Reviewed Head |
| ----- | ---- | ------ | ---- | -------- | ------------- |
${options.reviews ?? ''}
`;
}

export function goalJournal(head = '-', p02Status = 'in_progress'): string {
  return `---
oat_current_task_id: p02
---

# Implementation: goal

**Started:** 2026-10-11
**Last Updated:** 2026-10-11

## Progress Overview

| Phase | Status | Units | Accepted |
| ----- | ------ | ----- | -------- |
| p01   | completed | 1 | 1/1 |
| p02   | ${p02Status} | 1 | 0/1 |

**Total:** 1/3 phases accepted

## Phase p01: Research

**Status:** completed
**Base:** 1111111111111111111111111111111111111111
**Head:** 2222222222222222222222222222222222222222
**Executor:** root

Research recorded.

## Phase p02: Build

**Status:** ${p02Status}
**Head:** ${head}
**Executor:** root

Build recorded.

## Phase p03: Ship

**Status:** pending
`;
}

export function goalState(extra: string): string {
  return `---
oat_current_task: null
oat_blockers: []
oat_hill_checkpoints: []
oat_hill_completed: []
oat_phase: implement
oat_phase_status: in_progress
oat_execution_mode: single-thread
oat_lifecycle: active
oat_workflow_mode: goal
oat_goal_status: active
${extra}
---

# State
`;
}

export async function createGoalRepo(
  prefix = 'oat-delivery-',
): Promise<GoalRepo> {
  const root = await mkdtemp(join(tmpdir(), prefix));
  const projectPath = join(root, PROJECT_REL);
  const git = (args: string[]): string =>
    execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
  git(['init', '-q', '--initial-branch=main']);
  git(['config', 'user.email', 'delivery@example.test']);
  git(['config', 'user.name', 'Delivery Test']);
  git(['config', 'commit.gpgsign', 'false']);
  git(['config', 'core.hooksPath', '/dev/null']);
  git(['config', 'gc.auto', '0']);
  git(['config', 'maintenance.auto', 'false']);
  git(['config', 'core.fsmonitor', 'false']);

  const writeRepo = async (repoRelative: string, content: string) => {
    const target = join(root, repoRelative);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, content, 'utf8');
  };
  const repo: GoalRepo = {
    root,
    baseSha: '',
    projectPath,
    git,
    writeRepo,
    write: (projectRelative, content) =>
      writeRepo(`${PROJECT_REL}/${projectRelative}`, content),
    read: (projectRelative) =>
      readFile(join(projectPath, projectRelative), 'utf8'),
    commitAll: (message) => {
      git(['add', '-A']);
      git(['commit', '-q', '--allow-empty', '-m', message]);
      return git(['rev-parse', 'HEAD']);
    },
  };

  await mkdir(join(root, '.oat'), { recursive: true });
  await writeRepo('src/app.ts', 'export const value = 1;\n');
  await repo.write('plan.md', goalPlan());
  await repo.write('implementation.md', goalJournal());
  await repo.write(
    'state.md',
    goalState('oat_milestone: m01\noat_milestone_status: implementing'),
  );
  repo.baseSha = repo.commitAll('base');
  return repo;
}

export async function removeRepo(repo: GoalRepo | undefined): Promise<void> {
  if (repo) {
    await rm(repo.root, {
      recursive: true,
      force: true,
      maxRetries: 5,
      retryDelay: 50,
    });
  }
}

export function reviewRow(
  status: string,
  artifact: string,
  reviewedHead: string,
  scope = 'm01',
): string {
  return `| ${scope} | code | ${status} | 2026-10-11 | ${artifact} | ${reviewedHead} |`;
}

/**
 * Advance a milestone through the landed bookkeeping chain after the reviewed
 * revision R: head recording, review-provide, receive/archive, and
 * registration. Returns R and each bookkeeping commit.
 */
export async function bookkeepingChain(
  repo: GoalRepo,
  options: { register?: (reviewed: string) => string } = {},
): Promise<{
  reviewed: string;
  headRecording: string;
  provided: string;
  received: string;
  registered: string;
}> {
  await repo.writeRepo('src/app.ts', 'export const value = 2;\n');
  const reviewed = repo.commitAll('feat(p02): build');

  await repo.write('implementation.md', goalJournal(reviewed, 'completed'));
  await repo.write(
    'state.md',
    goalState('oat_milestone: m01\noat_milestone_status: reviewing'),
  );
  const headRecording = repo.commitAll('chore(oat): record p02 head');

  await repo.write(REVIEW_ARTIFACT, '# m01 review\n\nNo findings.\n');
  await repo.write(
    'plan.md',
    goalPlan({ reviews: reviewRow('received', REVIEW_ARTIFACT, reviewed) }),
  );
  const provided = repo.commitAll('chore(oat): record m01 review');

  await mkdir(join(repo.projectPath, dirname(ARCHIVED_REVIEW_ARTIFACT)), {
    recursive: true,
  });
  repo.git([
    'mv',
    `${PROJECT_REL}/${REVIEW_ARTIFACT}`,
    `${PROJECT_REL}/${ARCHIVED_REVIEW_ARTIFACT}`,
  ]);
  await repo.write(
    'plan.md',
    goalPlan({
      reviews: reviewRow('passed', ARCHIVED_REVIEW_ARTIFACT, reviewed),
    }),
  );
  await repo.write(
    'state.md',
    goalState('oat_milestone: m01\noat_milestone_status: delivering'),
  );
  const received = repo.commitAll('chore(oat): receive m01 review');

  await repo.write(
    'state.md',
    goalState(
      options.register?.(reviewed) ??
        `oat_milestone: m01\noat_milestone_status: delivered\n${registryYaml({ reviewed, base: repo.baseSha })}`,
    ),
  );
  const registered = repo.commitAll('chore(oat): register d01');
  return { reviewed, headRecording, provided, received, registered };
}

export interface RegistryOptions {
  reviewed: string;
  base: string;
  observedHead?: string | null;
  observedBase?: string | null;
  memberStatus?: string;
  status?: string;
  endpoint?: string;
  disposition?: string;
  attainment?: string;
  /** The delivery's persisted exit-gate binding (YAML under `exit_gate:`). */
  deliveryExitGate?: string;
  exit?: string;
}

/** One registered delivery d01 for m01 with one member. */
export function registryYaml(options: RegistryOptions): string {
  const quote = (value: string | null | undefined) =>
    value === null || value === undefined ? 'null' : `'${value}'`;
  return `oat_deliveries:
  - delivery_id: d01
    milestone: m01
    scope: [p01, p02]
    endpoint: ${options.endpoint ?? 'merged'}
    kind: pr
    status: ${options.status ?? 'open'}
    superseded_by: null
    corrects_delivery_id: null
    covers_scope_of: null
    lookup:
      repository: owner/name
      head_branch: feat/goal
      head_sha_at_registration: ${quote(options.reviewed)}
    members:
      - url: https://github.com/owner/name/pull/7
        base: ${quote(options.base)}
        reviewed_head: ${quote(options.reviewed)}
        observed_head: ${quote(options.observedHead)}
        observed_base: ${quote(options.observedBase)}
        status: ${options.memberStatus ?? 'open'}
    integrated_review:
      artifact: ${ARCHIVED_REVIEW_ARTIFACT}
      scope: [p01, p02]
      bound_revisions: [{ member: 0, base: ${quote(options.base)}, head: ${quote(options.reviewed)} }]
      disposition: ${options.disposition ?? 'passed'}
${options.deliveryExitGate === undefined ? '' : `    exit_gate:\n${options.deliveryExitGate}\n`}${options.attainment ?? ''}oat_milestone_gates:
  m01:
    exit:
${
  options.exit ??
  `      status: allowed
      resolution: no_gate
      disposition: no_gate
      config_fingerprint: null
      reviewed_head: null
      subject: { kind: code, scope: [p01, p02] }
      decided_at: '2026-10-11T10:00:00Z'
      freshness: fresh
      freshness_reason: null`
}`;
}
