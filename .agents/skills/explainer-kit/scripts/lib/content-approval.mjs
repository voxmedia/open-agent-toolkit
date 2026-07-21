import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { writeJsonAtomic } from './fs-safe.mjs';

const APPROVAL_PATH = 'source/content-approval.json';
const MODES = new Set(['interactive', 'unattended']);
const DECISIONS = new Map([
  ['approve', 'approved'],
  ['approved', 'approved'],
  ['reject', 'rejected'],
  ['rejected', 'rejected'],
]);

export async function resolveContentApproval(
  run,
  mode,
  reviewedSource,
  authorResultPaths,
) {
  assertRun(run);
  if (!MODES.has(mode)) {
    throw new Error('Content approval mode must be interactive or unattended.');
  }

  const previous = await readPrevious(run);
  let record;
  if (mode === 'unattended') {
    assertAuthorResultPaths(authorResultPaths);
    const provenance =
      reviewedSource ?? approvedSourceProvenance(run.request.factBase);
    assertProvenance(provenance);
    record = {
      schemaVersion: 'explainer-kit.content-approval/v1',
      runId: run.runId,
      mode,
      status: 'approved',
      reviewedSource: structuredClone(provenance),
      authorResultPaths: [...authorResultPaths],
      attempts: previous?.attempts ?? [],
    };
  } else if (reviewedSource === undefined) {
    record = previous ?? {
      schemaVersion: 'explainer-kit.content-approval/v1',
      runId: run.runId,
      mode,
      status: 'pending',
      attempts: [],
    };
  } else {
    const decision = normalizeDecision(reviewedSource.decision);
    const attempt = interactiveAttempt(reviewedSource, decision);
    record = {
      schemaVersion: 'explainer-kit.content-approval/v1',
      runId: run.runId,
      mode,
      status: decision,
      attempts: [...(previous?.attempts ?? []), attempt],
      ...(decision === 'approved' && {
        reviewedSource: structuredClone(
          reviewedSource.source ?? {
            kind: 'human-review',
            locator: 'source/content',
          },
        ),
      }),
    };
    if (record.reviewedSource) {
      assertProvenance(record.reviewedSource);
    }
  }

  await writeJsonAtomic(run.runRoot, APPROVAL_PATH, record);
  return {
    status: record.status,
    canResume: record.status === 'approved',
    path: APPROVAL_PATH,
    record,
  };
}

async function readPrevious(run) {
  try {
    const previous = JSON.parse(
      await readFile(join(run.runRoot, APPROVAL_PATH), 'utf8'),
    );
    if (
      previous.schemaVersion !== 'explainer-kit.content-approval/v1' ||
      previous.runId !== run.runId
    ) {
      throw new Error('Content approval record does not belong to this run.');
    }
    return previous;
  } catch (error) {
    if (error?.code === 'ENOENT') return null;
    throw error;
  }
}

function interactiveAttempt(source, status) {
  if (!isObject(source)) {
    throw new TypeError('Interactive approval requires a review decision.');
  }
  if (
    typeof source.reviewedAt !== 'string' ||
    Number.isNaN(Date.parse(source.reviewedAt))
  ) {
    throw new Error('Interactive approval requires a valid reviewedAt value.');
  }
  if (
    source.reviewer !== undefined &&
    (typeof source.reviewer !== 'string' || source.reviewer.length === 0)
  ) {
    throw new Error(
      'Interactive approval reviewer must be a non-empty string.',
    );
  }
  const corrections = source.corrections ?? [];
  if (
    !Array.isArray(corrections) ||
    corrections.some(
      (correction) =>
        typeof correction !== 'string' || correction.trim().length === 0,
    )
  ) {
    throw new Error('Approval corrections must be non-empty strings.');
  }
  if (status === 'rejected' && corrections.length === 0) {
    throw new Error('Rejected content approval requires corrections.');
  }
  return {
    decision: status === 'approved' ? 'approve' : 'reject',
    reviewedAt: source.reviewedAt,
    ...(source.reviewer && { reviewer: source.reviewer }),
    corrections: [...corrections],
  };
}

function normalizeDecision(decision) {
  const normalized = DECISIONS.get(decision);
  if (!normalized) {
    throw new Error('Review decision must be approve or reject.');
  }
  return normalized;
}

function approvedSourceProvenance(factBase) {
  if (factBase?.mode === 'supplied') {
    return {
      kind: 'approved-fact-base',
      locator: factBase.path,
    };
  }
  return {
    kind: 'approved-source-set',
    locator: `federated:${factBase?.sources?.length ?? 0}`,
  };
}

function assertProvenance(value) {
  if (
    !isObject(value) ||
    typeof value.kind !== 'string' ||
    value.kind.length === 0 ||
    typeof value.locator !== 'string' ||
    value.locator.length === 0
  ) {
    throw new Error(
      'Reviewed source provenance requires non-empty kind and locator values.',
    );
  }
}

function assertAuthorResultPaths(value) {
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    new Set(value).size !== value.length ||
    value.some(
      (path) =>
        typeof path !== 'string' ||
        !/^source\/author\/[^/]+\.json$/.test(path) ||
        path.includes('..'),
    )
  ) {
    throw new Error(
      'Unattended content approval requires unique source/author result paths.',
    );
  }
}

function assertRun(run) {
  if (
    !isObject(run) ||
    typeof run.runId !== 'string' ||
    typeof run.runRoot !== 'string' ||
    !isObject(run.request)
  ) {
    throw new TypeError('Run must be returned by initializeRun().');
  }
}

function isObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
