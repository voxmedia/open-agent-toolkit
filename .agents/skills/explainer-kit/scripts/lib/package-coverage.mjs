import { createHash } from 'node:crypto';

import { browserCaptureIdentity } from './browser-runtime.mjs';
import { canonicalHash, validateContract } from './contracts.mjs';

export const PACKAGE_COVERAGE_VERSION = 'explainer-kit.package-coverage/v2';
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

export async function validateImmutablePackageEvidence(
  manifest,
  { runMode, read } = {},
) {
  const requiredPaths = requiredImmutablePackagePaths(manifest, { runMode });
  const missing = requiredPaths.filter(
    (path) => !(path in (manifest?.immutableHashes ?? {})),
  );
  if (missing.length > 0) {
    throw new Error(
      `Manifest immutable hashes do not cover the canonical package: ${missing.join(', ')}.`,
    );
  }
  if (manifest?.recipe?.id !== 'project-recap') return;

  const recorded = Object.keys(manifest.immutableHashes ?? {});
  const successful = SUCCESSFUL_OUTCOMES.has(manifest.outcome);
  const retainsReviewMaterial = recorded.some(isReviewMaterial);
  if (manifest.outcome === PARTIAL_REVIEW_OUTCOME) return;
  const requireAttemptOne =
    (successful && runMode === 'unattended') ||
    (successful && runMode === 'interactive' && retainsReviewMaterial) ||
    (!successful &&
      manifest.outcome !== PARTIAL_REVIEW_OUTCOME &&
      retainsReviewMaterial);
  const retainsAttemptTwo = recorded.some(isAttemptTwoMaterial);
  if (!requireAttemptOne && !retainsAttemptTwo) return;
  if (typeof read !== 'function') {
    throw new TypeError(
      'Canonical browser evidence validation requires an immutable package reader.',
    );
  }

  const readVerified = async (path) => {
    const value = await read(path);
    const bytes = Buffer.isBuffer(value) ? value : Buffer.from(value);
    const expected = manifest.immutableHashes[path];
    const actual = `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
    if (actual !== expected) {
      throw new Error(`Immutable package hash mismatch for ${path}.`);
    }
    return bytes;
  };
  const builtArtifacts = (manifest.artifacts ?? []).filter(
    ({ status }) => status === 'built',
  );
  const browserRecords = new Map();
  let expectedRuntimeHash;
  let expectedCaptureIdentity;
  for (const artifact of builtArtifacts) {
    for (const viewport of REVIEW_VIEWPORTS) {
      const metricsPath = `qa/browser/${artifact.id}/${viewport}.json`;
      const bytes = await readVerified(metricsPath);
      const screenshotPath = `qa/browser/${artifact.id}/${viewport}.png`;
      const screenshotBytes = await readVerified(screenshotPath);
      if (!isPng(screenshotBytes)) {
        throw new Error(
          `Browser screenshot evidence ${screenshotPath} is not a PNG.`,
        );
      }
      const record = parseJson(bytes, metricsPath);
      validateBrowserEvidenceRecord(record, {
        artifactId: artifact.id,
        viewport,
        metricsPath,
        requireLaunched: successful && runMode === 'unattended',
      });
      const runtimeHash = canonicalHash(record.runtime);
      expectedRuntimeHash ??= runtimeHash;
      expectedCaptureIdentity ??= record.captureIdentity;
      if (
        runtimeHash !== expectedRuntimeHash ||
        record.captureIdentity !== expectedCaptureIdentity
      ) {
        throw new Error(
          `Browser runtime or capture identity mismatch in ${metricsPath}.`,
        );
      }
      browserRecords.set(metricsPath, { bytes, record, screenshotBytes });
    }
  }

  const attempts = retainsAttemptTwo ? [1, 2] : [1];
  let terminalResult;
  for (const attempt of attempts) {
    const root = `qa/visual-review/attempt-${attempt}`;
    const requestPath = `${root}/request.json`;
    const request = parseJson(await readVerified(requestPath), requestPath);
    const requestValidation = validateContract(
      'visual-review-request',
      request,
    );
    if (!requestValidation.valid) {
      throw new Error(
        `Immutable visual-review request ${requestPath} is invalid: ${requestValidation.errors
          .map(({ code }) => code)
          .join(', ')}.`,
      );
    }
    if (
      canonicalHash(request.browserRuntime) !== expectedRuntimeHash ||
      request.captureIdentity !== expectedCaptureIdentity
    ) {
      throw new Error(
        `Visual-review browser runtime or capture identity mismatch in ${requestPath}.`,
      );
    }
    const requestEvidence = new Map(
      request.renderedArtifacts.flatMap((artifact) =>
        artifact.evidence.map((evidence) => [
          `${artifact.artifactId}:${evidence.viewport}`,
          evidence,
        ]),
      ),
    );
    for (const artifact of builtArtifacts) {
      for (const viewport of REVIEW_VIEWPORTS) {
        const key = `${artifact.id}:${viewport}`;
        const evidence = requestEvidence.get(key);
        const sourceMetricsPath = `qa/browser/${artifact.id}/${viewport}.json`;
        const sourceScreenshotPath = `qa/browser/${artifact.id}/${viewport}.png`;
        if (
          !evidence ||
          evidence.metricsPath !== sourceMetricsPath ||
          evidence.screenshotPath !== sourceScreenshotPath ||
          evidence.captureIdentity !== expectedCaptureIdentity
        ) {
          throw new Error(
            `Visual-review evidence binding mismatch for ${key} in ${requestPath}.`,
          );
        }
        const sourceMetrics = browserRecords.get(sourceMetricsPath);
        if (
          evidence.metricsHash !==
          `sha256:${createHash('sha256')
            .update(sourceMetrics.bytes)
            .digest('hex')}`
        ) {
          throw new Error(
            `Visual-review metrics hash mismatch for ${key} in ${requestPath}.`,
          );
        }
        if (
          evidence.screenshotHash !==
          `sha256:${createHash('sha256')
            .update(sourceMetrics.screenshotBytes)
            .digest('hex')}`
        ) {
          throw new Error(
            `Visual-review screenshot hash mismatch for ${key} in ${requestPath}.`,
          );
        }
        const copiedMetricsPath = `${root}/evidence/${artifact.id}/${viewport}.json`;
        const copiedMetrics = await readVerified(copiedMetricsPath);
        if (!copiedMetrics.equals(sourceMetrics.bytes)) {
          throw new Error(
            `Retained visual-review browser identity differs from ${sourceMetricsPath}.`,
          );
        }
        const copiedScreenshotPath = `${root}/evidence/${artifact.id}/${viewport}.png`;
        const copiedScreenshot = await readVerified(copiedScreenshotPath);
        if (!copiedScreenshot.equals(sourceMetrics.screenshotBytes)) {
          throw new Error(
            `Retained visual-review screenshot differs from ${sourceScreenshotPath}.`,
          );
        }
      }
    }
    if (
      requestEvidence.size !==
      builtArtifacts.length * REVIEW_VIEWPORTS.length
    ) {
      throw new Error(
        `Visual-review evidence set in ${requestPath} does not match the complete browser record set.`,
      );
    }

    const resultPath = `${root}/result.json`;
    const result = parseJson(await readVerified(resultPath), resultPath);
    const resultValidation = validateContract('visual-review-result', result, {
      visualReviewRequest: request,
    });
    if (!resultValidation.valid) {
      throw new Error(
        `Immutable visual-review result ${resultPath} is invalid: ${resultValidation.errors
          .map(({ code }) => code)
          .join(', ')}.`,
      );
    }
    terminalResult = result;
  }
  if (successful && terminalResult?.disposition !== 'pass') {
    throw new Error(
      'Successful recap package requires a terminal passing visual review.',
    );
  }
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

function isPng(bytes) {
  return (
    bytes.length >= 8 &&
    bytes
      .subarray(0, 8)
      .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  );
}

function validateBrowserEvidenceRecord(
  record,
  { artifactId, viewport, metricsPath, requireLaunched },
) {
  if (
    !isObject(record) ||
    record.schemaVersion !== 'explainer-kit.browser-evidence/v2' ||
    record.artifactId !== artifactId ||
    record.viewport !== viewport ||
    record.scenario !== 'default' ||
    !isObject(record.runtime) ||
    !['launched', 'fixture'].includes(record.runtime.kind) ||
    record.runtime.name !== 'chromium' ||
    typeof record.runtime.version !== 'string' ||
    record.runtime.version.length === 0 ||
    !isObject(record.capture) ||
    !/^sha256:[a-f0-9]{64}$/.test(record.captureIdentity ?? '') ||
    record.captureIdentity !==
      browserCaptureIdentity(record.runtime, record.capture)
  ) {
    throw new Error(
      `Browser evidence ${metricsPath} does not satisfy explainer-kit.browser-evidence/v2.`,
    );
  }
  if (requireLaunched && record.runtime.kind !== 'launched') {
    throw new Error(
      `Production browser evidence ${metricsPath} must identify launched Chromium, not a fixture session.`,
    );
  }
}

function parseJson(bytes, path) {
  try {
    return JSON.parse(bytes.toString('utf8'));
  } catch {
    throw new Error(
      `Immutable package record ${path} must contain valid JSON.`,
    );
  }
}
