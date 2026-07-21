import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, test } from 'node:test';

import { resolveContentApproval } from '../scripts/lib/content-approval.mjs';
import { initializeRun } from '../scripts/lib/records.mjs';

const NOW = '2026-07-17T20:00:00Z';
const tempDirs = [];

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
  );
});

async function makeRun(mode = 'interactive') {
  const outputRoot = await mkdtemp(join(tmpdir(), 'content-approval-'));
  tempDirs.push(outputRoot);
  return initializeRun({
    schemaVersion: 'explainer-kit.run-request/v1',
    recipe: { id: 'project-explainer', version: '1' },
    slug: 'approval-demo',
    outputRoot,
    factBase: {
      mode: 'supplied',
      path: 'approved-facts.json',
      freshnessPolicy: 'live-wins',
    },
    mode,
  });
}

async function readApproval(run) {
  return JSON.parse(
    await readFile(join(run.runRoot, 'source/content-approval.json'), 'utf8'),
  );
}

test('interactive content remains pending until an explicit decision', async () => {
  const run = await makeRun();

  const approval = await resolveContentApproval(run, 'interactive');

  assert.equal(approval.status, 'pending');
  assert.equal(approval.canResume, false);
  assert.equal(approval.path, 'source/content-approval.json');
  assert.equal((await readApproval(run)).runId, run.runId);
});

test('persists rejection corrections and later approval for the same run', async () => {
  const run = await makeRun();

  const rejected = await resolveContentApproval(run, 'interactive', {
    decision: 'reject',
    reviewedAt: NOW,
    reviewer: 'operator',
    corrections: ['Clarify the rollout status.', 'Remove the stale date.'],
  });
  assert.equal(rejected.status, 'rejected');
  assert.equal(rejected.canResume, false);

  const approved = await resolveContentApproval(run, 'interactive', {
    decision: 'approve',
    reviewedAt: '2026-07-17T20:05:00Z',
    reviewer: 'operator',
    source: {
      kind: 'human-review',
      locator: 'source/content/project-explainer.md',
    },
  });

  assert.equal(approved.status, 'approved');
  assert.equal(approved.canResume, true);
  const persisted = await readApproval(run);
  assert.equal(persisted.runId, run.runId);
  assert.deepEqual(persisted.attempts[0].corrections, [
    'Clarify the rollout status.',
    'Remove the stale date.',
  ]);
  assert.equal(persisted.attempts[1].decision, 'approve');
  assert.equal(persisted.reviewedSource.kind, 'human-review');
});

test('unattended approval records lifecycle provenance without prompting', async () => {
  const run = await makeRun('unattended');
  const reviewedSource = {
    kind: 'lifecycle-artifacts',
    locator: '.oat/projects/shared/demo/plan.md',
    revision: 'abc123',
    reviewedAt: NOW,
  };

  const approval = await resolveContentApproval(
    run,
    'unattended',
    reviewedSource,
    ['source/author/project-explainer.json'],
  );

  assert.equal(approval.status, 'approved');
  assert.equal(approval.canResume, true);
  const persisted = await readApproval(run);
  assert.deepEqual(persisted.reviewedSource, reviewedSource);
  assert.deepEqual(persisted.authorResultPaths, [
    'source/author/project-explainer.json',
  ]);
  assert.equal(persisted.attempts.length, 0);
});

test('unattended approval rejects missing author provenance', async () => {
  const run = await makeRun('unattended');

  await assert.rejects(
    resolveContentApproval(run, 'unattended'),
    /author result paths/i,
  );
});

test('rejects invalid modes and malformed explicit review decisions', async () => {
  const run = await makeRun();

  await assert.rejects(
    resolveContentApproval(run, 'autonomous'),
    /interactive|unattended/i,
  );
  await assert.rejects(
    resolveContentApproval(run, 'interactive', {
      decision: 'maybe',
      reviewedAt: NOW,
    }),
    /decision/i,
  );
});
