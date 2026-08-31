import assert from 'node:assert/strict';
import { readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, test } from 'node:test';

import { createReviewBrief } from '../scripts/create-review-brief.mjs';
import { hashFile } from '../scripts/lib/canonical-json.mjs';
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
});
