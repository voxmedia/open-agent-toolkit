import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, test } from 'node:test';

import { canonicalHash, validateContract } from '../scripts/lib/contracts.mjs';
import { resolveRootConfinedPath } from '../scripts/lib/safe-paths.mjs';
import { runValidationCli } from '../scripts/validate.mjs';

const HASH_A = `sha256:${'a'.repeat(64)}`;
const HASH_B = `sha256:${'b'.repeat(64)}`;
const NOW = '2026-07-17T20:00:00Z';
const tempDirs = [];

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
  );
});

function runRequest() {
  return {
    schemaVersion: 'explainer-kit.run-request/v1',
    recipe: { id: 'project-explainer', version: '1' },
    slug: 'demo-project',
    outputRoot: '/tmp/explainers',
    factBase: {
      mode: 'supplied',
      path: 'fact-base.json',
      freshnessPolicy: 'live-wins',
    },
    theme: { renderStrategy: 'default-only' },
    mode: 'interactive',
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
        id: 'plan',
        kind: 'file',
        locator: 'plan.md',
        hash: HASH_A,
      },
    ],
    claims: [],
    unresolvedClaims: [],
    overrides: [],
  };
}

function colors() {
  return {
    surface: { canvas: '#ffffff', panel: '#f0f0f0', elevated: '#e0e0e0' },
    ink: { primary: '#111111', muted: '#444444', inverse: '#ffffff' },
    accent: { primary: '#0055aa', secondary: '#663399' },
    status: {
      success: '#008800',
      warning: '#aa6600',
      danger: '#cc0000',
      info: '#0066cc',
    },
    diagramSeries: ['#0055aa'],
  };
}

function theme() {
  return {
    schemaVersion: 'explainer-kit.theme/v1',
    name: 'neutral-clean',
    defaultMode: 'light',
    modes: { light: colors(), dark: colors() },
    provenance: { derived: false },
    typography: {
      sans: ['system-ui'],
      serif: ['serif'],
      mono: ['monospace'],
      scale: { body: '1rem' },
      lineHeight: { body: 1.5 },
    },
    spacing: { unit: 4, scale: { sm: 4 } },
    geometry: { radius: { sm: 2 }, borderWidth: 1 },
    elevation: { shadows: { low: 'none' } },
    density: 'comfortable',
    motion: {
      enabled: false,
      durationMs: { normal: 0 },
      easing: { standard: 'linear' },
      reducedMotion: 'disable-nonessential',
    },
    diagrams: {
      lineWidth: 2,
      nodeGap: 24,
      arrowStyle: 'straight',
      labelTreatment: 'boxed',
    },
    bundleHash: HASH_A,
  };
}

function buildRecord() {
  return {
    schemaVersion: 'explainer-kit.build-record/v1',
    runId: 'run-1',
    renderStrategy: 'default-only',
    startedAt: NOW,
    stages: [
      {
        id: 'validate',
        status: 'passed',
        outputPaths: [],
        warnings: [],
      },
    ],
    outcome: 'built-not-durable',
  };
}

function manifest() {
  return {
    schemaVersion: 'explainer-kit.manifest/v1',
    runId: 'run-1',
    slug: 'demo-project',
    recipe: { id: 'project-explainer', version: '1' },
    createdAt: NOW,
    source: {
      factBasePath: 'fact-base.json',
      factBaseHash: HASH_A,
      inputHashes: { 'plan.md': HASH_A },
    },
    theme: { path: 'theme.resolved.json', hash: HASH_A, derived: false },
    artifacts: [
      {
        id: 'hub',
        type: 'hub',
        contentPath: 'content/hub.json',
        renderedPath: 'site/index.html',
        status: 'built',
        hash: HASH_B,
        rebuildable: false,
      },
    ],
    immutableHashes: {
      'fact-base.json': HASH_A,
      'source/fact-base.md': HASH_A,
      'theme.resolved.json': HASH_A,
      'content/hub.json': HASH_A,
      'site/index.html': HASH_B,
    },
    outcome: 'built-not-durable',
    buildRecord: { path: 'build-record.json', hash: HASH_A },
    warnings: [],
  };
}

function publishRequest() {
  return {
    schemaVersion: 'explainer-kit.publish-request/v1',
    provider: 's3-static',
    s3Uri: 's3://example/explainers',
    publicBaseUrl: 'https://example.com/explainers',
    awsRegion: 'us-east-1',
    siteRoot: 'site',
    manifestPath: 'manifest.json',
  };
}

function publishReceipt() {
  return {
    schemaVersion: 'explainer-kit.publish-receipt/v1',
    provider: 's3-static',
    publishedAt: NOW,
    roots: {
      s3Uri: 's3://example/explainers',
      publicBaseUrl: 'https://example.com/explainers',
    },
    sentinel: {
      relativePath: '.sentinel',
      uploadVerified: true,
      publicVerified: true,
      deleted: true,
    },
    artifacts: [
      {
        relativePath: 'site/index.html',
        hash: HASH_B,
        s3Uri: 's3://example/explainers/site/index.html',
        publicUrl: 'https://example.com/explainers/site/index.html',
        httpStatus: 200,
        contentType: 'text/html',
      },
    ],
  };
}

test('accepts valid v1 fixtures for every contract kind', () => {
  const fixtures = {
    'run-request': runRequest(),
    'fact-base': factBase(),
    theme: theme(),
    manifest: manifest(),
    'build-record': buildRecord(),
    'durability-evidence': {
      schemaVersion: 'explainer-kit.durability-evidence/v1',
      manifestPath: 'manifest.json',
      evidence: {
        kind: 'commit',
        repoRoot: '/repo',
        commit: 'abcdef1',
        paths: ['site/index.html'],
      },
    },
    'publish-request': publishRequest(),
    'publish-receipt': publishReceipt(),
  };

  for (const [kind, fixture] of Object.entries(fixtures)) {
    assert.deepEqual(validateContract(kind, fixture), {
      valid: true,
      errors: [],
    });
  }
});

test('rejects unknown kinds, versions, and object keys', () => {
  assert.equal(validateContract('unknown', {}).errors[0].code, 'unknown-kind');

  const wrongVersion = runRequest();
  wrongVersion.schemaVersion = 'explainer-kit.run-request/v2';
  assert.equal(
    validateContract('run-request', wrongVersion).errors[0].code,
    'schema-version',
  );

  const unknownKey = runRequest();
  unknownKey.secretSauce = true;
  assert.ok(
    validateContract('run-request', unknownKey).errors.some(
      (error) => error.code === 'unknown-key',
    ),
  );
});

test('rejects unsafe paths, invalid render strategies, and duplicate paths', () => {
  const unsafe = manifest();
  unsafe.artifacts[0].contentPath = '../escape.json';
  assert.ok(
    validateContract('manifest', unsafe).errors.some(
      (error) => error.code === 'pattern',
    ),
  );

  const invalidStrategy = buildRecord();
  invalidStrategy.renderStrategy = 'both';
  assert.ok(
    validateContract('build-record', invalidStrategy).errors.some(
      (error) => error.path === '$.renderStrategy',
    ),
  );

  const duplicate = manifest();
  duplicate.artifacts.push({
    ...duplicate.artifacts[0],
    id: 'second',
    contentPath: 'site/index.html',
  });
  assert.ok(
    validateContract('manifest', duplicate).errors.some(
      (error) => error.code === 'duplicate-artifact-path',
    ),
  );
});

test('rejects non-POSIX and unsafe path values across public contracts', () => {
  const cases = [
    [
      'run-request fact base',
      'run-request',
      runRequest(),
      (value) => {
        value.factBase.path = 'source\\facts.json';
      },
    ],
    [
      'run-request output root',
      'run-request',
      runRequest(),
      (value) => {
        value.outputRoot = 'output\0root';
      },
    ],
    [
      'run-request nested publish path',
      'run-request',
      runRequest(),
      (value) => {
        value.durability = {
          strategy: 'publish',
          publish: publishRequest(),
        };
        value.durability.publish.siteRoot = 'site\\generated';
      },
    ],
    [
      'manifest artifact',
      'manifest',
      manifest(),
      (value) => {
        value.artifacts[0].contentPath = '/absolute/content.json';
      },
    ],
    [
      'manifest hash key',
      'manifest',
      manifest(),
      (value) => {
        value.source.inputHashes = { 'source\\plan.md': HASH_A };
      },
    ],
    [
      'build record output',
      'build-record',
      buildRecord(),
      (value) => {
        value.stages[0].outputPaths = ['site\\index.html'];
      },
    ],
    [
      'durability evidence path',
      'durability-evidence',
      {
        schemaVersion: 'explainer-kit.durability-evidence/v1',
        manifestPath: 'manifest.json',
        evidence: {
          kind: 'commit',
          repoRoot: '/repo',
          commit: 'abcdef1',
          paths: ['site/index.html'],
        },
      },
      (value) => {
        value.evidence.paths = ['../site/index.html'];
      },
    ],
    [
      'publish request site root',
      'publish-request',
      publishRequest(),
      (value) => {
        value.siteRoot = 'site\\generated';
      },
    ],
    [
      'publish receipt artifact',
      'publish-receipt',
      publishReceipt(),
      (value) => {
        value.artifacts[0].relativePath = 'site\0index.html';
      },
    ],
  ];

  for (const [label, kind, fixture, mutate] of cases) {
    mutate(fixture);
    const result = validateContract(kind, fixture);
    assert.equal(result.valid, false, label);
    assert.ok(
      result.errors.some((error) => error.code === 'unsafe-path'),
      `${label}: ${JSON.stringify(result.errors)}`,
    );
  }
});

test('public validation CLI rejects unsafe paths', async () => {
  const root = await mkdtemp(join(tmpdir(), 'explainer-validation-cli-'));
  tempDirs.push(root);
  const inputPath = join(root, 'manifest.json');
  const unsafe = manifest();
  unsafe.source.factBasePath = 'source\\facts.json';
  await writeFile(inputPath, JSON.stringify(unsafe), 'utf8');
  const output = [];

  const exitCode = await runValidationCli(['manifest', inputPath], {
    log: (line) => output.push(line),
  });

  assert.equal(exitCode, 1);
  assert.ok(
    JSON.parse(output.join('\n')).errors.some(
      (error) => error.code === 'unsafe-path',
    ),
  );
});

test('enforces every run-request fact-base and durability invariant', () => {
  const invalidCases = [
    [
      'supplied with sources',
      (value) => {
        value.factBase.sources = [
          { id: 'plan', kind: 'file', locator: 'plan.md' },
        ];
      },
      'fact-base-fields',
    ],
    [
      'federated with path',
      (value) => {
        value.factBase = {
          mode: 'federated',
          path: 'fact-base.json',
          sources: [{ id: 'plan', kind: 'file', locator: 'plan.md' }],
          freshnessPolicy: 'live-wins',
        };
      },
      'fact-base-fields',
    ],
    [
      'publish without settings',
      (value) => {
        value.durability = { strategy: 'publish' };
      },
      'incomplete-publish',
    ],
    [
      'none with publish settings',
      (value) => {
        value.durability = {
          strategy: 'none',
          publish: publishRequest(),
        };
      },
      'unexpected-publish',
    ],
    [
      'commit with publish settings',
      (value) => {
        value.durability = {
          strategy: 'commit',
          publish: publishRequest(),
        };
      },
      'unexpected-publish',
    ],
    [
      'retained direction without theme',
      (value) => {
        delete value.theme;
        value.privacy = { retainRawArtDirection: true };
      },
      'art-direction-required',
    ],
    [
      'retained direction without art direction',
      (value) => {
        value.privacy = { retainRawArtDirection: true };
      },
      'art-direction-required',
    ],
  ];

  for (const [label, mutate, expectedCode] of invalidCases) {
    const value = runRequest();
    mutate(value);
    const result = validateContract('run-request', value);
    assert.equal(result.valid, false, label);
    assert.ok(
      result.errors.some((error) => error.code === expectedCode),
      `${label}: ${JSON.stringify(result.errors)}`,
    );
  }

  const retained = runRequest();
  retained.theme.artDirection = 'Use hand-drawn diagrams';
  retained.privacy = { retainRawArtDirection: true };
  assert.equal(validateContract('run-request', retained).valid, true);
});

test('rejects raw secret fields', () => {
  const secret = {
    ...publishRequest(),
    awsSecretAccessKey: 'never-persist-this',
  };
  assert.ok(
    validateContract('publish-request', secret).errors.some(
      (error) => error.code === 'raw-secret-field',
    ),
  );
});

test('produces canonical hashes and detects cross-record mismatch', () => {
  assert.equal(
    canonicalHash({ b: 2, a: { y: 2, x: 1 } }),
    canonicalHash({ a: { x: 1, y: 2 }, b: 2 }),
  );

  const record = buildRecord();
  const resolvedTheme = theme();
  const value = manifest();
  value.buildRecord.hash = canonicalHash(record);
  value.theme.hash = canonicalHash(resolvedTheme);
  assert.equal(
    validateContract('manifest', value, {
      buildRecord: record,
      theme: resolvedTheme,
      runRequest: runRequest(),
    }).valid,
    true,
  );

  record.runId = 'other-run';
  const mismatch = validateContract('manifest', value, {
    buildRecord: record,
    theme: resolvedTheme,
    runRequest: runRequest(),
  });
  assert.ok(
    mismatch.errors.some((error) => error.code === 'cross-record-mismatch'),
  );
  assert.ok(mismatch.errors.some((error) => error.code === 'hash-mismatch'));
});

test('rejects lexical traversal and symlink escapes from a root', async () => {
  const root = await mkdtemp(join(tmpdir(), 'explainer-safe-root-'));
  const outside = await mkdtemp(join(tmpdir(), 'explainer-safe-outside-'));
  tempDirs.push(root, outside);
  await mkdir(join(root, 'site'), { recursive: true });
  await writeFile(join(root, 'site', 'index.html'), 'ok', 'utf8');
  await writeFile(join(outside, 'secret.txt'), 'nope', 'utf8');
  await symlink(outside, join(root, 'site', 'escape'));

  assert.equal(
    (await resolveRootConfinedPath(root, 'site/index.html')).valid,
    true,
  );
  assert.equal(
    (await resolveRootConfinedPath(root, '../outside')).errors[0].code,
    'path-traversal',
  );
  assert.equal(
    (await resolveRootConfinedPath(root, 'site/escape/secret.txt')).errors[0]
      .code,
    'symlink-escape',
  );
});
