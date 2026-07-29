export const PACKAGE_COVERAGE_VERSION =
  'explainer-kit.package-coverage/v1';
export const SET_PLAN_RECORD_PATHS = Object.freeze([
  'source/set-plan/request.json',
  'source/set-plan/result.json',
  'source/set-plan/ledger.json',
  'source/set-plan/portfolio.json',
  'source/set-plan/drafts.json',
]);
export const VISUAL_REVISION_PATH = 'qa/visual-review/revision.json';

const REVIEW_VIEWPORTS = Object.freeze(['mobile', 'tablet', 'desktop']);
const SUCCESSFUL_OUTCOMES = new Set(['built-not-durable', 'built-durable']);
const PARTIAL_REVIEW_OUTCOME = 'built-needs-review';

export function requiredImmutablePackagePaths(manifest, { runMode } = {}) {
  if (!isObject(manifest)) {
    throw new TypeError(
      'Manifest package coverage requires a manifest object.',
    );
  }
  if (
    runMode !== undefined &&
    runMode !== 'interactive' &&
    runMode !== 'unattended'
  ) {
    throw new TypeError(
      'Manifest package coverage run mode must be interactive or unattended.',
    );
  }

  const required = new Set([
    'run-request.json',
    'source/content-approval.json',
    manifest.source?.factBasePath,
    'source/fact-base.md',
    ...(manifest.source?.authorResultPaths ?? []),
    manifest.theme?.path,
    ...(manifest.artifacts ?? []).flatMap((artifact) => [
      artifact.contentPath,
      ...(artifact.status === 'built' &&
      typeof artifact.renderedPath === 'string'
        ? [artifact.renderedPath]
        : []),
    ]),
  ]);
  required.delete(undefined);

  if (manifest.recipe?.id !== 'project-recap') return [...required];

  const successful = SUCCESSFUL_OUTCOMES.has(manifest.outcome);
  if (successful) {
    for (const path of SET_PLAN_RECORD_PATHS) required.add(path);
  }

  const recorded = Object.keys(manifest.immutableHashes ?? {});
  if (manifest.outcome === PARTIAL_REVIEW_OUTCOME) return [...required];

  const retainsReviewMaterial = recorded.some(isReviewMaterial);
  const requireAttemptOne =
    (successful && runMode === 'unattended') ||
    (successful && runMode === 'interactive' && retainsReviewMaterial) ||
    (!successful && retainsReviewMaterial);
  const retainsAttemptTwo = recorded.some(isAttemptTwoMaterial);

  if (requireAttemptOne || retainsAttemptTwo) {
    addVisualReviewAttemptPaths(required, manifest, 1);
  }
  if (retainsAttemptTwo) {
    required.add(VISUAL_REVISION_PATH);
    addVisualReviewAttemptPaths(required, manifest, 2);
  }
  return [...required];
}

function addVisualReviewAttemptPaths(required, manifest, attempt) {
  const root = `qa/visual-review/attempt-${attempt}`;
  required.add(`${root}/request.json`);
  required.add(`${root}/result.json`);
  for (const artifact of manifest.artifacts ?? []) {
    if (artifact.status !== 'built') continue;
    for (const viewport of REVIEW_VIEWPORTS) {
      required.add(`qa/browser/${artifact.id}/${viewport}.png`);
      required.add(`qa/browser/${artifact.id}/${viewport}.json`);
      required.add(`${root}/evidence/${artifact.id}/${viewport}.png`);
      required.add(`${root}/evidence/${artifact.id}/${viewport}.json`);
    }
  }
}

function isReviewMaterial(path) {
  return (
    path.startsWith('qa/browser/') ||
    path.startsWith('qa/visual-review/') ||
    path.startsWith('qa/review-gate/')
  );
}

function isAttemptTwoMaterial(path) {
  return (
    path === VISUAL_REVISION_PATH ||
    path.startsWith('qa/visual-review/attempt-2/') ||
    path.startsWith('qa/review-gate/attempt-2')
  );
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
