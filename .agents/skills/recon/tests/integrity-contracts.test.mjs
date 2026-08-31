import assert from 'node:assert/strict';
import { readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, test } from 'node:test';

import { createReviewBrief } from '../scripts/create-review-brief.mjs';
import { hashCanonicalJson, hashFile } from '../scripts/lib/canonical-json.mjs';
import { reconcileLedger } from '../scripts/reconcile-ledger.mjs';
import { validatePacket } from '../scripts/validate-packet.mjs';
import { createPacketFixture } from './fixtures/packet-fixture.mjs';

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

async function replaceApprovalEnvelope(packet, approvalEnvelope) {
  packet.manifest.execution.approvalEnvelope = approvalEnvelope;
  packet.manifest.execution.approvalFingerprint =
    hashCanonicalJson(approvalEnvelope);
  for (const reference of packet.manifest.artifacts.filter((item) =>
    item.path.startsWith('raw/dispatch/'),
  )) {
    const receipt = await readJson(join(packet.packetRoot, reference.path));
    receipt.selection = Object.fromEntries(
      [
        'provider',
        'model',
        'effort',
        'reasoningMode',
        'route',
        'role',
        'serviceTier',
      ]
        .filter((key) => approvalEnvelope[key] !== undefined)
        .map((key) => [key, approvalEnvelope[key]]),
    );
    receipt.approvalEnvelope = approvalEnvelope;
    receipt.acceptedEnvelope = approvalEnvelope;
    receipt.fingerprint = hashCanonicalJson(approvalEnvelope);
    await replaceArtifact(packet, reference.path, receipt);
  }
  await writeJson(packet.manifestPath, packet.manifest);
}

test('approval and receipt selection require every canonical execution axis', async () => {
  const envelopeAxes = [
    'provider',
    'model',
    'effort',
    'reasoningMode',
    'route',
    'role',
    'serviceTier',
    'authority',
    'deadlineSeconds',
    'retryLimit',
    'concurrency',
    'laneCap',
    'waves',
  ];
  for (const axis of envelopeAxes) {
    const packet = await fixture();
    const envelope = {
      ...structuredClone(packet.manifest.execution.approvalEnvelope),
      authority: 'contract-enforced',
      deadlineSeconds: 60,
      retryLimit: 0,
      concurrency: 2,
      laneCap: 10,
    };
    delete envelope[axis];
    await replaceApprovalEnvelope(packet, envelope);
    const validation = await validatePacket(packet.packetRoot);
    assert.equal(
      validation.valid,
      false,
      `${axis} deletion remained valid: ${JSON.stringify(validation, null, 2)}`,
    );
  }

  for (const axis of [
    'provider',
    'model',
    'effort',
    'reasoningMode',
    'route',
    'role',
    'serviceTier',
  ]) {
    const packet = await fixture();
    const envelope = {
      ...structuredClone(packet.manifest.execution.approvalEnvelope),
      authority: 'contract-enforced',
      deadlineSeconds: 60,
      retryLimit: 0,
      concurrency: 2,
      laneCap: 10,
    };
    await replaceApprovalEnvelope(packet, envelope);
    const reference = packet.manifest.artifacts.find((item) =>
      item.path.startsWith('raw/dispatch/'),
    );
    const receipt = await readJson(join(packet.packetRoot, reference.path));
    delete receipt.selection[axis];
    await replaceArtifact(packet, reference.path, receipt);
    const validation = await validatePacket(packet.packetRoot);
    assert.equal(
      validation.valid,
      false,
      `receipt ${axis} deletion remained valid: ${JSON.stringify(validation, null, 2)}`,
    );
  }
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

test('every stage requires one same-run typed artifact and accepted/completed receipts', async () => {
  const packet = await fixture('thorough');
  for (const stage of packet.manifest.stages) {
    const original = structuredClone(stage);
    stage.artifactIds = [];
    await writeJson(packet.manifestPath, packet.manifest);
    const missing = await validatePacket(packet.packetRoot);
    assert.notEqual(missing.achievedProfile, 'thorough', stage.mode);
    Object.assign(stage, original);

    stage.artifactIds = [
      packet.manifest.stages.find((candidate) => candidate.id !== stage.id)
        .artifactIds[0],
    ];
    await writeJson(packet.manifestPath, packet.manifest);
    const wrongKind = await validatePacket(packet.packetRoot);
    assert.notEqual(wrongKind.achievedProfile, 'thorough', stage.mode);
    Object.assign(stage, original);

    stage.dispatchReceiptIds = [];
    await writeJson(packet.manifestPath, packet.manifest);
    const absentReceipt = await validatePacket(packet.packetRoot);
    assert.notEqual(absentReceipt.achievedProfile, 'thorough', stage.mode);
    Object.assign(stage, original);

    const receiptId = stage.dispatchReceiptIds[0];
    const reference = packet.manifest.artifacts.find((item) =>
      item.path.includes(`${receiptId}.json`),
    );
    const receipt = await readJson(join(packet.packetRoot, reference.path));
    receipt.state = 'failed';
    await replaceArtifact(packet, reference.path, receipt);
    const failed = await validatePacket(packet.packetRoot);
    assert.notEqual(failed.achievedProfile, 'thorough', stage.mode);
    receipt.state = 'accepted';
    await replaceArtifact(packet, reference.path, receipt);

    receipt.runId = 'wrong-run';
    await replaceArtifact(packet, reference.path, receipt);
    const wrongRun = await validatePacket(packet.packetRoot);
    assert.notEqual(wrongRun.achievedProfile, 'thorough', stage.mode);
    receipt.runId = packet.manifest.run.id;
    await replaceArtifact(packet, reference.path, receipt);

    const completedId = stage.dispatchReceiptIds[1];
    const completedReference = packet.manifest.artifacts.find((item) =>
      item.path.includes(`${completedId}.json`),
    );
    const completed = await readJson(
      join(packet.packetRoot, completedReference.path),
    );
    completed.artifactIds = ['wrong-artifact'];
    await replaceArtifact(packet, completedReference.path, completed);
    const wrongMembership = await validatePacket(packet.packetRoot);
    assert.notEqual(wrongMembership.achievedProfile, 'thorough', stage.mode);
    completed.artifactIds = [...stage.artifactIds];
    await replaceArtifact(packet, completedReference.path, completed);
  }
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

test('claim assurance and reconciliation reject an exact but unreceipted review result', async () => {
  const packet = await fixture();
  const semantic = await readJson(
    join(packet.packetRoot, 'reviews/semantic.json'),
  );
  semantic.id = 'review-semantic-unreceipted';
  semantic.reviewerLane = 'lane-semantic-unreceipted';
  const semanticPath = join(
    packet.packetRoot,
    'reviews/semantic-unreceipted.json',
  );
  await writeJson(semanticPath, semantic);
  packet.manifest.artifacts.push({
    path: 'reviews/semantic-unreceipted.json',
    digest: await hashFile(semanticPath),
  });
  packet.ledger.claims[0].reviewIds[0] = semantic.id;
  const reconciliation = await readJson(
    join(packet.packetRoot, 'reviews/reconciliation.json'),
  );
  reconciliation.incorporatedReviewIds[0] = semantic.id;
  await replaceArtifact(packet, 'reviews/reconciliation.json', reconciliation);
  await packet.persist();

  const validation = await validatePacket(packet.packetRoot);
  assert.ok(
    validation.errors.some(
      (error) => error.code === 'UNRECEIPTED_ASSURANCE_REVIEW',
    ),
    JSON.stringify(validation, null, 2),
  );
});

test('approved required lanes cannot disappear from the terminal stage topology', async () => {
  const packet = await fixture();
  const approvalEnvelope = structuredClone(
    packet.manifest.execution.approvalEnvelope,
  );
  approvalEnvelope.waves.push({
    id: 'wave-approved-extra',
    mode: 'gather',
    required: true,
    lanes: [{ id: 'lane-approved-extra', required: true }],
  });
  await replaceApprovalEnvelope(packet, approvalEnvelope);

  const validation = await validatePacket(packet.packetRoot);
  assert.ok(
    validation.errors.some(
      (error) => error.code === 'MISSING_APPROVED_LANE_STAGE',
    ),
    JSON.stringify(validation, null, 2),
  );
});

test('thorough-only assurance stages use claim-bearing typed results', async () => {
  const packet = await fixture('thorough');
  const expectedKinds = new Map([
    ['redundant-verification', 'redundant-verification'],
    ['contradiction-resolution', 'contradiction-resolution'],
  ]);
  for (const [mode, reviewKind] of expectedKinds) {
    const stage = packet.manifest.stages.find((item) => item.mode === mode);
    const reference = packet.manifest.artifacts.find(
      (item) => item.path === `reviews/${reviewKind}.json`,
    );
    const artifact = await readJson(join(packet.packetRoot, reference.path));
    assert.deepEqual(stage.artifactIds, [artifact.id]);
    assert.equal(artifact.kind, 'recon.review-result');
    assert.equal(artifact.reviewKind, reviewKind);
    assert.ok(artifact.dispositions.length > 0);
    assert.ok(artifact.permittedInputs.length > 0);
  }
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

test('a receipted typed rejection can explicitly authorize prior claim removal', async () => {
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
