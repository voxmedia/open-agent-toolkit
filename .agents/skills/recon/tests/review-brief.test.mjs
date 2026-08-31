import assert from 'node:assert/strict';
import { mkdir, readFile, rm, symlink } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, test } from 'node:test';

import {
  createReviewBrief,
  validateReviewBrief,
  writeReviewBrief,
} from '../scripts/create-review-brief.mjs';
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
  assert.equal(validateReviewBrief(brief).valid, true);
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
