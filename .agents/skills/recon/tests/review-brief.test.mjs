import assert from 'node:assert/strict';
import { mkdir, readFile, rm, symlink } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, test } from 'node:test';

import {
  createReviewBrief,
  validateReviewBrief,
  writeReviewBrief,
} from '../scripts/create-review-brief.mjs';
import { validateArtifactShape } from '../scripts/lib/contracts.mjs';
import { createPacketFixture } from './fixtures/packet-fixture.mjs';

const tempRoots = [];

afterEach(async () => {
  await Promise.all(
    tempRoots
      .splice(0)
      .map((root) => rm(root, { recursive: true, force: true })),
  );
});

test('verification projection contains only claims, excerpts, locators, and sources', async () => {
  const fixture = await createPacketFixture();
  tempRoots.push(fixture.tempRoot);
  const brief = createReviewBrief({
    mode: 'verify',
    id: 'brief-verify-1',
    createdAt: '2026-08-31T00:03:00.000Z',
    manifest: fixture.manifest,
    ledger: fixture.ledger,
    claimIds: ['claim-1'],
  });
  assert.deepEqual(Object.keys(brief).sort(), [
    'claims',
    'createdAt',
    'excludedInputs',
    'id',
    'kind',
    'mode',
    'runId',
    'schemaVersion',
    'sources',
  ]);
  assert.deepEqual(Object.keys(brief.claims[0]).sort(), [
    'evidence',
    'id',
    'statement',
  ]);
  assert.deepEqual(Object.keys(brief.claims[0].evidence[0]).sort(), [
    'displayExcerpt',
    'id',
    'locator',
    'sourceId',
  ]);
  assert.deepEqual(Object.keys(brief.sources[0]).sort(), [
    'authority',
    'available',
    'contentHash',
    'id',
    'kind',
    'observedAt',
    'path',
    'validationState',
  ]);
  assert.equal(validateReviewBrief(brief).valid, true);
});

test('verification projection rejects evidence whose source is undeclared', async () => {
  const fixture = await createPacketFixture();
  tempRoots.push(fixture.tempRoot);
  const manifest = structuredClone(fixture.manifest);
  manifest.sources = [];

  assert.throws(
    () =>
      createReviewBrief({
        mode: 'verify',
        id: 'brief-missing-source',
        createdAt: '2026-08-31T00:03:00.000Z',
        manifest,
        ledger: fixture.ledger,
      }),
    /^Error: Evidence references missing source source-1$/,
  );
});

test('verification source validation rejects unblinded and unexpected properties', async () => {
  const fixture = await createPacketFixture();
  tempRoots.push(fixture.tempRoot);
  const valid = createReviewBrief({
    mode: 'verify',
    id: 'brief-closed-source',
    createdAt: '2026-08-31T00:03:00.000Z',
    manifest: fixture.manifest,
    ledger: fixture.ledger,
  });

  for (const [property, value] of [
    ['credentials', { token: 'not-a-real-secret' }],
    ['provenance', { path: 'raw/dossiers/source.json' }],
  ]) {
    const candidate = structuredClone(valid);
    candidate.sources[0][property] = value;
    for (const validate of [validateReviewBrief, validateArtifactShape]) {
      const result = validate(candidate);
      assert.equal(result.valid, false, property);
      assert.ok(
        result.errors.some(
          (error) =>
            error.code === 'UNKNOWN_FIELD' &&
            error.path === `$.sources[0].${property}`,
        ),
        `${property}: ${JSON.stringify(result, null, 2)}`,
      );
    }
  }
});

test('adversarial projection contains only scope, questions, and provisional statements', async () => {
  const fixture = await createPacketFixture();
  tempRoots.push(fixture.tempRoot);
  const brief = createReviewBrief({
    mode: 'adversary',
    id: 'brief-adversary-1',
    createdAt: '2026-08-31T00:03:00.000Z',
    manifest: fixture.manifest,
    ledger: fixture.ledger,
    claimIds: ['claim-1', 'claim-2'],
  });
  assert.deepEqual(Object.keys(brief).sort(), [
    'createdAt',
    'excludedInputs',
    'id',
    'kind',
    'mode',
    'provisionalStatements',
    'questions',
    'runId',
    'schemaVersion',
    'scope',
  ]);
  assert.equal(validateReviewBrief(brief).valid, true);
});

test('adversarial statement validation rejects fields outside the exact blind projection', async () => {
  const fixture = await createPacketFixture();
  tempRoots.push(fixture.tempRoot);
  const valid = createReviewBrief({
    mode: 'adversary',
    id: 'brief-adversary-exact-statements',
    createdAt: '2026-08-31T00:03:00.000Z',
    manifest: fixture.manifest,
    ledger: fixture.ledger,
    claimIds: ['claim-1'],
  });

  for (const field of ['evidence', 'status', 'qualifications']) {
    const candidate = structuredClone(valid);
    candidate.provisionalStatements[0][field] = [];
    const result = validateReviewBrief(candidate);
    assert.equal(result.valid, false, field);
    assert.ok(
      result.errors.some(
        (error) =>
          error.code === 'BLINDNESS_VIOLATION' &&
          error.path === '$.provisionalStatements[0]',
      ),
      `${field}: ${JSON.stringify(result, null, 2)}`,
    );
  }
  assert.equal(validateReviewBrief(valid).valid, true);
});

test('review briefs exclude dossier, compiler, synthesis, provenance, and prior review data', async () => {
  const fixture = await createPacketFixture();
  tempRoots.push(fixture.tempRoot);
  for (const mode of ['verify', 'adversary']) {
    const brief = createReviewBrief({
      mode,
      id: `brief-${mode}`,
      createdAt: '2026-08-31T00:03:00.000Z',
      manifest: fixture.manifest,
      ledger: fixture.ledger,
    });
    const serialized = JSON.stringify(brief);
    for (const forbidden of [
      'raw/dossiers',
      'derivedFrom',
      'provenance',
      'reviewIds',
      'synthesis',
      'compilerReasoning',
    ]) {
      assert.doesNotMatch(serialized, new RegExp(forbidden, 'i'));
    }
  }
});

test('brief bytes and digest are deterministic and immutable at a unique path', async () => {
  const fixture = await createPacketFixture();
  tempRoots.push(fixture.tempRoot);
  const input = {
    mode: 'verify',
    id: 'brief-verify-stable',
    createdAt: '2026-08-31T00:03:00.000Z',
    manifest: fixture.manifest,
    ledger: fixture.ledger,
  };
  const briefA = createReviewBrief(input);
  const briefB = createReviewBrief(input);
  assert.deepEqual(briefA, briefB);
  const outputPath = join(
    fixture.packetRoot,
    'reviews',
    'briefs',
    'verify-stable.json',
  );
  const written = await writeReviewBrief({
    packetRoot: fixture.packetRoot,
    outputPath,
    brief: briefA,
  });
  assert.match(written.digest, /^sha256:[a-f0-9]{64}$/);
  assert.equal(JSON.parse(await readFile(outputPath, 'utf8')).id, briefA.id);
  await assert.rejects(
    writeReviewBrief({
      packetRoot: fixture.packetRoot,
      outputPath,
      brief: briefB,
    }),
    /already exists/i,
  );
});

test('brief validation rejects selective-blind contract violations', async () => {
  const fixture = await createPacketFixture();
  tempRoots.push(fixture.tempRoot);
  const brief = createReviewBrief({
    mode: 'verify',
    id: 'brief-invalid',
    createdAt: '2026-08-31T00:03:00.000Z',
    manifest: fixture.manifest,
    ledger: fixture.ledger,
  });
  brief.claims[0].derivedFrom = [{ path: 'raw/dossiers/gather.json' }];
  const result = validateReviewBrief(brief);
  assert.equal(result.valid, false);
  assert.ok(
    result.errors.some((error) => error.code === 'BLINDNESS_VIOLATION'),
  );
});

test('brief validation scans direct array strings with path-specific diagnostics', async () => {
  const fixture = await createPacketFixture();
  tempRoots.push(fixture.tempRoot);
  const valid = createReviewBrief({
    mode: 'adversary',
    id: 'brief-array-strings',
    createdAt: '2026-08-31T00:03:00.000Z',
    manifest: fixture.manifest,
    ledger: fixture.ledger,
  });

  const cases = [
    ['$.questions[0]', (brief) => (brief.questions = ['raw/dossiers/q.json'])],
    [
      '$.scope.included[0]',
      (brief) => (brief.scope.included = ['raw/dossiers/included.json']),
    ],
    [
      '$.scope.excluded[0]',
      (brief) => (brief.scope.excluded = ['raw\\dossiers\\excluded.json']),
    ],
    [
      '$.questions[0].detail',
      (brief) => (brief.questions = [{ detail: 'raw/dossiers/nested.json' }]),
    ],
  ];
  for (const [expectedPath, mutate] of cases) {
    const candidate = structuredClone(valid);
    mutate(candidate);
    const result = validateReviewBrief(candidate);
    assert.equal(result.valid, false, expectedPath);
    assert.ok(
      result.errors.some(
        (error) =>
          error.code === 'BLINDNESS_VIOLATION' && error.path === expectedPath,
      ),
      JSON.stringify(result, null, 2),
    );
  }

  const allowed = structuredClone(valid);
  allowed.questions = ['Compare raw dossier summaries without opening paths.'];
  allowed.scope.included = ['references/evidence'];
  assert.equal(validateReviewBrief(allowed).valid, true);
  assert.equal(validateReviewBrief(valid).valid, true);
});

test('brief output rejects symlinked ancestors before creating a new file', async () => {
  const fixture = await createPacketFixture();
  tempRoots.push(fixture.tempRoot);
  const outside = join(fixture.tempRoot, 'outside');
  await mkdir(outside);
  const linked = join(fixture.packetRoot, 'reviews', 'linked');
  await symlink(outside, linked);
  const brief = createReviewBrief({
    mode: 'verify',
    id: 'brief-symlink',
    createdAt: '2026-08-31T00:03:00.000Z',
    manifest: fixture.manifest,
    ledger: fixture.ledger,
  });
  await assert.rejects(
    writeReviewBrief({
      packetRoot: fixture.packetRoot,
      outputPath: join(linked, 'new.json'),
      brief,
    }),
    /symlink/i,
  );
  await assert.rejects(readFile(join(outside, 'new.json'), 'utf8'));
});
