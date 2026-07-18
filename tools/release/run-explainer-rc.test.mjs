import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { afterEach, test } from 'node:test';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const RUNNER = resolve(import.meta.dirname, 'run-explainer-rc.mjs');
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

test('verifies every tarball, runs an allowlisted packaged entry, records exit evidence, and cleans up', async () => {
  const fixture = await createFixture();
  const marker = join(fixture.root, 'packaged.marker');
  const recordPath = join(fixture.root, 'execution.json');

  const { stdout } = await run(fixture, {
    entry: 'scripts/publish.mjs',
    recordPath,
    args: ['--marker', marker, '--value', 'safe'],
  });

  assert.equal(await readFile(marker, 'utf8'), 'packaged\n');
  const childResult = JSON.parse(stdout);
  assert.equal(childResult.source, 'packaged');
  assert.deepEqual(childResult.args.slice(-4), [
    '--marker',
    marker,
    '--value',
    'safe',
  ]);
  const record = JSON.parse(await readFile(recordPath, 'utf8'));
  assert.deepEqual(record, {
    schemaVersion: 'explainer-kit.packaged-execution/v1',
    rcId: fixture.manifest.rcId,
    entry: 'scripts/publish.mjs',
    package: {
      name: '@open-agent-toolkit/cli',
      version: '1.2.3',
      artifact: fixture.manifest.packages.find(
        ({ name }) => name === '@open-agent-toolkit/cli',
      ).artifact,
      sha256: fixture.manifest.packages.find(
        ({ name }) => name === '@open-agent-toolkit/cli',
      ).sha256,
    },
    verifiedTarballs: fixture.manifest.packages.map(
      ({ name, artifact, sha256 }) => ({ name, artifact, sha256 }),
    ),
    request: {
      schemaVersion: 'explainer-kit.publish-request/v1',
      sha256: await hashJsonFile(fixture.publishRequestPath),
    },
    outputs: {
      manifest: {
        schemaVersion: 'explainer-kit.manifest/v1',
        sha256: await hashJsonFile(fixture.publishManifestPath),
      },
      receipt: {
        schemaVersion: 'explainer-kit.publish-receipt/v1',
        sha256: await hashJsonFile(fixture.receiptPath),
      },
    },
    coreRunId: 'run-publish-123',
    exit: { code: 0, signal: null },
  });
  assert.deepEqual(await extractionDirectories(fixture.tempRoot), []);
});

test('fails before execution when any retained tarball hash does not match', async () => {
  const fixture = await createFixture();
  const marker = join(fixture.root, 'must-not-exist.marker');
  const otherPackage = fixture.manifest.packages.find(
    ({ name }) => name === '@open-agent-toolkit/control-plane',
  );
  await writeFile(
    join(fixture.artifactsRoot, otherPackage.artifact),
    'changed',
  );

  const failure = await runFailure(fixture, {
    entry: 'scripts/publish.mjs',
    args: ['--marker', marker],
  });

  assert.equal(failure.code, 'E_HASH_MISMATCH');
  assert.equal(failure.artifact, otherPackage.artifact);
  await assert.rejects(readFile(marker), { code: 'ENOENT' });
  assert.deepEqual(await extractionDirectories(fixture.tempRoot), []);
});

test('rejects malformed manifests and RC identity mismatches without exposing arguments', async () => {
  const fixture = await createFixture();
  const secret = 'super-secret-argument';
  fixture.manifest.unexpected = secret;
  await writeJson(fixture.manifestPath, fixture.manifest);

  const malformed = await runFailure(fixture, {
    entry: 'scripts/publish.mjs',
    args: ['--token', secret],
  });

  assert.equal(malformed.code, 'E_RC_MANIFEST');
  assert.doesNotMatch(JSON.stringify(malformed), new RegExp(secret));

  await writeFile(fixture.manifestPath, '{not-json\n');
  const invalidJson = await runFailure(fixture, {
    entry: 'scripts/publish.mjs',
  });
  assert.equal(invalidJson.code, 'E_RC_MANIFEST');

  delete fixture.manifest.unexpected;
  fixture.manifest.commit = 'b'.repeat(40);
  await writeJson(fixture.manifestPath, fixture.manifest);
  const identity = await runFailure(fixture, {
    entry: 'scripts/publish.mjs',
  });
  assert.equal(identity.code, 'E_RC_IDENTITY');
});

test('rejects traversal, absolute, and undeclared entries', async () => {
  const fixture = await createFixture();

  for (const [entry, code] of [
    ['../scripts/publish.mjs', 'E_ENTRY_PATH'],
    [resolve(fixture.root, 'publish.mjs'), 'E_ENTRY_PATH'],
    ['scripts/private.mjs', 'E_ENTRY_UNDECLARED'],
  ]) {
    const failure = await runFailure(fixture, { entry });
    assert.equal(failure.code, code);
  }
});

test('rejects a packaged entry symlink that escapes the extracted skill', async () => {
  const fixture = await createFixture({
    prepareCore: async (coreRoot, root) => {
      const outside = join(root, 'outside.mjs');
      await writeFile(outside, 'process.exitCode = 0;\n');
      await rm(join(coreRoot, 'scripts', 'publish.mjs'));
      await symlink(outside, join(coreRoot, 'scripts', 'publish.mjs'));
    },
    coreTreeHash: `sha256:${'c'.repeat(64)}`,
  });

  const failure = await runFailure(fixture, {
    entry: 'scripts/publish.mjs',
  });

  assert.equal(failure.code, 'E_ENTRY_ESCAPE');
  assert.deepEqual(await extractionDirectories(fixture.tempRoot), []);
});

test('never falls back to a source checkout when the packaged entry is absent', async () => {
  const fixture = await createFixture({
    prepareCore: async (coreRoot) => {
      await rm(join(coreRoot, 'scripts', 'publish.mjs'));
    },
  });
  const sourceMarker = join(fixture.root, 'source.marker');
  const sourceEntry = join(
    fixture.root,
    '.agents/skills/explainer-kit/scripts/publish.mjs',
  );
  await mkdir(dirname(sourceEntry), { recursive: true });
  await writeFile(
    sourceEntry,
    `import { writeFile } from 'node:fs/promises';
await writeFile(${JSON.stringify(sourceMarker)}, 'source\\n');
`,
  );

  const failure = await runFailure(fixture, {
    entry: 'scripts/publish.mjs',
  });

  assert.equal(failure.code, 'E_ENTRY_MISSING');
  await assert.rejects(readFile(sourceMarker), { code: 'ENOENT' });
});

test('requires one explicit artifacts directory and never searches cwd fallbacks', async () => {
  const fixture = await createFixture();
  const fallback = join(fixture.root, 'dist/explainer-kit-rc');
  const explicit = join(fixture.root, 'retained-elsewhere');
  await mkdir(explicit, { recursive: true });
  for (const pkg of fixture.manifest.packages) {
    await writeFile(join(explicit, pkg.artifact), 'wrong explicit bytes');
  }

  const explicitFailure = await runFailure(fixture, {
    entry: 'scripts/publish.mjs',
    artifactsDir: explicit,
  });
  assert.equal(explicitFailure.code, 'E_HASH_MISMATCH');

  const missingArgument = await runFailure(fixture, {
    entry: 'scripts/publish.mjs',
    omitArtifactsDir: true,
  });
  assert.equal(missingArgument.code, 'E_USAGE');
  assert.ok(fallback.endsWith('dist/explainer-kit-rc'));
});

test('binds core execution only to outputs reported by the packaged child', async () => {
  const fixture = await createFixture();
  const recordPath = join(fixture.root, 'bound-execution.json');

  await run(fixture, {
    entry: 'scripts/run.mjs',
    recordPath,
  });

  const record = JSON.parse(await readFile(recordPath, 'utf8'));
  assert.deepEqual(record.request, {
    schemaVersion: 'explainer-kit.run-request/v1',
    sha256: await hashJsonFile(fixture.coreRequestPath),
  });
  assert.deepEqual(record.outputs, {
    manifest: {
      schemaVersion: 'explainer-kit.manifest/v1',
      sha256: await hashJsonFile(fixture.coreManifestPath),
    },
    receipt: null,
  });
  assert.equal(record.coreRunId, 'run-core-123');
  assert.doesNotMatch(JSON.stringify(record), new RegExp(fixture.root));
});

test('rejects top-level wrapper receipt assertions for core runs', async () => {
  const fixture = await createFixture();
  await writeJson(fixture.receiptPath, {
    schemaVersion: 'explainer-kit.publish-receipt/v1',
  });

  const failure = await runFailure(fixture, {
    entry: 'scripts/run.mjs',
    receipt: fixture.receiptPath,
  });

  assert.equal(failure.code, 'E_USAGE');
});

test('rejects progress text instead of guessing at JSON lines', async () => {
  const fixture = await createFixture({
    prepareCore: async (coreRoot) => {
      await writeText(
        join(coreRoot, 'scripts/run.mjs'),
        `process.stdout.write('progress\\n{"runId":"foreign"}\\n');\n`,
      );
    },
  });

  const failure = await runFailure(fixture, {
    entry: 'scripts/run.mjs',
  });

  assert.equal(failure.code, 'E_EXECUTION_BINDING');
});

test('records packaged child failures and emits one sanitized structured error', async () => {
  const fixture = await createFixture();
  const recordPath = join(fixture.root, 'failed-execution.json');
  const secret = 'do-not-print-this';

  const failure = await runFailure(fixture, {
    entry: 'scripts/publish.mjs',
    recordPath,
    args: ['--secret', secret, '--exit', '7'],
  });

  assert.deepEqual(failure, {
    code: 'E_ENTRY_EXIT',
    message: 'Packaged entry exited unsuccessfully.',
    exit: { code: 7, signal: null },
  });
  assert.doesNotMatch(JSON.stringify(failure), new RegExp(secret));
  const record = JSON.parse(await readFile(recordPath, 'utf8'));
  assert.deepEqual(record.exit, { code: 7, signal: null });
  assert.equal(record.rcId, fixture.manifest.rcId);
  assert.equal(record.entry, 'scripts/publish.mjs');
});

async function createFixture({
  prepareCore = async () => {},
  coreTreeHash,
} = {}) {
  const root = await mkdtemp(join(tmpdir(), 'explainer-rc-runner-test-'));
  tempRoots.push(root);
  const artifactsRoot = join(root, 'dist/explainer-kit-rc');
  const manifestPath = join(root, 'acceptance/rc.json');
  const publishManifestPath = join(root, 'run-publish/manifest.json');
  const publishRequestPath = join(root, 'publish-request.json');
  const receiptPath = join(root, 'publish-receipt.json');
  const coreRequestPath = join(root, 'core-request.json');
  const coreManifestPath = join(root, 'run-core/manifest.json');
  const tempRoot = join(root, 'tmp');
  await Promise.all([
    mkdir(artifactsRoot, { recursive: true }),
    mkdir(tempRoot, { recursive: true }),
  ]);

  const packages = [];
  let calculatedCoreTreeHash;
  let calculatedAdapterTreeHash;
  for (const name of PACKAGE_NAMES) {
    const packageRoot = join(
      root,
      'package-build',
      packageDirectory(name),
      'package',
    );
    await writeJson(join(packageRoot, 'package.json'), {
      name,
      version: '1.2.3',
      type: 'module',
    });
    if (name === '@open-agent-toolkit/cli') {
      const coreRoot = join(packageRoot, 'assets/skills/explainer-kit');
      const adapterRoot = join(packageRoot, 'assets/skills/oat-explainer-kit');
      await Promise.all([
        writeText(join(coreRoot, 'SKILL.md'), skill('explainer-kit')),
        writeText(join(adapterRoot, 'SKILL.md'), skill('oat-explainer-kit')),
        writeText(join(coreRoot, 'scripts/run.mjs'), packagedEntry()),
        writeText(join(coreRoot, 'scripts/publish.mjs'), packagedEntry()),
        writeText(join(adapterRoot, 'scripts/run.mjs'), packagedEntry()),
      ]);
      await prepareCore(coreRoot, root);
      if (!coreTreeHash) {
        calculatedCoreTreeHash = await hashTree(coreRoot);
      }
      calculatedAdapterTreeHash = await hashTree(adapterRoot);
    }
    const artifact = `open-agent-toolkit-${packageDirectory(name)}-1.2.3.tgz`;
    const artifactPath = join(artifactsRoot, artifact);
    await execFileAsync(
      'tar',
      ['-czf', artifactPath, '-C', dirname(packageRoot), 'package'],
      { env: process.env },
    );
    packages.push({
      name,
      version: '1.2.3',
      artifact,
      sha256: await hashFile(artifactPath),
    });
  }
  packages.sort(byName);

  const skills = [
    {
      name: 'explainer-kit',
      version: '1.0.0',
      package: '@open-agent-toolkit/cli',
      path: 'package/assets/skills/explainer-kit',
      sha256: coreTreeHash ?? calculatedCoreTreeHash,
    },
    {
      name: 'oat-explainer-kit',
      version: '1.0.0',
      package: '@open-agent-toolkit/cli',
      path: 'package/assets/skills/oat-explainer-kit',
      sha256: calculatedAdapterTreeHash,
    },
  ];
  const identity = {
    schemaVersion: 'explainer-kit.release-candidate/v1',
    commit: 'a'.repeat(40),
    packages,
    skills,
    schemas: [
      {
        id: 'explainer-kit.manifest/v1',
        path: 'schemas/manifest.schema.json',
        sha256: `sha256:${'e'.repeat(64)}`,
      },
    ],
    recipes: [
      {
        id: 'project-explainer',
        version: '1',
        schemaVersion: 'explainer-kit.recipe/v1',
        path: 'recipes/project-explainer.json',
        sha256: `sha256:${'f'.repeat(64)}`,
      },
    ],
    changedCandidates: [],
  };
  const manifest = {
    schemaVersion: identity.schemaVersion,
    rcId: hashBytes(Buffer.from(JSON.stringify(identity))),
    commit: identity.commit,
    packages,
    skills,
    schemas: identity.schemas,
    recipes: identity.recipes,
    changedCandidates: [],
  };
  await Promise.all([
    writeJson(manifestPath, manifest),
    writeJson(publishManifestPath, {
      schemaVersion: 'explainer-kit.manifest/v1',
      runId: 'run-publish-123',
      artifacts: [],
    }),
    writeJson(publishRequestPath, {
      schemaVersion: 'explainer-kit.publish-request/v1',
      provider: 's3-static',
      s3Uri: 's3://example/published',
      publicBaseUrl: 'https://example.com/published',
      awsRegion: 'us-east-1',
      siteRoot: join(root, 'run-publish/site'),
      manifestPath: publishManifestPath,
    }),
    writeJson(coreRequestPath, {
      schemaVersion: 'explainer-kit.run-request/v1',
      recipe: { id: 'project-explainer', version: '1' },
      slug: 'run-core',
      outputRoot: root,
      factBase: {
        mode: 'supplied',
        path: join(root, 'fact-base.json'),
        freshnessPolicy: 'live-wins',
      },
      durability: { strategy: 'none' },
      privacy: { retainRawArtDirection: false },
      mode: 'unattended',
    }),
  ]);

  return {
    root,
    artifactsRoot,
    manifestPath,
    manifest,
    tempRoot,
    publishManifestPath,
    publishRequestPath,
    receiptPath,
    coreRequestPath,
    coreManifestPath,
  };
}

async function run(
  fixture,
  {
    entry,
    recordPath = join(fixture.root, 'execution.json'),
    artifactsDir = fixture.artifactsRoot,
    omitArtifactsDir = false,
    receipt,
    args = [],
  },
) {
  const evidenceArgs =
    entry === 'scripts/publish.mjs'
      ? [
          '--request',
          fixture.publishRequestPath,
          '--receipt',
          fixture.receiptPath,
          '--confirm-publish',
        ]
      : ['--request', fixture.coreRequestPath];
  return execFileAsync(
    process.execPath,
    [
      RUNNER,
      '--rc-manifest',
      fixture.manifestPath,
      ...(!omitArtifactsDir ? ['--artifacts-dir', artifactsDir] : []),
      '--entry',
      entry,
      '--record',
      recordPath,
      ...(receipt ? ['--receipt', receipt] : []),
      '--',
      ...evidenceArgs,
      ...args,
    ],
    {
      cwd: fixture.root,
      env: { ...process.env, TMPDIR: fixture.tempRoot },
      encoding: 'utf8',
    },
  );
}

async function runFailure(fixture, options) {
  try {
    await run(fixture, options);
    assert.fail('Expected packaged RC runner to fail.');
  } catch (error) {
    assert.equal(error.code, 1);
    const lines = error.stderr.trim().split('\n');
    assert.equal(lines.length, 1);
    return JSON.parse(lines[0]);
  }
}

async function extractionDirectories(tempRoot) {
  return (await readdir(tempRoot)).filter((name) =>
    name.startsWith('explainer-rc-run-'),
  );
}

function packagedEntry() {
  return `import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
const args = process.argv.slice(2);
const markerIndex = args.indexOf('--marker');
if (markerIndex >= 0) await writeFile(args[markerIndex + 1], 'packaged\\n');
const exitIndex = args.indexOf('--exit');
if (exitIndex >= 0) {
  process.stderr.write(\`fixture secret: \${args.join(' ')}\\n\`);
  process.exitCode = Number(args[exitIndex + 1]);
} else {
  const requestPath = args[args.indexOf('--request') + 1];
  const request = JSON.parse(await readFile(requestPath, 'utf8'));
  if (request.schemaVersion === 'explainer-kit.publish-request/v1') {
    const receiptPath = args[args.indexOf('--receipt') + 1];
    const receipt = {
      schemaVersion: 'explainer-kit.publish-receipt/v1',
      provider: 's3-static',
      publishedAt: '2026-07-18T12:00:00.000Z',
      roots: { s3Uri: request.s3Uri, publicBaseUrl: request.publicBaseUrl },
      sentinel: {
        relativePath: '.explainer-kit-sentinel/run-publish-123-0123456789abcdeffedcba9876543210.txt',
        uploadVerified: true,
        publicVerified: true,
        deleted: true,
      },
      artifacts: [],
    };
    await writeFile(receiptPath, JSON.stringify(receipt));
    process.stdout.write(JSON.stringify({
      ok: true,
      receiptPath,
      receipt,
      source: 'packaged',
      args,
    }) + '\\n');
  } else {
    const manifestPath = join(request.outputRoot, request.slug, 'manifest.json');
    await mkdir(dirname(manifestPath), { recursive: true });
    await writeFile(manifestPath, JSON.stringify({
      schemaVersion: 'explainer-kit.manifest/v1',
      runId: 'run-core-123',
      artifacts: [],
    }));
    process.stdout.write(JSON.stringify({
      runId: 'run-core-123',
      manifestPath,
      outcome: 'built-not-durable',
      source: 'packaged',
      args,
    }, null, 2) + '\\n');
  }
}
`;
}

function skill(name) {
  return `---
name: ${name}
version: 1.0.0
---
`;
}

function packageDirectory(name) {
  return name.split('/').at(-1);
}

async function hashTree(root) {
  const files = await walkFiles(root);
  const entries = await Promise.all(
    files.map(async (path) => ({
      path: relative(root, path).replaceAll('\\', '/'),
      sha256: await hashFile(path),
    })),
  );
  return hashBytes(Buffer.from(JSON.stringify(entries)));
}

async function walkFiles(root) {
  const files = [];
  for (const entry of (await readdir(root, { withFileTypes: true })).sort(
    (left, right) =>
      left.name < right.name ? -1 : left.name > right.name ? 1 : 0,
  )) {
    const path = join(root, entry.name);
    const stats = await lstat(path);
    if (stats.isDirectory()) {
      files.push(...(await walkFiles(path)));
    } else if (stats.isFile()) {
      files.push(path);
    }
  }
  return files;
}

async function hashFile(path) {
  return hashBytes(await readFile(path));
}

async function hashJsonFile(path) {
  return hashBytes(
    Buffer.from(JSON.stringify(JSON.parse(await readFile(path, 'utf8')))),
  );
}

function hashBytes(value) {
  return `sha256:${createHash('sha256').update(value).digest('hex')}`;
}

function byName(left, right) {
  return left.name < right.name ? -1 : left.name > right.name ? 1 : 0;
}

async function writeJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
}

async function writeText(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, value);
}
