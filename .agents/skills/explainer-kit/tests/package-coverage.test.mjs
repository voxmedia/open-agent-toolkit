import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, test } from 'node:test';

import {
  enforceRunPackageInventory,
  permissibleRunPackagePaths,
  requiredImmutablePackagePaths,
  validateImmutablePackageEvidence,
} from '../scripts/lib/package-coverage.mjs';

const HASH = `sha256:${'a'.repeat(64)}`;
const tempDirs = [];

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
  );
});

function manifest() {
  const paths = [
    'theme.resolved.json',
    'source/fact-base.json',
    'source/fact-base.md',
    'source/ledger.json',
    'qa/result.json',
    'site/index.html',
  ];
  return {
    source: { factBasePath: 'source/fact-base.json' },
    theme: { path: 'theme.resolved.json' },
    artifacts: [{ contentPath: 'site/index.html' }],
    immutableHashes: Object.fromEntries(paths.map((path) => [path, HASH])),
  };
}

test('requires the six immutable paths for a one-artifact run', () => {
  assert.deepEqual(requiredImmutablePackagePaths(manifest()).sort(), [
    'qa/result.json',
    'site/index.html',
    'source/fact-base.json',
    'source/fact-base.md',
    'source/ledger.json',
    'theme.resolved.json',
  ]);
  assert.deepEqual(permissibleRunPackagePaths(manifest()), [
    'manifest.json',
    'qa/result.json',
    'site/index.html',
    'source/fact-base.json',
    'source/fact-base.md',
    'source/ledger.json',
    'theme.resolved.json',
  ]);
});

test('exact inventory rejects an extra or missing file', async () => {
  const root = await mkdtemp(join(tmpdir(), 'explainer-package-'));
  tempDirs.push(root);
  for (const path of permissibleRunPackagePaths(manifest())) {
    await mkdir(dirname(join(root, path)), { recursive: true });
    await writeFile(join(root, path), '{}\n');
  }
  assert.equal((await enforceRunPackageInventory(root, manifest())).length, 7);

  await writeFile(join(root, 'extra.txt'), 'extra');
  await assert.rejects(
    enforceRunPackageInventory(root, manifest()),
    /exact permissible tree/,
  );
  await rm(join(root, 'extra.txt'));
  await rm(join(root, 'qa', 'result.json'));
  await assert.rejects(
    enforceRunPackageInventory(root, manifest()),
    /exact permissible tree/,
  );
});

test('a self-declared extra hash cannot expand the canonical inventory', async () => {
  const value = manifest();
  value.immutableHashes['PROVENANCE.md'] = HASH;

  assert.deepEqual(
    permissibleRunPackagePaths(value),
    permissibleRunPackagePaths(manifest()),
  );
  assert.throws(
    () => validateImmutablePackageEvidence(value),
    /canonical package/i,
  );

  const root = await mkdtemp(join(tmpdir(), 'explainer-package-declared-'));
  tempDirs.push(root);
  for (const path of permissibleRunPackagePaths(manifest())) {
    await mkdir(dirname(join(root, path)), { recursive: true });
    await writeFile(join(root, path), '{}\n');
  }
  await writeFile(join(root, 'PROVENANCE.md'), 'self-declared');
  await assert.rejects(
    enforceRunPackageInventory(root, value),
    /canonical package|exact permissible tree/,
  );
});

test('only the three modeled screenshot paths may be conditional', () => {
  const value = manifest();
  value.immutableHashes['qa/320.png'] = HASH;
  value.immutableHashes['qa/768.png'] = HASH;
  value.immutableHashes['qa/1440.png'] = HASH;
  validateImmutablePackageEvidence(value);
  assert.deepEqual(permissibleRunPackagePaths(value).slice(-3), [
    'source/fact-base.md',
    'source/ledger.json',
    'theme.resolved.json',
  ]);
  assert.ok(permissibleRunPackagePaths(value).includes('qa/320.png'));

  value.immutableHashes['qa/desktop.png'] = HASH;
  assert.throws(
    () => validateImmutablePackageEvidence(value),
    /canonical package/i,
  );
});
