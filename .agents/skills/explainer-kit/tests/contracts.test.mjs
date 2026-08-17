import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, test } from 'node:test';

import {
  catalogFromManifest,
  serializeInitiativeCatalog,
  validateInitiativeCatalog,
} from '../scripts/lib/catalog.mjs';
import {
  canonicalHash,
  validateContract,
  visualReviewRequestId,
} from '../scripts/lib/contracts.mjs';
import { normalizePublishRoots } from '../scripts/lib/s3-roots.mjs';
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
      authorResultPaths: ['source/author/hub.json'],
      backlinks: [
        {
          sourceId: 'plan',
          url: `https://github.com/acme/project/blob/${'1'.repeat(40)}/plan.md#L1-L8`,
        },
      ],
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
      'run-request.json': HASH_A,
      'source/content-approval.json': HASH_A,
      'source/author/hub.json': HASH_A,
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

function publishRequestV2(publicAccess = 'public') {
  return {
    ...publishRequest(),
    schemaVersion: 'explainer-kit.publish-request/v2',
    publicAccess,
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

function verifiedObject(hash = HASH_B) {
  return { status: 'verified', method: 'service-checksum', hash };
}

function verifiedPublic(hash = HASH_B) {
  return { status: 'verified', httpStatus: 200, hash };
}

function publishReceiptV2(publicAccess = 'public') {
  return {
    schemaVersion: 'explainer-kit.publish-receipt/v2',
    provider: 's3-static',
    publishedAt: NOW,
    publicAccess,
    roots: {
      s3Uri: 's3://example/explainers',
      publicBaseUrl: 'https://example.com/explainers',
    },
    sentinel: {
      relativePath: '.sentinel',
      objectVerification: verifiedObject(HASH_A),
      publicVerification:
        publicAccess === 'public'
          ? verifiedPublic(HASH_A)
          : { status: 'skipped-protected' },
      deleted: true,
    },
    artifacts: [
      {
        source: { kind: 'manifest', artifactId: 'hub' },
        relativePath: 'site/index.html',
        hash: HASH_B,
        s3Uri: 's3://example/explainers/index.html',
        publicUrl: 'https://example.com/explainers/index.html',
        contentType: 'text/html',
        objectVerification: verifiedObject(),
        publicVerification:
          publicAccess === 'public'
            ? verifiedPublic()
            : { status: 'skipped-protected' },
      },
    ],
  };
}

test('accepts immutable publish request v1 replay and explicit v2 access modes', () => {
  for (const request of [
    publishRequest(),
    publishRequestV2('public'),
    publishRequestV2('protected'),
    {
      ...publishRequestV2('public'),
      s3Uri: 's3://example/explainers/projects/Roadmap%20%26%20caf%C3%A9',
      publicBaseUrl:
        'https://example.com/explainers/projects/Roadmap%20%26%20caf%C3%A9',
    },
  ]) {
    assert.deepEqual(validateContract('publish-request', request), {
      valid: true,
      errors: [],
    });
  }

  const missingAccess = publishRequestV2();
  delete missingAccess.publicAccess;
  assert.equal(validateContract('publish-request', missingAccess).valid, false);

  const invalidAccess = publishRequestV2('private');
  assert.equal(validateContract('publish-request', invalidAccess).valid, false);

  for (const publish of [publishRequest(), publishRequestV2('protected')]) {
    const request = runRequest();
    request.durability = { strategy: 'publish', publish };
    assert.deepEqual(validateContract('run-request', request), {
      valid: true,
      errors: [],
    });
  }
});

const UNSAFE_ROOT_PAIRS = [
  [
    'credential-bearing authority',
    's3://access-key:secret@example-bucket/explainers',
    'https://docs.example.com/explainers',
  ],
  [
    'encoded authority delimiter',
    's3://access-key%40example-bucket/explainers',
    'https://docs.example.com/explainers',
  ],
  [
    'authority colon',
    's3://example-bucket:443/explainers',
    'https://docs.example.com/explainers',
  ],
  [
    'query',
    's3://example-bucket/explainers?version=1',
    'https://docs.example.com/explainers',
  ],
  [
    'fragment',
    's3://example-bucket/explainers#latest',
    'https://docs.example.com/explainers',
  ],
  [
    'invalid bucket',
    's3://Example_Bucket/explainers',
    'https://docs.example.com/explainers',
  ],
  [
    'literal dot segment',
    's3://example-bucket/a/../b',
    'https://docs.example.com/a/../b',
  ],
  [
    'encoded dot segment',
    's3://example-bucket/a/%2e%2e/b',
    'https://docs.example.com/a/%2e%2e/b',
  ],
  [
    'encoded separator',
    's3://example-bucket/a%2fb',
    'https://docs.example.com/a%2fb',
  ],
  [
    'repeated slash',
    's3://example-bucket/a//b',
    'https://docs.example.com/a//b',
  ],
];

test('rejects unsafe or divergent v2 publication roots at every contract surface', () => {
  for (const [label, s3Uri, publicBaseUrl] of UNSAFE_ROOT_PAIRS) {
    const request = {
      ...publishRequestV2('protected'),
      s3Uri,
      publicBaseUrl,
    };
    assert.equal(
      validateContract('publish-request', request).valid,
      false,
      `direct request: ${label}`,
    );

    const run = runRequest();
    run.durability = { strategy: 'publish', publish: request };
    assert.equal(
      validateContract('run-request', run).valid,
      false,
      `embedded request: ${label}`,
    );

    const receipt = publishReceiptV2('protected');
    receipt.roots = { s3Uri, publicBaseUrl };
    assert.equal(
      validateContract('publish-receipt', receipt).valid,
      false,
      `receipt roots: ${label}`,
    );
  }
});

test('validates publication roots for every publish-request version, not just v2', () => {
  // Regression: `validatePublicationRoots` used to gate the whole semantic check
  // on `schemaVersion === 'explainer-kit.publish-request/v2'`, so a v1 block was
  // returned unvalidated and a credential-bearing root reached `initializeRun`
  // and was persisted verbatim to `run-request.json`.
  const versions = [
    'explainer-kit.publish-request/v1',
    'explainer-kit.publish-request/v2',
    // A version this build does not know must still be screened, so a future
    // v3 cannot reintroduce the bypass by virtue of not matching a literal.
    'explainer-kit.publish-request/v3',
  ];

  for (const [label, s3Uri, publicBaseUrl] of UNSAFE_ROOT_PAIRS) {
    for (const schemaVersion of versions) {
      const request = {
        ...publishRequestV2('protected'),
        schemaVersion,
        s3Uri,
        publicBaseUrl,
      };

      const direct = validateContract('publish-request', request);
      assert.equal(direct.valid, false, `direct ${schemaVersion}: ${label}`);
      assert.ok(
        direct.errors.some((error) => error.code === 'publish-roots'),
        `direct ${schemaVersion} raises publish-roots: ${label}`,
      );

      const run = runRequest();
      run.durability = { strategy: 'publish', publish: request };
      const embedded = validateContract('run-request', run);
      assert.equal(
        embedded.valid,
        false,
        `embedded ${schemaVersion}: ${label}`,
      );
      assert.ok(
        embedded.errors.some((error) => error.code === 'publish-roots'),
        `embedded ${schemaVersion} raises publish-roots: ${label}`,
      );
    }
  }
});

test('rejects credential-bearing publication roots identically at v1 and v2', () => {
  // Exact reproduction from the final review: two run-requests identical apart
  // from `schemaVersion` and v2's required `publicAccess`.
  const leaking = {
    s3Uri: 's3://AKIAV1LEAK:supersecret@example-bucket/p',
    publicBaseUrl: 'https://user:pass@cdn.example.com/p',
  };

  for (const publish of [
    { ...publishRequest(), ...leaking },
    { ...publishRequestV2('public'), ...leaking },
  ]) {
    const run = runRequest();
    run.durability = { strategy: 'publish', publish };
    const result = validateContract('run-request', run);
    assert.equal(result.valid, false, publish.schemaVersion);
    assert.ok(
      result.errors.some((error) => error.code === 'publish-roots'),
      `${publish.schemaVersion} raises publish-roots`,
    );
  }
});

test('screens publication roots for every publish-receipt version', () => {
  // The request gate was made version-agnostic by p07-t01, but the receipt
  // branch one level below kept an exact `.../v2` pin, so a `publish-receipt/v1`
  // carried credential-bearing and internal-address roots through to
  // `publish-receipt.json` and the `publish-summary/v1` projection.
  const unsafe = [
    [
      'credential-bearing S3 authority',
      's3://AKIAV1LEAK:supersecret@example-bucket/p',
      'https://cdn.example.com/p',
    ],
    [
      'AWS IMDS public root',
      's3://example-bucket/p',
      'https://169.254.169.254/p',
    ],
    ['loopback public root', 's3://example-bucket/p', 'https://127.0.0.1/p'],
    [
      'userinfo in public root',
      's3://example-bucket/p',
      'https://user:pass@cdn.example.com/p',
    ],
  ];

  for (const [label, s3Uri, publicBaseUrl] of unsafe) {
    for (const receipt of [publishReceipt(), publishReceiptV2('public')]) {
      receipt.roots = { s3Uri, publicBaseUrl };
      const result = validateContract('publish-receipt', receipt);
      assert.equal(result.valid, false, `${receipt.schemaVersion}: ${label}`);
      assert.ok(
        result.errors.some((error) => error.code === 'publish-roots'),
        `${receipt.schemaVersion} raises publish-roots: ${label}`,
      );
    }
  }

  // v1 is retained for replay, so it must still tolerate non-canonical
  // historical forms that v2 rejects. Only the canonical-form assertion is
  // version-gated; credential and address screening is not.
  const nonCanonical = {
    s3Uri: 's3://example/explainers/',
    publicBaseUrl: 'https://example.com/explainers/',
  };
  const replay = publishReceipt();
  replay.roots = { ...nonCanonical };
  assert.equal(
    validateContract('publish-receipt', replay).valid,
    true,
    'v1 replay tolerates non-canonical roots',
  );

  const strict = publishReceiptV2('public');
  strict.roots = { ...nonCanonical };
  assert.ok(
    validateContract('publish-receipt', strict).errors.some(
      ({ code }) => code === 'publish-roots',
    ),
    'v2 still requires canonical roots',
  );
});

test('retains benign v1 publication roots under version-agnostic validation', () => {
  // Closing the v1 bypass must not break legitimate v1 replay.
  const benign = [
    ['bare bucket', 's3://example-bucket', 'https://cdn.example.com'],
    [
      'single segment',
      's3://example-bucket/explainers',
      'https://cdn.example.com/explainers',
    ],
    [
      'nested segments',
      's3://example-bucket/repositories/duet',
      'https://cdn.example.com/repositories/duet',
    ],
    [
      'dotted bucket',
      's3://example.bucket.name/p',
      'https://cdn.example.com/p',
    ],
    [
      'divergent hosts',
      's3://vox-media-open-agent-toolkit/repositories/duet',
      'https://open-agent-toolkit.voxops.net/repositories/duet',
    ],
    [
      'percent-encoded segment',
      's3://example-bucket/projects/Roadmap%20%26%20caf%C3%A9',
      'https://cdn.example.com/projects/Roadmap%20%26%20caf%C3%A9',
    ],
  ];

  for (const [label, s3Uri, publicBaseUrl] of benign) {
    assert.deepEqual(
      validateContract('publish-request', {
        ...publishRequest(),
        s3Uri,
        publicBaseUrl,
      }),
      { valid: true, errors: [] },
      `benign v1: ${label}`,
    );
  }
});

test('rejects control characters and backslashes in both publication roots', () => {
  // `\s` matches only space, tab, newline, CR, FF and VT, so the rest of the C0
  // range and DEL previously reached S3 keys, public URLs, receipts and terminal
  // output. NUL additionally crashed `execFile` with an uncoded error rather
  // than a clean `E_PUBLISH_ROOTS`.
  const controls = [
    ['NUL', 0x00],
    ['SOH', 0x01],
    ['ESC', 0x1b],
    ['DEL', 0x7f],
    ['LF', 0x0a],
    ['TAB', 0x09],
    ['CR', 0x0d],
  ];

  const unsafe = [];
  for (const [name, code] of controls) {
    const char = String.fromCharCode(code);
    unsafe.push([
      `${name} in s3Uri`,
      `s3://example-bucket/p${char}x`,
      'https://cdn.example.com/p',
    ]);
    unsafe.push([
      `${name} in publicBaseUrl`,
      's3://example-bucket/p',
      `https://cdn.example.com/p${char}x`,
    ]);
  }
  // `parseS3Root` already screened `\`; `parsePublicRoot` did not, so
  // `https://ex.com\evil/p` was silently normalized to `https://ex.com/p`.
  unsafe.push([
    'backslash in publicBaseUrl',
    's3://example-bucket/p',
    'https://ex.com\\evil/p',
  ]);
  unsafe.push([
    'backslash in s3Uri',
    's3://example-bucket\\evil/p',
    'https://cdn.example.com/p',
  ]);

  for (const [label, s3Uri, publicBaseUrl] of unsafe) {
    assert.throws(
      () => normalizePublishRoots(s3Uri, publicBaseUrl),
      (error) => error.code === 'E_PUBLISH_ROOTS',
      `normalize: ${label}`,
    );

    // The same shapes must be rejected at the contract surface, at both
    // publish-request versions.
    for (const request of [publishRequest(), publishRequestV2('protected')]) {
      const result = validateContract('publish-request', {
        ...request,
        s3Uri,
        publicBaseUrl,
      });
      assert.equal(
        result.valid,
        false,
        `${request.schemaVersion} contract: ${label}`,
      );
    }
  }
});

test('documents complete receipt v2 consumption and immutable v1 replay', async () => {
  const guidance = await readFile(
    new URL('../references/extension-contract.md', import.meta.url),
    'utf8',
  );

  assert.match(guidance, /publish-receipt\/v2/i);
  assert.match(guidance, /complete.*manifest.*catalog.*evidence/i);
  assert.match(guidance, /publish-receipt\/v1.*replay/is);
  assert.doesNotMatch(guidance, /complete `PublishReceiptV1`/);
});

test('documents project-recap v2 as the current producer policy with immutable v1 replay', async () => {
  const guidance = await readFile(
    new URL('../references/contracts.md', import.meta.url),
    'utf8',
  );
  const producerPolicy = guidance.slice(
    guidance.indexOf('New project recap producers'),
    guidance.indexOf('Before artifact authoring'),
  );

  assert.match(
    producerPolicy,
    /project-recap@2[\s\S]*navigational hub[\s\S]*only mandatory artifact/i,
  );
  for (const requirement of [
    /diagram/i,
    /deck/i,
    /deep dive/i,
    /distinct reader\s+question/i,
    /source evidence/i,
    /rationale/i,
  ]) {
    assert.match(producerPolicy, requirement);
  }
  assert.match(
    producerPolicy,
    /project-recap@1[\s\S]*immutable\s+replay guidance/i,
  );
  assert.match(
    guidance,
    /"recipe": \{ "id": "project-recap", "version": "2" \}/,
  );
  assert.doesNotMatch(
    guidance,
    /"recipe": \{ "id": "project-recap", "version": "1" \}/,
  );
  assert.doesNotMatch(
    guidance,
    /same adaptive hub, architecture, and deck identities/i,
  );
});

test('accepts publish receipt v1 replay and explicit v2 verification facts', () => {
  for (const receipt of [
    publishReceipt(),
    publishReceiptV2('public'),
    publishReceiptV2('protected'),
  ]) {
    assert.deepEqual(validateContract('publish-receipt', receipt), {
      valid: true,
      errors: [],
    });
  }
});

test('binds the initiative catalog wire shape to its declared version', () => {
  // The catalog is serialized and hashed into the publish receipt, so any root
  // key change is a wire-format change. p07 added `publicVerification` while
  // leaving the version at v1, putting two shapes behind one identifier for
  // consumers that parse catalog.json by declared version. Nothing pinned
  // either value, so nothing failed.
  //
  // Both expectations below are literals on purpose: deriving them from
  // catalogFromManifest would make this test agree with any change it makes.
  // Adding or removing a root key now forces a deliberate edit here, next to
  // the version string that must move with it.
  const catalog = catalogFromManifest(
    manifest(),
    'https://cdn.example.com/published/',
    { publicAccess: 'public' },
  );

  assert.equal(catalog.schemaVersion, 'explainer-kit.initiative-catalog/v2');
  assert.deepEqual(Object.keys(catalog).sort(), [
    'artifacts',
    'createdAt',
    'publicVerification',
    'recipe',
    'runId',
    'schemaVersion',
    'slug',
    'sourceBacklinks',
  ]);
});

test('derives an exact, absolute initiative catalog from the finalized manifest', () => {
  const finalized = manifest();
  const catalog = catalogFromManifest(
    finalized,
    'https://cdn.example.com/published/',
    { publicAccess: 'public' },
  );

  assert.deepEqual(
    catalog.artifacts.map(({ id, hash, url }) => ({ id, hash, url })),
    [
      {
        id: 'hub',
        hash: HASH_B,
        url: 'https://cdn.example.com/published/index.html',
      },
    ],
  );
  assert.deepEqual(catalog.sourceBacklinks, finalized.source.backlinks);
  assert.deepEqual(
    validateInitiativeCatalog(
      catalog,
      finalized,
      'https://cdn.example.com/published/',
      { publicAccess: 'public' },
    ),
    {
      valid: true,
      errors: [],
    },
  );

  const stale = structuredClone(catalog);
  stale.artifacts[0].hash = HASH_A;
  assert.ok(
    validateInitiativeCatalog(
      stale,
      finalized,
      'https://cdn.example.com/published/',
      { publicAccess: 'public' },
    ).errors.some(({ code }) => code === 'catalog-artifact-mismatch'),
  );
});

test('refuses to build or validate a catalog without an explicit access policy', () => {
  // The marker is part of the serialized bytes and therefore of the hash the
  // receipt records. A silent default to the permissive `public` branch is what
  // let four call sites omit it and still produce a plausible-looking catalog,
  // so omission must be loud rather than merely wrong.
  const finalized = manifest();
  const base = 'https://cdn.example.com/published';

  for (const badOptions of [undefined, null, {}, { publicAccess: undefined }]) {
    const omitted =
      badOptions === undefined ||
      badOptions === null ||
      !('publicAccess' in badOptions);
    if (!omitted) continue;
    assert.throws(
      () => catalogFromManifest(finalized, base, badOptions),
      /explicit \{ publicAccess \} policy/,
      `catalogFromManifest: ${JSON.stringify(badOptions)}`,
    );
    assert.throws(
      () =>
        validateInitiativeCatalog(
          catalogFromManifest(finalized, base, { publicAccess: 'public' }),
          finalized,
          base,
          badOptions,
        ),
      /explicit \{ publicAccess \} policy/,
      `validateInitiativeCatalog: ${JSON.stringify(badOptions)}`,
    );
  }

  // Explicitly stating `undefined` is the correct reading for v1 records, which
  // have no such field, and must be accepted as `public`.
  assert.equal(
    catalogFromManifest(finalized, base, { publicAccess: undefined })
      .publicVerification,
    'required',
  );

  // And the two markers really do produce different bytes, which is the whole
  // reason the policy has to be threaded rather than defaulted.
  assert.notEqual(
    serializeInitiativeCatalog(
      catalogFromManifest(finalized, base, { publicAccess: 'public' }),
    ),
    serializeInitiativeCatalog(
      catalogFromManifest(finalized, base, { publicAccess: 'protected' }),
    ),
  );
});

test('binds initiative catalog URLs to the exact normalized publish root', () => {
  const finalized = manifest();
  const base = 'https://cdn.example.com/published';
  const catalog = catalogFromManifest(finalized, base, {
    publicAccess: 'public',
  });
  const mutations = [
    ['wrong origin', 'https://other.example.com/published/index.html'],
    ['wrong base', 'https://cdn.example.com/elsewhere/index.html'],
    ['credentials', 'https://user:secret@cdn.example.com/published/index.html'],
    ['query', `${catalog.artifacts[0].url}?token=secret`],
    ['fragment', `${catalog.artifacts[0].url}#stale`],
    ['encoded mutation', 'https://cdn.example.com/published/%69ndex.html'],
  ];
  for (const [label, url] of mutations) {
    const changed = structuredClone(catalog);
    changed.artifacts[0].url = url;
    assert.equal(
      validateInitiativeCatalog(changed, finalized, base, {
        publicAccess: 'public',
      }).valid,
      false,
      label,
    );
  }

  const unknown = structuredClone(catalog);
  unknown.artifacts[0].extra = true;
  assert.equal(
    validateInitiativeCatalog(unknown, finalized, base, {
      publicAccess: 'public',
    }).valid,
    false,
  );

  const duplicate = structuredClone(catalog);
  duplicate.artifacts.push(structuredClone(duplicate.artifacts[0]));
  assert.equal(
    validateInitiativeCatalog(duplicate, finalized, base, {
      publicAccess: 'public',
    }).valid,
    false,
  );
});

test('requires publish receipts to cover the exact manifest and generated catalog', () => {
  const finalized = manifest();
  const catalog = catalogFromManifest(
    finalized,
    'https://example.com/explainers',
    { publicAccess: 'public' },
  );
  const catalogHash = `sha256:${createHash('sha256')
    .update(Buffer.from(serializeInitiativeCatalog(catalog)))
    .digest('hex')}`;
  const receipt = publishReceiptV2();
  receipt.artifacts.push({
    source: { kind: 'auxiliary', name: 'catalog' },
    relativePath: 'site/initiatives/demo-project/catalog.json',
    hash: catalogHash,
    s3Uri: 's3://example/explainers/initiatives/demo-project/catalog.json',
    publicUrl:
      'https://example.com/explainers/initiatives/demo-project/catalog.json',
    contentType: 'application/json',
    objectVerification: verifiedObject(catalogHash),
    publicVerification: verifiedPublic(catalogHash),
  });
  const context = {
    manifest: finalized,
    catalogArtifact: {
      relativePath: 'site/initiatives/demo-project/catalog.json',
      hash: catalogHash,
    },
  };

  assert.equal(
    validateContract('publish-receipt', receipt, context).valid,
    true,
  );

  const mutations = [
    [
      'missing manifest artifact',
      (candidate) => {
        candidate.artifacts.shift();
      },
    ],
    [
      'duplicate artifact',
      (candidate) => {
        const duplicate = structuredClone(candidate.artifacts[0]);
        duplicate.contentType = 'application/octet-stream';
        candidate.artifacts.push(duplicate);
      },
    ],
    [
      'foreign source',
      (candidate) => {
        candidate.artifacts[0].source.artifactId = 'foreign';
      },
    ],
    [
      'wrong hash',
      (candidate) => {
        candidate.artifacts[0].hash = HASH_A;
      },
    ],
    [
      'missing catalog',
      (candidate) => {
        candidate.artifacts.pop();
      },
    ],
  ];
  for (const [label, mutate] of mutations) {
    const candidate = structuredClone(receipt);
    mutate(candidate);
    assert.equal(
      validateContract('publish-receipt', candidate).valid,
      true,
      `${label} remains schema-valid`,
    );
    assert.equal(
      validateContract('publish-receipt', candidate, context).valid,
      false,
      label,
    );
  }
});

function authorRequestV2() {
  return {
    schemaVersion: 'explainer-kit.author-request/v2',
    artifactId: 'project-recap',
    artifactType: 'hub',
    authoring: 'markdown',
    brief: '# Project recap author brief',
    visualAuthoringGuidance:
      'Representation, hierarchy, responsive navigation, table, diagram, and deck guidance.',
    factBase: factBase(),
    theme: theme(),
    setContext: setPlan(),
    plannedArtifact: setPlan().portfolio[0],
    floor: {
      requiredNarrative: ['context', 'architecture', 'validation'],
    },
  };
}

function authorRequestV3() {
  return {
    ...authorRequestV2(),
    schemaVersion: 'explainer-kit.author-request/v3',
    artifactLinks: [
      {
        artifactId: 'project-recap',
        artifactType: 'hub',
        sitePath: 'site/initiatives/demo-project/index.html',
        href: 'index.html',
      },
      {
        artifactId: 'system-visual',
        artifactType: 'diagram',
        sitePath: 'site/diagrams/demo-project/system-visual/index.html',
        href: '../../diagrams/demo-project/system-visual/index.html',
      },
      {
        artifactId: 'walkthrough-deck',
        artifactType: 'deck',
        sitePath: 'site/decks/demo-project/walkthrough-deck/index.html',
        href: '../../decks/demo-project/walkthrough-deck/index.html',
      },
      {
        artifactId: 'runtime-deep-dive',
        artifactType: 'explainer',
        sitePath: 'site/explainers/demo-project/runtime-deep-dive/index.html',
        href: '../../explainers/demo-project/runtime-deep-dive/index.html',
      },
    ],
  };
}

function setPlan() {
  return {
    schemaVersion: 'explainer-kit.set-plan/v1',
    planId: 'project-recap-set',
    recipe: { id: 'project-recap', version: '1' },
    sourceIds: ['plan'],
    ledger: {
      terminology: [{ term: 'set planner', meaning: 'One planning callback.' }],
      statuses: [{ subject: 'runtime', value: 'in progress' }],
      numbers: [{ subject: 'required artifacts', value: 3, unit: 'artifacts' }],
    },
    portfolio: [
      {
        artifactId: 'project-recap',
        artifactType: 'hub',
        profileId: 'recap-hub',
        required: true,
        sourceIds: ['plan'],
        draft: 'Lead with the validated project outcome.',
        visualIntent: 'Orient the reader in the first viewport.',
      },
      {
        artifactId: 'system-visual',
        artifactType: 'diagram',
        profileId: 'architecture-system',
        required: true,
        sourceIds: ['plan'],
        draft: 'Show the core boundary and its adapter.',
        visualIntent: 'Preserve system relationships.',
      },
      {
        artifactId: 'walkthrough-deck',
        artifactType: 'deck',
        profileId: 'walkthrough-deck',
        required: true,
        sourceIds: ['plan'],
        draft: 'Sequence the request, architecture, and outcome.',
        visualIntent: 'Tell one paced project story.',
      },
      {
        artifactId: 'runtime-deep-dive',
        artifactType: 'explainer',
        profileId: 'deep-dive',
        required: false,
        sourceIds: ['plan'],
        draft: 'Explain the retained records in detail.',
        visualIntent: 'Keep mechanics out of the hub.',
        justification: {
          kind: 'source-backed-detail',
          sourceIds: ['plan'],
          rationale: 'The retained-record mechanics need dedicated space.',
        },
      },
    ],
  };
}

function visualReviewRequest() {
  const payload = {
    schemaVersion: 'explainer-kit.visual-review-request/v1',
    browserRuntime: {
      kind: 'launched',
      name: 'chromium',
      version: '123.0.6312.0',
    },
    captureIdentity: HASH_A,
    plan: setPlan(),
    renderedArtifacts: setPlan().portfolio.map(({ artifactId }) => ({
      artifactId,
      renderedPath: `site/${artifactId}/index.html`,
      renderedHash: HASH_A,
      cohesionObservations: [
        {
          artifactId,
          contentHash: HASH_A,
          group: 'terminology',
          claim: 'set planner',
          value: 'set planner',
        },
        {
          artifactId,
          contentHash: HASH_A,
          group: 'statuses',
          claim: 'runtime',
          value: 'in progress',
        },
        {
          artifactId,
          contentHash: HASH_A,
          group: 'numericClaims',
          claim: 'required artifacts',
          value: 3,
        },
      ],
      evidence: [
        {
          viewport: 'desktop',
          screenshotPath: `qa/${artifactId}-desktop.png`,
          screenshotHash: HASH_A,
          metricsPath: `qa/${artifactId}-desktop.json`,
          metricsHash: HASH_B,
          captureIdentity: HASH_A,
        },
      ],
    })),
  };
  const requestHash = canonicalHash(payload);
  return {
    ...payload,
    requestId: visualReviewRequestId(requestHash),
    requestHash,
  };
}

function visualReviewResult() {
  const request = visualReviewRequest();
  return {
    schemaVersion: 'explainer-kit.visual-review-result/v1',
    reviewId: 'visual-review-1',
    requestId: request.requestId,
    requestHash: request.requestHash,
    reviewedAt: NOW,
    disposition: 'correct',
    artifactIds: setPlan().portfolio.map(({ artifactId }) => artifactId),
    findings: [
      {
        artifactId: 'project-recap',
        rubric: 'first-viewport',
        severity: 'important',
        evidence: 'The primary outcome begins below the fold.',
        correction: 'Move the outcome summary into the lead panel.',
      },
    ],
  };
}

function terminalEvidence(outcome = 'failed') {
  const terminalManifest = manifest();
  terminalManifest.outcome = outcome;
  return {
    schemaVersion: 'explainer-kit.terminal-evidence/v1',
    runId: terminalManifest.runId,
    outcome,
    manifestHash: canonicalHash(terminalManifest),
    reasons: [
      {
        stage: outcome === 'failed' ? 'durability' : 'visual-review',
        kind: outcome === 'failed' ? 'provider-failure' : 'finding',
        artifactId: 'hub',
        count: 1,
      },
    ],
    evidenceDisposition: 'retained',
  };
}

function visualReviewEvidence(disposition = 'correct') {
  const request = visualReviewRequest();
  return {
    schemaVersion: 'explainer-kit.visual-review-evidence/v1',
    requestHash: request.requestHash,
    attempt: 1,
    disposition,
    reasons:
      disposition === 'pass'
        ? []
        : [
            {
              stage: 'visual-review',
              kind: disposition === 'correct' ? 'finding' : 'provider-failure',
              artifactId: request.renderedArtifacts[0].artifactId,
              count: 1,
            },
          ],
  };
}

function authorResultV2() {
  return {
    schemaVersion: 'explainer-kit.author-result/v2',
    artifactId: 'project-recap',
    content: {
      markdown: '# Project recap\n\nA concise, evidence-backed recap.',
    },
    provenance: {
      authorId: 'author-agent',
      generatedAt: NOW,
      method: 'brief-guided',
    },
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

test('accepts built-needs-review as a matched non-durable terminal outcome', () => {
  const record = buildRecord();
  record.outcome = 'built-needs-review';
  const value = manifest();
  value.outcome = 'built-needs-review';
  value.buildRecord.hash = canonicalHash(record);

  assert.equal(validateContract('build-record', record).valid, true);
  assert.equal(
    validateContract('manifest', value, { buildRecord: record }).valid,
    true,
  );
});

test('validates author contract v2 by kind, kind+version, and schema id', () => {
  const request = authorRequestV2();
  const result = authorResultV2();

  for (const kind of [
    'author-request',
    'author-request/v2',
    'explainer-kit.author-request/v2',
  ]) {
    assert.deepEqual(validateContract(kind, request), {
      valid: true,
      errors: [],
    });
  }

  for (const kind of [
    'author-result',
    'author-result/v2',
    'explainer-kit.author-result/v2',
  ]) {
    assert.deepEqual(validateContract(kind, result), {
      valid: true,
      errors: [],
    });
  }
});

test('validates canonical author link tables while retaining v2 replay', () => {
  const legacy = authorRequestV2();
  const current = authorRequestV3();

  assert.deepEqual(validateContract('author-request/v2', legacy), {
    valid: true,
    errors: [],
  });
  for (const kind of [
    'author-request',
    'author-request/v3',
    'explainer-kit.author-request/v3',
  ]) {
    assert.deepEqual(validateContract(kind, current), {
      valid: true,
      errors: [],
    });
  }

  const missingArtifact = structuredClone(current);
  missingArtifact.artifactLinks.pop();
  assert.ok(
    validateContract('author-request', missingArtifact).errors.some(
      ({ code }) => code === 'artifact-link-parity',
    ),
  );

  const directoryStyle = structuredClone(current);
  directoryStyle.artifactLinks[1].href =
    '../../diagrams/demo-project/system-visual/';
  assert.equal(validateContract('author-request', directoryStyle).valid, false);
});

test('validates provider-neutral set planning and visual review envelopes', () => {
  const reviewRequest = visualReviewRequest();
  for (const [kind, fixture, context] of [
    ['set-plan', setPlan(), undefined],
    ['visual-review-request', reviewRequest, undefined],
    [
      'visual-review-result',
      visualReviewResult(),
      { visualReviewRequest: reviewRequest },
    ],
  ]) {
    assert.deepEqual(validateContract(kind, fixture, context), {
      valid: true,
      errors: [],
    });
    assert.equal(JSON.stringify(fixture).includes('provider'), false);
  }
});

test('validates closed terminal evidence semantics and rejects every legacy text field', () => {
  for (const outcome of ['built-needs-review', 'failed']) {
    const terminalManifest = manifest();
    terminalManifest.outcome = outcome;
    assert.deepEqual(
      validateContract('terminal-evidence', terminalEvidence(outcome), {
        manifest: terminalManifest,
      }),
      { valid: true, errors: [] },
    );
  }

  for (const legacyField of [
    'findings',
    'error',
    'message',
    'code',
    'evidence',
    'correction',
    'details',
    'metadata',
  ]) {
    const terminalManifest = manifest();
    terminalManifest.outcome = 'failed';
    const evidence = terminalEvidence();
    evidence[legacyField] = 'arbitrary-exact-byte-canary';
    assert.equal(
      validateContract('terminal-evidence', evidence, {
        manifest: terminalManifest,
      }).valid,
      false,
      legacyField,
    );
  }
});

test('enforces terminal reason bounds, uniqueness, membership, and outcome rules', () => {
  const terminalManifest = manifest();
  terminalManifest.outcome = 'failed';
  const invalid = [
    (evidence) => {
      evidence.reasons = [];
    },
    (evidence) => {
      evidence.reasons[0].count = 0;
    },
    (evidence) => {
      evidence.reasons[0].count = 51;
    },
    (evidence) => {
      evidence.reasons = [
        { stage: 'durability', kind: 'provider-failure', count: 25 },
        { stage: 'rendering', kind: 'pipeline-failure', count: 26 },
      ];
    },
    (evidence) => {
      evidence.reasons.push(structuredClone(evidence.reasons[0]));
    },
    (evidence) => {
      evidence.reasons[0].artifactId = 'foreign-artifact';
    },
    (evidence) => {
      evidence.reasons[0].kind = 'finding';
    },
    (evidence) => {
      evidence.reasons[0].kind = 'superseded';
    },
  ];
  for (const mutate of invalid) {
    const evidence = terminalEvidence();
    mutate(evidence);
    assert.equal(
      validateContract('terminal-evidence', evidence, {
        manifest: terminalManifest,
      }).valid,
      false,
    );
  }
});

test('gives closed supersession precedence for both original terminal outcomes', () => {
  for (const outcome of ['built-needs-review', 'failed']) {
    const terminalManifest = manifest();
    terminalManifest.outcome = outcome;
    const evidence = terminalEvidence(outcome);
    evidence.evidenceDisposition = 'superseded';
    evidence.reasons = [
      { stage: 'finalization', kind: 'superseded', count: 1 },
    ];
    evidence.supersededBy = {
      runId: 'replacement-run',
      manifestHash: HASH_B,
    };
    assert.equal(
      validateContract('terminal-evidence', evidence, {
        manifest: terminalManifest,
      }).valid,
      true,
      outcome,
    );

    evidence.supersededBy.runId = evidence.runId;
    assert.equal(
      validateContract('terminal-evidence', evidence, {
        manifest: terminalManifest,
      }).valid,
      false,
      `${outcome} replacement identity`,
    );
  }

  const priorTotalFifty = terminalEvidence('built-needs-review');
  priorTotalFifty.reasons = [
    { stage: 'visual-review', kind: 'finding', count: 50 },
  ];
  const replacement = {
    ...priorTotalFifty,
    evidenceDisposition: 'superseded',
    reasons: [{ stage: 'finalization', kind: 'superseded', count: 1 }],
    supersededBy: { runId: 'replacement-run', manifestHash: HASH_B },
  };
  const terminalManifest = manifest();
  terminalManifest.outcome = 'built-needs-review';
  assert.equal(
    validateContract('terminal-evidence', replacement, {
      manifest: terminalManifest,
    }).valid,
    true,
  );
});

test('validates retained visual evidence cardinality and adjacent request binding', () => {
  const request = visualReviewRequest();
  for (const disposition of ['pass', 'correct', 'failed']) {
    assert.deepEqual(
      validateContract(
        'visual-review-evidence',
        visualReviewEvidence(disposition),
        { visualReviewRequest: request, attempt: 1 },
      ),
      { valid: true, errors: [] },
      disposition,
    );
  }

  for (const mutate of [
    (evidence) => {
      evidence.requestHash = HASH_B;
    },
    (evidence) => {
      evidence.attempt = 2;
    },
    (evidence) => {
      evidence.reasons = [];
    },
    (evidence) => {
      evidence.reasons[0].kind = 'pipeline-failure';
    },
    (evidence) => {
      evidence.reasons[0].artifactId = 'foreign-artifact';
    },
    (evidence) => {
      evidence.reasons.push(structuredClone(evidence.reasons[0]));
    },
  ]) {
    const evidence = visualReviewEvidence('correct');
    mutate(evidence);
    assert.equal(
      validateContract('visual-review-evidence', evidence, {
        visualReviewRequest: request,
        attempt: 1,
      }).valid,
      false,
    );
  }
});

test('rejects set drift, unjustified optional artifacts, and detached authors', () => {
  const unjustified = setPlan();
  delete unjustified.portfolio.at(-1).justification;
  assert.ok(
    validateContract('set-plan', unjustified).errors.some(
      ({ code }) => code === 'optional-justification-required',
    ),
  );

  const unknownSource = setPlan();
  unknownSource.portfolio[0].sourceIds = ['unknown'];
  assert.ok(
    validateContract('set-plan', unknownSource).errors.some(
      ({ code }) => code === 'unknown-source',
    ),
  );

  const detached = authorRequestV2();
  detached.plannedArtifact = structuredClone(detached.setContext.portfolio[1]);
  assert.ok(
    validateContract('author-request', detached).errors.some(
      ({ code }) => code === 'set-artifact-mismatch',
    ),
  );

  const drifted = authorRequestV2();
  drifted.plannedArtifact = {
    ...drifted.plannedArtifact,
    draft: 'A different per-author draft.',
  };
  assert.ok(
    validateContract('author-request', drifted).errors.some(
      ({ code }) => code === 'set-plan-drift',
    ),
  );
});

test('requires complete bundled visual guidance in author requests', () => {
  const missing = authorRequestV2();
  delete missing.visualAuthoringGuidance;
  assert.equal(validateContract('author-request', missing).valid, false);

  const malformed = authorRequestV2();
  malformed.visualAuthoringGuidance =
    'This incomplete guidance mentions only hierarchy.';
  assert.ok(
    validateContract('author-request', malformed).errors.some(
      ({ code }) => code === 'malformed-authoring-guidance',
    ),
  );
});

test('documents actionable pass and correct visual-review behavior without changing the result contract', async () => {
  const guidance = await readFile(
    new URL('../references/visual-review.md', import.meta.url),
    'utf8',
  );
  for (const topic of [
    'typography',
    'hierarchy',
    'composition',
    'density',
    'medium leverage',
    'template repetition',
    'diagram semantics',
    'cross-artifact cohesion',
  ]) {
    assert.match(guidance.toLowerCase(), new RegExp(topic), topic);
  }
  assert.match(guidance, /`pass`.*no required correction/is);
  assert.match(guidance, /`correct`.*concrete.*correction/is);

  const correction = visualReviewResult();
  const context = { visualReviewRequest: visualReviewRequest() };
  assert.deepEqual(
    validateContract('visual-review-result', correction, context),
    {
      valid: true,
      errors: [],
    },
  );
  const pass = structuredClone(correction);
  pass.disposition = 'pass';
  pass.findings = [];
  assert.deepEqual(validateContract('visual-review-result', pass, context), {
    valid: true,
    errors: [],
  });
});

test('requires closed, internally consistent planner-owned graph semantics', () => {
  const request = authorRequestV2();
  request.artifactId = 'system-visual';
  request.artifactType = 'diagram';
  request.authoring = 'html';
  request.plannedArtifact = structuredClone(request.setContext.portfolio[1]);
  delete request.floor;
  request.graphSemantics = [
    {
      direction: 'TD',
      nodes: [
        {
          id: 'source',
          label: 'source',
          shape: 'rectangle',
          explicit: false,
        },
        {
          id: 'accepted',
          label: 'accepted',
          shape: 'rectangle',
          explicit: false,
        },
        {
          id: 'rejected',
          label: 'rejected',
          shape: 'rectangle',
          explicit: false,
        },
      ],
      edges: [
        { from: 'source', to: 'accepted', kind: 'arrow', label: '' },
        { from: 'source', to: 'rejected', kind: 'arrow', label: '' },
      ],
      topology: {
        kind: 'non-linear',
        features: ['branch'],
        branchNodes: ['source'],
        fanInNodes: [],
        cycle: false,
        order: [],
      },
    },
  ];

  assert.deepEqual(validateContract('author-request', request), {
    valid: true,
    errors: [],
  });
  const detachedEndpoint = structuredClone(request);
  detachedEndpoint.graphSemantics[0].edges[1].to = 'missing';
  assert.ok(
    validateContract('author-request', detachedEndpoint).errors.some(
      ({ code }) => code === 'graph-semantics',
    ),
  );
  const duplicateEdge = structuredClone(request);
  duplicateEdge.graphSemantics[0].edges.push(
    structuredClone(duplicateEdge.graphSemantics[0].edges[0]),
  );
  assert.ok(
    validateContract('author-request', duplicateEdge).errors.some(
      ({ code }) => code === 'graph-semantics',
    ),
  );
});

test('rejects unknown review dispositions and artifact references', () => {
  const disposition = visualReviewResult();
  disposition.disposition = 'maybe';
  assert.equal(
    validateContract('visual-review-result', disposition).valid,
    false,
  );

  const request = visualReviewRequest();
  request.renderedArtifacts[0].artifactId = 'unknown-artifact';
  assert.ok(
    validateContract('visual-review-request', request).errors.some(
      ({ code }) => code === 'unknown-artifact',
    ),
  );
});

test('binds visual reviews to the exact complete rendered set', () => {
  for (const [label, mutate] of [
    [
      'omitted rendered artifact',
      (request) => {
        request.renderedArtifacts.pop();
      },
    ],
    [
      'extra rendered artifact',
      (request) => {
        request.renderedArtifacts.push({
          ...structuredClone(request.renderedArtifacts[0]),
          artifactId: 'extra',
        });
      },
    ],
    [
      'duplicate rendered artifact identity',
      (request) => {
        request.renderedArtifacts.push({
          ...structuredClone(request.renderedArtifacts[0]),
          renderedPath: 'site/duplicate/index.html',
        });
      },
    ],
  ]) {
    const request = visualReviewRequest();
    mutate(request);
    assert.equal(
      validateContract('visual-review-request', request).valid,
      false,
      label,
    );
  }

  const reviewRequest = visualReviewRequest();
  const partial = visualReviewResult();
  partial.artifactIds.pop();
  assert.equal(
    validateContract('visual-review-result', partial, {
      visualReviewRequest: reviewRequest,
    }).valid,
    false,
  );

  const detached = visualReviewResult();
  detached.findings[0].artifactId = 'detached';
  assert.equal(
    validateContract('visual-review-result', detached, {
      visualReviewRequest: reviewRequest,
    }).valid,
    false,
  );

  const passingWithCorrections = visualReviewResult();
  passingWithCorrections.disposition = 'pass';
  assert.equal(
    validateContract('visual-review-result', passingWithCorrections, {
      visualReviewRequest: reviewRequest,
    }).valid,
    false,
  );

  assert.equal(
    validateContract('visual-review-result', visualReviewResult()).valid,
    false,
    'a result without its reviewed request is detached',
  );
});

test('rejects stale visual review identities and post-request byte bindings', () => {
  const request = visualReviewRequest();
  const stale = visualReviewResult();
  stale.requestHash = HASH_A;
  assert.ok(
    validateContract('visual-review-result', stale, {
      visualReviewRequest: request,
    }).errors.some(({ code }) => code === 'review-binding-mismatch'),
  );

  const mutated = structuredClone(request);
  mutated.renderedArtifacts[0].evidence[0].screenshotHash = HASH_B;
  assert.ok(
    validateContract('visual-review-request', mutated).errors.some(
      ({ code }) => code === 'request-hash-mismatch',
    ),
  );
});

test('rejects cross-record browser runtime identity mismatches', () => {
  const request = visualReviewRequest();
  request.renderedArtifacts[0].evidence[0].captureIdentity = HASH_B;
  const payload = {
    ...request,
  };
  delete payload.requestId;
  delete payload.requestHash;
  request.requestHash = canonicalHash(payload);
  request.requestId = visualReviewRequestId(request.requestHash);

  assert.ok(
    validateContract('visual-review-request', request).errors.some(
      ({ code }) => code === 'browser-runtime-mismatch',
    ),
  );
});

test('rejects empty or content-detached recap cohesion observations', () => {
  for (const mutate of [
    (request) => {
      request.plan.ledger = { terminology: [], statuses: [], numbers: [] };
      request.renderedArtifacts.forEach(
        (artifact) => (artifact.cohesionObservations = []),
      );
    },
    (request) => {
      request.renderedArtifacts[0].cohesionObservations[0].contentHash = HASH_B;
    },
    (request) => {
      request.renderedArtifacts.forEach(
        (artifact) =>
          (artifact.cohesionObservations = artifact.cohesionObservations.filter(
            ({ group }) => group !== 'statuses',
          )),
      );
    },
  ]) {
    const request = visualReviewRequest();
    mutate(request);
    request.requestHash = canonicalHash(
      Object.fromEntries(
        Object.entries(request).filter(
          ([key]) => !['requestId', 'requestHash'].includes(key),
        ),
      ),
    );
    request.requestId = visualReviewRequestId(request.requestHash);
    assert.equal(
      validateContract('visual-review-request', request).valid,
      false,
    );
  }
});

test('accepts v2 expansion proposals while recipe policy remains external', () => {
  const result = authorResultV2();
  result.proposedArtifacts = [
    {
      id: 'architecture-detail',
      profileId: 'supporting-diagram',
      rationale: 'The component boundaries need a dedicated visual.',
    },
  ];

  assert.equal(validateContract('author-result', result).valid, true);
});

test('rejects ambiguous v2 content and policy-bearing proposals', () => {
  const ambiguous = authorResultV2();
  ambiguous.content.html = '<h1>Project recap</h1>';
  assert.ok(
    validateContract('author-result', ambiguous).errors.some(
      (error) => error.code === 'one-of',
    ),
  );

  for (const forbidden of ['authoring', 'shell']) {
    const result = authorResultV2();
    result.proposedArtifacts = [
      {
        id: 'architecture-detail',
        profileId: 'supporting-diagram',
        rationale: 'The component boundaries need a dedicated visual.',
        [forbidden]: forbidden === 'authoring' ? 'html' : 'diagram-shell',
      },
    ];
    const validation = validateContract('author-result', result);
    assert.equal(validation.valid, false);
    assert.ok(
      validation.errors.some(
        (error) =>
          error.code === 'unknown-key' && error.path.endsWith(`.${forbidden}`),
      ),
    );
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

test('manifest validation rejects normalized or noncanonical source backlinks', () => {
  for (const url of [
    `https://github.com/acme/project/blob/${'1'.repeat(40)}/../main/plan.md#L1`,
    `https://github.com/acme/project/blob/${'1'.repeat(40)}/%2e%2e/main/plan.md#L1`,
    `https://github.com/acme/project/blob/${'1'.repeat(40)}/docs//plan.md#L1`,
    `https://github.com/acme/project/blob/${'1'.repeat(40)}/docs/%70lan.md#L1`,
  ]) {
    const value = manifest();
    value.source.backlinks = [{ sourceId: 'plan', url }];
    assert.ok(
      validateContract('manifest', value).errors.some(
        ({ code }) => code === 'source-backlink',
      ),
      url,
    );
  }
});

test('requires complete immutable request, approval, and author provenance coverage', () => {
  for (const relativePath of [
    'run-request.json',
    'source/content-approval.json',
    'source/author/hub.json',
  ]) {
    const incomplete = manifest();
    delete incomplete.immutableHashes[relativePath];

    const result = validateContract('manifest', incomplete);
    const expectedCode = relativePath.startsWith('source/author/')
      ? 'immutable-package-incomplete'
      : 'legacy-manifest-incomplete';

    assert.equal(result.valid, false, relativePath);
    assert.ok(
      result.errors.some(
        (error) =>
          error.code === expectedCode &&
          (expectedCode !== 'legacy-manifest-incomplete' ||
            error.message.includes(relativePath)),
      ),
      `${relativePath}: ${JSON.stringify(result.errors)}`,
    );
  }
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

test('allows explicit recap modes only for project recaps', () => {
  for (const recapMode of ['artistic', 'deterministic-markdown']) {
    const request = runRequest();
    request.recipe = { id: 'project-recap', version: '1' };
    request.recapMode = recapMode;
    assert.equal(
      validateContract('run-request', request).valid,
      true,
      recapMode,
    );
  }

  const unrelated = runRequest();
  unrelated.recapMode = 'deterministic-markdown';
  assert.ok(
    validateContract('run-request', unrelated).errors.some(
      ({ code }) => code === 'recap-mode-recipe',
    ),
  );
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
