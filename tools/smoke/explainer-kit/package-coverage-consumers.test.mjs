import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { after, before, test } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { promisify } from 'node:util';

import { createBrowserProbeSession } from '../../../.agents/skills/explainer-kit/scripts/lib/browser-runtime.mjs';
import { runExplainer } from '../../../.agents/skills/explainer-kit/scripts/run.mjs';
import { planTrackedRunFinalization } from '../../../.agents/skills/oat-explainer-kit/scripts/finalize-tracked-run.mjs';

const execFileAsync = promisify(execFile);
const REPO_ROOT = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  '..',
);
const CORE_ROOT = join(REPO_ROOT, '.agents', 'skills', 'explainer-kit');
const CLI_DIST_ROOT = join(REPO_ROOT, 'packages', 'cli', 'dist');
const SHARED_ASSETS_ROOT = join(REPO_ROOT, 'packages', 'cli', 'assets');
const BUNDLE_SCRIPT = join(
  REPO_ROOT,
  'packages',
  'cli',
  'scripts',
  'bundle-assets.sh',
);
const NOW = '2026-07-28T20:00:00.000Z';

// The built CLI consumers below resolve bundled assets at call time. Reading
// the shared packages/cli/assets root would couple this file to any concurrent
// rebuild republishing that directory, so the file bundles once into a private
// temporary root and points OAT_ASSETS_DIR at it for the whole file.
let isolatedAssetsRoot = null;
let capturedAssetsRoot = null;
let previousAssetsDir;
let previousAssetsDirWasSet = false;

before(async () => {
  previousAssetsDir = process.env.OAT_ASSETS_DIR;
  previousAssetsDirWasSet = 'OAT_ASSETS_DIR' in process.env;
  isolatedAssetsRoot = await mkdtemp(
    join(tmpdir(), 'explainer-coverage-assets-'),
  );
  capturedAssetsRoot = isolatedAssetsRoot;

  try {
    await execFileAsync('bash', [BUNDLE_SCRIPT], {
      cwd: REPO_ROOT,
      env: { ...process.env, OAT_ASSETS_DIR: isolatedAssetsRoot },
      maxBuffer: 32 * 1024 * 1024,
    });
  } catch (error) {
    await releaseIsolatedAssets();
    throw error;
  }

  process.env.OAT_ASSETS_DIR = isolatedAssetsRoot;
});

after(releaseIsolatedAssets);

// Registered after the release hook, so it observes the post-cleanup state and
// is the regression guard for environment restoration and temp-root removal:
// without it, dropping the release hook or its unset branch fails silently.
after(() => {
  assert.equal('OAT_ASSETS_DIR' in process.env, previousAssetsDirWasSet);
  if (previousAssetsDirWasSet) {
    assert.equal(process.env.OAT_ASSETS_DIR, previousAssetsDir);
  }

  if (capturedAssetsRoot) {
    assert.equal(existsSync(capturedAssetsRoot), false);
  }
});

async function releaseIsolatedAssets() {
  if (previousAssetsDirWasSet) {
    process.env.OAT_ASSETS_DIR = previousAssetsDir;
  } else {
    delete process.env.OAT_ASSETS_DIR;
  }

  const root = isolatedAssetsRoot;
  isolatedAssetsRoot = null;
  if (root) {
    await rm(root, { recursive: true, force: true });
  }
}

test('built CLI asset resolution reads the private bundle, not the shared root', async () => {
  assert.notEqual(isolatedAssetsRoot, null);
  // Compared as paths rather than via realpath: this file must not depend on
  // the shared assets root existing at any point during the run.
  assert.notEqual(resolve(isolatedAssetsRoot), SHARED_ASSETS_ROOT);

  const { resolveAssetsRoot } = await importDist('fs/assets.js');
  const resolvedRoot = await resolveAssetsRoot();

  assert.equal(resolvedRoot, resolve(isolatedAssetsRoot));
  assert.notEqual(resolvedRoot, SHARED_ASSETS_ROOT);
});

test('core and CLI consume the same bundled canonical backlink contract', async () => {
  const core = await import(
    pathToFileURL(join(CORE_ROOT, 'scripts', 'lib', 'source-backlinks.mjs'))
      .href
  );
  const cli = await importDist(
    'commands/project/archive/explainer-source-backlinks.js',
  );
  const bundled = await cli.loadExplainerSourceBacklinks();
  const tuple = {
    repository: 'acme/project-recaps',
    revision: '0123456789abcdef0123456789abcdef01234567',
    path: 'docs/phase 4/plan.md',
    lineRange: { start: 12, end: 19 },
  };
  const url = core.canonicalGithubBlobBacklink(tuple);

  assert.equal(
    bundled.SOURCE_BACKLINK_CONTRACT_VERSION,
    core.SOURCE_BACKLINK_CONTRACT_VERSION,
  );
  assert.deepEqual(bundled.parseCanonicalGithubBlobUrl(url), {
    ...tuple,
    url,
  });
});

test('one untouched core package passes finalizer, archive, and push coverage', async (t) => {
  const repoRoot = await mkdtemp(join(tmpdir(), 'explainer-coverage-smoke-'));
  t.after(() => rm(repoRoot, { recursive: true, force: true }));
  const projectPath = join(
    repoRoot,
    '.oat',
    'projects',
    'shared',
    'coverage-smoke',
  );
  const outputRoot = join(projectPath, 'explainers');
  const factBasePath = join(projectPath, 'fact-base.json');
  await mkdir(projectPath, { recursive: true });
  await writeFile(factBasePath, `${JSON.stringify(factBase(), null, 2)}\n`);

  const browserSession = await createBrowserProbeSession();
  assert.equal(
    browserSession.available,
    true,
    `installed Chromium unavailable: ${browserSession.reason}`,
  );
  t.after(() => browserSession.close());
  const result = await runExplainer(runRequest(outputRoot, factBasePath), {
    author,
    planSet,
    browserSession,
    visualCritic,
    now: () => NOW,
  });
  assert.equal(
    result.outcome,
    'built-not-durable',
    JSON.stringify(result.warnings),
  );
  const untouchedManifest = await readFile(result.manifestPath, 'utf8');

  const finalization = await planTrackedRunFinalization(
    {
      runRoot: result.runRoot,
      manifestPath: result.manifestPath,
      commitMode: 'dedicated',
    },
    {
      repoRoot,
      project: 'coverage-smoke',
      coreRoot: CORE_ROOT,
    },
  );
  assert.equal(finalization.status, 'ready');

  const { verifySelectedProjectRecapForArchive } = await importDist(
    'commands/project/archive/archive-utils.js',
  );
  const selectedRun = join('explainers', 'coverage-smoke');
  await verifySelectedProjectRecapForArchive(projectPath, selectedRun);

  const { runArchivePushCommand } = await importDist(
    'commands/project/archive/push-runner.js',
  );
  let archived = 0;
  const previousExitCode = process.exitCode;
  process.exitCode = undefined;
  t.after(() => {
    process.exitCode = previousExitCode;
  });
  await runArchivePushCommand(
    {
      resolveProjectRoot: async () => repoRoot,
      readOatConfig: async () => ({ version: 1, archive: {} }),
      readOatLocalConfig: async () => ({
        version: 1,
        activeProject: projectPath,
      }),
      resolveProjectsRoot: async () => '.oat/projects/shared',
      resolvePrimaryRepoRoot: async () => repoRoot,
      resolveArchiveProjectTarget: async () => ({
        archiveProjectPath: '.oat/projects/archived/coverage-smoke',
        archiveRepoRoot: repoRoot,
        archivePath: join(
          repoRoot,
          '.oat',
          'projects',
          'archived',
          'coverage-smoke',
        ),
        archivePathIsGitignored: false,
        primaryRepoRoot: null,
        primaryRepoRootAvailable: true,
        localOnlyWarning: null,
      }),
      verifySelectedProjectRecapForArchive,
      archiveProjectOnCompletion: async () => {
        archived += 1;
        return {
          archivePath: join(
            repoRoot,
            '.oat',
            'projects',
            'archived',
            'coverage-smoke',
          ),
          s3Path: null,
          summaryExportFile: null,
          projectRecapExport: null,
          warnings: [],
        };
      },
      processEnv: process.env,
      timestamp: () => NOW,
    },
    projectPath,
    { projectRecapRun: selectedRun },
    {
      scope: 'project',
      dryRun: false,
      verbose: false,
      json: false,
      cwd: repoRoot,
      home: repoRoot,
      interactive: false,
      logger: {
        info() {},
        warn() {},
        error() {},
        json() {},
        debug() {},
      },
    },
  );
  assert.equal(process.exitCode, 0);
  assert.equal(archived, 1);

  const manifestAfter = await readFile(result.manifestPath, 'utf8');
  assert.equal(manifestAfter, untouchedManifest);
});

function runRequest(outputRoot, factBasePath) {
  return {
    schemaVersion: 'explainer-kit.run-request/v1',
    recipe: { id: 'project-recap', version: '1' },
    slug: 'coverage-smoke',
    outputRoot,
    factBase: {
      mode: 'supplied',
      path: factBasePath,
      freshnessPolicy: 'live-wins',
    },
    theme: {
      style: 'clean-neutral',
      artDirection: 'Private transient direction',
    },
    durability: { strategy: 'none' },
    privacy: { retainRawArtDirection: false },
    mode: 'unattended',
  };
}

function factBase() {
  return {
    schemaVersion: 'explainer-kit.fact-base/v1',
    generatedAt: NOW,
    mode: 'supplied',
    freshnessPolicy: 'live-wins',
    sources: [
      {
        id: 'project',
        kind: 'file',
        locator: 'project.md',
        hash: `sha256:${'a'.repeat(64)}`,
        observedAt: NOW,
      },
    ],
    claims: [
      {
        id: 'architecture',
        text: 'The system uses a config-blind core.',
        status: 'confirmed',
        citations: [{ sourceId: 'project', locator: 'project.md:1' }],
      },
    ],
    unresolvedClaims: [],
    overrides: [],
  };
}

async function planSet({ recipe, factBase: suppliedFactBase }) {
  const sourceIds = suppliedFactBase.sources.map(({ id }) => id);
  return {
    schemaVersion: 'explainer-kit.set-plan/v1',
    planId: 'coverage-smoke-set',
    recipe: { id: recipe.id, version: recipe.version },
    sourceIds,
    ledger: {
      terminology: [
        { term: 'config-blind core', meaning: 'Provider-neutral runtime.' },
      ],
      statuses: [{ subject: 'implementation', value: 'validated' }],
      numbers: [{ subject: 'source sets', value: 1, unit: 'set' }],
    },
    portfolio: [
      ['project-recap', 'hub'],
      ['architecture', 'diagram'],
      ['deck', 'deck'],
    ].map(([artifactId, artifactType]) => ({
      artifactId,
      artifactType,
      profileId: 'recipe-floor',
      required: true,
      sourceIds,
      draft: `Compose ${artifactId}.`,
      visualIntent: `Lead with ${artifactId}.`,
    })),
  };
}

async function author(request) {
  const ledger = [
    ...request.setContext.ledger.terminology.map(({ term }) => term),
    ...request.setContext.ledger.statuses.map(({ value }) => value),
    ...request.setContext.ledger.numbers.map(
      ({ value, unit }) => `${value} ${unit}`,
    ),
  ].join('; ');
  const html = request.shell
    .replaceAll('{{TITLE}}', `Coverage ${request.artifactId}`)
    .replaceAll('{{DESCRIPTION}}', 'Canonical package coverage smoke.')
    .replaceAll('{{EYEBROW}}', 'Explainer Kit')
    .replaceAll('{{NAVIGATION}}', '')
    .replaceAll(
      '{{CONTENT}}',
      `<section id="overview"><h2>Overview</h2><p>${ledger}</p></section>`,
    )
    .replaceAll(
      '{{DIAGRAM}}',
      '<rect data-node="overview" class="node active" width="80" height="40"></rect>',
    )
    .replaceAll('{{FOOTER}}', 'Validated package coverage.')
    .replaceAll(
      '{{SLIDES}}',
      '<section class="slide"><div class="slide__content"><h1>Overview</h1></div></section>',
    )
    .replaceAll('{{LEGEND}}', '<span>Overview</span>')
    .replaceAll('{{THEME_CSS}}', '');
  return {
    schemaVersion: 'explainer-kit.author-result/v2',
    artifactId: request.artifactId,
    content: { html },
    provenance: {
      authorId: 'coverage-smoke-author',
      generatedAt: NOW,
      method: 'test-callback',
    },
  };
}

async function visualCritic(request) {
  return {
    schemaVersion: 'explainer-kit.visual-review-result/v1',
    reviewId: 'coverage-smoke-review',
    requestId: request.requestId,
    requestHash: request.requestHash,
    reviewedAt: NOW,
    disposition: 'pass',
    artifactIds: request.renderedArtifacts.map(({ artifactId }) => artifactId),
    findings: [],
  };
}

function importDist(relativePath) {
  return import(pathToFileURL(join(CLI_DIST_ROOT, relativePath)).href);
}
