import { afterEach, describe, expect, it } from 'vitest';

import {
  appendReceive,
  createSettlementRepo,
  recordSettlement,
  removeLocalArtifacts,
  removeSettlementRepo,
  runBuiltVerifier,
  type SettlementRepo,
  type SettlementRepoOptions,
  writeProposal,
} from './__tests__/repo';
import type {
  ClericalSettlementProposal,
  ClericalSettlementReport,
} from './contract';

let repos: SettlementRepo[] = [];

async function fixture(
  options: Parameters<typeof createSettlementRepo>[0] = {},
): Promise<SettlementRepo> {
  const repo = await createSettlementRepo(options);
  repos.push(repo);
  return repo;
}

function expectRefusal(report: ClericalSettlementReport, reason: RegExp): void {
  expect(report.status).toBe('refused');
  expect(report.reason).toMatch(reason);
  expect(report.checks.some((check) => check.status === 'failed')).toBe(true);
}

async function validArchiveControl(): Promise<ClericalSettlementReport> {
  const valid = await fixture();
  const report = runBuiltVerifier(valid);
  expect(report.status).toBe('verified');
  expect(report.settlement?.proof.artifact.reviewType).toBe('code');
  return report;
}

async function replayFixture(
  options: {
    rewriteObservation?: boolean;
    omitProof?: boolean;
    omitGateProof?: boolean;
    contradictGateProof?: boolean;
    deleteArtifacts?: boolean;
    repoOptions?: SettlementRepoOptions;
    substantiveSuccessor?: boolean;
    changeReviewedHead?: boolean;
    outsideReviewsAndGates?: boolean;
    appendObservation?: string;
  } = {},
): Promise<{
  repo: SettlementRepo;
  proposal: ClericalSettlementProposal;
  report: ClericalSettlementReport;
}> {
  const repo = await fixture(options.repoOptions);
  const first = runBuiltVerifier(repo);
  expect(first.status).toBe('verified');
  expect(first.settlement).not.toBeNull();
  await recordSettlement(repo, first.settlement!, {
    rewriteObservation: options.rewriteObservation,
    omitProof: options.omitProof,
    omitGateProof: options.omitGateProof,
    contradictGateProof: options.contradictGateProof,
    changeReviewedHead: options.changeReviewedHead,
    outsideReviewsAndGates: options.outsideReviewsAndGates,
  });
  let publishedHead = await appendReceive(repo, {
    appendObservation: options.appendObservation,
  });
  if (options.substantiveSuccessor) {
    await repo.writeRoot('app.ts', 'export const value = 3;\n');
    publishedHead = repo.commit('feat: substantive successor');
  }
  const proposal: ClericalSettlementProposal = {
    ...repo.proposal,
    mode: 'replay',
    publishedHead,
  };
  await writeProposal(repo, proposal);
  if (options.deleteArtifacts) await removeLocalArtifacts(repo);
  return { repo, proposal, report: runBuiltVerifier(repo) };
}

afterEach(async () => {
  await Promise.all(repos.map((repo) => removeSettlementRepo(repo)));
  repos = [];
});

describe('built CLI clerical-settlement verifier', () => {
  it('verifies a genuine archived-artifact repair', async () => {
    const report = await validArchiveControl();
    expect(report.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'archive-identity',
          status: 'passed',
        }),
        expect.objectContaining({
          id: 'goal-successor-chain',
          status: 'passed',
        }),
      ]),
    );
  });

  it('verifies review-row metadata with a real date-only Reviews cell', async () => {
    const metadata = await fixture({
      repairField: 'Date',
      scope: 'p01',
      workflowMode: 'quick',
    });
    expect(runBuiltVerifier(metadata).status).toBe('verified');

    const missingInvocation = await fixture({
      repairField: 'Date',
      scope: 'p02',
      workflowMode: 'quick',
      omitInvocation: true,
    });
    expect(runBuiltVerifier(missingInvocation).status).toBe('verified');

    const missingInvocationReplay = await replayFixture({
      repoOptions: {
        repairField: 'Date',
        scope: 'p03',
        workflowMode: 'quick',
        omitInvocation: true,
      },
      deleteArtifacts: true,
    });
    expect(missingInvocationReplay.report.status).toBe('verified');
  });

  it('refuses a substantive finding proposed as clerical', async () => {
    const bad = await fixture({ findingLocation: 'app.ts:1' });
    expectRefusal(runBuiltVerifier(bad), /finding-location-mismatch/);
    await validArchiveControl();
  });

  it('refuses artifact reviews and uncorroborated review types', async () => {
    const artifact = await fixture({ artifactType: 'artifact' });
    expectRefusal(runBuiltVerifier(artifact), /review-type-ineligible/);
    const unknown = await fixture({ artifactType: 'missing' });
    expectRefusal(runBuiltVerifier(unknown), /review-type-ineligible/);
    await validArchiveControl();
  });

  it('refuses a goal-scope Reviewed Head correction with a section 12.8 reason', async () => {
    const bad = await fixture({ repairField: 'Reviewed Head' });
    expectRefusal(runBuiltVerifier(bad), /goal-12\.8-known-ineligible/);
    await validArchiveControl();
  });

  it('refuses replay when the settlement-recording commit rewrites an observation', async () => {
    const bad = await replayFixture({ rewriteObservation: true });
    expectRefusal(bad.report, /recorded journal line/i);
    const valid = await replayFixture();
    expect(valid.report.status).toBe('verified');
  });

  it('refuses Status promotion and invented reviewed evidence in the repair range', async () => {
    const promoted = await fixture({ repairStatus: 'passed' });
    expectRefusal(runBuiltVerifier(promoted), /repair-field-overreach/);
    const invented = await fixture({ inventReviewedHead: true });
    expectRefusal(runBuiltVerifier(invented), /reviewed-revision-mismatch/);
    await validArchiveControl();
  });

  it('refuses duplicate or ambiguous matching ledger events', async () => {
    const bad = await fixture({ duplicateEvent: true });
    expectRefusal(runBuiltVerifier(bad), /event-not-unique/);
    await validArchiveControl();
  });

  it('refuses an archived counterpart from a different run', async () => {
    const bad = await fixture({ archiveDifferentRun: true });
    expectRefusal(runBuiltVerifier(bad), /archive-identity-mismatch/);
    await validArchiveControl();
  });

  it('corroborates gate run and target against retained proof', async () => {
    const valid = await fixture({ gate: true });
    expect(runBuiltVerifier(valid)).toMatchObject({
      status: 'verified',
      checks: expect.arrayContaining([
        expect.objectContaining({ id: 'gate-proof', status: 'passed' }),
      ]),
    });
    const bad = await fixture({ gate: true, gateProofMismatch: true });
    expectRefusal(runBuiltVerifier(bad), /gate-proof-mismatch/);
  });

  it('requires committed gate proof for gate-event replay', async () => {
    const missing = await replayFixture({
      repoOptions: { gate: true },
      omitGateProof: true,
      deleteArtifacts: true,
    });
    expectRefusal(missing.report, /durable-proof-missing/);

    const valid = await replayFixture({
      repoOptions: { gate: true },
      deleteArtifacts: true,
    });
    expect(valid.report).toMatchObject({
      status: 'verified',
      checks: expect.arrayContaining([
        expect.objectContaining({ id: 'gate-proof', status: 'passed' }),
      ]),
    });

    const contradictory = await replayFixture({
      repoOptions: { gate: true },
      contradictGateProof: true,
      deleteArtifacts: true,
    });
    expectRefusal(contradictory.report, /gate-proof-mismatch/);
  });

  it('refuses Reviewed Head when the Reviews row is proposed as its own oracle', async () => {
    const bad = await fixture({ repairField: 'Reviewed Head' });
    const proposal: ClericalSettlementProposal = {
      ...bad.proposal,
      findings: [
        {
          ...bad.proposal.findings[0]!,
          authoritativeSource: {
            kind: 'review-row',
            field: 'Reviewed Head',
          },
        },
      ],
    };
    await writeProposal(bad, proposal);
    expectRefusal(runBuiltVerifier(bad), /reviewed-head-self-oracle/);
    await validArchiveControl();
  });

  it('replays from committed evidence after the local review file is deleted', async () => {
    const replay = await replayFixture({ deleteArtifacts: true });
    expect(replay.report.status).toBe('verified');
    expect(replay.report.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'durable-proof', status: 'passed' }),
        expect.objectContaining({
          id: 'replay-consistency',
          status: 'passed',
        }),
      ]),
    );
  });

  it('refuses replay when durable settlement proof is missing', async () => {
    const bad = await replayFixture({ omitProof: true });
    expectRefusal(bad.report, /settlement-entry-malformed/);
    const valid = await replayFixture({ deleteArtifacts: true });
    expect(valid.report.status).toBe('verified');
  });

  it('verifies moved and collision-suffixed archived artifacts without the source', async () => {
    const moved = await fixture();
    await expect(moved.read(moved.sourceArtifact)).rejects.toThrow();
    expect(runBuiltVerifier(moved).status).toBe('verified');

    const collision = await fixture({
      archiveCollision: true,
      scope: 'p01',
    });
    expect(collision.archivedArtifact).toMatch(/2026-11-01T120000Z/);
    await expect(collision.read(collision.sourceArtifact)).rejects.toThrow();
    expect(runBuiltVerifier(collision).status).toBe('verified');
  });

  it('binds every finding to one distinct repaired field and its claim', async () => {
    const shared = await fixture({ sharedRepair: true });
    expectRefusal(runBuiltVerifier(shared), /repair-target-shared/);

    const substantive = await fixture({ substantiveDistinctRepair: true });
    expectRefusal(
      runBuiltVerifier(substantive),
      /finding-claim-field-mismatch/,
    );
    await validArchiveControl();
  });

  it('requires exact field-name tokens rather than substrings in claims', async () => {
    const bad = await fixture({ substantiveDistinctRepair: true });
    expectRefusal(runBuiltVerifier(bad), /finding-claim-field-mismatch/);
    await validArchiveControl();
  });

  it('refuses a clerical claim whose location line resolves elsewhere', async () => {
    const bad = await fixture({ findingLocation: 'plan.md:1' });
    expectRefusal(runBuiltVerifier(bad), /finding-location-record-mismatch/);
    await validArchiveControl();
  });

  it('replays non-goal scopes through the published head and refuses later code', async () => {
    const taskPlanOptions: SettlementRepoOptions = {
      repairField: 'Date',
      scope: 'p01',
      workflowMode: 'quick',
    };
    const valid = await replayFixture({
      repoOptions: taskPlanOptions,
      deleteArtifacts: true,
    });
    expect(valid.report.status).toBe('verified');
    expect(valid.proposal.goal).toBeUndefined();

    const stale = await replayFixture({
      repoOptions: taskPlanOptions,
      substantiveSuccessor: true,
    });
    expectRefusal(stale.report, /reviewed-subject-changed/);

    const rewritten = await replayFixture({
      repoOptions: taskPlanOptions,
      rewriteObservation: true,
    });
    expectRefusal(rewritten.report, /recorded journal line/i);
  });

  it('accepts production bookkeeping successors after settlement', async () => {
    const goal = await replayFixture({
      appendObservation:
        'Receive observation appended without rewriting evidence.',
      deleteArtifacts: true,
    });
    expect(goal.report.status).toBe('verified');
    expect(await goal.repo.read('state.md')).toContain(
      'oat_milestone_status: delivering',
    );

    const staleGoal = await replayFixture({
      substantiveSuccessor: true,
    });
    expectRefusal(staleGoal.report, /goal-12\.8-disallowed-path/);

    const taskPlan = await replayFixture({
      repoOptions: {
        repairField: 'Date',
        scope: 'p01',
        workflowMode: 'quick',
      },
      deleteArtifacts: true,
    });
    expect(taskPlan.report).toMatchObject({
      status: 'verified',
      checks: expect.arrayContaining([
        expect.objectContaining({
          id: 'non-goal-successor-chain',
          status: 'passed',
        }),
      ]),
    });
  });

  it('requires an explicit top-level published head for every replay', async () => {
    const replay = await replayFixture({
      repoOptions: {
        repairField: 'Date',
        scope: 'p01',
        workflowMode: 'quick',
      },
    });
    const withoutHead = {
      ...replay.proposal,
    } as Partial<ClericalSettlementProposal>;
    delete withoutHead.publishedHead;
    await writeProposal(replay.repo, withoutHead as ClericalSettlementProposal);
    const report = runBuiltVerifier(replay.repo);
    expect(report.status).toBe('error');
    expect(report.reason).toMatch(/publishedHead is required/);
  });

  it('refuses goal-only proposal fields outside an actual goal delivery scope', async () => {
    const repo = await fixture({
      repairField: 'Date',
      scope: 'p01',
      workflowMode: 'quick',
    });
    await writeProposal(repo, {
      ...repo.proposal,
      goal: { subject: 'p01' },
    });
    expectRefusal(runBuiltVerifier(repo), /goal-scope-mismatch/);
  });

  it('refuses a Reviewed Head rewrite in a settlement successor', async () => {
    const replay = await replayFixture({ changeReviewedHead: true });
    expectRefusal(replay.report, /durable-proof-contradictory/);
  });

  it('requires replay ledger and selected event types to remain code', async () => {
    const repo = await fixture();
    const first = runBuiltVerifier(repo);
    expect(first.status).toBe('verified');
    const forged = {
      ...first.settlement!,
      event: { ...first.settlement!.event, type: 'artifact' },
    };
    await repo.write(
      'plan.md',
      (await repo.read('plan.md')).replace('| code |', '| artifact |'),
    );
    await recordSettlement(repo, forged);
    const publishedHead = await appendReceive(repo);
    await writeProposal(repo, {
      ...repo.proposal,
      mode: 'replay',
      publishedHead,
      event: { ...repo.proposal.event, type: 'artifact' },
    });
    expectRefusal(runBuiltVerifier(repo), /durable-proof-missing/);
  });

  it('binds receipts to scope, artifact, counts, and finding IDs', async () => {
    const wrongScope = await fixture({ receiptScope: 'p99' });
    expectRefusal(runBuiltVerifier(wrongScope), /receipt-event-mismatch/);

    const wrongArtifact = await fixture({
      receiptArtifact: 'reviews/unrelated.md',
    });
    expectRefusal(runBuiltVerifier(wrongArtifact), /receipt-artifact-mismatch/);

    const wrongCounts = await fixture({
      receiptCounts: 'Critical 0 · High 0 · Medium 1 · Low 0',
    });
    expectRefusal(runBuiltVerifier(wrongCounts), /receipt-counts-mismatch/);

    const missingIds = await fixture({ omitReceiptFindings: true });
    expectRefusal(runBuiltVerifier(missingIds), /receipt-findings-mismatch/);
  });

  it('refuses descriptive prose until receive defines a lifecycle-produced target', async () => {
    const bad = await fixture({ descriptive: true });
    expectRefusal(
      runBuiltVerifier(bad),
      /descriptive-prose-target-unavailable/,
    );
  });

  it('refuses a reviewed file moved into the project directory', async () => {
    const bad = await fixture({
      repairField: 'Date',
      scope: 'p01',
      workflowMode: 'quick',
      moveReviewedFile: true,
    });
    expectRefusal(runBuiltVerifier(bad), /reviewed-subject-changed/);
  });

  it('accepts settlement entries only under Reviews and Gates with exact schema', async () => {
    const outside = await replayFixture({ outsideReviewsAndGates: true });
    expectRefusal(outside.report, /settlement-entry-not-unique/);

    const malformed = await replayFixture({ omitProof: true });
    expectRefusal(malformed.report, /settlement-entry-malformed/);
  });

  it('refuses replay or settlement against dirty tracked project evidence', async () => {
    const repo = await fixture();
    await repo.write(
      'plan.md',
      `${await repo.read('plan.md')}\nDirty evidence.\n`,
    );
    expectRefusal(runBuiltVerifier(repo), /project-state-dirty/);
  });

  it('normalizes labelled goal milestone scopes through the delivery reader', async () => {
    const repo = await fixture({ scope: 'm01: implementation review' });
    expect(runBuiltVerifier(repo).status).toBe('verified');
  });
});
