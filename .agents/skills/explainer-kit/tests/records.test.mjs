import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
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
import { loadRecipe } from '../scripts/lib/recipes.mjs';
import {
  canonicalPersistedRunRequest,
  createSetPlanResumeToken,
  initializeRun,
  readSetPlanRecords,
  requiredImmutablePackagePaths,
  reopenBuildStages,
  SET_PLAN_RECORD_PATHS,
  updateBuildRecord,
  verifySetPlanResumeToken,
  writeManifestAtomic,
  writeSetPlanRecords,
  writeVisualReviewFailure,
  writeVisualRevision,
} from '../scripts/lib/records.mjs';
import { planExplainerSet } from '../scripts/lib/set-plan.mjs';

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

async function legacySetPlanResumeToken(run) {
  const tokenHash = createHash('sha256');
  tokenHash.update('explainer-kit.set-plan-resume/v1\0');
  tokenHash.update(run.runId);
  tokenHash.update('\0');
  for (const relativePath of SET_PLAN_RECORD_PATHS) {
    const bytes = await readFile(join(run.runRoot, relativePath));
    const byteHash = createHash('sha256').update(bytes).digest();
    tokenHash.update(relativePath);
    tokenHash.update('\0');
    tokenHash.update(byteHash);
  }
  return `ekrt1:${tokenHash.digest('hex')}`;
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

  assert.deepEqual(
    persisted,
    canonicalPersistedRunRequest(run.request, {
      outputRoot: run.outputRoot,
    }),
  );
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

test('retains one bounded visual revision record for corrected artifacts', async () => {
  const outputRoot = await temporaryDirectory();
  const run = await initializeRun(request(outputRoot));
  const paths = await writeVisualRevision(run, {
    artifactIds: ['project-recap'],
    changes: [
      {
        artifactId: 'project-recap',
        contentPath: 'source/content/project-recap.html',
        authorResultPath: 'source/author/project-recap.json',
        previousHash: HASH,
        revisedHash: `sha256:${'b'.repeat(64)}`,
      },
    ],
  });

  assert.deepEqual(paths, ['qa/visual-review/revision.json']);
  const retained = JSON.parse(
    await readFile(join(run.runRoot, paths[0]), 'utf8'),
  );
  assert.equal(retained.schemaVersion, 'explainer-kit.visual-revision/v1');
  assert.equal(retained.attempt, 1);
  assert.deepEqual(retained.artifactIds, ['project-recap']);
  await assert.rejects(
    writeVisualRevision(run, {
      artifactIds: ['project-recap'],
      changes: retained.changes,
    }),
    /already exists|one visual revision/i,
  );
});

test('retains structured partial evidence for a failed visual review attempt', async () => {
  const outputRoot = await temporaryDirectory();
  const run = await initializeRun(request(outputRoot));
  const error = Object.assign(new Error('critic provider unavailable'), {
    code: 'E_VISUAL_REVIEW',
  });

  const paths = await writeVisualReviewFailure(run, {
    attempt: 1,
    error,
    evidence: [
      {
        screenshotPath: 'qa/browser/project-recap/320.png',
        metricsPath: 'qa/browser/project-recap/320.json',
      },
    ],
  });

  assert.deepEqual(paths, ['qa/review-gate/attempt-1-error.json']);
  assert.deepEqual(
    JSON.parse(await readFile(join(run.runRoot, paths[0]), 'utf8')),
    {
      schemaVersion: 'explainer-kit.visual-review-error/v1',
      attempt: 1,
      code: 'E_VISUAL_REVIEW',
      message: 'critic provider unavailable',
      evidencePaths: [
        'qa/browser/project-recap/320.png',
        'qa/browser/project-recap/320.json',
      ],
    },
  );
});

test('defines mode-aware successful recap coverage while allowing immutable extras', () => {
  const recap = {
    recipe: { id: 'project-recap' },
    outcome: 'built-not-durable',
    source: {
      factBasePath: 'source/fact-base.json',
      authorResultPaths: ['source/author/project-recap.json'],
    },
    theme: { path: 'theme.resolved.json' },
    artifacts: [
      {
        id: 'project-recap',
        status: 'built',
        contentPath: 'source/content/project-recap.html',
        renderedPath: 'site/project-recap.html',
      },
    ],
    immutableHashes: {
      'qa/custom-observation.json': HASH,
    },
  };

  const required = requiredImmutablePackagePaths(recap, {
    runMode: 'unattended',
  });
  for (const path of [
    'source/set-plan/request.json',
    'source/set-plan/result.json',
    'source/set-plan/ledger.json',
    'source/set-plan/portfolio.json',
    'source/set-plan/drafts.json',
    'qa/browser/project-recap/mobile.png',
    'qa/browser/project-recap/tablet.json',
    'qa/browser/project-recap/desktop.png',
    'qa/visual-review/attempt-1/request.json',
    'qa/visual-review/attempt-1/result.json',
    'qa/visual-review/attempt-1/evidence/project-recap/mobile.png',
    'qa/visual-review/attempt-1/evidence/project-recap/desktop.json',
  ]) {
    assert.ok(required.includes(path), path);
  }
  assert.equal(required.includes('qa/custom-observation.json'), false);

  const interactive = requiredImmutablePackagePaths(recap, {
    runMode: 'interactive',
  });
  assert.ok(interactive.includes('source/set-plan/request.json'));
  assert.equal(
    interactive.some(
      (path) =>
        path.startsWith('qa/browser/') || path.startsWith('qa/visual-review/'),
    ),
    false,
  );

  recap.immutableHashes['qa/browser/project-recap/mobile.png'] = HASH;
  const partialInteractive = requiredImmutablePackagePaths(recap, {
    runMode: 'interactive',
  });
  assert.ok(
    partialInteractive.includes('qa/visual-review/attempt-1/result.json'),
  );
  assert.ok(
    partialInteractive.includes('qa/browser/project-recap/desktop.json'),
  );

  recap.immutableHashes['qa/visual-review/attempt-2/result.json'] = HASH;
  const correctedInteractive = requiredImmutablePackagePaths(recap, {
    runMode: 'interactive',
  });
  assert.ok(correctedInteractive.includes('qa/visual-review/revision.json'));
  assert.ok(
    correctedInteractive.includes(
      'qa/visual-review/attempt-2/evidence/project-recap/tablet.png',
    ),
  );
});

test('allows partial visual-review evidence in built-needs-review handoffs', () => {
  const required = requiredImmutablePackagePaths(
    {
      recipe: { id: 'project-recap' },
      outcome: 'built-needs-review',
      source: { factBasePath: 'source/fact-base.json' },
      theme: { path: 'theme.resolved.json' },
      artifacts: [
        {
          id: 'project-recap',
          status: 'built',
          contentPath: 'source/content/project-recap.html',
          renderedPath: 'site/project-recap.html',
        },
      ],
      immutableHashes: {
        'qa/browser/project-recap/mobile.png': HASH,
        'qa/visual-review/revision.json': HASH,
        'qa/visual-review/attempt-2/error.json': HASH,
      },
    },
    { runMode: 'unattended' },
  );

  assert.equal(
    required.some(
      (path) =>
        path.startsWith('qa/browser/') || path.startsWith('qa/visual-review/'),
    ),
    false,
  );
});

test('requires complete review attempts for every non-handoff package retaining evidence', () => {
  const recap = (outcome, immutableHashes = {}) => ({
    recipe: { id: 'project-recap' },
    outcome,
    source: { factBasePath: 'source/fact-base.json' },
    theme: { path: 'theme.resolved.json' },
    artifacts: [
      {
        id: 'project-recap',
        status: 'built',
        contentPath: 'source/content/project-recap.html',
        renderedPath: 'site/project-recap.html',
      },
    ],
    immutableHashes,
  });
  const reviewPaths = (manifestValue, runMode = 'unattended') =>
    requiredImmutablePackagePaths(manifestValue, { runMode }).filter(
      (path) =>
        path.startsWith('qa/browser/') || path.startsWith('qa/visual-review/'),
    );

  for (const outcome of ['failed', 'incomplete']) {
    assert.deepEqual(reviewPaths(recap(outcome)), []);
    const required = reviewPaths(
      recap(outcome, {
        'qa/browser/project-recap/mobile.png': HASH,
      }),
    );
    assert.ok(required.includes('qa/browser/project-recap/desktop.json'));
    assert.ok(required.includes('qa/visual-review/attempt-1/request.json'));
    assert.ok(required.includes('qa/visual-review/attempt-1/result.json'));
  }

  const secondAttempt = requiredImmutablePackagePaths(
    recap('failed', {
      'qa/visual-review/attempt-2/error.json': HASH,
    }),
    { runMode: 'unattended' },
  );
  assert.ok(secondAttempt.includes('qa/visual-review/attempt-1/request.json'));
  assert.ok(secondAttempt.includes('qa/visual-review/revision.json'));
  assert.ok(secondAttempt.includes('qa/visual-review/attempt-2/result.json'));
});

test('computes built-needs-review from a terminal recap review gate', async () => {
  const outputRoot = await temporaryDirectory();
  const run = await initializeRun(
    request(outputRoot, {
      recipe: { id: 'project-recap', version: '1' },
      mode: 'unattended',
    }),
  );
  let record;
  for (const id of [
    'validate',
    'fact-base',
    'content',
    'theme',
    'render',
    'qa',
    'durability',
    'publish',
  ]) {
    if (['durability', 'publish'].includes(id)) {
      record = await updateBuildRecord(run, { id, status: 'skipped' });
    } else {
      await updateBuildRecord(run, { id, status: 'running' });
      record = await updateBuildRecord(run, {
        id,
        status: id === 'qa' ? 'warned' : 'passed',
        warnings:
          id === 'qa' ? ['visual-review-required:browser-probe-missing'] : [],
      });
    }
  }

  assert.equal(record.outcome, 'built-needs-review');
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
  const factBase = { sources: [{ id: 'project' }] };
  const planRequest = {
    schemaVersion: 'explainer-kit.set-plan-request/v1',
    recipe: { id: 'project-recap', version: '1' },
    factBaseHash: canonicalHash(factBase),
    sourceIds: ['project'],
    discovery: { rounds: 0, findings: [], reason: 'not-requested' },
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

  assert.deepEqual(
    await readSetPlanRecords(run, {
      factBase,
      recipe: { id: 'project-recap', version: '1' },
    }),
    {
      request: { ...planRequest, planHash: canonicalHash(plan) },
      plan,
      paths,
    },
  );
});

test('rejects tampering in every retained set-plan record', async () => {
  const mutations = [
    [
      'request',
      (records) => {
        records.request.factBaseHash = `sha256:${'b'.repeat(64)}`;
      },
    ],
    [
      'result',
      (records) => {
        records.plan.planId = 'tampered-plan';
      },
    ],
    [
      'ledger projection',
      (records) => {
        records.ledger.planId = 'tampered-plan';
      },
    ],
    [
      'portfolio projection',
      (records) => {
        records.portfolio.artifacts[0].draft = 'Tampered draft.';
      },
    ],
    [
      'draft projection',
      (records) => {
        records.drafts.drafts[0].draft = 'Tampered draft.';
      },
    ],
  ];

  for (const [label, mutate] of mutations) {
    const outputRoot = await temporaryDirectory();
    const run = await initializeRun(request(outputRoot));
    const factBase = { sources: [{ id: 'project' }] };
    const planRequest = {
      schemaVersion: 'explainer-kit.set-plan-request/v1',
      recipe: { id: 'project-recap', version: '1' },
      factBaseHash: canonicalHash(factBase),
      sourceIds: ['project'],
      discovery: { rounds: 0, findings: [], reason: 'not-requested' },
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
    await writeSetPlanRecords(run, { request: planRequest, plan });
    const recordPaths = {
      request: 'source/set-plan/request.json',
      plan: 'source/set-plan/result.json',
      ledger: 'source/set-plan/ledger.json',
      portfolio: 'source/set-plan/portfolio.json',
      drafts: 'source/set-plan/drafts.json',
    };
    const records = Object.fromEntries(
      await Promise.all(
        Object.entries(recordPaths).map(async ([key, path]) => [
          key,
          JSON.parse(await readFile(join(run.runRoot, path), 'utf8')),
        ]),
      ),
    );
    mutate(records);
    for (const [key, path] of Object.entries(recordPaths)) {
      await writeFile(
        join(run.runRoot, path),
        `${JSON.stringify(records[key], null, 2)}\n`,
      );
    }

    await assert.rejects(
      readSetPlanRecords(run, {
        factBase,
        recipe: { id: 'project-recap', version: '1' },
      }),
      (error) => error.code === 'E_APPROVAL_RESUME',
      label,
    );
  }
});

test('derives a deterministic v2 resume token from the request and exact set-plan bytes', async () => {
  const outputRoot = await temporaryDirectory();
  const run = await initializeRun(request(outputRoot));
  const factBase = { sources: [{ id: 'project' }] };
  const planRequest = {
    schemaVersion: 'explainer-kit.set-plan-request/v1',
    recipe: { id: 'project-recap', version: '1' },
    factBaseHash: canonicalHash(factBase),
    sourceIds: ['project'],
    discovery: { rounds: 0, findings: [], reason: 'not-requested' },
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
  await writeSetPlanRecords(run, { request: planRequest, plan });

  const token = await createSetPlanResumeToken(run);
  assert.match(token, /^ekrt2:[a-f0-9]{64}$/);
  assert.equal(await createSetPlanResumeToken(run), token);
  await verifySetPlanResumeToken(run, token);

  for (const candidate of [
    undefined,
    'ekrt2:not-a-digest',
    `${token.slice(0, -1)}${token.endsWith('0') ? '1' : '0'}`,
  ]) {
    await assert.rejects(
      verifySetPlanResumeToken(run, candidate),
      (error) => error.code === 'E_APPROVAL_RESUME',
    );
  }

  const requestPath = join(run.runRoot, 'run-request.json');
  const requestBytes = await readFile(requestPath);
  await writeFile(
    requestPath,
    JSON.stringify(JSON.parse(requestBytes.toString('utf8'))),
  );
  assert.notEqual(await createSetPlanResumeToken(run), token);
  await assert.rejects(
    verifySetPlanResumeToken(run, token),
    (error) => error.code === 'E_APPROVAL_RESUME',
  );
  await writeFile(requestPath, requestBytes);

  const resultPath = join(run.runRoot, 'source/set-plan/result.json');
  const result = JSON.parse(await readFile(resultPath, 'utf8'));
  await writeFile(resultPath, JSON.stringify(result));
  assert.notEqual(await createSetPlanResumeToken(run), token);
  await assert.rejects(
    verifySetPlanResumeToken(run, token),
    (error) => error.code === 'E_APPROVAL_RESUME',
  );
});

test('rejects every legacy v1 resume token regardless of retained output-root text', async () => {
  const outputRoot = await temporaryDirectory();
  const run = await initializeRun(request(outputRoot));
  const factBase = { sources: [{ id: 'project' }] };
  const planRequest = {
    schemaVersion: 'explainer-kit.set-plan-request/v1',
    recipe: { id: 'project-recap', version: '1' },
    factBaseHash: canonicalHash(factBase),
    sourceIds: ['project'],
    discovery: { rounds: 0, findings: [], reason: 'not-requested' },
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
  await writeSetPlanRecords(run, { request: planRequest, plan });
  const legacyToken = await legacySetPlanResumeToken(run);

  await assert.rejects(
    verifySetPlanResumeToken(run, legacyToken),
    (error) => error.code === 'E_APPROVAL_RESUME',
  );

  const requestPath = join(run.runRoot, 'run-request.json');
  const retainedRequest = JSON.parse(await readFile(requestPath, 'utf8'));
  retainedRequest.outputRoot = 'legacy-relative-output';
  await writeFile(requestPath, `${JSON.stringify(retainedRequest, null, 2)}\n`);
  await assert.rejects(
    verifySetPlanResumeToken(run, legacyToken),
    (error) => error.code === 'E_APPROVAL_RESUME',
  );
});

test('rejects omitted reconciled sources and declared sources without artifact coverage', async () => {
  const recipe = loadRecipe('project-recap', '1');
  const sourceIds = ['plan', 'implementation'];
  const factBase = {
    sources: sourceIds.map((id) => ({ id })),
  };
  const candidate = {
    schemaVersion: 'explainer-kit.set-plan/v1',
    planId: 'project-recap-set',
    recipe: { id: recipe.id, version: recipe.version },
    sourceIds,
    ledger: { terminology: [], statuses: [], numbers: [] },
    portfolio: recipe.floor.map((artifact) => ({
      artifactId: artifact.id,
      artifactType: artifact.type,
      profileId: 'recipe-floor',
      required: true,
      sourceIds,
      draft: `Compose ${artifact.id}.`,
      visualIntent: `Use the planned ${artifact.type} medium.`,
    })),
  };

  for (const [label, mutate] of [
    [
      'omitted reconciled source',
      (plan) => {
        plan.sourceIds = ['plan'];
        for (const artifact of plan.portfolio) {
          artifact.sourceIds = ['plan'];
        }
      },
    ],
    [
      'declared source without artifact coverage',
      (plan) => {
        for (const artifact of plan.portfolio) {
          artifact.sourceIds = ['plan'];
        }
      },
    ],
  ]) {
    const plan = structuredClone(candidate);
    mutate(plan);
    await assert.rejects(
      planExplainerSet({
        recipe,
        factBase,
        discovery: { rounds: 0, findings: [], reason: 'not-requested' },
        planSet: async () => plan,
      }),
      (error) => error.code === 'E_SET_PLAN',
      label,
    );
  }
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
