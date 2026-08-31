import assert from 'node:assert/strict';
import { readdir, readFile, rename, rm, symlink } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, test } from 'node:test';

import {
  renderPacket,
  renderPacketDocument,
  renderValidatedPacket,
} from '../scripts/render-packet.mjs';
import { compileValidatedRun } from '../scripts/validate-packet.mjs';
import { createPacketFixture } from './fixtures/packet-fixture.mjs';

const tempRoots = [];

afterEach(async () => {
  await Promise.all(
    tempRoots
      .splice(0)
      .map((root) => rm(root, { recursive: true, force: true })),
  );
});

test('packet rendering is deterministic and contains the complete consumer view', async () => {
  const fixture = await createPacketFixture();
  tempRoots.push(fixture.tempRoot);
  const validation = await compileValidatedRun(fixture.packetRoot);
  assert.equal(validation.valid, true, JSON.stringify(validation, null, 2));
  const first = renderPacketDocument(validation.validatedRun);
  const second = renderPacketDocument(validation.validatedRun);
  assert.equal(first, second);
  for (const heading of [
    '# Recon Evidence Packet',
    '## Synthesis',
    '## Key Claims',
    '## Contradictions and Qualifications',
    '## Unresolved Questions',
    '## Coverage Gaps',
    '## Failed or Omitted Passes',
    '## Provenance',
  ]) {
    assert.match(first, new RegExp(heading));
  }
  assert.match(first, /\*\*verified\*\*/i);
  assert.match(first, /source\.txt:1/i);
  assert.doesNotMatch(first, /raw\/dossiers|gather\.json|compiler reasoning/i);
});

test('render core rejects raw or partially validated packet data', async () => {
  const fixture = await createPacketFixture();
  tempRoots.push(fixture.tempRoot);
  assert.throws(
    () => renderPacketDocument(fixture.manifest, fixture.ledger),
    /ValidatedRun/,
  );
  const validation = await compileValidatedRun(fixture.packetRoot);
  assert.equal(Object.isFrozen(validation.validatedRun), true);
  assert.equal(Object.isFrozen(validation.validatedRun.manifest), true);
  assert.doesNotThrow(() => renderPacketDocument(validation.validatedRun));
});

test('publication rejects a packet root retargeted after validation', async () => {
  const fixture = await createPacketFixture();
  tempRoots.push(fixture.tempRoot);
  const validation = await compileValidatedRun(fixture.packetRoot);
  assert.equal(validation.valid, true, JSON.stringify(validation, null, 2));
  const moved = join(fixture.tempRoot, 'packet-moved');
  await rename(fixture.packetRoot, moved);
  await symlink(moved, fixture.packetRoot, 'dir');
  await assert.rejects(
    renderValidatedPacket(validation.validatedRun),
    /root|symlink/i,
  );
});

test('renderer validates then atomically publishes stable bytes and digest', async () => {
  const fixture = await createPacketFixture();
  tempRoots.push(fixture.tempRoot);
  const first = await renderPacket(fixture.packetRoot);
  const firstBytes = await readFile(
    join(fixture.packetRoot, 'packet.md'),
    'utf8',
  );
  const second = await renderPacket(fixture.packetRoot);
  const secondBytes = await readFile(
    join(fixture.packetRoot, 'packet.md'),
    'utf8',
  );
  assert.equal(first.digest, second.digest);
  assert.equal(firstBytes, secondBytes);
  assert.equal(first.directory, fixture.packetRoot);
  assert.equal(first.status, 'complete');
  assert.equal(first.requestedProfile, 'standard');
  assert.equal(first.achievedProfile, 'standard');
  assert.deepEqual(first.claimCounts, { contested: 1, verified: 1 });
  assert.equal(Object.hasOwn(first, 'raw'), false);
  const files = await readdir(fixture.packetRoot);
  assert.equal(
    files.some((name) => name.includes('.tmp')),
    false,
  );
});

test('structural validation failure leaves no packet entry point', async () => {
  const fixture = await createPacketFixture();
  tempRoots.push(fixture.tempRoot);
  fixture.manifest.schemaVersion = 99;
  await fixture.persist();
  await assert.rejects(
    renderPacket(fixture.packetRoot),
    /packet validation failed/i,
  );
  await assert.rejects(readFile(join(fixture.packetRoot, 'packet.md'), 'utf8'));
});

test('render construction failure removes a previously published packet', async () => {
  const fixture = await createPacketFixture();
  tempRoots.push(fixture.tempRoot);
  await renderPacket(fixture.packetRoot);
  fixture.ledger.synthesis.keyClaimIds = null;
  await fixture.persist();
  await assert.rejects(renderPacket(fixture.packetRoot));
  await assert.rejects(readFile(join(fixture.packetRoot, 'packet.md'), 'utf8'));
});

test('consumer handoff contains only directory and compact status', async () => {
  const fixture = await createPacketFixture({ profile: 'quick' });
  tempRoots.push(fixture.tempRoot);
  const result = await renderPacket(fixture.packetRoot);
  assert.deepEqual(Object.keys(result).sort(), [
    'achievedProfile',
    'claimCounts',
    'digest',
    'directory',
    'failedOrOmittedPasses',
    'gapCount',
    'requestedProfile',
    'status',
  ]);
  assert.doesNotMatch(JSON.stringify(result), /alpha evidence|raw\/dossiers/i);
});
