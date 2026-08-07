import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { browserCaptureIdentity } from '../../explainer-kit/scripts/lib/browser-runtime.mjs';
import {
  canonicalHash,
  visualReviewRequestId,
} from '../../explainer-kit/scripts/lib/contracts.mjs';
import { writeTerminalEvidence } from '../../explainer-kit/scripts/lib/records.mjs';
import { supersedeExplainerRun } from '../../explainer-kit/scripts/run.mjs';
import { png } from '../../explainer-kit/tests/fixtures/png.mjs';
import {
  planTrackedRunFinalization as planTrackedRunFinalizationCore,
  verifyTrackedRunFinalization,
} from '../scripts/finalize-tracked-run.mjs';

const SHA = 'a'.repeat(40);
const EVIDENCE_SHA = 'b'.repeat(40);
const tempDirs = [];
const CORE_ROOT = fileURLToPath(
  new URL('../../explainer-kit/', import.meta.url),
);

const planTrackedRunFinalization = (finalizationRequest, context = {}) =>
  planTrackedRunFinalizationCore(finalizationRequest, {
    coreRoot: CORE_ROOT,
    ...context,
  });

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

test('plans evidence for every manifest immutable hash path', async () => {
  const fixture = await createRun();
  const manifest = JSON.parse(await readFile(fixture.manifestPath, 'utf8'));
  const extraPath = 'qa/custom-observation.json';
  await mkdir(join(fixture.runRoot, 'qa'), { recursive: true });
  await writeFile(join(fixture.runRoot, extraPath), '{"observed":true}\n');
  manifest.immutableHashes[extraPath] = await fileHash(
    join(fixture.runRoot, extraPath),
  );
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

  assert.deepEqual(
    plan.attestation.request.evidence.paths,
    Object.keys(manifest.immutableHashes).map(
      (path) => `.oat/projects/shared/demo/explainers/recap/${path}`,
    ),
  );
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

test('finalizes flagged and failed evidence without promoting either outcome', async () => {
  for (const outcome of ['built-needs-review', 'failed']) {
    const fixture = await createRun({ outcome });
    const manifest = JSON.parse(await readFile(fixture.manifestPath, 'utf8'));
    await writeTerminalEvidence(
      {
        runId: manifest.runId,
        slug: manifest.slug,
        runRoot: fixture.runRoot,
      },
      {
        outcome,
        manifest,
        findings:
          outcome === 'built-needs-review'
            ? [{ artifactId: 'hub', severity: 'important' }]
            : [],
        ...(outcome === 'failed' && {
          error: { code: 'E_RUN', message: 'The run failed.' },
        }),
        evidenceDisposition: 'retained',
      },
    );

    const plan = await planTrackedRunFinalization(
      request(fixture, 'dedicated'),
      {
        repoRoot: fixture.repoRoot,
        project: 'demo',
      },
    );
    assert.equal(plan.status, 'complete');
    assert.equal(plan.outcome, outcome);
    assert.equal(plan.publicationAllowed, false);
    assert.equal(plan.evidenceDisposition, 'retained');
    assert.deepEqual(plan.commands, []);
    assert.deepEqual(verifyTrackedRunFinalization(plan), {
      ok: true,
      outcome,
      pushAllowed: false,
      errors: [],
    });
  }
});

test('rejects terminal evidence symlinked outside the tracked run', async () => {
  const fixture = await createRun({ outcome: 'failed' });
  const manifest = JSON.parse(await readFile(fixture.manifestPath, 'utf8'));
  await writeTerminalEvidence(
    {
      runId: manifest.runId,
      slug: manifest.slug,
      runRoot: fixture.runRoot,
    },
    {
      outcome: 'failed',
      manifest,
      error: { code: 'E_RUN', message: 'The run failed.' },
      evidenceDisposition: 'retained',
    },
  );
  const evidencePath = join(fixture.runRoot, 'terminal-evidence.json');
  const externalEvidencePath = join(
    fixture.repoRoot,
    'external-terminal-evidence.json',
  );
  await writeFile(externalEvidencePath, await readFile(evidencePath));
  await rm(evidencePath);
  await symlink(externalEvidencePath, evidencePath);

  await assert.rejects(
    planTrackedRunFinalization(request(fixture, 'dedicated'), {
      repoRoot: fixture.repoRoot,
      project: 'demo',
    }),
    /terminal evidence|symbolic link|run root/i,
  );
});

test('consumes production supersession evidence bound to both runs', async () => {
  const fixture = await createRun({ outcome: 'failed' });
  const manifest = JSON.parse(await readFile(fixture.manifestPath, 'utf8'));
  await writeTerminalEvidence(
    {
      runId: manifest.runId,
      slug: manifest.slug,
      runRoot: fixture.runRoot,
    },
    {
      outcome: 'failed',
      manifest,
      error: { code: 'E_RUN', message: 'The original run failed.' },
      evidenceDisposition: 'retained',
    },
  );

  const replacement = {
    runId: 'run-replacement',
    manifestHash: `sha256:${'c'.repeat(64)}`,
  };
  await supersedeExplainerRun({
    runRoot: fixture.runRoot,
    supersededBy: replacement,
  });

  const plan = await planTrackedRunFinalization(request(fixture, 'dedicated'), {
    repoRoot: fixture.repoRoot,
    project: 'demo',
  });
  assert.equal(plan.status, 'complete');
  assert.equal(plan.outcome, 'failed');
  assert.equal(plan.evidenceDisposition, 'superseded');
  assert.deepEqual(plan.supersededBy, replacement);
});

test('loads versioned package coverage from the explicit compatible core root', async () => {
  const fixture = await createRun();
  await assert.rejects(
    planTrackedRunFinalizationCore(request(fixture, 'dedicated'), {
      repoRoot: fixture.repoRoot,
      project: 'demo',
    }),
    /coreRoot is required/i,
  );

  const incompatibleCore = join(fixture.repoRoot, 'incompatible-core');
  await mkdir(join(incompatibleCore, 'scripts', 'lib'), { recursive: true });
  await writeFile(
    join(incompatibleCore, 'scripts', 'lib', 'package-coverage.mjs'),
    "export const PACKAGE_COVERAGE_VERSION = 'future';\nexport const requiredImmutablePackagePaths = () => [];\n",
  );
  await assert.rejects(
    planTrackedRunFinalizationCore(request(fixture, 'dedicated'), {
      repoRoot: fixture.repoRoot,
      project: 'demo',
      coreRoot: incompatibleCore,
    }),
    /explainer-kit\.package-coverage\/v2/i,
  );
});

test('finalizes a successful interactive recap without visual-review evidence', async () => {
  const fixture = await createRun({ mode: 'interactive' });

  const plan = await planTrackedRunFinalization(request(fixture, 'dedicated'), {
    repoRoot: fixture.repoRoot,
    project: 'demo',
  });

  assert.equal(plan.status, 'ready');
  assert.equal(
    fixture.immutablePaths.some(
      (path) =>
        path.includes('/qa/browser/') || path.includes('/qa/visual-review/'),
    ),
    false,
  );
});

test('rejects partial interactive review evidence and an unverified mode change', async () => {
  const partial = await createRun({
    mode: 'interactive',
    includeReviewEvidence: false,
  });
  const partialManifest = JSON.parse(
    await readFile(partial.manifestPath, 'utf8'),
  );
  const partialPath = 'qa/browser/recap/mobile.png';
  await mkdir(dirname(join(partial.runRoot, partialPath)), { recursive: true });
  await writeFile(join(partial.runRoot, partialPath), 'partial\n');
  partialManifest.immutableHashes[partialPath] = await fileHash(
    join(partial.runRoot, partialPath),
  );
  await writeFile(
    partial.manifestPath,
    `${JSON.stringify(partialManifest, null, 2)}\n`,
  );
  await assert.rejects(
    planTrackedRunFinalization(request(partial, 'dedicated'), {
      repoRoot: partial.repoRoot,
      project: 'demo',
    }),
    /canonical package.*visual-review|canonical package.*browser/i,
  );

  const mutated = await createRun();
  await writeFile(
    join(mutated.runRoot, 'run-request.json'),
    '{"mode":"interactive"}\n',
  );
  await assert.rejects(
    planTrackedRunFinalization(request(mutated, 'dedicated'), {
      repoRoot: mutated.repoRoot,
      project: 'demo',
    }),
    /hash mismatch.*run-request\.json/i,
  );
});

test('rejects incomplete or mutated review evidence before planning commits', async () => {
  const incomplete = await createRun();
  const incompleteManifest = JSON.parse(
    await readFile(incomplete.manifestPath, 'utf8'),
  );
  delete incompleteManifest.immutableHashes[
    'qa/visual-review/attempt-1/evidence/recap/tablet.json'
  ];
  await writeFile(
    incomplete.manifestPath,
    `${JSON.stringify(incompleteManifest, null, 2)}\n`,
  );
  await assert.rejects(
    planTrackedRunFinalization(request(incomplete, 'dedicated'), {
      repoRoot: incomplete.repoRoot,
      project: 'demo',
    }),
    /canonical package.*tablet\.json/i,
  );

  const mutated = await createRun();
  await writeFile(
    join(mutated.runRoot, 'qa/browser/recap/mobile.png'),
    'mutated\n',
  );
  await assert.rejects(
    planTrackedRunFinalization(request(mutated, 'dedicated'), {
      repoRoot: mutated.repoRoot,
      project: 'demo',
    }),
    /hash mismatch.*mobile\.png/i,
  );
});

test('rejects hash-valid cross-record browser capture identity drift', async () => {
  const fixture = await createRun();
  const metricsPath = 'qa/browser/recap/mobile.json';
  const absoluteMetricsPath = join(fixture.runRoot, metricsPath);
  const metrics = JSON.parse(await readFile(absoluteMetricsPath, 'utf8'));
  metrics.runtime.version = '124.0.6367.0';
  metrics.captureIdentity = browserCaptureIdentity(
    metrics.runtime,
    metrics.capture,
  );
  await writeFile(absoluteMetricsPath, `${JSON.stringify(metrics, null, 2)}\n`);

  const manifest = JSON.parse(await readFile(fixture.manifestPath, 'utf8'));
  manifest.immutableHashes[metricsPath] = await fileHash(absoluteMetricsPath);
  await writeFile(
    fixture.manifestPath,
    `${JSON.stringify(manifest, null, 2)}\n`,
  );

  await assert.rejects(
    planTrackedRunFinalization(request(fixture, 'dedicated'), {
      repoRoot: fixture.repoRoot,
      project: 'demo',
    }),
    /browser.*capture identity|capture identity.*mismatch/i,
  );
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

async function createRun({
  outcome = 'built-not-durable',
  evidence: providedEvidence,
  mode = 'unattended',
  includeReviewEvidence = mode === 'unattended',
} = {}) {
  const repoRoot = await mkdtemp(join(tmpdir(), 'oat-finalizer-'));
  tempDirs.push(repoRoot);
  const runRoot = join(repoRoot, '.oat/projects/shared/demo/explainers/recap');
  const files = [
    ['run-request.json', `${JSON.stringify({ mode })}\n`],
    ['source/content-approval.json', '{}\n'],
    ['source/fact-base.json', '{}\n'],
    ['source/fact-base.md', '# Facts\n'],
    ['source/author/recap.json', '{}\n'],
    ['source/content/recap.md', '# Recap\n'],
    ['source/set-plan/request.json', '{}\n'],
    ['source/set-plan/result.json', '{}\n'],
    ['source/set-plan/ledger.json', '{}\n'],
    ['source/set-plan/portfolio.json', '{}\n'],
    ['source/set-plan/drafts.json', '{}\n'],
    ['theme.resolved.json', '{}\n'],
    ['site/index.html', '<h1>Recap</h1>\n'],
  ];
  if (includeReviewEvidence) {
    const runtime = {
      kind: 'launched',
      name: 'chromium',
      version: '123.0.6312.0',
    };
    const capture = {
      format: 'png',
      fullPage: false,
      reducedMotion: 'reduce',
      animationsDisabled: true,
    };
    const captureIdentity = browserCaptureIdentity(runtime, capture);
    const renderedBytes = Buffer.from('<h1>Recap</h1>\n');
    const plan = {
      schemaVersion: 'explainer-kit.set-plan/v1',
      planId: 'recap-plan',
      recipe: { id: 'project-recap', version: '1' },
      sourceIds: ['plan'],
      ledger: {
        terminology: [{ term: 'recap', meaning: 'The project recap.' }],
        statuses: [{ subject: 'review', value: 'passed' }],
        numbers: [{ subject: 'artifacts', value: 1, unit: 'artifact' }],
      },
      portfolio: [
        {
          artifactId: 'recap',
          artifactType: 'hub',
          profileId: 'recap-hub',
          required: true,
          sourceIds: ['plan'],
          draft: 'Summarize the completed project.',
          visualIntent: 'Lead with the reviewed outcome.',
        },
      ],
    };
    const evidence = [];
    const reviewFiles = [];
    for (const [viewport, width] of [
      ['mobile', 320],
      ['tablet', 768],
      ['desktop', 1440],
    ]) {
      const screenshotBytes = png(width, 900);
      const metrics = {
        schemaVersion: 'explainer-kit.browser-evidence/v2',
        artifactId: 'recap',
        viewport,
        scenario: 'default',
        runtime,
        capture,
        captureIdentity,
        metrics: {
          pageOverflowX: false,
          clippedX: [],
          viewportClipped: [],
          unreadableHeadings: [],
        },
      };
      const metricsBytes = jsonBytes(metrics);
      const screenshotPath = `qa/browser/recap/${viewport}.png`;
      const metricsPath = `qa/browser/recap/${viewport}.json`;
      evidence.push({
        viewport,
        screenshotPath,
        screenshotHash: hashBytes(screenshotBytes),
        metricsPath,
        metricsHash: hashBytes(metricsBytes),
        captureIdentity,
      });
      reviewFiles.push(
        [screenshotPath, screenshotBytes],
        [metricsPath, metricsBytes],
        [
          `qa/visual-review/attempt-1/evidence/recap/${viewport}.png`,
          screenshotBytes,
        ],
        [
          `qa/visual-review/attempt-1/evidence/recap/${viewport}.json`,
          metricsBytes,
        ],
      );
    }
    const requestPayload = {
      schemaVersion: 'explainer-kit.visual-review-request/v1',
      browserRuntime: runtime,
      captureIdentity,
      plan,
      renderedArtifacts: [
        {
          artifactId: 'recap',
          renderedPath: 'site/index.html',
          renderedHash: hashBytes(renderedBytes),
          cohesionObservations: [
            {
              artifactId: 'recap',
              contentHash: hashBytes(renderedBytes),
              group: 'terminology',
              claim: 'recap',
              value: 'recap',
            },
            {
              artifactId: 'recap',
              contentHash: hashBytes(renderedBytes),
              group: 'statuses',
              claim: 'review',
              value: 'passed',
            },
            {
              artifactId: 'recap',
              contentHash: hashBytes(renderedBytes),
              group: 'numericClaims',
              claim: 'artifacts',
              value: 1,
            },
          ],
          evidence,
        },
      ],
    };
    const requestHash = canonicalHash(requestPayload);
    const reviewRequest = {
      ...requestPayload,
      requestId: visualReviewRequestId(requestHash),
      requestHash,
    };
    const reviewResult = {
      schemaVersion: 'explainer-kit.visual-review-result/v1',
      reviewId: 'finalizer-review',
      requestId: reviewRequest.requestId,
      requestHash,
      reviewedAt: '2026-07-18T00:00:00.000Z',
      disposition: 'pass',
      artifactIds: ['recap'],
      findings: [],
    };
    files.push(
      ['qa/visual-review/attempt-1/request.json', jsonBytes(reviewRequest)],
      ['qa/visual-review/attempt-1/result.json', jsonBytes(reviewResult)],
      ...reviewFiles,
    );
  }
  for (const [path, content] of files) {
    await mkdir(dirname(join(runRoot, path)), { recursive: true });
    await writeFile(join(runRoot, path), content);
  }
  const immutableHashes = Object.fromEntries(
    await Promise.all(
      files.map(async ([path]) => [path, await fileHash(join(runRoot, path))]),
    ),
  );

  const manifest = {
    schemaVersion: 'explainer-kit.manifest/v1',
    runId: 'run-recap',
    slug: 'recap',
    recipe: { id: 'project-recap', version: '1' },
    source: {
      factBasePath: 'source/fact-base.json',
      authorResultPaths: ['source/author/recap.json'],
    },
    theme: { path: 'theme.resolved.json' },
    immutableHashes,
    artifacts: [
      {
        id: 'recap',
        contentPath: 'source/content/recap.md',
        renderedPath: 'site/index.html',
        status: 'built',
        ...(providedEvidence ? { durableEvidence: [providedEvidence] } : {}),
      },
    ],
    buildRecord: { path: 'build-record.json' },
    outcome,
  };
  const manifestPath = join(runRoot, 'manifest.json');
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  await writeFile(join(runRoot, 'build-record.json'), '{}\n');

  const prefix = '.oat/projects/shared/demo/explainers/recap';
  const immutablePaths = Object.keys(immutableHashes).map(
    (path) => `${prefix}/${path}`,
  );
  return {
    repoRoot,
    runRoot,
    manifestPath,
    immutablePaths,
    mutablePaths: [`${prefix}/manifest.json`, `${prefix}/build-record.json`],
  };
}

async function fileHash(path) {
  return `sha256:${createHash('sha256')
    .update(await readFile(path))
    .digest('hex')}`;
}

function hashBytes(value) {
  return `sha256:${createHash('sha256').update(value).digest('hex')}`;
}

function jsonBytes(value) {
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
}
