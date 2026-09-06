import assert from 'node:assert/strict';
import { readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, test } from 'node:test';

import { createReviewBrief } from '../scripts/create-review-brief.mjs';
import { hashFile } from '../scripts/lib/canonical-json.mjs';
import { validateArtifactShape } from '../scripts/lib/contracts.mjs';
import { reconcileLedger } from '../scripts/reconcile-ledger.mjs';
import { renderPacketDocument } from '../scripts/render-packet.mjs';
import {
  compileValidatedRun,
  validatePacket,
} from '../scripts/validate-packet.mjs';
import {
  approveExecution,
  createPacketFixture,
} from './fixtures/packet-fixture.mjs';

const roots = [];
afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

async function fixture(profile = 'standard') {
  const packet = await createPacketFixture({ profile });
  roots.push(packet.tempRoot);
  return packet;
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

async function writeJson(path, value) {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function replaceArtifact(packet, relative, value) {
  const path = join(packet.packetRoot, relative);
  await writeJson(path, value);
  const reference = packet.manifest.artifacts.find(
    (item) => item.path === relative,
  );
  reference.digest = await hashFile(path);
  await writeJson(packet.manifestPath, packet.manifest);
  return reference;
}

async function coreReviewResults(packet) {
  return Promise.all(
    ['semantic', 'adversarial', 'coverage'].map(async (kind) => {
      const relative = `reviews/${kind}.json`;
      return {
        ...(await readJson(join(packet.packetRoot, relative))),
        artifactReference: {
          ...packet.manifest.artifacts.find((item) => item.path === relative),
        },
      };
    }),
  );
}

test('later ledger revisions reject final transitions that mismatch claim status', async () => {
  const packet = await fixture();
  const ledger = await readJson(packet.claimsPath);
  assert.equal(ledger.revision, 2);
  ledger.transitions.find((transition) => transition.claimId === 'claim-1').to =
    'contested';

  const validation = validateArtifactShape(ledger);
  assert.equal(validation.valid, false, JSON.stringify(validation, null, 2));
  assert.ok(
    validation.errors.some(
      (error) => error.code === 'CLAIM_TRANSITION_MISMATCH',
    ),
    JSON.stringify(validation, null, 2),
  );
});

test('ValidatedRun retains exact digests for canonical and referenced packet bytes', async () => {
  const packet = await fixture();
  const validation = await compileValidatedRun(packet.packetRoot);
  assert.equal(validation.valid, true, JSON.stringify(validation, null, 2));
  const retained = new Map(
    validation.validatedRun.canonicalByteDigests.map(({ path, digest }) => [
      path,
      digest,
    ]),
  );
  const expectedPaths = new Set([
    'manifest.json',
    'claims.json',
    ...packet.manifest.artifacts.map(({ path }) => path),
    ...packet.ledger.inputArtifacts.map(({ path }) => path),
    ...packet.ledger.evidence.map(({ provenance }) => provenance.path),
    ...packet.ledger.claims.flatMap(({ derivedFrom }) =>
      derivedFrom.map(({ path }) => path),
    ),
  ]);
  assert.deepEqual(new Set(retained.keys()), expectedPaths);
  for (const path of expectedPaths) {
    assert.equal(
      retained.get(path),
      await hashFile(join(packet.packetRoot, path)),
    );
  }
});

test('approval fingerprint binds every approved execution axis', async () => {
  for (const [axis, value] of [
    ['model', 'other-model'],
    ['effort', 'low'],
    ['role', 'generic'],
    ['authority', 'provider-enforced'],
    ['maxConcurrency', 9],
    ['deadlineSeconds', 5],
  ]) {
    const packet = await fixture('quick');
    packet.manifest.execution[axis] = value;
    await writeJson(packet.manifestPath, packet.manifest);
    const validation = await validatePacket(packet.packetRoot);
    assert.ok(
      validation.errors.some(
        (error) => error.code === 'APPROVAL_FINGERPRINT_MISMATCH',
      ),
      `${axis} drift was not rejected: ${JSON.stringify(validation, null, 2)}`,
    );
  }
});

test('approved execution rejects unknown axes and unapproved lanes', async () => {
  const packet = await fixture('quick');
  packet.manifest.execution.catalogRecheck = { id: 'legacy' };
  await writeJson(packet.manifestPath, packet.manifest);
  const unknown = await validatePacket(packet.packetRoot);
  assert.ok(unknown.errors.some((error) => error.code === 'UNKNOWN_FIELD'));
  delete packet.manifest.execution.catalogRecheck;

  const dossier = await readJson(
    join(packet.packetRoot, 'raw/dossiers/pass-map.json'),
  );
  dossier.laneId = 'lane-rogue';
  await replaceArtifact(packet, 'raw/dossiers/pass-map.json', dossier);
  const rogue = await validatePacket(packet.packetRoot);
  assert.ok(
    rogue.errors.some((error) => error.code === 'UNAPPROVED_LANE'),
    JSON.stringify(rogue, null, 2),
  );
});

test('review dispositions bind exact claim-bearing typed immutable briefs', async () => {
  const packet = await fixture();
  const briefPath = join(packet.packetRoot, 'reviews/briefs/verify.json');
  const brief = await readJson(briefPath);
  brief.claims = [];
  const briefRef = await replaceArtifact(
    packet,
    'reviews/briefs/verify.json',
    brief,
  );
  const result = await readJson(
    join(packet.packetRoot, 'reviews/semantic.json'),
  );
  result.brief = { ...briefRef };
  result.permittedInputs = [{ ...briefRef }];
  await replaceArtifact(packet, 'reviews/semantic.json', result);
  const validation = await validatePacket(packet.packetRoot);
  assert.ok(
    validation.errors.some((error) => error.code === 'REVIEW_BRIEF_MISMATCH'),
  );

  const coverage = createReviewBrief({
    id: 'brief-test-coverage',
    mode: 'coverage',
    createdAt: '2026-08-31T00:00:00.000Z',
    manifest: packet.manifest,
    ledger: packet.ledger,
    claimIds: ['claim-1'],
  });
  assert.deepEqual(coverage.claims, [
    { id: 'claim-1', statement: packet.ledger.claims[0].statement },
  ]);
});

test('approved lanes bind wave mode, write root, and per-lane outcomes', async () => {
  const wrongWave = await fixture();
  const semantic = await readJson(
    join(wrongWave.packetRoot, 'reviews/semantic.json'),
  );
  semantic.reviewerLane = 'lane-gather';
  await replaceArtifact(wrongWave, 'reviews/semantic.json', semantic);
  const wrongWaveValidation = await validatePacket(wrongWave.packetRoot);
  assert.ok(
    wrongWaveValidation.errors.some(
      (error) =>
        error.code === 'UNAPPROVED_LANE' && error.path === 'review-semantic',
    ),
    JSON.stringify(wrongWaveValidation, null, 2),
  );

  const wrongPath = await fixture('quick');
  const mapWave = wrongPath.manifest.execution.waves.find(
    (wave) => wave.mode === 'map',
  );
  mapWave.lanes[0].writeRoot = 'raw/elsewhere';
  wrongPath.manifest.execution = approveExecution(wrongPath.manifest.execution);
  await writeJson(wrongPath.manifestPath, wrongPath.manifest);
  const wrongPathValidation = await validatePacket(wrongPath.packetRoot);
  assert.ok(
    wrongPathValidation.errors.some(
      (error) => error.code === 'LANE_WRITE_PATH_VIOLATION',
    ),
    JSON.stringify(wrongPathValidation, null, 2),
  );

  const silentLane = await fixture('quick');
  const gatherWave = silentLane.manifest.execution.waves.find(
    (wave) => wave.mode === 'gather',
  );
  gatherWave.lanes.push({
    laneId: 'lane-gather-2',
    scope: 'packet/gather-2',
    writeRoot: 'raw/dossiers/gather-2.json',
  });
  silentLane.manifest.execution = approveExecution(
    silentLane.manifest.execution,
  );
  await writeJson(silentLane.manifestPath, silentLane.manifest);
  const silentValidation = await validatePacket(silentLane.packetRoot);
  assert.ok(
    silentValidation.errors.some(
      (error) =>
        error.code === 'MISSING_LANE_OUTCOME' &&
        error.path === 'lane:lane-gather-2',
    ),
    JSON.stringify(silentValidation, null, 2),
  );

  const failedPath = join(silentLane.packetRoot, 'raw/dossiers/gather-2.json');
  await writeJson(failedPath, {
    kind: 'recon.raw-dossier',
    schemaVersion: 1,
    id: 'dossier-gather-2',
    runId: 'run-render',
    waveId: 'wave-gather',
    laneId: 'lane-gather-2',
    mode: 'gather',
    outcome: 'failed',
    allowedInputs: ['source-1'],
    excludedInputs: [],
    findings: [],
    uncertainty: [],
    contradictions: [],
    gaps: [],
  });
  silentLane.manifest.artifacts.push({
    path: 'raw/dossiers/gather-2.json',
    digest: await hashFile(failedPath),
  });
  await writeJson(silentLane.manifestPath, silentLane.manifest);
  const failedArtifact = await validatePacket(silentLane.packetRoot);
  assert.ok(
    failedArtifact.errors.some(
      (error) =>
        error.code === 'MISSING_LANE_OUTCOME' &&
        error.path === 'lane:lane-gather-2',
    ),
    JSON.stringify(failedArtifact, null, 2),
  );

  silentLane.manifest.run.status = 'partial';
  silentLane.manifest.gaps.push({
    id: 'gap-substring',
    code: 'PASS_FAILED',
    message: 'redundant-gather was omitted before writing.',
    material: true,
    sourceIds: [],
    claimIds: [],
    coverageFindingIds: [],
  });
  await writeJson(silentLane.manifestPath, silentLane.manifest);
  const substring = await validatePacket(silentLane.packetRoot);
  assert.ok(
    substring.errors.some(
      (error) =>
        error.code === 'MISSING_LANE_OUTCOME' &&
        error.path === 'lane:lane-gather-2',
    ),
    'a redundant-gather gap must not cover a gather lane',
  );
  silentLane.manifest.gaps.pop();

  silentLane.manifest.gaps.push({
    id: 'gap-lane-gather-2',
    code: 'PASS_FAILED',
    message: 'gather lane lane-gather-2 was cancelled before writing.',
    material: true,
    sourceIds: [],
    claimIds: [],
    coverageFindingIds: [],
  });
  await writeJson(silentLane.manifestPath, silentLane.manifest);
  const honest = await validatePacket(silentLane.packetRoot);
  assert.equal(honest.valid, true, JSON.stringify(honest, null, 2));
  assert.equal(honest.achievedProfile, 'quick');
});

test('a cancelled lane without a typed result downgrades the achieved profile', async () => {
  const packet = await fixture();
  packet.manifest.artifacts = packet.manifest.artifacts.filter(
    (item) => item.path !== 'reviews/semantic.json',
  );
  await writeJson(packet.manifestPath, packet.manifest);
  const validation = await validatePacket(packet.packetRoot);
  assert.equal(validation.valid, false);
  assert.notEqual(validation.achievedProfile, 'standard');
  for (const code of [
    'MISSING_PASS_OUTCOME_EVIDENCE',
    'ACHIEVED_PROFILE_MISMATCH',
  ]) {
    assert.ok(
      validation.errors.some((error) => error.code === code),
      `${code}: ${JSON.stringify(validation, null, 2)}`,
    );
  }
});

test('a missing required pass needs a material outcome gap naming it', async () => {
  const packet = await createPacketFixture({
    profile: 'standard',
    achievedProfile: 'quick',
    status: 'partial',
    failedPassMode: 'semantic-verification',
  });
  roots.push(packet.tempRoot);
  const honest = await validatePacket(packet.packetRoot);
  assert.equal(honest.valid, true, JSON.stringify(honest, null, 2));
  assert.equal(honest.achievedProfile, 'quick');

  packet.manifest.gaps = packet.manifest.gaps.filter(
    (gap) => !gap.message.includes('semantic-verification'),
  );
  await writeJson(packet.manifestPath, packet.manifest);
  const silent = await validatePacket(packet.packetRoot);
  assert.ok(
    silent.errors.some(
      (error) =>
        error.code === 'MISSING_PASS_OUTCOME_EVIDENCE' &&
        error.path === 'pass:semantic-verification',
    ),
    JSON.stringify(silent, null, 2),
  );
});

test('closed source states are ineligible until explicitly gapped', async () => {
  for (const validationState of [
    'unpinned',
    'stale',
    'invalid',
    'unavailable',
  ]) {
    const packet = await fixture('quick');
    packet.manifest.sources[0].validationState = validationState;
    packet.manifest.sources[0].available = validationState !== 'unavailable';
    await writeJson(packet.manifestPath, packet.manifest);
    const validation = await validatePacket(packet.packetRoot);
    assert.ok(
      validation.errors.some(
        (error) => error.code === 'INELIGIBLE_SOURCE_STATE',
      ),
    );
    assert.ok(
      validation.errors.some((error) => error.code === 'MISSING_SOURCE_GAP'),
    );
  }
  const packet = await fixture('quick');
  packet.manifest.sources[0].validationState = 'invented';
  await writeJson(packet.manifestPath, packet.manifest);
  const invalid = await validatePacket(packet.packetRoot);
  assert.ok(
    invalid.errors.some(
      (error) => error.code === 'INVALID_SOURCE_VALIDATION_STATE',
    ),
  );
});

test('reconciliation binds every prior/current state and preserves claim/evidence continuity', async () => {
  const packet = await fixture();
  const reconciliation = await readJson(
    join(packet.packetRoot, 'reviews/reconciliation.json'),
  );
  reconciliation.transitions[0].from = 'provisional';
  await replaceArtifact(packet, 'reviews/reconciliation.json', reconciliation);
  packet.ledger.transitions[0].from = 'provisional';
  await packet.persist();
  const invalid = await validatePacket(packet.packetRoot);
  assert.ok(
    invalid.errors.some(
      (error) => error.code === 'RECONCILIATION_TRANSITION_BINDING_MISMATCH',
    ),
  );

  const duplicate = await fixture();
  const duplicateReconciliation = await readJson(
    join(duplicate.packetRoot, 'reviews/reconciliation.json'),
  );
  duplicateReconciliation.transitions.push(
    structuredClone(duplicateReconciliation.transitions[0]),
  );
  duplicate.ledger.transitions.push(
    structuredClone(duplicate.ledger.transitions[0]),
  );
  await replaceArtifact(
    duplicate,
    'reviews/reconciliation.json',
    duplicateReconciliation,
  );
  await duplicate.persist();
  const duplicateResult = await validatePacket(duplicate.packetRoot);
  assert.ok(
    duplicateResult.errors.some(
      (error) => error.code === 'RECONCILIATION_TRANSITION_BINDING_MISMATCH',
    ),
  );
});

test('material coverage findings bind an affected claim, manifest gap, and reconciliation disposition', async () => {
  const packet = await fixture();
  const coverage = await readJson(
    join(packet.packetRoot, 'reviews/coverage.json'),
  );
  coverage.coverageFindings = [
    {
      id: 'coverage-gap-1',
      gapId: 'gap-missing',
      code: 'MISSING_CORROBORATION',
      message: 'A corroborating source is absent.',
      material: true,
      claimIds: ['claim-1'],
    },
  ];
  await replaceArtifact(packet, 'reviews/coverage.json', coverage);
  const validation = await validatePacket(packet.packetRoot);
  assert.ok(
    validation.errors.some((error) => error.code === 'COVERAGE_GAP_MISMATCH'),
  );
  assert.ok(
    validation.errors.some(
      (error) => error.code === 'COVERAGE_RECONCILIATION_MISMATCH',
    ),
  );
});

test('production reconciliation deterministically consumes the prior ledger and typed results', async () => {
  const packet = await fixture();
  const priorReference = packet.manifest.artifacts.find(
    (item) => item.path === 'raw/drafts/claims-v1.json',
  );
  const priorLedger = await readJson(
    join(packet.packetRoot, priorReference.path),
  );
  const results = await Promise.all(
    ['semantic', 'adversarial', 'coverage'].map(async (kind) =>
      readJson(join(packet.packetRoot, 'reviews', `${kind}.json`)),
    ),
  );
  const first = reconcileLedger({
    priorLedger,
    reviewResults: results,
    priorReference,
  });
  const second = reconcileLedger({
    priorLedger,
    reviewResults: results,
    priorReference,
  });
  assert.deepEqual(first, second);
  assert.equal(first.ledger.revision, priorLedger.revision + 1);
  assert.deepEqual(
    first.ledger.claims[0].evidence,
    priorLedger.claims[0].evidence,
  );
  assert.equal(first.ledger.claims[0].status, 'verified');
  assert.throws(
    () =>
      reconcileLedger({
        priorLedger,
        reviewResults: [...results, structuredClone(results[0])],
        priorReference,
      }),
    /duplicate|shadow/i,
  );
});

test('production reconciliation never verifies a claim with a coverage gap disposition', async () => {
  const packet = await fixture();
  const priorReference = packet.manifest.artifacts.find(
    (item) => item.path === 'raw/drafts/claims-v1.json',
  );
  const priorLedger = await readJson(
    join(packet.packetRoot, priorReference.path),
  );
  const coverage = await readJson(
    join(packet.packetRoot, 'reviews/coverage.json'),
  );
  coverage.dispositions[0].disposition = 'gap';
  await replaceArtifact(packet, 'reviews/coverage.json', coverage);

  const { ledger, reconciliation } = reconcileLedger({
    priorLedger,
    reviewResults: await coreReviewResults(packet),
    priorReference,
  });
  assert.equal(ledger.claims[0].status, 'supported');
  assert.notEqual(ledger.claims[0].status, 'verified');
  assert.deepEqual(
    reconciliation.transitions.filter(
      (transition) => transition.claimId === 'claim-1',
    ),
    [],
  );
});

test('production reconciliation downgrades a previously verified claim with a coverage gap', async () => {
  const packet = await fixture();
  const priorReference = packet.manifest.artifacts.find(
    (item) => item.path === 'raw/drafts/claims-v1.json',
  );
  const priorLedger = await readJson(
    join(packet.packetRoot, priorReference.path),
  );
  priorLedger.claims[0].status = 'verified';
  priorLedger.transitions[0] = {
    claimId: 'claim-1',
    from: 'provisional',
    to: 'verified',
  };
  await replaceArtifact(packet, priorReference.path, priorLedger);

  const coverage = await readJson(
    join(packet.packetRoot, 'reviews/coverage.json'),
  );
  coverage.dispositions[0].disposition = 'gap';
  await replaceArtifact(packet, 'reviews/coverage.json', coverage);

  const { ledger, reconciliation } = reconcileLedger({
    priorLedger,
    reviewResults: await coreReviewResults(packet),
    priorReference,
  });
  assert.equal(ledger.claims[0].status, 'unresolved');
  assert.deepEqual(
    reconciliation.transitions.filter(
      (transition) => transition.claimId === 'claim-1',
    ),
    [{ claimId: 'claim-1', from: 'verified', to: 'unresolved' }],
  );

  await replaceArtifact(packet, 'claims.json', ledger);
  await replaceArtifact(packet, 'reviews/reconciliation.json', reconciliation);
  const compiled = await compileValidatedRun(packet.packetRoot);
  assert.equal(compiled.valid, true, JSON.stringify(compiled, null, 2));
  assert.equal(compiled.validatedRun.ledger.claims[0].status, 'unresolved');
});

test('production reconciliation retains a challenged claim as contested through compilation', async () => {
  const packet = await fixture();
  const priorReference = packet.manifest.artifacts.find(
    (item) => item.path === 'raw/drafts/claims-v1.json',
  );
  const priorLedger = await readJson(
    join(packet.packetRoot, priorReference.path),
  );
  const adversarial = await readJson(
    join(packet.packetRoot, 'reviews/adversarial.json'),
  );
  adversarial.dispositions[0].disposition = 'challenged';
  await replaceArtifact(packet, 'reviews/adversarial.json', adversarial);

  const { ledger, reconciliation } = reconcileLedger({
    priorLedger,
    reviewResults: await coreReviewResults(packet),
    priorReference,
  });
  assert.equal(ledger.claims[0].status, 'contested');
  assert.deepEqual(
    reconciliation.transitions.filter(
      (transition) => transition.claimId === 'claim-1',
    ),
    [{ claimId: 'claim-1', from: 'supported', to: 'contested' }],
  );

  packet.manifest.run.status = 'partial';
  packet.manifest.gaps.push({
    id: 'gap-adversarial-challenge',
    code: 'UNRESOLVED_CHALLENGE',
    message: 'The adversarial review retained a material contradiction.',
    material: true,
    sourceIds: [],
    claimIds: ['claim-1'],
    coverageFindingIds: [],
  });
  await replaceArtifact(packet, 'claims.json', ledger);
  await replaceArtifact(packet, 'reviews/reconciliation.json', reconciliation);

  const compiled = await compileValidatedRun(packet.packetRoot);
  assert.equal(compiled.valid, true, JSON.stringify(compiled, null, 2));
  assert.equal(compiled.validatedRun.ledger.claims[0].status, 'contested');
});

test('production reconciliation converts a typed rejection into an unsupported claim transition through compilation', async () => {
  const packet = await fixture();
  const priorReference = packet.manifest.artifacts.find(
    (item) => item.path === 'raw/drafts/claims-v1.json',
  );
  const priorLedger = await readJson(
    join(packet.packetRoot, priorReference.path),
  );
  const brief = createReviewBrief({
    id: 'brief-verify-removal',
    mode: 'verify',
    createdAt: '2026-08-31T00:03:00.000Z',
    manifest: packet.manifest,
    ledger: priorLedger,
    claimIds: ['claim-1', 'claim-2'],
  });
  const briefReference = await replaceArtifact(
    packet,
    'reviews/briefs/verify.json',
    brief,
  );
  const semantic = await readJson(
    join(packet.packetRoot, 'reviews/semantic.json'),
  );
  semantic.brief = { ...briefReference };
  semantic.permittedInputs = [{ ...briefReference }];
  semantic.dispositions.push({
    claimId: 'claim-2',
    disposition: 'rejected',
  });
  await replaceArtifact(packet, 'reviews/semantic.json', semantic);

  const { ledger, reconciliation } = reconcileLedger({
    priorLedger,
    reviewResults: await coreReviewResults(packet),
    priorReference,
  });
  const claim2 = ledger.claims.find((claim) => claim.id === 'claim-2');
  assert.equal(claim2?.status, 'unsupported');
  assert.deepEqual(
    reconciliation.transitions.filter((t) => t.claimId === 'claim-2'),
    [
      {
        claimId: 'claim-2',
        from: 'contested',
        to: 'unsupported',
      },
    ],
  );

  await replaceArtifact(packet, 'claims.json', ledger);
  await replaceArtifact(packet, 'reviews/reconciliation.json', reconciliation);
  const compiled = await compileValidatedRun(packet.packetRoot);
  assert.equal(compiled.valid, true, JSON.stringify(compiled, null, 2));
  assert.equal(
    compiled.validatedRun.ledger.claims.find((claim) => claim.id === 'claim-2')
      ?.status,
    'unsupported',
  );
});

test('reconciling a rejected key claim transitions it to unsupported and renders it accurately', async () => {
  const packet = await fixture();
  const priorReference = packet.manifest.artifacts.find(
    (item) => item.path === 'raw/drafts/claims-v1.json',
  );
  const priorLedger = await readJson(
    join(packet.packetRoot, priorReference.path),
  );
  const semantic = await readJson(
    join(packet.packetRoot, 'reviews/semantic.json'),
  );
  semantic.dispositions.find((d) => d.claimId === 'claim-1').disposition =
    'rejected';
  await replaceArtifact(packet, 'reviews/semantic.json', semantic);

  const { ledger, reconciliation } = reconcileLedger({
    priorLedger,
    reviewResults: await coreReviewResults(packet),
    priorReference,
  });
  assert.equal(
    ledger.claims.find((claim) => claim.id === 'claim-1')?.status,
    'unsupported',
  );
  assert.deepEqual(
    reconciliation.transitions.filter((t) => t.claimId === 'claim-1'),
    [{ claimId: 'claim-1', from: 'supported', to: 'unsupported' }],
  );

  await replaceArtifact(packet, 'claims.json', ledger);
  await replaceArtifact(packet, 'reviews/reconciliation.json', reconciliation);
  const compiled = await compileValidatedRun(packet.packetRoot);
  assert.equal(compiled.valid, true, JSON.stringify(compiled, null, 2));

  const rendered = renderPacketDocument(compiled.validatedRun);
  assert.match(rendered, /\*\*unsupported\*\*/);
  assert.match(
    rendered,
    /## Key Claims[\s\S]*### claim-1[\s\S]*- \*\*State:\*\* \*\*unsupported\*\*/,
  );
  assert.match(
    rendered,
    /## Contradictions and Qualifications[\s\S]*\*\*claim-1\*\* \(unsupported\)/,
  );
});

test('production reconciliation transitions uncertain and incomplete provisional claims to an honest unresolved partial', async () => {
  const scenarios = [
    {
      name: 'uncertain semantic review',
      reviewPath: 'reviews/semantic.json',
      mutate(review) {
        review.dispositions[0].disposition = 'uncertain';
      },
    },
    {
      name: 'missing coverage disposition',
      reviewPath: 'reviews/coverage.json',
      mutate(review) {
        review.dispositions = [];
      },
    },
  ];

  for (const scenario of scenarios) {
    const packet = await fixture();
    const priorReference = packet.manifest.artifacts.find(
      (item) => item.path === 'raw/drafts/claims-v1.json',
    );
    const priorLedger = await readJson(
      join(packet.packetRoot, priorReference.path),
    );
    priorLedger.claims[0].status = 'provisional';
    priorLedger.transitions = priorLedger.transitions.filter(
      (transition) => transition.claimId !== 'claim-1',
    );
    await replaceArtifact(packet, priorReference.path, priorLedger);

    const review = await readJson(join(packet.packetRoot, scenario.reviewPath));
    scenario.mutate(review);
    await replaceArtifact(packet, scenario.reviewPath, review);

    const { ledger, reconciliation } = reconcileLedger({
      priorLedger,
      reviewResults: await coreReviewResults(packet),
      priorReference,
    });
    assert.equal(ledger.claims[0].status, 'unresolved', scenario.name);
    assert.deepEqual(
      reconciliation.transitions.filter(
        (transition) => transition.claimId === 'claim-1',
      ),
      [
        {
          claimId: 'claim-1',
          from: 'provisional',
          to: 'unresolved',
        },
      ],
      scenario.name,
    );

    packet.manifest.run.status = 'partial';
    packet.manifest.gaps.push({
      id: `gap-${scenario.name.replaceAll(' ', '-')}`,
      code: 'INCOMPLETE_REVIEW',
      message: `Claim review remained incomplete: ${scenario.name}.`,
      material: true,
      sourceIds: [],
      claimIds: ['claim-1'],
      coverageFindingIds: [],
    });
    await replaceArtifact(packet, 'claims.json', ledger);
    await replaceArtifact(
      packet,
      'reviews/reconciliation.json',
      reconciliation,
    );

    const compiled = await compileValidatedRun(packet.packetRoot);
    assert.equal(
      compiled.valid,
      true,
      `${scenario.name}: ${JSON.stringify(compiled, null, 2)}`,
    );
    assert.equal(compiled.status, 'partial', scenario.name);
    assert.equal(
      compiled.validatedRun.ledger.claims[0].status,
      'unresolved',
      scenario.name,
    );
  }
});

test('production reconciliation transitions a provisional claim omitted by every review to unresolved', async () => {
  const packet = await fixture();
  const priorReference = packet.manifest.artifacts.find(
    (item) => item.path === 'raw/drafts/claims-v1.json',
  );
  const priorLedger = await readJson(
    join(packet.packetRoot, priorReference.path),
  );
  priorLedger.claims[0].status = 'provisional';
  priorLedger.transitions = priorLedger.transitions.filter(
    (transition) => transition.claimId !== 'claim-1',
  );
  await replaceArtifact(packet, priorReference.path, priorLedger);

  for (const kind of ['semantic', 'adversarial', 'coverage']) {
    const relative = `reviews/${kind}.json`;
    const review = await readJson(join(packet.packetRoot, relative));
    review.dispositions = review.dispositions.filter(
      (disposition) => disposition.claimId !== 'claim-1',
    );
    await replaceArtifact(packet, relative, review);
  }

  const { ledger, reconciliation } = reconcileLedger({
    priorLedger,
    reviewResults: await coreReviewResults(packet),
    priorReference,
  });
  assert.equal(ledger.claims[0].status, 'unresolved');
  assert.deepEqual(
    reconciliation.transitions.filter(
      (transition) => transition.claimId === 'claim-1',
    ),
    [{ claimId: 'claim-1', from: 'provisional', to: 'unresolved' }],
  );

  packet.manifest.run.status = 'partial';
  packet.manifest.gaps.push({
    id: 'gap-claim-omitted-by-all-reviews',
    code: 'INCOMPLETE_REVIEW',
    message: 'The claim was omitted by every required review.',
    material: true,
    sourceIds: [],
    claimIds: ['claim-1'],
    coverageFindingIds: [],
  });
  await replaceArtifact(packet, 'claims.json', ledger);
  await replaceArtifact(packet, 'reviews/reconciliation.json', reconciliation);
  const compiled = await compileValidatedRun(packet.packetRoot);
  assert.equal(compiled.valid, true, JSON.stringify(compiled, null, 2));
  assert.equal(compiled.status, 'partial');
  assert.equal(compiled.validatedRun.ledger.claims[0].status, 'unresolved');
});

test('production reconciliation transitions a provisional claim with a non-material coverage gap to unresolved', async () => {
  const packet = await fixture();
  const priorReference = packet.manifest.artifacts.find(
    (item) => item.path === 'raw/drafts/claims-v1.json',
  );
  const priorLedger = await readJson(
    join(packet.packetRoot, priorReference.path),
  );
  priorLedger.claims[0].status = 'provisional';
  priorLedger.transitions = priorLedger.transitions.filter(
    (transition) => transition.claimId !== 'claim-1',
  );
  await replaceArtifact(packet, priorReference.path, priorLedger);

  const coverage = await readJson(
    join(packet.packetRoot, 'reviews/coverage.json'),
  );
  coverage.dispositions[0].disposition = 'gap';
  await replaceArtifact(packet, 'reviews/coverage.json', coverage);

  const { ledger, reconciliation } = reconcileLedger({
    priorLedger,
    reviewResults: await coreReviewResults(packet),
    priorReference,
  });
  assert.equal(ledger.claims[0].status, 'unresolved');
  assert.deepEqual(
    reconciliation.transitions.filter(
      (transition) => transition.claimId === 'claim-1',
    ),
    [{ claimId: 'claim-1', from: 'provisional', to: 'unresolved' }],
  );

  packet.manifest.run.status = 'partial';
  packet.manifest.gaps.push({
    id: 'gap-claim-coverage-gap',
    code: 'COVERAGE_GAP',
    message: 'The claim was subject to a coverage gap.',
    material: true,
    sourceIds: [],
    claimIds: ['claim-1'],
    coverageFindingIds: [],
  });
  await replaceArtifact(packet, 'claims.json', ledger);
  await replaceArtifact(packet, 'reviews/reconciliation.json', reconciliation);
  const compiled = await compileValidatedRun(packet.packetRoot);
  assert.equal(compiled.valid, true, JSON.stringify(compiled, null, 2));
  assert.equal(compiled.status, 'partial');
  assert.equal(compiled.validatedRun.ledger.claims[0].status, 'unresolved');
});

test('production reconciliation transitions a provisional claim with a material coverage gap to contested', async () => {
  const packet = await fixture();
  const priorReference = packet.manifest.artifacts.find(
    (item) => item.path === 'raw/drafts/claims-v1.json',
  );
  const priorLedger = await readJson(
    join(packet.packetRoot, priorReference.path),
  );
  priorLedger.claims[0].status = 'provisional';
  priorLedger.transitions = priorLedger.transitions.filter(
    (transition) => transition.claimId !== 'claim-1',
  );
  await replaceArtifact(packet, priorReference.path, priorLedger);

  const coverage = await readJson(
    join(packet.packetRoot, 'reviews/coverage.json'),
  );
  coverage.dispositions[0].disposition = 'gap';
  coverage.coverageFindings = [
    {
      id: 'coverage-gap-material',
      gapId: 'gap-material-coverage',
      code: 'MISSING_CORROBORATION',
      message: 'A corroborating source is absent.',
      material: true,
      claimIds: ['claim-1'],
    },
  ];
  await replaceArtifact(packet, 'reviews/coverage.json', coverage);

  const { ledger, reconciliation } = reconcileLedger({
    priorLedger,
    reviewResults: await coreReviewResults(packet),
    priorReference,
  });
  assert.equal(ledger.claims[0].status, 'contested');
  assert.deepEqual(
    reconciliation.transitions.filter(
      (transition) => transition.claimId === 'claim-1',
    ),
    [{ claimId: 'claim-1', from: 'provisional', to: 'contested' }],
  );

  packet.manifest.run.status = 'partial';
  packet.manifest.gaps.push({
    id: 'gap-material-coverage',
    code: 'MISSING_CORROBORATION',
    message: 'A corroborating source is absent.',
    material: true,
    sourceIds: [],
    claimIds: ['claim-1'],
    coverageFindingIds: ['coverage-gap-material'],
  });
  await replaceArtifact(packet, 'claims.json', ledger);
  await replaceArtifact(packet, 'reviews/reconciliation.json', reconciliation);
  const compiled = await compileValidatedRun(packet.packetRoot);
  assert.equal(compiled.valid, true, JSON.stringify(compiled, null, 2));
  assert.equal(compiled.status, 'partial');
  assert.equal(compiled.validatedRun.ledger.claims[0].status, 'contested');
});

test('production reconciliation promotes an unresolved claim after complete independent review while preserving unsupported claims', async () => {
  const packet = await fixture();
  const priorReference = packet.manifest.artifacts.find(
    (item) => item.path === 'raw/drafts/claims-v1.json',
  );
  const priorLedger = await readJson(
    join(packet.packetRoot, priorReference.path),
  );
  const reviewResults = await coreReviewResults(packet);
  const unsupportedPriorLedger = structuredClone(priorLedger);
  unsupportedPriorLedger.claims[0].status = 'unsupported';
  unsupportedPriorLedger.transitions[0].to = 'unsupported';
  const unsupported = reconcileLedger({
    priorLedger: unsupportedPriorLedger,
    reviewResults,
    priorReference,
  });
  assert.equal(unsupported.ledger.claims[0].status, 'unsupported');
  assert.deepEqual(
    unsupported.reconciliation.transitions.filter(
      (transition) => transition.claimId === 'claim-1',
    ),
    [],
  );

  priorLedger.claims[0].status = 'unresolved';
  priorLedger.transitions[0] = {
    claimId: 'claim-1',
    from: 'provisional',
    to: 'unresolved',
  };
  await replaceArtifact(packet, priorReference.path, priorLedger);

  const { ledger, reconciliation } = reconcileLedger({
    priorLedger,
    reviewResults,
    priorReference,
  });
  assert.equal(ledger.claims[0].status, 'verified');
  assert.deepEqual(
    reconciliation.transitions.filter(
      (transition) => transition.claimId === 'claim-1',
    ),
    [{ claimId: 'claim-1', from: 'unresolved', to: 'verified' }],
  );

  await replaceArtifact(packet, 'claims.json', ledger);
  await replaceArtifact(packet, 'reviews/reconciliation.json', reconciliation);
  const compiled = await compileValidatedRun(packet.packetRoot);
  assert.equal(compiled.valid, true, JSON.stringify(compiled, null, 2));
  assert.equal(compiled.validatedRun.ledger.claims[0].status, 'verified');
});

test('production reconciliation retains exact incorporated review evidence and rejects dishonest links', async () => {
  const packet = await fixture();
  const priorReference = packet.manifest.artifacts.find(
    (item) => item.path === 'raw/drafts/claims-v1.json',
  );
  const priorLedger = await readJson(
    join(packet.packetRoot, priorReference.path),
  );
  const results = await Promise.all(
    ['semantic', 'adversarial', 'coverage'].map(async (kind) =>
      readJson(join(packet.packetRoot, 'reviews', `${kind}.json`)),
    ),
  );
  const reviewEvidence = structuredClone(priorLedger.evidence[0]);
  reviewEvidence.id = 'evidence-review-1';

  const incorporatedResults = structuredClone(results);
  incorporatedResults[0].dispositions.push({
    claimId: 'claim-2',
    disposition: 'affirmed',
  });
  incorporatedResults[0].newEvidence = [reviewEvidence];
  incorporatedResults[0].evidenceAssociations = [
    {
      evidenceId: reviewEvidence.id,
      claimId: 'claim-1',
      relation: 'supports',
    },
  ];
  const incorporated = reconcileLedger({
    priorLedger,
    reviewResults: incorporatedResults,
    priorReference,
  });
  assert.deepEqual(incorporated.ledger.evidence.at(-1), reviewEvidence);
  assert.deepEqual(incorporated.ledger.claims[0].evidence.at(-1), {
    evidenceId: reviewEvidence.id,
    relation: 'supports',
  });
  assert.deepEqual(
    incorporated.ledger.claims[1].evidence,
    priorLedger.claims[1].evidence,
  );

  const withoutNewEvidence = reconcileLedger({
    priorLedger,
    reviewResults: results,
    priorReference,
  });
  assert.deepEqual(withoutNewEvidence.ledger.evidence, priorLedger.evidence);
  assert.deepEqual(
    withoutNewEvidence.ledger.claims[0].evidence,
    priorLedger.claims[0].evidence,
  );

  const duplicate = structuredClone(results);
  duplicate[0].newEvidence = [reviewEvidence, structuredClone(reviewEvidence)];
  duplicate[0].evidenceAssociations = [
    {
      evidenceId: reviewEvidence.id,
      claimId: 'claim-1',
      relation: 'supports',
    },
  ];
  assert.throws(
    () =>
      reconcileLedger({
        priorLedger,
        reviewResults: duplicate,
        priorReference,
      }),
    /duplicate evidence/i,
  );

  const conflicting = structuredClone(results);
  conflicting[0].newEvidence = [reviewEvidence];
  conflicting[0].evidenceAssociations = [
    {
      evidenceId: reviewEvidence.id,
      claimId: 'claim-1',
      relation: 'supports',
    },
  ];
  const conflictingEvidence = structuredClone(reviewEvidence);
  conflictingEvidence.displayExcerpt = 'conflicting bytes';
  conflicting[1].newEvidence = [conflictingEvidence];
  conflicting[1].evidenceAssociations = [
    {
      evidenceId: reviewEvidence.id,
      claimId: 'claim-1',
      relation: 'context',
    },
  ];
  assert.throws(
    () =>
      reconcileLedger({
        priorLedger,
        reviewResults: conflicting,
        priorReference,
      }),
    /conflicting evidence/i,
  );

  const unincorporated = structuredClone(results);
  unincorporated[0].newEvidence = [reviewEvidence];
  unincorporated[0].evidenceAssociations = [];
  assert.throws(
    () =>
      reconcileLedger({
        priorLedger,
        reviewResults: unincorporated,
        priorReference,
      }),
    /unincorporated evidence/i,
  );

  const crossClaim = structuredClone(results);
  crossClaim[0].newEvidence = [reviewEvidence];
  crossClaim[0].evidenceAssociations = [
    {
      evidenceId: reviewEvidence.id,
      claimId: 'claim-2',
      relation: 'supports',
    },
  ];
  assert.throws(
    () =>
      reconcileLedger({
        priorLedger,
        reviewResults: crossClaim,
        priorReference,
      }),
    /association.*disposition/i,
  );

  const duplicateAssociation = structuredClone(results);
  duplicateAssociation[0].newEvidence = [reviewEvidence];
  duplicateAssociation[0].evidenceAssociations = [
    {
      evidenceId: reviewEvidence.id,
      claimId: 'claim-1',
      relation: 'supports',
    },
    {
      evidenceId: reviewEvidence.id,
      claimId: 'claim-1',
      relation: 'supports',
    },
  ];
  assert.throws(
    () =>
      reconcileLedger({
        priorLedger,
        reviewResults: duplicateAssociation,
        priorReference,
      }),
    /duplicate evidence association/i,
  );

  const inventedAssociation = structuredClone(results);
  inventedAssociation[0].evidenceAssociations = [
    {
      evidenceId: 'evidence-not-supplied',
      claimId: 'claim-1',
      relation: 'supports',
    },
  ];
  assert.throws(
    () =>
      reconcileLedger({
        priorLedger,
        reviewResults: inventedAssociation,
        priorReference,
      }),
    /association.*new evidence/i,
  );

  const invalid = structuredClone(results);
  invalid[0].newEvidence = [structuredClone(reviewEvidence)];
  delete invalid[0].newEvidence[0].locator;
  assert.throws(
    () =>
      reconcileLedger({
        priorLedger,
        reviewResults: invalid,
        priorReference,
      }),
    /schema-invalid review/i,
  );

  const inventedLinkLedger = structuredClone(priorLedger);
  inventedLinkLedger.claims[0].evidence.push({
    evidenceId: 'evidence-invented',
    relation: 'context',
  });
  assert.throws(
    () =>
      reconcileLedger({
        priorLedger: inventedLinkLedger,
        reviewResults: results,
        priorReference,
      }),
    /invented evidence link/i,
  );
});

test('persisted reconciliation compiles exact review evidence associations against immutable briefs', async () => {
  const packet = await fixture();
  const priorReference = packet.manifest.artifacts.find(
    (item) => item.path === 'raw/drafts/claims-v1.json',
  );
  const priorLedger = await readJson(
    join(packet.packetRoot, priorReference.path),
  );
  const persistedResults = await Promise.all(
    ['semantic', 'adversarial', 'coverage'].map(async (kind) => {
      const relative = `reviews/${kind}.json`;
      return {
        value: await readJson(join(packet.packetRoot, relative)),
        reference: packet.manifest.artifacts.find(
          (item) => item.path === relative,
        ),
      };
    }),
  );
  const semantic = persistedResults[0].value;
  const reviewEvidence = structuredClone(priorLedger.evidence[0]);
  reviewEvidence.id = 'evidence-review-persisted';
  semantic.newEvidence = [reviewEvidence];
  semantic.evidenceAssociations = [
    {
      evidenceId: reviewEvidence.id,
      claimId: 'claim-1',
      relation: 'supports',
    },
  ];
  await replaceArtifact(packet, 'reviews/semantic.json', semantic);

  const reviewResults = persistedResults.map(({ value, reference }) => ({
    ...value,
    artifactReference: { ...reference },
  }));
  const { ledger, reconciliation } = reconcileLedger({
    priorLedger,
    reviewResults,
    priorReference,
  });
  await replaceArtifact(packet, 'claims.json', ledger);
  await replaceArtifact(packet, 'reviews/reconciliation.json', reconciliation);

  const compiled = await compileValidatedRun(packet.packetRoot);
  assert.equal(compiled.valid, true, JSON.stringify(compiled, null, 2));
  assert.deepEqual(compiled.validatedRun.ledger.claims[0].evidence.at(-1), {
    evidenceId: reviewEvidence.id,
    relation: 'supports',
  });
  assert.deepEqual(
    compiled.validatedRun.ledger.claims[1].evidence,
    priorLedger.claims[1].evidence,
  );
});

test('claim assurance and reconciliation reject a review from an unapproved lane', async () => {
  const packet = await fixture();
  const semantic = await readJson(
    join(packet.packetRoot, 'reviews/semantic.json'),
  );
  semantic.reviewerLane = 'lane-semantic-rogue';
  await replaceArtifact(packet, 'reviews/semantic.json', semantic);

  const validation = await validatePacket(packet.packetRoot);
  assert.ok(
    validation.errors.some((error) => error.code === 'UNAPPROVED_LANE'),
    JSON.stringify(validation, null, 2),
  );
});

test('thorough-only assurance passes use claim-bearing typed results', async () => {
  const packet = await fixture('thorough');
  for (const reviewKind of [
    'redundant-verification',
    'contradiction-resolution',
  ]) {
    const reference = packet.manifest.artifacts.find(
      (item) => item.path === `reviews/${reviewKind}.json`,
    );
    const artifact = await readJson(join(packet.packetRoot, reference.path));
    assert.equal(artifact.kind, 'recon.review-result');
    assert.equal(artifact.reviewKind, reviewKind);
    assert.ok(artifact.dispositions.length > 0);
    assert.ok(artifact.permittedInputs.length > 0);
  }
  const validation = await validatePacket(packet.packetRoot);
  assert.equal(validation.achievedProfile, 'thorough');
});

test('standard reconciliation cannot reset the canonical ledger to revision one', async () => {
  const packet = await fixture();
  packet.ledger.revision = 1;
  await packet.persist();

  const validation = await validatePacket(packet.packetRoot);
  assert.ok(
    validation.errors.some(
      (error) => error.code === 'RECONCILIATION_REVISION_MISMATCH',
    ),
    JSON.stringify(validation, null, 2),
  );
});

test('reconciliation cannot remove a contested claim without a typed review authorization', async () => {
  const packet = await fixture();
  packet.ledger.claims = packet.ledger.claims.filter(
    (claim) => claim.id !== 'claim-2',
  );
  const reconciliation = await readJson(
    join(packet.packetRoot, 'reviews/reconciliation.json'),
  );
  reconciliation.removals = ['claim-2'];
  await replaceArtifact(packet, 'reviews/reconciliation.json', reconciliation);
  await packet.persist();

  const validation = await validatePacket(packet.packetRoot);
  assert.ok(
    validation.errors.some(
      (error) => error.code === 'UNAUTHORIZED_CLAIM_REMOVAL',
    ),
    JSON.stringify(validation, null, 2),
  );
});

test('a complete typed rejection can explicitly authorize prior claim removal', async () => {
  const packet = await fixture();
  const priorReference = packet.manifest.artifacts.find(
    (item) => item.path === 'raw/drafts/claims-v1.json',
  );
  const priorLedger = await readJson(
    join(packet.packetRoot, priorReference.path),
  );
  const brief = createReviewBrief({
    id: 'brief-verify-removal',
    mode: 'verify',
    createdAt: '2026-08-31T00:03:00.000Z',
    manifest: packet.manifest,
    ledger: priorLedger,
    claimIds: ['claim-1', 'claim-2'],
  });
  const briefRef = await replaceArtifact(
    packet,
    'reviews/briefs/verify.json',
    brief,
  );
  const semantic = await readJson(
    join(packet.packetRoot, 'reviews/semantic.json'),
  );
  semantic.brief = { ...briefRef };
  semantic.permittedInputs = [{ ...briefRef }];
  semantic.dispositions.push({
    claimId: 'claim-2',
    disposition: 'rejected',
  });
  await replaceArtifact(packet, 'reviews/semantic.json', semantic);

  packet.ledger.claims = packet.ledger.claims.filter(
    (claim) => claim.id !== 'claim-2',
  );
  const reconciliation = await readJson(
    join(packet.packetRoot, 'reviews/reconciliation.json'),
  );
  reconciliation.removals = ['claim-2'];
  reconciliation.removalDispositions = [
    {
      claimId: 'claim-2',
      reviewId: 'review-semantic',
      disposition: 'rejected',
    },
  ];
  await replaceArtifact(packet, 'reviews/reconciliation.json', reconciliation);
  await packet.persist();

  const validation = await validatePacket(packet.packetRoot);
  assert.equal(validation.valid, true, JSON.stringify(validation, null, 2));
  assert.equal(
    packet.ledger.claims.some((claim) => claim.id === 'claim-2'),
    false,
  );
});

test('a shadow reconciliation cannot authorize removal from a forged prior ledger', async () => {
  const packet = await fixture();
  const actualPriorReference = packet.manifest.artifacts.find(
    (item) => item.path === 'raw/drafts/claims-v1.json',
  );
  const forgedPrior = await readJson(
    join(packet.packetRoot, actualPriorReference.path),
  );
  forgedPrior.claims.find((claim) => claim.id === 'claim-2').statement =
    'Forged prior statement that was never canonical.';
  const forgedPriorPath = join(
    packet.packetRoot,
    'raw/drafts/claims-forged.json',
  );
  await writeJson(forgedPriorPath, forgedPrior);
  const forgedPriorReference = {
    path: 'raw/drafts/claims-forged.json',
    digest: await hashFile(forgedPriorPath),
  };

  const brief = createReviewBrief({
    id: 'brief-verify-shadow',
    mode: 'verify',
    createdAt: '2026-08-31T00:03:00.000Z',
    manifest: packet.manifest,
    ledger: forgedPrior,
    claimIds: ['claim-1', 'claim-2'],
  });
  const briefRef = await replaceArtifact(
    packet,
    'reviews/briefs/verify.json',
    brief,
  );
  const semantic = await readJson(
    join(packet.packetRoot, 'reviews/semantic.json'),
  );
  semantic.brief = { ...briefRef };
  semantic.permittedInputs = [{ ...briefRef }];
  semantic.dispositions.push({
    claimId: 'claim-2',
    disposition: 'rejected',
  });
  await replaceArtifact(packet, 'reviews/semantic.json', semantic);

  packet.ledger.claims = packet.ledger.claims.filter(
    (claim) => claim.id !== 'claim-2',
  );
  const terminal = await readJson(
    join(packet.packetRoot, 'reviews/reconciliation.json'),
  );
  terminal.removals = ['claim-2'];
  terminal.removalDispositions = [
    {
      claimId: 'claim-2',
      reviewId: 'review-semantic',
      disposition: 'rejected',
    },
  ];
  await replaceArtifact(packet, 'reviews/reconciliation.json', terminal);

  const shadow = structuredClone(terminal);
  shadow.id = 'review-reconciliation-shadow';
  shadow.inputLedger = {
    ...forgedPriorReference,
    revision: forgedPrior.revision,
  };
  const shadowPath = join(
    packet.packetRoot,
    'reviews/reconciliation-shadow.json',
  );
  await writeJson(shadowPath, shadow);
  const shadowReference = {
    path: 'reviews/reconciliation-shadow.json',
    digest: await hashFile(shadowPath),
  };
  const terminalIndex = packet.manifest.artifacts.findIndex(
    (item) => item.path === 'reviews/reconciliation.json',
  );
  packet.manifest.artifacts.splice(
    terminalIndex,
    0,
    forgedPriorReference,
    shadowReference,
  );
  await packet.persist();

  const validation = await validatePacket(packet.packetRoot);
  assert.ok(
    validation.errors.some((error) => error.code === 'SHADOW_RECONCILIATION'),
    JSON.stringify(validation, null, 2),
  );
});

async function addMaterialCoverageGap(packet, { downgrade }) {
  const coverage = await readJson(
    join(packet.packetRoot, 'reviews/coverage.json'),
  );
  coverage.coverageFindings = [
    {
      id: 'coverage-gap-material',
      gapId: 'gap-material-coverage',
      code: 'MISSING_CORROBORATION',
      message: 'A corroborating source is absent.',
      material: true,
      claimIds: ['claim-1'],
    },
  ];
  if (downgrade) coverage.dispositions[0].disposition = 'gap';
  await replaceArtifact(packet, 'reviews/coverage.json', coverage);
  packet.manifest.gaps.push({
    id: 'gap-material-coverage',
    code: 'MISSING_CORROBORATION',
    message: 'A corroborating source is absent.',
    material: true,
    sourceIds: [],
    claimIds: ['claim-1'],
    coverageFindingIds: ['coverage-gap-material'],
  });
  packet.manifest.run.status = 'partial';
  const reconciliation = await readJson(
    join(packet.packetRoot, 'reviews/reconciliation.json'),
  );
  reconciliation.coverageDispositions = [
    {
      findingId: 'coverage-gap-material',
      gapId: 'gap-material-coverage',
      disposition: 'accepted-gap',
    },
  ];
  if (downgrade) {
    reconciliation.transitions[0] = {
      claimId: 'claim-1',
      from: 'supported',
      to: 'contested',
    };
    packet.ledger.transitions = structuredClone(reconciliation.transitions);
    packet.ledger.claims[0].status = 'contested';
  }
  await replaceArtifact(packet, 'reviews/reconciliation.json', reconciliation);
  await packet.persist();
}

test('material coverage gaps prevent verified assurance for every affected claim', async () => {
  const packet = await fixture();
  await addMaterialCoverageGap(packet, { downgrade: false });

  const validation = await validatePacket(packet.packetRoot);
  assert.ok(
    validation.errors.some(
      (error) => error.code === 'MATERIAL_COVERAGE_ASSURANCE_EXCEEDED',
    ),
    JSON.stringify(validation, null, 2),
  );
});

test('material coverage gaps publish an honest partial at the exact downgraded claim state', async () => {
  const packet = await fixture();
  await addMaterialCoverageGap(packet, { downgrade: true });

  const validation = await validatePacket(packet.packetRoot);
  assert.equal(validation.valid, true, JSON.stringify(validation, null, 2));
  assert.equal(packet.ledger.claims[0].status, 'contested');
  assert.equal(validation.status, 'partial');
});

test('exactly gapped stale sources remain auditable below supported assurance', async () => {
  const packet = await fixture('quick');
  packet.manifest.sources[0].validationState = 'stale';
  packet.ledger.evidence[0].locatorValidation.status = 'stale';
  packet.ledger.claims[0].status = 'contested';
  packet.ledger.transitions[0] = {
    claimId: 'claim-1',
    from: 'provisional',
    to: 'contested',
  };
  packet.manifest.run.status = 'partial';
  packet.manifest.gaps.push({
    id: 'gap-stale-source',
    code: 'SOURCE_STALE',
    message: 'The source changed after collection.',
    material: true,
    sourceIds: ['source-1'],
    claimIds: ['claim-1', 'claim-2'],
    coverageFindingIds: [],
  });
  await packet.persist();

  const validation = await validatePacket(packet.packetRoot);
  assert.equal(validation.valid, true, JSON.stringify(validation, null, 2));
  assert.equal(validation.status, 'partial');
  assert.equal(packet.ledger.claims[0].status, 'contested');
});

test('ineligible audit evidence remains subject to secret-safe persistence', async () => {
  for (const validationState of ['stale', 'invalid', 'unavailable']) {
    const packet = await fixture('quick');
    packet.manifest.sources[0].validationState = validationState;
    packet.manifest.sources[0].available = validationState !== 'unavailable';
    packet.ledger.evidence[0].locatorValidation.status =
      validationState === 'unavailable' ? 'invalid' : validationState;
    packet.ledger.evidence[0].displayExcerpt =
      'api_key=round-four-secret-value';
    for (const claim of packet.ledger.claims) claim.status = 'contested';
    packet.ledger.transitions = packet.ledger.claims.map((claim) => ({
      claimId: claim.id,
      from: 'provisional',
      to: 'contested',
    }));
    packet.manifest.run.status = 'partial';
    packet.manifest.gaps.push({
      id: `gap-${validationState}-source`,
      code: 'SOURCE_INELIGIBLE',
      message: 'The source is retained only for audit.',
      material: true,
      sourceIds: ['source-1'],
      claimIds: ['claim-1', 'claim-2'],
      coverageFindingIds: [],
    });
    await packet.persist();

    const validation = await validatePacket(packet.packetRoot);
    assert.ok(
      validation.errors.some((error) => error.code === 'UNREDACTED_SECRET'),
      `${validationState}: ${JSON.stringify(validation, null, 2)}`,
    );
    assert.doesNotMatch(JSON.stringify(validation), /round-four-secret-value/);
  }
});

test('source ineligibility derives a material gap and partial publication', async () => {
  const packet = await fixture('quick');
  packet.manifest.sources[0].validationState = 'stale';
  packet.ledger.evidence[0].locatorValidation.status = 'stale';
  for (const claim of packet.ledger.claims) claim.status = 'contested';
  packet.ledger.transitions = packet.ledger.claims.map((claim) => ({
    claimId: claim.id,
    from: 'provisional',
    to: 'contested',
  }));
  packet.manifest.gaps.push({
    id: 'gap-stale-non-material',
    code: 'SOURCE_STALE',
    message: 'The source changed after collection.',
    material: false,
    sourceIds: ['source-1'],
    claimIds: ['claim-1', 'claim-2'],
    coverageFindingIds: [],
  });
  await packet.persist();

  const validation = await validatePacket(packet.packetRoot);
  assert.ok(
    validation.errors.some(
      (error) => error.code === 'SOURCE_GAP_REQUIRES_MATERIAL_PARTIAL',
    ),
    JSON.stringify(validation, null, 2),
  );
});

test('stale-source audit gaps must cover every affected claim and downgrade assurance', async () => {
  const incomplete = await fixture('quick');
  incomplete.manifest.sources[0].validationState = 'stale';
  incomplete.ledger.evidence[0].locatorValidation.status = 'stale';
  for (const claim of incomplete.ledger.claims) claim.status = 'contested';
  incomplete.ledger.transitions = incomplete.ledger.claims.map((claim) => ({
    claimId: claim.id,
    from: 'provisional',
    to: 'contested',
  }));
  incomplete.manifest.run.status = 'partial';
  incomplete.manifest.gaps.push({
    id: 'gap-stale-incomplete',
    code: 'SOURCE_STALE',
    message: 'The source changed after collection.',
    material: true,
    sourceIds: ['source-1'],
    claimIds: ['claim-1'],
    coverageFindingIds: [],
  });
  await incomplete.persist();
  const incompleteResult = await validatePacket(incomplete.packetRoot);
  assert.ok(
    incompleteResult.errors.some(
      (error) => error.code === 'MISSING_SOURCE_GAP',
    ),
  );

  const notDowngraded = await fixture('quick');
  notDowngraded.manifest.sources[0].validationState = 'stale';
  notDowngraded.ledger.evidence[0].locatorValidation.status = 'stale';
  notDowngraded.manifest.run.status = 'partial';
  notDowngraded.manifest.gaps.push({
    id: 'gap-stale-without-downgrade',
    code: 'SOURCE_STALE',
    message: 'The source changed after collection.',
    material: true,
    sourceIds: ['source-1'],
    claimIds: ['claim-1', 'claim-2'],
    coverageFindingIds: [],
  });
  await notDowngraded.persist();
  const downgradeResult = await validatePacket(notDowngraded.packetRoot);
  assert.ok(
    downgradeResult.errors.some(
      (error) => error.code === 'CLAIM_ASSURANCE_INVALID',
    ),
  );
});
