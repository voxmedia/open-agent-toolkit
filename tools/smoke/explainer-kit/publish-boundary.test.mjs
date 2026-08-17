import assert from 'node:assert/strict';
import { execFile as execFileCallback } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, test } from 'node:test';
import { promisify } from 'node:util';

import {
  catalogFromManifest,
  initiativeCatalogPath,
  serializeInitiativeCatalog,
  validateInitiativeCatalog,
} from '../../../.agents/skills/explainer-kit/scripts/lib/catalog.mjs';
import { runOatExplainer } from '../../../.agents/skills/oat-explainer-kit/scripts/run.mjs';

const REPO_ROOT = resolve(import.meta.dirname, '../../..');
const ADAPTER_ROOT = join(REPO_ROOT, '.agents', 'skills', 'oat-explainer-kit');
const SKILLS_ROOT = join(REPO_ROOT, '.agents', 'skills');
const NOW = '2026-08-06T12:00:00.000Z';
const SOURCE_HASH = `sha256:${'a'.repeat(64)}`;
const execFile = promisify(execFileCallback);
const tempDirs = [];

afterEach(async () => {
  await Promise.all(
    tempDirs
      .splice(0)
      .map((path) => rm(path, { recursive: true, force: true })),
  );
});

test('adapter-to-destination publishing preserves bytes, prefixes, access mode, and catalog coverage', async () => {
  const fixture = await createRepositoryFixture();
  const cases = [
    {
      invocation: 'project',
      activeProject: '.oat/projects/shared/demo',
      slug: 'project-boundary',
      publicAccess: 'public',
      configuredS3Uri: 's3://acceptance-bucket/explainers',
      configuredPublicBaseUrl: 'https://docs.example.com/explainers',
      expectedS3Uri: 's3://acceptance-bucket/explainers/projects/demo',
      expectedPublicBaseUrl:
        'https://docs.example.com/explainers/projects/demo',
    },
    {
      invocation: 'repo',
      slug: 'repository-boundary',
      publicAccess: 'protected',
      configuredS3Uri:
        's3://acceptance-bucket/explainers/repositories/acme/publish-boundary',
      configuredPublicBaseUrl:
        'https://docs.example.com/explainers/repositories/acme/publish-boundary',
      expectedS3Uri:
        's3://acceptance-bucket/explainers/repositories/acme/publish-boundary',
      expectedPublicBaseUrl:
        'https://docs.example.com/explainers/repositories/acme/publish-boundary',
    },
  ];

  for (const publishCase of cases) {
    const destination = fakeDestination(publishCase.publicAccess);
    const result = await runOatExplainer({
      adapterRoot: ADAPTER_ROOT,
      userSkillsRoot: SKILLS_ROOT,
      repoRoot: fixture.repoRoot,
      invocation: publishCase.invocation,
      ...(publishCase.activeProject && {
        activeProject: publishCase.activeProject,
      }),
      recipe: 'project-explainer',
      slug: publishCase.slug,
      suppliedFactBasePath: fixture.factBasePath,
      getConfig: publishConfig(publishCase),
      author: providerNeutralAuthor,
      mode: 'unattended',
      durabilityStrategy: 'publish',
      coreOptions: {
        now: () => NOW,
        publish: destination.publish,
      },
    });

    assert.equal(result.result.outcome, 'built-not-durable');
    assert.equal(destination.calls.length, 1);
    const [{ request, manifest, receipt }] = destination.calls;
    assert.equal(request.schemaVersion, 'explainer-kit.publish-request/v2');
    assert.equal(request.s3Uri, publishCase.expectedS3Uri);
    assert.equal(request.publicBaseUrl, publishCase.expectedPublicBaseUrl);
    assert.equal(request.publicAccess, publishCase.publicAccess);
    assert.deepEqual(Object.keys(request).sort(), [
      'awsRegion',
      'manifestPath',
      'provider',
      'publicAccess',
      'publicBaseUrl',
      's3Uri',
      'schemaVersion',
      'siteRoot',
    ]);
    assert.equal(
      /credential|password|secret|token|awsProfile|repoRoot|activeProject/i.test(
        JSON.stringify(request),
      ),
      false,
    );

    const builtArtifacts = manifest.artifacts.filter(
      ({ status }) => status === 'built',
    );
    assert.equal(receipt.artifacts.length, builtArtifacts.length + 1);
    assert.equal(destination.objects.size, receipt.artifacts.length);
    for (const artifact of builtArtifacts) {
      assert.match(artifact.renderedPath, /\/index\.html$/);
      const published = receipt.artifacts.find(
        ({ source }) =>
          source.kind === 'manifest' && source.artifactId === artifact.id,
      );
      assert.ok(published);
      assert.equal(published.relativePath, artifact.renderedPath);
      assert.equal(published.hash, artifact.hash);
      assert.match(published.publicUrl, /\/index\.html$/);
      const bytes = destination.objects.get(published.s3Uri);
      assert.ok(bytes);
      assert.equal(sha256(bytes), artifact.hash);
      assert.deepEqual(
        bytes,
        await readFile(join(result.result.runRoot, artifact.renderedPath)),
      );
    }

    const catalogArtifact = receipt.artifacts.find(
      ({ source }) => source.kind === 'auxiliary' && source.name === 'catalog',
    );
    assert.ok(catalogArtifact);
    assert.equal(
      catalogArtifact.relativePath,
      `site/initiatives/${manifest.slug}/catalog.json`,
    );
    const catalogBytes = destination.objects.get(catalogArtifact.s3Uri);
    assert.equal(sha256(catalogBytes), catalogArtifact.hash);
    const catalog = JSON.parse(catalogBytes);
    assert.equal(
      validateInitiativeCatalog(
        catalog,
        manifest,
        publishCase.expectedPublicBaseUrl,
        { publicAccess: publishCase.publicAccess },
      ).valid,
      true,
    );
    // Policy, never outcome: the catalog is uploaded before any public fetch.
    assert.equal(
      catalog.publicVerification,
      publishCase.publicAccess === 'protected'
        ? 'skipped-by-policy'
        : 'required',
    );
    assert.deepEqual(
      catalog.artifacts.map(({ id, hash }) => ({ id, hash })),
      builtArtifacts.map(({ id, hash }) => ({ id, hash })),
    );

    const publicFacts = [
      receipt.sentinel.publicVerification,
      ...receipt.artifacts.map(({ publicVerification }) => publicVerification),
    ];
    if (publishCase.publicAccess === 'public') {
      assert.equal(destination.anonymousFetches, receipt.artifacts.length + 1);
      assert.equal(
        publicFacts.every(({ status }) => status === 'verified'),
        true,
      );
    } else {
      assert.equal(destination.anonymousFetches, 0);
      assert.equal(
        publicFacts.every(({ status }) => status === 'skipped-protected'),
        true,
      );
    }
    assert.deepEqual(result.publication, result.result.publication);
    assert.equal(
      result.publication.artifacts.every(
        ({ publicUrl }) =>
          publicUrl.startsWith(`${publishCase.expectedPublicBaseUrl}/`) &&
          !publicUrl.includes('/site/'),
      ),
      true,
    );
    assert.equal(JSON.stringify(receipt).includes(fixture.root), false);
  }
});

function fakeDestination(expectedPublicAccess) {
  const objects = new Map();
  const calls = [];
  let anonymousFetches = 0;

  return {
    objects,
    calls,
    get anonymousFetches() {
      return anonymousFetches;
    },
    publish: async ({ request, runRoot, manifestPath }) => {
      assert.equal(request.publicAccess, expectedPublicAccess);
      const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
      const artifacts = [];
      for (const artifact of manifest.artifacts) {
        const bytes = await readFile(join(runRoot, artifact.renderedPath));
        assert.equal(sha256(bytes), artifact.hash);
        artifacts.push(
          publishObject({
            request,
            source: { kind: 'manifest', artifactId: artifact.id },
            relativePath: artifact.renderedPath,
            hash: artifact.hash,
            contentType: artifact.mediaType,
            bytes,
          }),
        );
      }

      // A publisher must build the catalog under the same access policy it
      // declares in its receipt; run.mjs rebuilds and hash-checks it that way.
      const catalog = catalogFromManifest(manifest, request.publicBaseUrl, {
        publicAccess: request.publicAccess,
      });
      const catalogBytes = Buffer.from(serializeInitiativeCatalog(catalog));
      const catalogPath = initiativeCatalogPath(manifest.slug);
      artifacts.push(
        publishObject({
          request,
          source: { kind: 'auxiliary', name: 'catalog' },
          relativePath: catalogPath,
          hash: sha256(catalogBytes),
          contentType: 'application/json',
          bytes: catalogBytes,
        }),
      );

      const sentinelHash = sha256(
        Buffer.from(`explainer-kit sentinel ${manifest.runId}\n`),
      );
      const receipt = {
        schemaVersion: 'explainer-kit.publish-receipt/v2',
        provider: 's3-static',
        publishedAt: NOW,
        publicAccess: request.publicAccess,
        roots: {
          s3Uri: request.s3Uri,
          publicBaseUrl: request.publicBaseUrl,
        },
        sentinel: {
          relativePath: `.explainer-kit-sentinel/${manifest.runId}-0123456789abcdeffedcba9876543210.txt`,
          objectVerification: verifiedObject(sentinelHash),
          publicVerification: publicVerification(sentinelHash),
          deleted: true,
        },
        artifacts,
      };
      calls.push({ request: structuredClone(request), manifest, receipt });
      return receipt;
    },
  };

  function publishObject({
    request,
    source,
    relativePath,
    hash,
    contentType,
    bytes,
  }) {
    const publishedPath = relativePath.slice('site/'.length);
    const s3Uri = `${request.s3Uri}/${publishedPath}`;
    objects.set(s3Uri, Buffer.from(bytes));
    return {
      source,
      relativePath,
      hash,
      s3Uri,
      publicUrl: `${request.publicBaseUrl}/${encodePath(publishedPath)}`,
      contentType,
      objectVerification: verifiedObject(hash),
      publicVerification: publicVerification(hash),
    };
  }

  function publicVerification(hash) {
    if (expectedPublicAccess === 'protected') {
      return { status: 'skipped-protected' };
    }
    anonymousFetches += 1;
    return { status: 'verified', httpStatus: 200, hash };
  }
}

async function createRepositoryFixture() {
  const root = await mkdtemp(join(tmpdir(), 'publish-boundary-'));
  tempDirs.push(root);
  const repoRoot = join(root, 'repo');
  const projectRoot = join(repoRoot, '.oat', 'projects', 'shared', 'demo');
  const factBasePath = join(root, 'approved-facts.json');
  await mkdir(projectRoot, { recursive: true });
  for (const [name, content] of [
    ['plan.md', '# Plan\n\nPublish exact explainer bytes.'],
    ['design.md', '# Design\n\nKeep destination policy in the adapter.'],
    ['spec.md', '# Spec\n\nDo not persist credentials.'],
  ]) {
    await writeFile(join(projectRoot, name), `${content}\n`);
  }
  await writeFile(
    factBasePath,
    `${JSON.stringify(suppliedFactBase(), null, 2)}\n`,
  );
  await execFile('git', ['init', '--quiet'], { cwd: repoRoot });
  await execFile(
    'git',
    ['remote', 'add', 'origin', 'git@github.com:acme/publish-boundary.git'],
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
  return { root, repoRoot, factBasePath };
}

function publishConfig({
  configuredS3Uri,
  configuredPublicBaseUrl,
  publicAccess,
}) {
  const values = {
    'explainers.publish.provider': 's3-static',
    'explainers.publish.s3Uri': configuredS3Uri,
    'explainers.publish.publicBaseUrl': configuredPublicBaseUrl,
    'explainers.publish.awsRegion': 'us-east-1',
    'explainers.publish.publicAccess': publicAccess,
  };
  return (key) =>
    Promise.resolve({
      status: 'ok',
      key,
      value: values[key] ?? (key.startsWith('workflow.') ? 'ask' : null),
      source: key in values ? 'shared' : 'default',
    });
}

function suppliedFactBase() {
  return {
    schemaVersion: 'explainer-kit.fact-base/v1',
    generatedAt: NOW,
    mode: 'supplied',
    freshnessPolicy: 'live-wins',
    sources: [
      {
        id: 'acceptance-source',
        kind: 'file',
        locator: 'approved-source.md',
        hash: SOURCE_HASH,
        observedAt: NOW,
      },
    ],
    claims: [
      {
        id: 'publish-integrity',
        text: 'Publishing preserves exact approved artifact bytes.',
        status: 'confirmed',
        citations: [
          {
            sourceId: 'acceptance-source',
            locator: 'approved-source.md:1',
          },
        ],
      },
    ],
    unresolvedClaims: [],
    overrides: [],
  };
}

async function providerNeutralAuthor(request) {
  return {
    schemaVersion: 'explainer-kit.author-result/v2',
    artifactId: request.artifactId,
    content: {
      markdown: `# Publication Integrity\n\n${request.floor.requiredNarrative
        .map(
          (id) =>
            `## ${id}\n\nThe acceptance author explains ${id} from the approved fact base.`,
        )
        .join('\n\n')}\n`,
    },
    provenance: {
      authorId: 'publish-boundary-acceptance-author',
      generatedAt: NOW,
      method: 'structured-evidence-synthesis',
    },
  };
}

function verifiedObject(hash) {
  return { status: 'verified', method: 'service-checksum', hash };
}

function sha256(bytes) {
  return `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
}

function encodePath(path) {
  return path
    .split('/')
    .map((part) => encodeURIComponent(part))
    .join('/');
}
