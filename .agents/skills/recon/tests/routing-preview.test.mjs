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
  return {
    schemaVersion: 2,
    run: { requestedProfile: profile },
    execution,
  };
}

function conditionalDraft() {
  const manifest = draftManifest({
    profile: 'standard',
    modes: ['map', 'reconciliation'],
  });
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
    '- Profile lane cap: 10',
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

  const laneCap = draftManifest({ profile: 'quick', modes: ['map'] });
  for (let index = 0; index < 4; index += 1) {
    laneCap.execution.waves[0].lanes.push({
      laneId: `lane-map-extra-${index}`,
      scope: `packet/map-extra-${index}`,
      writeRoot: `raw/dossiers/map-extra-${index}.json`,
    });
  }
  assert.throws(() => createRoutingPreview(laneCap), {
    code: 'PROFILE_LANE_CAP_EXCEEDED',
  });

  const conditionCap = conditionalDraft();
  conditionCap.run.requestedProfile = 'quick';
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
    modes: ['gather'],
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
  const mutated = structuredClone(manifest);
  mutated.execution.target.model = 'changed-after-approval';
  assert.throws(
    () =>
      checkApprovedWaveTarget(mutated, 'wave-gather', mutated.execution.target),
    { code: 'APPROVAL_FINGERPRINT_MISMATCH' },
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
