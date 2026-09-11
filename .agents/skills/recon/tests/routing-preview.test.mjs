import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, test } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  checkApprovedWaveTarget,
  createRoutingPreview,
  renderRoutingPreview,
} from '../scripts/lib/routing.mjs';
import {
  approveExecution,
  createV2ExecutionApproval,
  fixtureTarget,
} from './fixtures/packet-fixture.mjs';

const modeList = [
  'map',
  'gather',
  'compile',
  'semantic-verification',
  'adversarial',
  'coverage',
  'redundant-gather',
  'redundant-verification',
  'contradiction-resolution',
  'reconciliation',
];
const requiredModesByProfile = Object.freeze({
  quick: Object.freeze(['map', 'gather', 'compile']),
  standard: Object.freeze([
    'map',
    'gather',
    'compile',
    'semantic-verification',
    'adversarial',
    'coverage',
    'reconciliation',
  ]),
  thorough: Object.freeze([
    'map',
    'gather',
    'compile',
    'semantic-verification',
    'adversarial',
    'coverage',
    'redundant-gather',
    'redundant-verification',
    'reconciliation',
  ]),
});
const tempRoots = [];

afterEach(async () => {
  await Promise.all(
    tempRoots
      .splice(0)
      .map((root) => rm(root, { recursive: true, force: true })),
  );
});

const laneIdForMode = (mode) => `lane-${mode}`;

function draftManifest({ profile = 'thorough', modes = modeList } = {}) {
  const execution = createV2ExecutionApproval({
    modes,
    laneIdForMode,
  });
  delete execution.approval;
  const manifest = {
    schemaVersion: 2,
    run: { requestedProfile: profile },
    execution,
  };
  const contradiction = execution.waves.find(
    (wave) => wave.mode === 'contradiction-resolution',
  );
  if (contradiction) {
    contradiction.conditional = true;
    execution.conditions = [
      {
        conditionId: 'condition-contradiction-resolution',
        destinationWaveId: contradiction.waveId,
        afterWaveIds: ['wave-map'],
        predicate: 'insufficient-evidence',
        maxActivations: 1,
      },
    ];
  }
  return manifest;
}

function completeDraft(profile) {
  return draftManifest({ profile, modes: requiredModesByProfile[profile] });
}

function duplicateSingletonDraft() {
  const manifest = completeDraft('quick');
  const duplicate = structuredClone(manifest.execution.waves[0]);
  duplicate.waveId = 'wave-map-second';
  duplicate.lanes[0].laneId = 'lane-map-second';
  duplicate.lanes[0].scope = 'packet/map-second';
  duplicate.lanes[0].writeRoot = 'raw/dossiers/pass-map-second.json';
  manifest.execution.waves.splice(1, 0, duplicate);
  return manifest;
}

function outOfOrderDraft() {
  return draftManifest({
    profile: 'standard',
    modes: [
      'compile',
      'map',
      'gather',
      'semantic-verification',
      'adversarial',
      'coverage',
      'reconciliation',
    ],
  });
}

function unconditionalContradictionDraft() {
  const manifest = draftManifest();
  const contradiction = manifest.execution.waves.find(
    (wave) => wave.mode === 'contradiction-resolution',
  );
  contradiction.conditional = false;
  manifest.execution.conditions = [];
  return manifest;
}

function conditionalDraft() {
  const manifest = completeDraft('standard');
  const destination = {
    waveId: 'wave-conditional-resolution',
    mode: 'contradiction-resolution',
    taskClass: 'mechanical-recon',
    classFloor: 'mechanical-recon',
    selectionReason: 'Resolve a bounded contradiction only when activated.',
    lanes: [
      {
        laneId: 'lane-conditional-resolution',
        scope: 'packet/conditional-resolution',
        writeRoot: 'reviews/conditional-resolution.json',
      },
    ],
    conditional: true,
  };
  manifest.execution.waves.splice(1, 0, destination);
  manifest.execution.conditions = [
    {
      conditionId: 'condition-resolution',
      destinationWaveId: destination.waveId,
      afterWaveIds: ['wave-map'],
      predicate: 'insufficient-evidence',
      maxActivations: 1,
    },
  ];
  return manifest;
}

function markdownHostileDraft() {
  const manifest = conditionalDraft();
  const map = manifest.execution.waves.find((wave) => wave.mode === 'map');
  const destination = manifest.execution.waves.find(
    (wave) => wave.mode === 'contradiction-resolution',
  );
  const condition = manifest.execution.conditions[0];
  manifest.execution.target.route =
    'opaque|route, model=false\r\n## False target\n`target`_[unsafe]';
  map.waveId = 'wave|map\r\n## False dependency\n`map`';
  map.selectionReason =
    'Bounded | reason\r\n## False reason\n`reason`_[unsafe]';
  map.lanes[0].laneId = 'lane|map\r\n## False lane\n`lane`';
  map.lanes[0].scope =
    'visible | hidden\r\n## False limits\n- Lanes: 1\n`scope`';
  map.lanes[0].writeRoot = 'raw/map|output\r\n`root`_[unsafe].json';
  destination.waveId =
    'wave|conditional\r\n## False destination\n`destination`';
  condition.conditionId =
    'condition|id\r\n## False condition\n`condition`_[unsafe]';
  condition.destinationWaveId = destination.waveId;
  condition.afterWaveIds = [map.waveId];
  return manifest;
}

test('preview covers all ten economical defaults and preserves independent targets', () => {
  const manifest = draftManifest();
  const stronger = {
    provider: 'fixture-provider',
    route: 'opaque::terminal::selector',
    role: 'recon-worker',
    model: 'synthetic-stronger-selector',
    effort: null,
    reasoningMode: 'synthetic-deliberation',
    serviceTier: null,
  };
  const terminal = manifest.execution.waves.find(
    (wave) => wave.mode === 'reconciliation',
  );
  terminal.taskClass = 'intelligent-recon';
  terminal.target = stronger;
  terminal.selectionReason =
    'Synthetic preservation fixture: bounded reconciliation needs judgment.';

  const preview = createRoutingPreview(manifest);
  assert.deepEqual(
    preview.waves.map((wave) => wave.mode).sort(),
    [...modeList].sort(),
  );
  assert.ok(
    preview.waves.every((wave) => wave.assignment.length > 20),
    'every mode exposes a bounded assignment default',
  );
  assert.deepEqual(
    preview.waves.find((wave) => wave.mode === 'reconciliation').target,
    stronger,
  );
  assert.ok(
    preview.waves
      .filter((wave) => wave.mode !== 'reconciliation')
      .every((wave) => wave.target.model === fixtureTarget.model),
  );
  assert.equal(preview.approvalState, 'draft');
  assert.equal(preview.authority, 'contract-enforced');
  assert.equal(preview.requestedProfile, 'thorough');
  assert.deepEqual(preview.profileCaps, {
    maxLanes: 20,
    maxConcurrency: 8,
    maxConditions: 2,
  });
  assert.equal(preview.limits.waveCount, 10);
  assert.equal(preview.limits.laneCount, 10);
  assert.equal(preview.limits.countedAdaptiveLaneCount, 7);
  assert.match(renderRoutingPreview(preview), /Worst-case limits/);
  assert.equal(
    JSON.parse(renderRoutingPreview(preview, 'json')).waves.length,
    10,
  );
});

test('preview validates and displays the complete approval-bound topology', () => {
  const manifest = conditionalDraft();
  const preview = createRoutingPreview(manifest);
  assert.deepEqual(preview.conditions, manifest.execution.conditions);
  assert.deepEqual(
    preview.waves.find((wave) => wave.waveId === 'wave-conditional-resolution')
      .lanes,
    manifest.execution.waves.find(
      (wave) => wave.waveId === 'wave-conditional-resolution',
    ).lanes,
  );
  const markdown = renderRoutingPreview(preview);
  for (const expected of [
    'Authority: contract-enforced',
    'Requested profile: standard',
    'lane-conditional-resolution',
    'packet/conditional-resolution',
    'reviews/conditional-resolution.json',
    'condition-resolution',
    'wave-conditional-resolution',
    'wave-map',
    'insufficient-evidence',
    '| 1 |',
    '- Profile adaptive-lane cap: 10 (counted lanes: 5 of 8 total)',
    '- Profile concurrency cap: 6',
    '- Profile condition cap: 1',
  ]) {
    assert.ok(
      markdown.includes(expected),
      `missing preview field: ${expected}`,
    );
  }
  const json = JSON.parse(renderRoutingPreview(preview, 'json'));
  assert.equal(json.conditions[0].maxActivations, 1);
  assert.equal(json.waves[1].lanes[0].scope, 'packet/conditional-resolution');
  assert.equal(json.limits.countedAdaptiveLaneCount, 5);
});

test('preview rejects incomplete quick, standard, and thorough profile topologies', () => {
  for (const profile of ['quick', 'standard', 'thorough']) {
    const accepted = completeDraft(profile);
    assert.doesNotThrow(() => createRoutingPreview(accepted));

    for (const requiredMode of requiredModesByProfile[profile]) {
      const incomplete = completeDraft(profile);
      incomplete.execution.waves = incomplete.execution.waves.filter(
        (wave) => wave.mode !== requiredMode,
      );
      assert.throws(() => createRoutingPreview(incomplete), {
        code:
          requiredMode === 'reconciliation'
            ? 'INVALID_TERMINAL_TOPOLOGY'
            : 'INCOMPLETE_PROFILE_TOPOLOGY',
      });
    }
  }

  const conditionalOnly = completeDraft('standard');
  const required = conditionalOnly.execution.waves.find(
    (wave) => wave.mode === 'adversarial',
  );
  required.mode = 'contradiction-resolution';
  required.conditional = true;
  conditionalOnly.execution.conditions = [
    {
      conditionId: 'condition-adversarial-substitute',
      destinationWaveId: required.waveId,
      afterWaveIds: ['wave-map'],
      predicate: 'insufficient-evidence',
      maxActivations: 1,
    },
  ];
  assert.throws(() => createRoutingPreview(conditionalOnly), {
    code: 'INCOMPLETE_PROFILE_TOPOLOGY',
  });
});

test('preview accepts maximum quick gather fanout and rejects stronger-profile modes', () => {
  const maximumQuick = completeDraft('quick');
  const gather = maximumQuick.execution.waves.find(
    (wave) => wave.mode === 'gather',
  );
  for (let index = 2; index <= 4; index += 1) {
    gather.lanes.push({
      laneId: `lane-gather-${index}`,
      scope: `packet/gather-${index}`,
      writeRoot: `raw/dossiers/pass-gather-${index}.json`,
    });
  }
  const preview = createRoutingPreview(maximumQuick);
  assert.equal(preview.limits.laneCount, 6);
  assert.equal(preview.limits.countedAdaptiveLaneCount, 4);
  assert.equal(preview.profileCaps.maxLanes, 4);
  assert.match(
    renderRoutingPreview(preview),
    /Profile adaptive-lane cap: 4 \(counted lanes: 4 of 6 total\)/,
  );

  const forbidden = draftManifest({
    profile: 'quick',
    modes: ['map', 'gather', 'adversarial', 'compile'],
  });
  assert.throws(() => createRoutingPreview(forbidden), {
    code: 'WAVE_MODE_NOT_ALLOWED_FOR_PROFILE',
  });
});

test('preview enforces singleton order and condition-bound contradiction topology', () => {
  for (const [manifest, code] of [
    [duplicateSingletonDraft(), 'DUPLICATE_PROFILE_WAVE_MODE'],
    [outOfOrderDraft(), 'OUT_OF_ORDER_PROFILE_TOPOLOGY'],
    [
      unconditionalContradictionDraft(),
      'UNCONDITIONAL_CONTRADICTION_RESOLUTION',
    ],
  ]) {
    assert.throws(() => createRoutingPreview(manifest), { code });
  }

  for (const profile of ['quick', 'standard', 'thorough']) {
    assert.doesNotThrow(() => createRoutingPreview(completeDraft(profile)));
  }
  assert.doesNotThrow(() => createRoutingPreview(draftManifest()));
});

test('Markdown preview encodes every manifest value without injected structure', () => {
  const manifest = markdownHostileDraft();
  const preview = createRoutingPreview(manifest);
  const markdown = renderRoutingPreview(preview);
  const lines = markdown.split('\n');

  assert.equal(lines.filter((line) => line.startsWith('#')).length, 4);
  assert.equal(lines.filter((line) => line.startsWith('- ')).length, 10);
  assert.equal(
    lines.filter((line) => line.startsWith('|')).length,
    6 +
      preview.waves.length +
      preview.limits.laneCount +
      preview.conditions.length,
  );
  for (const raw of [
    '\n## False target',
    '\n## False reason',
    '\n## False lane',
    '\n## False limits',
    '\n## False condition',
    '\n- Lanes: 1',
    '`target`',
    '`reason`',
    '`scope`',
  ]) {
    assert.equal(markdown.includes(raw), false, `rendered raw ${raw}`);
  }
  for (const encoded of [
    '&#124;',
    '&#44;',
    '&#61;',
    '&#13;',
    '&#10;',
    '&#96;',
    '&#35;',
  ]) {
    assert.ok(markdown.includes(encoded), `missing encoding ${encoded}`);
  }

  const json = JSON.parse(renderRoutingPreview(preview, 'json'));
  assert.equal(json.waves[0].target.route, manifest.execution.target.route);
  assert.equal(
    json.conditions[0].conditionId,
    'condition|id\r\n## False condition\n`condition`_[unsafe]',
  );
});

test('preview rejects missing, malformed, mismatched, and over-cap v2 routing', () => {
  const missing = conditionalDraft();
  delete missing.execution.conditions;
  assert.throws(() => createRoutingPreview(missing), {
    code: 'MISSING_ROUTING_CONDITIONS',
  });

  const malformed = conditionalDraft();
  malformed.execution.conditions = [null];
  assert.throws(() => createRoutingPreview(malformed), {
    code: 'INVALID_ROUTING_CONDITION',
  });

  const mismatched = conditionalDraft();
  mismatched.execution.conditions[0].destinationWaveId = 'wave-map';
  assert.throws(() => createRoutingPreview(mismatched), {
    code: 'INVALID_CONDITION_DESTINATION',
  });

  const overCap = conditionalDraft();
  overCap.execution.maxConcurrency = 7;
  assert.throws(() => createRoutingPreview(overCap), {
    code: 'PROFILE_CONCURRENCY_CAP_EXCEEDED',
  });

  const laneCap = completeDraft('quick');
  const gather = laneCap.execution.waves.find((wave) => wave.mode === 'gather');
  for (let index = 0; index < 4; index += 1) {
    gather.lanes.push({
      laneId: `lane-gather-extra-${index}`,
      scope: `packet/gather-extra-${index}`,
      writeRoot: `raw/dossiers/gather-extra-${index}.json`,
    });
  }
  assert.throws(() => createRoutingPreview(laneCap), {
    code: 'PROFILE_LANE_CAP_EXCEEDED',
  });

  const conditionCap = conditionalDraft();
  const conditional = {
    waveId: 'wave-conditional-resolution-second',
    mode: 'contradiction-resolution',
    taskClass: 'mechanical-recon',
    classFloor: 'mechanical-recon',
    selectionReason: 'Bounded conditional evidence fixture.',
    lanes: [
      {
        laneId: 'lane-conditional-resolution-second',
        scope: 'packet/conditional-resolution-second',
        writeRoot: 'reviews/conditional-resolution-second.json',
      },
    ],
    conditional: true,
  };
  conditionCap.execution.waves.splice(1, 0, conditional);
  conditionCap.execution.conditions.push({
    conditionId: 'condition-resolution-second',
    destinationWaveId: conditional.waveId,
    afterWaveIds: ['wave-map'],
    predicate: 'insufficient-evidence',
    maxActivations: 1,
  });
  assert.throws(() => createRoutingPreview(conditionCap), {
    code: 'PROFILE_CONDITION_CAP_EXCEEDED',
  });
});

test('preview requires rationale and rejects unsupported target controls', () => {
  const noReason = draftManifest();
  noReason.execution.waves[0].selectionReason = '';
  assert.throws(() => createRoutingPreview(noReason), {
    code: 'MISSING_SELECTION_REASON',
  });

  const unsupported = draftManifest();
  unsupported.execution.target.temperature = 0;
  assert.throws(() => createRoutingPreview(unsupported), {
    code: 'UNSUPPORTED_TARGET_CONTROL',
  });
});

test('exact target check preserves opaque identity, nullable effort, and approval', () => {
  const execution = createV2ExecutionApproval({
    modes: requiredModesByProfile.quick,
    laneIdForMode,
    target: {
      ...fixtureTarget,
      route: 'opaque://selector/%2FCaseSensitive',
      model: 'synthetic/model:preview',
      effort: null,
    },
  });
  const manifest = {
    schemaVersion: 2,
    run: { requestedProfile: 'quick' },
    execution,
  };
  assert.equal(
    checkApprovedWaveTarget(manifest, 'wave-gather', execution.target).valid,
    true,
  );

  assert.throws(
    () =>
      checkApprovedWaveTarget(manifest, 'wave-gather', {
        ...execution.target,
        route: execution.target.route.toLowerCase(),
      }),
    { code: 'CONSTRUCTED_TARGET_MISMATCH' },
  );
  const unapproved = structuredClone(manifest);
  delete unapproved.execution.approval;
  assert.throws(
    () => checkApprovedWaveTarget(unapproved, 'wave-gather', execution.target),
    { code: 'MISSING_APPROVAL_ENVELOPE' },
  );
  assert.throws(
    () => checkApprovedWaveTarget(manifest, 'unknown', execution.target),
    { code: 'UNKNOWN_APPROVED_WAVE' },
  );
});

test('draft/refused preview is structurally non-launching', () => {
  const manifest = draftManifest();
  const serializedBefore = JSON.stringify(manifest);
  const preview = createRoutingPreview(manifest);
  assert.equal(preview.approvalState, 'draft');
  assert.equal(JSON.stringify(manifest), serializedBefore);
  assert.equal('launch' in preview, false);
  assert.equal('accepted' in preview, false);
});

test('thin CLI previews and checks targets with categorical nonzero failures', async () => {
  const root = await mkdtemp(join(tmpdir(), 'recon-routing-preview-'));
  tempRoots.push(root);
  const cli = fileURLToPath(
    new URL('../scripts/prepare-routing.mjs', import.meta.url),
  );
  const draft = draftManifest();
  const manifestPath = join(root, 'manifest.json');
  const targetPath = join(root, 'target.json');
  await writeFile(manifestPath, JSON.stringify(draft), 'utf8');

  const preview = spawnSync(
    process.execPath,
    [cli, '--manifest', manifestPath, '--format', 'json'],
    {
      encoding: 'utf8',
    },
  );
  assert.equal(preview.status, 0, preview.stderr);
  assert.equal(JSON.parse(preview.stdout).approvalState, 'draft');

  const validConditional = conditionalDraft();
  await writeFile(manifestPath, JSON.stringify(validConditional), 'utf8');
  const conditionalPreview = spawnSync(
    process.execPath,
    [cli, '--manifest', manifestPath, '--format', 'json'],
    { encoding: 'utf8' },
  );
  assert.equal(conditionalPreview.status, 0, conditionalPreview.stderr);
  assert.equal(JSON.parse(conditionalPreview.stdout).conditions.length, 1);

  for (const profile of ['quick', 'standard', 'thorough']) {
    const acceptedProfile = completeDraft(profile);
    await writeFile(manifestPath, JSON.stringify(acceptedProfile), 'utf8');
    const acceptedPreview = spawnSync(
      process.execPath,
      [cli, '--manifest', manifestPath, '--format', 'json'],
      { encoding: 'utf8' },
    );
    assert.equal(acceptedPreview.status, 0, acceptedPreview.stderr);

    const incompleteProfile = completeDraft(profile);
    incompleteProfile.execution.waves =
      incompleteProfile.execution.waves.filter(
        (wave) => wave.mode !== 'gather',
      );
    await writeFile(manifestPath, JSON.stringify(incompleteProfile), 'utf8');
    const rejectedProfile = spawnSync(
      process.execPath,
      [cli, '--manifest', manifestPath, '--format', 'json'],
      { encoding: 'utf8' },
    );
    assert.notEqual(rejectedProfile.status, 0);
    assert.match(rejectedProfile.stderr, /^INCOMPLETE_PROFILE_TOPOLOGY:/);
  }

  for (const [candidate, expectedCode] of [
    [duplicateSingletonDraft(), 'DUPLICATE_PROFILE_WAVE_MODE'],
    [outOfOrderDraft(), 'OUT_OF_ORDER_PROFILE_TOPOLOGY'],
    [
      unconditionalContradictionDraft(),
      'UNCONDITIONAL_CONTRADICTION_RESOLUTION',
    ],
  ]) {
    await writeFile(manifestPath, JSON.stringify(candidate), 'utf8');
    const rejectedTopology = spawnSync(
      process.execPath,
      [cli, '--manifest', manifestPath, '--format', 'json'],
      { encoding: 'utf8' },
    );
    assert.notEqual(rejectedTopology.status, 0);
    assert.match(rejectedTopology.stderr, new RegExp(`^${expectedCode}:`));
  }

  const hostile = markdownHostileDraft();
  await writeFile(manifestPath, JSON.stringify(hostile), 'utf8');
  const hostilePreview = spawnSync(
    process.execPath,
    [cli, '--manifest', manifestPath, '--format', 'markdown'],
    { encoding: 'utf8' },
  );
  assert.equal(hostilePreview.status, 0, hostilePreview.stderr);
  assert.equal(
    hostilePreview.stdout,
    renderRoutingPreview(createRoutingPreview(hostile)),
  );
  assert.equal(hostilePreview.stdout.includes('## False limits'), false);
  assert.equal(hostilePreview.stdout.split('\n').includes('- Lanes: 1'), false);
  assert.ok(hostilePreview.stdout.includes('&#124;'));
  assert.ok(hostilePreview.stdout.includes('&#10;'));

  for (const [mutate, expectedCode] of [
    [
      (candidate) => {
        delete candidate.execution.conditions;
      },
      'MISSING_ROUTING_CONDITIONS',
    ],
    [
      (candidate) => {
        candidate.execution.conditions = [null];
      },
      'INVALID_ROUTING_CONDITION',
    ],
    [
      (candidate) => {
        candidate.execution.conditions[0].destinationWaveId = 'wave-map';
      },
      'INVALID_CONDITION_DESTINATION',
    ],
  ]) {
    const candidate = conditionalDraft();
    mutate(candidate);
    await writeFile(manifestPath, JSON.stringify(candidate), 'utf8');
    const invalidPreview = spawnSync(
      process.execPath,
      [cli, '--manifest', manifestPath, '--format', 'json'],
      { encoding: 'utf8' },
    );
    assert.notEqual(invalidPreview.status, 0);
    assert.match(invalidPreview.stderr, new RegExp(`^${expectedCode}:`));
  }

  draft.execution = approveExecution(draft.execution);
  await writeFile(manifestPath, JSON.stringify(draft), 'utf8');
  await writeFile(targetPath, JSON.stringify(draft.execution.target), 'utf8');
  const accepted = spawnSync(
    process.execPath,
    [
      cli,
      '--manifest',
      manifestPath,
      '--wave',
      'wave-gather',
      '--check-target',
      targetPath,
    ],
    { encoding: 'utf8' },
  );
  assert.equal(accepted.status, 0, accepted.stderr);
  assert.equal(JSON.parse(accepted.stdout).valid, true);

  await writeFile(targetPath, '{broken', 'utf8');
  const rejected = spawnSync(
    process.execPath,
    [
      cli,
      '--manifest',
      manifestPath,
      '--wave',
      'wave-gather',
      '--check-target',
      targetPath,
    ],
    { encoding: 'utf8' },
  );
  assert.notEqual(rejected.status, 0);
  assert.match(rejected.stderr, /^INVALID_JSON:/);
});
