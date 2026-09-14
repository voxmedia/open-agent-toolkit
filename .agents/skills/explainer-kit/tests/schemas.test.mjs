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
  'fact-base': 'explainer-kit.fact-base/v1',
  manifest: 'explainer-kit.manifest/v2',
  theme: 'explainer-kit.theme/v1',
};

test('every retained contract has its required identity and closed objects', async () => {
  for (const [name, id] of Object.entries(schemas)) {
    const schema = JSON.parse(
      await readFile(
        path.join(skillRoot, 'schemas', `${name}.schema.json`),
        'utf8',
      ),
    );
    assert.equal(
      schema.$schema,
      'https://json-schema.org/draft/2020-12/schema',
    );
    assert.equal(schema.$id, id);
    assert.equal(schema.properties.schemaVersion.const, id);
    for (const [location, objectSchema] of collectObjectSchemas(schema)) {
      assert.equal(
        objectSchema.additionalProperties,
        false,
        `${name}${location} must be closed`,
      );
    }
  }
});

function collectObjectSchemas(value, location = '#', found = []) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return found;
  if (value.type === 'object' && value.properties) {
    found.push([location, value]);
  }
  for (const [key, child] of Object.entries(value)) {
    collectObjectSchemas(child, `${location}/${key}`, found);
  }
  return found;
}
