import assert from 'node:assert/strict';
import { rm } from 'node:fs/promises';
import { afterEach, test } from 'node:test';

import { validatePacket } from '../scripts/validate-packet.mjs';
import {
  createTwoSourcePacket,
  twoSourceClaimIds,
  twoSourceCoverageFinding,
} from './fixtures/two-source-packet.mjs';

const tempRoots = [];

afterEach(async () => {
  await Promise.all(
    tempRoots
      .splice(0)
      .map((root) => rm(root, { recursive: true, force: true })),
  );
});

test('a material question omission over covered statements reconciles to a publishable downgrade', async () => {
  const packet = await createTwoSourcePacket();
  tempRoots.push(packet.tempRoot);
  assert.ok(
    packet.reviews.coverage.dispositions.every(
      (item) => item.disposition === 'covered',
    ),
  );
  assert.equal(twoSourceCoverageFinding.material, true);
  const affected = packet.ledger.claims.find(
    (claim) => claim.id === twoSourceClaimIds.coverageGap,
  );
  assert.equal(affected.status, 'contested');

  const validation = await validatePacket(packet.packetRoot);
  assert.deepEqual(
    validation.errors.filter(
      (error) => error.code === 'MATERIAL_COVERAGE_ASSURANCE_EXCEEDED',
    ),
    [],
    JSON.stringify(validation, null, 2),
  );
});
