import { canonicalJson } from './lib/canonical-json.mjs';

const requiredDispositions = new Map([
  ['semantic', 'affirmed'],
  ['adversarial', 'unchallenged'],
  ['coverage', 'covered'],
]);

const legalReconciliationTransitions = new Set([
  'provisional:verified',
  'provisional:contested',
  'supported:verified',
  'supported:contested',
  'verified:contested',
  'contested:verified',
  'unresolved:contested',
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
  if (!Array.isArray(reviewResults)) {
    throw new Error('Reconciliation requires an exact review-result array');
  }
  const reviewKinds = reviewResults.map((review) => review.reviewKind);
  if (
    new Set(reviewKinds).size !== reviewKinds.length ||
    reviewKinds.includes('reconciliation')
  ) {
    throw new Error(
      'Reconciliation rejects duplicate, nested, or shadow review results',
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
    const allowed =
      kind === 'coverage'
        ? new Set(['covered', 'gap'])
        : new Set([disposition]);
    if (!review.dispositions.every((item) => allowed.has(item.disposition))) {
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
    const materialCoverageGap = reviewResults.some(
      (review) =>
        review.reviewKind === 'coverage' &&
        review.coverageFindings.some(
          (finding) =>
            finding.material === true && finding.claimIds.includes(claim.id),
        ),
    );
    const coreComplete = [...requiredDispositions].every(
      ([kind, disposition]) =>
        supporting.some(
          (review) =>
            review.reviewKind === kind &&
            review.dispositions.some(
              (item) =>
                item.claimId === claim.id &&
                (item.disposition === disposition ||
                  (kind === 'coverage' && item.disposition === 'gap')),
            ),
        ),
    );
    claim.reviewIds = [
      ...new Set([
        ...claim.reviewIds,
        ...supporting.map((review) => review.id),
      ]),
    ];
    if (!coreComplete) continue;
    const from = claim.status;
    const to = materialCoverageGap ? 'contested' : 'verified';
    if (!legalReconciliationTransitions.has(`${from}:${to}`)) continue;
    claim.status = to;
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
    removalDispositions: [],
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
