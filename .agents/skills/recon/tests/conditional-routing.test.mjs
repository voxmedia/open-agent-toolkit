import assert from 'node:assert/strict';
import { readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, test } from 'node:test';

import { hashFile } from '../scripts/lib/canonical-json.mjs';
import { validateArtifactShape } from '../scripts/lib/contracts.mjs';
import { controllerEscalationDisposition } from '../scripts/lib/routing.mjs';
import { validatePacket } from '../scripts/validate-packet.mjs';
import {
  approveExecution,
  configureConditionalContradiction,
  createPacketFixture,
} from './fixtures/packet-fixture.mjs';

const roots = [];

afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

async function fixture(options = {}) {
  const packet = await createPacketFixture({
    includeContradictionResolution: options.profile === 'thorough',
    ...options,
  });
  roots.push(packet.tempRoot);
  return packet;
}

async function persistManifest(packet) {
  await writeFile(
    packet.manifestPath,
    `${JSON.stringify(packet.manifest, null, 2)}\n`,
    'utf8',
  );
}

function codes(validation) {
  return validation.errors.map((error) => error.code);
}

test('complete triggered and non-triggered condition branches validate', async () => {
  const triggered = await fixture({ profile: 'thorough' });
  await configureConditionalContradiction(triggered, {
    disposition: 'triggered',
  });
  const triggeredResult = await validatePacket(triggered.packetRoot);
  assert.equal(
    triggeredResult.valid,
    true,
    JSON.stringify(triggeredResult, null, 2),
  );
  assert.equal(triggeredResult.achievedProfile, 'thorough');

  const skipped = await fixture({ profile: 'standard' });
  await configureConditionalContradiction(skipped, {
    disposition: 'not-triggered',
  });
  const skippedResult = await validatePacket(skipped.packetRoot);
  assert.equal(
    skippedResult.valid,
    true,
    JSON.stringify(skippedResult, null, 2),
  );
  assert.equal(skippedResult.achievedProfile, 'standard');
});

test('condition topology is forward-only, single-activation, unique-output, and capped', async () => {
  const packet = await fixture({ profile: 'standard' });
  await configureConditionalContradiction(packet);
  const condition = packet.manifest.execution.conditions[0];
  condition.afterWaveIds = ['wave-reconciliation'];
  condition.maxActivations = 2;
  packet.manifest.execution.waves.find(
    (wave) => wave.mode === 'contradiction-resolution',
  ).lanes[0].writeRoot = packet.manifest.execution.waves[0].lanes[0].writeRoot;
  packet.manifest.execution.maxConcurrency = 7;
  const gatherWave = packet.manifest.execution.waves.find(
    (wave) => wave.mode === 'gather',
  );
  for (let index = 0; index < 6; index += 1) {
    gatherWave.lanes.push({
      laneId: `lane-cap-overflow-${index}`,
      scope: `packet/cap-overflow-${index}`,
      writeRoot: `raw/dossiers/cap-overflow-${index}.json`,
    });
  }
  packet.manifest.execution = approveExecution(packet.manifest.execution);
  const result = validateArtifactShape(packet.manifest);
  for (const code of [
    'NON_FORWARD_CONDITION',
    'INVALID_CONDITION_LIMIT',
    'DUPLICATE_WAVE_OUTPUT',
    'PROFILE_LANE_CAP_EXCEEDED',
    'PROFILE_CONCURRENCY_CAP_EXCEEDED',
  ]) {
    assert.ok(
      codes(result).includes(code),
      `${code}: ${JSON.stringify(result)}`,
    );
  }
});

test('unknown, duplicate, and terminal condition destinations fail closed', async () => {
  const packet = await fixture({ profile: 'standard' });
  await configureConditionalContradiction(packet);
  const base = packet.manifest.execution.conditions[0];
  packet.manifest.execution.conditions = [
    { ...structuredClone(base), afterWaveIds: ['wave-missing'] },
    { ...structuredClone(base), conditionId: 'condition-second' },
  ];
  packet.manifest.execution.waves.find(
    (wave) => wave.mode === 'reconciliation',
  ).conditional = true;
  packet.manifest.execution = approveExecution(packet.manifest.execution);
  const result = validateArtifactShape(packet.manifest);
  for (const code of [
    'UNKNOWN_CONDITION_WAVE',
    'DUPLICATE_CONDITION_DESTINATION',
    'INVALID_TERMINAL_TOPOLOGY',
    'PROFILE_CONDITION_CAP_EXCEEDED',
  ]) {
    assert.ok(
      codes(result).includes(code),
      `${code}: ${JSON.stringify(result)}`,
    );
  }
});

test('triggered lanes require exact complete predicate evidence and output', async () => {
  const packet = await fixture({ profile: 'standard' });
  await configureConditionalContradiction(packet, { disposition: 'triggered' });
  let result = await validatePacket(packet.packetRoot);
  assert.ok(
    codes(result).includes('MISSING_LANE_OUTCOME'),
    JSON.stringify(result, null, 2),
  );

  packet.manifest.conditionOutcomes[0].evidence[0].digest = `sha256:${'0'.repeat(64)}`;
  await persistManifest(packet);
  result = await validatePacket(packet.packetRoot);
  assert.ok(
    codes(result).includes('INVALID_CONDITION_EVIDENCE'),
    JSON.stringify(result, null, 2),
  );
});

test('triggered dispositions reject completed evidence that does not satisfy the predicate', async () => {
  const packet = await fixture({ profile: 'standard' });
  await configureConditionalContradiction(packet, {
    disposition: 'not-triggered',
  });
  packet.manifest.conditionOutcomes[0].disposition = 'triggered';
  packet.manifest.conditionOutcomes[0].reason =
    'Hostile fixture claims activation without predicate evidence.';
  await persistManifest(packet);
  const result = await validatePacket(packet.packetRoot);
  assert.ok(
    codes(result).includes('CONDITION_PREDICATE_UNSATISFIED'),
    JSON.stringify(result, null, 2),
  );
});

test('a triggered lane may terminate only with a material typed outcome gap', async () => {
  const packet = await fixture({ profile: 'standard' });
  await configureConditionalContradiction(packet, { disposition: 'triggered' });
  packet.manifest.run.status = 'partial';
  packet.manifest.gaps.push({
    id: 'gap-condition-terminal-failure',
    code: 'PASS_FAILED',
    message: 'The activated conditional lane failed before writing its result.',
    material: true,
    waveId: 'wave-contradiction-resolution',
    laneId: 'lane-contradiction-resolution',
    sourceIds: [],
    claimIds: [],
    coverageFindingIds: [],
  });
  await persistManifest(packet);
  const result = await validatePacket(packet.packetRoot);
  assert.equal(result.valid, true, JSON.stringify(result, null, 2));
  assert.equal(result.status, 'partial');
});

test('two triggered lanes require distinct exact wave and lane outcome gaps', async () => {
  const packet = await fixture({
    profile: 'thorough',
    includeContradictionResolution: false,
  });
  await configureConditionalContradiction(packet, { disposition: 'triggered' });
  const execution = packet.manifest.execution;
  const firstWave = execution.waves.find(
    (wave) => wave.waveId === 'wave-contradiction-resolution',
  );
  const secondWave = structuredClone(firstWave);
  secondWave.waveId = 'wave-contradiction-resolution-second';
  secondWave.lanes[0].laneId = 'lane-contradiction-resolution-second';
  secondWave.lanes[0].scope = 'packet/contradiction-resolution-second';
  secondWave.lanes[0].writeRoot =
    'reviews/contradiction-resolution-second.json';
  const terminalIndex = execution.waves.findIndex(
    (wave) => wave.mode === 'reconciliation',
  );
  execution.waves.splice(terminalIndex, 0, secondWave);
  const secondCondition = structuredClone(execution.conditions[0]);
  secondCondition.conditionId = 'condition-contradiction-resolution-second';
  secondCondition.destinationWaveId = secondWave.waveId;
  execution.conditions.push(secondCondition);
  const secondOutcome = structuredClone(packet.manifest.conditionOutcomes[0]);
  secondOutcome.conditionId = secondCondition.conditionId;
  packet.manifest.conditionOutcomes.push(secondOutcome);
  packet.manifest.execution = approveExecution(execution);
  packet.manifest.run.status = 'partial';
  packet.manifest.gaps.push({
    id: 'gap-shared-conditional-outcome',
    code: 'PASS_FAILED',
    message:
      'Activated wave `wave-contradiction-resolution` lane `lane-contradiction-resolution` failed.',
    material: true,
    sourceIds: [],
    claimIds: [],
    coverageFindingIds: [],
  });
  await persistManifest(packet);

  let result = await validatePacket(packet.packetRoot);
  assert.ok(
    result.errors.some(
      (error) =>
        error.code === 'MISSING_LANE_OUTCOME' &&
        error.path === 'lane:lane-contradiction-resolution',
    ),
    'free-text wave and lane names must not settle a structured lane outcome',
  );

  Object.assign(
    packet.manifest.gaps.find(
      (gap) => gap.id === 'gap-shared-conditional-outcome',
    ),
    {
      waveId: 'wave-contradiction-resolution',
      laneId: 'lane-contradiction-resolution',
    },
  );
  await persistManifest(packet);
  result = await validatePacket(packet.packetRoot);
  assert.ok(
    result.errors.some(
      (error) =>
        error.code === 'MISSING_LANE_OUTCOME' &&
        error.path === 'lane:lane-contradiction-resolution-second',
    ),
    JSON.stringify(result, null, 2),
  );
  assert.equal(
    result.errors.some(
      (error) =>
        error.code === 'MISSING_LANE_OUTCOME' &&
        error.path === 'lane:lane-contradiction-resolution',
    ),
    false,
  );

  packet.manifest.gaps.push({
    id: 'gap-second-conditional-outcome',
    code: 'PASS_OMITTED',
    message: 'The second activated conditional lane was omitted.',
    material: true,
    waveId: 'wave-contradiction-resolution-second',
    laneId: 'lane-contradiction-resolution-second',
    sourceIds: [],
    claimIds: [],
    coverageFindingIds: [],
  });
  await persistManifest(packet);
  result = await validatePacket(packet.packetRoot);
  assert.equal(result.valid, true, JSON.stringify(result, null, 2));
  assert.equal(result.status, 'partial');
});

test('non-triggered lanes cannot publish or contribute conditional artifacts', async () => {
  const packet = await fixture({ profile: 'thorough' });
  await configureConditionalContradiction(packet, { disposition: 'triggered' });
  packet.manifest.conditionOutcomes[0].disposition = 'not-triggered';
  packet.manifest.conditionOutcomes[0].reason =
    'Root recorded that the evidence predicate did not activate.';
  await persistManifest(packet);
  const result = await validatePacket(packet.packetRoot);
  assert.ok(
    codes(result).includes('INACTIVE_CONDITIONAL_ARTIFACT'),
    JSON.stringify(result, null, 2),
  );
});

test('foreign-run artifacts are rejected by run ownership without inactive-condition noise', async () => {
  const packet = await fixture({ profile: 'thorough' });
  await configureConditionalContradiction(packet, { disposition: 'triggered' });
  packet.manifest.conditionOutcomes[0].disposition = 'not-triggered';
  packet.manifest.conditionOutcomes[0].reason =
    'Root recorded that the evidence predicate did not activate.';
  const relative = 'reviews/contradiction-resolution.json';
  const path = join(packet.packetRoot, relative);
  const artifact = JSON.parse(await readFile(path, 'utf8'));
  artifact.runId = 'run-foreign';
  await writeFile(path, `${JSON.stringify(artifact, null, 2)}\n`, 'utf8');
  packet.manifest.artifacts.find(
    (reference) => reference.path === relative,
  ).digest = await hashFile(path);
  await persistManifest(packet);

  const result = await validatePacket(packet.packetRoot);
  assert.equal(result.valid, false);
  assert.equal(
    codes(result).includes('INACTIVE_CONDITIONAL_ARTIFACT'),
    false,
    JSON.stringify(result, null, 2),
  );
  assert.ok(
    codes(result).includes('RECONCILIATION_REVIEW_MISMATCH'),
    JSON.stringify(result, null, 2),
  );
});

test('failed accepted predecessors cannot activate replacement work', async () => {
  const packet = await fixture({ profile: 'standard' });
  await configureConditionalContradiction(packet, { disposition: 'triggered' });
  const mapPath = join(packet.packetRoot, 'raw/dossiers/pass-map.json');
  const map = JSON.parse(await readFile(mapPath, 'utf8'));
  map.outcome = 'failed';
  await writeFile(mapPath, `${JSON.stringify(map, null, 2)}\n`, 'utf8');
  const reference = packet.manifest.artifacts.find(
    (item) => item.path === 'raw/dossiers/pass-map.json',
  );
  reference.digest = await hashFile(mapPath);
  packet.manifest.conditionOutcomes[0].evidence = [{ ...reference }];
  await persistManifest(packet);
  const result = await validatePacket(packet.packetRoot);
  assert.ok(
    codes(result).includes('INCOMPLETE_CONDITION_PREDECESSOR'),
    JSON.stringify(result, null, 2),
  );
});

test('required profile failures remain visible beside unresolved conditions', async () => {
  const packet = await fixture({ profile: 'standard' });
  await configureConditionalContradiction(packet, {
    disposition: 'unresolved',
  });
  packet.manifest.artifacts = packet.manifest.artifacts.filter(
    (reference) => reference.path !== 'reviews/semantic.json',
  );
  await persistManifest(packet);
  const result = await validatePacket(packet.packetRoot);
  assert.ok(
    codes(result).includes('MISSING_PASS_OUTCOME_EVIDENCE'),
    JSON.stringify(result, null, 2),
  );
});

test('judgment escalation never mutates or duplicates terminal routing', () => {
  assert.deepEqual(
    controllerEscalationDisposition({
      outcome: 'reconciliation-needs-judgment',
      foreseeable: false,
      approvedTargetAdequate: false,
    }),
    {
      action: 'renew-approval-or-new-run',
      preserveCompletedWork: true,
      launchAllowed: false,
      gap: 'unresolved-out-of-envelope',
    },
  );
  assert.equal(
    controllerEscalationDisposition({
      outcome: 'reconciliation-needs-judgment',
      foreseeable: true,
      approvedTargetAdequate: false,
    }).action,
    'select-before-approval',
  );
});
