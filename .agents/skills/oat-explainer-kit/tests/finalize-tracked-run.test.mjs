import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, test } from 'node:test';

import {
  planTrackedRunFinalization,
  verifyTrackedRunFinalization,
} from '../scripts/finalize-tracked-run.mjs';

const SHA = 'a'.repeat(40);
const EVIDENCE_SHA = 'b'.repeat(40);
const tempDirs = [];

afterEach(async () => {
  await Promise.all(
    tempDirs
      .splice(0)
      .map((path) => rm(path, { recursive: true, force: true })),
  );
});

test('plans a dedicated immutable artifact commit followed by evidence and one push', async () => {
  const fixture = await createRun();
  const plan = await planTrackedRunFinalization(request(fixture, 'dedicated'), {
    repoRoot: fixture.repoRoot,
    project: 'demo',
  });

  assert.equal(plan.status, 'ready');
  assert.equal(plan.artifactCommit.mode, 'create');
  assert.equal(
    plan.artifactCommit.commands[1].args.join(' '),
    [
      'commit',
      '--only',
      '-m',
      'docs(oat): persist project-recap for demo',
      '--',
      ...fixture.immutablePaths,
    ].join(' '),
  );
  assert.deepEqual(
    plan.attestation.request.evidence.paths,
    fixture.immutablePaths,
  );
  assert.ok(
    plan.attestation.request.evidence.paths.every(
      (path) =>
        !path.endsWith('/manifest.json') &&
        !path.endsWith('/build-record.json'),
    ),
  );
  assert.deepEqual(plan.evidenceCommit.paths, fixture.mutablePaths);
  assert.equal(plan.push.commands.length, 1);
  assert.match(plan.push.instruction, /both commits together/i);
});

test('reuses a completion bookkeeping commit without planning another artifact commit', async () => {
  const fixture = await createRun();
  const plan = await planTrackedRunFinalization(
    request(fixture, 'completion-bookkeeping'),
    {
      repoRoot: fixture.repoRoot,
      project: 'demo',
      artifactCommit: SHA,
    },
  );

  assert.equal(plan.artifactCommit.mode, 'existing');
  assert.equal(plan.artifactCommit.ref, SHA);
  assert.deepEqual(plan.artifactCommit.commands, []);
  assert.equal(plan.attestation.request.evidence.commit, SHA);
  assert.equal(plan.evidenceCommit.parent, SHA);

  const observation = successfulObservation(fixture);
  observation.artifactCommit.paths.push(
    '.oat/projects/shared/demo/state.md',
    ...fixture.mutablePaths,
  );
  assert.equal(
    verifyTrackedRunFinalization(plan, observation).pushAllowed,
    true,
  );
});

test('verifies commit order and exact unrelated-change isolation', async () => {
  const fixture = await createRun();
  const plan = await planTrackedRunFinalization(request(fixture, 'dedicated'), {
    repoRoot: fixture.repoRoot,
    project: 'demo',
  });
  const observation = successfulObservation(fixture);
  observation.unrelatedChangesBefore = ['notes/private.md'];
  observation.unrelatedChangesAfter = ['notes/private.md'];

  assert.deepEqual(verifyTrackedRunFinalization(plan, observation), {
    ok: true,
    outcome: 'built-durable',
    pushAllowed: true,
    errors: [],
  });

  observation.evidenceCommit.paths.push('notes/private.md');
  const contaminated = verifyTrackedRunFinalization(plan, observation);
  assert.equal(contaminated.ok, false);
  assert.ok(
    contaminated.errors.some(({ code }) => code === 'unrelated-change'),
  );
});

test('keeps failed verification built-not-durable and allows later attestation', async () => {
  const fixture = await createRun();
  const first = await planTrackedRunFinalization(
    request(fixture, 'dedicated'),
    { repoRoot: fixture.repoRoot, project: 'demo' },
  );
  const failed = successfulObservation(fixture);
  failed.attestation = {
    durable: false,
    outcome: 'built-not-durable',
    errors: [{ code: 'hash-mismatch', message: 'commit blob mismatch' }],
  };

  const checked = verifyTrackedRunFinalization(first, failed);
  assert.equal(checked.ok, true);
  assert.equal(checked.outcome, 'built-not-durable');
  assert.equal(checked.pushAllowed, true);

  const later = await planTrackedRunFinalization(
    request(fixture, 'completion-bookkeeping'),
    {
      repoRoot: fixture.repoRoot,
      project: 'demo',
      artifactCommit: SHA,
      currentHead: EVIDENCE_SHA,
    },
  );
  assert.equal(later.status, 'ready');
  assert.equal(later.artifactCommit.mode, 'existing');
  assert.equal(later.evidenceCommit.parent, EVIDENCE_SHA);
});

test('rejects missing, empty, malformed, and unknown attestation observations', async () => {
  const fixture = await createRun();
  const plan = await planTrackedRunFinalization(request(fixture, 'dedicated'), {
    repoRoot: fixture.repoRoot,
    project: 'demo',
  });

  for (const attestation of [
    undefined,
    {},
    { durable: 'yes', outcome: 'built-durable', errors: [] },
    { durable: true, outcome: 'built-durable' },
    { durable: true, outcome: 'unknown', errors: [] },
    { durable: false, outcome: 'failed', errors: [] },
  ]) {
    const observation = successfulObservation(fixture);
    if (attestation === undefined) {
      delete observation.attestation;
    } else {
      observation.attestation = attestation;
    }

    const checked = verifyTrackedRunFinalization(plan, observation);
    assert.equal(checked.ok, false);
    assert.equal(checked.pushAllowed, false);
    assert.ok(
      checked.errors.some(({ code }) => code === 'attestation-outcome'),
    );
  }
});

test('terminates idempotently when the same commit evidence is already durable', async () => {
  const fixture = await createRun({
    outcome: 'built-durable',
    evidence: {
      kind: 'commit',
      ref: SHA,
      paths: [],
      attestedAt: '2026-07-18T00:00:00.000Z',
    },
  });
  const manifest = JSON.parse(await readFile(fixture.manifestPath, 'utf8'));
  manifest.artifacts[0].durableEvidence[0].paths = fixture.immutablePaths;
  await writeFile(
    fixture.manifestPath,
    `${JSON.stringify(manifest, null, 2)}\n`,
  );

  const plan = await planTrackedRunFinalization(
    request(fixture, 'completion-bookkeeping'),
    {
      repoRoot: fixture.repoRoot,
      project: 'demo',
      artifactCommit: SHA,
    },
  );

  assert.equal(plan.status, 'complete');
  assert.deepEqual(plan.commands, []);
});

function successfulObservation(fixture) {
  return {
    artifactCommit: { sha: SHA, paths: fixture.immutablePaths },
    attestation: { durable: true, outcome: 'built-durable', errors: [] },
    evidenceCommit: {
      sha: EVIDENCE_SHA,
      parent: SHA,
      paths: fixture.mutablePaths,
    },
    unrelatedChangesBefore: [],
    unrelatedChangesAfter: [],
  };
}

function request(fixture, commitMode) {
  return {
    runRoot: fixture.runRoot,
    manifestPath: fixture.manifestPath,
    commitMode,
  };
}

async function createRun({ outcome = 'built-not-durable', evidence } = {}) {
  const repoRoot = await mkdtemp(join(tmpdir(), 'oat-finalizer-'));
  tempDirs.push(repoRoot);
  const runRoot = join(repoRoot, '.oat/projects/shared/demo/explainers/recap');
  await mkdir(join(runRoot, 'source/content'), { recursive: true });
  await mkdir(join(runRoot, 'site'), { recursive: true });
  for (const [path, content] of [
    ['source/fact-base.json', '{}\n'],
    ['source/fact-base.md', '# Facts\n'],
    ['source/content/recap.md', '# Recap\n'],
    ['theme.resolved.json', '{}\n'],
    ['site/index.html', '<h1>Recap</h1>\n'],
  ]) {
    await writeFile(join(runRoot, path), content);
  }

  const manifest = {
    schemaVersion: 'explainer-kit.manifest/v1',
    recipe: { id: 'project-recap', version: '1' },
    source: { factBasePath: 'source/fact-base.json' },
    theme: { path: 'theme.resolved.json' },
    artifacts: [
      {
        contentPath: 'source/content/recap.md',
        renderedPath: 'site/index.html',
        status: 'built',
        ...(evidence ? { durableEvidence: [evidence] } : {}),
      },
    ],
    buildRecord: { path: 'build-record.json' },
    outcome,
  };
  const manifestPath = join(runRoot, 'manifest.json');
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  await writeFile(join(runRoot, 'build-record.json'), '{}\n');

  const prefix = '.oat/projects/shared/demo/explainers/recap';
  return {
    repoRoot,
    runRoot,
    manifestPath,
    immutablePaths: [
      `${prefix}/source/fact-base.json`,
      `${prefix}/source/fact-base.md`,
      `${prefix}/source/content/recap.md`,
      `${prefix}/theme.resolved.json`,
      `${prefix}/site/index.html`,
    ],
    mutablePaths: [`${prefix}/manifest.json`, `${prefix}/build-record.json`],
  };
}
