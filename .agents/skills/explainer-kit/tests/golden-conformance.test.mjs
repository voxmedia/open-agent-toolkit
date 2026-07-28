import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { isAbsolute, join, normalize, sep } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const fixtureRoot = fileURLToPath(
  new URL('./fixtures/golden/', import.meta.url),
);
const caseIds = ['simple', 'non-linear', 'explainer-authoring-redesign'];
const rubricFields = [
  'adaptiveMinimumSet',
  'firstViewport',
  'hierarchy',
  'representationChoice',
  'legibility',
  'cohesion',
  'sourceCoverage',
  'interactions',
  'topologyPreservation',
  'catalogParity',
  'boundedCorrection',
];
const machineLocalPatterns = [
  /\/Users\//,
  /\/home\/[^/]+\//,
  /file:\/\//,
  /(?:^|[\s"'`])~\//,
  /[A-Za-z]:\\Users\\/,
];

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

function fixturePath(caseRoot, relativePath) {
  assert.equal(typeof relativePath, 'string');
  assert.ok(relativePath.length > 0, 'fixture paths must not be empty');
  assert.equal(
    isAbsolute(relativePath),
    false,
    `fixture path must be relative: ${relativePath}`,
  );
  assert.equal(
    normalize(relativePath).split(sep).includes('..'),
    false,
    `fixture path must stay inside its case: ${relativePath}`,
  );
  return join(caseRoot, relativePath);
}

function assertPortable(value, label) {
  const serialized = JSON.stringify(value);
  for (const pattern of machineLocalPatterns) {
    assert.doesNotMatch(serialized, pattern, `${label} contains ${pattern}`);
  }
}

function validateRubric(rubric) {
  assert.equal(
    rubric.schemaVersion,
    'explainer-kit.golden-rubric/v1',
    'unknown golden rubric schema',
  );
  assert.deepEqual(
    Object.keys(rubric.checks).sort(),
    [...rubricFields].sort(),
    'golden rubric fields must be complete and exact',
  );
  for (const field of rubricFields) {
    const check = rubric.checks[field];
    assert.equal(check.required, true, `${field} must be required`);
    assert.ok(
      Array.isArray(check.evidence) && check.evidence.length > 0,
      `${field} must declare machine-readable evidence`,
    );
  }
}

async function loadGoldenFixture(caseId) {
  const caseRoot = join(fixtureRoot, caseId);
  const descriptor = await readJson(join(caseRoot, 'descriptor.json'));
  assert.equal(descriptor.schemaVersion, 'explainer-kit.golden-fixture/v1');
  assert.equal(descriptor.id, caseId);

  const [input, rubric, reference] = await Promise.all([
    readJson(fixturePath(caseRoot, descriptor.inputPath)),
    readJson(fixturePath(caseRoot, descriptor.rubricPath)),
    readJson(fixturePath(caseRoot, descriptor.referenceEvidencePath)),
  ]);
  assert.equal(input.schemaVersion, 'explainer-kit.golden-input/v1');
  assert.equal(input.id, caseId);
  assert.ok(input.sources.length > 0, `${caseId} must carry stable sources`);
  validateRubric(rubric);
  assert.equal(reference.schemaVersion, 'explainer-kit.personal-reference/v1');
  assert.equal(reference.caseId, caseId);
  assert.equal(reference.producer, 'personal-explainer-kit');
  assert.equal(reference.pixelIdentityRequired, false);
  assert.ok(
    reference.artifacts.length > 0,
    `${caseId} must record comparison outputs`,
  );
  assert.deepEqual(
    Object.keys(reference.rubricEvidence).sort(),
    [...rubricFields].sort(),
    `${caseId} reference evidence must cover the rubric`,
  );
  for (const field of rubricFields) {
    assert.equal(
      reference.rubricEvidence[field].status,
      'reference-met',
      `${caseId} ${field} must have a terminal reference status`,
    );
    assert.ok(
      reference.rubricEvidence[field].observation.length > 0,
      `${caseId} ${field} must have a comparison observation`,
    );
  }

  assertPortable(descriptor, `${caseId} descriptor`);
  assertPortable(input, `${caseId} input`);
  assertPortable(rubric, `${caseId} rubric`);
  assertPortable(reference, `${caseId} reference`);

  return { descriptor, input, rubric, reference };
}

test('loads all three portable golden fixture descriptors', async () => {
  const fixtures = await Promise.all(caseIds.map(loadGoldenFixture));

  assert.deepEqual(
    fixtures.map((fixture) => fixture.descriptor.id),
    caseIds,
  );
  for (const fixture of fixtures.slice(1)) {
    assert.deepEqual(
      fixture.rubric,
      fixtures[0].rubric,
      `${fixture.descriptor.id} must use the shared golden rubric`,
    );
  }
});

test('requires every explicit machine-readable rubric field', () => {
  const rubric = {
    schemaVersion: 'explainer-kit.golden-rubric/v1',
    checks: Object.fromEntries(
      rubricFields.map((field) => [
        field,
        { required: true, evidence: ['fixture-evidence'] },
      ]),
    ),
  };
  delete rubric.checks.catalogParity;

  assert.throws(() => validateRubric(rubric), /complete and exact/);
});

test('rejects machine-local paths from committed conformance data', () => {
  assert.throws(
    () =>
      assertPortable(
        { source: '/Users/operator/.agents/skills/personal-explainer-kit' },
        'seeded local path',
      ),
    /contains/,
  );
});
