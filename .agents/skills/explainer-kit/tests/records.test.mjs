import assert from 'node:assert/strict';
import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  symlink,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative, sep } from 'node:path';
import { afterEach, test } from 'node:test';

import { canonicalHash } from '../scripts/lib/contracts.mjs';
import {
  initializeRun,
  updateBuildRecord,
  writeManifestAtomic,
} from '../scripts/lib/records.mjs';

const HASH = `sha256:${'a'.repeat(64)}`;
const tempDirs = [];

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
  );
});

async function temporaryDirectory(prefix = 'explainer-records-') {
  const directory = await mkdtemp(join(tmpdir(), prefix));
  tempDirs.push(directory);
  return directory;
}

function request(outputRoot, overrides = {}) {
  return {
    schemaVersion: 'explainer-kit.run-request/v1',
    recipe: { id: 'project-explainer', version: '1' },
    slug: 'Demo Project',
    outputRoot,
    factBase: {
      mode: 'supplied',
      path: 'facts.json',
      freshnessPolicy: 'live-wins',
    },
    theme: {
      artDirection: 'Use private launch language',
    },
    mode: 'interactive',
    ...overrides,
  };
}

function manifest(run, buildRecord, overrides = {}) {
  return {
    schemaVersion: 'explainer-kit.manifest/v1',
    runId: run.runId,
    slug: run.slug,
    recipe: { id: 'project-explainer', version: '1' },
    createdAt: new Date().toISOString(),
    source: {
      factBasePath: 'source/fact-base.json',
      factBaseHash: HASH,
      inputHashes: { 'facts.json': HASH },
    },
    theme: {
      path: 'theme.resolved.json',
      hash: HASH,
      derived: true,
    },
    artifacts: [],
    immutableHashes: {
      'source/fact-base.json': HASH,
      'source/fact-base.md': HASH,
      'theme.resolved.json': HASH,
    },
    outcome: buildRecord.outcome,
    buildRecord: {
      path: 'build-record.json',
      hash: canonicalHash(buildRecord),
    },
    warnings: [],
    ...overrides,
  };
}

test('normalizes slugs and confines the run to the output root', async () => {
  const outputRoot = await temporaryDirectory();

  const run = await initializeRun(request(outputRoot));
  const relativeRun = relative(run.outputRoot, run.runRoot);

  assert.equal(run.slug, 'demo-project');
  assert.equal(relativeRun, 'demo-project');
  assert.ok(!relativeRun.startsWith(`..${sep}`));
  assert.equal(run.runRoot, join(run.outputRoot, 'demo-project'));
});

test('rejects traversal-like slugs before mutating the output root', async () => {
  const parent = await temporaryDirectory();
  const outputRoot = join(parent, 'not-created');

  await assert.rejects(
    initializeRun(request(outputRoot, { slug: '../Demo Project' })),
    /slug|traversal/i,
  );
  assert.deepEqual(await readdir(parent), []);
});

test('rejects an existing run-root symlink that escapes the output root', async () => {
  const outputRoot = await temporaryDirectory();
  const outside = await temporaryDirectory('explainer-records-outside-');
  await symlink(outside, join(outputRoot, 'demo-project'));

  await assert.rejects(initializeRun(request(outputRoot)), /symlink|escape/i);
  assert.deepEqual(await readdir(outside), []);
});

test('persists a normalized request without transient art direction', async () => {
  const outputRoot = await temporaryDirectory();

  const run = await initializeRun(request(outputRoot));
  const persisted = JSON.parse(await readFile(run.requestPath, 'utf8'));

  assert.equal(persisted.slug, 'demo-project');
  assert.equal(persisted.theme.renderStrategy, 'default-only');
  assert.equal('artDirection' in persisted.theme, false);
  assert.equal(
    (await readFile(run.requestPath, 'utf8')).includes(
      'Use private launch language',
    ),
    false,
  );
  assert.equal(run.request.theme.artDirection, 'Use private launch language');
});

test('initializes all stages as pending with an incomplete outcome', async () => {
  const outputRoot = await temporaryDirectory();

  const run = await initializeRun(request(outputRoot));
  const record = JSON.parse(await readFile(run.buildRecordPath, 'utf8'));

  assert.equal(record.outcome, 'incomplete');
  assert.deepEqual(
    record.stages.map(({ id, status }) => ({ id, status })),
    [
      'validate',
      'fact-base',
      'content',
      'theme',
      'render',
      'qa',
      'durability',
      'publish',
    ].map((id) => ({ id, status: 'pending' })),
  );
});

test('updates stages monotonically and rejects regressions or reordering', async () => {
  const outputRoot = await temporaryDirectory();
  const run = await initializeRun(request(outputRoot));

  await updateBuildRecord(run, { id: 'validate', status: 'running' });
  const passed = await updateBuildRecord(run, {
    id: 'validate',
    status: 'passed',
    outputPaths: ['run-request.json'],
  });

  assert.equal(passed.stages[0].status, 'passed');
  assert.deepEqual(passed.stages[0].outputPaths, ['run-request.json']);
  await assert.rejects(
    updateBuildRecord(run, { id: 'validate', status: 'running' }),
    /terminal|monotonic/i,
  );
  await assert.rejects(
    updateBuildRecord(run, { id: 'content', status: 'running' }),
    /prior|order/i,
  );
});

test('records an initial stage failure as a failed run', async () => {
  const outputRoot = await temporaryDirectory();
  const run = await initializeRun(request(outputRoot));

  const failed = await updateBuildRecord(run, {
    id: 'validate',
    status: 'failed',
    error: {
      code: 'E_INPUT_SCHEMA',
      message: 'The normalized request is invalid.',
      recovery: ['Correct the request and start a new run.'],
    },
  });

  assert.equal(failed.outcome, 'failed');
  assert.match(failed.completedAt, /^\d{4}-\d{2}-\d{2}T/);
  assert.equal(failed.stages[0].status, 'failed');
  assert.deepEqual(
    JSON.parse(await readFile(run.buildRecordPath, 'utf8')),
    failed,
  );
});

test('writes manifests atomically without leaving temporary siblings', async () => {
  const outputRoot = await temporaryDirectory();
  const run = await initializeRun(request(outputRoot));
  const record = JSON.parse(await readFile(run.buildRecordPath, 'utf8'));
  const value = manifest(run, record);

  await writeManifestAtomic(run, value);

  assert.deepEqual(JSON.parse(await readFile(run.manifestPath, 'utf8')), value);
  assert.deepEqual(
    (await readdir(run.runRoot)).filter((name) => name.includes('.tmp-')),
    [],
  );
});

test('cleans a temporary manifest after a failed atomic replacement', async () => {
  const outputRoot = await temporaryDirectory();
  const run = await initializeRun(request(outputRoot));
  const record = JSON.parse(await readFile(run.buildRecordPath, 'utf8'));
  await mkdir(run.manifestPath);

  await assert.rejects(writeManifestAtomic(run, manifest(run, record)));

  assert.deepEqual(
    (await readdir(run.runRoot)).filter((name) => name.includes('.tmp-')),
    [],
  );
  assert.deepEqual(await readdir(run.manifestPath), []);
});
