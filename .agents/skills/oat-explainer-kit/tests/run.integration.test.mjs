import assert from 'node:assert/strict';
import { execFile as execFileCallback } from 'node:child_process';
import { createHash } from 'node:crypto';
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
import { promisify } from 'node:util';

import { createBrowserProbeSession } from '../../explainer-kit/scripts/lib/browser-runtime.mjs';
import { png } from '../../explainer-kit/tests/fixtures/png.mjs';
import {
  bindProjectSources,
  resolveReviewedRepository,
} from '../scripts/bind-project-sources.mjs';
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
const execFile = promisify(execFileCallback);

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
  );
});

async function createFixture({ coreVersion = '2.1.0' } = {}) {
  const root = await mkdtemp(join(tmpdir(), 'oat-explainer-run-'));
  tempDirs.push(root);
  const repoRoot = join(root, 'repo');
  const projectRoot = join(repoRoot, '.oat', 'projects', 'shared', 'demo');
  const adapterRoot = join(repoRoot, '.agents', 'skills', 'oat-explainer-kit');
  const userSkillsRoot = join(root, 'home', '.agents', 'skills');
  const coreRoot = join(userSkillsRoot, 'explainer-kit');
  const coreInvocationMarker = join(root, 'core-invoked');
  const publishRequestMarker = join(root, 'publish-request.json');
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

        export function assertBrowserProbeSession(session) {
          if (
            !session ||
            typeof session.probe !== 'function' ||
            session.runtime?.kind !== 'launched' ||
            session.runtime?.name !== 'chromium'
          ) {
            throw new TypeError('Fixture core requires a launched Chromium session.');
          }
          return session;
        }

        export async function runExplainer(request, options) {
          await writeFile(
            ${JSON.stringify(publishRequestMarker)},
            JSON.stringify(request.durability?.publish ?? null),
          );
          await writeFile(${JSON.stringify(coreInvocationMarker)}, 'invoked\\n', {
            flag: 'a',
          });
          const loaded = [];
          if (request.factBase.mode === 'federated') {
            for (const source of request.factBase.sources) {
              loaded.push(await options.sourceLoader(source));
            }
          }
          const setPlan =
            typeof options.planSet === 'function'
              ? await options.planSet({
                  recipe: request.recipe,
                  factBase: request.factBase,
                })
              : null;
          const plannedArtifacts = setPlan?.portfolio ?? [
            { artifactId: request.recipe.id },
          ];
          const authored =
            typeof options.author === 'function'
              ? await Promise.all(
                  plannedArtifacts.map((plannedArtifact) =>
                    options.author({
                      artifact: { id: plannedArtifact.artifactId },
                      plannedArtifact,
                      setContext: setPlan,
                    }),
                  ),
                )
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
            sourceProvenance: options.sourceProvenance,
            authored,
            providerSeams: {
              browserSession:
                options.browserSession?.runtime?.kind === 'launched' &&
                typeof options.browserSession?.probe === 'function',
              visualCritic: typeof options.visualCritic === 'function',
            },
            publication: request.durability?.strategy === 'publish'
              ? {
                  schemaVersion: 'explainer-kit.publish-summary/v2',
                  receiptSchemaVersion: 'explainer-kit.publish-receipt/v2',
                  publicAccess: request.durability.publish.publicAccess,
                  artifacts: [
                    {
                      source: { kind: 'manifest', artifactId: 'hub' },
                      relativePath: 'site/index.html',
                      s3Uri: request.durability.publish.s3Uri + '/index.html',
                      publicUrl: request.durability.publish.publicBaseUrl + '/index.html',
                      hash: 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
                      contentType: 'text/html',
                      objectVerification: {
                        status: 'verified',
                        method: 'service-checksum',
                        hash: 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
                      },
                      publicVerification: { status: 'skipped-protected' },
                    },
                  ],
                }
              : undefined,
          };
        }
      `,
    );
  }
  await execFile('git', ['init', '--quiet'], { cwd: repoRoot });
  await execFile(
    'git',
    ['remote', 'add', 'origin', 'git@github.com:acme/project-recaps.git'],
    { cwd: repoRoot },
  );
  await execFile('git', ['add', '.'], { cwd: repoRoot });
  await execFile(
    'git',
    [
      '-c',
      'user.name=Explainer Test',
      '-c',
      'user.email=explainer@example.com',
      'commit',
      '--quiet',
      '-m',
      'fixture',
    ],
    { cwd: repoRoot },
  );
  const { stdout: reviewedCommitOutput } = await execFile(
    'git',
    ['rev-parse', 'HEAD'],
    { cwd: repoRoot },
  );

  return {
    root,
    repoRoot,
    projectRoot,
    adapterRoot,
    userSkillsRoot,
    coreRoot,
    coreInvocationMarker,
    publishRequestMarker,
    reviewedCommit: reviewedCommitOutput.trim(),
  };
}

async function fixtureAuthor({ artifact }) {
  return { source: 'fixture', artifactId: artifact.id };
}

async function fixturePlanSet({ recipe }) {
  return {
    schemaVersion: 'explainer-kit.set-plan/v1',
    planId: 'fixture-adaptive-recap',
    recipe,
    sourceIds: ['plan'],
    ledger: {
      terminology: [{ term: 'project', meaning: 'The tracked project.' }],
      statuses: [{ subject: 'implementation', value: 'validated' }],
      numbers: [{ subject: 'required artifacts', value: 3, unit: 'artifacts' }],
    },
    portfolio: ['project-recap', 'architecture', 'deck'].map(
      (artifactId, index) => ({
        artifactId,
        artifactType: ['hub', 'diagram', 'deck'][index],
        profileId: 'recipe-floor',
        required: true,
        sourceIds: ['plan'],
        draft: `Compose ${artifactId}.`,
        visualIntent: `Use the planned ${artifactId} medium.`,
      }),
    ),
  };
}

async function completeBrowserProbe(request) {
  if (request.screenshotPath) {
    await mkdir(dirname(request.screenshotPath), { recursive: true });
    await writeFile(
      request.screenshotPath,
      png(request.viewport.width, request.viewport.height),
    );
  }
  return {
    pageOverflowX: false,
    clippedX: [],
    viewportClipped: [],
    unreadableHeadings: [],
    animationsDisabled: true,
    reducedMotion: true,
    keyboard: {
      tab: true,
      arrows: {
        ArrowLeft: true,
        ArrowRight: true,
        ArrowUp: true,
        ArrowDown: true,
      },
    },
    ...(request.scenario !== 'default' && {
      deckLayout: {
        flow: 'vertical',
        overflowX: request.scenario === 'print' ? 'visible' : 'auto',
      },
    }),
  };
}

async function passingVisualCritic(request) {
  return {
    schemaVersion: 'explainer-kit.visual-review-result/v1',
    reviewId: 'adapter-core-visual-review',
    requestId: request.requestId,
    requestHash: request.requestHash,
    reviewedAt: '2026-07-18T00:00:00.000Z',
    disposition: 'pass',
    artifactIds: request.renderedArtifacts.map(({ artifactId }) => artifactId),
    findings: [],
  };
}

function launchedSession(probe = completeBrowserProbe) {
  return Object.freeze({
    available: true,
    runtime: Object.freeze({
      kind: 'launched',
      name: 'chromium',
      version: 'fixture-core-chromium',
    }),
    capture: Object.freeze({
      format: 'png',
      fullPage: false,
      reducedMotion: 'reduce',
      animationsDisabled: true,
    }),
    captureIdentity: `sha256:${'a'.repeat(64)}`,
    probe,
    close: async () => {},
  });
}

const REQUIRED_REVIEW_PROVIDERS = {
  browserSession: launchedSession(),
  visualCritic: passingVisualCritic,
};

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

function getPublishConfig(key) {
  return getPublishConfigWith({})(key);
}

function getPublishConfigWith(overrides) {
  const values = {
    'explainers.publish.provider': 's3-static',
    'explainers.publish.s3Uri': 's3://bucket/repositories/demo',
    'explainers.publish.publicBaseUrl':
      'https://docs.example.com/repositories/demo',
    'explainers.publish.awsRegion': 'us-east-1',
    'explainers.publish.publicAccess': 'protected',
    ...overrides,
  };
  return (key) =>
    Promise.resolve({
      status: 'ok',
      key,
      value: values[key] ?? (key.startsWith('workflow.') ? 'ask' : null),
      source: key in values ? 'shared' : 'default',
    });
}

test('resolves a full reviewed commit and canonical GitHub repository identity', async () => {
  const calls = [];
  const command = async (file, args, options) => {
    calls.push({ file, args, options });
    return {
      stdout:
        args[0] === 'rev-parse'
          ? '0123456789abcdef0123456789abcdef01234567\n'
          : 'git@github.com:acme/project-recaps.git\n',
      stderr: '',
    };
  };

  assert.deepEqual(await resolveReviewedRepository('/repo', { command }), {
    repository: 'acme/project-recaps',
    repositoryUrl: 'https://github.com/acme/project-recaps',
    revision: '0123456789abcdef0123456789abcdef01234567',
  });
  assert.deepEqual(
    calls.map(({ file, args, options }) => [file, args, options.cwd]),
    [
      ['git', ['rev-parse', 'HEAD'], '/repo'],
      ['git', ['config', '--get', 'remote.origin.url'], '/repo'],
    ],
  );

  await assert.rejects(
    resolveReviewedRepository('/repo', {
      command: async (_file, args) => ({
        stdout:
          args[0] === 'rev-parse'
            ? 'main\n'
            : 'https://github.com/acme/project-recaps.git\n',
      }),
    }),
    /full commit sha/i,
  );
});

test('binds approved OAT artifacts to one project source role', async () => {
  const fixture = await createFixture();

  const bound = await bindProjectSources({
    projectRoot: fixture.projectRoot,
    repoRoot: fixture.repoRoot,
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
    locator: 'https://github.com/acme/project-recaps',
    repository: 'acme/project-recaps',
    repositoryUrl: 'https://github.com/acme/project-recaps',
    revision: fixture.reviewedCommit,
  });
  assert.deepEqual(bound.sourceProvenance.implementation, {
    repository: 'acme/project-recaps',
    revision: fixture.reviewedCommit,
    path: '.oat/projects/shared/demo/implementation.md',
    lineRange: { start: 1, end: 3 },
  });
  const loaded = await bound.sourceLoader(bound.factBase.sources[3]);
  const implementationBytes = await readFile(
    join(canonicalProjectRoot, 'implementation.md'),
  );
  assert.deepEqual(loaded.claims, [
    {
      id: 'implementation',
      text: '# Implementation\n\nCore integration passed.',
      locator: join(canonicalProjectRoot, 'implementation.md'),
      lineRange: { start: 1, end: 3 },
    },
  ]);
  assert.equal(
    loaded.sourceHash,
    `sha256:${createHash('sha256').update(implementationBytes).digest('hex')}`,
  );
});

test('rejects dirty and untracked OAT artifacts at the reviewed Git boundary', async () => {
  const dirty = await createFixture();
  await writeFile(
    join(dirty.projectRoot, 'plan.md'),
    '# Plan\n\nUncommitted replacement.\n',
  );
  await assert.rejects(
    bindProjectSources({
      projectRoot: dirty.projectRoot,
      repoRoot: dirty.repoRoot,
      recipe: 'project-recap',
    }),
    /working tree|reviewed git blob|mismatch/i,
  );

  const untracked = await createFixture();
  const relativePlan = '.oat/projects/shared/demo/plan.md';
  await execFile('git', ['rm', '--cached', '--quiet', relativePlan], {
    cwd: untracked.repoRoot,
  });
  await assert.rejects(
    bindProjectSources({
      projectRoot: untracked.projectRoot,
      repoRoot: untracked.repoRoot,
      recipe: 'project-recap',
    }),
    /tracked|reviewed git blob/i,
  );
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
    planSet: fixturePlanSet,
    ...REQUIRED_REVIEW_PROVIDERS,
    mode: 'unattended',
  });
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
    locator: 'https://github.com/acme/project-recaps',
    repository: 'acme/project-recaps',
    repositoryUrl: 'https://github.com/acme/project-recaps',
    revision: fixture.reviewedCommit,
  });
  assert.deepEqual(adapterResult.result.sourceProvenance.plan, {
    repository: 'acme/project-recaps',
    revision: fixture.reviewedCommit,
    path: '.oat/projects/shared/demo/plan.md',
    lineRange: { start: 1, end: 3 },
  });
  assert.equal(basename(adapterResult.compatibility.coreRoot), 'explainer-kit');
});

test('resolves curated style through the real CLI-backed config path', async () => {
  const fixture = await createFixture();
  const binRoot = join(fixture.root, 'bin');
  await mkdir(binRoot, { recursive: true });
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
      planSet: fixturePlanSet,
      ...REQUIRED_REVIEW_PROVIDERS,
      mode: 'unattended',
    });

    assert.equal(adapterResult.request.theme.style, 'navy-ocean');
  } finally {
    process.env.PATH = originalPath;
  }
});

test('passes direct and module authors through the adapter boundary', async () => {
  const directFixture = await createFixture();
  const directRequests = [];
  const directResult = await runOatExplainer({
    adapterRoot: directFixture.adapterRoot,
    userSkillsRoot: directFixture.userSkillsRoot,
    repoRoot: directFixture.repoRoot,
    invocation: 'project',
    activeProject: '.oat/projects/shared/demo',
    recipe: 'project-recap',
    slug: 'direct-author',
    getConfig,
    author: async (request) => {
      directRequests.push(request);
      return {
        source: 'direct',
        artifactId: request.artifact.id,
      };
    },
    planSet: fixturePlanSet,
    mode: 'interactive',
  });
  assert.deepEqual(
    directResult.result.authored.map(({ artifactId }) => artifactId),
    ['project-recap', 'architecture', 'deck'],
  );
  assert.equal(directResult.result.marking, 'human-approved');
  assert.equal(directResult.marking, 'human-approved');
  assert.equal(directRequests.length, 3);
  assert.equal(
    directRequests.every(
      ({ setContext }) =>
        JSON.stringify(setContext) ===
        JSON.stringify(directRequests[0].setContext),
    ),
    true,
  );

  const moduleFixture = await createFixture();
  const authorModulePath = join(moduleFixture.root, 'author.mjs');
  const planSetModulePath = join(moduleFixture.root, 'plan-set.mjs');
  await writeFile(
    authorModulePath,
    `export async function author({ artifact }) {
  return { source: 'module', artifactId: artifact.id };
}
`,
  );
  await writeValidPlanSetModule(planSetModulePath);
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
    planSetModulePath,
    ...REQUIRED_REVIEW_PROVIDERS,
    mode: 'unattended',
  });
  assert.deepEqual(
    moduleResult.result.authored.map(({ artifactId }) => artifactId),
    ['project-recap', 'architecture', 'deck'],
  );
});

test('passes first-class direct and module browser and visual-review providers', async () => {
  const directFixture = await createFixture();
  const direct = await runOatExplainer({
    adapterRoot: directFixture.adapterRoot,
    userSkillsRoot: directFixture.userSkillsRoot,
    repoRoot: directFixture.repoRoot,
    invocation: 'project',
    activeProject: '.oat/projects/shared/demo',
    recipe: 'project-recap',
    slug: 'direct-review-providers',
    getConfig,
    author: fixtureAuthor,
    planSet: fixturePlanSet,
    browserSession: launchedSession(),
    visualCritic: passingVisualCritic,
    mode: 'unattended',
  });
  assert.deepEqual(direct.result.providerSeams, {
    browserSession: true,
    visualCritic: true,
  });

  const moduleFixture = await createFixture();
  const browserSessionModulePath = join(
    moduleFixture.root,
    'browser-session.mjs',
  );
  const visualCriticModulePath = join(moduleFixture.root, 'visual-critic.mjs');
  await writeFile(
    browserSessionModulePath,
    `export const browserSession = {
  available: true,
  runtime: { kind: 'launched', name: 'chromium', version: 'module-fixture' },
  probe: async () => ({}),
};
`,
  );
  await writeFile(
    visualCriticModulePath,
    'export async function visualCritic() { return {}; }\n',
  );
  const fromModules = await runOatExplainer({
    adapterRoot: moduleFixture.adapterRoot,
    userSkillsRoot: moduleFixture.userSkillsRoot,
    repoRoot: moduleFixture.repoRoot,
    invocation: 'project',
    activeProject: '.oat/projects/shared/demo',
    recipe: 'project-recap',
    slug: 'module-review-providers',
    getConfig,
    author: fixtureAuthor,
    planSet: fixturePlanSet,
    browserSessionModulePath,
    visualCriticModulePath,
    mode: 'unattended',
  });
  assert.deepEqual(fromModules.result.providerSeams, {
    browserSession: true,
    visualCritic: true,
  });
});

test('rejects missing, invalid, conflicting, and reused review providers before core invocation', async () => {
  const fixture = await createFixture();
  const invalidBrowserModule = join(fixture.root, 'invalid-browser.mjs');
  const invalidVisualModule = join(fixture.root, 'invalid-visual.mjs');
  await writeFile(
    invalidBrowserModule,
    'export const browserProbe = "invalid";\n',
  );
  await writeFile(
    invalidVisualModule,
    'export const visualCritic = "invalid";\n',
  );
  const context = {
    adapterRoot: fixture.adapterRoot,
    userSkillsRoot: fixture.userSkillsRoot,
    repoRoot: fixture.repoRoot,
    invocation: 'project',
    activeProject: '.oat/projects/shared/demo',
    recipe: 'project-recap',
    slug: 'review-provider-contract',
    getConfig,
    author: fixtureAuthor,
    planSet: fixturePlanSet,
    mode: 'unattended',
  };

  await assert.rejects(
    runOatExplainer(context),
    (error) => error.code === 'E_BROWSER_PROBE_REQUIRED',
  );
  await assert.rejects(
    runOatExplainer({ ...context, browserSession: launchedSession() }),
    (error) => error.code === 'E_VISUAL_CRITIC_REQUIRED',
  );
  await assert.rejects(
    runOatExplainer({
      ...context,
      browserSessionModulePath: invalidBrowserModule,
      visualCritic: passingVisualCritic,
    }),
    (error) => error.code === 'E_BROWSER_PROBE_REQUIRED',
  );
  await assert.rejects(
    runOatExplainer({
      ...context,
      browserSession: launchedSession(),
      visualCriticModulePath: invalidVisualModule,
    }),
    /visual critic module must export a visualCritic function/i,
  );
  await assert.rejects(
    runOatExplainer({
      ...context,
      browserSession: launchedSession(),
      browserSessionModulePath: invalidBrowserModule,
      visualCritic: passingVisualCritic,
    }),
    /only one.*browser session/i,
  );
  await assert.rejects(
    runOatExplainer({
      ...context,
      browserSession: launchedSession(),
      visualCritic: passingVisualCritic,
      visualCriticModulePath: invalidVisualModule,
    }),
    /only one.*visual critic/i,
  );
  await assert.rejects(
    runOatExplainer({
      ...context,
      browserSession: launchedSession(),
      visualCritic: passingVisualCritic,
      coreOptions: { browserProbe: completeBrowserProbe },
    }),
    /coreOptions\.browserProbe is not supported/i,
  );
  await assert.rejects(
    runOatExplainer({
      ...context,
      browserSession: launchedSession(),
      visualCritic: passingVisualCritic,
      coreOptions: { visualCritic: passingVisualCritic },
    }),
    /coreOptions\.visualCritic is not supported/i,
  );

  const sharedProvider = async () => ({});
  for (const reuse of [
    { author: sharedProvider, visualCritic: sharedProvider },
    { critic: sharedProvider, visualCritic: sharedProvider },
  ]) {
    await assert.rejects(
      runOatExplainer({
        ...context,
        ...REQUIRED_REVIEW_PROVIDERS,
        ...reuse,
      }),
      /provider roles .* must use distinct callback identities/i,
    );
  }
  await assert.rejects(readFile(fixture.coreInvocationMarker, 'utf8'), {
    code: 'ENOENT',
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
    planSet: fixturePlanSet,
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
      planSet: fixturePlanSet,
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
        planSet: fixturePlanSet,
        mode,
      }),
      (error) => error.code === 'E_AUTHOR_REQUIRED',
    );
  }
  await assert.rejects(readFile(fixture.coreInvocationMarker, 'utf8'), {
    code: 'ENOENT',
  });
});

test('requires exactly one adaptive set planner for unattended project recaps', async () => {
  const fixture = await createFixture();
  const invalidModulePath = join(fixture.root, 'invalid-plan-set.mjs');
  await writeFile(invalidModulePath, 'export const planSet = "invalid";\n');
  const context = {
    adapterRoot: fixture.adapterRoot,
    userSkillsRoot: fixture.userSkillsRoot,
    repoRoot: fixture.repoRoot,
    invocation: 'project',
    activeProject: '.oat/projects/shared/demo',
    recipe: 'project-recap',
    slug: 'planner-contract',
    getConfig,
    author: fixtureAuthor,
    mode: 'unattended',
  };

  await assert.rejects(
    runOatExplainer(context),
    (error) => error.code === 'E_SET_PLANNER_REQUIRED',
  );
  await assert.rejects(
    runOatExplainer({
      ...context,
      planSet: fixturePlanSet,
      planSetModulePath: invalidModulePath,
    }),
    /only one.*set planner/i,
  );
  await assert.rejects(
    runOatExplainer({ ...context, planSetModulePath: invalidModulePath }),
    /set planner module must export a planSet function/i,
  );
  await assert.rejects(
    runOatExplainer({
      ...context,
      coreOptions: { planSet: fixturePlanSet },
    }),
    /coreOptions\.planSet is not supported/i,
  );
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

test('loads a validated provider-neutral critic module and runs the actual bundled core', async (t) => {
  const fixture = await createFixture();
  const browserSession = await createBrowserProbeSession();
  if (!browserSession.available) {
    t.skip(`installed Chromium unavailable: ${browserSession.reason}`);
    return;
  }
  t.after(() => browserSession.close());
  const authorModulePath = join(fixture.root, 'lifecycle-author.mjs');
  const planSetModulePath = join(fixture.root, 'lifecycle-plan-set.mjs');
  const criticModulePath = join(fixture.root, 'lifecycle-critic.mjs');
  await writeValidAuthorModule(authorModulePath);
  await writeValidPlanSetModule(planSetModulePath);
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
    planSetModulePath,
    criticModulePath,
    browserSession,
    visualCritic: passingVisualCritic,
    getConfig,
    mode: 'unattended',
  });
  const criticModule = await import(pathToFileURL(criticModulePath).href);
  const authorModule = await import(pathToFileURL(authorModulePath).href);
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
  const authorCalls = authorModule.getCalls();
  assert.deepEqual(
    authorCalls.map(({ artifactId }) => artifactId),
    ['project-recap', 'architecture', 'deck'],
  );
  assert.equal(
    authorCalls.every(
      ({ setContext }) =>
        JSON.stringify(setContext) ===
        JSON.stringify(authorCalls[0].setContext),
    ),
    true,
  );
  assert.equal(
    authorCalls.every(
      ({ hasBrief, hasShell, hasVisualAuthoringGuidance }) =>
        hasBrief && hasShell && hasVisualAuthoringGuidance,
    ),
    true,
  );
  assert.ok(
    factBase.sources.some(({ id }) => id === 'critic:lifecycle-test-critic'),
  );
  assert.deepEqual(adapterResult.manifest.source.authorResultPaths, [
    'source/author/project-recap.json',
    'source/author/architecture.json',
    'source/author/deck.json',
  ]);
});

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
    planSet: fixturePlanSet,
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
    planSet: fixturePlanSet,
    ...REQUIRED_REVIEW_PROVIDERS,
    mode: 'unattended',
  });
  const canonicalFactBasePath = await realpath(factBasePath);

  assert.deepEqual(adapterResult.request.factBase, {
    mode: 'supplied',
    path: canonicalFactBasePath,
    freshnessPolicy: 'live-wins',
  });
});

test('runs repository explainers from a supplied fact base without consulting the active project', async () => {
  const fixture = await createFixture();
  const factBasePath = join(fixture.root, 'repository-facts.json');
  await writeFile(
    factBasePath,
    '{"schemaVersion":"explainer-kit.fact-base/v1"}',
  );

  const adapterResult = await runOatExplainer({
    adapterRoot: fixture.adapterRoot,
    userSkillsRoot: fixture.userSkillsRoot,
    repoRoot: fixture.repoRoot,
    invocation: 'repo',
    activeProject: '.oat/projects/shared/demo',
    recipe: 'project-explainer',
    slug: 'repository-overview',
    suppliedFactBasePath: factBasePath,
    getConfig: getPublishConfig,
    author: fixtureAuthor,
    mode: 'unattended',
  });

  assert.equal(
    adapterResult.outputRoot,
    join(await realpath(fixture.repoRoot), '.oat/repo/reference/explainers'),
  );
  assert.deepEqual(adapterResult.destination, {
    s3Uri: 's3://bucket/repositories/demo',
    publicBaseUrl: 'https://docs.example.com/repositories/demo',
  });
  assert.equal(adapterResult.request.durability.strategy, 'none');
  assert.deepEqual(adapterResult.result.reviewedSource, {
    kind: 'approved-fact-base',
    locator: 'https://github.com/acme/project-recaps',
    repository: 'acme/project-recaps',
    repositoryUrl: 'https://github.com/acme/project-recaps',
    revision: fixture.reviewedCommit,
  });
});

test('fails closed when a repository invocation omits its supplied fact base', async () => {
  const fixture = await createFixture();

  await assert.rejects(
    runOatExplainer({
      adapterRoot: fixture.adapterRoot,
      userSkillsRoot: fixture.userSkillsRoot,
      repoRoot: fixture.repoRoot,
      invocation: 'repo',
      activeProject: '.oat/projects/shared/demo',
      recipe: 'project-explainer',
      slug: 'repository-overview',
      getConfig,
      author: fixtureAuthor,
      mode: 'unattended',
    }),
    /repository invocation requires.*supplied fact base/i,
  );
  await assert.rejects(readFile(fixture.coreInvocationMarker, 'utf8'), {
    code: 'ENOENT',
  });
});

test('documents adapter publication v2 emission with immutable v1 replay', async () => {
  const guidance = await readFile(
    new URL('../references/lifecycle-contract.md', import.meta.url),
    'utf8',
  );

  assert.match(guidance, /publish-request\/v2/i);
  assert.match(guidance, /publicAccess/);
  assert.match(guidance, /publish-request\/v1.*replay/is);
  assert.match(guidance, /publish-receipt\/v1.*replay/is);
  assert.doesNotMatch(guidance, /does not emit that field/i);
  assert.match(guidance, /publish-summary\/v2/i);
  for (const evidence of [
    /source identity/i,
    /rendered path/i,
    /S3 URI/i,
    /canonical public URL/i,
    /content hash/i,
    /object verification/i,
    /public verification/i,
  ]) {
    assert.match(guidance, evidence);
  }
  assert.match(guidance, /publish-receipt\/v1.*reduced.*publish-summary\/v1/is);
});

test('passes only derived credential-free destination roots into core publish requests', async () => {
  const projectFixture = await createFixture();
  const projectResult = await runOatExplainer({
    adapterRoot: projectFixture.adapterRoot,
    userSkillsRoot: projectFixture.userSkillsRoot,
    repoRoot: projectFixture.repoRoot,
    invocation: 'project',
    activeProject: '.oat/projects/shared/demo',
    recipe: 'project-explainer',
    slug: 'published-project',
    getConfig: getPublishConfig,
    author: fixtureAuthor,
    durabilityStrategy: 'publish',
    mode: 'unattended',
  });
  const projectPublish = projectResult.request.durability.publish;
  assert.equal(
    projectPublish.s3Uri,
    's3://bucket/repositories/demo/projects/demo',
  );
  assert.equal(
    projectPublish.publicBaseUrl,
    'https://docs.example.com/repositories/demo/projects/demo',
  );
  assert.deepEqual(projectResult.publication, {
    schemaVersion: 'explainer-kit.publish-summary/v2',
    receiptSchemaVersion: 'explainer-kit.publish-receipt/v2',
    publicAccess: 'protected',
    artifacts: [
      {
        source: { kind: 'manifest', artifactId: 'hub' },
        relativePath: 'site/index.html',
        s3Uri: 's3://bucket/repositories/demo/projects/demo/index.html',
        publicUrl:
          'https://docs.example.com/repositories/demo/projects/demo/index.html',
        hash: `sha256:${'a'.repeat(64)}`,
        contentType: 'text/html',
        objectVerification: {
          status: 'verified',
          method: 'service-checksum',
          hash: `sha256:${'a'.repeat(64)}`,
        },
        publicVerification: { status: 'skipped-protected' },
      },
    ],
  });

  const repositoryFixture = await createFixture();
  const factBasePath = join(repositoryFixture.root, 'repository-facts.json');
  await writeFile(
    factBasePath,
    '{"schemaVersion":"explainer-kit.fact-base/v1"}',
  );
  const repositoryResult = await runOatExplainer({
    adapterRoot: repositoryFixture.adapterRoot,
    userSkillsRoot: repositoryFixture.userSkillsRoot,
    repoRoot: repositoryFixture.repoRoot,
    invocation: 'repo',
    recipe: 'project-explainer',
    slug: 'published-repository',
    suppliedFactBasePath: factBasePath,
    getConfig: getPublishConfig,
    author: fixtureAuthor,
    durabilityStrategy: 'publish',
    mode: 'unattended',
  });
  assert.equal(
    repositoryResult.request.durability.publish.s3Uri,
    's3://bucket/repositories/demo',
  );
  assert.equal(
    repositoryResult.request.durability.publish.publicBaseUrl,
    'https://docs.example.com/repositories/demo',
  );

  for (const request of [projectResult.request, repositoryResult.request]) {
    const publish = request.durability.publish;
    assert.equal(publish.schemaVersion, 'explainer-kit.publish-request/v2');
    assert.equal(publish.publicAccess, 'protected');
    assert.equal('invocation' in request, false);
    assert.equal('projectSlug' in request, false);
    assert.equal('activeProject' in request, false);
    assert.doesNotMatch(
      JSON.stringify(request),
      /access[_-]?key|secret|session[_-]?token|password/i,
    );
  }
});

test('rejects unsafe destination roots before core invocation or publish-request persistence', async () => {
  const invalidRoots = [
    [
      'explainers.publish.s3Uri',
      's3://synthetic-access:synthetic-secret@bucket/repositories/demo',
    ],
    ['explainers.publish.s3Uri', 's3:///bucket/repositories/demo'],
    [
      'explainers.publish.s3Uri',
      's3://bucket/repositories/demo?synthetic-token=value',
    ],
    ['explainers.publish.s3Uri', 's3://bucket/repositories/demo?'],
    [
      'explainers.publish.s3Uri',
      's3://bucket/repositories/demo#synthetic-fragment',
    ],
    ['explainers.publish.s3Uri', 's3://bucket/repositories/demo#'],
    ['explainers.publish.s3Uri', 's3://bucket:/repositories/demo'],
    [
      'explainers.publish.publicBaseUrl',
      'https://synthetic-user:synthetic-password@docs.example.com/repositories/demo',
    ],
    [
      'explainers.publish.publicBaseUrl',
      'https:///docs.example.com/repositories/demo',
    ],
    [
      'explainers.publish.publicBaseUrl',
      'https://docs.example.com/repositories/demo?synthetic-token=value',
    ],
    [
      'explainers.publish.publicBaseUrl',
      'https://docs.example.com/repositories/demo?',
    ],
    [
      'explainers.publish.publicBaseUrl',
      'https://docs.example.com/repositories/demo#synthetic-fragment',
    ],
    [
      'explainers.publish.publicBaseUrl',
      'https://docs.example.com/repositories/demo#',
    ],
    [
      'explainers.publish.publicBaseUrl',
      'https://docs.example.com:/repositories/demo',
    ],
  ];

  for (const [key, value] of invalidRoots) {
    const fixture = await createFixture();
    await assert.rejects(
      runOatExplainer({
        adapterRoot: fixture.adapterRoot,
        userSkillsRoot: fixture.userSkillsRoot,
        repoRoot: fixture.repoRoot,
        invocation: 'project',
        activeProject: '.oat/projects/shared/demo',
        recipe: 'project-explainer',
        slug: 'unsafe-publish-root',
        getConfig: getPublishConfigWith({ [key]: value }),
        author: fixtureAuthor,
        durabilityStrategy: 'publish',
        mode: 'unattended',
      }),
      /destination root|valid (?:s3:\/\/ URI|HTTPS URL)/i,
      `${key} accepted invalid root ${value}`,
    );
    await assert.rejects(readFile(fixture.coreInvocationMarker, 'utf8'), {
      code: 'ENOENT',
    });
    await assert.rejects(readFile(fixture.publishRequestMarker, 'utf8'), {
      code: 'ENOENT',
    });
  }
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
    planSet: fixturePlanSet,
    ...REQUIRED_REVIEW_PROVIDERS,
    mode: 'unattended',
  });

  assert.equal(adapterResult.manifest, null);
  assert.equal(adapterResult.result.outcome, 'failed');
  assert.deepEqual(adapterResult.result.errors, [
    { code: 'E_FACT_BASE', message: 'forced failure' },
  ]);
});

test('fails closed for missing cores and cores below the publication floor', async () => {
  for (const [coreVersion, pattern] of [
    [null, /install utility --scope user/i],
    ['1.9.9', /update --pack utility --scope user/i],
    ['2.0.1', /update --pack utility --scope user/i],
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
    `const calls = [];

export async function author(request) {
  calls.push({
    artifactId: request.artifactId,
    setContext: structuredClone(request.setContext),
    plannedArtifact: structuredClone(request.plannedArtifact),
    hasBrief: typeof request.brief === 'string' && request.brief.length > 0,
    hasShell: typeof request.shell === 'string' && request.shell.length > 0,
    hasVisualAuthoringGuidance:
      typeof request.visualAuthoringGuidance === 'string' &&
      ['representation', 'hierarchy', 'responsive navigation', 'table', 'diagram', 'deck']
        .every((topic) => request.visualAuthoringGuidance.toLowerCase().includes(topic)),
  });
  const sections = (request.floor?.requiredNarrative ?? [])
    .map((id) => \`<section id="\${id}"><h2>\${id}</h2><p>Validated evidence.</p></section>\`)
    .join('');
  const replacements = {
    THEME_CSS: '',
    TITLE: 'Lifecycle-authored recap',
    DESCRIPTION: 'A provider-neutral adaptive recap.',
    EYEBROW: 'Project recap',
    NAVIGATION: '',
    CONTENT: sections,
    FOOTER: 'Generated from approved OAT artifacts.',
    DIAGRAM:
      '<g id="as-built-architecture" class="node"><rect x="20" y="20" width="240" height="80"></rect><text x="40" y="65">Architecture</text></g>',
    LEGEND: '<span>Architecture</span>',
    SLIDES:
      '<section id="outcome" class="slide"><div class="slide__content"><h1>Outcome</h1><p>Validated.</p></div></section>',
  };
  let html = request.shell;
  for (const [token, value] of Object.entries(replacements)) {
    html = html.replaceAll(\`{{\${token}}}\`, value);
  }
  html += '<p>project validated 3 artifacts</p>';
  return {
    schemaVersion: 'explainer-kit.author-result/v2',
    artifactId: request.artifactId,
    content: { html },
    provenance: {
      authorId: 'adapter-lifecycle-author',
      generatedAt: '2026-07-20T12:00:00.000Z',
      method: 'provider-neutral-module',
    },
  };
}

export function getCalls() {
  return calls;
}
`,
  );
}

async function writeValidPlanSetModule(path) {
  await writeFile(
    path,
    `export async function planSet({ recipe, sourceIds }) {
  const floor = recipe.floor ?? [
    { id: 'project-recap', type: 'hub' },
    { id: 'architecture', type: 'diagram' },
    { id: 'deck', type: 'deck' },
  ];
  return {
    schemaVersion: 'explainer-kit.set-plan/v1',
    planId: 'adapter-lifecycle-recap',
    recipe: { id: recipe.id, version: recipe.version },
    sourceIds,
    ledger: {
      terminology: [{ term: 'project', meaning: 'The tracked project.' }],
      statuses: [{ subject: 'implementation', value: 'validated' }],
      numbers: [{ subject: 'required artifacts', value: 3, unit: 'artifacts' }],
    },
    portfolio: floor.map((artifact) => ({
      artifactId: artifact.id,
      artifactType: artifact.type,
      profileId: 'recipe-floor',
      required: true,
      sourceIds,
      draft: \`Compose the planned \${artifact.id} artifact.\`,
      visualIntent: \`Use the selected \${artifact.type} medium.\`,
    })),
  };
}
`,
  );
}
