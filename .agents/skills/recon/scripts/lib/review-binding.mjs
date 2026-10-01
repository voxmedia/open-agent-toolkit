// One owner for review-brief projection: the descriptor allowlists, source,
// evidence, scope, and question projections, and each mode's fixed exclusion
// list. The brief generator and the artifact-shape contract read these, and
// the packet validator checks a brief by rebuilding it through the generator,
// so there is no second projection to drift. Briefs stay blind: only the
// fields below are projected, never full manifest entries or provenance.

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

// Projects the manifest sources named by `sourceIds`, in manifest order.
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

// The claim-bearing entries of a brief: adversarial briefs project
// `provisionalStatements`; verification and coverage briefs project `claims`.
export function reviewBriefEntries(brief, reviewKind) {
  const entries = adversaryReviewKinds.has(reviewKind)
    ? brief?.provisionalStatements
    : brief?.claims;
  return Array.isArray(entries) ? entries : [];
}
