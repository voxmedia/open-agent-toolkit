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
  const second = { ...first, objective: 'A second bounded objective.' };
  const result = validateAssignmentValue([first, second]);
  assert.equal(result.valid, false);
  assert.deepEqual(codesAt(result.errors), [
    'DUPLICATE_LANE_ID $[1].laneId',
    'DUPLICATE_WRITE_PATH $[1].writePath',
  ]);
});

test('accepts an array only as one homogeneous wave', async () => {
  const first = await loadFixture('valid-mechanical-recon.json');
  // Accepted control: a second lane of the same run, wave, wave mode, and
  // task class, with its own lane ID and write path.
  const sameWave = {
    ...first,
    laneId: 'lane-docs-parity',
    writePath: 'raw/dossiers/lane-docs-parity.json',
  };
  assert.deepEqual(validateAssignmentValue([first, sameWave]).errors, []);

  // Mixed task classes need separate waves (oat-reviewer.md), so the
  // intelligent lane from another run cannot ride the mechanical lane's wave.
  const mixed = {
    ...(await loadFixture('valid-intelligent-recon.json')),
    runId: 'review-p04-other',
  };
  const result = validateAssignmentValue([first, mixed]);
  assert.equal(result.valid, false);
  assert.deepEqual(codesAt(result.errors), [
    'WAVE_MISMATCH $[1].runId',
    'WAVE_MISMATCH $[1].waveId',
    'WAVE_MISMATCH $[1].waveMode',
    'WAVE_MISMATCH $[1].mode',
    'WAVE_MISMATCH $[1].taskClass',
  ]);
});

test('rejects a write path that does not name a lane file', async () => {
  const base = await loadFixture('valid-mechanical-recon.json');
  for (const writePath of [
    '.',
    './',
    'raw/',
    '/tmp/lane.json',
    '../lane.json',
    'raw/../../lane.json',
    'raw\\lane.json',
    'C:lane.json',
  ]) {
    assert.deepEqual(
      codesAt(validateAssignmentValue({ ...base, writePath }).errors),
      ['UNSAFE_WRITE_PATH $.writePath'],
      writePath,
    );
  }
});

test('treats file-editing tools from any provider as mutating, in any case', async () => {
  const base = await loadFixture('valid-mechanical-recon.json');
  const result = validateAssignmentValue({
    ...base,
    readSources: {
      ...base.readSources,
      tools: ['Read', 'write', 'apply_patch', 'Write_File', 'EDIT'],
    },
  });
  assert.deepEqual(codesAt(result.errors), [
    'MUTATING_TOOL $.readSources.tools[1]',
    'MUTATING_TOOL $.readSources.tools[2]',
    'MUTATING_TOOL $.readSources.tools[3]',
    'MUTATING_TOOL $.readSources.tools[4]',
  ]);
});

test('reports a missing envelope file distinctly from invalid JSON', async () => {
  const missingPath = fixturePath('does-not-exist.json');
  const result = await validateAssignmentFile(missingPath);
  assert.equal(result.valid, false);
  assert.deepEqual(codesAt(result.errors), ['UNREADABLE_ENVELOPE $']);

  const cli = runCli([missingPath]);
  assert.equal(cli.status, 2);
  assert.equal(JSON.parse(cli.stdout).errors[0].code, 'UNREADABLE_ENVELOPE');
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

// GitHub #295 gate finding: read authority is bounded by the lane's own
// declared inputs and scope, descendant-aware, before any launch is accepted.
test('accepts a read source nested inside the allowed inputs and scope', async () => {
  const base = await loadFixture('valid-mechanical-recon.json');
  const result = validateAssignmentValue({
    ...base,
    readSources: {
      ...base.readSources,
      sources: ['.agents/agents/oat-reviewer.md', './.codex/agents/'],
    },
  });
  assert.deepEqual(result.errors, []);
});

test('rejects read sources that cannot be verified or escape the lane authority', async () => {
  const base = await loadFixture('valid-mechanical-recon.json');
  const withSources = (sources) =>
    codesAt(
      validateAssignmentValue({
        ...base,
        readSources: { ...base.readSources, sources },
      }).errors,
    );

  // An unrelated absolute path, a `..` escape, and a Windows path cannot be
  // bound to the repository before launch.
  assert.deepEqual(
    withSources([
      '/etc/passwd',
      '.agents/agents/../../etc/passwd',
      'C:\\secrets.txt',
    ]),
    [
      'UNVERIFIABLE_SOURCE $.readSources.sources[0]',
      'UNVERIFIABLE_SOURCE $.readSources.sources[1]',
      'UNVERIFIABLE_SOURCE $.readSources.sources[2]',
    ],
  );

  // A relative source under none of the allowed inputs or included scope,
  // including a sibling that merely shares a name prefix.
  assert.deepEqual(withSources(['.agents/agents-private/x.md']), [
    'SOURCE_OUTSIDE_AUTHORITY $.readSources.sources[0]',
    'SOURCE_OUTSIDE_SCOPE $.readSources.sources[0]',
  ]);

  // A descendant of the excluded `reviews/` input is excluded with it.
  assert.deepEqual(withSources(['reviews/private.json']), [
    'SOURCE_OUTSIDE_AUTHORITY $.readSources.sources[0]',
    'SOURCE_OUTSIDE_SCOPE $.readSources.sources[0]',
    'INPUT_OVERLAPS_EXCLUSION $.readSources.sources[0]',
  ]);
});

test('excludes descendants of excluded inputs and scope even inside allowed ones', async () => {
  const base = await loadFixture('valid-mechanical-recon.json');
  const envelope = {
    ...base,
    scope: { included: ['.agents/'], excluded: ['.agents/skills'] },
    inputs: { allowed: ['.agents'], excluded: ['.agents/agents/private/'] },
  };
  const check = (sources) =>
    codesAt(
      validateAssignmentValue({
        ...envelope,
        readSources: { ...base.readSources, sources },
      }).errors,
    );

  assert.deepEqual(check(['.agents/agents/oat-reviewer.md']), []);
  assert.deepEqual(check(['.agents/agents/private/notes.md']), [
    'INPUT_OVERLAPS_EXCLUSION $.readSources.sources[0]',
  ]);
  assert.deepEqual(check(['.agents/skills/recon/SKILL.md']), [
    'SOURCE_OUTSIDE_SCOPE $.readSources.sources[0]',
  ]);

  // An allowed input nested under an excluded one contradicts itself, and an
  // exclusion that cannot be bound to the repository excludes nothing.
  assert.deepEqual(
    codesAt(
      validateAssignmentValue({
        ...envelope,
        readSources: { ...base.readSources, sources: ['.agents/agents'] },
        inputs: {
          allowed: ['.agents', '.agents/agents/private/keys.md'],
          excluded: ['.agents/agents/private/', '/abs/reviews'],
        },
      }).errors,
    ),
    [
      'INPUT_OVERLAPS_EXCLUSION $.inputs.allowed[1]',
      'UNVERIFIABLE_SOURCE $.inputs.excluded[1]',
    ],
  );
});

test('bounds URL read sources by origin and path segment', async () => {
  const base = await loadFixture('valid-mechanical-recon.json');
  const docs = 'https://docs.example.com/guide/';
  const envelope = {
    ...base,
    scope: { included: [docs], excluded: [] },
    inputs: { allowed: [docs], excluded: [] },
  };
  const check = (sources) =>
    codesAt(
      validateAssignmentValue({
        ...envelope,
        readSources: { ...base.readSources, sources },
      }).errors,
    );
  assert.deepEqual(check(['https://docs.example.com/guide/install']), []);
  assert.deepEqual(check(['https://docs.example.com/guidebook']), [
    'SOURCE_OUTSIDE_AUTHORITY $.readSources.sources[0]',
    'SOURCE_OUTSIDE_SCOPE $.readSources.sources[0]',
  ]);
  assert.deepEqual(check(['https://evil.example.com/guide/install']), [
    'SOURCE_OUTSIDE_AUTHORITY $.readSources.sources[0]',
    'SOURCE_OUTSIDE_SCOPE $.readSources.sources[0]',
  ]);
});

test('accepts only an approved packet-contract schema reference or a closed inline schema', async () => {
  const base = await loadFixture('valid-mechanical-recon.json');
  const withSchema = (outputSchema, kind = base.artifact.kind) =>
    codesAt(
      validateAssignmentValue({
        ...base,
        artifact: { ...base.artifact, kind, outputSchema },
      }).errors,
    );

  // The documented reference for the lane's own artifact kind.
  assert.deepEqual(
    withSchema('references/packet-contract.md#recon.raw-dossier'),
    [],
  );
  assert.deepEqual(
    withSchema({
      type: 'object',
      additionalProperties: false,
      required: ['kind', 'schemaVersion', 'findings'],
      properties: {
        kind: { const: 'recon.raw-dossier' },
        schemaVersion: { const: 1 },
        findings: { type: 'array' },
      },
    }),
    [],
  );

  // An unknown reference, a reference to another kind's schema, and an open
  // object the worker could not treat as closed.
  assert.deepEqual(withSchema('does-not-exist.json'), [
    'UNKNOWN_OUTPUT_SCHEMA $.artifact.outputSchema',
  ]);
  assert.deepEqual(
    withSchema('references/packet-contract.md#recon.review-result'),
    ['UNKNOWN_OUTPUT_SCHEMA $.artifact.outputSchema'],
  );
  assert.deepEqual(withSchema({ foo: 1 }), [
    'OPEN_OUTPUT_SCHEMA $.artifact.outputSchema',
  ]);
  assert.deepEqual(
    withSchema({
      type: 'object',
      additionalProperties: true,
      required: ['kind', 'schemaVersion'],
      properties: { kind: {}, schemaVersion: {} },
    }),
    ['OPEN_OUTPUT_SCHEMA $.artifact.outputSchema'],
  );
});
