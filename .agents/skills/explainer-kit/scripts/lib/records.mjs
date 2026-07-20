import { randomUUID } from 'node:crypto';
import { readFile, readdir, rm } from 'node:fs/promises';
import { join } from 'node:path';

import { validateContract } from './contracts.mjs';
import { createConfinedRunRoot, writeJsonAtomic } from './fs-safe.mjs';

const STAGE_IDS = [
  'validate',
  'fact-base',
  'content',
  'theme',
  'render',
  'qa',
  'durability',
  'publish',
];
const SUCCESSFUL_TERMINAL_STATUSES = new Set(['passed', 'warned', 'skipped']);
const TERMINAL_STATUSES = new Set([...SUCCESSFUL_TERMINAL_STATUSES, 'failed']);
const ALLOWED_TRANSITIONS = {
  pending: new Set(['running', 'failed', 'skipped']),
  running: new Set(['running', 'passed', 'warned', 'failed']),
};

export async function initializeRun(request) {
  if (!isObject(request)) {
    throw new TypeError('Run request must be an object.');
  }

  const normalizedRequest = structuredClone(request);
  normalizedRequest.slug = normalizeRequestSlug(request.slug);
  normalizedRequest.theme = {
    ...(isObject(normalizedRequest.theme) ? normalizedRequest.theme : {}),
    renderStrategy: normalizedRequest.theme?.renderStrategy ?? 'default-only',
  };

  assertValidContract('run-request', normalizedRequest);

  const paths = await createConfinedRunRoot(
    normalizedRequest.outputRoot,
    normalizedRequest.slug,
  );
  normalizedRequest.outputRoot = paths.outputRoot;

  const runId = `run-${randomUUID()}`;
  const startedAt = new Date().toISOString();
  const buildRecord = {
    schemaVersion: 'explainer-kit.build-record/v1',
    runId,
    renderStrategy: normalizedRequest.theme.renderStrategy,
    startedAt,
    stages: STAGE_IDS.map((id) => ({
      id,
      status: 'pending',
      outputPaths: [],
      warnings: [],
    })),
    outcome: 'incomplete',
  };
  assertValidContract('build-record', buildRecord);

  const run = {
    runId,
    slug: paths.slug,
    outputRoot: paths.outputRoot,
    runRoot: paths.runRoot,
    requestPath: join(paths.runRoot, 'run-request.json'),
    buildRecordPath: join(paths.runRoot, 'build-record.json'),
    manifestPath: join(paths.runRoot, 'manifest.json'),
    request: normalizedRequest,
  };

  await clearRunRoot(run);
  await writeJsonAtomic(run.runRoot, 'build-record.json', buildRecord);
  await writeJsonAtomic(
    run.runRoot,
    'run-request.json',
    privacySafeRequest(normalizedRequest),
  );

  return run;
}

export async function updateBuildRecord(run, stage) {
  assertRun(run);
  if (!isObject(stage) || !STAGE_IDS.includes(stage.id)) {
    throw new Error('Stage update must identify a supported stage.');
  }

  const record = JSON.parse(await readFile(run.buildRecordPath, 'utf8'));
  if (record.runId !== run.runId) {
    throw new Error('Build record does not belong to this run.');
  }

  const stageIndex = STAGE_IDS.indexOf(stage.id);
  const current = record.stages[stageIndex];
  const allowed = ALLOWED_TRANSITIONS[current.status];
  if (!allowed?.has(stage.status)) {
    throw new Error(
      `Stage transitions must be monotonic; ${stage.id} is terminal or cannot move from ${current.status} to ${stage.status}.`,
    );
  }

  if (
    current.status === 'pending' &&
    stageIndex > 0 &&
    !record.stages
      .slice(0, stageIndex)
      .every(({ status }) => SUCCESSFUL_TERMINAL_STATUSES.has(status))
  ) {
    throw new Error(
      `Stage ${stage.id} cannot start before every prior stage completes in order.`,
    );
  }

  const timestamp = new Date().toISOString();
  const next = {
    ...current,
    status: stage.status,
    outputPaths: stage.outputPaths ?? current.outputPaths,
    warnings: stage.warnings ?? current.warnings,
  };
  if (stage.error !== undefined) {
    next.error = stage.error;
  }
  if (stage.status === 'running' && next.startedAt === undefined) {
    next.startedAt = timestamp;
  }
  if (TERMINAL_STATUSES.has(stage.status)) {
    next.startedAt ??= timestamp;
    next.completedAt = timestamp;
  }
  if (stage.status === 'failed' && !isObject(next.error)) {
    throw new Error('Failed stages require structured recovery details.');
  }
  if (stage.status !== 'failed' && 'error' in next) {
    throw new Error('Only failed stages may contain an error.');
  }

  record.stages[stageIndex] = next;
  if (stage.status === 'failed') {
    record.outcome = 'failed';
    record.completedAt = timestamp;
  } else if (
    record.stages.every(({ status }) => TERMINAL_STATUSES.has(status))
  ) {
    record.outcome = record.stages.some(({ status }) => status === 'failed')
      ? 'failed'
      : 'built-not-durable';
    record.completedAt = timestamp;
  } else {
    record.outcome = 'incomplete';
    delete record.completedAt;
  }

  assertValidContract('build-record', record);
  await writeJsonAtomic(run.runRoot, 'build-record.json', record);
  return record;
}

export async function writeManifestAtomic(run, manifest) {
  assertRun(run);
  if (!isObject(manifest)) {
    throw new TypeError('Manifest must be an object.');
  }
  if (manifest.runId !== run.runId || manifest.slug !== run.slug) {
    throw new Error('Manifest identity does not match the initialized run.');
  }

  const buildRecord = JSON.parse(await readFile(run.buildRecordPath, 'utf8'));
  assertValidContract('manifest', manifest, { buildRecord });
  await writeJsonAtomic(run.runRoot, 'manifest.json', manifest);
  return run.manifestPath;
}

function normalizeRequestSlug(slug) {
  if (
    typeof slug !== 'string' ||
    slug.includes('/') ||
    slug.includes('\\') ||
    slug.includes('\0') ||
    slug === '.' ||
    slug === '..'
  ) {
    throw new Error('Slug cannot contain path traversal or separators.');
  }

  const normalized = slug
    .normalize('NFKD')
    .replaceAll(/\p{Mark}/gu, '')
    .toLowerCase()
    .trim()
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replaceAll(/^-+|-+$/g, '');
  if (!normalized) {
    throw new Error('Slug must contain at least one letter or number.');
  }
  return normalized;
}

function privacySafeRequest(request) {
  const persisted = structuredClone(request);
  const retainRaw = persisted.privacy?.retainRawArtDirection === true;
  if (!retainRaw && isObject(persisted.theme)) {
    delete persisted.theme.artDirection;
  }
  return persisted;
}

function assertValidContract(kind, value, context) {
  const result = validateContract(kind, value, context);
  if (!result.valid) {
    const details = result.errors
      .map(({ path, code, message }) => `${path} [${code}]: ${message}`)
      .join('; ');
    throw new Error(`Invalid ${kind}: ${details}`);
  }
}

function assertRun(run) {
  if (
    !isObject(run) ||
    typeof run.runId !== 'string' ||
    typeof run.runRoot !== 'string'
  ) {
    throw new TypeError('Run must be returned by initializeRun().');
  }
}

async function clearRunRoot(run) {
  const entries = await readdir(run.runRoot, { withFileTypes: true });
  if (entries.length === 0) return;
  await assertOwnedRunRoot(run);
  const removable = [];
  for (const entry of entries) {
    const path = join(run.runRoot, entry.name);
    if (!(await containsSymlink(path, entry))) {
      removable.push(path);
    }
  }
  await Promise.all(
    removable.map((path) => rm(path, { recursive: true, force: true })),
  );
}

async function assertOwnedRunRoot(run) {
  try {
    const [persistedRequest, persistedRecord] = await Promise.all([
      readJson(join(run.runRoot, 'run-request.json')),
      readJson(join(run.runRoot, 'build-record.json')),
    ]);
    assertValidContract('run-request', persistedRequest);
    assertValidContract('build-record', persistedRecord);
    if (
      persistedRequest.slug !== run.slug ||
      persistedRequest.outputRoot !== run.outputRoot
    ) {
      throw new Error('Prior run identity does not match this slug.');
    }
  } catch {
    throw new Error(
      'Existing slug directory is not a prior Explainer Kit run; refusing to clear it.',
    );
  }
}

async function containsSymlink(path, entry) {
  if (entry.isSymbolicLink()) return true;
  if (!entry.isDirectory()) return false;
  for (const child of await readdir(path, { withFileTypes: true })) {
    if (await containsSymlink(join(path, child.name), child)) {
      return true;
    }
  }
  return false;
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

function isObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
