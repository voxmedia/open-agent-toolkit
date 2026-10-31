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
export const GATE_REVIEW_ARTIFACT = 'reviews/final-gate-review.md';

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

| Scope | Type | Status | Date | Artifact | Reviewed Head | Invocation |
| ----- | ---- | ------ | ---- | -------- | ------------- | ---------- |
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
  invocation = 'auto',
  type = 'code',
): string {
  return `| ${scope} | ${type} | ${status} | 2026-10-11 | ${artifact} | ${reviewedHead} | ${invocation} |`;
}

export interface GateArtifactScenarioOptions {
  invocation?: string;
  reviewedHead?: 'matching' | 'mismatched' | 'placeholder';
  type?: string;
}

/**
 * Build the production #384 shape: a configured milestone and delivery
 * carrier are committed first, then the gate's final-scope Reviews row and
 * artifact land in a later commit.
 */
export async function gateArtifactScenario(
  repo: GoalRepo,
  options: GateArtifactScenarioOptions = {},
): Promise<{
  reviewed: string;
  carrierCommit: string;
  gateCommit: string;
}> {
  await repo.writeRepo('src/app.ts', 'export const value = 2;\n');
  const reviewed = repo.commitAll('feat(p01-p02): implement milestone');
  const carrier = `      status: allowed
      resolution: configured
      disposition: passed
      config_fingerprint: null
      reviewed_head: '${reviewed}'
      subject: { kind: code, scope: [p01, p02] }
      decided_at: '2026-10-11T10:00:00Z'
      freshness: fresh
      freshness_reason: null`;

  await repo.write(
    ARCHIVED_REVIEW_ARTIFACT,
    '# m01 integrated review\n\nNo findings.\n',
  );
  await repo.write(
    'plan.md',
    goalPlan({
      reviews: reviewRow('passed', ARCHIVED_REVIEW_ARTIFACT, reviewed, 'm01'),
    }),
  );
  await repo.write('implementation.md', goalJournal(reviewed, 'completed'));
  await repo.write(
    'state.md',
    goalState(
      `oat_milestone: m01\noat_milestone_status: reviewing\n${registryYaml({
        reviewed,
        base: repo.baseSha,
        deliveryExitGate: carrier,
        exit: carrier,
      })}`,
    ),
  );
  const carrierCommit = repo.commitAll('chore(oat): record exit carrier');

  const gateReviewedHead =
    options.reviewedHead === 'placeholder'
      ? '-'
      : options.reviewedHead === 'mismatched'
        ? carrierCommit
        : reviewed;
  await repo.write(
    GATE_REVIEW_ARTIFACT,
    '# final gate review\n\nNo findings.\n',
  );
  await repo.write(
    'plan.md',
    goalPlan({
      reviews: [
        reviewRow('passed', ARCHIVED_REVIEW_ARTIFACT, reviewed, 'm01'),
        reviewRow(
          'passed',
          GATE_REVIEW_ARTIFACT,
          gateReviewedHead,
          'final',
          options.invocation ?? 'gate',
          options.type ?? 'code',
        ),
      ].join('\n'),
    }),
  );
  const gateCommit = repo.commitAll('chore(oat): record final gate review');
  return { reviewed, carrierCommit, gateCommit };
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
  kind?: 'pr' | 'stack';
  members?: {
    url: string;
    base?: string | null;
    reviewedHead?: string | null;
    observedHead?: string | null;
    observedBase?: string | null;
    status?: string;
  }[];
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
  const members = options.members ?? [
    {
      url: 'https://github.com/owner/name/pull/7',
      base: options.base,
      reviewedHead: options.reviewed,
      observedHead: options.observedHead,
      observedBase: options.observedBase,
      status: options.memberStatus ?? 'open',
    },
  ];
  const memberYaml = members
    .map(
      (member) => `      - url: ${member.url}
        base: ${quote(member.base === undefined ? options.base : member.base)}
        reviewed_head: ${quote(member.reviewedHead === undefined ? options.reviewed : member.reviewedHead)}
        observed_head: ${quote(member.observedHead)}
        observed_base: ${quote(member.observedBase)}
        status: ${member.status ?? 'open'}`,
    )
    .join('\n');
  const boundRevisions = members
    .map(
      (member, index) =>
        `{ member: ${index}, base: ${quote(member.base === undefined ? options.base : member.base)}, head: ${quote(member.reviewedHead === undefined ? options.reviewed : member.reviewedHead)} }`,
    )
    .join(', ');
  return `oat_deliveries:
  - delivery_id: d01
    milestone: m01
    scope: [p01, p02]
    endpoint: ${options.endpoint ?? 'merged'}
    kind: ${options.kind ?? 'pr'}
    status: ${options.status ?? 'open'}
    superseded_by: null
    corrects_delivery_id: null
    covers_scope_of: null
    lookup:
      repository: owner/name
      head_branch: feat/goal
      head_sha_at_registration: ${quote(options.reviewed)}
    members:
${memberYaml}
    integrated_review:
      artifact: ${ARCHIVED_REVIEW_ARTIFACT}
      scope: [p01, p02]
      bound_revisions: [${boundRevisions}]
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

/** The member pull request two terminal deliveries share (12.7 Shared members). */
export const SHARED_MEMBER_URL = 'https://github.com/owner/name/pull/1';

export interface SharedMemberScenario {
  reviewed: string;
  /** The shared member's head: both review records sit between it and `reviewed`. */
  published: string;
  /** `oat_deliveries` + `oat_milestone_gates` YAML for d01 (m01) and d02 (m02). */
  registry: (options?: {
    omit?: 'd02';
    observedHead?: string | null;
    memberStatus?: string;
  }) => string;
}

/**
 * Probe row 22 (p12-t02) as a fixture: one reviewed revision R completing
 * p01-p03, then the d01 (m01: p01, p02) and d02 (m02: p03) review records in
 * separate commits after R, both registered on one shared member pull request.
 * Each delivery's evaluation therefore crosses the sibling's review artifact.
 */
export async function sharedMemberScenario(
  repo: GoalRepo,
): Promise<SharedMemberScenario> {
  await repo.writeRepo('src/app.ts', 'export const value = 2;\n');
  const reviewed = repo.commitAll('feat(p01-p03): build and ship');
  const rows: string[] = [];
  for (const delivery of ['d01', 'd02']) {
    await repo.write(
      `reviews/archived/${delivery}-review.md`,
      `# ${delivery} review\n\nNo findings.\n`,
    );
    rows.push(
      reviewRow(
        'passed',
        `reviews/archived/${delivery}-review.md`,
        reviewed,
        delivery,
      ),
    );
    await repo.write('plan.md', goalPlan({ reviews: rows.join('\n') }));
    repo.commitAll(`chore(oat): record ${delivery} review`);
  }
  const published = repo.git(['rev-parse', 'HEAD']);
  const quote = (value: string | null) =>
    value === null ? 'null' : `'${value}'`;
  const entry = (
    id: string,
    milestone: string,
    scope: string,
    observedHead: string | null,
    memberStatus: string,
  ) => `  - delivery_id: ${id}
    milestone: ${milestone}
    scope: [${scope}]
    endpoint: merged
    kind: pr
    status: open
    superseded_by: null
    corrects_delivery_id: null
    covers_scope_of: null
    lookup:
      repository: owner/name
      head_branch: feat/goal
      head_sha_at_registration: '${reviewed}'
    members:
      - url: ${SHARED_MEMBER_URL}
        base: '${repo.baseSha}'
        reviewed_head: '${reviewed}'
        observed_head: ${quote(observedHead)}
        observed_base: ${observedHead === null ? 'null' : `'${repo.baseSha}'`}
        status: ${memberStatus}
    integrated_review:
      artifact: reviews/archived/${id}-review.md
      scope: [${scope}]
      bound_revisions: [{ member: 0, base: '${repo.baseSha}', head: '${reviewed}' }]
      disposition: passed
    exit_gate:
      status: allowed
      resolution: no_gate
      disposition: no_gate
      config_fingerprint: null
      reviewed_head: null
      subject: { kind: code, scope: [${scope}] }
      decided_at: '2026-10-11T10:00:00Z'
`;
  const carrier = (scope: string) => `    exit:
      status: allowed
      resolution: no_gate
      disposition: no_gate
      config_fingerprint: null
      reviewed_head: null
      subject: { kind: code, scope: [${scope}] }
      decided_at: '2026-10-11T10:00:00Z'
      freshness: fresh
      freshness_reason: null`;
  return {
    reviewed,
    published,
    registry: (options = {}) => {
      const observedHead =
        options.observedHead === undefined ? null : options.observedHead;
      const memberStatus = options.memberStatus ?? 'open';
      return `oat_deliveries:
${entry('d01', 'm01', 'p01, p02', observedHead, memberStatus)}${
        options.omit === 'd02'
          ? ''
          : entry('d02', 'm02', 'p03', observedHead, memberStatus)
      }oat_milestone_gates:
  m01:
${carrier('p01, p02')}
  m02:
${carrier('p03')}`;
    },
  };
}
