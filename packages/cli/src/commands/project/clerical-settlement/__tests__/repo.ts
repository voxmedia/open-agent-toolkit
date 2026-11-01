import { execFileSync, spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

import type {
  ClericalSettlementEntry,
  ClericalSettlementProposal,
  ClericalSettlementReport,
} from '../contract';
import { renderSettlementEntry } from '../parsing';

export const PROJECT_REL = '.oat/projects/shared/settlement';
export const SOURCE_ARTIFACT = 'reviews/m01-review.md';
export const ARCHIVED_ARTIFACT = 'reviews/archived/m01-review.md';
export const GATE_PROOF = 'gate-proof.json';

export interface SettlementRepo {
  root: string;
  projectPath: string;
  proposalPath: string;
  reviewed: string;
  repairBase: string;
  repairHead: string;
  git: (args: string[]) => string;
  write: (path: string, content: string) => Promise<void>;
  read: (path: string) => Promise<string>;
  commit: (message: string) => string;
  proposal: ClericalSettlementProposal;
}

export interface SettlementRepoOptions {
  artifactType?: 'code' | 'artifact' | 'missing';
  findingLocation?: string;
  repairField?: 'Artifact' | 'Reviewed Head' | 'Date';
  repairStatus?: string;
  duplicateEvent?: boolean;
  archiveDifferentRun?: boolean;
  rewriteObservationInRepair?: boolean;
  inventReviewedHead?: boolean;
  gate?: boolean;
  gateProofMismatch?: boolean;
  descriptive?: boolean;
}

function reviewArtifact(options: {
  type: 'code' | 'artifact' | 'missing';
  reviewed: string;
  location: string;
  generatedAt?: string;
  gate?: boolean;
  scope?: string;
}): string {
  const type =
    options.type === 'missing' ? '' : `oat_review_type: ${options.type}\n`;
  return `---
oat_generated: true
oat_generated_at: ${options.generatedAt ?? '2026-11-01T12:00:00Z'}
oat_review_scope: ${options.scope ?? 'm01'}
${type}oat_review_invocation: ${options.gate ? 'gate' : 'manual'}
oat_project: ${PROJECT_REL}
oat_review_head_sha: ${options.reviewed}
${options.gate ? 'oat_gate_run_id: run-01\noat_gate_target: reviewer-01\n' : ''}---

# Code Review: m01

Findings by severity: 0 critical, 0 high, 0 medium, 1 low

## Findings

### Critical

None

### High

None

### Medium

None

### Low

**L1 — Repair stale review evidence** (\`${options.location}\`)
`;
}

function plan(row: string): string {
  return `---
oat_status: complete
oat_ready_for: oat-project-implement
oat_plan_source: goal
oat_template: false
---

# Project Brief: settlement

## Goal

Verify clerical settlement.

## Outcomes

1. Settlement is verified.

## Approach

Use the verifier.

## Constraints and Out of Scope

- Preserve raw verdicts.

## Decisions

- Use closed repair kinds.

## Known Unknowns

- None.

## Delivery endpoint and authority

- Endpoint: merged.

## Milestones

| Milestone | Phases |
| --------- | ------ |
| m01 | p01 |

## Phase p01: Build

**Intent:** Build.
**Exit evidence:** Verified.
**Provisional:** no

## Reviews

| Scope | Type | Status | Date | Artifact | Reviewed Head | Invocation | Gate Target |
| ----- | ---- | ------ | ---- | -------- | ------------- | ---------- | ----------- |
${row}
`;
}

function reviewRow(options: {
  type: string;
  status: string;
  artifact: string;
  reviewedHead: string;
  gate?: boolean;
  scope?: string;
  date?: string;
}): string {
  return `| ${options.scope ?? 'm01'} | ${options.type} | ${options.status} | ${options.date ?? '2026-11-01T12:00:00Z'} | ${options.artifact} | ${options.reviewedHead} | ${options.gate ? 'gate' : 'manual'} | ${options.gate ? 'reviewer-01' : '-'} |`;
}

function journal(receiptArtifact: string, scope = 'm01'): string {
  return `---
oat_current_task_id: p01
---

# Implementation: settlement

**Started:** 2026-11-01
**Last Updated:** 2026-11-01

## Progress Overview

| Phase | Status | Units | Accepted |
| ----- | ------ | ----- | -------- |
| p01 | in_progress | 1 | 0/1 |

**Total:** 0/1 phases accepted

## Phase p01: Build

**Status:** in_progress
**Base:** 1111111111111111111111111111111111111111
**Executor:** root

Build observation is immutable.

### Review Received: ${scope}

**Date:** 2026-11-01
**Review artifact (local-only):** ${receiptArtifact}

**Findings:** Critical 0 · High 0 · Medium 0 · Low 1

**Outcome:** clerical repair pending

## Orchestration Runs

## Reviews and Gates

## Deferred Findings

## Deviations from Plan / Design

## References

- Brief: plan.md
`;
}

function state(): string {
  return `---
oat_current_task: p01
oat_blockers: []
oat_hill_checkpoints: []
oat_hill_completed: []
oat_phase: implement
oat_phase_status: in_progress
oat_execution_mode: single-thread
oat_lifecycle: active
oat_workflow_mode: goal
oat_milestone: m01
oat_milestone_status: reviewing
oat_goal_status: active
oat_goal_recovery: null
oat_milestone_gates: {}
oat_deliveries: []
---

# State
`;
}

export async function createSettlementRepo(
  options: SettlementRepoOptions = {},
): Promise<SettlementRepo> {
  const scope = options.descriptive ? 'p01' : 'm01';
  const root = await mkdtemp(join(tmpdir(), 'oat-clerical-settlement-'));
  const projectPath = join(root, PROJECT_REL);
  const proposalPath = join(root, 'proposal.json');
  const git = (args: string[]): string =>
    execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
  git(['init', '-q', '--initial-branch=main']);
  git(['config', 'user.email', 'settlement@example.test']);
  git(['config', 'user.name', 'Settlement Test']);
  git(['config', 'commit.gpgsign', 'false']);
  git(['config', 'core.hooksPath', '/dev/null']);
  git(['config', 'gc.auto', '0']);
  git(['config', 'maintenance.auto', 'false']);
  git(['config', 'core.fsmonitor', 'false']);
  const write = async (path: string, content: string) => {
    const target = join(projectPath, path);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, content, 'utf8');
  };
  const commit = (message: string): string => {
    git(['add', '-A']);
    git(['commit', '-q', '-m', message]);
    return git(['rev-parse', 'HEAD']);
  };

  await mkdir(projectPath, { recursive: true });
  await writeFile(
    join(root, '.gitignore'),
    `${PROJECT_REL}/reviews/\n${PROJECT_REL}/${GATE_PROOF}\n/proposal.json\n`,
    'utf8',
  );
  await writeFile(join(root, 'app.ts'), 'export const value = 1;\n', 'utf8');
  await write(
    'plan.md',
    plan(
      reviewRow({
        type: options.artifactType === 'artifact' ? 'artifact' : 'code',
        status: 'pending',
        artifact: '-',
        reviewedHead: '-',
        scope,
      }),
    ),
  );
  await write('implementation.md', journal('-', scope));
  await write('state.md', state());
  commit('base');

  await writeFile(join(root, 'app.ts'), 'export const value = 2;\n', 'utf8');
  const reviewed = commit('feat: reviewed subject');
  const artifactType = options.artifactType ?? 'code';
  const artifact = reviewArtifact({
    type: artifactType,
    reviewed,
    location: options.findingLocation ?? 'plan.md:50',
    gate: options.gate,
    scope,
  });
  await write(SOURCE_ARTIFACT, artifact);
  await write(
    ARCHIVED_ARTIFACT,
    options.archiveDifferentRun
      ? reviewArtifact({
          type: artifactType,
          reviewed,
          location: options.findingLocation ?? 'plan.md:50',
          generatedAt: '2026-11-01T13:00:00Z',
          gate: options.gate,
          scope,
        })
      : artifact,
  );
  const baseReviewedHead =
    options.repairField === 'Reviewed Head'
      ? '1111111111111111111111111111111111111111'
      : reviewed;
  await write(
    'plan.md',
    plan(
      reviewRow({
        type: artifactType === 'artifact' ? 'artifact' : 'code',
        status: 'received',
        artifact: SOURCE_ARTIFACT,
        reviewedHead: baseReviewedHead,
        gate: options.gate,
        scope,
        date:
          options.repairField === 'Date' ? '2026-10-31T12:00:00Z' : undefined,
      }),
    ),
  );
  await write(
    'implementation.md',
    journal(options.descriptive ? '-' : SOURCE_ARTIFACT, scope),
  );
  const repairBase = commit('chore(oat): record review receipt');

  const repairedArtifact = options.descriptive
    ? SOURCE_ARTIFACT
    : options.repairField === 'Artifact' || options.repairField === undefined
      ? ARCHIVED_ARTIFACT
      : SOURCE_ARTIFACT;
  const repairedHead = options.inventReviewedHead
    ? '2222222222222222222222222222222222222222'
    : options.repairField === 'Reviewed Head'
      ? reviewed
      : baseReviewedHead;
  const repairedRow = reviewRow({
    type: artifactType === 'artifact' ? 'artifact' : 'code',
    status: options.repairStatus ?? 'received',
    artifact: repairedArtifact,
    reviewedHead: repairedHead,
    gate: options.gate,
    scope,
    date: '2026-11-01T12:00:00Z',
  });
  await write(
    'plan.md',
    plan(
      options.duplicateEvent ? `${repairedRow}\n${repairedRow}` : repairedRow,
    ),
  );
  if (options.rewriteObservationInRepair) {
    await write(
      'implementation.md',
      (await readFile(join(projectPath, 'implementation.md'), 'utf8')).replace(
        'Build observation is immutable.',
        'Build observation was rewritten.',
      ),
    );
  }
  if (options.descriptive) {
    await write('implementation.md', journal(SOURCE_ARTIFACT, scope));
  }
  const repairHead = commit('fix: repair clerical review record');
  const repairField = options.repairField ?? 'Artifact';
  const proposal: ClericalSettlementProposal = {
    schemaVersion: 1,
    mode: 'first-settlement',
    event: {
      scope,
      type: artifactType === 'artifact' ? 'artifact' : 'code',
      artifact: repairedArtifact,
    },
    repairRange: { base: repairBase, head: repairHead },
    receipt: `Review Received: ${scope}`,
    findings: [
      {
        id: 'L1',
        repairKind: options.descriptive
          ? 'descriptive prose'
          : repairField === 'Artifact'
            ? 'archived-artifact reference'
            : 'review-row metadata',
        correctedField: repairField,
        record: options.descriptive
          ? {
              kind: 'journal-field',
              path: 'implementation.md',
              heading: `Review Received: ${scope}`,
            }
          : { kind: 'reviews-row', path: 'plan.md' },
        authoritativeSource: options.descriptive
          ? { kind: 'review-row', field: 'Artifact' }
          : repairField === 'Artifact'
            ? {
                kind: 'archived-artifact',
                sourcePath: SOURCE_ARTIFACT,
                archivedPath: ARCHIVED_ARTIFACT,
              }
            : {
                kind: 'review-artifact',
                field: repairField === 'Date' ? 'generatedAt' : 'reviewedHead',
              },
      },
    ],
    ...(scope === 'm01'
      ? { goal: { subject: 'm01', publishedHead: repairHead } }
      : {}),
    ...(options.gate ? { gateProof: GATE_PROOF } : {}),
  };
  if (options.gate) {
    await write(
      GATE_PROOF,
      JSON.stringify(
        {
          runId: options.gateProofMismatch ? 'run-02' : 'run-01',
          target: 'reviewer-01',
          reviewedHead: reviewed,
          artifact: repairedArtifact,
        },
        null,
        2,
      ),
    );
  }
  await writeFile(proposalPath, JSON.stringify(proposal, null, 2), 'utf8');
  return {
    root,
    projectPath,
    proposalPath,
    reviewed,
    repairBase,
    repairHead,
    git,
    write,
    read: (path) => readFile(join(projectPath, path), 'utf8'),
    commit,
    proposal,
  };
}

export function runBuiltVerifier(
  repo: SettlementRepo,
): ClericalSettlementReport {
  const result = spawnSync(
    process.execPath,
    [
      resolve(process.cwd(), 'dist/index.js'),
      '--json',
      'project',
      'clerical-settlement',
      'verify',
      '--project',
      PROJECT_REL,
      '--proposal',
      repo.proposalPath,
    ],
    {
      cwd: repo.root,
      encoding: 'utf8',
      env: { ...process.env, NO_UPDATE_NOTIFIER: '1' },
    },
  );
  const output = result.stdout.trim();
  return JSON.parse(output) as ClericalSettlementReport;
}

export async function writeProposal(
  repo: SettlementRepo,
  proposal: ClericalSettlementProposal,
): Promise<void> {
  await writeFile(repo.proposalPath, JSON.stringify(proposal, null, 2), 'utf8');
}

export async function recordSettlement(
  repo: SettlementRepo,
  entry: ClericalSettlementEntry,
  options: { rewriteObservation?: boolean; omitProof?: boolean } = {},
): Promise<string> {
  const planContent = (await repo.read('plan.md')).replace(
    '| received |',
    '| resolved |',
  );
  await repo.write('plan.md', planContent);
  const stored = options.omitProof
    ? ({ ...entry, proof: undefined } as unknown as ClericalSettlementEntry)
    : entry;
  let journalContent = await repo.read('implementation.md');
  if (options.rewriteObservation) {
    journalContent = journalContent.replace(
      'Build observation is immutable.',
      'Build observation was rewritten.',
    );
  }
  await repo.write(
    'implementation.md',
    journalContent.replace(
      '## Reviews and Gates',
      `## Reviews and Gates\n\n${renderSettlementEntry(stored)}`,
    ),
  );
  return repo.commit('chore(oat): record clerical settlement');
}

export async function appendReceive(
  repo: SettlementRepo,
  text = 'Settlement received.',
): Promise<string> {
  await repo.write(
    'implementation.md',
    `${await repo.read('implementation.md')}\n\n${text}\n`,
  );
  return repo.commit('chore(oat): receive clerical settlement');
}

export async function removeLocalArtifacts(
  repo: SettlementRepo,
): Promise<void> {
  await rm(join(repo.projectPath, 'reviews'), {
    recursive: true,
    force: true,
  });
}

export async function removeSettlementRepo(
  repo: SettlementRepo | undefined,
): Promise<void> {
  if (repo) {
    await rm(repo.root, { recursive: true, force: true });
  }
}
