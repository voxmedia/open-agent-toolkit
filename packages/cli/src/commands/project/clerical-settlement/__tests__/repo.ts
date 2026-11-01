import { execFileSync, spawnSync } from 'node:child_process';
import {
  mkdir,
  mkdtemp,
  readFile,
  rename,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

import type {
  ClericalSettlementEntry,
  ClericalSettlementProposal,
  ClericalSettlementReport,
} from '../contract';
import { renderSettlementEntry } from '../parsing';
import { gateReviewResult } from './fixtures/gate-review-result';

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
  writeRoot: (path: string, content: string) => Promise<void>;
  read: (path: string) => Promise<string>;
  commit: (message: string) => string;
  proposal: ClericalSettlementProposal;
  sourceArtifact: string;
  archivedArtifact: string;
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
  archiveCollision?: boolean;
  sharedRepair?: boolean;
  substantiveDistinctRepair?: boolean;
  receiptScope?: string;
  receiptArtifact?: string;
  receiptCounts?: string;
  omitReceiptFindings?: boolean;
  scope?: string;
  moveReviewedFile?: boolean;
}

interface FixtureFinding {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  location: string;
}

function reviewArtifact(options: {
  type: 'code' | 'artifact' | 'missing';
  reviewed: string;
  findings: FixtureFinding[];
  generatedAt?: string;
  gate?: boolean;
  scope?: string;
}): string {
  const type =
    options.type === 'missing' ? '' : `oat_review_type: ${options.type}\n`;
  const count = (severity: FixtureFinding['severity']): number =>
    options.findings.filter((finding) => finding.severity === severity).length;
  const section = (
    severity: FixtureFinding['severity'],
    heading: string,
  ): string => {
    const findings = options.findings.filter(
      (finding) => finding.severity === severity,
    );
    return `### ${heading}

${
  findings.length === 0
    ? 'None'
    : findings
        .map(
          (finding) =>
            `**${finding.id} — ${finding.title}** (\`${finding.location}\`)`,
        )
        .join('\n\n')
}`;
  };
  return `---
oat_generated: true
oat_generated_at: ${options.generatedAt ?? '2026-11-01T12:00:00Z'}
oat_review_scope: ${JSON.stringify(options.scope ?? 'm01')}
${type}oat_review_invocation: ${options.gate ? 'gate' : 'manual'}
oat_project: ${PROJECT_REL}
oat_review_head_sha: ${options.reviewed}
${options.gate ? 'oat_gate_run_id: run-01\noat_gate_target: reviewer-01\n' : ''}---

# Code Review: m01

Findings by severity: ${count('critical')} critical, ${count('high')} high, ${count('medium')} medium, ${count('low')} low

## Findings

${section('critical', 'Critical')}

${section('high', 'High')}

${section('medium', 'Medium')}

${section('low', 'Low')}
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

function journal(
  receiptArtifact: string,
  scope: string,
  findings: FixtureFinding[],
  options: {
    receiptScope?: string;
    receiptCounts?: string;
    omitReceiptFindings?: boolean;
    descriptive?: boolean;
  } = {},
): string {
  const count = (severity: FixtureFinding['severity']): number =>
    findings.filter((finding) => finding.severity === severity).length;
  const receiptScope = options.receiptScope ?? scope;
  const counts =
    options.receiptCounts ??
    `Critical ${count('critical')} · High ${count('high')} · Medium ${count('medium')} · Low ${count('low')}`;
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

${
  options.descriptive
    ? `### Clerical Observation: ${scope}

**Artifact:** -

`
    : ''
}### Review Received: ${receiptScope}

**Date:** 2026-11-01
**Review artifact (local-only):** ${receiptArtifact}

**Findings:** ${counts}

${
  options.omitReceiptFindings
    ? ''
    : `${findings
        .map(
          (finding) =>
            `- ${finding.id} (${finding.severity[0]!.toUpperCase()}${finding.severity.slice(1)}): ${finding.title}`,
        )
        .join('\n')}\n`
}
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
  const scope = options.scope ?? (options.descriptive ? 'p01' : 'm01');
  const sourceArtifact = SOURCE_ARTIFACT;
  const archivedArtifact = options.archiveCollision
    ? 'reviews/archived/m01-review-2026-11-01T120000Z.md'
    : ARCHIVED_ARTIFACT;
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
  await write(
    'implementation.md',
    journal('-', scope, []).replace(
      /### Review Received:[\s\S]*?(?=## Orchestration Runs)/,
      '',
    ),
  );
  await write('state.md', state());
  commit('base');

  await writeFile(join(root, 'app.ts'), 'export const value = 2;\n', 'utf8');
  const reviewed = commit('feat: reviewed subject');
  const artifactType = options.artifactType ?? 'code';
  const baseReviewedHead =
    options.repairField === 'Reviewed Head'
      ? '1111111111111111111111111111111111111111'
      : reviewed;
  const staleDate =
    options.repairField === 'Date' || options.substantiveDistinctRepair;
  const basePlan = plan(
    reviewRow({
      type: artifactType === 'artifact' ? 'artifact' : 'code',
      status: 'received',
      artifact: sourceArtifact,
      reviewedHead: baseReviewedHead,
      gate: options.gate,
      scope,
      date: staleDate ? '2026-10-31T12:00:00Z' : undefined,
    }),
  );
  const reviewRowLine =
    basePlan
      .split('\n')
      .findIndex(
        (line) =>
          line.includes(`| ${scope} |`) && line.includes('| received |'),
      ) + 1;
  const repairField = options.repairField ?? 'Artifact';
  const provisionalFindings: FixtureFinding[] = [
    {
      id: 'L1',
      severity: 'low',
      title: options.descriptive
        ? 'Repair stale Artifact observation'
        : `Repair stale ${repairField} review metadata`,
      location: options.findingLocation ?? `plan.md:${reviewRowLine}`,
    },
  ];
  if (options.sharedRepair || options.substantiveDistinctRepair) {
    provisionalFindings.push({
      id: 'M1',
      severity: 'medium',
      title: options.sharedRepair
        ? 'Repair stale Artifact duplicate claim'
        : 'Outcome 1 has no reachable exit evidence; add a phase',
      location: `plan.md:${reviewRowLine}`,
    });
  }
  const receiptArtifact =
    options.receiptArtifact ??
    (options.descriptive ? sourceArtifact : sourceArtifact);
  let baseJournal = journal(receiptArtifact, scope, provisionalFindings, {
    receiptScope: options.receiptScope,
    receiptCounts: options.receiptCounts,
    omitReceiptFindings: options.omitReceiptFindings,
    descriptive: options.descriptive,
  });
  if (options.descriptive) {
    const observationLine =
      baseJournal.split('\n').findIndex((line) => line === '**Artifact:** -') +
      1;
    provisionalFindings[0] = {
      ...provisionalFindings[0]!,
      location:
        options.findingLocation ?? `implementation.md:${observationLine}`,
    };
    baseJournal = journal(receiptArtifact, scope, provisionalFindings, {
      receiptScope: options.receiptScope,
      receiptCounts: options.receiptCounts,
      omitReceiptFindings: options.omitReceiptFindings,
      descriptive: true,
    });
  }
  await write('plan.md', basePlan);
  await write('implementation.md', baseJournal);
  if (options.moveReviewedFile) {
    await rename(
      join(root, 'app.ts'),
      join(projectPath, 'moved-reviewed-app.ts'),
    );
  }
  const repairBase = commit('chore(oat): record review receipt');

  const artifact = reviewArtifact({
    type: artifactType,
    reviewed,
    findings: provisionalFindings,
    gate: options.gate,
    scope,
  });
  await write(sourceArtifact, artifact);
  const repairedArtifact =
    !options.descriptive && repairField === 'Artifact'
      ? archivedArtifact
      : sourceArtifact;
  if (repairedArtifact === archivedArtifact) {
    await mkdir(dirname(join(projectPath, archivedArtifact)), {
      recursive: true,
    });
    await rename(
      join(projectPath, sourceArtifact),
      join(projectPath, archivedArtifact),
    );
    if (options.archiveDifferentRun) {
      await write(
        archivedArtifact,
        reviewArtifact({
          type: artifactType,
          reviewed,
          findings: provisionalFindings,
          generatedAt: '2026-11-01T13:00:00Z',
          gate: options.gate,
          scope,
        }),
      );
    }
  }
  const repairedHead = options.inventReviewedHead
    ? '2222222222222222222222222222222222222222'
    : repairField === 'Reviewed Head'
      ? reviewed
      : baseReviewedHead;
  const repairedRow = reviewRow({
    type: artifactType === 'artifact' ? 'artifact' : 'code',
    status: options.repairStatus ?? 'received',
    artifact: repairedArtifact,
    reviewedHead: repairedHead,
    gate: options.gate,
    scope,
    date:
      repairField === 'Date' || options.substantiveDistinctRepair
        ? '2026-11-01T12:00:00Z'
        : undefined,
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
    await write(
      'implementation.md',
      baseJournal.replace('**Artifact:** -', `**Artifact:** ${sourceArtifact}`),
    );
  }
  const repairHead = commit('fix: repair clerical review record');
  const proposalFindings: ClericalSettlementProposal['findings'] = [
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
            heading: `Clerical Observation: ${scope}`,
          }
        : { kind: 'reviews-row', path: 'plan.md' },
      authoritativeSource: options.descriptive
        ? { kind: 'review-row', field: 'Artifact' }
        : repairField === 'Artifact'
          ? {
              kind: 'archived-artifact',
              sourcePath: sourceArtifact,
              archivedPath: archivedArtifact,
            }
          : {
              kind: 'review-artifact',
              field: repairField === 'Date' ? 'generatedAt' : 'reviewedHead',
            },
    },
  ];
  if (options.sharedRepair) {
    proposalFindings.push({
      ...proposalFindings[0]!,
      id: 'M1',
    });
  }
  if (options.substantiveDistinctRepair) {
    proposalFindings.push({
      id: 'M1',
      repairKind: 'review-row metadata',
      correctedField: 'Date',
      record: { kind: 'reviews-row', path: 'plan.md' },
      authoritativeSource: {
        kind: 'review-artifact',
        field: 'generatedAt',
      },
    });
  }
  const goalSubject =
    /^m\d+\/(d\d+)/.exec(scope)?.[1] ?? /^(m\d+|d\d+)/.exec(scope)?.[1] ?? null;
  const proposal: ClericalSettlementProposal = {
    schemaVersion: 1,
    mode: 'first-settlement',
    event: {
      scope,
      type: artifactType === 'artifact' ? 'artifact' : 'code',
      artifact: repairedArtifact,
    },
    repairRange: { base: repairBase, head: repairHead },
    receipt: `Review Received: ${options.receiptScope ?? scope}`,
    findings: proposalFindings,
    ...(goalSubject ? { goal: { subject: goalSubject } } : {}),
    ...(options.gate ? { gateProof: GATE_PROOF } : {}),
  };
  if (options.gate) {
    await write(
      GATE_PROOF,
      JSON.stringify(
        gateReviewResult({
          runId: options.gateProofMismatch ? 'run-02' : 'run-01',
          target: 'reviewer-01',
          artifactPath: sourceArtifact,
          generatedAt: '2026-11-01T12:00:00Z',
          project: PROJECT_REL,
          scope,
        }),
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
    writeRoot: async (path, content) => {
      const target = join(root, path);
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, content, 'utf8');
    },
    read: (path) => readFile(join(projectPath, path), 'utf8'),
    commit,
    proposal,
    sourceArtifact,
    archivedArtifact,
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
  options: {
    rewriteObservation?: boolean;
    omitProof?: boolean;
    outsideReviewsAndGates?: boolean;
    changeReviewedHead?: boolean;
  } = {},
): Promise<string> {
  let planContent = (await repo.read('plan.md')).replace(
    '| received |',
    '| resolved |',
  );
  if (options.changeReviewedHead) {
    planContent = planContent.replace(
      entry.reviewedRevision,
      '3333333333333333333333333333333333333333',
    );
  }
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
  const rendered = renderSettlementEntry(stored);
  await repo.write(
    'implementation.md',
    options.outsideReviewsAndGates
      ? `${journalContent}\n\n${rendered}\n`
      : journalContent.replace(
          '## Reviews and Gates',
          `## Reviews and Gates\n\n${rendered}`,
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
