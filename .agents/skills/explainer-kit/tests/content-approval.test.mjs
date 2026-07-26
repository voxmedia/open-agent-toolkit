import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, test } from 'node:test';

import {
  readContentApproval,
  resolveContentApproval,
} from '../scripts/lib/content-approval.mjs';
import { initializeRun } from '../scripts/lib/records.mjs';

const NOW = '2026-07-17T20:00:00Z';
const RESOLVED_ARTIFACTS = [
  {
    artifactId: 'project-explainer',
    origin: 'floor',
    authoring: 'markdown',
    contentPath: 'source/content/project-explainer.md',
    authorResultPath: 'source/author/project-explainer.json',
  },
  {
    artifactId: 'architecture-overview',
    origin: 'expansion',
    profileId: 'supporting-diagram',
    authoring: 'html',
    contentPath: 'source/content/architecture-overview.html',
    authorResultPath: 'source/author/architecture-overview.json',
  },
];
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

async function writeApproval(run, record) {
  await mkdir(join(run.runRoot, 'source'), { recursive: true });
  await writeFile(
    join(run.runRoot, 'source/content-approval.json'),
    `${JSON.stringify(record, null, 2)}\n`,
    'utf8',
  );
}

test('interactive content remains pending until an explicit decision', async () => {
  const run = await makeRun();

  const approval = await resolveContentApproval(run, 'interactive');

  assert.equal(approval.status, 'pending');
  assert.equal(approval.canResume, false);
  assert.equal(approval.path, 'source/content-approval.json');
  const persisted = await readApproval(run);
  assert.equal(persisted.schemaVersion, 'explainer-kit.content-approval/v2');
  assert.equal(persisted.runId, run.runId);
  assert.equal('marking' in persisted, false);
  assert.equal('artifacts' in persisted, false);
  assert.deepEqual(await readContentApproval(run), persisted);
});

test('v2 artifact and author-result sets round-trip through interactive approval', async () => {
  const run = await makeRun();
  const authorResultPaths = RESOLVED_ARTIFACTS.map(
    ({ authorResultPath }) => authorResultPath,
  );

  const pending = await resolveContentApproval(
    run,
    'interactive',
    undefined,
    authorResultPaths,
    RESOLVED_ARTIFACTS,
  );
  assert.deepEqual(pending.record.artifacts, RESOLVED_ARTIFACTS);
  assert.deepEqual(pending.record.authorResultPaths, authorResultPaths);
  assert.deepEqual(
    (await readContentApproval(run)).artifacts,
    RESOLVED_ARTIFACTS,
  );

  const approved = await resolveContentApproval(run, 'interactive', {
    decision: 'approve',
    reviewedAt: NOW,
    reviewer: 'operator',
  });
  assert.equal(approved.record.marking, 'human-approved');
  assert.deepEqual(approved.record.artifacts, RESOLVED_ARTIFACTS);
  assert.deepEqual(approved.record.authorResultPaths, authorResultPaths);
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
  assert.equal(persisted.schemaVersion, 'explainer-kit.content-approval/v2');
  assert.equal(persisted.marking, 'human-approved');
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
  assert.equal(persisted.schemaVersion, 'explainer-kit.content-approval/v2');
  assert.equal(persisted.marking, 'auto-drafted');
  assert.equal(persisted.attempts.length, 0);
});

test('normalizes legacy v1 approval records onto floor content files', async () => {
  const run = await makeRun();
  await writeApproval(run, {
    schemaVersion: 'explainer-kit.content-approval/v1',
    runId: run.runId,
    mode: 'interactive',
    status: 'approved',
    reviewedSource: {
      kind: 'human-review',
      locator: 'source/content/project-explainer.md',
    },
    attempts: [
      {
        decision: 'approve',
        reviewedAt: NOW,
        corrections: [],
      },
    ],
  });

  const normalized = await readContentApproval(run);
  assert.equal(normalized.schemaVersion, 'explainer-kit.content-approval/v2');
  assert.equal(normalized.marking, 'human-approved');
  assert.deepEqual(normalized.artifacts, [
    {
      artifactId: 'project-explainer',
      origin: 'floor',
      authoring: 'markdown',
      contentPath: 'source/content/project-explainer.md',
    },
  ]);

  await resolveContentApproval(run, 'interactive');
  assert.deepEqual(await readApproval(run), normalized);
});

test('normalizes legacy unattended marking and available author-result paths', async () => {
  const run = await makeRun('unattended');
  await writeApproval(run, {
    schemaVersion: 'explainer-kit.content-approval/v1',
    runId: run.runId,
    mode: 'unattended',
    status: 'approved',
    reviewedSource: {
      kind: 'approved-fact-base',
      locator: 'approved-facts.json',
    },
    authorResultPaths: ['source/author/project-explainer.json'],
    attempts: [],
  });

  const normalized = await readContentApproval(run);
  assert.equal(normalized.marking, 'auto-drafted');
  assert.equal(
    normalized.artifacts[0].authorResultPath,
    'source/author/project-explainer.json',
  );
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
  await assert.rejects(
    resolveContentApproval(run, 'interactive', undefined, undefined, [
      {
        ...RESOLVED_ARTIFACTS[1],
        origin: 'floor',
      },
    ]),
    /profileId/i,
  );
});
