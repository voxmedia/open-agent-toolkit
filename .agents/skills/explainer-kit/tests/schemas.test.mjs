import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const skillRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);

const schemas = {
  'run-request': 'explainer-kit.run-request/v1',
  'fact-base': 'explainer-kit.fact-base/v1',
  theme: 'explainer-kit.theme/v1',
  manifest: 'explainer-kit.manifest/v1',
  'build-record': 'explainer-kit.build-record/v1',
  'durability-evidence': 'explainer-kit.durability-evidence/v1',
  'publish-request': 'explainer-kit.publish-request/v1',
  'publish-receipt': 'explainer-kit.publish-receipt/v1',
  'author-request.v2': 'explainer-kit.author-request/v2',
  'author-result.v2': 'explainer-kit.author-result/v2',
  'set-plan.v1': 'explainer-kit.set-plan/v1',
  'visual-review-request.v1': 'explainer-kit.visual-review-request/v1',
  'visual-review-result.v1': 'explainer-kit.visual-review-result/v1',
};

async function loadSchema(name) {
  return JSON.parse(
    await readFile(
      path.join(skillRoot, 'schemas', `${name}.schema.json`),
      'utf8',
    ),
  );
}

function collectObjectSchemas(value, location = '#', found = []) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return found;
  if (value.type === 'object' && value.properties)
    found.push([location, value]);
  for (const [key, child] of Object.entries(value)) {
    collectObjectSchemas(child, `${location}/${key}`, found);
  }
  return found;
}

test('every supported contract has the required identity and closed objects', async () => {
  for (const [name, id] of Object.entries(schemas)) {
    const schema = await loadSchema(name);
    assert.equal(
      schema.$schema,
      'https://json-schema.org/draft/2020-12/schema',
    );
    assert.equal(schema.$id, id);
    assert.deepEqual(schema.properties.schemaVersion.const, id);

    for (const [location, objectSchema] of collectObjectSchemas(schema)) {
      assert.equal(
        objectSchema.additionalProperties,
        false,
        `${name}${location} must be closed`,
      );
    }
  }
});

test('run request persists render strategy and complete durability input', async () => {
  const schema = await loadSchema('run-request');
  const themeSelection = schema.$defs.themeSelection;
  assert.deepEqual(themeSelection.properties.renderStrategy.enum, [
    'default-only',
    'user-switchable',
  ]);
  assert.equal(
    themeSelection.properties.suppliedBundlePath.$ref,
    '#/$defs/relativeOrAbsolutePath',
  );
  assert.deepEqual(schema.properties.durability.required, ['strategy']);
  assert.deepEqual(schema.properties.durability.properties.strategy.enum, [
    'none',
    'commit',
    'publish',
  ]);
  assert.equal(schema.$defs.sourceBinding.properties.role.minLength, 1);
  assert.equal(schema.$defs.sourceBinding.properties.sourceSetId.minLength, 1);
});

test('theme identity excludes render strategy', async () => {
  const schema = await loadSchema('theme');
  assert.equal('renderStrategy' in schema.properties, false);
  assert.equal('renderStrategy' in schema.$defs.provenance.properties, false);
  assert.match(schema.properties.bundleHash.pattern, /^/);
});

test('manifest and build record share outcomes and evidence contracts', async () => {
  const manifest = await loadSchema('manifest');
  const buildRecord = await loadSchema('build-record');
  const outcomes = [
    'built-durable',
    'built-not-durable',
    'failed',
    'incomplete',
  ];
  assert.deepEqual(manifest.properties.outcome.enum, outcomes);
  assert.deepEqual(buildRecord.properties.outcome.enum, outcomes);
  assert.deepEqual(buildRecord.properties.renderStrategy.enum, [
    'default-only',
    'user-switchable',
  ]);
  assert.equal(
    manifest.$defs.artifactEntry.properties.durableEvidence.uniqueItems,
    true,
  );
  assert.equal(
    manifest.$defs.artifactEntry.properties.renderedPath.pattern,
    '^site/',
  );
  assert.ok(manifest.required.includes('immutableHashes'));
  assert.equal(manifest.properties.immutableHashes.$ref, '#/$defs/hashMap');
});

test('durability request and publish receipt declare unique path evidence', async () => {
  const durability = await loadSchema('durability-evidence');
  const receipt = await loadSchema('publish-receipt');
  assert.deepEqual(durability.properties.evidence.oneOf[0].required, [
    'kind',
    'repoRoot',
    'commit',
    'paths',
  ]);
  assert.equal(
    durability.properties.evidence.oneOf[0].properties.paths.uniqueItems,
    true,
  );
  assert.equal(receipt.properties.artifacts.uniqueItems, true);
  assert.equal(
    receipt.$defs.artifact.properties.relativePath.$ref,
    '#/$defs/safeRelativePath',
  );
});

test('author v2 contracts require authored content and provenance', async () => {
  const request = await loadSchema('author-request.v2');
  const result = await loadSchema('author-result.v2');

  assert.deepEqual(request.required, [
    'schemaVersion',
    'artifactId',
    'artifactType',
    'authoring',
    'brief',
    'visualAuthoringGuidance',
    'factBase',
    'theme',
    'setContext',
    'plannedArtifact',
  ]);
  assert.deepEqual(request.properties.authoring.enum, ['markdown', 'html']);
  assert.equal(request.properties.visualAuthoringGuidance.type, 'string');
  assert.equal(request.properties.visualAuthoringGuidance.minLength, 1);
  assert.deepEqual(result.required, [
    'schemaVersion',
    'artifactId',
    'content',
    'provenance',
  ]);
  assert.equal(result.properties.content.oneOf.length, 2);
  assert.deepEqual(result.properties.provenance.required, [
    'authorId',
    'generatedAt',
  ]);
  // The trust level is core-stamped on the retained record, so it is declared
  // but never required of an incoming author result.
  assert.deepEqual(result.properties.provenance.properties.trust.enum, [
    'caller-bound',
    'self-asserted',
  ]);
  assert.equal(result.properties.provenance.additionalProperties, false);
});

test('set and visual review schemas carry closed shared context', async () => {
  const plan = await loadSchema('set-plan.v1');
  const reviewRequest = await loadSchema('visual-review-request.v1');
  const reviewResult = await loadSchema('visual-review-result.v1');

  assert.deepEqual(plan.required, [
    'schemaVersion',
    'planId',
    'recipe',
    'sourceIds',
    'ledger',
    'portfolio',
  ]);
  assert.equal(plan.properties.portfolio.minItems, 1);
  assert.deepEqual(plan.$defs.ledger.required, [
    'terminology',
    'statuses',
    'numbers',
  ]);
  assert.deepEqual(reviewResult.properties.disposition.enum, [
    'pass',
    'correct',
    'fail',
  ]);
  assert.ok(reviewRequest.required.includes('renderedArtifacts'));
  assert.equal(reviewRequest.properties.renderedArtifacts.uniqueItems, true);
  assert.equal(
    reviewRequest.$defs.renderedArtifact.properties.evidence.uniqueItems,
    true,
  );
  assert.ok(reviewResult.required.includes('artifactIds'));
  assert.equal(reviewResult.properties.artifactIds.uniqueItems, true);
  assert.equal(reviewResult.properties.findings.uniqueItems, true);
});
