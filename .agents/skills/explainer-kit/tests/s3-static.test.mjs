import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, test } from 'node:test';

import {
  createSentinelRelativePath,
  normalizePublishRoots,
  publishS3Static,
} from '../scripts/lib/s3-static.mjs';
import { runPublishCli } from '../scripts/publish.mjs';

const NOW = '2026-07-18T12:00:00.000Z';
const tempDirs = [];

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
  );
});

test('normalizes corresponding roots and maps site-relative paths', () => {
  assert.deepEqual(
    normalizePublishRoots(
      's3://example-bucket/published///',
      'https://cdn.example.com/published///',
    ),
    {
      bucket: 'example-bucket',
      keyPrefix: 'published',
      s3Uri: 's3://example-bucket/published',
      publicBaseUrl: 'https://cdn.example.com/published',
    },
  );
  assert.throws(
    () => normalizePublishRoots('s3://example-bucket', 'http://example.com'),
    /https/i,
  );
});

test('creates run-unique sentinel paths with unguessable suffixes', () => {
  const first = createSentinelRelativePath('run/with spaces', () =>
    Buffer.from('0123456789abcdeffedcba9876543210', 'hex'),
  );
  const second = createSentinelRelativePath('run/with spaces', () =>
    Buffer.from('fedcba98765432100123456789abcdef', 'hex'),
  );
  assert.match(
    first,
    /^\.explainer-kit-sentinel\/run-with-spaces-[a-f0-9]{32}\.txt$/,
  );
  assert.notEqual(first, second);
});

test('fails closed on authentication errors without bulk upload or reauthentication', async () => {
  const fixture = await createFixture();
  const calls = [];
  const command = async (file, args) => {
    calls.push([file, ...args]);
    throw Object.assign(
      new Error('The SSO session associated with this profile has expired'),
      { stderr: 'The SSO session associated with this profile has expired' },
    );
  };

  await assert.rejects(
    publishS3Static(fixture.request, {
      approved: true,
      command,
      httpGet: unexpectedHttp,
    }),
    (error) =>
      error.code === 'E_PUBLISH_AUTH' && !/token|secret/i.test(error.message),
  );
  assert.equal(calls.length, 1);
  assert.equal(
    calls.some((call) => call.includes('sso')),
    false,
  );
});

test('verifies the public sentinel before any declared artifact upload and cleans it up', async () => {
  const fixture = await createFixture();
  const harness = fakeDestination({ publicSentinelStatus: 404 });

  await assert.rejects(
    publishS3Static(fixture.request, {
      approved: true,
      ...harness.dependencies,
    }),
    (error) => error.code === 'E_PUBLISH_ROOTS',
  );

  const puts = harness.calls.filter(
    (call) => call[1] === 's3api' && call[2] === 'put-object',
  );
  assert.equal(puts.length, 1);
  assert.match(argument(puts[0], '--key'), /\.explainer-kit-sentinel/);
  assert.equal(
    harness.calls.some(
      (call) => call[1] === 's3api' && call[2] === 'delete-object',
    ),
    true,
  );
});

test('uploads additively with MIME/cache metadata and skips matching declared objects', async () => {
  const fixture = await createFixture();
  const harness = fakeDestination({
    existingHashes: new Map([
      ['published/initiatives/demo/catalog.json', fixture.hashes.catalog],
    ]),
  });

  await publishS3Static(fixture.request, {
    approved: true,
    now: () => NOW,
    randomBytes: () => Buffer.from('0123456789abcdeffedcba9876543210', 'hex'),
    ...harness.dependencies,
  });

  const artifactPuts = harness.calls.filter(
    (call) =>
      call[1] === 's3api' &&
      call[2] === 'put-object' &&
      !argument(call, '--key').includes('sentinel'),
  );
  assert.equal(artifactPuts.length, 1);
  assert.equal(
    argument(artifactPuts[0], '--key'),
    'published/initiatives/demo/index.html',
  );
  assert.equal(
    argument(artifactPuts[0], '--content-type'),
    'text/html; charset=utf-8',
  );
  assert.equal(
    argument(artifactPuts[0], '--cache-control'),
    'public, max-age=300',
  );
  assert.equal(
    harness.calls.some((call) => call.includes('sync')),
    false,
  );
  assert.equal(
    harness.calls.some(
      (call) =>
        call.includes('delete-object') &&
        !argument(call, '--key').includes('sentinel'),
    ),
    false,
  );
});

test('rejects duplicate publish paths before network access', async () => {
  const fixture = await createFixture();
  fixture.manifest.artifacts.push({
    ...fixture.manifest.artifacts[0],
    id: 'duplicate',
  });
  await writeFile(
    fixture.request.manifestPath,
    `${JSON.stringify(fixture.manifest, null, 2)}\n`,
  );
  let called = false;

  await assert.rejects(
    publishS3Static(fixture.request, {
      approved: true,
      command: async () => {
        called = true;
      },
      httpGet: unexpectedHttp,
    }),
    /duplicate|unique/i,
  );
  assert.equal(called, false);
});

test('uses explicit index URLs, writes receipt hashes, and records sentinel cleanup', async () => {
  const fixture = await createFixture();
  const harness = fakeDestination();
  const receipt = await publishS3Static(fixture.request, {
    approved: true,
    now: () => NOW,
    randomBytes: () => Buffer.from('0123456789abcdeffedcba9876543210', 'hex'),
    ...harness.dependencies,
  });

  assert.deepEqual(
    harness.urls.filter((url) => !url.includes('sentinel')),
    [
      'https://cdn.example.com/published/initiatives/demo/index.html',
      'https://cdn.example.com/published/initiatives/demo/catalog.json',
    ],
  );
  assert.deepEqual(receipt.sentinel, {
    relativePath:
      '.explainer-kit-sentinel/run-123-0123456789abcdeffedcba9876543210.txt',
    uploadVerified: true,
    publicVerified: true,
    deleted: true,
  });
  assert.deepEqual(
    receipt.artifacts.map(({ relativePath, hash }) => ({ relativePath, hash })),
    [
      {
        relativePath: 'site/initiatives/demo/index.html',
        hash: fixture.hashes.html,
      },
      {
        relativePath: 'site/initiatives/demo/catalog.json',
        hash: fixture.hashes.catalog,
      },
    ],
  );
  assert.deepEqual(
    JSON.parse(await readFile(fixture.receiptPath, 'utf8')),
    receipt,
  );
});

test('rejects undeclared files and exposes no root-wide delete operation', async () => {
  const fixture = await createFixture();
  await writeFile(join(fixture.siteRoot, 'undeclared.txt'), 'do not publish');
  const harness = fakeDestination();
  await publishS3Static(fixture.request, {
    approved: true,
    ...harness.dependencies,
  });

  assert.equal(
    harness.calls.some((call) =>
      call.some((value) => value.includes('undeclared')),
    ),
    false,
  );
  assert.equal(
    harness.calls.some((call) => call.includes('--delete')),
    false,
  );
  assert.equal(
    harness.calls.some((call) => call.includes('rm')),
    false,
  );
});

test('requires an explicit human approval at the public API and CLI', async () => {
  const fixture = await createFixture();
  await assert.rejects(
    publishS3Static(fixture.request, {
      command: unexpectedCommand,
      httpGet: unexpectedHttp,
    }),
    /approval/i,
  );

  const output = [];
  assert.equal(
    await runPublishCli(
      ['--request', fixture.requestPath, '--receipt', fixture.receiptPath],
      { log: (line) => output.push(line) },
    ),
    1,
  );
  assert.match(output.join('\n'), /confirm-publish/i);
});

async function createFixture() {
  const runRoot = await mkdtemp(join(tmpdir(), 'explainer-s3-static-'));
  tempDirs.push(runRoot);
  const siteRoot = join(runRoot, 'site');
  await mkdir(join(siteRoot, 'initiatives/demo'), { recursive: true });
  const htmlPath = join(siteRoot, 'initiatives/demo/index.html');
  const catalogPath = join(siteRoot, 'initiatives/demo/catalog.json');
  await writeFile(htmlPath, '<!doctype html><title>Demo</title>\n');
  await writeFile(catalogPath, '{"title":"Demo"}\n');
  const hashes = {
    html: await fileHash(htmlPath),
    catalog: await fileHash(catalogPath),
  };
  const manifest = {
    schemaVersion: 'explainer-kit.manifest/v1',
    runId: 'run-123',
    slug: 'demo',
    recipe: { id: 'project-explainer', version: '1' },
    createdAt: NOW,
    source: {
      factBasePath: 'source/fact-base.json',
      factBaseHash: `sha256:${'a'.repeat(64)}`,
      inputHashes: {},
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
        status: 'built',
        renderedPath: 'site/initiatives/demo/index.html',
        mediaType: 'text/html',
        hash: hashes.html,
        rebuildable: false,
      },
      {
        id: 'catalog',
        type: 'catalog',
        contentPath: 'source/content/catalog.md',
        status: 'built',
        renderedPath: 'site/initiatives/demo/catalog.json',
        mediaType: 'application/json',
        hash: hashes.catalog,
        rebuildable: false,
      },
    ],
    immutableHashes: {
      'source/fact-base.json': `sha256:${'a'.repeat(64)}`,
      'source/fact-base.md': `sha256:${'a'.repeat(64)}`,
      'source/content/hub.md': `sha256:${'c'.repeat(64)}`,
      'source/content/catalog.md': `sha256:${'d'.repeat(64)}`,
      'theme.resolved.json': `sha256:${'b'.repeat(64)}`,
      'site/initiatives/demo/index.html': hashes.html,
      'site/initiatives/demo/catalog.json': hashes.catalog,
    },
    outcome: 'built-not-durable',
    buildRecord: {
      path: 'build-record.json',
      hash: `sha256:${'e'.repeat(64)}`,
    },
    warnings: [],
  };
  const manifestPath = join(runRoot, 'manifest.json');
  const requestPath = join(runRoot, 'publish-request.json');
  const receiptPath = join(runRoot, 'publish-receipt.json');
  const request = {
    schemaVersion: 'explainer-kit.publish-request/v1',
    provider: 's3-static',
    s3Uri: 's3://example-bucket/published/',
    publicBaseUrl: 'https://cdn.example.com/published/',
    awsRegion: 'us-east-1',
    awsProfile: 'test-profile',
    siteRoot,
    manifestPath,
  };
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  await writeFile(requestPath, `${JSON.stringify(request, null, 2)}\n`);
  return {
    runRoot,
    siteRoot,
    manifest,
    request,
    requestPath,
    receiptPath,
    hashes,
  };
}

function fakeDestination({
  publicSentinelStatus = 200,
  existingHashes = new Map(),
} = {}) {
  const calls = [];
  const urls = [];
  const objects = new Map(
    [...existingHashes].map(([key, hash]) => [
      key,
      {
        ContentType: key.endsWith('.json')
          ? 'application/json'
          : 'text/html; charset=utf-8',
        CacheControl: 'public, max-age=300',
        Metadata: { 'explainer-sha256': hash.slice('sha256:'.length) },
      },
    ]),
  );
  const command = async (file, args) => {
    const call = [file, ...args];
    calls.push(call);
    const operation = args[1];
    const key = argument(call, '--key');
    if (operation === 'head-object') {
      if (objects.has(key)) {
        return { stdout: JSON.stringify(objects.get(key)), stderr: '' };
      }
      if (key.includes('sentinel')) {
        return { stdout: '{}', stderr: '' };
      }
      throw Object.assign(new Error('Not Found'), {
        stderr: 'An error occurred (404) when calling the HeadObject operation',
      });
    }
    if (operation === 'put-object' && !key.includes('sentinel')) {
      objects.set(key, {
        ContentType: argument(call, '--content-type'),
        CacheControl: argument(call, '--cache-control'),
        Metadata: {
          'explainer-sha256': argument(call, '--metadata').split('=')[1],
        },
      });
    }
    return { stdout: '{}', stderr: '' };
  };
  const httpGet = async (url) => {
    urls.push(url);
    const sentinel = url.includes('sentinel');
    return {
      status: sentinel ? publicSentinelStatus : 200,
      headers: {
        'content-type': url.endsWith('.json')
          ? 'application/json'
          : 'text/html; charset=utf-8',
      },
      body: sentinel ? 'explainer-kit sentinel\n' : '',
    };
  };
  return { calls, urls, dependencies: { command, httpGet } };
}

function argument(call, flag) {
  const index = call.indexOf(flag);
  return index === -1 ? undefined : call[index + 1];
}

async function fileHash(path) {
  return `sha256:${createHash('sha256')
    .update(await readFile(path))
    .digest('hex')}`;
}

async function unexpectedCommand() {
  throw new Error('command seam must not be called');
}

async function unexpectedHttp() {
  throw new Error('HTTP seam must not be called');
}
