import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { afterEach, test } from 'node:test';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const VALIDATOR = resolve(
  import.meta.dirname,
  'validate-explainer-acceptance.mjs',
);
const HASH = (character) => `sha256:${character.repeat(64)}`;
const PACKAGE_NAMES = [
  '@open-agent-toolkit/cli',
  '@open-agent-toolkit/control-plane',
  '@open-agent-toolkit/docs-config',
  '@open-agent-toolkit/docs-theme',
  '@open-agent-toolkit/docs-transforms',
];
const tempRoots = [];

afterEach(async () => {
  await Promise.all(
    tempRoots
      .splice(0)
      .map((root) => rm(root, { recursive: true, force: true })),
  );
});

test('passes wrapper, publish, and all gates for one unchanged packaged RC', async () => {
  for (const gate of ['wrapper', 'publish', 'all']) {
    const fixture = await createFixture();
    const result = await runSuccess(fixture.root, gate);

    assert.equal(
      result.schemaVersion,
      'explainer-kit.acceptance-validation/v1',
    );
    assert.equal(result.status, 'passed');
    assert.equal(result.gate, gate);
    assert.equal(result.rcId, fixture.rc.rcId);
    assert.deepEqual(
      Object.keys(result.gates).sort(),
      gate === 'all' ? ['publish', 'wrapper'] : [gate],
    );
    assert.equal(
      Object.values(result.gates).every(({ status }) => status === 'passed'),
      true,
    );
  }
});

test('requires only the evidence selected by the gate', async () => {
  const wrapper = await createFixture();
  await Promise.all([
    rm(join(wrapper.root, 'live-publish-request.json')),
    rm(join(wrapper.root, 'live-publish-result.json')),
    rm(join(wrapper.root, 'publish-receipt.json')),
  ]);
  assert.equal((await runSuccess(wrapper.root, 'wrapper')).status, 'passed');

  const publish = await createFixture();
  await rm(join(publish.root, 'private-wrapper-result.json'));
  assert.equal((await runSuccess(publish.root, 'publish')).status, 'passed');
});

test('distinguishes missing and malformed evidence', async () => {
  const missing = await createFixture();
  await rm(join(missing.root, 'private-wrapper-result.json'));
  const missingFailure = await runFailure(missing.root, 'wrapper');
  assert.equal(missingFailure.code, 'E_EVIDENCE_MISSING');
  assert.equal(missingFailure.evidence, 'private-wrapper-result.json');

  const malformed = await createFixture();
  await writeFile(join(malformed.root, 'publish-receipt.json'), '{not-json\n');
  const malformedFailure = await runFailure(malformed.root, 'publish');
  assert.equal(malformedFailure.code, 'E_EVIDENCE_MALFORMED');
  assert.equal(malformedFailure.evidence, 'publish-receipt.json');
});

test('distinguishes RC mismatches from failed gate verdicts', async () => {
  const mismatch = await createFixture();
  mismatch.wrapper.rcId = HASH('f');
  await writeJson(
    join(mismatch.root, 'private-wrapper-result.json'),
    mismatch.wrapper,
  );
  const mismatchFailure = await runFailure(mismatch.root, 'wrapper');
  assert.equal(mismatchFailure.code, 'E_RC_MISMATCH');
  assert.equal(mismatchFailure.evidence, 'private-wrapper-result.json');

  const failed = await createFixture();
  failed.wrapper.verdict = 'failed';
  await writeJson(
    join(failed.root, 'private-wrapper-result.json'),
    failed.wrapper,
  );
  const verdictFailure = await runFailure(failed.root, 'wrapper');
  assert.equal(verdictFailure.code, 'E_FAILED_VERDICT');
  assert.equal(verdictFailure.gate, 'wrapper');
});

test('rejects changed candidates even when their recomputed RC identity is self-consistent', async () => {
  const fixture = await createFixture();
  fixture.rc.changedCandidates = ['.agents/skills/explainer-kit/SKILL.md'];
  fixture.rc.rcId = rcId(fixture.rc);
  await writeJson(join(fixture.root, 'rc.json'), fixture.rc);

  const failure = await runFailure(fixture.root, 'all');

  assert.equal(failure.code, 'E_CHANGED_CANDIDATES');
  assert.deepEqual(failure.changedCandidates, [
    '.agents/skills/explainer-kit/SKILL.md',
  ]);
});

test('rejects a mutated frozen candidate and an incomplete immutable wrapper snapshot', async () => {
  const mutated = await createFixture();
  mutated.rc.commit = 'b'.repeat(40);
  await writeJson(join(mutated.root, 'rc.json'), mutated.rc);
  assert.equal(
    (await runFailure(mutated.root, 'wrapper')).code,
    'E_RC_IDENTITY',
  );

  const incomplete = await createFixture();
  delete incomplete.wrapper.capabilities.googleDocsSync;
  await writeJson(
    join(incomplete.root, 'private-wrapper-result.json'),
    incomplete.wrapper,
  );
  const incompleteFailure = await runFailure(incomplete.root, 'wrapper');
  assert.equal(incompleteFailure.code, 'E_EVIDENCE_INCOMPLETE');
  assert.equal(incompleteFailure.evidence, 'private-wrapper-result.json');
});

test('requires successful run-explainer-rc evidence with exact tarball hashes', async () => {
  const wrongEntry = await createFixture();
  wrongEntry.publishExecution.entry = 'scripts/run.mjs';
  await writeJson(
    join(wrongEntry.root, 'live-publish-result.json'),
    wrongEntry.publishExecution,
  );
  const wrongEntryFailure = await runFailure(wrongEntry.root, 'publish');
  assert.equal(wrongEntryFailure.code, 'E_PACKAGED_EXECUTION');

  const wrongHash = await createFixture();
  wrongHash.publishExecution.verifiedTarballs[2].sha256 = HASH('f');
  await writeJson(
    join(wrongHash.root, 'live-publish-result.json'),
    wrongHash.publishExecution,
  );
  const wrongHashFailure = await runFailure(wrongHash.root, 'publish');
  assert.equal(wrongHashFailure.code, 'E_RC_MISMATCH');

  const failedExit = await createFixture();
  failedExit.publishExecution.exit.code = 7;
  await writeJson(
    join(failedExit.root, 'live-publish-result.json'),
    failedExit.publishExecution,
  );
  const failedExitFailure = await runFailure(failedExit.root, 'publish');
  assert.equal(failedExitFailure.code, 'E_FAILED_VERDICT');
  assert.equal(failedExitFailure.gate, 'publish');
});

test('requires complete receipt hashes and run-unique verified sentinel cleanup', async () => {
  for (const mutate of [
    (receipt) => {
      receipt.sentinel.publicVerified = false;
    },
    (receipt) => {
      receipt.sentinel.deleted = false;
    },
    (receipt) => {
      receipt.sentinel.relativePath =
        '.explainer-kit-sentinel/run-123-guessable.txt';
    },
    (receipt) => {
      receipt.artifacts[0].hash = 'not-a-hash';
    },
    (receipt) => {
      receipt.artifacts = [];
    },
  ]) {
    const fixture = await createFixture();
    mutate(fixture.receipt);
    await writeJson(
      join(fixture.root, 'publish-receipt.json'),
      fixture.receipt,
    );
    const failure = await runFailure(fixture.root, 'publish');
    assert.equal(failure.code, 'E_EVIDENCE_INCOMPLETE');
    assert.equal(failure.evidence, 'publish-receipt.json');
  }
});

test('rejects receipt paths that imply undeclared overwrite or delete scope', async () => {
  const undeclared = await createFixture();
  undeclared.receipt.artifacts[0].relativePath = 'site/undeclared.html';
  undeclared.receipt.artifacts[0].s3Uri =
    's3://example-bucket/published/undeclared.html';
  undeclared.receipt.artifacts[0].publicUrl =
    'https://cdn.example.com/published/undeclared.html';
  await writeJson(
    join(undeclared.root, 'publish-receipt.json'),
    undeclared.receipt,
  );
  const undeclaredFailure = await runFailure(undeclared.root, 'publish');
  assert.equal(undeclaredFailure.code, 'E_RECEIPT_MISMATCH');

  const unsafe = await createFixture();
  unsafe.receipt.artifacts[0].relativePath = '../other-run/index.html';
  await writeJson(join(unsafe.root, 'publish-receipt.json'), unsafe.receipt);
  const unsafeFailure = await runFailure(unsafe.root, 'publish');
  assert.equal(unsafeFailure.code, 'E_PUBLISH_SAFETY');
});

test('emits one structured fail-closed result for invalid usage', async () => {
  try {
    await execFileAsync(process.execPath, [
      VALIDATOR,
      '/tmp',
      '--gate',
      'nope',
    ]);
    assert.fail('Expected invalid gate to fail.');
  } catch (error) {
    assert.equal(error.code, 1);
    const lines = error.stderr.trim().split('\n');
    assert.equal(lines.length, 1);
    assert.deepEqual(JSON.parse(lines[0]), {
      code: 'E_USAGE',
      message:
        'Usage: validate-explainer-acceptance.mjs <acceptance-dir> --gate wrapper|publish|all',
    });
  }
});

async function createFixture() {
  const root = await mkdtemp(join(tmpdir(), 'explainer-acceptance-'));
  tempRoots.push(root);
  const packages = PACKAGE_NAMES.map((name, index) => ({
    name,
    version: '1.2.3',
    artifact: `open-agent-toolkit-${name.split('/').at(-1)}-1.2.3.tgz`,
    sha256: HASH(String(index + 1)),
  }));
  const rc = {
    schemaVersion: 'explainer-kit.release-candidate/v1',
    rcId: '',
    commit: 'a'.repeat(40),
    packages,
    skills: [
      {
        name: 'explainer-kit',
        version: '1.0.0',
        package: '@open-agent-toolkit/cli',
        path: 'package/assets/skills/explainer-kit',
        sha256: HASH('a'),
      },
      {
        name: 'oat-explainer-kit',
        version: '1.0.0',
        package: '@open-agent-toolkit/cli',
        path: 'package/assets/skills/oat-explainer-kit',
        sha256: HASH('b'),
      },
    ],
    schemas: [
      {
        id: 'explainer-kit.manifest/v1',
        path: 'schemas/manifest.schema.json',
        sha256: HASH('c'),
      },
    ],
    recipes: [
      {
        id: 'project-explainer',
        version: '1',
        schemaVersion: 'explainer-kit.recipe/v1',
        path: 'recipes/project-explainer.json',
        sha256: HASH('d'),
      },
    ],
    changedCandidates: [],
  };
  rc.rcId = rcId(rc);
  const wrapper = {
    schemaVersion: 'explainer-kit.wrapper-acceptance/v1',
    rcId: rc.rcId,
    candidate: candidateIdentity(rc),
    verdict: 'passed',
    packagedExecution: packagedExecution(rc, 'scripts/run.mjs'),
    command: {
      sanitized: true,
      argv: ['acceptance.mjs', '--rc-manifest', 'rc.json'],
    },
    context: {
      privateRequestExternal: true,
      credentialsPersisted: false,
    },
    hashes: {
      manifest: HASH('e'),
      publishReceipt: HASH('f'),
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
  const publishExecution = packagedExecution(rc, 'scripts/publish.mjs');
  const manifestPath = join(root, 'runs/run-123/manifest.json');
  const publishRequest = {
    schemaVersion: 'explainer-kit.publish-request/v1',
    provider: 's3-static',
    s3Uri: 's3://example-bucket/published',
    publicBaseUrl: 'https://cdn.example.com/published',
    awsRegion: 'us-east-1',
    siteRoot: join(root, 'runs/run-123/site'),
    manifestPath,
  };
  const manifest = {
    schemaVersion: 'explainer-kit.manifest/v1',
    runId: 'run-123',
    artifacts: [
      {
        status: 'built',
        renderedPath: 'site/initiatives/demo/index.html',
        hash: HASH('e'),
      },
      {
        status: 'built',
        renderedPath: 'site/initiatives/demo/catalog.json',
        hash: HASH('f'),
      },
    ],
  };
  const receipt = {
    schemaVersion: 'explainer-kit.publish-receipt/v1',
    provider: 's3-static',
    publishedAt: '2026-07-18T12:00:00.000Z',
    roots: {
      s3Uri: publishRequest.s3Uri,
      publicBaseUrl: publishRequest.publicBaseUrl,
    },
    sentinel: {
      relativePath:
        '.explainer-kit-sentinel/run-123-0123456789abcdeffedcba9876543210.txt',
      uploadVerified: true,
      publicVerified: true,
      deleted: true,
    },
    artifacts: [
      receiptArtifact(publishRequest, 'site/initiatives/demo/index.html', 'e'),
      receiptArtifact(
        publishRequest,
        'site/initiatives/demo/catalog.json',
        'f',
      ),
    ],
  };
  await Promise.all([
    writeJson(join(root, 'rc.json'), rc),
    writeJson(join(root, 'private-wrapper-result.json'), wrapper),
    writeJson(join(root, 'live-publish-request.json'), publishRequest),
    writeJson(join(root, 'live-publish-result.json'), publishExecution),
    writeJson(join(root, 'publish-receipt.json'), receipt),
    writeJson(manifestPath, manifest),
  ]);
  return {
    root,
    rc,
    wrapper,
    publishExecution,
    publishRequest,
    receipt,
  };
}

function packagedExecution(rc, entry) {
  const cliPackage = rc.packages.find(
    ({ name }) => name === '@open-agent-toolkit/cli',
  );
  return {
    schemaVersion: 'explainer-kit.packaged-execution/v1',
    rcId: rc.rcId,
    entry,
    package: { ...cliPackage },
    verifiedTarballs: rc.packages.map(({ name, artifact, sha256 }) => ({
      name,
      artifact,
      sha256,
    })),
    exit: { code: 0, signal: null },
  };
}

function candidateIdentity(rc) {
  return {
    commit: rc.commit,
    packages: rc.packages,
    skills: rc.skills,
    schemas: rc.schemas,
    recipes: rc.recipes,
    changedCandidates: rc.changedCandidates,
  };
}

function rcId(rc) {
  return `sha256:${createHash('sha256')
    .update(JSON.stringify(candidateIdentity(rc)))
    .digest('hex')}`;
}

function receiptArtifact(request, relativePath, hashCharacter) {
  const publishedPath = relativePath.slice('site/'.length);
  return {
    relativePath,
    hash: HASH(hashCharacter),
    s3Uri: `${request.s3Uri}/${publishedPath}`,
    publicUrl: `${request.publicBaseUrl}/${publishedPath}`,
    httpStatus: 200,
    contentType: relativePath.endsWith('.json')
      ? 'application/json'
      : 'text/html; charset=utf-8',
  };
}

async function runSuccess(root, gate) {
  const { stdout, stderr } = await execFileAsync(
    process.execPath,
    [VALIDATOR, root, '--gate', gate],
    { encoding: 'utf8' },
  );
  assert.equal(stderr, '');
  return JSON.parse(stdout);
}

async function runFailure(root, gate) {
  try {
    await runSuccess(root, gate);
    assert.fail('Expected acceptance validation to fail.');
  } catch (error) {
    assert.equal(error.code, 1);
    const lines = error.stderr.trim().split('\n');
    assert.equal(lines.length, 1);
    return JSON.parse(lines[0]);
  }
}

async function writeJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
}
