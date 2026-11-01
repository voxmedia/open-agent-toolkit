import { afterEach, describe, expect, it } from 'vitest';

import {
  appendReceive,
  createSettlementRepo,
  recordSettlement,
  removeLocalArtifacts,
  removeSettlementRepo,
  runBuiltVerifier,
  type SettlementRepo,
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
    deleteArtifacts?: boolean;
  } = {},
): Promise<{
  repo: SettlementRepo;
  proposal: ClericalSettlementProposal;
  report: ClericalSettlementReport;
}> {
  const repo = await fixture();
  const first = runBuiltVerifier(repo);
  expect(first.status).toBe('verified');
  expect(first.settlement).not.toBeNull();
  await recordSettlement(repo, first.settlement!, {
    rewriteObservation: options.rewriteObservation,
    omitProof: options.omitProof,
  });
  const publishedHead = await appendReceive(repo);
  const proposal: ClericalSettlementProposal = {
    ...repo.proposal,
    mode: 'replay',
    goal: { subject: 'm01', publishedHead },
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

  it('verifies review-row metadata and non-goal descriptive-prose repairs', async () => {
    const metadata = await fixture({ repairField: 'Date' });
    expect(runBuiltVerifier(metadata).status).toBe('verified');

    const prose = await fixture({
      descriptive: true,
      findingLocation: 'implementation.md:30',
    });
    expect(runBuiltVerifier(prose)).toMatchObject({
      status: 'verified',
      checks: expect.arrayContaining([
        expect.objectContaining({
          id: 'reviewed-subject',
          status: 'passed',
        }),
      ]),
    });
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
    expectRefusal(runBuiltVerifier(bad), /goal-12\.8-substantive-change/);
    await validArchiveControl();
  });

  it('refuses replay when the settlement-recording commit rewrites an observation', async () => {
    const bad = await replayFixture({ rewriteObservation: true });
    expectRefusal(
      bad.report,
      /goal-12\.8-substantive-change.*recorded journal line/i,
    );
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
    expectRefusal(bad.report, /durable-proof-missing/);
    const valid = await replayFixture({ deleteArtifacts: true });
    expect(valid.report.status).toBe('verified');
  });
});
