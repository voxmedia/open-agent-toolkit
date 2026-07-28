import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { isAbsolute, relative, resolve } from 'node:path';

import {
  canonicalHash,
  validateContract,
  visualReviewRequestId,
} from './contracts.mjs';

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
  const result = await visualCritic(structuredClone(request), evidenceInput);
  await assertSnapshotsUnchanged(runRoot, snapshots);
  const validation = validateContract('visual-review-result', result, {
    visualReviewRequest: request,
  });
  if (!validation.valid) {
    throw visualReviewError(
      `Visual critic returned an invalid result: ${formatErrors(validation.errors)}`,
    );
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
  const payload = {
    schemaVersion: 'explainer-kit.visual-review-request/v1',
    plan: structuredClone(plan),
    renderedArtifacts: rendered.map(({ artifactId, renderedPath }) => ({
      artifactId,
      renderedPath,
      renderedHash: snapshots.get(renderedPath).hash,
      evidence: evidence
        .filter((item) => item.artifactId === artifactId)
        .map(({ viewport, screenshotPath, metricsPath }) => ({
          viewport,
          screenshotPath,
          screenshotHash: snapshots.get(screenshotPath).hash,
          metricsPath,
          metricsHash: snapshots.get(metricsPath).hash,
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
    const viewports = new Set(artifact.evidence.map(({ viewport }) => viewport));
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

function observedClaims(entries, keyOf, valueOf, text) {
  return Object.fromEntries(
    (entries ?? [])
      .filter((entry) =>
        text.includes(String(valueOf(entry)).toLocaleLowerCase()),
      )
      .map((entry) => [keyOf(entry), valueOf(entry)]),
  );
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

function visualReviewError(message) {
  const error = new Error(message);
  error.code = 'E_VISUAL_REVIEW';
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
    throw visualReviewError(`Visual review evidence path is not confined: ${path}.`);
  }
  return absolutePath;
}

function hashBytes(bytes) {
  return `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
}
