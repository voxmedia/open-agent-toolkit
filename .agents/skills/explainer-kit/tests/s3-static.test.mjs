import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, test } from 'node:test';

import { resolvePublicVerificationPolicy } from '../scripts/lib/catalog.mjs';
import {
  PRIVATE_PUBLIC_ROOT_ENV,
  ROOT_DIVERGENCE_WARNING_ENV,
  describeRootDivergence,
  isPrivatePublicHost,
  privatePublicRootAllowed,
  rootDivergenceWarningSuppressed,
} from '../scripts/lib/s3-roots.mjs';
import {
  createSentinelRelativePath,
  defaultHttpGet,
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
      's3://example-bucket/published/',
      'https://cdn.example.com/published/',
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

test('accepts both corresponding and origin-path publication roots', () => {
  // The S3-key-to-URL mapping lives in CDN configuration this tool cannot read,
  // so no structural rule between the two strings is sound. Both shapes below
  // are legitimate and must be accepted.
  const legitimate = [
    [
      'A: paths correspond',
      's3://example-media-bucket/repositories/alpha',
      'https://docs.example.net/repositories/alpha',
    ],
    [
      'B: CloudFront Origin Path maps a prefix to the distribution root',
      's3://example-owner-bucket/explainers',
      'https://d111111abcdef8.example-cdn.net',
    ],
    [
      'bucket root and host root',
      's3://example-bucket',
      'https://cdn.example.com',
    ],
    [
      'public root deeper than the key prefix',
      's3://example-bucket/a',
      'https://cdn.example.com/a/b',
    ],
  ];

  for (const [label, s3Uri, publicBaseUrl] of legitimate) {
    const roots = normalizePublishRoots(s3Uri, publicBaseUrl);
    assert.equal(roots.s3Uri, s3Uri.replace(/\/$/, ''), `accepted: ${label}`);
  }
});

test('reports root divergence as a suppressible non-blocking warning', () => {
  // Advisory only: it catches genuine typos without false-rejecting Origin Path.
  assert.equal(
    describeRootDivergence(
      normalizePublishRoots(
        's3://example-bucket/explainers',
        'https://cdn.example.com/explainers',
      ),
    ),
    null,
    'corresponding roots produce no warning',
  );

  const divergent = describeRootDivergence(
    normalizePublishRoots(
      's3://example-owner-bucket/explainers',
      'https://d111111abcdef8.example-cdn.net',
    ),
  );
  assert.match(divergent, /different paths/);
  assert.match(divergent, /Origin\s+Path/);

  assert.equal(rootDivergenceWarningSuppressed({}), false);
  assert.equal(
    rootDivergenceWarningSuppressed({ [ROOT_DIVERGENCE_WARNING_ENV]: '1' }),
    true,
  );
});

test('publishes a divergent-root deployment and warns without blocking', async () => {
  // Configuration B must publish successfully; divergence is advisory only.
  const fixture = await createFixture();
  fixture.request.s3Uri = 's3://example-bucket/published';
  fixture.request.publicBaseUrl = 'https://cdn.example.com';
  // Protected mode keeps this test focused on the roots: no public fetch is
  // issued, so the divergence itself is the only thing under test.
  fixture.request.publicAccess = 'protected';
  const harness = fakeDestination();
  const warnings = [];

  const receipt = await publishS3Static(fixture.request, {
    approved: true,
    now: () => NOW,
    randomBytes: () => Buffer.from('0123456789abcdeffedcba9876543210', 'hex'),
    ...harness.dependencies,
    httpGet: unexpectedHttp,
    warn: (message) => warnings.push(message),
  });

  assert.ok(receipt, 'divergent roots must not block publication');
  assert.equal(warnings.length, 1, 'exactly one advisory warning');
  assert.match(warnings[0], /different paths/);
});

test('catalog carries verification policy, never a verification outcome', async () => {
  // The catalog is hashed and uploaded before the first public fetch, so it can
  // only ever carry policy. `verified` must never appear in it.
  for (const [publicAccess, marker, receiptStatus] of [
    ['public', 'required', 'verified'],
    ['protected', 'skipped-by-policy', 'skipped-protected'],
  ]) {
    const fixture = await createFixture();
    fixture.request.publicAccess = publicAccess;
    const harness = fakeDestination();

    const receipt = await publishS3Static(fixture.request, {
      approved: true,
      now: () => NOW,
      randomBytes: () => Buffer.from('0123456789abcdeffedcba9876543210', 'hex'),
      ...harness.dependencies,
      ...(publicAccess === 'protected' ? { httpGet: unexpectedHttp } : {}),
    });

    const catalogEntry = receipt.artifacts.find(
      (entry) => entry.source?.name === 'catalog',
    );
    assert.ok(catalogEntry, `${publicAccess}: catalog is a receipt artifact`);

    const uploaded = harness.objects.get(
      `published/initiatives/${fixture.manifest.slug}/catalog.json`,
    );
    assert.ok(uploaded, `${publicAccess}: catalog was uploaded`);
    const catalog = JSON.parse(uploaded.Body.toString('utf8'));

    assert.equal(catalog.publicVerification, marker, publicAccess);
    assert.notEqual(catalog.publicVerification, 'verified');

    // The catalog's own hash must still be the one the receipt recorded.
    assert.equal(
      catalogEntry.hash,
      `sha256:${createHash('sha256').update(uploaded.Body).digest('hex')}`,
      `${publicAccess}: catalog hash stays valid`,
    );

    // Catalog marker and receipt status derive from one result and correspond.
    const manifestEntry = receipt.artifacts.find(
      (entry) => entry.source?.kind === 'manifest',
    );
    assert.equal(
      manifestEntry.publicVerification.status,
      receiptStatus,
      `${publicAccess}: receipt status corresponds to the catalog marker`,
    );
  }
});

test('catalog marker and receipt status cannot drift apart', () => {
  for (const publicAccess of ['public', 'protected', undefined]) {
    const policy = resolvePublicVerificationPolicy(publicAccess);
    assert.equal(
      policy.verifyPublicly,
      policy.catalogMarker === 'required',
      `${publicAccess}: verifyPublicly matches the catalog marker`,
    );
    assert.equal(
      policy.catalogMarker === 'skipped-by-policy',
      policy.publicAccess === 'protected',
      `${publicAccess}: skipped-by-policy iff protected`,
    );
    assert.notEqual(policy.catalogMarker, 'verified');
  }

  // A catalog whose marker disagrees with the run's policy is rejected.
  assert.equal(
    resolvePublicVerificationPolicy('protected').catalogMarker,
    'skipped-by-policy',
  );
});

test('rejects loopback, link-local, and private-network public roots', async () => {
  // Every address below was probed as accepted before the address policy, while
  // `defaultHttpGet` followed redirects against it.
  const internal = [
    ['loopback v4 with port', 'https://127.0.0.1:8443/p'],
    ['loopback v4 elsewhere in /8', 'https://127.1.2.3/p'],
    ['AWS IMDS link-local', 'https://169.254.169.254/p'],
    ['localhost name', 'https://localhost/p'],
    ['localhost subdomain', 'https://app.localhost/p'],
    ['RFC 1918 ten-dot', 'https://10.0.0.5/p'],
    ['RFC 1918 192.168', 'https://192.168.1.1/p'],
    ['RFC 1918 172.16/12', 'https://172.16.0.1/p'],
    ['unspecified v4', 'https://0.0.0.0/p'],
    ['loopback v6', 'https://[::1]/p'],
    ['link-local v6', 'https://[fe80::1]/p'],
    ['unique-local v6', 'https://[fd12:3456::1]/p'],
    // The URL parser rewrites these to hex (`[::ffff:7f00:1]`,
    // `[::ffff:a9fe:a9fe]`), so they must be caught in the normalized shape.
    ['IPv4-mapped loopback', 'https://[::ffff:127.0.0.1]/p'],
    ['IPv4-mapped IMDS', 'https://[::ffff:169.254.169.254]/p'],
    ['fully expanded loopback v6', 'https://[0:0:0:0:0:0:0:1]/p'],
  ];

  for (const [label, publicBaseUrl] of internal) {
    assert.throws(
      () => normalizePublishRoots('s3://example-bucket/p', publicBaseUrl),
      (error) => error.code === 'E_PUBLISH_ROOTS',
      `internal: ${label}`,
    );
  }

  // Public addresses adjacent to the blocked ranges must still be accepted.
  for (const [label, publicBaseUrl] of [
    ['routable v4', 'https://8.8.8.8/p'],
    ['just above 172.16/12', 'https://172.32.0.1/p'],
    ['just below 172.16/12', 'https://172.15.0.1/p'],
    ['not 192.168', 'https://192.169.0.1/p'],
    ['routable v6', 'https://[2606:4700::1111]/p'],
    ['ordinary CDN host', 'https://cdn.example.com/p'],
  ]) {
    assert.ok(
      normalizePublishRoots('s3://example-bucket/p', publicBaseUrl),
      `routable: ${label}`,
    );
  }

  // The policy is address-literal only, and it fails closed at the connector
  // before any process launch or network use.
  const fixture = await createFixture();
  fixture.request.s3Uri = 's3://example-bucket/p';
  fixture.request.publicBaseUrl = 'https://169.254.169.254/p';
  let touched = false;
  await assert.rejects(
    publishS3Static(fixture.request, {
      approved: true,
      command: async () => {
        touched = true;
      },
      httpGet: async () => {
        touched = true;
      },
    }),
    (error) => ['E_PUBLISH_INPUT', 'E_PUBLISH_ROOTS'].includes(error.code),
  );
  assert.equal(touched, false);
});

test('records the anti-SSRF opt-in in the receipt only when it was actually used', async () => {
  // The variable is read straight from process.env and enters no request,
  // manifest or catalog, so without this fact a publication made to an internal
  // address with the control disabled left no durable trace.
  const previous = process.env[PRIVATE_PUBLIC_ROOT_ENV];
  const publish = async (publicBaseUrl) => {
    const fixture = await createFixture();
    fixture.request.publicAccess = 'protected';
    fixture.request.s3Uri = 's3://example-bucket/published';
    fixture.request.publicBaseUrl = publicBaseUrl;
    const harness = fakeDestination();
    return publishS3Static(fixture.request, {
      approved: true,
      now: () => NOW,
      randomBytes: () => Buffer.from('0123456789abcdeffedcba9876543210', 'hex'),
      ...harness.dependencies,
      httpGet: unexpectedHttp,
    });
  };

  try {
    // Opt-in set and the root really is internal: recorded.
    process.env[PRIVATE_PUBLIC_ROOT_ENV] = '1';
    const internal = await publish('https://10.0.0.5/published');
    assert.equal(internal.publicRootPolicy, 'private-allowed');

    // Opt-in set but the root is public: nothing to disclose, so absent.
    const routable = await publish('https://cdn.example.com/published');
    assert.equal('publicRootPolicy' in routable, false);
  } finally {
    if (previous === undefined) delete process.env[PRIVATE_PUBLIC_ROOT_ENV];
    else process.env[PRIVATE_PUBLIC_ROOT_ENV] = previous;
  }

  // Opt-in unset: an internal root cannot be published at all, and an ordinary
  // receipt carries no such field.
  const ordinary = await publish('https://cdn.example.com/published');
  assert.equal('publicRootPolicy' in ordinary, false);
});

test('allows an internal public root only behind an explicit opt-in', () => {
  assert.equal(privatePublicRootAllowed({}), false);
  assert.equal(
    privatePublicRootAllowed({ [PRIVATE_PUBLIC_ROOT_ENV]: '1' }),
    true,
  );
  assert.equal(
    privatePublicRootAllowed({ [PRIVATE_PUBLIC_ROOT_ENV]: 'on' }),
    true,
  );
  assert.equal(
    privatePublicRootAllowed({ [PRIVATE_PUBLIC_ROOT_ENV]: 'no' }),
    false,
  );

  assert.ok(isPrivatePublicHost('169.254.169.254'));
  assert.ok(!isPrivatePublicHost('cdn.example.com'));

  const previous = process.env[PRIVATE_PUBLIC_ROOT_ENV];
  process.env[PRIVATE_PUBLIC_ROOT_ENV] = '1';
  try {
    assert.ok(
      normalizePublishRoots('s3://example-bucket/p', 'https://10.0.0.5/p'),
      'opt-in permits an internal root',
    );
  } finally {
    if (previous === undefined) delete process.env[PRIVATE_PUBLIC_ROOT_ENV];
    else process.env[PRIVATE_PUBLIC_ROOT_ENV] = previous;
  }

  assert.throws(
    () => normalizePublishRoots('s3://example-bucket/p', 'https://10.0.0.5/p'),
    (error) => error.code === 'E_PUBLISH_ROOTS',
    'opt-in does not leak across runs',
  );
});

test('public verification refuses to follow redirects', async () => {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, options });
    return {
      status: 200,
      headers: new Headers(),
      arrayBuffer: async () => new ArrayBuffer(0),
    };
  };

  await defaultHttpGet('https://cdn.example.com/p/index.html', { fetchImpl });
  assert.equal(calls.length, 1);
  assert.equal(
    calls[0].options.redirect,
    'error',
    'a canonical artifact URL must never be chased through a redirect',
  );

  // A real `fetch` with `redirect: 'error'` rejects rather than following, so a
  // redirecting public root must surface as a failure.
  const redirecting = async () => {
    throw Object.assign(new TypeError('fetch failed'), {
      cause: new Error('unexpected redirect'),
    });
  };
  await assert.rejects(
    defaultHttpGet('https://cdn.example.com/p/index.html', {
      fetchImpl: redirecting,
    }),
  );
});

test('rejects unsafe or divergent S3 roots before process launch', async () => {
  const unsafePairs = [
    [
      's3://access-key:secret@example-bucket/published',
      'https://cdn.example.com/published',
    ],
    [
      's3://access-key%40example-bucket/published',
      'https://cdn.example.com/published',
    ],
    ['s3://example-bucket:443/published', 'https://cdn.example.com/published'],
    [
      's3://example-bucket/published?version=1',
      'https://cdn.example.com/published',
    ],
    [
      's3://example-bucket/published#latest',
      'https://cdn.example.com/published',
    ],
    ['s3://Example_Bucket/published', 'https://cdn.example.com/published'],
    ['s3://example-bucket/a/../b', 'https://cdn.example.com/a/../b'],
    ['s3://example-bucket/a/%2e%2e/b', 'https://cdn.example.com/a/%2e%2e/b'],
    ['s3://example-bucket/a%2fb', 'https://cdn.example.com/a%2fb'],
    ['s3://example-bucket/a//b', 'https://cdn.example.com/a//b'],
  ];

  for (const [s3Uri, publicBaseUrl] of unsafePairs) {
    assert.throws(
      () => normalizePublishRoots(s3Uri, publicBaseUrl),
      (error) => error.code === 'E_PUBLISH_ROOTS',
    );

    const fixture = await createFixture();
    fixture.request.s3Uri = s3Uri;
    fixture.request.publicBaseUrl = publicBaseUrl;
    let processLaunched = false;
    await assert.rejects(
      publishS3Static(fixture.request, {
        approved: true,
        command: async () => {
          processLaunched = true;
        },
      }),
      (error) =>
        ['E_PUBLISH_INPUT', 'E_PUBLISH_ROOTS'].includes(error.code) &&
        !error.message.includes('access-key') &&
        !error.message.includes('secret'),
    );
    assert.equal(processLaunched, false, s3Uri);
  }
});

test('rejects credential-bearing and ambiguous public roots before network use', async () => {
  for (const publicRoot of [
    'https://user:secret@cdn.example.com/published',
    'https://cdn.example.com/published?token=secret',
    'https://cdn.example.com/published#fragment',
  ]) {
    assert.throws(
      () => normalizePublishRoots('s3://example-bucket', publicRoot),
      (error) => error.code === 'E_PUBLISH_ROOTS',
    );
  }

  const fixture = await createFixture();
  fixture.request.publicBaseUrl =
    'https://user:secret@cdn.example.com/published';
  let networkCalled = false;
  await assert.rejects(
    publishS3Static(fixture.request, {
      approved: true,
      command: async () => {
        networkCalled = true;
      },
      httpGet: async () => {
        networkCalled = true;
      },
    }),
    (error) =>
      ['E_PUBLISH_INPUT', 'E_PUBLISH_ROOTS'].includes(error.code) &&
      !error.message.includes('user') &&
      !error.message.includes('secret'),
  );
  assert.equal(networkCalled, false);
});

test('denies non-durable, flagged, failed, and superseded publication before network use', async () => {
  for (const outcome of [
    'built-not-durable',
    'built-needs-review',
    'failed',
    'superseded',
  ]) {
    const fixture = await createFixture();
    fixture.manifest.outcome = outcome;
    await writeFile(
      fixture.request.manifestPath,
      `${JSON.stringify(fixture.manifest, null, 2)}\n`,
    );
    let networkCalled = false;

    await assert.rejects(
      publishS3Static(fixture.request, {
        approved: true,
        command: async () => {
          networkCalled = true;
        },
        httpGet: async () => {
          networkCalled = true;
        },
      }),
      (error) =>
        error.code === 'E_PUBLISH_OUTCOME' &&
        error.message.includes(String(outcome)),
    );
    assert.equal(networkCalled, false);
  }
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
      ['published/initiatives/demo/index.html', fixture.hashes.html],
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
    'published/initiatives/demo/catalog.json',
  );
  assert.equal(argument(artifactPuts[0], '--content-type'), 'application/json');
  assert.equal(
    argument(artifactPuts[0], '--cache-control'),
    'public, max-age=300',
  );
  assert.equal(
    argument(artifactPuts[0], '--checksum-sha256'),
    createHash('sha256')
      .update(
        harness.objects.get('published/initiatives/demo/catalog.json').Body,
      )
      .digest('base64'),
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
    objectVerification: {
      status: 'verified',
      method: 'service-checksum',
      hash: hashBytes(Buffer.from('explainer-kit sentinel\n')),
    },
    publicVerification: {
      status: 'verified',
      httpStatus: 200,
      hash: hashBytes(Buffer.from('explainer-kit sentinel\n')),
    },
    deleted: true,
  });
  assert.equal(receipt.schemaVersion, 'explainer-kit.publish-receipt/v2');
  assert.equal(receipt.publicAccess, 'public');
  assert.deepEqual(
    receipt.artifacts.map(({ relativePath, hash }) => ({ relativePath, hash })),
    [
      {
        relativePath: 'site/initiatives/demo/index.html',
        hash: fixture.hashes.html,
      },
      {
        relativePath: 'site/initiatives/demo/catalog.json',
        hash: receipt.artifacts[1].hash,
      },
    ],
  );
  const catalog = JSON.parse(
    harness.objects.get('published/initiatives/demo/catalog.json').Body,
  );
  assert.deepEqual(
    catalog.artifacts.map(({ id, hash, url }) => ({ id, hash, url })),
    [
      {
        id: 'hub',
        hash: fixture.hashes.html,
        url: 'https://cdn.example.com/published/initiatives/demo/index.html',
      },
    ],
  );
  assert.deepEqual(catalog.sourceBacklinks, fixture.manifest.source.backlinks);
  assert.equal(
    receipt.artifacts[1].hash,
    hashBytes(
      harness.objects.get('published/initiatives/demo/catalog.json').Body,
    ),
  );
  assert.deepEqual(
    JSON.parse(await readFile(fixture.receiptPath, 'utf8')),
    receipt,
  );
  const publishedKeys = harness.calls
    .filter(
      (call) =>
        call[1] === 's3api' &&
        call[2] === 'put-object' &&
        !argument(call, '--key').includes('sentinel'),
    )
    .map((call) => argument(call, '--key'));
  assert.equal(publishedKeys.at(-1), 'published/initiatives/demo/catalog.json');
});

test('verifies protected objects without anonymous fetches and records the skip', async () => {
  const fixture = await createFixture();
  fixture.request.publicAccess = 'protected';
  const harness = fakeDestination();

  const receipt = await publishS3Static(fixture.request, {
    approved: true,
    now: () => NOW,
    randomBytes: () => Buffer.from('0123456789abcdeffedcba9876543210', 'hex'),
    ...harness.dependencies,
    httpGet: unexpectedHttp,
  });

  assert.equal(receipt.publicAccess, 'protected');
  assert.deepEqual(receipt.sentinel.publicVerification, {
    status: 'skipped-protected',
  });
  assert.ok(
    receipt.artifacts.every(
      ({ objectVerification, publicVerification }) =>
        objectVerification.status === 'verified' &&
        publicVerification.status === 'skipped-protected',
    ),
  );
  assert.equal(harness.urls.length, 0);
});

test('rejects a successful public response whose bytes do not match the manifest', async () => {
  const fixture = await createFixture();
  const harness = fakeDestination();
  const httpGet = async (url) => {
    const response = await harness.dependencies.httpGet(url);
    if (!url.includes('sentinel')) {
      return { ...response, body: Buffer.from('stale cached payload') };
    }
    return response;
  };

  await assert.rejects(
    publishS3Static(fixture.request, {
      approved: true,
      ...harness.dependencies,
      httpGet,
    }),
    (error) => error.code === 'E_PUBLISH_VERIFY',
  );
  await assert.rejects(readFile(fixture.receiptPath), { code: 'ENOENT' });
});

test('fails closed when public access returns an undeclared authorization response', async () => {
  const fixture = await createFixture();
  const harness = fakeDestination();

  await assert.rejects(
    publishS3Static(fixture.request, {
      approved: true,
      ...harness.dependencies,
      httpGet: async (url) =>
        url.includes('sentinel')
          ? harness.dependencies.httpGet(url)
          : { status: 403, headers: {}, body: Buffer.from('denied') },
    }),
    (error) =>
      error.code === 'E_PUBLISH_VERIFY' &&
      /public verification failed/i.test(error.message),
  );
  await assert.rejects(readFile(fixture.receiptPath), { code: 'ENOENT' });
});

test('emits no successful receipt when the generated catalog is missing', async () => {
  const fixture = await createFixture();
  const harness = fakeDestination();

  await assert.rejects(
    publishS3Static(fixture.request, {
      approved: true,
      ...harness.dependencies,
      httpGet: async (url) =>
        url.endsWith('/catalog.json')
          ? { status: 404, headers: {}, body: Buffer.from('missing') }
          : harness.dependencies.httpGet(url),
    }),
    (error) => error.code === 'E_PUBLISH_VERIFY',
  );
  await assert.rejects(readFile(fixture.receiptPath), { code: 'ENOENT' });
});

test('hash-verifies binary public payloads without text coercion', async () => {
  const fixture = await createFixture();
  const binary = Buffer.from([0x00, 0xff, 0x89, 0x50, 0x4e, 0x47]);
  const binaryPath = join(fixture.siteRoot, 'initiatives/demo/pixel.png');
  await writeFile(binaryPath, binary);
  const binaryHash = await fileHash(binaryPath);
  fixture.manifest.artifacts.push({
    id: 'pixel',
    type: 'diagram',
    contentPath: 'source/content/pixel.md',
    status: 'built',
    renderedPath: 'site/initiatives/demo/pixel.png',
    mediaType: 'image/png',
    hash: binaryHash,
    rebuildable: false,
    durableEvidence: [
      {
        kind: 'commit',
        ref: 'a'.repeat(40),
        paths: ['site/initiatives/demo/pixel.png'],
        attestedAt: NOW,
      },
    ],
  });
  fixture.manifest.immutableHashes['source/content/pixel.md'] =
    `sha256:${'f'.repeat(64)}`;
  fixture.manifest.immutableHashes['site/initiatives/demo/pixel.png'] =
    binaryHash;
  await writeFile(
    fixture.request.manifestPath,
    `${JSON.stringify(fixture.manifest, null, 2)}\n`,
  );
  const harness = fakeDestination();
  const bodies = new Map([
    [
      'https://cdn.example.com/published/initiatives/demo/index.html',
      await readFile(join(fixture.siteRoot, 'initiatives/demo/index.html')),
    ],
    ['https://cdn.example.com/published/initiatives/demo/pixel.png', binary],
  ]);

  const receipt = await publishS3Static(fixture.request, {
    approved: true,
    ...harness.dependencies,
    httpGet: async (url) =>
      url.includes('sentinel')
        ? harness.dependencies.httpGet(url)
        : {
            status: 200,
            headers: {
              'content-type': url.endsWith('.png')
                ? 'image/png'
                : url.endsWith('.json')
                  ? 'application/json'
                  : 'text/html; charset=utf-8',
            },
            body:
              bodies.get(url) ??
              harness.objects.get('published/initiatives/demo/catalog.json')
                ?.Body,
          },
  });

  assert.equal(
    receipt.artifacts.find(({ relativePath }) =>
      relativePath.endsWith('pixel.png'),
    ).hash,
    binaryHash,
  );
});

test('forces JSON metadata output and retries transient metadata reads', async () => {
  const fixture = await createFixture();
  const harness = fakeDestination();
  let transientFailures = 0;
  const command = async (file, args) => {
    if (
      args[1] === 'head-object' &&
      !argument([file, ...args], '--key').includes('sentinel') &&
      transientFailures < 2
    ) {
      transientFailures += 1;
      throw Object.assign(new Error('Service Unavailable'), {
        stderr: '503 Service Unavailable',
      });
    }
    return harness.dependencies.command(file, args);
  };

  await publishS3Static(fixture.request, {
    approved: true,
    ...harness.dependencies,
    command,
    sleep: async () => {},
  });

  assert.equal(transientFailures, 2);
  const parsedMetadataCalls = harness.calls.filter(
    (call) => call[1] === 's3api' && call[2] === 'head-object',
  );
  assert.ok(parsedMetadataCalls.length > 0);
  assert.ok(
    parsedMetadataCalls.every((call) => argument(call, '--output') === 'json'),
  );
  assert.ok(
    parsedMetadataCalls.every(
      (call) => argument(call, '--checksum-mode') === 'ENABLED',
    ),
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
  await writeFile(htmlPath, '<!doctype html><title>Demo</title>\n');
  const hashes = {
    html: await fileHash(htmlPath),
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
      backlinks: [
        {
          sourceId: 'implementation',
          url: `https://github.com/acme/project/blob/${'1'.repeat(40)}/implementation.md#L4-L9`,
        },
      ],
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
        durableEvidence: [
          {
            kind: 'commit',
            ref: 'a'.repeat(40),
            paths: ['site/initiatives/demo/index.html'],
            attestedAt: NOW,
          },
        ],
      },
    ],
    immutableHashes: {
      'run-request.json': `sha256:${'a'.repeat(64)}`,
      'source/content-approval.json': `sha256:${'a'.repeat(64)}`,
      'source/fact-base.json': `sha256:${'a'.repeat(64)}`,
      'source/fact-base.md': `sha256:${'a'.repeat(64)}`,
      'source/content/hub.md': `sha256:${'c'.repeat(64)}`,
      'theme.resolved.json': `sha256:${'b'.repeat(64)}`,
      'site/initiatives/demo/index.html': hashes.html,
    },
    outcome: 'built-durable',
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
    schemaVersion: 'explainer-kit.publish-request/v2',
    provider: 's3-static',
    s3Uri: 's3://example-bucket/published/',
    publicBaseUrl: 'https://cdn.example.com/published/',
    awsRegion: 'us-east-1',
    awsProfile: 'test-profile',
    publicAccess: 'public',
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
      (() => {
        const body = key.endsWith('.json')
          ? Buffer.from('{}\n')
          : Buffer.from('<!doctype html><title>Demo</title>\n');
        return {
          ContentType: key.endsWith('.json')
            ? 'application/json'
            : 'text/html; charset=utf-8',
          CacheControl: 'public, max-age=300',
          Metadata: { 'explainer-sha256': hash.slice('sha256:'.length) },
          ChecksumSHA256: createHash('sha256').update(body).digest('base64'),
          Body: body,
        };
      })(),
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
      throw Object.assign(new Error('Not Found'), {
        stderr: 'An error occurred (404) when calling the HeadObject operation',
      });
    }
    if (operation === 'put-object') {
      const body = await readFile(argument(call, '--body'));
      objects.set(key, {
        ContentType: argument(call, '--content-type'),
        CacheControl: argument(call, '--cache-control'),
        Metadata: {
          'explainer-sha256': argument(call, '--metadata').split('=')[1],
        },
        ChecksumSHA256: createHash('sha256').update(body).digest('base64'),
        Body: body,
      });
    }
    if (operation === 'delete-object') {
      objects.delete(key);
    }
    return { stdout: '{}', stderr: '' };
  };
  const httpGet = async (url) => {
    urls.push(url);
    const sentinel = url.includes('sentinel');
    const key = `published/${new URL(url).pathname
      .split('/published/')[1]
      ?.replace(/^\/+/, '')}`;
    const object = objects.get(key);
    return {
      status: sentinel ? publicSentinelStatus : 200,
      headers: {
        'content-type': url.endsWith('.json')
          ? 'application/json'
          : url.endsWith('.png')
            ? 'image/png'
            : 'text/html; charset=utf-8',
      },
      body: sentinel
        ? Buffer.from('explainer-kit sentinel\n')
        : (object?.Body ??
          (url.endsWith('.json')
            ? Buffer.from('{}\n')
            : Buffer.from('<!doctype html><title>Demo</title>\n'))),
    };
  };
  return { calls, urls, objects, dependencies: { command, httpGet } };
}

function argument(call, flag) {
  const index = call.indexOf(flag);
  return index === -1 ? undefined : call[index + 1];
}

async function fileHash(path) {
  return hashBytes(await readFile(path));
}

function hashBytes(bytes) {
  return `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
}

async function unexpectedCommand() {
  throw new Error('command seam must not be called');
}

async function unexpectedHttp() {
  throw new Error('HTTP seam must not be called');
}
