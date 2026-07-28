import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';
import { access, readFile, readdir, rm } from 'node:fs/promises';
import { join } from 'node:path';

import { canonicalHash, validateContract } from './contracts.mjs';
import {
  createConfinedRunRoot,
  writeFileAtomic,
  writeJsonAtomic,
} from './fs-safe.mjs';
import { resolveRootConfinedPath } from './safe-paths.mjs';

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
export const SET_PLAN_RECORD_PATHS = Object.freeze([
  'source/set-plan/request.json',
  'source/set-plan/result.json',
  'source/set-plan/ledger.json',
  'source/set-plan/portfolio.json',
  'source/set-plan/drafts.json',
]);
export const VISUAL_REVISION_PATH = 'qa/visual-review/revision.json';
const RECAP_SET_PLAN_PATHS = Object.freeze([...SET_PLAN_RECORD_PATHS]);
const REVIEW_VIEWPORTS = Object.freeze(['mobile', 'tablet', 'desktop']);
const SET_PLAN_RESUME_TOKEN_PREFIX = 'ekrt1:';
const SET_PLAN_RESUME_TOKEN_PATTERN = /^ekrt1:[a-f0-9]{64}$/;

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
      : record.stages.some(({ warnings }) =>
            warnings.some((warning) =>
              warning.startsWith('visual-review-required:'),
            ),
          )
        ? 'built-needs-review'
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

export async function writeVisualReviewAttempt(run, { attempt, review } = {}) {
  assertRun(run);
  if (![1, 2].includes(attempt) || !isObject(review)) {
    throw new TypeError('Visual review records require attempt 1 or 2.');
  }
  const requestValidation = validateContract(
    'visual-review-request',
    review.request,
  );
  const resultValidation = validateContract(
    'visual-review-result',
    review.result,
    { visualReviewRequest: review.request },
  );
  if (!requestValidation.valid || !resultValidation.valid) {
    throw new Error(
      'Visual review records must contain valid bound contracts.',
    );
  }

  const directory = `qa/visual-review/attempt-${attempt}`;
  const retainedRequest = structuredClone(review.request);
  const paths = [];
  for (const artifact of retainedRequest.renderedArtifacts) {
    for (const evidence of artifact.evidence) {
      const screenshotPath = `${directory}/evidence/${artifact.artifactId}/${evidence.viewport}.png`;
      const metricsPath = `${directory}/evidence/${artifact.artifactId}/${evidence.viewport}.json`;
      await copyConfinedEvidence(
        run.runRoot,
        evidence.screenshotPath,
        screenshotPath,
        evidence.screenshotHash,
      );
      await copyConfinedEvidence(
        run.runRoot,
        evidence.metricsPath,
        metricsPath,
        evidence.metricsHash,
      );
      paths.push(screenshotPath, metricsPath);
    }
  }
  const requestPath = `${directory}/request.json`;
  const resultPath = `${directory}/result.json`;
  await writeJsonAtomic(run.runRoot, requestPath, retainedRequest);
  await writeJsonAtomic(run.runRoot, resultPath, review.result);
  return [...paths, requestPath, resultPath];
}

export async function writeVisualReviewFailure(
  run,
  { attempt, error, evidence = [] } = {},
) {
  assertRun(run);
  if (
    ![1, 2].includes(attempt) ||
    !(error instanceof Error) ||
    !Array.isArray(evidence)
  ) {
    throw new TypeError(
      'Visual review failures require an attempt, Error, and evidence array.',
    );
  }
  const path = `qa/review-gate/attempt-${attempt}-error.json`;
  await writeJsonAtomic(run.runRoot, path, {
    schemaVersion: 'explainer-kit.visual-review-error/v1',
    attempt,
    code: error.code ?? 'E_VISUAL_REVIEW',
    message: error.message,
    evidencePaths: evidence.flatMap(({ screenshotPath, metricsPath }) => [
      screenshotPath,
      metricsPath,
    ]),
  });
  return [path];
}

export async function writeVisualRevision(run, { artifactIds, changes } = {}) {
  assertRun(run);
  if (
    !Array.isArray(artifactIds) ||
    artifactIds.length === 0 ||
    new Set(artifactIds).size !== artifactIds.length ||
    !Array.isArray(changes) ||
    changes.length !== artifactIds.length ||
    changes.some(
      (change) =>
        !isObject(change) ||
        !artifactIds.includes(change.artifactId) ||
        typeof change.contentPath !== 'string' ||
        typeof change.authorResultPath !== 'string' ||
        !/^sha256:[a-f0-9]{64}$/.test(change.previousHash) ||
        !/^sha256:[a-f0-9]{64}$/.test(change.revisedHash),
    )
  ) {
    throw new TypeError(
      'One visual revision requires unique corrected artifacts and hash-bound changes.',
    );
  }
  try {
    await access(join(run.runRoot, VISUAL_REVISION_PATH));
    throw new Error('Only one visual revision may be retained per run.');
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
  await writeJsonAtomic(run.runRoot, VISUAL_REVISION_PATH, {
    schemaVersion: 'explainer-kit.visual-revision/v1',
    attempt: 1,
    artifactIds: [...artifactIds],
    changes: structuredClone(changes),
  });
  return [VISUAL_REVISION_PATH];
}

async function copyConfinedEvidence(
  runRoot,
  sourcePath,
  targetPath,
  expectedHash,
) {
  const confined = await resolveRootConfinedPath(runRoot, sourcePath);
  if (!confined.valid) {
    throw new Error(
      `Visual review evidence is not run-root confined: ${sourcePath}`,
    );
  }
  const bytes = await readFile(confined.absolutePath);
  const hash = `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
  if (hash !== expectedHash) {
    throw new Error(
      `Visual review evidence hash changed before retention: ${sourcePath}`,
    );
  }
  await writeFileAtomic(runRoot, targetPath, bytes);
}

export async function reopenBuildStages(run, { ids, reason }) {
  assertRun(run);
  if (
    !Array.isArray(ids) ||
    ids.length === 0 ||
    ids.some((id) => !STAGE_IDS.includes(id)) ||
    typeof reason !== 'string' ||
    reason.length === 0
  ) {
    throw new Error('Stage reopen requires supported stage ids and a reason.');
  }

  const indexes = ids.map((id) => STAGE_IDS.indexOf(id));
  const firstIndex = Math.min(...indexes);
  const lastIndex = Math.max(...indexes);
  if (
    new Set(indexes).size !== indexes.length ||
    indexes.some((index, offset) => index !== firstIndex + offset) ||
    ids.some((id, index) => STAGE_IDS[firstIndex + index] !== id)
  ) {
    throw new Error('Reopened stages must be unique and contiguous in order.');
  }

  const record = JSON.parse(await readFile(run.buildRecordPath, 'utf8'));
  if (record.runId !== run.runId) {
    throw new Error('Build record does not belong to this run.');
  }
  if (
    !record.stages
      .slice(0, firstIndex)
      .every(({ status }) => SUCCESSFUL_TERMINAL_STATUSES.has(status)) ||
    !record.stages
      .slice(firstIndex, lastIndex + 1)
      .every(({ status }) => SUCCESSFUL_TERMINAL_STATUSES.has(status)) ||
    !record.stages
      .slice(lastIndex + 1)
      .every(({ status }) => status === 'pending')
  ) {
    throw new Error(
      'Stages may reopen only after successful prerequisites and before downstream work.',
    );
  }

  const timestamp = new Date().toISOString();
  for (let index = firstIndex; index <= lastIndex; index += 1) {
    const previous = record.stages[index];
    record.stages[index] = {
      id: previous.id,
      status: 'pending',
      outputPaths: [],
      warnings: [...previous.warnings, `stage-reopened:${reason}:${timestamp}`],
    };
  }
  record.outcome = 'incomplete';
  delete record.completedAt;

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
  assertImmutablePackageCoverage(manifest);
  assertValidContract('manifest', manifest, { buildRecord });
  await writeJsonAtomic(run.runRoot, 'manifest.json', manifest);
  return run.manifestPath;
}

export function requiredImmutablePackagePaths(manifest) {
  if (!isObject(manifest)) {
    throw new TypeError(
      'Manifest package coverage requires a manifest object.',
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

  const successfulRecap =
    manifest.recipe?.id === 'project-recap' &&
    ['built-not-durable', 'built-durable'].includes(manifest.outcome);
  if (!successfulRecap) return [...required];

  for (const path of RECAP_SET_PLAN_PATHS) required.add(path);
  addVisualReviewAttemptPaths(required, manifest, 1);
  const recorded = new Set(Object.keys(manifest.immutableHashes ?? {}));
  if (
    recorded.has(VISUAL_REVISION_PATH) ||
    [...recorded].some((path) => path.startsWith('qa/visual-review/attempt-2/'))
  ) {
    required.add(VISUAL_REVISION_PATH);
    addVisualReviewAttemptPaths(required, manifest, 2);
  }
  return [...required];
}

function assertImmutablePackageCoverage(manifest) {
  const recorded = manifest.immutableHashes;
  if (!isObject(recorded)) {
    throw new Error('Manifest does not identify immutable package hashes.');
  }
  const missing = requiredImmutablePackagePaths(manifest).filter(
    (path) => typeof recorded[path] !== 'string',
  );
  if (missing.length > 0) {
    throw new Error(
      `Manifest immutable hashes do not cover the canonical package: ${missing.join(', ')}.`,
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

export async function writeSetPlanRecords(run, { request, plan }) {
  assertRun(run);
  if (
    !isObject(request) ||
    request.schemaVersion !== 'explainer-kit.set-plan-request/v1'
  ) {
    throw new TypeError('Set-plan request must use the v1 record contract.');
  }
  assertValidContract('set-plan', plan);

  const retainedRequest = {
    ...structuredClone(request),
    planHash: canonicalHash(plan),
  };
  const records = [
    ['source/set-plan/request.json', retainedRequest],
    ['source/set-plan/result.json', plan],
    [
      'source/set-plan/ledger.json',
      {
        schemaVersion: 'explainer-kit.set-plan-ledger/v1',
        planId: plan.planId,
        ...plan.ledger,
      },
    ],
    [
      'source/set-plan/portfolio.json',
      {
        schemaVersion: 'explainer-kit.set-plan-portfolio/v1',
        planId: plan.planId,
        artifacts: plan.portfolio,
      },
    ],
    [
      'source/set-plan/drafts.json',
      {
        schemaVersion: 'explainer-kit.set-plan-drafts/v1',
        drafts: plan.portfolio.map(
          ({ artifactId, draft, visualIntent, justification }) => ({
            artifactId,
            draft,
            visualIntent,
            ...(justification && { justification }),
          }),
        ),
      },
    ],
  ];
  for (const [relativePath] of records) {
    try {
      await access(join(run.runRoot, relativePath));
      throw new Error(
        `Immutable set-plan record ${relativePath} already exists.`,
      );
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
    }
  }
  for (const [relativePath, value] of records) {
    await writeJsonAtomic(run.runRoot, relativePath, value);
  }
  return records.map(([relativePath]) => relativePath);
}

export async function createSetPlanResumeToken(run) {
  assertRun(run);
  const tokenHash = createHash('sha256');
  tokenHash.update('explainer-kit.set-plan-resume/v1\0');
  tokenHash.update(run.runId);
  tokenHash.update('\0');
  try {
    for (const relativePath of SET_PLAN_RECORD_PATHS) {
      const bytes = await readFile(join(run.runRoot, relativePath));
      const byteHash = createHash('sha256').update(bytes).digest();
      tokenHash.update(relativePath);
      tokenHash.update('\0');
      tokenHash.update(byteHash);
    }
  } catch (error) {
    throw resumeRecordError(
      `Unable to hash the complete retained set plan: ${error.message}`,
    );
  }
  return `${SET_PLAN_RESUME_TOKEN_PREFIX}${tokenHash.digest('hex')}`;
}

export async function verifySetPlanResumeToken(run, resumeToken) {
  assertRun(run);
  if (
    typeof resumeToken !== 'string' ||
    !SET_PLAN_RESUME_TOKEN_PATTERN.test(resumeToken)
  ) {
    throw resumeRecordError(
      'Interactive approval resume requires a valid external resume token.',
    );
  }
  const expected = Buffer.from(await createSetPlanResumeToken(run), 'ascii');
  const supplied = Buffer.from(resumeToken, 'ascii');
  if (
    supplied.byteLength !== expected.byteLength ||
    !timingSafeEqual(supplied, expected)
  ) {
    throw resumeRecordError(
      'Interactive approval resume token does not match the retained set plan.',
    );
  }
}

export async function readSetPlanRecords(run, { factBase, recipe }) {
  assertRun(run);
  if (
    !isObject(factBase) ||
    !Array.isArray(factBase.sources) ||
    !isObject(recipe) ||
    typeof recipe.id !== 'string' ||
    typeof recipe.version !== 'string'
  ) {
    throw resumeRecordError(
      'Retained set-plan validation requires the fact base and active recipe.',
    );
  }

  let values;
  try {
    values = await Promise.all(
      SET_PLAN_RECORD_PATHS.map((relativePath) =>
        readJson(join(run.runRoot, relativePath)),
      ),
    );
  } catch (error) {
    throw resumeRecordError(
      `Unable to read the complete retained set plan: ${error.message}`,
    );
  }
  const [request, plan, ledger, portfolio, drafts] = values;
  const requestKeys = [
    'discovery',
    'factBaseHash',
    'planHash',
    'recipe',
    'schemaVersion',
    'sourceIds',
  ];
  if (
    !isObject(request) ||
    canonicalHash(Object.keys(request).sort()) !== canonicalHash(requestKeys) ||
    request.schemaVersion !== 'explainer-kit.set-plan-request/v1' ||
    canonicalHash(request.recipe) !==
      canonicalHash({ id: recipe.id, version: recipe.version }) ||
    request.factBaseHash !== canonicalHash(factBase) ||
    request.planHash !== canonicalHash(plan) ||
    !isObject(request.discovery) ||
    !Number.isInteger(request.discovery.rounds) ||
    request.discovery.rounds < 0 ||
    !Array.isArray(request.discovery.findings) ||
    !['not-requested', 'two-empty-rounds', 'hard-maximum'].includes(
      request.discovery.reason,
    )
  ) {
    throw resumeRecordError(
      'Retained set-plan request does not match the fact base and active recipe.',
    );
  }

  const planValidation = validateContract('set-plan', plan);
  if (!planValidation.valid) {
    throw resumeRecordError('Retained set-plan result is invalid.');
  }
  const expectedSourceIds = factBase.sources
    .map(({ id }) => id)
    .filter((id) => !id.startsWith('critic:'));
  if (
    canonicalHash(plan.recipe) !==
      canonicalHash({ id: recipe.id, version: recipe.version }) ||
    canonicalHash(request.sourceIds) !== canonicalHash(expectedSourceIds) ||
    canonicalHash(plan.sourceIds) !== canonicalHash(request.sourceIds)
  ) {
    throw resumeRecordError(
      'Retained set-plan request and result identities have drifted.',
    );
  }

  const expectedLedger = {
    schemaVersion: 'explainer-kit.set-plan-ledger/v1',
    planId: plan.planId,
    ...plan.ledger,
  };
  const expectedPortfolio = {
    schemaVersion: 'explainer-kit.set-plan-portfolio/v1',
    planId: plan.planId,
    artifacts: plan.portfolio,
  };
  const expectedDrafts = {
    schemaVersion: 'explainer-kit.set-plan-drafts/v1',
    drafts: plan.portfolio.map(
      ({ artifactId, draft, visualIntent, justification }) => ({
        artifactId,
        draft,
        visualIntent,
        ...(justification && { justification }),
      }),
    ),
  };
  for (const [label, actual, expected] of [
    ['ledger', ledger, expectedLedger],
    ['portfolio', portfolio, expectedPortfolio],
    ['drafts', drafts, expectedDrafts],
  ]) {
    if (canonicalHash(actual) !== canonicalHash(expected)) {
      throw resumeRecordError(
        `Retained set-plan ${label} projection does not match the canonical result.`,
      );
    }
  }

  return {
    request,
    plan,
    paths: [...SET_PLAN_RECORD_PATHS],
  };
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

function resumeRecordError(message) {
  const error = new Error(message);
  error.code = 'E_APPROVAL_RESUME';
  return error;
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
