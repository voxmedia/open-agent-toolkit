import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, mock, test } from 'node:test';

import {
  catalogFromManifest,
  initiativeCatalogPath,
  serializeInitiativeCatalog,
} from '../../../.agents/skills/explainer-kit/scripts/lib/catalog.mjs';
import {
  PERSONAL_PRESETS_EXAMPLE,
  runPrivateWrapper,
} from './fixtures/private-wrapper.mjs';

const REPO_ROOT = resolve(import.meta.dirname, '../../..');
const PERSONAL_PUBLIC_ROOT = 'https://dy4vzrzaexuy5.cloudfront.net';
const NOW = '2026-07-18T12:00:00Z';
const HASH = `sha256:${'a'.repeat(64)}`;
const tempDirs = [];

afterEach(async () => {
  mock.reset();
  await Promise.all(
    tempDirs
      .splice(0)
      .map((path) => rm(path, { recursive: true, force: true })),
  );
});

test('private wrapper resolves personal inputs, runs the actual core, consumes its manifest, and links post-run lanes', async () => {
  const root = await mkdtemp(join(tmpdir(), 'explainer-wrapper-'));
  tempDirs.push(root);
  const factBasePath = join(root, 'fact-base.json');
  await writeFile(
    factBasePath,
    `${JSON.stringify(suppliedFactBase(), null, 2)}\n`,
  );
  const writeStoaNote = mock.fn(async (note) => ({
    kind: 'stoa',
    locator: `${note.vaultRoot}/Explainers/${note.slug}.md`,
    links: note.links,
  }));
  const syncGoogleDoc = mock.fn(async (document) => ({
    kind: 'gdocs',
    locator: `gdoc:${document.account}:${document.slug}`,
    links: document.links,
  }));
  const publishManifest = mock.fn(async (input) =>
    completeReceiptV2(input, 'public'),
  );

  const wrapped = await runPrivateWrapper({
    presetName: 'personal-oat',
    presets: PERSONAL_PRESETS_EXAMPLE,
    invocation: {
      recipe: { id: 'project-explainer', version: '1' },
      slug: 'private-wrapper-smoke',
      outputRoot: join(root, 'output'),
      factBasePath,
    },
    privateLanes: {
      stoa: { vaultRoot: '/Users/operator/vault' },
      gdocs: { account: 'operator@example.com' },
    },
    publishManifest,
    writeStoaNote,
    syncGoogleDoc,
    coreOptions: {
      author: providerNeutralAuthor,
      now: () => NOW,
    },
  });

  assert.equal(wrapped.preResolved.preset.publicBaseUrl, PERSONAL_PUBLIC_ROOT);
  assert.deepEqual(wrapped.request, {
    schemaVersion: 'explainer-kit.run-request/v1',
    recipe: { id: 'project-explainer', version: '1' },
    slug: 'private-wrapper-smoke',
    outputRoot: join(root, 'output'),
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
    publicBaseUrl: PERSONAL_PUBLIC_ROOT,
    durability: { strategy: 'none' },
    privacy: { retainRawArtDirection: false },
    mode: 'unattended',
  });
  assert.equal('presetName' in wrapped.request, false);
  assert.equal('vault' in wrapped.request, false);
  assert.equal('gdocs' in wrapped.request, false);
  assert.equal('lanes' in wrapped.request, false);
  assert.equal('s3Uri' in wrapped.request, false);

  assert.equal(wrapped.result.outcome, 'built-not-durable');
  assert.equal(wrapped.manifest.schemaVersion, 'explainer-kit.manifest/v1');
  assert.equal(wrapped.manifest.runId, wrapped.result.runId);
  assert.equal(
    wrapped.links.every(
      ({ url }) =>
        url.startsWith(`${PERSONAL_PUBLIC_ROOT}/`) &&
        url.endsWith('/index.html') &&
        !url.includes('/site/'),
    ),
    true,
  );
  assert.equal(writeStoaNote.mock.callCount(), 1);
  assert.equal(syncGoogleDoc.mock.callCount(), 1);
  assert.equal(publishManifest.mock.callCount(), 1);
  assert.deepEqual(
    wrapped.authorProvenance.map(
      ({ generatedAt: _generatedAt, ...identity }) => identity,
    ),
    [
      {
        authorId: 'private-wrapper-provider-neutral-author',
        method: 'structured-evidence-synthesis',
        trust: 'self-asserted',
      },
    ],
  );
  // Generation time comes from the core's injected clock, so the author
  // module's backdated claim never reaches the retained record.
  for (const { generatedAt } of wrapped.authorProvenance) {
    assert.equal(generatedAt, NOW);
  }
  assert.equal(
    wrapped.publishReceipt.schemaVersion,
    'explainer-kit.publish-receipt/v2',
  );
  assert.match(
    wrapped.publishReceipt.sentinel.relativePath,
    new RegExp(wrapped.manifest.runId),
  );
  assert.deepEqual(
    wrapped.postRun.map(({ kind }) => kind),
    ['stoa', 'gdocs'],
  );
});

test('private wrapper accepts v1 replay and complete public or protected v2 receipts', async () => {
  for (const receiptKind of ['v1', 'v2-public', 'v2-protected']) {
    const wrapped = await runWrapperWithReceipt({
      receiptKind,
      mutate: (receipt) => receipt,
    });
    assert.equal(
      wrapped.publishReceipt.schemaVersion,
      `explainer-kit.publish-receipt/${receiptKind === 'v1' ? 'v1' : 'v2'}`,
      receiptKind,
    );
  }
});

test('private wrapper rejects ambiguous v2 manifest and catalog coverage', async () => {
  const mutations = [
    [
      'duplicate manifest coverage',
      (receipt) => {
        const duplicate = structuredClone(receipt.artifacts[0]);
        duplicate.contentType = 'application/octet-stream';
        receipt.artifacts.push(duplicate);
      },
    ],
    [
      'missing manifest entry',
      (receipt) => {
        receipt.artifacts.shift();
      },
    ],
    [
      'wrong artifact ID',
      (receipt) => {
        receipt.artifacts[0].source.artifactId = 'foreign';
      },
    ],
    [
      'foreign source',
      (receipt) => {
        receipt.artifacts[0].source = {
          kind: 'auxiliary',
          name: 'foreign',
        };
      },
    ],
    [
      'wrong rendered path',
      (receipt) => {
        receipt.artifacts[0].relativePath = 'site/foreign/index.html';
      },
    ],
    [
      'wrong content hash',
      (receipt) => {
        receipt.artifacts[0].hash = `sha256:${'f'.repeat(64)}`;
      },
    ],
    [
      'wrong verification',
      (receipt) => {
        receipt.artifacts[0].objectVerification.hash = `sha256:${'f'.repeat(64)}`;
      },
    ],
    [
      'missing catalog',
      (receipt) => {
        receipt.artifacts.pop();
      },
    ],
    [
      'misidentified catalog path',
      (receipt) => {
        receipt.artifacts.at(-1).relativePath =
          'site/initiatives/foreign/catalog.json';
      },
    ],
    [
      'wrong catalog hash',
      (receipt) => {
        receipt.artifacts.at(-1).hash = `sha256:${'f'.repeat(64)}`;
      },
    ],
  ];

  for (const [label, mutate] of mutations) {
    await assert.rejects(
      runWrapperWithReceipt({ receiptKind: 'v2-public', mutate }),
      /publish receipt does not match/i,
      label,
    );
  }
});

test('private wrapper rejects unsafe or divergent v2 receipt destinations', async () => {
  const mutations = [
    [
      'credential-bearing roots',
      (receipt) => {
        receipt.roots.s3Uri =
          's3://access-key:secret@example-bucket/explainers';
      },
    ],
    [
      'divergent roots',
      (receipt) => {
        receipt.roots.s3Uri = 's3://example-bucket/internal';
        receipt.roots.publicBaseUrl = 'https://docs.example.com/public';
      },
    ],
    [
      'credential-bearing artifact target',
      (receipt) => {
        receipt.artifacts[0].s3Uri =
          's3://access-key:secret@example-bucket/explainers/index.html';
      },
    ],
  ];

  for (const [label, mutate] of mutations) {
    await assert.rejects(
      runWrapperWithReceipt({ receiptKind: 'v2-protected', mutate }),
      /publish receipt does not match/i,
      label,
    );
  }
});

async function runWrapperWithReceipt({ receiptKind, mutate }) {
  const root = await mkdtemp(join(tmpdir(), 'explainer-wrapper-receipt-'));
  tempDirs.push(root);
  const factBasePath = join(root, 'fact-base.json');
  await writeFile(
    factBasePath,
    `${JSON.stringify(suppliedFactBase(), null, 2)}\n`,
  );
  return runPrivateWrapper({
    presetName: 'personal-oat',
    presets: PERSONAL_PRESETS_EXAMPLE,
    invocation: {
      recipe: { id: 'project-explainer', version: '1' },
      slug: `private-wrapper-${receiptKind}`,
      outputRoot: join(root, 'output'),
      factBasePath,
    },
    publishManifest: async (input) => {
      const receipt =
        receiptKind === 'v1'
          ? completeReceiptV1(input)
          : completeReceiptV2(
              input,
              receiptKind.endsWith('protected') ? 'protected' : 'public',
            );
      mutate(receipt);
      return receipt;
    },
    coreOptions: {
      author: providerNeutralAuthor,
      now: () => NOW,
    },
  });
}

function completeReceiptV1({ publish, publicBaseUrl, manifest }) {
  return {
    schemaVersion: 'explainer-kit.publish-receipt/v1',
    provider: publish.provider,
    publishedAt: NOW,
    roots: { s3Uri: publish.s3Uri, publicBaseUrl },
    sentinel: {
      relativePath: `.explainer-kit-sentinel/${manifest.runId}-0123456789abcdeffedcba9876543210.txt`,
      uploadVerified: true,
      publicVerified: true,
      deleted: true,
    },
    artifacts: manifest.artifacts
      .filter(({ status }) => status === 'built')
      .map(({ renderedPath, hash, mediaType }) => ({
        relativePath: renderedPath,
        hash,
        s3Uri: `${publish.s3Uri}/${renderedPath}`,
        publicUrl: `${publicBaseUrl}/${renderedPath}`,
        httpStatus: 200,
        contentType: mediaType,
      })),
  };
}

function completeReceiptV2({ publish, publicBaseUrl, manifest }, publicAccess) {
  const publicVerification = (hash) =>
    publicAccess === 'public'
      ? verifiedPublic(hash)
      : { status: 'skipped-protected' };
  const artifacts = manifest.artifacts
    .filter(({ status }) => status === 'built')
    .map(({ id, renderedPath, hash, mediaType }) => ({
      source: { kind: 'manifest', artifactId: id },
      relativePath: renderedPath,
      hash,
      s3Uri: `${publish.s3Uri}/${renderedPath.slice('site/'.length)}`,
      publicUrl: `${publicBaseUrl}/${renderedPath.slice('site/'.length)}`,
      contentType: mediaType,
      objectVerification: verifiedObject(hash),
      publicVerification: publicVerification(hash),
    }));
  const catalog = catalogFromManifest(manifest, publicBaseUrl);
  const catalogPath = initiativeCatalogPath(manifest.slug);
  const catalogHash = hashBytes(
    Buffer.from(serializeInitiativeCatalog(catalog)),
  );
  artifacts.push({
    source: { kind: 'auxiliary', name: 'catalog' },
    relativePath: catalogPath,
    hash: catalogHash,
    s3Uri: `${publish.s3Uri}/${catalogPath.slice('site/'.length)}`,
    publicUrl: `${publicBaseUrl}/${catalogPath.slice('site/'.length)}`,
    contentType: 'application/json',
    objectVerification: verifiedObject(catalogHash),
    publicVerification: publicVerification(catalogHash),
  });
  return {
    schemaVersion: 'explainer-kit.publish-receipt/v2',
    provider: publish.provider,
    publishedAt: NOW,
    publicAccess,
    roots: { s3Uri: publish.s3Uri, publicBaseUrl },
    sentinel: {
      relativePath: `.explainer-kit-sentinel/${manifest.runId}-0123456789abcdeffedcba9876543210.txt`,
      objectVerification: verifiedObject(HASH),
      publicVerification: publicVerification(HASH),
      deleted: true,
    },
    artifacts,
  };
}

function hashBytes(bytes) {
  return `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
}

function verifiedObject(hash) {
  return { status: 'verified', method: 'service-checksum', hash };
}

function verifiedPublic(hash) {
  return { status: 'verified', httpStatus: 200, hash };
}

test('skill documents freeze the pre/core/post seam and migration controls', async () => {
  const [
    extension,
    migration,
    coreSkill,
    adapterSkill,
    personalDraft,
    coreTree,
  ] = await Promise.all([
    read('.agents/skills/explainer-kit/references/extension-contract.md'),
    read('.agents/skills/oat-explainer-kit/references/migration.md'),
    read('.agents/skills/explainer-kit/SKILL.md'),
    read('.agents/skills/oat-explainer-kit/SKILL.md'),
    read('tools/smoke/explainer-kit/fixtures/presets.example.json'),
    readCorePublicTree(),
  ]);

  assert.match(
    extension,
    /pre-resolution[\s\S]*ExplainerRunRequestV1[\s\S]*core run[\s\S]*manifest consumption[\s\S]*post-run linking/i,
  );
  assert.match(extension, /no (?:v1 )?plugin registry/i);
  assert.match(extension, /no mid-pipeline callback/i);
  assert.doesNotMatch(extension, /dy4vzrzaexuy5\.cloudfront\.net/);
  assert.match(coreSkill, /references\/extension-contract\.md/);

  assert.match(migration, /release candidate|RC/i);
  assert.match(migration, /rollback/i);
  assert.match(migration, /operator-owned/i);
  assert.match(migration, /presets\.example\.json/);
  assert.match(migration, /Stoa configuration/i);
  assert.match(migration, /https:\/\/dy4vzrzaexuy5\.cloudfront\.net/);
  assert.match(adapterSkill, /references\/migration\.md/);
  assert.match(personalDraft, /https:\/\/dy4vzrzaexuy5\.cloudfront\.net/);

  assert.match(coreSkill, /^version: 2\.1\.0$/m);
  assert.match(adapterSkill, /^version: 1\.0\.6$/m);
  assert.doesNotMatch(coreTree, /dy4vzrzaexuy5\.cloudfront\.net/);
});

async function read(relativePath) {
  return readFile(join(REPO_ROOT, relativePath), 'utf8');
}

async function readCorePublicTree() {
  const paths = [
    '.agents/skills/explainer-kit/SKILL.md',
    '.agents/skills/explainer-kit/references/extension-contract.md',
  ];
  return Promise.all(paths.map(read)).then((parts) => parts.join('\n'));
}

function suppliedFactBase() {
  return {
    schemaVersion: 'explainer-kit.fact-base/v1',
    generatedAt: NOW,
    mode: 'supplied',
    freshnessPolicy: 'live-wins',
    sources: [
      {
        id: 'private-wrapper',
        kind: 'file',
        locator: 'approved-wrapper-input.md',
        hash: HASH,
        observedAt: NOW,
      },
    ],
    claims: [
      {
        id: 'extension-seam',
        text: 'The wrapper owns private pre-resolution and post-run lanes.',
        status: 'confirmed',
        citations: [
          {
            sourceId: 'private-wrapper',
            locator: 'approved-wrapper-input.md:1',
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
      markdown: `# Private Wrapper Compatibility\n\n${request.floor.requiredNarrative
        .map(
          (id) =>
            `## ${id}\n\nThe private wrapper author synthesized ${id} from approved evidence before the wrapper consumed the versioned manifest.`,
        )
        .join('\n\n')}\n`,
    },
    provenance: {
      authorId: 'private-wrapper-provider-neutral-author',
      generatedAt: '2019-01-01T00:00:00.000Z',
      method: 'structured-evidence-synthesis',
    },
  };
}
