import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { isAbsolute, relative, resolve } from 'node:path';

import {
  canonicalHash,
  validateContract,
  visualReviewRequestId,
} from './contracts.mjs';
import { decodeBrowserPng } from './png.mjs';

const REQUIRED_VIEWPORTS = Object.freeze(['mobile', 'tablet', 'desktop']);

export async function runVisualReview({
  plan,
  rendered,
  evidence,
  visualCritic,
  runRoot,
}) {
  if (typeof visualCritic !== 'function') {
    throw visualReviewError(
      'Independent visual review requires a visualCritic callback.',
    );
  }
  const { request, snapshots } = await buildVisualReviewRequest({
    plan,
    rendered,
    evidence,
    runRoot,
  });
  const evidenceInput = Object.freeze({
    read: async (path) => {
      const snapshot = snapshots.get(path);
      if (!snapshot) {
        throw visualReviewError(
          `Visual critic requested unbound evidence path ${path}.`,
        );
      }
      return Buffer.from(snapshot.bytes);
    },
  });
  let result;
  try {
    result = await visualCritic(structuredClone(request), evidenceInput);
  } catch {
    throw visualReviewError('Visual critic provider failed.', {
      request,
      kind: 'provider-failure',
    });
  }
  try {
    await assertSnapshotsUnchanged(runRoot, snapshots);
  } catch {
    throw visualReviewError('Visual review evidence changed during review.', {
      request,
      kind: 'pipeline-failure',
    });
  }
  const validation = validateContract('visual-review-result', result, {
    visualReviewRequest: request,
  });
  if (!validation.valid) {
    throw visualReviewError('Visual critic returned an invalid result.', {
      request,
      kind: 'provider-failure',
    });
  }
  return {
    request,
    result: structuredClone(result),
  };
}

export async function buildVisualReviewRequest({
  plan,
  rendered,
  evidence,
  runRoot,
}) {
  if (!Array.isArray(rendered) || !Array.isArray(evidence)) {
    throw visualReviewError(
      'Visual review requires rendered artifacts and browser evidence arrays.',
    );
  }
  if (typeof runRoot !== 'string' || runRoot.length === 0) {
    throw visualReviewError('Visual review requires a confined run root.');
  }
  const browserBinding = browserBindingFor(evidence);
  const paths = [
    ...rendered.map(({ renderedPath }) => renderedPath),
    ...evidence.flatMap(({ screenshotPath, metricsPath }) => [
      screenshotPath,
      metricsPath,
    ]),
  ];
  const snapshots = new Map(
    await Promise.all(
      [...new Set(paths)].map(async (path) => [
        path,
        await captureSnapshot(runRoot, path),
      ]),
    ),
  );
  for (const item of evidence) {
    const snapshot = snapshots.get(item.screenshotPath);
    let decoded;
    try {
      decoded = decodeBrowserPng(snapshot.bytes);
    } catch (error) {
      throw visualReviewError(
        `Visual review screenshot ${item.screenshotPath} is not a decodable browser PNG: ${error.message}`,
      );
    }
    if (
      typeof item.decodedScreenshotHash !== 'string' ||
      decoded.decodedHash !== item.decodedScreenshotHash
    ) {
      throw visualReviewError(
        `Visual review screenshot ${item.screenshotPath} does not match its decoded screenshot hash.`,
      );
    }
  }
  const payload = {
    schemaVersion: 'explainer-kit.visual-review-request/v1',
    browserRuntime: browserBinding.runtime,
    captureIdentity: browserBinding.captureIdentity,
    plan: structuredClone(plan),
    renderedArtifacts: rendered.map(({ artifactId, renderedPath }) => ({
      artifactId,
      renderedPath,
      renderedHash: snapshots.get(renderedPath).hash,
      cohesionObservations: cohesionObservationsFromLedger({
        artifactId,
        content: snapshots.get(renderedPath).bytes,
        contentHash: snapshots.get(renderedPath).hash,
        ledger: plan?.ledger,
      }),
      evidence: evidence
        .filter((item) => item.artifactId === artifactId)
        .map(({ viewport, screenshotPath, metricsPath, captureIdentity }) => ({
          viewport,
          screenshotPath,
          screenshotHash: snapshots.get(screenshotPath).hash,
          metricsPath,
          metricsHash: snapshots.get(metricsPath).hash,
          captureIdentity,
        })),
    })),
  };
  const requestHash = canonicalHash(payload);
  const request = {
    ...payload,
    requestId: visualReviewRequestId(requestHash),
    requestHash,
  };
  const validation = validateContract('visual-review-request', request);
  if (!validation.valid) {
    throw visualReviewError(
      `Visual review request is incomplete: ${formatErrors(validation.errors)}`,
    );
  }
  for (const artifact of request.renderedArtifacts) {
    const viewports = new Set(
      artifact.evidence.map(({ viewport }) => viewport),
    );
    if (
      viewports.size !== REQUIRED_VIEWPORTS.length ||
      REQUIRED_VIEWPORTS.some((viewport) => !viewports.has(viewport))
    ) {
      throw visualReviewError(
        `Visual review requires mobile, tablet, and desktop evidence for ${artifact.artifactId}.`,
      );
    }
  }
  return { request, snapshots };
}

function browserBindingFor(evidence) {
  if (evidence.length === 0) {
    throw visualReviewError(
      'Visual review requires trusted browser runtime evidence.',
    );
  }
  const first = evidence[0];
  if (
    !validBrowserRuntime(first.runtime) ||
    !/^sha256:[a-f0-9]{64}$/.test(first.captureIdentity ?? '')
  ) {
    throw visualReviewError(
      'Visual review evidence is missing trusted browser runtime identity.',
    );
  }
  const runtimeHash = canonicalHash(first.runtime);
  for (const item of evidence) {
    if (
      !validBrowserRuntime(item.runtime) ||
      canonicalHash(item.runtime) !== runtimeHash ||
      item.captureIdentity !== first.captureIdentity
    ) {
      throw visualReviewError(
        'Visual review browser runtime or capture identity does not match across evidence records.',
      );
    }
  }
  return {
    runtime: structuredClone(first.runtime),
    captureIdentity: first.captureIdentity,
  };
}

function validBrowserRuntime(runtime) {
  return (
    runtime &&
    typeof runtime === 'object' &&
    ['launched', 'fixture'].includes(runtime.kind) &&
    runtime.name === 'chromium' &&
    typeof runtime.version === 'string' &&
    runtime.version.length > 0
  );
}

export function cohesionEvidenceFromLedger(artifacts, plan) {
  if (!plan?.ledger) return artifacts;
  return artifacts.map((artifact) => {
    const text = visibleText(artifact.html);
    return {
      ...artifact,
      cohesion: {
        terminology: observedClaims(
          plan.ledger.terminology,
          ({ term }) => term,
          ({ term }) => term,
          text,
        ),
        numericClaims: observedClaims(
          plan.ledger.numbers,
          ({ subject }) => subject,
          ({ value }) => value,
          text,
          true,
        ),
        statuses: observedClaims(
          plan.ledger.statuses,
          ({ subject }) => subject,
          ({ value }) => value,
          text,
        ),
      },
    };
  });
}

export function cohesionObservationsFromLedger({
  artifactId,
  content,
  contentHash,
  ledger,
}) {
  const text = visibleText(
    Buffer.isBuffer(content) ? content.toString() : content,
  );
  return [
    ...observedEntries(
      ledger?.terminology,
      'terminology',
      ({ term }) => term,
      ({ term }) => term,
      text,
    ),
    ...observedEntries(
      ledger?.statuses,
      'statuses',
      ({ subject }) => subject,
      ({ value }) => value,
      text,
    ),
    ...observedEntries(
      ledger?.numbers,
      'numericClaims',
      ({ subject }) => subject,
      ({ value }) => value,
      text,
      true,
    ),
  ].map((observation) => ({
    artifactId,
    contentHash,
    ...observation,
  }));
}

function observedClaims(entries, keyOf, valueOf, text, numeric = false) {
  return Object.fromEntries(
    (entries ?? [])
      .filter((entry) => claimObserved(text, valueOf(entry), numeric))
      .map((entry) => [keyOf(entry), valueOf(entry)]),
  );
}

function observedEntries(
  entries,
  group,
  keyOf,
  valueOf,
  text,
  numeric = false,
) {
  return (entries ?? [])
    .filter((entry) => claimObserved(text, valueOf(entry), numeric))
    .map((entry) => ({
      group,
      claim: keyOf(entry),
      value: valueOf(entry),
    }));
}

function claimObserved(text, value, numeric) {
  const normalized = String(value)
    .replaceAll(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase();
  if (!normalized) return false;
  const escaped = normalized.replaceAll(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const startsWithDigit = numeric && /^\p{N}/u.test(normalized);
  const endsWithDigit = numeric && /\p{N}$/u.test(normalized);
  const leftBoundary = startsWithDigit
    ? '[^\\p{L}\\p{N}.,]'
    : '[^\\p{L}\\p{N}]';
  const rightBoundary = endsWithDigit
    ? '(?![\\p{L}\\p{N}]|[.,]\\p{N})'
    : '(?![\\p{L}\\p{N}])';
  return new RegExp(
    `(?:^|${leftBoundary})${escaped}${rightBoundary}`,
    'u',
  ).test(text);
}

function visibleText(value) {
  return String(value)
    .replaceAll(/<[^>]+>/g, ' ')
    .replaceAll(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase();
}

function formatErrors(errors) {
  return errors
    .slice(0, 3)
    .map(({ code, message }) => `${code}: ${message}`)
    .join('; ');
}

function visualReviewError(message, { request, kind } = {}) {
  const error = new Error(message);
  error.code = 'E_VISUAL_REVIEW';
  if (request) {
    error.visualReviewRequest = structuredClone(request);
    error.evidenceKind = kind;
  }
  return error;
}

async function captureSnapshot(runRoot, path) {
  const absolutePath = confinedPath(runRoot, path);
  const bytes = await readFile(absolutePath);
  return { bytes, hash: hashBytes(bytes) };
}

async function assertSnapshotsUnchanged(runRoot, snapshots) {
  for (const [path, snapshot] of snapshots) {
    const current = await captureSnapshot(runRoot, path);
    if (current.hash !== snapshot.hash) {
      throw visualReviewError(
        `Visual review evidence changed while the critic inspected ${path}.`,
      );
    }
  }
}

function confinedPath(runRoot, path) {
  const root = resolve(runRoot);
  const absolutePath = resolve(root, path);
  const relativePath = relative(root, absolutePath);
  if (
    relativePath === '' ||
    relativePath === '..' ||
    relativePath.startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`) ||
    isAbsolute(relativePath)
  ) {
    throw visualReviewError(
      `Visual review evidence path is not confined: ${path}.`,
    );
  }
  return absolutePath;
}

function hashBytes(bytes) {
  return `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
}
