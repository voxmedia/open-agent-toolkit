import assert from 'node:assert/strict';
import { readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, test } from 'node:test';

import { createReviewBrief } from '../scripts/create-review-brief.mjs';
import { hashFile } from '../scripts/lib/canonical-json.mjs';
import { reconcileLedger } from '../scripts/reconcile-ledger.mjs';
import { renderPacketDocument } from '../scripts/render-packet.mjs';
import {
  compileValidatedRun,
  validatePacket,
} from '../scripts/validate-packet.mjs';
import {
  createApprovalBinding,
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

async function replaceApprovalProjection(packet, approvalProjection) {
  const binding = createApprovalBinding(approvalProjection);
  packet.manifest.execution = binding;
  for (const reference of packet.manifest.artifacts.filter((item) =>
    item.path.startsWith('raw/dispatch/'),
  )) {
    const receipt = await readJson(join(packet.packetRoot, reference.path));
    receipt.approvalProjection = approvalProjection;
    receipt.approvalCanonicalJson = binding.approvalCanonicalJson;
    receipt.approvalFingerprint = binding.approvalFingerprint;
    receipt.approvedAt =
      receipt.state === 'prepared' ? null : binding.approvedAt;
    receipt.approvalEvidence =
      receipt.state === 'prepared' ? null : binding.approvalEvidence;
    receipt.catalogRecheck =
      receipt.state === 'accepted' || receipt.state === 'completed'
        ? binding.catalogRecheck
        : null;
    await replaceArtifact(packet, reference.path, receipt);
  }
  await writeJson(packet.manifestPath, packet.manifest);
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

async function replaceCatalogRecheck(packet, catalogRecheck) {
  packet.manifest.execution.catalogRecheck = catalogRecheck;
  for (const reference of packet.manifest.artifacts.filter((item) =>
    item.path.startsWith('raw/dispatch/'),
  )) {
    const receipt = await readJson(join(packet.packetRoot, reference.path));
    if (receipt.state === 'accepted' || receipt.state === 'completed') {
      receipt.catalogRecheck = catalogRecheck;
      await replaceArtifact(packet, reference.path, receipt);
    }
  }
  await writeJson(packet.manifestPath, packet.manifest);
}

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

const omittedAxisMutations = [
  [
    'wave task class',
    (projection) => delete projection.execution.waves[0].task_class,
  ],
  [
    'wave floor',
    (projection) => delete projection.execution.waves[0].model_class_floor,
  ],
  ['wave scope', (projection) => delete projection.execution.waves[0].scope],
  [
    'lane scope',
    (projection) => delete projection.execution.waves[0].lanes[0].scope,
  ],
  [
    'wave authority',
    (projection) => delete projection.execution.waves[0].authority,
  ],
  [
    'authorization scope',
    (projection) => delete projection.execution.waves[0].authorization_scope,
  ],
  [
    'writable roots',
    (projection) => delete projection.execution.waves[0].writable_roots,
  ],
  [
    'deadline',
    (projection) => delete projection.execution.waves[0].deadline_seconds,
  ],
  [
    'retry limit',
    (projection) => delete projection.execution.waves[0].retry_limit,
  ],
  ['fallback', (projection) => delete projection.execution.waves[0].fallback],
  [
    'dispatch mode',
    (projection) => delete projection.execution.waves[0].dispatch_mode,
  ],
  [
    'context controls',
    (projection) => delete projection.execution.waves[0].context_fork_controls,
  ],
  [
    'wave concurrency',
    (projection) => delete projection.execution.waves[0].concurrency,
  ],
  [
    'wave lane cap',
    (projection) => delete projection.execution.waves[0].lane_cap,
  ],
  [
    'payload digest',
    (projection) => delete projection.execution.waves[0].payload_digest,
  ],
  [
    'run maximum floor',
    (projection) => delete projection.execution.run_maximum_floor,
  ],
  ['pinned target', (projection) => delete projection.execution.pinned_target],
  [
    'catalog identity',
    (projection) => delete projection.catalog_observation.id,
  ],
  [
    'catalog source',
    (projection) => delete projection.catalog_observation.source,
  ],
  [
    'catalog context',
    (projection) => delete projection.catalog_observation.dispatch_context,
  ],
  [
    'catalog observation time',
    (projection) => delete projection.catalog_observation.observed_at,
  ],
  [
    'catalog fingerprint',
    (projection) =>
      delete projection.catalog_observation.relevant_catalog_fingerprint,
  ],
];

test('complete prepared projection rejects deletion of every formerly omitted dispatch axis', async () => {
  for (const [label, mutate] of omittedAxisMutations) {
    const packet = await fixture();
    const projection = structuredClone(
      packet.manifest.execution.approvalProjection,
    );
    mutate(projection);
    await replaceApprovalProjection(packet, projection);
    const validation = await validatePacket(packet.packetRoot);
    assert.equal(
      validation.valid,
      false,
      `${label} deletion remained valid: ${JSON.stringify(validation, null, 2)}`,
    );
    assert.ok(
      validation.errors.some(
        (error) =>
          error.path?.includes('approvalProjection') &&
          error.code !== 'APPROVAL_FINGERPRINT_MISMATCH',
      ),
      `${label} deletion lacked a projection-structure error: ${JSON.stringify(validation, null, 2)}`,
    );
  }
});

test('canonical projection string-set arrays reject invalid members, duplicates, and unstable order', async () => {
  const arrayCases = [
    [
      'writable roots null',
      (projection) => (projection.execution.waves[0].writable_roots = [null]),
    ],
    [
      'writable roots empty',
      (projection) => (projection.execution.waves[0].writable_roots = ['']),
    ],
    [
      'writable roots duplicate',
      (projection) =>
        (projection.execution.waves[0].writable_roots = ['raw/a', 'raw/a']),
    ],
    [
      'writable roots unstable order',
      (projection) =>
        (projection.execution.waves[0].writable_roots = ['raw/z', 'raw/a']),
    ],
    [
      'escalate when null',
      (projection) => (projection.request.escalate_when = [null]),
    ],
    [
      'escalate when empty',
      (projection) => (projection.request.escalate_when = ['']),
    ],
    [
      'escalate when duplicate',
      (projection) =>
        (projection.request.escalate_when = ['scope drift', 'scope drift']),
    ],
    [
      'escalate when unstable order',
      (projection) => (projection.request.escalate_when = ['zeta', 'alpha']),
    ],
    [
      'candidates considered null',
      (projection) => (projection.selection.candidates_considered = [null]),
    ],
    [
      'candidates considered empty',
      (projection) => (projection.selection.candidates_considered = ['']),
    ],
    [
      'candidates considered duplicate',
      (projection) =>
        (projection.selection.candidates_considered = ['model-a', 'model-a']),
    ],
    [
      'candidates considered unstable order',
      (projection) =>
        (projection.selection.candidates_considered = ['model-z', 'model-a']),
    ],
  ];
  const unexpectedlyValid = [];
  for (const [label, mutate] of arrayCases) {
    const packet = await fixture();
    const projection = structuredClone(
      packet.manifest.execution.approvalProjection,
    );
    mutate(projection);
    await replaceApprovalProjection(packet, projection);
    const validation = await validatePacket(packet.packetRoot);
    if (validation.valid) unexpectedlyValid.push(label);
  }
  assert.deepEqual(unexpectedlyValid, []);
});

test('every immutable receipt state binds every formerly omitted projection axis', async () => {
  const mutationCases = [
    [
      'task class',
      (projection) =>
        (projection.execution.waves[0].task_class = 'hard-reasoning'),
    ],
    [
      'wave floor',
      (projection) =>
        (projection.execution.waves[0].model_class_floor = 'hard-reasoning'),
    ],
    [
      'wave scope',
      (projection) => (projection.execution.waves[0].scope = 'packet:drift'),
    ],
    [
      'lane scope',
      (projection) =>
        (projection.execution.waves[0].lanes[0].scope = 'packet/drift'),
    ],
    [
      'authority',
      (projection) =>
        (projection.execution.waves[0].authority = 'provider-enforced'),
    ],
    [
      'authorization scope',
      (projection) =>
        (projection.execution.waves[0].authorization_scope = 'other-run'),
    ],
    [
      'writable root',
      (projection) =>
        projection.execution.waves[0].writable_roots.push('raw/drift'),
    ],
    [
      'deadline',
      (projection) => projection.execution.waves[0].deadline_seconds++,
    ],
    [
      'retry limit',
      (projection) => projection.execution.waves[0].retry_limit++,
    ],
    [
      'fallback',
      (projection) =>
        (projection.execution.waves[0].fallback.mode = 'alternate'),
    ],
    [
      'dispatch mode',
      (projection) =>
        (projection.execution.waves[0].dispatch_mode = 'foreground'),
    ],
    [
      'context control',
      (projection) =>
        (projection.execution.waves[0].context_fork_controls.fork_turns =
          'none'),
    ],
    [
      'wave concurrency',
      (projection) => projection.execution.waves[0].concurrency++,
    ],
    ['wave lane cap', (projection) => projection.execution.waves[0].lane_cap++],
    [
      'payload digest',
      (projection) =>
        (projection.execution.waves[0].payload_digest = `sha256:${'f'.repeat(64)}`),
    ],
    [
      'run maximum floor',
      (projection) =>
        (projection.execution.run_maximum_floor = 'hard-reasoning'),
    ],
    [
      'pinned target',
      (projection) =>
        (projection.execution.pinned_target.effort_selector = 'low'),
    ],
    [
      'catalog identity',
      (projection) => (projection.catalog_observation.id = 'catalog-drift'),
    ],
    [
      'catalog source',
      (projection) => (projection.catalog_observation.source = 'stale-catalog'),
    ],
    [
      'catalog context',
      (projection) =>
        (projection.catalog_observation.dispatch_context = 'stale-context'),
    ],
    [
      'catalog observation time',
      (projection) =>
        (projection.catalog_observation.observed_at = '2026-07-12T01:00:00Z'),
    ],
    [
      'catalog fingerprint',
      (projection) =>
        (projection.catalog_observation.relevant_catalog_fingerprint = `sha256:${'e'.repeat(64)}`),
    ],
  ];
  for (const state of ['prepared', 'approved', 'accepted', 'completed']) {
    for (const [label, mutate] of mutationCases) {
      const packet = await fixture();
      const reference = packet.manifest.artifacts.find(
        (item) =>
          item.path.startsWith('raw/dispatch/') &&
          item.path.endsWith(`-${state}.json`),
      );
      const receipt = await readJson(join(packet.packetRoot, reference.path));
      mutate(receipt.approvalProjection);
      const binding = createApprovalBinding(receipt.approvalProjection);
      receipt.approvalCanonicalJson = binding.approvalCanonicalJson;
      receipt.approvalFingerprint = binding.approvalFingerprint;
      if (receipt.approvalEvidence) {
        receipt.approvalEvidence.fingerprint = binding.approvalFingerprint;
      }
      await replaceArtifact(packet, reference.path, receipt);
      const validation = await validatePacket(packet.packetRoot);
      assert.equal(
        validation.valid,
        false,
        `${state} receipt ${label} drift remained valid: ${JSON.stringify(validation, null, 2)}`,
      );
    }
  }
});

test('approval evidence, canonical fingerprint, and catalog recheck are immutable across state receipts', async () => {
  const manifestMutations = [
    ['canonical JSON', (execution) => (execution.approvalCanonicalJson += ' ')],
    [
      'approval evidence',
      (execution) =>
        (execution.approvalEvidence.fingerprint = `sha256:${'a'.repeat(64)}`),
    ],
    ['catalog recheck', (execution) => delete execution.catalogRecheck],
  ];
  for (const [label, mutate] of manifestMutations) {
    const packet = await fixture();
    mutate(packet.manifest.execution);
    await writeJson(packet.manifestPath, packet.manifest);
    const validation = await validatePacket(packet.packetRoot);
    assert.equal(validation.valid, false, `${label} drift remained valid`);
  }

  const receiptMutations = new Map([
    ['prepared', (receipt) => delete receipt.approvalCanonicalJson],
    ['approved', (receipt) => delete receipt.approvalEvidence],
    ['accepted', (receipt) => delete receipt.catalogRecheck],
    [
      'completed',
      (receipt) =>
        (receipt.catalogRecheck.relevant_catalog_fingerprint = `sha256:${'b'.repeat(64)}`),
    ],
  ]);
  for (const [state, mutate] of receiptMutations) {
    const packet = await fixture();
    const reference = packet.manifest.artifacts.find(
      (item) =>
        item.path.startsWith('raw/dispatch/') &&
        item.path.endsWith(`-${state}.json`),
    );
    const receipt = await readJson(join(packet.packetRoot, reference.path));
    mutate(receipt);
    await replaceArtifact(packet, reference.path, receipt);
    const validation = await validatePacket(packet.packetRoot);
    assert.equal(
      validation.valid,
      false,
      `${state} receipt drift remained valid`,
    );
  }
});

test('accepted receipt chain binds approval time, child handle, and fresh catalog chronology', async () => {
  const receiptCases = [
    [
      'accepted handle',
      'accepted',
      (receipt) => (receipt.launchAcceptance.handle = 'replacement-child'),
    ],
    [
      'completed handle',
      'completed',
      (receipt) => (receipt.launchAcceptance.handle = 'replacement-child'),
    ],
    [
      'approved receipt time',
      'approved',
      (receipt) => (receipt.approvedAt = '2026-08-31T00:00:46.000Z'),
    ],
    [
      'accepted receipt time',
      'accepted',
      (receipt) => (receipt.approvedAt = '2026-08-31T00:00:46.000Z'),
    ],
    [
      'completed receipt time',
      'completed',
      (receipt) => (receipt.approvedAt = '2026-08-31T00:00:46.000Z'),
    ],
  ];
  const unexpectedlyValid = [];
  for (const [label, state, mutate] of receiptCases) {
    const packet = await fixture();
    const reference = packet.manifest.artifacts.find(
      (item) =>
        item.path.startsWith('raw/dispatch/') &&
        item.path.endsWith(`-${state}.json`),
    );
    const receipt = await readJson(join(packet.packetRoot, reference.path));
    mutate(receipt);
    await replaceArtifact(packet, reference.path, receipt);
    const validation = await validatePacket(packet.packetRoot);
    if (validation.valid) unexpectedlyValid.push(label);
  }

  {
    const packet = await fixture();
    packet.manifest.execution.approvedAt = '2026-08-31T00:00:46.000Z';
    await writeJson(packet.manifestPath, packet.manifest);
    const validation = await validatePacket(packet.packetRoot);
    if (validation.valid) unexpectedlyValid.push('manifest approval time');
  }

  const catalogCases = [
    [
      'copied original catalog observation',
      (packet) =>
        structuredClone(
          packet.manifest.execution.approvalProjection.catalog_observation,
        ),
    ],
    [
      'catalog recheck at approval time',
      (packet) => ({
        ...packet.manifest.execution.catalogRecheck,
        observed_at: packet.manifest.execution.approvedAt,
      }),
    ],
    [
      'catalog recheck after launch acceptance',
      (packet) => ({
        ...packet.manifest.execution.catalogRecheck,
        observed_at: '2026-08-31T00:01:01.000Z',
      }),
    ],
  ];
  for (const [label, createRecheck] of catalogCases) {
    const packet = await fixture();
    await replaceCatalogRecheck(packet, createRecheck(packet));
    const validation = await validatePacket(packet.packetRoot);
    if (validation.valid) unexpectedlyValid.push(label);
  }

  assert.deepEqual(unexpectedlyValid, []);
});

test('terminal receipt chronology rejects completion before acceptance and permits equal or later completion', async () => {
  const mutateCompletedAt = async (completedAt) => {
    const packet = await fixture();
    const reference = packet.manifest.artifacts.find(
      (item) =>
        item.path.startsWith('raw/dispatch/') &&
        item.path.endsWith('-completed.json'),
    );
    const receipt = await readJson(join(packet.packetRoot, reference.path));
    receipt.terminalOutcome.completedAt = completedAt;
    await replaceArtifact(packet, reference.path, receipt);
    return validatePacket(packet.packetRoot);
  };

  const before = await mutateCompletedAt('2026-08-31T00:00:59.999Z');
  assert.equal(before.valid, false, JSON.stringify(before, null, 2));

  const equal = await mutateCompletedAt('2026-08-31T00:01:00.000Z');
  assert.equal(equal.valid, true, JSON.stringify(equal, null, 2));

  const after = await mutateCompletedAt('2026-08-31T00:01:00.001Z');
  assert.equal(after.valid, true, JSON.stringify(after, null, 2));
});

test('declared-complete stages reject selection drift under complete and partial outcomes', async () => {
  for (const status of ['complete', 'partial']) {
    for (const receiptState of ['accepted', 'completed']) {
      for (const axis of ['provider', 'model_selector', 'effort_selector']) {
        const packet = await createPacketFixture({ profile: 'quick', status });
        roots.push(packet.tempRoot);
        if (status === 'partial') {
          packet.manifest.run.achievedProfile = null;
          packet.manifest.gaps.push({
            id: `gap-${receiptState}-${axis}`,
            code: 'PASS_FAILED',
            message:
              'A declared-complete stage retained invalid receipt evidence.',
            material: true,
            sourceIds: [],
            claimIds: [],
            coverageFindingIds: [],
          });
        }
        const reference = packet.manifest.artifacts.find(
          (item) =>
            item.path.startsWith('raw/dispatch/') &&
            item.path.endsWith(`-${receiptState}.json`),
        );
        const receipt = await readJson(join(packet.packetRoot, reference.path));
        const selection = receipt.approvalProjection.selection;
        selection[axis] = `${selection[axis]}-drift`;
        const binding = createApprovalBinding(receipt.approvalProjection);
        receipt.approvalCanonicalJson = binding.approvalCanonicalJson;
        receipt.approvalFingerprint = binding.approvalFingerprint;
        receipt.approvalEvidence.fingerprint = binding.approvalFingerprint;
        await replaceArtifact(packet, reference.path, receipt);

        const validation = await validatePacket(packet.packetRoot);
        assert.ok(
          validation.errors.some(
            (error) => error.code === 'INCOMPLETE_DECLARED_STAGE',
          ),
          `${status}/${receiptState}/${axis} lacked structural rejection: ${JSON.stringify(validation, null, 2)}`,
        );
        if (status === 'partial') {
          assert.ok(
            validation.errors.some(
              (error) => error.code === 'PROFILE_ASSURANCE_EXCEEDED',
            ),
            `${status}/${receiptState}/${axis} retained supported assurance without quick`,
          );
        }
      }
    }
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

test('every stage requires one same-run typed artifact and all four immutable receipts', async () => {
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
    const originalReceiptState = receipt.state;
    receipt.state = 'failed';
    await replaceArtifact(packet, reference.path, receipt);
    const failed = await validatePacket(packet.packetRoot);
    assert.notEqual(failed.achievedProfile, 'thorough', stage.mode);
    receipt.state = originalReceiptState;
    await replaceArtifact(packet, reference.path, receipt);

    receipt.runId = 'wrong-run';
    await replaceArtifact(packet, reference.path, receipt);
    const wrongRun = await validatePacket(packet.packetRoot);
    assert.notEqual(wrongRun.achievedProfile, 'thorough', stage.mode);
    receipt.runId = packet.manifest.run.id;
    await replaceArtifact(packet, reference.path, receipt);

    const completedId = stage.dispatchReceiptIds.find((id) =>
      id.endsWith('-completed'),
    );
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
  assert.deepEqual(reconciliation.transitions, [
    { claimId: 'claim-1', from: 'supported', to: 'contested' },
  ]);

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

test('production reconciliation preserves reviewed claims when verification would require an illegal transition', async () => {
  const packet = await fixture();
  const priorReference = packet.manifest.artifacts.find(
    (item) => item.path === 'raw/drafts/claims-v1.json',
  );
  const originalPriorLedger = await readJson(
    join(packet.packetRoot, priorReference.path),
  );
  const results = await Promise.all(
    ['semantic', 'adversarial', 'coverage'].map(async (kind) =>
      readJson(join(packet.packetRoot, 'reviews', `${kind}.json`)),
    ),
  );

  for (const status of ['unresolved', 'unsupported']) {
    const priorLedger = structuredClone(originalPriorLedger);
    priorLedger.claims[0].status = status;
    const { ledger, reconciliation } = reconcileLedger({
      priorLedger,
      reviewResults: results,
      priorReference,
    });

    assert.equal(ledger.claims[0].status, status);
    assert.deepEqual(ledger.transitions, []);
    assert.deepEqual(reconciliation.transitions, []);
  }

  const promoted = reconcileLedger({
    priorLedger: originalPriorLedger,
    reviewResults: results,
    priorReference,
  });
  assert.equal(originalPriorLedger.claims[0].status, 'supported');
  assert.equal(promoted.ledger.claims[0].status, 'verified');
  assert.deepEqual(promoted.ledger.transitions, [
    { claimId: 'claim-1', from: 'supported', to: 'verified' },
  ]);
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
  const approvalProjection = structuredClone(
    packet.manifest.execution.approvalProjection,
  );
  approvalProjection.execution.waves.push({
    ...structuredClone(approvalProjection.execution.waves[0]),
    wave_id: 'wave-approved-extra',
    scope: 'packet:approved-extra',
    lanes: [{ lane_id: 'lane-approved-extra', scope: 'packet/approved-extra' }],
    writable_roots: ['raw/approved-extra'],
    payload_digest: `sha256:${'d'.repeat(64)}`,
  });
  await replaceApprovalProjection(packet, approvalProjection);

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
