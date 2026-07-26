// These suites assert pipeline behaviour, not browser behaviour, so probe
// resolution is switched off explicitly. The release visual gate exercises the
// real headless runtime.
process.env.EXPLAINER_KIT_HEADLESS_PROBE = 'off';

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
import { basename, dirname, join, resolve } from 'node:path';
import { afterEach, test } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { bindProjectSources } from '../scripts/bind-project-sources.mjs';
import { explainerModeForIntent } from '../scripts/resolve-intent.mjs';
import { runOatExplainer } from '../scripts/run.mjs';

const tempDirs = [];
const SOURCE_SKILLS_ROOT = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
);
const SOURCE_REPO_ROOT = resolve(SOURCE_SKILLS_ROOT, '..', '..');
const SOURCE_ADAPTER_ROOT = join(SOURCE_SKILLS_ROOT, 'oat-explainer-kit');

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
  );
});

async function createFixture({ coreVersion = '2.0.0' } = {}) {
  const root = await mkdtemp(join(tmpdir(), 'oat-explainer-run-'));
  tempDirs.push(root);
  const repoRoot = join(root, 'repo');
  const projectRoot = join(repoRoot, '.oat', 'projects', 'shared', 'demo');
  const adapterRoot = join(repoRoot, '.agents', 'skills', 'oat-explainer-kit');
  const userSkillsRoot = join(root, 'home', '.agents', 'skills');
  const coreRoot = join(userSkillsRoot, 'explainer-kit');
  const coreInvocationMarker = join(root, 'core-invoked');
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
          await writeFile(${JSON.stringify(coreInvocationMarker)}, 'invoked\\n', {
            flag: 'a',
          });
          const loaded = [];
          if (request.factBase.mode === 'federated') {
            for (const source of request.factBase.sources) {
              loaded.push(await options.sourceLoader(source));
            }
          }
          const authored =
            typeof options.author === 'function'
              ? await options.author({ artifact: { id: request.recipe.id } })
              : null;
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
            marking:
              request.mode === 'unattended'
                ? 'auto-drafted'
                : 'human-approved',
            warnings: ['core-warning'],
            reviewedSource: options.reviewedSource,
            authored,
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
    coreInvocationMarker,
  };
}

async function fixtureAuthor({ artifact }) {
  return { source: 'fixture', artifactId: artifact.id };
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
    author: fixtureAuthor,
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
  assert.equal(adapterResult.result.marking, 'auto-drafted');
  assert.equal(adapterResult.marking, 'auto-drafted');
  assert.deepEqual(adapterResult.result.warnings, ['core-warning']);
  assert.deepEqual(adapterResult.result.reviewedSource, {
    kind: 'approved-oat-artifacts',
    locator: canonicalProjectRoot,
  });
  assert.equal(basename(adapterResult.compatibility.coreRoot), 'explainer-kit');
});

test('resolves curated style through the real CLI-backed config path', async () => {
  const fixture = await createFixture();
  const binRoot = join(fixture.root, 'bin');
  await mkdir(binRoot, { recursive: true });
  await mkdir(join(fixture.repoRoot, '.git'));
  await writeFile(
    join(fixture.repoRoot, '.oat', 'config.json'),
    `${JSON.stringify({
      version: 1,
      explainers: { defaults: { style: 'navy-ocean' } },
    })}\n`,
  );
  await writeFile(
    join(binRoot, 'oat'),
    `#!/bin/sh
lock="${join(binRoot, 'oat-config.lock')}"
while ! mkdir "$lock" 2>/dev/null; do
  sleep 0.05
done
trap 'rmdir "$lock"' EXIT INT TERM
"${join(SOURCE_REPO_ROOT, 'node_modules', '.bin', 'tsx')}" --tsconfig "${join(
      SOURCE_REPO_ROOT,
      'packages',
      'cli',
      'tsconfig.json',
    )}" "${join(SOURCE_REPO_ROOT, 'packages', 'cli', 'src', 'index.ts')}" "$@"
`,
    { mode: 0o755 },
  );
  const originalPath = process.env.PATH;
  process.env.PATH = `${binRoot}:${originalPath ?? ''}`;

  try {
    const adapterResult = await runOatExplainer({
      adapterRoot: fixture.adapterRoot,
      userSkillsRoot: fixture.userSkillsRoot,
      repoRoot: fixture.repoRoot,
      invocation: 'project',
      activeProject: '.oat/projects/shared/demo',
      recipe: 'project-recap',
      slug: 'cli-config-style',
      author: fixtureAuthor,
      mode: 'unattended',
    });

    assert.equal(adapterResult.request.theme.style, 'navy-ocean');
  } finally {
    process.env.PATH = originalPath;
  }
});

test('passes direct and module authors through the adapter boundary', async () => {
  const directFixture = await createFixture();
  const directResult = await runOatExplainer({
    adapterRoot: directFixture.adapterRoot,
    userSkillsRoot: directFixture.userSkillsRoot,
    repoRoot: directFixture.repoRoot,
    invocation: 'project',
    activeProject: '.oat/projects/shared/demo',
    recipe: 'project-recap',
    slug: 'direct-author',
    getConfig,
    author: async ({ artifact }) => ({
      source: 'direct',
      artifactId: artifact.id,
    }),
    mode: 'interactive',
  });
  assert.deepEqual(directResult.result.authored, {
    source: 'direct',
    artifactId: 'project-recap',
  });
  assert.equal(directResult.result.marking, 'human-approved');
  assert.equal(directResult.marking, 'human-approved');

  const moduleFixture = await createFixture();
  const authorModulePath = join(moduleFixture.root, 'author.mjs');
  await writeFile(
    authorModulePath,
    `export async function author({ artifact }) {
  return { source: 'module', artifactId: artifact.id };
}
`,
  );
  const moduleResult = await runOatExplainer({
    adapterRoot: moduleFixture.adapterRoot,
    userSkillsRoot: moduleFixture.userSkillsRoot,
    repoRoot: moduleFixture.repoRoot,
    invocation: 'project',
    activeProject: '.oat/projects/shared/demo',
    recipe: 'project-recap',
    slug: 'module-author',
    getConfig,
    authorModulePath,
    mode: 'unattended',
  });
  assert.deepEqual(moduleResult.result.authored, {
    source: 'module',
    artifactId: 'project-recap',
  });
});

test('rejects missing, invalid, and conflicting author module inputs at the adapter boundary', async () => {
  const fixture = await createFixture();
  const invalidModulePath = join(fixture.root, 'invalid-author.mjs');
  await writeFile(invalidModulePath, 'export const author = "invalid";\n');
  const context = {
    adapterRoot: fixture.adapterRoot,
    userSkillsRoot: fixture.userSkillsRoot,
    repoRoot: fixture.repoRoot,
    invocation: 'project',
    activeProject: '.oat/projects/shared/demo',
    recipe: 'project-recap',
    slug: 'author-contract',
    getConfig,
    author: fixtureAuthor,
    mode: 'unattended',
  };

  await assert.rejects(
    runOatExplainer({
      ...context,
      author: undefined,
      authorModulePath: join(fixture.root, 'missing-author.mjs'),
    }),
    /unable to load.*author module/i,
  );
  await assert.rejects(
    runOatExplainer({
      ...context,
      author: undefined,
      authorModulePath: invalidModulePath,
    }),
    /author module must export an author function/i,
  );
  await assert.rejects(
    runOatExplainer({
      ...context,
      author: async () => ({}),
      authorModulePath: invalidModulePath,
    }),
    /only one.*author/i,
  );
  await assert.rejects(readFile(fixture.coreInvocationMarker, 'utf8'), {
    code: 'ENOENT',
  });
  await assert.rejects(
    runOatExplainer({
      ...context,
      author: undefined,
      coreOptions: { author: async () => ({}) },
    }),
    /coreOptions\.author is not supported/i,
  );
});

test('rejects an omitted unattended author before invoking the core', async () => {
  const fixture = await createFixture();
  await assert.rejects(
    runOatExplainer({
      adapterRoot: fixture.adapterRoot,
      userSkillsRoot: fixture.userSkillsRoot,
      repoRoot: fixture.repoRoot,
      invocation: 'project',
      activeProject: '.oat/projects/shared/demo',
      recipe: 'project-recap',
      slug: 'missing-author',
      getConfig,
      mode: 'unattended',
    }),
    /unattended.*exactly one.*author/i,
  );
  await assert.rejects(readFile(fixture.coreInvocationMarker, 'utf8'), {
    code: 'ENOENT',
  });
});

test('rejects an omitted author in both modes before invoking the core', async () => {
  const fixture = await createFixture();
  for (const mode of ['interactive', 'unattended']) {
    await assert.rejects(
      runOatExplainer({
        adapterRoot: fixture.adapterRoot,
        userSkillsRoot: fixture.userSkillsRoot,
        repoRoot: fixture.repoRoot,
        invocation: 'project',
        activeProject: '.oat/projects/shared/demo',
        recipe: 'project-recap',
        slug: `${mode}-no-author`,
        getConfig,
        mode,
      }),
      (error) => error.code === 'E_AUTHOR_REQUIRED',
    );
  }
  await assert.rejects(readFile(fixture.coreInvocationMarker, 'utf8'), {
    code: 'ENOENT',
  });
});

test('completion recap intents always select unattended explainer mode', () => {
  assert.equal(
    explainerModeForIntent({
      product: 'projectRecap',
      decision: 'generate',
    }),
    'unattended',
  );
});

test('loads a validated provider-neutral critic module and runs the actual bundled core', async () => {
  const fixture = await createFixture();
  const authorModulePath = join(fixture.root, 'lifecycle-author.mjs');
  const criticModulePath = join(fixture.root, 'lifecycle-critic.mjs');
  await writeValidAuthorModule(authorModulePath);
  await writeFile(
    criticModulePath,
    `
      const calls = [];
      export async function critic(request) {
        calls.push(request);
        return {
          criticId: 'lifecycle-test-critic',
          executedAt: '2026-07-18T00:00:00.000Z',
          findings: [],
        };
      }
      export function getCalls() {
        return calls;
      }
    `,
  );

  const adapterResult = await runOatExplainer({
    adapterRoot: SOURCE_ADAPTER_ROOT,
    userSkillsRoot: SOURCE_SKILLS_ROOT,
    repoRoot: fixture.repoRoot,
    invocation: 'project',
    activeProject: '.oat/projects/shared/demo',
    recipe: 'project-recap',
    slug: 'actual-core-recap',
    authorModulePath,
    criticModulePath,
    getConfig,
    mode: 'unattended',
  });
  const criticModule = await import(pathToFileURL(criticModulePath).href);
  const factBase = JSON.parse(
    await readFile(
      join(adapterResult.result.runRoot, 'source', 'fact-base.json'),
      'utf8',
    ),
  );

  assert.equal(adapterResult.result.outcome, 'built-not-durable');
  assert.equal(
    adapterResult.manifest.schemaVersion,
    'explainer-kit.manifest/v1',
  );
  assert.equal(criticModule.getCalls().length, 1);
  assert.ok(
    factBase.sources.some(({ id }) => id === 'critic:lifecycle-test-critic'),
  );
  assert.deepEqual(adapterResult.manifest.source.authorResultPaths, [
    'source/author/project-recap.json',
  ]);
});

test('carries a lifecycle browser probe module through to the core render QA stage', async () => {
  const fixture = await createFixture();
  const authorModulePath = join(fixture.root, 'lifecycle-author.mjs');
  const probeModulePath = join(fixture.root, 'lifecycle-probe.mjs');
  await writeValidAuthorModule(authorModulePath);
  await writeFile(
    probeModulePath,
    `
      export async function browserProbe() {
        return {
          pageOverflowX: false,
          clippedX: [],
          viewportClipped: [],
          unreadableHeadings: [],
          animationsDisabled: true,
          reducedMotion: true,
          keyboard: { tab: true },
        };
      }
    `,
  );

  const adapterResult = await runOatExplainer({
    adapterRoot: SOURCE_ADAPTER_ROOT,
    userSkillsRoot: SOURCE_SKILLS_ROOT,
    repoRoot: fixture.repoRoot,
    invocation: 'project',
    activeProject: '.oat/projects/shared/demo',
    recipe: 'project-recap',
    slug: 'probe-module-recap',
    authorModulePath,
    browserProbeModulePath: probeModulePath,
    critic: probeTestCritic,
    getConfig,
    mode: 'unattended',
  });

  assert.equal(
    adapterResult.result.outcome,
    'built-not-durable',
    JSON.stringify(adapterResult.result.errors),
  );
  // A named module means probes actually ran, so neither skip warning applies.
  for (const warning of [
    'render-qa-skipped-no-headless-runtime',
    'render-qa-disabled-by-configuration',
  ]) {
    assert.equal(
      adapterResult.result.warnings.includes(warning),
      false,
      warning,
    );
  }

  await assert.rejects(
    runOatExplainer({
      adapterRoot: SOURCE_ADAPTER_ROOT,
      userSkillsRoot: SOURCE_SKILLS_ROOT,
      repoRoot: fixture.repoRoot,
      invocation: 'project',
      activeProject: '.oat/projects/shared/demo',
      recipe: 'project-recap',
      slug: 'probe-module-conflict',
      authorModulePath,
      browserProbeModulePath: probeModulePath,
      coreOptions: { browserProbeModulePath: probeModulePath },
      critic: probeTestCritic,
      getConfig,
      mode: 'unattended',
    }),
    /only one browser probe module/i,
  );
});

async function probeTestCritic() {
  return {
    criticId: 'probe-module-critic',
    executedAt: '2026-07-18T00:00:00.000Z',
    findings: [],
  };
}

test('rejects invalid critic module and callback contracts at the adapter boundary', async () => {
  const fixture = await createFixture();
  const invalidModulePath = join(fixture.root, 'invalid-critic.mjs');
  const invalidResultModulePath = join(
    fixture.root,
    'invalid-result-critic.mjs',
  );
  await writeFile(
    invalidModulePath,
    'export const critic = "not-a-function";\n',
  );
  await writeFile(
    invalidResultModulePath,
    'export async function critic() { return { findings: [] }; }\n',
  );
  const context = {
    adapterRoot: SOURCE_ADAPTER_ROOT,
    userSkillsRoot: SOURCE_SKILLS_ROOT,
    repoRoot: fixture.repoRoot,
    invocation: 'project',
    activeProject: '.oat/projects/shared/demo',
    recipe: 'project-explainer',
    slug: 'critic-contract',
    getConfig,
    author: fixtureAuthor,
    mode: 'unattended',
  };

  await assert.rejects(
    runOatExplainer({ ...context, criticModulePath: invalidModulePath }),
    /critic.*export.*function/i,
  );
  await assert.rejects(
    runOatExplainer({
      ...context,
      slug: 'critic-result-contract',
      criticModulePath: invalidResultModulePath,
    }),
    /critic.*result.*contract/i,
  );
  await assert.rejects(
    runOatExplainer({
      ...context,
      slug: 'critic-conflict',
      critic: async () => ({
        criticId: 'direct',
        findings: [],
      }),
      criticModulePath: invalidResultModulePath,
    }),
    /only one.*critic/i,
  );
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
    author: fixtureAuthor,
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
    author: fixtureAuthor,
    mode: 'unattended',
  });

  assert.equal(adapterResult.manifest, null);
  assert.equal(adapterResult.result.outcome, 'failed');
  assert.deepEqual(adapterResult.result.errors, [
    { code: 'E_FACT_BASE', message: 'forced failure' },
  ]);
});

test('fails closed for missing and 1.x installed cores', async () => {
  for (const [coreVersion, pattern] of [
    [null, /install utility --scope user/i],
    ['1.9.9', /update --pack utility --scope user/i],
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
    author: fixtureAuthor,
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

async function writeValidAuthorModule(path) {
  await writeFile(
    path,
    `export async function author(request) {
  return {
    schemaVersion: 'explainer-kit.author-result/v2',
    artifactId: request.artifactId,
    content: {
      markdown: '# Lifecycle-authored recap\\n\\n' +
        request.floor.requiredNarrative.map((id, index) =>
          \`## \${id.replaceAll('-', ' ')}\\n\\nSection \${index + 1} explains validated evidence and its project impact.\`
        ).join('\\n\\n'),
    },
    provenance: {
      authorId: 'adapter-lifecycle-author',
      generatedAt: '2026-07-20T12:00:00.000Z',
      method: 'provider-neutral-module',
    },
  };
}
`,
  );
}
