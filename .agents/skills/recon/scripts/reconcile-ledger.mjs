import { canonicalJson } from './lib/canonical-json.mjs';

const requiredDispositions = new Map([
  ['semantic', 'affirmed'],
  ['adversarial', 'unchallenged'],
  ['coverage', 'covered'],
]);

function exactClone(value) {
  return JSON.parse(canonicalJson(value));
}

export function reconcileLedger({
  priorLedger,
  reviewResults,
  priorReference,
  runId = priorLedger?.runId,
  reviewerLane = 'lane-reconciliation',
}) {
  if (!priorLedger || priorLedger.runId !== runId || priorLedger.revision < 1) {
    throw new Error(
      'Reconciliation requires the exact prior ledger for this run',
    );
  }
  const reviews = new Map(
    reviewResults.map((review) => [review.reviewKind, review]),
  );
  for (const [kind, disposition] of requiredDispositions) {
    const review = reviews.get(kind);
    if (!review || review.runId !== runId || review.status !== 'complete') {
      throw new Error(`Reconciliation requires a complete ${kind} result`);
    }
    if (
      !review.dispositions.every((item) => item.disposition === disposition)
    ) {
      throw new Error(`Reconciliation received an invalid ${kind} disposition`);
    }
  }
  const ledger = exactClone(priorLedger);
  ledger.revision = priorLedger.revision + 1;
  ledger.inputArtifacts = [
    ...priorLedger.inputArtifacts,
    priorReference,
    ...reviewResults.map(
      (review) => review.artifactReference ?? review.permittedInputs[0],
    ),
  ];
  const transitions = [];
  for (const claim of ledger.claims) {
    const supporting = reviewResults.filter((review) =>
      review.dispositions.some((item) => item.claimId === claim.id),
    );
    if (supporting.length !== 3) continue;
    const from = claim.status;
    claim.status = 'verified';
    claim.reviewIds = supporting.map((review) => review.id);
    if (from !== claim.status)
      transitions.push({ claimId: claim.id, from, to: claim.status });
  }
  ledger.transitions = transitions;
  const coverageDispositions = (
    reviews.get('coverage')?.coverageFindings ?? []
  ).map((finding) => ({
    findingId: finding.id,
    gapId: finding.gapId,
    disposition: 'accepted-gap',
  }));
  const reconciliation = {
    kind: 'recon.review-result',
    schemaVersion: 1,
    id: 'review-reconciliation',
    runId,
    reviewKind: 'reconciliation',
    reviewerLane,
    status: 'complete',
    inputLedger: { ...priorReference, revision: priorLedger.revision },
    outputRevision: ledger.revision,
    incorporatedReviewIds: reviewResults.map((review) => review.id),
    transitions: exactClone(transitions),
    additions: [],
    removals: [],
    coverageDispositions,
    permittedInputs: [
      priorReference,
      ...reviewResults.map(
        (review) => review.artifactReference ?? review.permittedInputs[0],
      ),
    ],
    excludedInputs: [],
    dispositions: [],
    newEvidence: [],
    coverageFindings: [],
    unresolvedIssues: [],
  };
  return { ledger, reconciliation };
}
