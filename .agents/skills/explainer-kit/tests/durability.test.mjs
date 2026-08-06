import assert from 'node:assert/strict';
import { execFile as execFileCallback } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { afterEach, test } from 'node:test';
import { promisify } from 'node:util';

import {
  catalogFromManifest,
  initiativeCatalogPath,
  serializeInitiativeCatalog,
} from '../scripts/lib/catalog.mjs';
import { canonicalHash } from '../scripts/lib/contracts.mjs';
import {
  recordDurability,
  verifyRebuildability,
} from '../scripts/lib/durability.mjs';
import { runRecordDurabilityCli } from '../scripts/record-durability.mjs';

const execFile = promisify(execFileCallback);
const NOW = '2026-07-17T20:00:00.000Z';
const tempDirs = [];

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
  );
});

test('treats artifacts as non-rebuildable unless deterministic replay is proven', async () => {
  const fixture = await createRun();
  assert.equal(fixture.manifest.artifacts[0].rebuildable, false);

  const unsupported = structuredClone(fixture.manifest.artifacts[0]);
  unsupported.rebuildable = true;
  assert.equal(
    (await verifyRebuildability(unsupported, fixture.runRoot)).verified,
    false,
  );

  unsupported.rebuild = {
    argv: [
      process.execPath,
      '-e',
      "require('node:fs').writeFileSync('site/index.html', 'stable output')",
    ],
    cwd: '.',
    inputHashes: {
      'source/input.txt': await fileHash(
        join(fixture.runRoot, 'source/input.txt'),
      ),
    },
  };
  assert.deepEqual(await verifyRebuildability(unsupported, fixture.runRoot), {
    verified: true,
    reason: null,
  });
});

test('rejects replay when an input hash or reproduced artifact hash changes', async () => {
  const fixture = await createRun();
  const artifact = {
    ...fixture.manifest.artifacts[0],
    rebuildable: true,
    rebuild: {
      argv: [
        process.execPath,
        '-e',
        "require('node:fs').writeFileSync('site/index.html', 'changed output')",
      ],
      cwd: '.',
      inputHashes: {
        'source/input.txt': `sha256:${'0'.repeat(64)}`,
      },
    },
  };

  assert.match(
    (await verifyRebuildability(artifact, fixture.runRoot)).reason,
    /input hash/i,
  );

  artifact.rebuild.inputHashes['source/input.txt'] = await fileHash(
    join(fixture.runRoot, 'source/input.txt'),
  );
  assert.match(
    (await verifyRebuildability(artifact, fixture.runRoot)).reason,
    /replay hash/i,
  );
});

test('verifies commit blobs at manifest hashes without creating a commit', async () => {
  const fixture = await createCommittedRun();
  const before = await commitCount(fixture.repoRoot);

  const result = await recordDurability(
    commitRequest(fixture, fixture.artifactCommit),
    { now: () => NOW },
  );

  assert.equal(result.durable, true);
  assert.equal(await commitCount(fixture.repoRoot), before);
  const { manifest, buildRecord } = await readRecords(fixture.runRoot);
  assert.equal(manifest.outcome, 'built-durable');
  assert.equal(buildRecord.outcome, 'built-durable');
  assert.equal(manifest.buildRecord.hash, canonicalHash(buildRecord));
  assert.deepEqual(manifest.artifacts[0].durableEvidence, [
    {
      kind: 'commit',
      ref: fixture.artifactCommit,
      paths: fixture.immutableRepoPaths,
      attestedAt: NOW,
    },
  ]);
});

test('rejects commit evidence that omits or mismatches any immutable package file', async () => {
  for (const omitted of [
    'run-request.json',
    'source/content-approval.json',
    'source/author/hub.json',
    'source/fact-base.json',
    'source/fact-base.md',
    'source/content/hub.md',
    'theme.resolved.json',
  ]) {
    const fixture = await createCommittedRun();
    const request = commitRequest(fixture, fixture.artifactCommit);
    request.evidence.paths = request.evidence.paths.filter(
      (path) => !path.endsWith(omitted),
    );
    const result = await recordDurability(request, { now: () => NOW });
    assert.equal(result.durable, false, omitted);
    assert.ok(
      result.errors.some(
        ({ code, message }) =>
          code === 'missing-artifact' && message.includes(omitted),
      ),
      omitted,
    );
  }

  const mismatched = await createCommittedRun();
  mismatched.manifest.immutableHashes['source/content/hub.md'] =
    `sha256:${'f'.repeat(64)}`;
  await writeRecords(
    mismatched.runRoot,
    mismatched.manifest,
    mismatched.buildRecord,
  );
  const result = await recordDurability(
    commitRequest(mismatched, mismatched.artifactCommit),
    { now: () => NOW },
  );
  assert.equal(result.durable, false);
  assert.ok(result.errors.some(({ code }) => code === 'hash-mismatch'));

  const mismatchedProvenance = await createCommittedRun();
  mismatchedProvenance.manifest.immutableHashes['run-request.json'] =
    `sha256:${'e'.repeat(64)}`;
  await writeRecords(
    mismatchedProvenance.runRoot,
    mismatchedProvenance.manifest,
    mismatchedProvenance.buildRecord,
  );
  const provenanceResult = await recordDurability(
    commitRequest(mismatchedProvenance, mismatchedProvenance.artifactCommit),
    { now: () => NOW },
  );
  assert.equal(provenanceResult.durable, false);
  assert.ok(
    provenanceResult.errors.some(
      ({ code, message }) =>
        code === 'hash-mismatch' && message.includes('run-request.json'),
    ),
  );
});

test('preserves built-not-durable when a commit blob hash does not match', async () => {
  const fixture = await createCommittedRun();
  await writeFile(join(fixture.runRoot, 'site/index.html'), 'tampered', 'utf8');
  fixture.manifest.artifacts[0].hash = await fileHash(
    join(fixture.runRoot, 'site/index.html'),
  );
  await writeRecords(fixture.runRoot, fixture.manifest, fixture.buildRecord);

  const result = await recordDurability(
    commitRequest(fixture, fixture.artifactCommit),
    { now: () => NOW },
  );

  assert.equal(result.durable, false);
  assert.match(result.errors[0].message, /hash/i);
  const { manifest, buildRecord } = await readRecords(fixture.runRoot);
  assert.equal(manifest.outcome, 'built-not-durable');
  assert.equal(buildRecord.outcome, 'built-not-durable');
  assert.equal(manifest.buildRecord.hash, canonicalHash(buildRecord));
});

test('excludes mutable records and terminates idempotently after evidence update', async () => {
  const fixture = await createCommittedRun();
  const request = commitRequest(fixture, fixture.artifactCommit);
  request.evidence.paths.push(
    relative(fixture.repoRoot, join(fixture.runRoot, 'manifest.json')),
  );

  const excluded = await recordDurability(request, { now: () => NOW });
  assert.equal(excluded.durable, false);
  assert.match(excluded.errors[0].message, /mutable/i);

  const validRequest = commitRequest(fixture, fixture.artifactCommit);
  await recordDurability(validRequest, { now: () => NOW });
  const afterFirst = await readRecords(fixture.runRoot);
  const second = await recordDurability(validRequest, { now: () => NOW });
  const afterSecond = await readRecords(fixture.runRoot);

  assert.equal(second.durable, true);
  assert.deepEqual(afterSecond, afterFirst);
  assert.equal(afterSecond.manifest.artifacts[0].durableEvidence.length, 1);
  assert.equal(await commitCount(fixture.repoRoot), 1);
});

test('verifies publish receipts before recording publish evidence', async () => {
  const fixture = await createRun();
  const receipt = publishReceipt(fixture.manifest);
  await writeFile(
    join(fixture.runRoot, 'publish-receipt.json'),
    `${JSON.stringify(receipt, null, 2)}\n`,
  );

  const result = await recordDurability(publishRequest(fixture), {
    now: () => NOW,
  });

  assert.equal(result.durable, true);
  const { manifest, buildRecord } = await readRecords(fixture.runRoot);
  assert.deepEqual(manifest.publishReceipt, {
    path: 'publish-receipt.json',
    hash: canonicalHash(receipt),
  });
  assert.equal(manifest.outcome, 'built-durable');
  assert.equal(buildRecord.outcome, 'built-durable');
  assert.equal(manifest.buildRecord.hash, canonicalHash(buildRecord));
  assert.equal(manifest.artifacts[0].durableEvidence[0].kind, 'publish');
});

test('accepts complete public and protected connector-shaped v2 receipts', async () => {
  for (const publicAccess of ['public', 'protected']) {
    const fixture = await createRun();
    const receipt = publishReceiptV2(fixture.manifest, publicAccess);
    await writeFile(
      join(fixture.runRoot, 'publish-receipt.json'),
      `${JSON.stringify(receipt, null, 2)}\n`,
    );

    const result = await recordDurability(publishRequest(fixture), {
      now: () => NOW,
    });

    assert.equal(result.durable, true, publicAccess);
    const { manifest, buildRecord } = await readRecords(fixture.runRoot);
    assert.equal(manifest.outcome, 'built-durable', publicAccess);
    assert.equal(buildRecord.outcome, 'built-durable', publicAccess);
    assert.deepEqual(manifest.publishReceipt, {
      path: 'publish-receipt.json',
      hash: canonicalHash(receipt),
    });
  }
});

test('rejects contradictory generated-catalog evidence in v2 receipts', async () => {
  const mutations = [
    [
      'path',
      (receipt) => {
        receipt.artifacts.at(-1).relativePath =
          'site/initiatives/foreign/catalog.json';
      },
    ],
    [
      'source',
      (receipt) => {
        receipt.artifacts.at(-1).source = {
          kind: 'manifest',
          artifactId: 'hub',
        };
      },
    ],
    [
      'serialized bytes hash',
      (receipt, manifest) => {
        const catalog = catalogFromManifest(
          manifest,
          receipt.roots.publicBaseUrl,
        );
        receipt.artifacts.at(-1).hash = bufferHash(
          Buffer.from(JSON.stringify(catalog)),
        );
      },
    ],
    [
      'verification',
      (receipt) => {
        receipt.artifacts.at(-1).objectVerification.hash = `sha256:${'f'.repeat(
          64,
        )}`;
      },
    ],
  ];

  for (const [label, mutate] of mutations) {
    const fixture = await createRun();
    const receipt = publishReceiptV2(fixture.manifest, 'public');
    mutate(receipt, fixture.manifest);
    await writeFile(
      join(fixture.runRoot, 'publish-receipt.json'),
      `${JSON.stringify(receipt, null, 2)}\n`,
    );

    const result = await recordDurability(publishRequest(fixture), {
      now: () => NOW,
    });
    assert.equal(result.durable, false, label);
  }
});

test('preserves built-not-durable when publish verification is incomplete', async () => {
  const fixture = await createRun();
  const receipt = publishReceipt(fixture.manifest);
  receipt.sentinel.publicVerified = false;
  await writeFile(
    join(fixture.runRoot, 'publish-receipt.json'),
    `${JSON.stringify(receipt, null, 2)}\n`,
  );

  const result = await recordDurability(publishRequest(fixture), {
    now: () => NOW,
  });

  assert.equal(result.durable, false);
  const { manifest, buildRecord } = await readRecords(fixture.runRoot);
  assert.equal(manifest.outcome, 'built-not-durable');
  assert.equal(buildRecord.outcome, 'built-not-durable');
  assert.equal('publishReceipt' in manifest, false);
});

test('rejects durability evidence while visual review is still required', async () => {
  const fixture = await createRun();
  fixture.manifest.outcome = 'built-needs-review';
  fixture.buildRecord.outcome = 'built-needs-review';
  fixture.buildRecord.stages[5] = {
    ...fixture.buildRecord.stages[5],
    status: 'warned',
    warnings: ['visual-review-required:critic-failed'],
  };
  await writeRecords(fixture.runRoot, fixture.manifest, fixture.buildRecord);

  await assert.rejects(
    recordDurability({
      schemaVersion: 'explainer-kit.durability-evidence/v1',
      manifestPath: join(fixture.runRoot, 'manifest.json'),
      evidence: {
        kind: 'commit',
        repoRoot: fixture.runRoot,
        commit: 'a'.repeat(40),
        paths: ['site/index.html'],
      },
    }),
    /built-needs-review.*visual review.*before durability/i,
  );
  const records = await readRecords(fixture.runRoot);
  assert.equal(records.manifest.outcome, 'built-needs-review');
  assert.equal(records.buildRecord.outcome, 'built-needs-review');
});

test('appends evidence and supersedes prior relocated commit evidence', async () => {
  const fixture = await createCommittedRun();
  fixture.manifest.artifacts[0].durableEvidence = [
    {
      kind: 'commit',
      ref: '1111111',
      paths: ['old/export/site/index.html'],
      attestedAt: '2026-07-16T20:00:00.000Z',
    },
  ];
  await writeRecords(fixture.runRoot, fixture.manifest, fixture.buildRecord);

  await recordDurability(commitRequest(fixture, fixture.artifactCommit), {
    now: () => NOW,
  });
  const { manifest } = await readRecords(fixture.runRoot);

  assert.equal(manifest.artifacts[0].durableEvidence.length, 2);
  assert.deepEqual(manifest.artifacts[0].durableEvidence[1].supersedes, {
    ref: '1111111',
    paths: ['old/export/site/index.html'],
  });
});

test('requires manifest, build record, and returned outcome to agree', async () => {
  const fixture = await createCommittedRun();
  const result = await recordDurability(
    commitRequest(fixture, fixture.artifactCommit),
    { now: () => NOW },
  );
  const { manifest, buildRecord } = await readRecords(fixture.runRoot);

  assert.equal(result.outcome, 'built-durable');
  assert.equal(result.outcome, manifest.outcome);
  assert.equal(result.outcome, buildRecord.outcome);
  assert.equal(manifest.buildRecord.hash, canonicalHash(buildRecord));
});

test('CLI records a request and reports verification failures without throwing', async () => {
  const fixture = await createCommittedRun();
  const requestPath = join(fixture.runRoot, 'durability-request.json');
  const request = commitRequest(fixture, '0000000');
  await writeFile(requestPath, `${JSON.stringify(request, null, 2)}\n`);
  const output = [];

  const exitCode = await runRecordDurabilityCli([requestPath], {
    log: (line) => output.push(line),
  });

  assert.equal(exitCode, 1);
  assert.equal(JSON.parse(output.join('\n')).outcome, 'built-not-durable');
});

async function createRun() {
  const runRoot = await mkdtemp(join(tmpdir(), 'explainer-durability-'));
  tempDirs.push(runRoot);
  await mkdir(join(runRoot, 'site'), { recursive: true });
  await mkdir(join(runRoot, 'source/content'), { recursive: true });
  await mkdir(join(runRoot, 'source/author'), { recursive: true });
  await writeFile(join(runRoot, 'run-request.json'), '{"slug":"demo"}\n');
  await writeFile(join(runRoot, 'site/index.html'), 'stable output', 'utf8');
  await writeFile(join(runRoot, 'source/input.txt'), 'stable input', 'utf8');
  await writeFile(join(runRoot, 'source/fact-base.json'), '{"facts":[]}\n');
  await writeFile(join(runRoot, 'source/fact-base.md'), '# Fact base\n');
  await writeFile(
    join(runRoot, 'source/content-approval.json'),
    '{"status":"approved"}\n',
  );
  await writeFile(
    join(runRoot, 'source/author/hub.json'),
    '{"author":"fixture"}\n',
  );
  await writeFile(join(runRoot, 'source/content/hub.md'), '# Hub\n');
  await writeFile(
    join(runRoot, 'theme.resolved.json'),
    '{"theme":"neutral"}\n',
  );

  const buildRecord = {
    schemaVersion: 'explainer-kit.build-record/v1',
    runId: 'run-1',
    renderStrategy: 'default-only',
    startedAt: NOW,
    stages: [
      ...['validate', 'fact-base', 'content', 'theme', 'render', 'qa'].map(
        (id) => ({ id, status: 'passed', outputPaths: [], warnings: [] }),
      ),
      { id: 'durability', status: 'pending', outputPaths: [], warnings: [] },
      { id: 'publish', status: 'skipped', outputPaths: [], warnings: [] },
    ],
    outcome: 'built-not-durable',
  };
  const manifest = {
    schemaVersion: 'explainer-kit.manifest/v1',
    runId: 'run-1',
    slug: 'demo',
    recipe: { id: 'project-explainer', version: '1' },
    createdAt: NOW,
    source: {
      factBasePath: 'source/fact-base.json',
      factBaseHash: `sha256:${'a'.repeat(64)}`,
      inputHashes: {
        'source/input.txt': await fileHash(join(runRoot, 'source/input.txt')),
      },
      authorResultPaths: ['source/author/hub.json'],
    },
    theme: {
      path: 'theme.resolved.json',
      hash: `sha256:${'b'.repeat(64)}`,
      derived: false,
    },
    artifacts: [
      {
        id: 'hub',
        type: 'hub',
        contentPath: 'source/content/hub.md',
        renderedPath: 'site/index.html',
        mediaType: 'text/html',
        status: 'built',
        hash: await fileHash(join(runRoot, 'site/index.html')),
        rebuildable: false,
      },
    ],
    immutableHashes: await hashesFor(runRoot, [
      'run-request.json',
      'source/content-approval.json',
      'source/author/hub.json',
      'source/fact-base.json',
      'source/fact-base.md',
      'source/content/hub.md',
      'theme.resolved.json',
      'site/index.html',
    ]),
    outcome: 'built-not-durable',
    buildRecord: {
      path: 'build-record.json',
      hash: canonicalHash(buildRecord),
    },
    warnings: [],
  };
  await writeRecords(runRoot, manifest, buildRecord);
  return { runRoot, manifest, buildRecord };
}

async function createCommittedRun() {
  const repoRoot = await mkdtemp(join(tmpdir(), 'explainer-durability-repo-'));
  tempDirs.push(repoRoot);
  await execFile('git', ['init', '-q'], { cwd: repoRoot });
  await execFile('git', ['config', 'user.email', 'test@example.com'], {
    cwd: repoRoot,
  });
  await execFile('git', ['config', 'user.name', 'Test'], { cwd: repoRoot });

  const fixture = await createRun();
  const runRoot = join(repoRoot, 'runs/demo');
  await mkdir(join(repoRoot, 'runs'), { recursive: true });
  await execFile('cp', ['-R', fixture.runRoot, runRoot]);
  const records = await readRecords(runRoot);
  const immutableRepoPaths = Object.keys(records.manifest.immutableHashes).map(
    (path) => `runs/demo/${path}`,
  );
  await execFile('git', ['add', ...immutableRepoPaths], { cwd: repoRoot });
  await execFile('git', ['commit', '-q', '-m', 'artifact'], { cwd: repoRoot });
  const { stdout } = await execFile('git', ['rev-parse', 'HEAD'], {
    cwd: repoRoot,
  });
  return {
    ...records,
    repoRoot,
    runRoot,
    immutableRepoPaths,
    artifactCommit: stdout.trim(),
  };
}

function commitRequest(fixture, commit) {
  return {
    schemaVersion: 'explainer-kit.durability-evidence/v1',
    manifestPath: join(fixture.runRoot, 'manifest.json'),
    evidence: {
      kind: 'commit',
      repoRoot: fixture.repoRoot,
      commit,
      paths: [...fixture.immutableRepoPaths],
    },
  };
}

function publishRequest(fixture) {
  return {
    schemaVersion: 'explainer-kit.durability-evidence/v1',
    manifestPath: join(fixture.runRoot, 'manifest.json'),
    evidence: {
      kind: 'publish',
      receiptPath: join(fixture.runRoot, 'publish-receipt.json'),
    },
  };
}

function publishReceipt(manifest) {
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
    artifacts: manifest.artifacts.map((artifact) => ({
      relativePath: artifact.renderedPath,
      hash: artifact.hash,
      s3Uri: `s3://example/explainers/${artifact.renderedPath}`,
      publicUrl: `https://example.com/explainers/${artifact.renderedPath}`,
      httpStatus: 200,
      contentType: artifact.mediaType,
    })),
  };
}

function publishReceiptV2(manifest, publicAccess) {
  const roots = {
    s3Uri: 's3://example/explainers',
    publicBaseUrl: 'https://example.com/explainers',
  };
  const verificationFor = (hash) => ({
    objectVerification: {
      status: 'verified',
      method: 'service-checksum',
      hash,
    },
    publicVerification:
      publicAccess === 'public'
        ? { status: 'verified', httpStatus: 200, hash }
        : { status: 'skipped-protected' },
  });
  const artifacts = manifest.artifacts.map((artifact) => ({
    source: { kind: 'manifest', artifactId: artifact.id },
    relativePath: artifact.renderedPath,
    hash: artifact.hash,
    s3Uri: `${roots.s3Uri}/${artifact.renderedPath.slice('site/'.length)}`,
    publicUrl: `${roots.publicBaseUrl}/${artifact.renderedPath.slice(
      'site/'.length,
    )}`,
    contentType: artifact.mediaType,
    ...verificationFor(artifact.hash),
  }));
  const catalog = catalogFromManifest(manifest, roots.publicBaseUrl);
  const catalogPath = initiativeCatalogPath(manifest.slug);
  const catalogHash = bufferHash(
    Buffer.from(serializeInitiativeCatalog(catalog)),
  );
  artifacts.push({
    source: { kind: 'auxiliary', name: 'catalog' },
    relativePath: catalogPath,
    hash: catalogHash,
    s3Uri: `${roots.s3Uri}/${catalogPath.slice('site/'.length)}`,
    publicUrl: `${roots.publicBaseUrl}/${catalogPath.slice('site/'.length)}`,
    contentType: 'application/json',
    ...verificationFor(catalogHash),
  });
  const sentinelHash = `sha256:${'c'.repeat(64)}`;

  return {
    schemaVersion: 'explainer-kit.publish-receipt/v2',
    provider: 's3-static',
    publishedAt: NOW,
    publicAccess,
    roots,
    sentinel: {
      relativePath: '.sentinel',
      ...verificationFor(sentinelHash),
      deleted: true,
    },
    artifacts,
  };
}

async function readRecords(runRoot) {
  return {
    manifest: JSON.parse(
      await readFile(join(runRoot, 'manifest.json'), 'utf8'),
    ),
    buildRecord: JSON.parse(
      await readFile(join(runRoot, 'build-record.json'), 'utf8'),
    ),
  };
}

async function writeRecords(runRoot, manifest, buildRecord) {
  manifest.buildRecord.hash = canonicalHash(buildRecord);
  await writeFile(
    join(runRoot, 'build-record.json'),
    `${JSON.stringify(buildRecord, null, 2)}\n`,
  );
  await writeFile(
    join(runRoot, 'manifest.json'),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
}

async function fileHash(path) {
  return bufferHash(await readFile(path));
}

function bufferHash(bytes) {
  return `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
}

async function hashesFor(runRoot, paths) {
  return Object.fromEntries(
    await Promise.all(
      paths.map(async (path) => [path, await fileHash(join(runRoot, path))]),
    ),
  );
}

async function commitCount(repoRoot) {
  const { stdout } = await execFile('git', ['rev-list', '--count', 'HEAD'], {
    cwd: repoRoot,
  });
  return Number(stdout.trim());
}
