import { hashCanonicalJson } from './canonical-json.mjs';

// One owner for verification-brief source projection and binding. The brief
// generator, the artifact-shape contract, and the packet validator all read
// these definitions so a brief the production generator writes is exactly the
// brief the validator expects. Briefs stay blind: only the descriptor fields
// below are projected, never full manifest entries or worker provenance.

export const reviewSourceKindFields = Object.freeze({
  repository: Object.freeze(['root', 'revision', 'dirty', 'contentHashes']),
  file: Object.freeze(['path', 'contentHash']),
  url: Object.freeze(['url', 'capturePath', 'captureDigest', 'validatorState']),
  'command-output': Object.freeze([
    'argv',
    'cwd',
    'exitStatus',
    'outputPath',
    'outputDigest',
    'environmentNames',
  ]),
  'connected-resource': Object.freeze([
    'system',
    'resourceId',
    'resourceVersion',
    'retrievalToken',
    'capturePath',
    'captureDigest',
  ]),
});

export const commonReviewSourceFields = Object.freeze([
  'id',
  'kind',
  'available',
  'authority',
  'observedAt',
  'validationState',
]);

// The fixed exclusion declaration each brief mode carries. It is structural,
// not caller-supplied, so a brief cannot use it as a free-text channel.
export const reviewBriefExcludedInputs = Object.freeze({
  verify: Object.freeze([
    'worker_intermediates',
    'prior_reasoning',
    'consumer_summary',
    'artifact_lineage',
    'earlier_reviews',
  ]),
  adversary: Object.freeze([
    'worker_intermediates',
    'prior_reasoning',
    'consumer_summary',
    'artifact_lineage',
    'earlier_reviews',
    'verification_conclusions',
  ]),
  coverage: Object.freeze([
    'worker_intermediates',
    'prior_reasoning',
    'consumer_summary',
    'artifact_lineage',
    'earlier_reviews',
    'verification_conclusions',
    'adversarial_conclusions',
  ]),
});

// Adversarial and coverage briefs carry the approved request's scope and
// questions, projected here for both the generator and the validator.
export function projectReviewScope(manifest) {
  return {
    included: structuredClone(manifest?.request?.includedScope ?? []),
    excluded: structuredClone(manifest?.request?.excludedScope ?? []),
  };
}

export function projectReviewQuestions(manifest) {
  return structuredClone(manifest?.request?.questions ?? []);
}

// Every non-claim field a brief shows a reviewer is bound: `excludedInputs`
// to its mode's fixed declaration, and adversarial and coverage `scope` and
// `questions` to the manifest request. Claim entries and verification sources
// are bound per claim by `reviewBriefBindsClaim`.
export function reviewBriefRequestBinds(brief, manifest) {
  const excluded = reviewBriefExcludedInputs[brief?.mode];
  if (
    !excluded ||
    hashCanonicalJson(brief.excludedInputs ?? null) !==
      hashCanonicalJson(excluded)
  ) {
    return false;
  }
  if (brief.mode === 'verify') {
    return !Object.hasOwn(brief, 'scope') && !Object.hasOwn(brief, 'questions');
  }
  return (
    hashCanonicalJson(brief.scope ?? null) ===
      hashCanonicalJson(projectReviewScope(manifest)) &&
    hashCanonicalJson(brief.questions ?? null) ===
      hashCanonicalJson(projectReviewQuestions(manifest))
  );
}

const verificationReviewKinds = new Set(['semantic', 'redundant-verification']);
const adversaryReviewKinds = new Set([
  'adversarial',
  'contradiction-resolution',
]);

export function projectReviewSource(source) {
  const kindFields = reviewSourceKindFields[source?.kind];
  if (!kindFields) {
    throw new Error(`Cannot project unknown source kind ${source?.kind}`);
  }
  return Object.fromEntries(
    [...commonReviewSourceFields, ...kindFields]
      .filter((key) => Object.hasOwn(source, key))
      .map((key) => [key, structuredClone(source[key])]),
  );
}

// Projects the manifest sources named by `sourceIds`, in manifest order. This
// is both the brief-level union (all claims' source IDs) and a claim's own
// subset (one claim's source IDs).
export function projectReviewSources(manifest, sourceIds) {
  return (manifest?.sources ?? [])
    .filter((source) => sourceIds.has(source?.id))
    .map(projectReviewSource);
}

export function projectEvidenceLink(link, evidenceById) {
  const evidence = evidenceById.get(link?.evidenceId);
  if (!evidence) return null;
  return {
    id: evidence.id,
    sourceId: evidence.sourceId,
    displayExcerpt: evidence.displayExcerpt,
    locator: structuredClone(evidence.locator),
  };
}

function safeProjectReviewSources(manifest, sourceIds) {
  try {
    const projected = projectReviewSources(manifest, sourceIds);
    return projected.length === sourceIds.size ? projected : null;
  } catch {
    return null;
  }
}

export function briefSourceIds(brief) {
  const ids = new Set();
  for (const claim of Array.isArray(brief?.claims) ? brief.claims : []) {
    for (const evidence of Array.isArray(claim?.evidence)
      ? claim.evidence
      : []) {
      ids.add(evidence?.sourceId);
    }
  }
  return ids;
}

// A verification brief binds at brief level when its `sources` equal the
// projected union of every brief claim's evidence sources.
export function briefSourcesBind(brief, manifest) {
  if (!Array.isArray(brief?.sources)) return false;
  const expected = safeProjectReviewSources(manifest, briefSourceIds(brief));
  return (
    expected !== null &&
    hashCanonicalJson(brief.sources) === hashCanonicalJson(expected)
  );
}

// The claim-bearing entries of a brief: adversarial briefs project
// `provisionalStatements`; verification and coverage briefs project `claims`.
export function reviewBriefEntries(brief, reviewKind) {
  const entries = adversaryReviewKinds.has(reviewKind)
    ? brief?.provisionalStatements
    : brief?.claims;
  return Array.isArray(entries) ? entries : [];
}

export function reviewBriefProjection(brief, reviewKind, claimId) {
  if (verificationReviewKinds.has(reviewKind)) {
    return brief?.claims?.find((item) => item?.id === claimId);
  }
  if (adversaryReviewKinds.has(reviewKind)) {
    return brief?.provisionalStatements?.find((item) => item?.id === claimId);
  }
  return brief?.claims?.find((item) => item?.id === claimId);
}

// A claim binds when its immutable statement matches and, for verification
// briefs, its projected evidence matches the ledger, the brief's sources are
// the projected union of its claims, and the claim's own source subset is the
// exact projection of the manifest sources it cites.
export function reviewBriefBindsClaim(
  brief,
  reviewKind,
  claim,
  ledger,
  manifest,
) {
  const projected = reviewBriefProjection(brief, reviewKind, claim?.id);
  if (!projected || projected.statement !== claim.statement) return false;
  if (!verificationReviewKinds.has(reviewKind)) {
    return Object.keys(projected).sort().join(',') === 'id,statement';
  }
  const evidenceById = new Map(
    (ledger?.evidence ?? []).map((item) => [item.id, item]),
  );
  const expectedEvidence = (claim.evidence ?? []).map((link) =>
    projectEvidenceLink(link, evidenceById),
  );
  if (
    expectedEvidence.some((item) => !item) ||
    hashCanonicalJson(projected.evidence ?? null) !==
      hashCanonicalJson(expectedEvidence)
  ) {
    return false;
  }
  if (!briefSourcesBind(brief, manifest)) return false;
  const claimSourceIds = new Set(expectedEvidence.map((item) => item.sourceId));
  const expectedSubset = safeProjectReviewSources(manifest, claimSourceIds);
  if (expectedSubset === null) return false;
  const actualSubset = brief.sources.filter((source) =>
    claimSourceIds.has(source?.id),
  );
  return hashCanonicalJson(actualSubset) === hashCanonicalJson(expectedSubset);
}
