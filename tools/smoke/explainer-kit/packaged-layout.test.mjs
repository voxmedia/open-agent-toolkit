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
  await assertAuthoredRun(result.runRoot, manifest);
  const request = await readFile(fixture.requestPath, 'utf8');
  assert.equal(manifest.schemaVersion, 'explainer-kit.manifest/v1');
  assert.equal(manifest.recipe.id, 'project-explainer');
  assert.doesNotMatch(
    `${request}\n${JSON.stringify(manifest)}`,
    new RegExp(escapeRegExp(fixture.sourceCheckoutRoot)),
  );
});

test('runs the packaged adapter against the user-scoped packaged core', async () => {
  assert.equal(
    fixture.adapterRunArgs.script,
    `${fixture.adapterRoot}/scripts/run.mjs`,
  );
  const result = await runJson(fixture.adapterRunArgs);

  assert.equal(result.compatibility.coreRoot, fixture.coreRoot);
  const packagedCoreSkill = await readFile(
    `${fixture.coreRoot}/SKILL.md`,
    'utf8',
  );
  const packagedCoreVersion = packagedCoreSkill.match(
    /^version:\s*([^\s#]+)\s*$/m,
  )?.[1];
  assert.equal(result.compatibility.installedVersion, packagedCoreVersion);
  assert.equal(result.request.recipe.id, 'project-explainer');
  assert.equal(result.result.outcome, 'built-not-durable');
  assert.equal(result.manifest.schemaVersion, 'explainer-kit.manifest/v1');
  assert.match(fixture.reviewedRepository.revision, /^[a-f0-9]{40}$/);
  const approval = JSON.parse(
    await readFile(
      `${result.result.runRoot}/source/content-approval.json`,
      'utf8',
    ),
  );
  assert.deepEqual(approval.reviewedSource, {
    kind: 'approved-oat-artifacts',
    locator: fixture.reviewedRepository.repositoryUrl,
    ...fixture.reviewedRepository,
  });
  assert.ok(result.manifest.source.backlinks.length > 0);
  assert.equal(
    result.manifest.source.backlinks.every(
      ({ url }) =>
        url.startsWith(`${fixture.reviewedRepository.repositoryUrl}/blob/`) &&
        url.includes(`/${fixture.reviewedRepository.revision}/`),
    ),
    true,
  );
  await assertAuthoredRun(result.result.runRoot, result.manifest);
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
  assert.deepEqual(missing.reasons, [
    { stage: 'finalization', kind: 'pipeline-failure', count: 1 },
  ]);
  assert.equal('errors' in missing, false);
  await rename(missingRoot, fixture.coreRoot);

  const skillPath = `${fixture.coreRoot}/SKILL.md`;
  const compatibleSkill = await readFile(skillPath, 'utf8');
  await writeFile(
    skillPath,
    compatibleSkill.replace(/^version:\s*[^\s#]+\s*$/m, 'version: 1.9.9'),
  );
  const incompatible = await runJsonFailure(fixture.adapterRunArgs);
  assert.equal(incompatible.outcome, 'failed');
  assert.deepEqual(incompatible.reasons, [
    { stage: 'finalization', kind: 'pipeline-failure', count: 1 },
  ]);
  assert.equal('errors' in incompatible, false);
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

async function assertAuthoredRun(runRoot, manifest) {
  assert.deepEqual(manifest.source.authorResultPaths, [
    'source/author/project-explainer.json',
  ]);
  const authorResult = JSON.parse(
    await readFile(
      `${runRoot}/${manifest.source.authorResultPaths[0]}`,
      'utf8',
    ),
  );
  const { generatedAt, ...identity } = authorResult.provenance;
  assert.deepEqual(identity, {
    authorId: 'packaged-layout-provider-neutral-author',
    method: 'structured-evidence-synthesis',
    trust: 'self-asserted',
  });
  // The core stamps generation time from its own clock, so the author
  // module's backdated claim never reaches the hash-pinned record.
  assert.notEqual(generatedAt, '2026-07-18T14:00:00.000Z');
  assert.equal(new Date(generatedAt).toISOString(), generatedAt);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
