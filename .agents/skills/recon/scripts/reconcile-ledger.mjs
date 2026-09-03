import { canonicalJson } from './lib/canonical-json.mjs';
import { validateArtifactShape } from './lib/contracts.mjs';

const requiredDispositions = new Map([
  ['semantic', 'affirmed'],
  ['adversarial', 'unchallenged'],
  ['coverage', 'covered'],
]);

const permittedDispositions = new Map([
  ['semantic', new Set(['affirmed', 'rejected', 'uncertain'])],
  ['adversarial', new Set(['unchallenged', 'challenged'])],
  ['coverage', new Set(['covered', 'gap'])],
]);

const legalReconciliationTransitions = new Set([
  'provisional:verified',
  'provisional:contested',
  'provisional:unresolved',
  'provisional:unsupported',
  'supported:verified',
  'supported:contested',
  'supported:unresolved',
  'supported:unsupported',
  'verified:contested',
  'verified:unresolved',
  'verified:unsupported',
  'contested:verified',
  'contested:unresolved',
  'contested:unsupported',
  'unresolved:contested',
  'unresolved:unsupported',
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
  for (const review of reviewResults) {
    const reviewArtifact = { ...review };
    delete reviewArtifact.artifactReference;
    const validation = validateArtifactShape(reviewArtifact);
    if (!validation.valid) {
      throw new Error(
        `Reconciliation rejects schema-invalid review ${review.id ?? '<unknown>'}: ${validation.errors.map((error) => error.code).join(', ')}`,
      );
    }
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
  for (const [kind] of requiredDispositions) {
    const review = reviews.get(kind);
    if (!review || review.runId !== runId || review.status !== 'complete') {
      throw new Error(`Reconciliation requires a complete ${kind} result`);
    }
    const allowed = permittedDispositions.get(kind);
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
  const claimsById = new Map(ledger.claims.map((claim) => [claim.id, claim]));
  const priorEvidenceById = new Map();
  for (const evidence of ledger.evidence) {
    if (priorEvidenceById.has(evidence.id)) {
      throw new Error(
        `Reconciliation rejects duplicate evidence ${evidence.id}`,
      );
    }
    priorEvidenceById.set(evidence.id, canonicalJson(evidence));
  }
  for (const claim of ledger.claims) {
    const links = new Set();
    for (const link of claim.evidence) {
      if (!priorEvidenceById.has(link.evidenceId)) {
        throw new Error(
          `Reconciliation rejects invented evidence link ${link.evidenceId} on ${claim.id}`,
        );
      }
      const key = canonicalJson(link);
      if (links.has(key)) {
        throw new Error(
          `Reconciliation rejects duplicate evidence link ${link.evidenceId} on ${claim.id}`,
        );
      }
      links.add(key);
    }
  }
  const incorporatedEvidence = new Map();
  for (const review of reviewResults) {
    const reviewEvidenceById = new Map(
      review.newEvidence.map((evidence) => [evidence.id, evidence]),
    );
    const dispositionClaimIds = new Set(
      review.dispositions.map((item) => item.claimId),
    );
    const associationKeys = new Set();
    for (const association of review.evidenceAssociations ?? []) {
      const key = canonicalJson(association);
      if (associationKeys.has(key)) {
        throw new Error(
          `Reconciliation rejects duplicate evidence association ${association.evidenceId} -> ${association.claimId}`,
        );
      }
      associationKeys.add(key);
      if (!reviewEvidenceById.has(association.evidenceId)) {
        throw new Error(
          `Reconciliation rejects association for ${association.evidenceId} without matching new evidence`,
        );
      }
      if (!claimsById.has(association.claimId)) {
        throw new Error(
          `Reconciliation rejects association to unknown claim ${association.claimId}`,
        );
      }
      if (!dispositionClaimIds.has(association.claimId)) {
        throw new Error(
          `Reconciliation rejects association to claim ${association.claimId} without a review disposition`,
        );
      }
    }
    for (const evidence of review.newEvidence) {
      const bytes = canonicalJson(evidence);
      const previousBytes = priorEvidenceById.get(evidence.id);
      const incorporated = incorporatedEvidence.get(evidence.id);
      if (previousBytes !== undefined || incorporated) {
        const existingBytes = previousBytes ?? incorporated.bytes;
        const description =
          existingBytes === bytes
            ? 'duplicate evidence'
            : 'conflicting evidence';
        throw new Error(`Reconciliation rejects ${description} ${evidence.id}`);
      }
      const associations = (review.evidenceAssociations ?? []).filter(
        (association) => association.evidenceId === evidence.id,
      );
      if (associations.length === 0) {
        throw new Error(
          `Reconciliation rejects unincorporated evidence ${evidence.id} without an affected claim`,
        );
      }
      incorporatedEvidence.set(evidence.id, {
        bytes,
        evidence: exactClone(evidence),
        associations: exactClone(associations),
      });
    }
  }
  for (const { evidence, associations } of incorporatedEvidence.values()) {
    ledger.evidence.push(evidence);
    for (const association of associations) {
      claimsById.get(association.claimId).evidence.push({
        evidenceId: association.evidenceId,
        relation: association.relation,
      });
    }
  }
  const transitions = [];
  const removals = [];
  const removalDispositions = [];
  for (const claim of ledger.claims) {
    const supporting = reviewResults.filter((review) =>
      review.dispositions.some((item) => item.claimId === claim.id),
    );
    const rejectedReview = supporting.find((review) =>
      review.dispositions.some(
        (item) => item.claimId === claim.id && item.disposition === 'rejected',
      ),
    );
    const challenged = supporting.some(
      (review) =>
        review.reviewKind === 'adversarial' &&
        review.dispositions.some(
          (item) =>
            item.claimId === claim.id && item.disposition === 'challenged',
        ),
    );
    const uncertain = supporting.some((review) =>
      review.dispositions.some(
        (item) => item.claimId === claim.id && item.disposition === 'uncertain',
      ),
    );
    const incomplete =
      supporting.length > 0 &&
      [...requiredDispositions.keys()].some(
        (kind) =>
          !reviewResults.some(
            (review) =>
              review.reviewKind === kind &&
              review.dispositions.some((item) => item.claimId === claim.id),
          ),
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
    if (rejectedReview) {
      const from = claim.status;
      const to = 'unsupported';
      if (legalReconciliationTransitions.has(`${from}:${to}`)) {
        claim.status = to;
        if (from !== to) transitions.push({ claimId: claim.id, from, to });
      }
      continue;
    }
    if (challenged) {
      const from = claim.status;
      const to = 'contested';
      if (legalReconciliationTransitions.has(`${from}:${to}`)) {
        claim.status = to;
        if (from !== to) transitions.push({ claimId: claim.id, from, to });
      }
      continue;
    }
    if (uncertain || incomplete) {
      const from = claim.status;
      const to = 'unresolved';
      if (legalReconciliationTransitions.has(`${from}:${to}`)) {
        claim.status = to;
        if (from !== to) transitions.push({ claimId: claim.id, from, to });
      }
      continue;
    }
    if (!coreComplete) continue;
    const from = claim.status;
    const to = materialCoverageGap ? 'contested' : 'verified';
    if (!legalReconciliationTransitions.has(`${from}:${to}`)) continue;
    claim.status = to;
    if (from !== claim.status)
      transitions.push({ claimId: claim.id, from, to: claim.status });
  }
  if (removals.length > 0) {
    const removed = new Set(removals);
    ledger.claims = ledger.claims.filter((claim) => !removed.has(claim.id));
    if (ledger.synthesis && Array.isArray(ledger.synthesis.keyClaimIds)) {
      ledger.synthesis.keyClaimIds = ledger.synthesis.keyClaimIds.filter(
        (id) => !removed.has(id),
      );
    }
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
    removals,
    removalDispositions,
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
    evidenceAssociations: [],
    coverageFindings: [],
    unresolvedIssues: [],
  };
  const ledgerValidation = validateArtifactShape(ledger);
  if (!ledgerValidation.valid) {
    throw new Error(
      `Reconciliation rejects schema-invalid review evidence: ${ledgerValidation.errors.map((error) => error.code).join(', ')}`,
    );
  }
  return { ledger, reconciliation };
}
