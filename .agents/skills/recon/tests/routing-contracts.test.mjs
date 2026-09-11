import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  validateExecution,
  validateV2ProfileTopology,
} from '../scripts/lib/contracts.mjs';
import {
  economicalRoutingDefaults,
  normalizeManifestRouting,
  resolveEffectiveWaveTarget,
} from '../scripts/lib/routing.mjs';
import {
  approveExecution,
  createV2ExecutionApproval,
  fixtureTarget,
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
const thoroughModes = [
  'map',
  'gather',
  'compile',
  'semantic-verification',
  'adversarial',
  'coverage',
  'redundant-gather',
  'redundant-verification',
  'reconciliation',
];

const laneIdForMode = (mode) =>
  mode === 'semantic-verification' ? 'lane-semantic' : `lane-${mode}`;

function addConditionalWave(execution, suffix = '') {
  const waveId = `wave-conditional${suffix}`;
  const wave = {
    waveId,
    mode: 'contradiction-resolution',
    taskClass: 'mechanical-recon',
    classFloor: 'mechanical-recon',
    selectionReason: 'Bounded condition ownership regression fixture.',
    lanes: [
      {
        laneId: `lane-conditional${suffix}`,
        scope: `packet/conditional${suffix}`,
        writeRoot: `reviews/conditional${suffix}.json`,
      },
    ],
    conditional: true,
  };
  execution.waves.splice(-1, 0, wave);
  return wave;
}

function conditionFor(wave, conditionId) {
  return {
    conditionId,
    destinationWaveId: wave.waveId,
    afterWaveIds: ['wave-map'],
    predicate: 'insufficient-evidence',
    maxActivations: 1,
  };
}

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

test('routing resolution inherits or replaces a whole exact target without axis merging', () => {
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

test('condition semantics have one validator owner and one diagnostic per injected defect', () => {
  const unknownPredicate = createV2ExecutionApproval({
    modes: standardModes,
    laneIdForMode,
  });
  const unknownWave = addConditionalWave(unknownPredicate);
  unknownPredicate.conditions = [
    {
      ...conditionFor(unknownWave, 'condition-unknown-predicate'),
      predicate: 'invented-predicate',
    },
  ];

  const duplicateDestination = createV2ExecutionApproval({
    modes: thoroughModes,
    laneIdForMode,
  });
  const sharedWave = addConditionalWave(duplicateDestination);
  duplicateDestination.conditions = [
    conditionFor(sharedWave, 'condition-first'),
    conditionFor(sharedWave, 'condition-second'),
  ];

  const duplicateId = createV2ExecutionApproval({
    modes: thoroughModes,
    laneIdForMode,
  });
  const firstWave = addConditionalWave(duplicateId, '-first');
  const secondWave = addConditionalWave(duplicateId, '-second');
  duplicateId.conditions = [
    conditionFor(firstWave, 'condition-duplicate'),
    conditionFor(secondWave, 'condition-duplicate'),
  ];

  for (const [execution, expectedCode, profile] of [
    [unknownPredicate, 'INVALID_CONDITION_PREDICATE', 'standard'],
    [duplicateDestination, 'DUPLICATE_CONDITION_DESTINATION', 'thorough'],
    [duplicateId, 'DUPLICATE_ROUTING_ID', 'thorough'],
  ]) {
    const executionErrors = [];
    validateExecution(execution, executionErrors);
    assert.deepEqual(executionErrors, []);
    const topologyErrors = validateV2ProfileTopology({
      schemaVersion: 2,
      run: { requestedProfile: profile },
      execution,
    });
    assert.deepEqual(
      topologyErrors.map(({ code }) => code),
      [expectedCode],
    );
  }
});

test('every conditional wave has exactly one activating condition', () => {
  const execution = createV2ExecutionApproval({
    modes: standardModes,
    laneIdForMode,
  });
  execution.waves.splice(-1, 0, {
    waveId: 'wave-dead-conditional',
    mode: 'redundant-gather',
    taskClass: 'mechanical-recon',
    classFloor: 'mechanical-recon',
    selectionReason: 'Dead conditional wave regression fixture.',
    lanes: [
      {
        laneId: 'lane-dead-conditional',
        scope: 'packet/dead-conditional',
        writeRoot: 'raw/dossiers/dead-conditional.json',
      },
    ],
    conditional: true,
  });

  const errors = validateV2ProfileTopology({
    schemaVersion: 2,
    run: { requestedProfile: 'standard' },
    execution,
  });
  assert.deepEqual(
    errors.map(({ code }) => code),
    ['MISSING_WAVE_CONDITION'],
  );
});

for (const [profile, modes] of [
  ['quick', ['map', 'gather', 'compile', 'reconciliation']],
  ['standard', standardModes],
]) {
  test(`${profile} conditional terminal defects have one topology diagnostic owner`, () => {
    const execution = createV2ExecutionApproval({
      modes,
      laneIdForMode,
    });
    execution.waves.at(-1).conditional = true;

    const errors = validateV2ProfileTopology({
      schemaVersion: 2,
      run: { requestedProfile: profile },
      execution,
    });
    assert.deepEqual(
      errors.map(({ code }) => code),
      ['INVALID_TERMINAL_TOPOLOGY'],
    );
  });
}

test('normalization refuses unknown manifest versions', () => {
  assert.throws(
    () => normalizeManifestRouting({ schemaVersion: 99, execution: {} }),
    /Unsupported recon manifest schemaVersion 99/,
  );
});
