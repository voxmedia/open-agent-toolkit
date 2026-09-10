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
  'reconciliation',
  'redundant-gather',
  'redundant-verification',
  'contradiction-resolution',
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

function draftManifest() {
  const execution = createV2ExecutionApproval({
    modes: modeList,
    laneIdForMode,
  });
  delete execution.approval;
  return { schemaVersion: 2, execution };
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
  assert.equal(preview.limits.waveCount, 10);
  assert.equal(preview.limits.laneCount, 10);
  assert.match(renderRoutingPreview(preview), /Worst-case limits/);
  assert.equal(
    JSON.parse(renderRoutingPreview(preview, 'json')).waves.length,
    10,
  );
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
  const manifest = { schemaVersion: 2, execution };
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
