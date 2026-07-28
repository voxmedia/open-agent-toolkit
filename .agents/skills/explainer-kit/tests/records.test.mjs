import assert from 'node:assert/strict';
import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative, sep } from 'node:path';
import { afterEach, test } from 'node:test';

import { canonicalHash } from '../scripts/lib/contracts.mjs';
import {
  initializeRun,
  reopenBuildStages,
  updateBuildRecord,
  writeManifestAtomic,
  writeSetPlanRecords,
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
      'run-request.json': HASH,
      'source/content-approval.json': HASH,
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

test('removes a stale manifest before reinitializing a reused slug', async () => {
  const outputRoot = await temporaryDirectory();
  const firstRun = await initializeRun(request(outputRoot));
  const firstRecord = JSON.parse(
    await readFile(firstRun.buildRecordPath, 'utf8'),
  );
  await writeManifestAtomic(firstRun, manifest(firstRun, firstRecord));

  const secondRun = await initializeRun(request(outputRoot));

  assert.notEqual(secondRun.runId, firstRun.runId);
  await assert.rejects(readFile(secondRun.manifestPath, 'utf8'), {
    code: 'ENOENT',
  });
});

test('refuses to clear an existing slug directory it does not own', async () => {
  const outputRoot = await temporaryDirectory();
  const runRoot = join(outputRoot, 'demo-project');
  const sentinel = join(runRoot, 'user-notes.txt');
  await mkdir(runRoot);
  await writeFile(sentinel, 'keep me');

  await assert.rejects(
    initializeRun(request(outputRoot)),
    /prior Explainer Kit run/i,
  );
  assert.equal(await readFile(sentinel, 'utf8'), 'keep me');
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

test('reopens a completed stage range before downstream work with an audit warning', async () => {
  const outputRoot = await temporaryDirectory();
  const run = await initializeRun(request(outputRoot));
  for (const id of [
    'validate',
    'fact-base',
    'content',
    'theme',
    'render',
    'qa',
  ]) {
    await updateBuildRecord(run, { id, status: 'running' });
    await updateBuildRecord(run, {
      id,
      status: 'passed',
      outputPaths: [`${id}.out`],
    });
  }

  const reopened = await reopenBuildStages(run, {
    ids: ['render', 'qa'],
    reason: 'content-rejected',
  });

  assert.equal(reopened.outcome, 'incomplete');
  for (const id of ['render', 'qa']) {
    const stage = reopened.stages.find((candidate) => candidate.id === id);
    assert.equal(stage.status, 'pending');
    assert.deepEqual(stage.outputPaths, []);
    assert.match(stage.warnings.at(-1), /^stage-reopened:content-rejected:/);
  }
});

test('refuses to reopen stages after downstream work has started', async () => {
  const outputRoot = await temporaryDirectory();
  const run = await initializeRun(request(outputRoot));
  for (const id of [
    'validate',
    'fact-base',
    'content',
    'theme',
    'render',
    'qa',
    'durability',
  ]) {
    await updateBuildRecord(run, { id, status: 'running' });
    await updateBuildRecord(run, { id, status: 'passed' });
  }

  await assert.rejects(
    reopenBuildStages(run, {
      ids: ['render', 'qa'],
      reason: 'content-rejected',
    }),
    /before downstream work/i,
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

test('retains immutable versioned set-plan request, result, ledger, portfolio, and drafts', async () => {
  const outputRoot = await temporaryDirectory();
  const run = await initializeRun(request(outputRoot));
  const planRequest = {
    schemaVersion: 'explainer-kit.set-plan-request/v1',
    recipe: { id: 'project-recap', version: '1' },
    factBaseHash: HASH,
    sourceIds: ['project'],
  };
  const plan = {
    schemaVersion: 'explainer-kit.set-plan/v1',
    planId: 'project-recap-set',
    recipe: { id: 'project-recap', version: '1' },
    sourceIds: ['project'],
    ledger: { terminology: [], statuses: [], numbers: [] },
    portfolio: [
      {
        artifactId: 'project-recap',
        artifactType: 'hub',
        profileId: 'recipe-floor',
        required: true,
        sourceIds: ['project'],
        draft: 'Lead with the validated outcome.',
        visualIntent: 'Orient the reader in the first viewport.',
      },
    ],
  };

  const paths = await writeSetPlanRecords(run, { request: planRequest, plan });

  assert.deepEqual(paths, [
    'source/set-plan/request.json',
    'source/set-plan/result.json',
    'source/set-plan/ledger.json',
    'source/set-plan/portfolio.json',
    'source/set-plan/drafts.json',
  ]);
  assert.deepEqual(
    JSON.parse(
      await readFile(join(run.runRoot, 'source/set-plan/drafts.json'), 'utf8'),
    ),
    {
      schemaVersion: 'explainer-kit.set-plan-drafts/v1',
      drafts: [
        {
          artifactId: 'project-recap',
          draft: 'Lead with the validated outcome.',
          visualIntent: 'Orient the reader in the first viewport.',
        },
      ],
    },
  );

  await assert.rejects(
    writeSetPlanRecords(run, {
      request: planRequest,
      plan: { ...plan, planId: 'changed-plan' },
    }),
    /immutable|already exist/i,
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
