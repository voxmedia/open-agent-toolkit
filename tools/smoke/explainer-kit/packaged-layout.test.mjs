import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { access, readFile, rename, writeFile } from 'node:fs/promises';
import { after, before, test } from 'node:test';
import { promisify } from 'node:util';

import { createPackagedLayout } from './fixtures/package-root.mjs';

const execFileAsync = promisify(execFile);
let fixture;

before(async () => {
  fixture = await createPackagedLayout();
});

after(async () => {
  await fixture?.cleanup();
});

test('bundles and installs the explainer skills at their intended scopes', async () => {
  await access(fixture.coreRoot);
  await access(fixture.adapterRoot);
  await access(fixture.poisonedAssetsRoot);
  await assert.rejects(access(fixture.assetsRoot), { code: 'ENOENT' });

  assert.equal(
    fixture.coreRoot,
    `${fixture.userRoot}/.agents/skills/explainer-kit`,
  );
  assert.equal(
    fixture.adapterRoot,
    `${fixture.repoRoot}/.agents/skills/oat-explainer-kit`,
  );
});

test('runs a config-free project explainer from the packaged core only', async () => {
  const result = await runJson(fixture.coreRunArgs);

  assert.equal(result.outcome, 'built-not-durable');
  assert.equal(result.errors, undefined);
  const manifest = JSON.parse(await readFile(result.manifestPath, 'utf8'));
  const request = await readFile(fixture.requestPath, 'utf8');
  assert.equal(manifest.schemaVersion, 'explainer-kit.manifest/v1');
  assert.equal(manifest.recipe.id, 'project-explainer');
  assert.doesNotMatch(
    `${request}\n${JSON.stringify(manifest)}`,
    new RegExp(escapeRegExp(fixture.sourceCheckoutRoot)),
  );
});

test('runs the packaged adapter against the user-scoped packaged core', async () => {
  const result = await runJson(fixture.adapterRunArgs);

  assert.equal(result.compatibility.coreRoot, fixture.coreRoot);
  assert.equal(result.compatibility.installedVersion, '1.0.1');
  assert.equal(result.request.recipe.id, 'project-explainer');
  assert.equal(result.result.outcome, 'built-not-durable');
  assert.equal(result.manifest.schemaVersion, 'explainer-kit.manifest/v1');
  assert.doesNotMatch(
    JSON.stringify(result),
    new RegExp(escapeRegExp(fixture.sourceCheckoutRoot)),
  );
});

test('packaged adapter fails closed when its packaged core is missing or incompatible', async () => {
  const missingRoot = `${fixture.coreRoot}.missing`;
  await rename(fixture.coreRoot, missingRoot);
  const missing = await runJsonFailure(fixture.adapterRunArgs);
  assert.equal(missing.outcome, 'failed');
  assert.equal(missing.errors[0].code, 'E_CORE_MISSING');
  assert.match(
    missing.errors[0].message,
    /oat tools install utility --scope user/,
  );
  await rename(missingRoot, fixture.coreRoot);

  const skillPath = `${fixture.coreRoot}/SKILL.md`;
  const compatibleSkill = await readFile(skillPath, 'utf8');
  await writeFile(
    skillPath,
    compatibleSkill.replace(/^version: 1\.0\.1$/m, 'version: 0.9.0'),
  );
  const incompatible = await runJsonFailure(fixture.adapterRunArgs);
  assert.equal(incompatible.outcome, 'failed');
  assert.equal(incompatible.errors[0].code, 'E_CORE_INCOMPATIBLE');
  assert.match(
    incompatible.errors[0].message,
    /oat tools update --pack utility --scope user/,
  );
});

async function runJson({ script, args, cwd, env }) {
  const { stdout } = await execFileAsync(process.execPath, [script, ...args], {
    cwd,
    env,
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
  });
  return JSON.parse(stdout);
}

async function runJsonFailure(invocation) {
  try {
    await runJson(invocation);
    assert.fail('Expected packaged adapter invocation to fail.');
  } catch (error) {
    assert.equal(error.code, 1);
    return JSON.parse(error.stderr);
  }
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
