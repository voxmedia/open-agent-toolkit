import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  validateAssignmentFile,
  validateAssignmentValue,
} from '../scripts/validate-assignment.mjs';

// Envelopes for the two reconnaissance lanes project review launches: a
// mechanical inventory lane and an intelligent contract-semantics lane. The
// invalid fixtures are the GitHub #295 failure — accepted launches whose
// envelopes a worker then rejected — expressed as the bytes a controller
// would have handed over.
const fixtures = new URL('./fixtures/assignments/', import.meta.url);
const script = fileURLToPath(
  new URL('../scripts/validate-assignment.mjs', import.meta.url),
);

async function loadFixture(name) {
  return JSON.parse(await readFile(new URL(name, fixtures), 'utf8'));
}

function fixturePath(name) {
  return fileURLToPath(new URL(name, fixtures));
}

function runCli(args, input) {
  const result = spawnSync(process.execPath, [script, ...args], {
    encoding: 'utf8',
    input: input ?? '',
  });
  return {
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

function codesAt(errors) {
  return errors.map((error) => `${error.code} ${error.path}`);
}

for (const name of [
  'valid-mechanical-recon.json',
  'valid-intelligent-recon.json',
]) {
  test(`accepts the ${name.replace(/^valid-|\.json$/g, '')} lane envelope`, async () => {
    const result = validateAssignmentValue(await loadFixture(name));
    assert.deepEqual(result.errors, []);
    assert.equal(result.valid, true);

    const cli = runCli([fixturePath(name)]);
    assert.equal(cli.status, 0, cli.stdout + cli.stderr);
    assert.equal(JSON.parse(cli.stdout).valid, true);
  });
}

test('reports every missing field of an incomplete envelope, not just the first', async () => {
  const result = validateAssignmentValue(
    await loadFixture('invalid-incomplete.json'),
  );
  assert.equal(result.valid, false);
  assert.deepEqual(codesAt(result.errors), [
    'MISSING_FIELD $.laneId',
    'MISSING_FIELD $.waveMode',
    'MISSING_FIELD $.readSources',
    'MISSING_FIELD $.writePath',
    'MISSING_FIELD $.deadlineSeconds',
    'MISSING_FIELD $.escalation',
  ]);
  for (const error of result.errors) {
    assert.equal(error.severity, 'error');
    assert.match(error.message, /\S/);
  }

  const cli = runCli([fixturePath('invalid-incomplete.json')]);
  assert.equal(cli.status, 1);
  const report = JSON.parse(cli.stdout);
  assert.equal(report.valid, false);
  assert.equal(report.errors.length, 6);
});

test('reports every contradictory or invalid field of an envelope', async () => {
  const result = validateAssignmentValue(
    await loadFixture('invalid-contradictory.json'),
  );
  assert.equal(result.valid, false);
  assert.deepEqual(codesAt(result.errors), [
    'UNKNOWN_FIELD $.priority',
    'MODE_MISMATCH $.mode',
    'INVALID_FIELD $.taskClass',
    'INPUT_OVERLAPS_EXCLUSION $.inputs.allowed[1]',
    'MUTATING_TOOL $.readSources.tools[1]',
    'UNSAFE_WRITE_PATH $.writePath',
    'INVALID_FIELD $.artifact.kind',
    'INVALID_FIELD $.artifact.schemaVersion',
    'MISSING_FIELD $.artifact.outputSchema',
    'UNLAUNCHABLE_ENFORCEMENT $.enforcement',
    'INVALID_FIELD $.deadlineSeconds',
    'INVALID_FIELD $.failureRecording',
  ]);
});

test('rejects a wave whose lanes share a write path or lane ID', async () => {
  const first = await loadFixture('valid-mechanical-recon.json');
  const second = {
    ...(await loadFixture('valid-intelligent-recon.json')),
    laneId: first.laneId,
    writePath: first.writePath,
  };
  const result = validateAssignmentValue([first, second]);
  assert.equal(result.valid, false);
  assert.deepEqual(codesAt(result.errors), [
    'DUPLICATE_LANE_ID $[1].laneId',
    'DUPLICATE_WRITE_PATH $[1].writePath',
  ]);

  const wave = validateAssignmentValue([
    first,
    await loadFixture('valid-intelligent-recon.json'),
  ]);
  assert.deepEqual(wave.errors, []);
});

test('rejects a non-object envelope and an empty wave', () => {
  assert.deepEqual(codesAt(validateAssignmentValue('launch it').errors), [
    'INVALID_ENVELOPE $',
  ]);
  assert.deepEqual(codesAt(validateAssignmentValue([]).errors), [
    'INVALID_ENVELOPE $',
  ]);
});

test('reports unreadable JSON as an invalid envelope', async () => {
  const result = await validateAssignmentFile(
    fixturePath('../command-output.txt'),
  );
  assert.equal(result.valid, false);
  assert.deepEqual(codesAt(result.errors), ['INVALID_JSON $']);

  const cli = runCli(['-'], '{ not json');
  assert.equal(cli.status, 1);
  assert.equal(JSON.parse(cli.stdout).errors[0].code, 'INVALID_JSON');
});

test('reads an envelope from standard input', async () => {
  const body = await readFile(
    fixturePath('valid-intelligent-recon.json'),
    'utf8',
  );
  const cli = runCli(['-'], body);
  assert.equal(cli.status, 0, cli.stdout + cli.stderr);
  assert.equal(JSON.parse(cli.stdout).valid, true);
});

test('exits with a usage error when no envelope is named', () => {
  const cli = runCli([]);
  assert.equal(cli.status, 2);
  assert.match(cli.stderr, /Usage: validate-assignment\.mjs/);
});

test('the envelope documented in the worker contract validates', async () => {
  const contract = await readFile(
    new URL('../references/worker-contract.md', import.meta.url),
    'utf8',
  );
  const documented = [...contract.matchAll(/```json\n([\s\S]*?)\n```/g)]
    .map((match) => JSON.parse(match[1]))
    .filter(({ kind }) => kind === 'recon.assignment');
  assert.equal(documented.length, 1);
  assert.deepEqual(validateAssignmentValue(documented[0]).errors, []);
});
