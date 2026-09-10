import assert from 'node:assert/strict';
import { test } from 'node:test';

import { validateV2ProfileTopology } from '../scripts/lib/contracts.mjs';
import {
  economicalRoutingDefaults,
  normalizeManifestRouting,
  resolveEffectiveWaveTarget,
} from '../scripts/lib/routing.mjs';
import {
  approveExecution,
  createExecutionApproval,
  createV2ExecutionApproval,
  fixtureTarget,
  V1_STANDARD_APPROVAL_FINGERPRINT,
} from './fixtures/packet-fixture.mjs';

const standardModes = [
  'map',
  'gather',
  'compile',
  'semantic-verification',
  'adversarial',
  'coverage',
  'reconciliation',
];

const laneIdForMode = (mode) =>
  mode === 'semantic-verification' ? 'lane-semantic' : `lane-${mode}`;

test('economical routing defaults exhaust the supported wave-mode union', () => {
  const defaults = economicalRoutingDefaults();
  assert.deepEqual(Object.keys(defaults).sort(), [
    'adversarial',
    'compile',
    'contradiction-resolution',
    'coverage',
    'gather',
    'map',
    'reconciliation',
    'redundant-gather',
    'redundant-verification',
    'semantic-verification',
  ]);
  assert.ok(
    Object.values(defaults).every(
      (policy) =>
        policy.taskClass === 'mechanical-recon' && policy.assignment.length > 0,
    ),
  );
  assert.equal(Object.isFrozen(defaults), true);
});

test('v1 normalization preserves the pinned approval bytes and homogeneous target', () => {
  const execution = createExecutionApproval({
    modes: standardModes,
    laneIdForMode,
  });
  assert.equal(
    execution.approval.fingerprint,
    V1_STANDARD_APPROVAL_FINGERPRINT,
  );

  const expensive = approveExecution({
    ...execution,
    model: 'fixture-expensive-model',
    effort: 'maximum',
  });
  const routing = normalizeManifestRouting({
    schemaVersion: 1,
    execution: expensive,
  });

  assert.equal(routing.sourceSchemaVersion, 1);
  assert.equal(routing.target.model, 'fixture-expensive-model');
  assert.equal(routing.target.effort, 'maximum');
  assert.deepEqual(
    routing.waves.map((wave) => wave.target),
    routing.waves.map(() => routing.target),
  );
  assert.ok(
    routing.waves.every(
      (wave) =>
        wave.classFloor === wave.taskClass && wave.selectionReason === null,
    ),
  );
  assert.deepEqual(routing.conditions, []);
  assert.equal(Object.isFrozen(routing), true);
  assert.equal(Object.isFrozen(routing.waves[0].target), true);
});

test('v2 resolution inherits or replaces a whole exact target without axis merging', () => {
  const execution = createV2ExecutionApproval({
    modes: ['map', 'reconciliation'],
    laneIdForMode,
  });
  const override = {
    provider: 'fixture-provider',
    route: 'opaque:stronger',
    role: 'recon-worker',
    model: 'fixture-judgment-model',
    effort: null,
    reasoningMode: null,
    serviceTier: null,
  };
  execution.waves[1].target = override;
  const approved = approveExecution(execution);

  assert.deepEqual(
    resolveEffectiveWaveTarget(approved, approved.waves[0]),
    fixtureTarget,
  );
  assert.deepEqual(
    resolveEffectiveWaveTarget(approved, approved.waves[1]),
    override,
  );

  const routing = normalizeManifestRouting({
    schemaVersion: 2,
    execution: approved,
  });
  assert.deepEqual(routing.waves[0].target, fixtureTarget);
  assert.deepEqual(routing.waves[1].target, override);
  assert.equal(routing.waves[1].target.effort, null);
  assert.equal('serviceTier' in routing.waves[1].target, true);
});

test('the shared v2 topology validator enforces singleton order at the production boundary', () => {
  const execution = createV2ExecutionApproval({
    modes: standardModes,
    laneIdForMode,
  });
  [execution.waves[3], execution.waves[4]] = [
    execution.waves[4],
    execution.waves[3],
  ];
  const errors = validateV2ProfileTopology({
    schemaVersion: 2,
    run: { requestedProfile: 'standard' },
    execution,
  });
  assert.ok(
    errors.some((error) => error.code === 'OUT_OF_ORDER_PROFILE_TOPOLOGY'),
  );
});

test('normalization refuses unknown manifest versions', () => {
  assert.throws(
    () => normalizeManifestRouting({ schemaVersion: 99, execution: {} }),
    /Unsupported recon manifest schemaVersion 99/,
  );
});
