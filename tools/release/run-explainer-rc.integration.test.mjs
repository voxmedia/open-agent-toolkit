import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, test } from 'node:test';

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
    const executionPath = join(root, 'private-wrapper-execution.json');
    await writeJson(factBasePath, suppliedFactBase());
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
      entryArgs: ['--request', requestPath],
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
  return {
    schemaVersion: 'explainer-kit.publish-receipt/v1',
    provider: 's3-static',
    publishedAt: '2026-07-18T12:00:00.000Z',
    roots,
    sentinel: {
      relativePath: `.explainer-kit-sentinel/${safeRunId(manifest.runId)}-0123456789abcdeffedcba9876543210.txt`,
      uploadVerified: true,
      publicVerified: true,
      deleted: true,
    },
    artifacts: manifest.artifacts
      .filter(({ status }) => status === 'built')
      .map(({ renderedPath, hash, mediaType }) => {
        const publishedPath = renderedPath.slice('site/'.length);
        return {
          relativePath: renderedPath,
          hash,
          s3Uri: `${roots.s3Uri}/${publishedPath}`,
          publicUrl: `${roots.publicBaseUrl}/${publishedPath}`,
          httpStatus: 200,
          contentType: mediaType,
        };
      }),
  };
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

function safeRunId(runId) {
  return (
    runId
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'run'
  );
}

async function writeJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
}
