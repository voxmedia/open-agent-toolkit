import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { writeJsonAtomic } from './fs-safe.mjs';
import { loadRecipe, recipeFloor } from './recipes.mjs';
import { validateSafeRelativePath } from './safe-paths.mjs';

const APPROVAL_PATH = 'source/content-approval.json';
const APPROVAL_SCHEMA_V1 = 'explainer-kit.content-approval/v1';
const APPROVAL_SCHEMA_V2 = 'explainer-kit.content-approval/v2';
const MODES = new Set(['interactive', 'unattended']);
const STATUSES = new Set(['pending', 'approved', 'rejected']);
const ORIGINS = new Set(['floor', 'expansion']);
const AUTHORING_TYPES = new Set(['markdown', 'html']);
const SAFE_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
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
  artifacts,
) {
  assertRun(run);
  if (!MODES.has(mode)) {
    throw new Error('Content approval mode must be interactive or unattended.');
  }
  if (artifacts !== undefined) {
    assertArtifacts(artifacts);
  }

  const previous = await readContentApproval(run);
  let record;
  if (mode === 'unattended') {
    assertAuthorResultPaths(authorResultPaths);
    const provenance =
      reviewedSource ?? approvedSourceProvenance(run.request.factBase);
    assertProvenance(provenance);
    record = {
      schemaVersion: APPROVAL_SCHEMA_V2,
      runId: run.runId,
      mode,
      status: 'approved',
      marking: 'auto-drafted',
      reviewedSource: structuredClone(provenance),
      authorResultPaths: [...authorResultPaths],
      attempts: previous?.attempts ?? [],
      ...optionalArtifacts(artifacts ?? previous?.artifacts),
    };
  } else if (reviewedSource === undefined) {
    record = previous ?? {
      schemaVersion: APPROVAL_SCHEMA_V2,
      runId: run.runId,
      mode,
      status: 'pending',
      attempts: [],
    };
    if (artifacts !== undefined) {
      record = { ...record, ...optionalArtifacts(artifacts) };
    }
  } else {
    const decision = normalizeDecision(reviewedSource.decision);
    const attempt = interactiveAttempt(reviewedSource, decision);
    record = {
      schemaVersion: APPROVAL_SCHEMA_V2,
      runId: run.runId,
      mode,
      status: decision,
      attempts: [...(previous?.attempts ?? []), attempt],
      ...(decision === 'approved' && { marking: 'human-approved' }),
      ...(decision === 'approved' && {
        reviewedSource: structuredClone(
          reviewedSource.source ?? {
            kind: 'human-review',
            locator: 'source/content',
          },
        ),
      }),
      ...optionalArtifacts(artifacts ?? previous?.artifacts),
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

export async function readContentApproval(run) {
  assertRun(run);
  try {
    const previous = JSON.parse(
      await readFile(join(run.runRoot, APPROVAL_PATH), 'utf8'),
    );
    if (previous.runId !== run.runId) {
      throw new Error('Content approval record does not belong to this run.');
    }
    if (previous.schemaVersion === APPROVAL_SCHEMA_V1) {
      return normalizeLegacyRecord(run, previous);
    }
    if (previous.schemaVersion !== APPROVAL_SCHEMA_V2) {
      throw new Error('Content approval record has an unsupported version.');
    }
    assertApprovalRecord(previous);
    return structuredClone(previous);
  } catch (error) {
    if (error?.code === 'ENOENT') return null;
    throw error;
  }
}

function normalizeLegacyRecord(run, previous) {
  assertLegacyRecord(previous);
  const marking =
    previous.status === 'approved'
      ? previous.mode === 'unattended'
        ? 'auto-drafted'
        : 'human-approved'
      : undefined;
  const record = {
    schemaVersion: APPROVAL_SCHEMA_V2,
    runId: previous.runId,
    mode: previous.mode,
    status: previous.status,
    ...(marking && { marking }),
    ...(previous.reviewedSource && {
      reviewedSource: structuredClone(previous.reviewedSource),
    }),
    ...(previous.authorResultPaths && {
      authorResultPaths: [...previous.authorResultPaths],
    }),
    attempts: structuredClone(previous.attempts),
    artifacts: legacyFloorArtifacts(run, previous.authorResultPaths),
  };
  assertApprovalRecord(record);
  return record;
}

function legacyFloorArtifacts(run, authorResultPaths = []) {
  const recipe = loadRecipe(run.request.recipe.id, run.request.recipe.version);
  const resultPaths = new Set(authorResultPaths);
  return recipeFloor(recipe).map((artifact) => {
    const authorResultPath = `source/author/${artifact.id}.json`;
    return {
      artifactId: artifact.id,
      origin: 'floor',
      authoring: artifact.authoring ?? 'markdown',
      contentPath: `source/content/${artifact.id}.md`,
      ...(resultPaths.has(authorResultPath) && { authorResultPath }),
    };
  });
}

function optionalArtifacts(artifacts) {
  return artifacts === undefined
    ? {}
    : { artifacts: structuredClone(artifacts) };
}

function assertLegacyRecord(record) {
  if (
    !isObject(record) ||
    record.schemaVersion !== APPROVAL_SCHEMA_V1 ||
    typeof record.runId !== 'string' ||
    !MODES.has(record.mode) ||
    !STATUSES.has(record.status) ||
    !Array.isArray(record.attempts)
  ) {
    throw new Error('Legacy content approval record is malformed.');
  }
  if (record.reviewedSource !== undefined) {
    assertProvenance(record.reviewedSource);
  }
  if (record.authorResultPaths !== undefined) {
    assertAuthorResultPaths(record.authorResultPaths);
  }
}

function assertApprovalRecord(record) {
  if (
    !isObject(record) ||
    record.schemaVersion !== APPROVAL_SCHEMA_V2 ||
    typeof record.runId !== 'string' ||
    !MODES.has(record.mode) ||
    !STATUSES.has(record.status) ||
    !Array.isArray(record.attempts)
  ) {
    throw new Error('Content approval v2 record is malformed.');
  }
  const expectedMarking =
    record.status !== 'approved'
      ? undefined
      : record.mode === 'unattended'
        ? 'auto-drafted'
        : 'human-approved';
  if (record.marking !== expectedMarking) {
    throw new Error('Content approval marking does not match mode and status.');
  }
  if (record.reviewedSource !== undefined) {
    assertProvenance(record.reviewedSource);
  }
  if (record.authorResultPaths !== undefined) {
    assertAuthorResultPaths(record.authorResultPaths);
  }
  if (record.artifacts !== undefined) {
    assertArtifacts(record.artifacts);
  }
}

function assertArtifacts(value) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error('Content approval artifacts must be a non-empty array.');
  }
  const artifactIds = new Set();
  const contentPaths = new Set();
  const authorResultPaths = new Set();
  for (const artifact of value) {
    const keys = Object.keys(artifact ?? {}).sort();
    const expectedKeys = [
      'artifactId',
      'authoring',
      'contentPath',
      'origin',
      ...(artifact?.profileId === undefined ? [] : ['profileId']),
      ...(artifact?.authorResultPath === undefined ? [] : ['authorResultPath']),
    ].sort();
    if (
      !isObject(artifact) ||
      keys.length !== expectedKeys.length ||
      keys.some((key, index) => key !== expectedKeys[index]) ||
      !SAFE_ID.test(artifact.artifactId) ||
      !ORIGINS.has(artifact.origin) ||
      !AUTHORING_TYPES.has(artifact.authoring) ||
      !validateSafeRelativePath(artifact.contentPath).valid
    ) {
      throw new Error('Content approval artifact entry is malformed.');
    }
    if (
      (artifact.origin === 'expansion') !==
      (typeof artifact.profileId === 'string' &&
        SAFE_ID.test(artifact.profileId))
    ) {
      throw new Error(
        'Expansion approval artifacts require a safe profileId, and floor artifacts forbid one.',
      );
    }
    if (
      artifact.authorResultPath !== undefined &&
      (!validateSafeRelativePath(artifact.authorResultPath).valid ||
        !/^source\/author\/[^/]+\.json$/.test(artifact.authorResultPath))
    ) {
      throw new Error('Content approval authorResultPath is malformed.');
    }
    if (
      artifactIds.has(artifact.artifactId) ||
      contentPaths.has(artifact.contentPath) ||
      (artifact.authorResultPath !== undefined &&
        authorResultPaths.has(artifact.authorResultPath))
    ) {
      throw new Error(
        'Content approval artifact paths and ids must be unique.',
      );
    }
    artifactIds.add(artifact.artifactId);
    contentPaths.add(artifact.contentPath);
    if (artifact.authorResultPath !== undefined) {
      authorResultPaths.add(artifact.authorResultPath);
    }
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
