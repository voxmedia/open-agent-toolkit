import assert from 'node:assert/strict';
import { readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, test } from 'node:test';

import { renderPacket } from '../scripts/render-packet.mjs';
import { validatePacket } from '../scripts/validate-packet.mjs';
import {
  createTwoSourcePacket,
  twoSourceClaimIds,
  twoSourceCoverageFinding,
  twoSourceSemanticIssue,
} from './fixtures/two-source-packet.mjs';

const tempRoots = [];

function reviewDowngrades(document) {
  const start = document.indexOf('## Review Downgrades');
  assert.notEqual(start, -1, document);
  return document.slice(start, document.indexOf('\n## ', start + 1));
}

afterEach(async () => {
  await Promise.all(
    tempRoots
      .splice(0)
      .map((root) => rm(root, { recursive: true, force: true })),
  );
});

test('production helpers publish a two-source packet with scoped downgrades', async () => {
  const packet = await createTwoSourcePacket();
  tempRoots.push(packet.tempRoot);
  assert.deepEqual(packet.reviews.semantic.unresolvedIssues, [
    structuredClone(twoSourceSemanticIssue),
  ]);

  const validation = await validatePacket(packet.packetRoot);
  assert.equal(validation.valid, true, JSON.stringify(validation, null, 2));
  assert.equal(validation.publishable, true);
  assert.equal(validation.status, 'partial');
  assert.equal(validation.achievedProfile, 'standard');

  const status = Object.fromEntries(
    packet.ledger.claims.map((claim) => [claim.id, claim.status]),
  );
  assert.deepEqual(status, {
    [twoSourceClaimIds.firstSource]: 'verified',
    [twoSourceClaimIds.secondSource]: 'verified',
    [twoSourceClaimIds.uncertain]: 'unresolved',
    [twoSourceClaimIds.coverageGap]: 'contested',
  });
  assert.ok(
    packet.manifest.gaps.some(
      (gap) =>
        gap.id === twoSourceCoverageFinding.gapId &&
        gap.material === true &&
        gap.claimIds.includes(twoSourceClaimIds.coverageGap),
    ),
  );

  const rendered = await renderPacket(packet.packetRoot);
  assert.equal(rendered.status, 'partial');
  const document = await readFile(join(packet.packetRoot, 'packet.md'), 'utf8');
  assert.match(
    document,
    /QUESTION\\_SCOPE\\_OMISSION:\*\* The packet does not answer which release/,
  );
  const sections = document.split('\n### ').slice(1);
  for (const claimId of [
    twoSourceClaimIds.firstSource,
    twoSourceClaimIds.secondSource,
  ]) {
    const section = sections.find((item) => item.startsWith(claimId));
    assert.ok(section, `${claimId} is rendered`);
    assert.ok(section.includes('- **State:** **verified**'), section);
  }
  const downgrades = reviewDowngrades(document);
  assert.match(
    downgrades,
    /claim-delta\*\* \(unresolved\): Alpha and delta describe the same release\./,
  );
  assert.match(downgrades, /semantic review: uncertain/);
  assert.match(
    downgrades,
    /semantic issue: Delta evidence may describe a different release/,
  );
  assert.match(downgrades, /claim-epsilon\*\* \(contested\)/);
  assert.match(
    downgrades,
    /material coverage finding QUESTION\\_SCOPE\\_OMISSION: The packet does not answer/,
  );
  assert.doesNotMatch(downgrades, /claim-alpha|claim-gamma/);
});

test('an issue scoped to an affirmed claim downgrades only that claim', async () => {
  const packet = await createTwoSourcePacket({
    semanticIssues: [
      {
        text: 'Gamma evidence may be a draft entry.',
        claimIds: [twoSourceClaimIds.secondSource],
      },
    ],
  });
  tempRoots.push(packet.tempRoot);
  const status = Object.fromEntries(
    packet.ledger.claims.map((claim) => [claim.id, claim.status]),
  );
  assert.equal(status[twoSourceClaimIds.firstSource], 'verified');
  assert.equal(status[twoSourceClaimIds.secondSource], 'unresolved');
  const validation = await validatePacket(packet.packetRoot);
  assert.equal(validation.valid, true, JSON.stringify(validation, null, 2));
});

test('a global issue keeps every covered claim below verified', async () => {
  const packet = await createTwoSourcePacket({
    semanticIssues: [
      { text: 'Both sources may predate the release.', scope: 'global' },
    ],
  });
  tempRoots.push(packet.tempRoot);
  assert.ok(
    packet.ledger.claims.every((claim) => claim.status !== 'verified'),
    JSON.stringify(packet.ledger.claims, null, 2),
  );
  const validation = await validatePacket(packet.packetRoot);
  assert.equal(validation.valid, true, JSON.stringify(validation, null, 2));
});

test('a complete packet still shows a scoped downgrade on a non-key claim', async () => {
  const packet = await createTwoSourcePacket({ withCoverageFinding: false });
  tempRoots.push(packet.tempRoot);
  assert.ok(
    !packet.ledger.synthesis.keyClaimIds.includes(twoSourceClaimIds.uncertain),
  );
  const rendered = await renderPacket(packet.packetRoot);
  assert.equal(rendered.status, 'complete');
  const downgrades = reviewDowngrades(
    await readFile(join(packet.packetRoot, 'packet.md'), 'utf8'),
  );
  assert.match(downgrades, /claim-delta\*\* \(unresolved\)/);
  assert.match(
    downgrades,
    /semantic issue: Delta evidence may describe a different release/,
  );
});

test('a global issue renders on every claim it downgrades', async () => {
  const packet = await createTwoSourcePacket({
    semanticIssues: [
      { text: 'Both sources may predate the release.', scope: 'global' },
    ],
    withCoverageFinding: false,
  });
  tempRoots.push(packet.tempRoot);
  await renderPacket(packet.packetRoot);
  const downgrades = reviewDowngrades(
    await readFile(join(packet.packetRoot, 'packet.md'), 'utf8'),
  );
  for (const claimId of Object.values(twoSourceClaimIds)) {
    assert.match(
      downgrades,
      new RegExp(
        `${claimId}\\*\\* \\(unresolved\\)[^\\n]*global issue: Both sources may predate the release\\.`,
      ),
      claimId,
    );
  }
});

const omittedEpsilon = [
  { reviewKind: 'semantic', claimId: twoSourceClaimIds.coverageGap },
];

test('a claim a required review left without a disposition publishes only as a named partial', async () => {
  const packet = await createTwoSourcePacket({
    withCoverageFinding: false,
    omitDispositions: omittedEpsilon,
  });
  tempRoots.push(packet.tempRoot);
  assert.ok(
    !packet.ledger.synthesis.keyClaimIds.includes(
      twoSourceClaimIds.coverageGap,
    ),
  );
  // The gap comes from the production reconciler, not from this test.
  assert.deepEqual(
    packet.omissionGaps.map((gap) => [
      gap.code,
      gap.material,
      gap.waveId,
      gap.laneId,
      gap.claimIds,
    ]),
    [
      [
        'REVIEW_DISPOSITION_OMITTED',
        true,
        'wave-semantic-verification',
        'lane-semantic',
        [twoSourceClaimIds.coverageGap],
      ],
    ],
  );
  const validation = await validatePacket(packet.packetRoot);
  assert.equal(validation.valid, true, JSON.stringify(validation, null, 2));
  assert.equal(validation.status, 'partial');
  const epsilon = packet.ledger.claims.find(
    (claim) => claim.id === twoSourceClaimIds.coverageGap,
  );
  assert.equal(epsilon.status, 'unresolved');

  await renderPacket(packet.packetRoot);
  const document = await readFile(join(packet.packetRoot, 'packet.md'), 'utf8');
  assert.match(
    reviewDowngrades(document),
    /claim-epsilon\*\* \(unresolved\)[^\n]*semantic review: not reviewed \(no disposition\)/,
  );
  assert.match(document, /REVIEW\\_DISPOSITION\\_OMITTED/);
});

for (const [label, options] of [
  ['an omitted disposition', { omitDispositions: omittedEpsilon }],
  [
    'a claim left out of the brief and the review',
    {
      omitDispositions: omittedEpsilon,
      mutateBrief: ({ mode, brief }) => {
        if (mode !== 'verify') return;
        brief.claims = brief.claims.filter(
          (claim) => claim.id !== twoSourceClaimIds.coverageGap,
        );
      },
    },
  ],
]) {
  test(`${label} cannot hide in a complete packet`, async () => {
    const packet = await createTwoSourcePacket({
      withCoverageFinding: false,
      recordOmissionGaps: false,
      ...options,
    });
    tempRoots.push(packet.tempRoot);
    assert.equal(packet.manifest.run.status, 'complete');
    const validation = await validatePacket(packet.packetRoot);
    assert.equal(validation.valid, false);
    assert.deepEqual(
      [...new Set(validation.errors.map((error) => error.code))],
      ['MISSING_REVIEW_OMISSION_GAP'],
    );
  });
}
