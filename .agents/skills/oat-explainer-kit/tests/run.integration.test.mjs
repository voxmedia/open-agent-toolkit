import assert from 'node:assert/strict';
import {
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { afterEach, test } from 'node:test';

import { bindProjectSources } from '../scripts/bind-project-sources.mjs';
import { runOatExplainer } from '../scripts/run.mjs';

const tempDirs = [];

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
  );
});

async function createFixture({ coreVersion = '1.0.0' } = {}) {
  const root = await mkdtemp(join(tmpdir(), 'oat-explainer-run-'));
  tempDirs.push(root);
  const repoRoot = join(root, 'repo');
  const projectRoot = join(repoRoot, '.oat', 'projects', 'shared', 'demo');
  const adapterRoot = join(repoRoot, '.agents', 'skills', 'oat-explainer-kit');
  const userSkillsRoot = join(root, 'home', '.agents', 'skills');
  const coreRoot = join(userSkillsRoot, 'explainer-kit');
  await mkdir(projectRoot, { recursive: true });
  await mkdir(adapterRoot, { recursive: true });
  await mkdir(join(coreRoot, 'scripts'), { recursive: true });

  for (const [name, content] of [
    ['plan.md', '# Plan\n\nBuild the adapter.'],
    ['design.md', '# Design\n\nUse a versioned core seam.'],
    ['spec.md', '# Spec\n\nDo not read private config.'],
    ['implementation.md', '# Implementation\n\nCore integration passed.'],
    ['summary.md', '# Summary\n\nThe project is complete.'],
  ]) {
    await writeFile(join(projectRoot, name), `${content}\n`);
  }

  if (coreVersion !== null) {
    await writeFile(
      join(coreRoot, 'SKILL.md'),
      `---\nname: explainer-kit\nversion: ${coreVersion}\n---\n`,
    );
    await writeFile(
      join(coreRoot, 'scripts', 'run.mjs'),
      `
        import { mkdir, writeFile } from 'node:fs/promises';
        import { join } from 'node:path';

        export async function runExplainer(request, options) {
          const loaded = [];
          if (request.factBase.mode === 'federated') {
            for (const source of request.factBase.sources) {
              loaded.push(await options.sourceLoader(source));
            }
          }
          const runRoot = join(request.outputRoot, request.slug);
          const manifestPath = join(runRoot, 'manifest.json');
          const buildRecordPath = join(runRoot, 'build-record.json');
          await mkdir(runRoot, { recursive: true });
          if (request.slug === 'core-failure') {
            await writeFile(buildRecordPath, '{}');
            return {
              runId: 'run-failed',
              runRoot,
              manifestPath,
              buildRecordPath,
              outcome: 'failed',
              warnings: [],
              errors: [{ code: 'E_FACT_BASE', message: 'forced failure' }],
            };
          }
          const manifest = {
            schemaVersion: 'explainer-kit.manifest/v1',
            recipe: request.recipe,
            sourceCount: loaded.length,
          };
          await writeFile(manifestPath, JSON.stringify(manifest));
          await writeFile(buildRecordPath, '{}');
          return {
            runId: 'run-1',
            runRoot,
            manifestPath,
            buildRecordPath,
            outcome: 'built-not-durable',
            warnings: ['core-warning'],
            reviewedSource: options.reviewedSource,
          };
        }
      `,
    );
  }

  return {
    root,
    repoRoot,
    projectRoot,
    adapterRoot,
    userSkillsRoot,
    coreRoot,
  };
}

function getConfig(key) {
  return Promise.resolve({
    status: 'ok',
    key,
    value:
      key === 'explainers.defaults.palette'
        ? 'neutral'
        : key === 'explainers.defaults.visualProfile'
          ? 'clean'
          : key.startsWith('workflow.')
            ? 'ask'
            : null,
    source: 'default',
  });
}

test('binds approved OAT artifacts to one project source role', async () => {
  const fixture = await createFixture();

  const bound = await bindProjectSources({
    projectRoot: fixture.projectRoot,
    recipe: 'project-recap',
  });
  const canonicalProjectRoot = await realpath(fixture.projectRoot);

  assert.deepEqual(
    bound.factBase.sources.map(({ id, role, sourceSetId }) => ({
      id,
      role,
      sourceSetId,
    })),
    ['plan', 'design', 'spec', 'implementation', 'summary'].map((id) => ({
      id,
      role: 'project',
      sourceSetId: 'demo',
    })),
  );
  assert.deepEqual(bound.reviewedSource, {
    kind: 'approved-oat-artifacts',
    locator: canonicalProjectRoot,
  });
  const loaded = await bound.sourceLoader(bound.factBase.sources[3]);
  assert.deepEqual(loaded.claims, [
    {
      id: 'implementation',
      text: '# Implementation\n\nCore integration passed.',
      locator: join(canonicalProjectRoot, 'implementation.md'),
    },
  ]);
});

test('binds plan/design/spec for project explainers', async () => {
  const fixture = await createFixture();
  const bound = await bindProjectSources({
    projectRoot: fixture.projectRoot,
    recipe: 'project-explainer',
  });

  assert.deepEqual(
    bound.factBase.sources.map(({ id }) => id),
    ['plan', 'design', 'spec'],
  );
});

test('passes supplied fact bases through without artifact federation', async () => {
  const fixture = await createFixture();
  const factBasePath = join(fixture.root, 'approved-facts.json');
  await writeFile(
    factBasePath,
    '{"schemaVersion":"explainer-kit.fact-base/v1"}',
  );

  const bound = await bindProjectSources({
    projectRoot: fixture.projectRoot,
    recipe: 'project-recap',
    suppliedFactBasePath: factBasePath,
  });
  const canonicalFactBasePath = await realpath(factBasePath);

  assert.deepEqual(bound.factBase, {
    mode: 'supplied',
    path: canonicalFactBasePath,
    freshnessPolicy: 'live-wins',
  });
  assert.deepEqual(bound.reviewedSource, {
    kind: 'approved-fact-base',
    locator: canonicalFactBasePath,
  });
  assert.equal(bound.sourceLoader, undefined);
});

test('normalizes one request, invokes a cross-scope installed core, and propagates manifest/result', async () => {
  const fixture = await createFixture();

  const adapterResult = await runOatExplainer({
    adapterRoot: fixture.adapterRoot,
    userSkillsRoot: fixture.userSkillsRoot,
    repoRoot: fixture.repoRoot,
    invocation: 'project',
    activeProject: '.oat/projects/shared/demo',
    recipe: 'project-recap',
    slug: 'demo-recap',
    getConfig,
    mode: 'unattended',
  });
  const canonicalProjectRoot = await realpath(fixture.projectRoot);

  assert.equal(
    adapterResult.request.schemaVersion,
    'explainer-kit.run-request/v1',
  );
  assert.equal(adapterResult.request.recipe.id, 'project-recap');
  assert.equal(adapterResult.request.factBase.sources.length, 5);
  assert.equal(
    adapterResult.manifest.schemaVersion,
    'explainer-kit.manifest/v1',
  );
  assert.equal(adapterResult.manifest.sourceCount, 5);
  assert.equal(adapterResult.result.outcome, 'built-not-durable');
  assert.deepEqual(adapterResult.result.warnings, ['core-warning']);
  assert.deepEqual(adapterResult.result.reviewedSource, {
    kind: 'approved-oat-artifacts',
    locator: canonicalProjectRoot,
  });
  assert.equal(basename(adapterResult.compatibility.coreRoot), 'explainer-kit');
});

test('passes a supplied fact base through the normalized adapter request', async () => {
  const fixture = await createFixture();
  const factBasePath = join(fixture.root, 'approved-facts.json');
  await writeFile(
    factBasePath,
    '{"schemaVersion":"explainer-kit.fact-base/v1"}',
  );

  const adapterResult = await runOatExplainer({
    adapterRoot: fixture.adapterRoot,
    userSkillsRoot: fixture.userSkillsRoot,
    repoRoot: fixture.repoRoot,
    invocation: 'project',
    activeProject: '.oat/projects/shared/demo',
    recipe: 'project-recap',
    slug: 'supplied-recap',
    suppliedFactBasePath: factBasePath,
    getConfig,
    mode: 'unattended',
  });
  const canonicalFactBasePath = await realpath(factBasePath);

  assert.deepEqual(adapterResult.request.factBase, {
    mode: 'supplied',
    path: canonicalFactBasePath,
    freshnessPolicy: 'live-wins',
  });
});

test('propagates failed core results when no manifest was produced', async () => {
  const fixture = await createFixture();

  const adapterResult = await runOatExplainer({
    adapterRoot: fixture.adapterRoot,
    userSkillsRoot: fixture.userSkillsRoot,
    repoRoot: fixture.repoRoot,
    invocation: 'project',
    activeProject: '.oat/projects/shared/demo',
    recipe: 'project-recap',
    slug: 'core-failure',
    getConfig,
    mode: 'unattended',
  });

  assert.equal(adapterResult.manifest, null);
  assert.equal(adapterResult.result.outcome, 'failed');
  assert.deepEqual(adapterResult.result.errors, [
    { code: 'E_FACT_BASE', message: 'forced failure' },
  ]);
});

test('fails closed for missing and incompatible installed cores', async () => {
  for (const [coreVersion, pattern] of [
    [null, /install utility --scope user/i],
    ['0.9.0', /update --pack utility --scope user/i],
  ]) {
    const fixture = await createFixture({ coreVersion });
    await assert.rejects(
      runOatExplainer({
        adapterRoot: fixture.adapterRoot,
        userSkillsRoot: fixture.userSkillsRoot,
        repoRoot: fixture.repoRoot,
        invocation: 'project',
        activeProject: '.oat/projects/shared/demo',
        recipe: 'project-recap',
        slug: 'demo-recap',
        getConfig,
        mode: 'unattended',
      }),
      pattern,
    );
  }
});

test('does not inspect ambient private configuration', async () => {
  const fixture = await createFixture();
  await mkdir(join(fixture.repoRoot, '.private'), { recursive: true });
  await writeFile(
    join(fixture.repoRoot, '.private', 'explainer.json'),
    '{"palette":"private-brand","token":"must-not-leak"}',
  );
  const requestedKeys = [];

  const adapterResult = await runOatExplainer({
    adapterRoot: fixture.adapterRoot,
    userSkillsRoot: fixture.userSkillsRoot,
    repoRoot: fixture.repoRoot,
    invocation: 'project',
    activeProject: '.oat/projects/shared/demo',
    recipe: 'project-explainer',
    slug: 'private-config-check',
    getConfig: async (key) => {
      requestedKeys.push(key);
      return getConfig(key);
    },
    mode: 'unattended',
  });

  assert.equal(JSON.stringify(adapterResult).includes('private-brand'), false);
  assert.equal(JSON.stringify(adapterResult).includes('must-not-leak'), false);
  assert.equal(
    requestedKeys.every(
      (key) =>
        key.startsWith('explainers.') || key.startsWith('workflow.explainers.'),
    ),
    true,
  );
  await assert.doesNotReject(
    readFile(join(fixture.repoRoot, '.private', 'explainer.json'), 'utf8'),
  );
});
