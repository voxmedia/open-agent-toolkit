import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, test } from 'node:test';

import {
  catalogFromManifest,
  initiativeCatalogPath,
  serializeInitiativeCatalog,
} from '../../.agents/skills/explainer-kit/scripts/lib/catalog.mjs';
import { validateContract } from '../../.agents/skills/explainer-kit/scripts/lib/contracts.mjs';
import { buildExplainerRc } from './build-explainer-rc.mjs';
import {
  hashCanonicalJson,
  releaseCandidateIdentity,
} from './explainer-rc-contract.mjs';
import { runExplainerRc } from './run-explainer-rc.mjs';
import { validateExplainerAcceptance } from './validate-explainer-acceptance.mjs';

const CLEAN_REPO = process.env.EXPLAINER_RC_INTEGRATION_REPO;
let root;

after(async () => {
  if (root) await rm(root, { recursive: true, force: true });
});

test('packaged RC v2 fixture includes exact production catalog evidence', () => {
  const manifest = fixtureManifest();
  const receipt = publishReceipt(manifest);
  const catalogPath = initiativeCatalogPath(manifest.slug);
  const catalogHash = hashBytes(
    Buffer.from(
      serializeInitiativeCatalog(
        catalogFromManifest(manifest, receipt.roots.publicBaseUrl),
      ),
    ),
  );
  const catalog = receipt.artifacts.find(
    ({ source }) => source.kind === 'auxiliary' && source.name === 'catalog',
  );

  assert.equal(receipt.artifacts.length, manifest.artifacts.length + 1);
  assert.deepEqual(catalog, {
    source: { kind: 'auxiliary', name: 'catalog' },
    relativePath: catalogPath,
    hash: catalogHash,
    s3Uri: `${receipt.roots.s3Uri}/${catalogPath.slice('site/'.length)}`,
    publicUrl: `${receipt.roots.publicBaseUrl}/${catalogPath.slice('site/'.length)}`,
    contentType: 'application/json',
    objectVerification: verifiedObject(catalogHash),
    publicVerification: verifiedPublic(catalogHash),
  });
  const context = {
    manifest,
    catalogArtifact: { relativePath: catalogPath, hash: catalogHash },
  };
  assert.equal(
    validateContract('publish-receipt', receipt, context).valid,
    true,
  );

  const drifted = structuredClone(receipt);
  drifted.artifacts.pop();
  assert.equal(
    validateContract('publish-receipt', drifted, context).valid,
    false,
  );
});

test(
  'builds a real RC, runs its packaged core, and validates attributable wrapper post-run evidence',
  { skip: !CLEAN_REPO, timeout: 180_000 },
  async () => {
    root = await mkdtemp(join(tmpdir(), 'explainer-rc-integration-'));
    const artifactsDir = join(root, 'retained-rc');
    const acceptanceDir = join(root, 'acceptance');
    const rcPath = join(acceptanceDir, 'rc.json');
    const requestPath = join(root, 'private-request.json');
    const factBasePath = join(root, 'fact-base.json');
    const authorModulePath = join(root, 'fixture-author.mjs');
    const executionPath = join(root, 'private-wrapper-execution.json');
    await Promise.all([
      writeJson(factBasePath, suppliedFactBase()),
      writeFile(authorModulePath, fixtureAuthorModule()),
    ]);
    const request = runRequest(root, factBasePath);
    await writeJson(requestPath, request);

    const rc = await buildExplainerRc({
      repoRoot: CLEAN_REPO,
      output: artifactsDir,
      record: rcPath,
    });
    const execution = await runExplainerRc({
      rcManifest: rcPath,
      artifactsDir,
      entry: 'scripts/run.mjs',
      record: executionPath,
      entryArgs: [
        '--request',
        requestPath,
        '--author-module',
        authorModulePath,
      ],
      cwd: root,
    });
    const manifest = JSON.parse(
      await readFile(
        join(root, 'runs/real-packaged-core/manifest.json'),
        'utf8',
      ),
    );

    assert.deepEqual(execution.request, {
      schemaVersion: request.schemaVersion,
      sha256: hashCanonicalJson(request),
    });
    assert.deepEqual(execution.outputs, {
      manifest: {
        schemaVersion: manifest.schemaVersion,
        sha256: hashCanonicalJson(manifest),
      },
      receipt: null,
    });
    assert.equal(execution.coreRunId, manifest.runId);
    assert.deepEqual(
      JSON.parse(await readFile(executionPath, 'utf8')),
      execution,
    );

    const receipt = publishReceipt(manifest);
    const wrapper = wrapperEvidence({
      rc,
      execution,
      request,
      manifest,
      receipt,
    });
    await Promise.all([
      writeJson(join(acceptanceDir, 'private-wrapper-result.json'), wrapper),
      writeJson(join(acceptanceDir, 'private-wrapper-manifest.json'), manifest),
      writeJson(
        join(acceptanceDir, 'private-wrapper-publish-receipt.json'),
        receipt,
      ),
    ]);

    const accepted = await validateExplainerAcceptance({
      acceptanceDir,
      gate: 'wrapper',
      cwd: root,
    });
    assert.equal(accepted.status, 'passed');
    assert.equal(accepted.rcId, rc.rcId);
    assert.equal(accepted.gates.wrapper.postRunReceipt, 'validated');

    receipt.sentinel.relativePath =
      '.explainer-kit-sentinel/foreign-run-0123456789abcdeffedcba9876543210.txt';
    wrapper.hashes.publishReceipt = hashCanonicalJson(receipt);
    await Promise.all([
      writeJson(join(acceptanceDir, 'private-wrapper-result.json'), wrapper),
      writeJson(
        join(acceptanceDir, 'private-wrapper-publish-receipt.json'),
        receipt,
      ),
    ]);
    await assert.rejects(
      validateExplainerAcceptance({
        acceptanceDir,
        gate: 'wrapper',
        cwd: root,
      }),
      {
        code: 'E_RECEIPT_MISMATCH',
        details: { evidence: 'private-wrapper-publish-receipt.json' },
      },
    );
  },
);

function wrapperEvidence({ rc, execution, request, manifest, receipt }) {
  return {
    schemaVersion: 'explainer-kit.wrapper-acceptance/v1',
    rcId: rc.rcId,
    candidate: releaseCandidateIdentity(rc),
    coreRunId: manifest.runId,
    verdict: 'passed',
    packagedExecution: execution,
    command: {
      sanitized: true,
      argv: ['private-wrapper', '--rc-manifest', 'rc.json'],
    },
    context: {
      privateRequestExternal: true,
      credentialsPersisted: false,
    },
    hashes: {
      request: hashCanonicalJson(request),
      manifest: hashCanonicalJson(manifest),
      publishReceipt: hashCanonicalJson(receipt),
    },
    durability: {
      outcome: 'built-durable',
      verified: true,
    },
    capabilities: {
      presetResolution: true,
      vaultStoaOutput: true,
      googleDocsSync: true,
      personalDestinationLinks: true,
      manifestConsumption: true,
      rollbackReady: true,
    },
  };
}

function publishReceipt(manifest) {
  const roots = {
    s3Uri: 's3://example-bucket/explainers',
    publicBaseUrl: 'https://cdn.example.com/explainers',
  };
  const artifacts = manifest.artifacts
    .filter(({ status }) => status === 'built')
    .map(({ id, renderedPath, hash, mediaType }) => {
      const publishedPath = renderedPath.slice('site/'.length);
      return {
        source: { kind: 'manifest', artifactId: id },
        relativePath: renderedPath,
        hash,
        s3Uri: `${roots.s3Uri}/${publishedPath}`,
        publicUrl: `${roots.publicBaseUrl}/${publishedPath}`,
        contentType: mediaType,
        objectVerification: verifiedObject(hash),
        publicVerification: verifiedPublic(hash),
      };
    });
  const catalogPath = initiativeCatalogPath(manifest.slug);
  const catalogHash = hashBytes(
    Buffer.from(
      serializeInitiativeCatalog(
        catalogFromManifest(manifest, roots.publicBaseUrl),
      ),
    ),
  );
  const catalogPublishedPath = catalogPath.slice('site/'.length);
  artifacts.push({
    source: { kind: 'auxiliary', name: 'catalog' },
    relativePath: catalogPath,
    hash: catalogHash,
    s3Uri: `${roots.s3Uri}/${catalogPublishedPath}`,
    publicUrl: `${roots.publicBaseUrl}/${catalogPublishedPath}`,
    contentType: 'application/json',
    objectVerification: verifiedObject(catalogHash),
    publicVerification: verifiedPublic(catalogHash),
  });

  return {
    schemaVersion: 'explainer-kit.publish-receipt/v2',
    provider: 's3-static',
    publishedAt: '2026-07-18T12:00:00.000Z',
    publicAccess: 'public',
    roots,
    sentinel: {
      relativePath: `.explainer-kit-sentinel/${safeRunId(manifest.runId)}-0123456789abcdeffedcba9876543210.txt`,
      objectVerification: verifiedObject(`sha256:${'a'.repeat(64)}`),
      publicVerification: verifiedPublic(`sha256:${'a'.repeat(64)}`),
      deleted: true,
    },
    artifacts,
  };
}

function verifiedObject(hash) {
  return { status: 'verified', method: 'service-checksum', hash };
}

function verifiedPublic(hash) {
  return { status: 'verified', httpStatus: 200, hash };
}

function runRequest(outputRoot, factBasePath) {
  return {
    schemaVersion: 'explainer-kit.run-request/v1',
    recipe: { id: 'project-explainer', version: '1' },
    slug: 'real-packaged-core',
    outputRoot: join(outputRoot, 'runs'),
    factBase: {
      mode: 'supplied',
      path: factBasePath,
      freshnessPolicy: 'live-wins',
    },
    theme: {
      palette: 'neutral',
      visualProfile: 'clean',
      renderStrategy: 'default-only',
    },
    durability: { strategy: 'none' },
    privacy: { retainRawArtDirection: false },
    mode: 'unattended',
  };
}

function suppliedFactBase() {
  return {
    schemaVersion: 'explainer-kit.fact-base/v1',
    generatedAt: '2026-07-18T12:00:00.000Z',
    mode: 'supplied',
    freshnessPolicy: 'live-wins',
    sources: [
      {
        id: 'integration',
        kind: 'file',
        locator: 'integration.md',
        hash: `sha256:${'a'.repeat(64)}`,
        observedAt: '2026-07-18T12:00:00.000Z',
      },
    ],
    claims: [
      {
        id: 'packaged-evidence',
        text: 'The retained packaged core emitted this manifest.',
        status: 'confirmed',
        citations: [{ sourceId: 'integration', locator: 'integration.md:1' }],
      },
    ],
    unresolvedClaims: [],
    overrides: [],
  };
}

function fixtureAuthorModule() {
  return `export default async function author(request) {
  const humanize = (value) =>
    value
      .split('-')
      .map((part) => \`\${part[0].toUpperCase()}\${part.slice(1)}\`)
      .join(' ');
  const required = request.floor?.requiredNarrative ?? ['overview'];
  const markdown = required
    .map(
      (id, index) =>
        \`## \${humanize(id)}\\n\\nThis section explains the verified \${humanize(id).toLowerCase()}.\${index === 0 ? \` \${request.factBase.claims[0]?.text ?? ''}\` : ''}\`,
    )
    .join('\\n\\n');
  return {
    schemaVersion: 'explainer-kit.author-result/v2',
    artifactId: request.artifactId,
    content: {
      markdown: \`# Real packaged core\\n\\n\${markdown}\\n\`,
    },
    provenance: {
      authorId: 'packaged-rc-fixture-author',
      generatedAt: '2026-07-18T12:00:00.000Z',
      method: 'module',
    },
  };
}
`;
}

function safeRunId(runId) {
  return (
    runId
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'run'
  );
}

function fixtureManifest() {
  const hash = `sha256:${'b'.repeat(64)}`;
  return {
    schemaVersion: 'explainer-kit.manifest/v1',
    runId: 'run-packaged-fixture',
    slug: 'packaged-fixture',
    recipe: { id: 'project-explainer', version: '1' },
    createdAt: '2026-07-18T12:00:00.000Z',
    source: {
      factBasePath: 'source/fact-base.json',
      factBaseHash: hash,
      inputHashes: { 'integration.md': hash },
      authorResultPaths: ['source/author/hub.json'],
      backlinks: [],
    },
    theme: { path: 'theme.resolved.json', hash, derived: false },
    artifacts: [
      {
        id: 'hub',
        type: 'hub',
        contentPath: 'source/content/hub.md',
        renderedPath: 'site/initiatives/packaged-fixture/index.html',
        mediaType: 'text/html; charset=utf-8',
        status: 'built',
        hash,
        rebuildable: false,
      },
    ],
    immutableHashes: {
      'run-request.json': hash,
      'source/content-approval.json': hash,
      'source/author/hub.json': hash,
      'source/fact-base.json': hash,
      'source/fact-base.md': hash,
      'theme.resolved.json': hash,
      'source/content/hub.md': hash,
      'site/initiatives/packaged-fixture/index.html': hash,
    },
    outcome: 'built-not-durable',
    buildRecord: { path: 'build-record.json', hash },
    warnings: [],
  };
}

function hashBytes(bytes) {
  return `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
}

async function writeJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
}
