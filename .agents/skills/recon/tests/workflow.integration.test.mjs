import assert from 'node:assert/strict';
import { mkdtemp, readFile, realpath, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, test } from 'node:test';

import { renderPacket } from '../scripts/render-packet.mjs';
import { validatePacket } from '../scripts/validate-packet.mjs';
import { createPacketFixture } from './fixtures/packet-fixture.mjs';
import { runFakeRecon } from './helpers/fake-recon-run.mjs';

const tempRoots = [];

afterEach(async () => {
  await Promise.all(
    tempRoots
      .splice(0)
      .map((root) => rm(root, { recursive: true, force: true })),
  );
});

async function roots() {
  const root = await realpath(
    await mkdtemp(join(tmpdir(), 'fake-recon-workflow-')),
  );
  tempRoots.push(root);
  return {
    sourceRoot: join(root, 'sources'),
    packetRoot: join(root, 'packet'),
    assetsRoot: join(root, 'assets'),
    userRoot: join(root, 'user'),
  };
}

for (const profile of ['quick', 'standard', 'thorough']) {
  test(`fake ${profile} run drives the complete deterministic pipeline`, async () => {
    const injectedRoots = await roots();
    const result = await runFakeRecon({ profile, roots: injectedRoots });
    assert.equal(result.status, 'complete');
    assert.equal(result.requestedProfile, profile);
    assert.equal(result.achievedProfile, profile);
    assert.equal(result.directory, injectedRoots.packetRoot);
    assert.match(result.digest, /^sha256:[a-f0-9]{64}$/);
    assert.equal(
      JSON.parse(
        await readFile(
          join(injectedRoots.packetRoot, 'raw', 'dispatch', 'accepted.json'),
          'utf8',
        ),
      ).state,
      'accepted',
    );
  });
}

test('worker failure publishes an honest lower-assurance partial', async () => {
  const injectedRoots = await roots();
  const result = await runFakeRecon({
    profile: 'standard',
    workerFailure: 'semantic-verification',
    roots: injectedRoots,
  });
  assert.equal(result.status, 'partial');
  assert.equal(result.requestedProfile, 'standard');
  assert.equal(result.achievedProfile, 'quick');
  assert.ok(result.failedOrOmittedPasses.includes('PASS_FAILED'));
  assert.match(
    await readFile(join(injectedRoots.packetRoot, 'packet.md'), 'utf8'),
    /semantic-verification/i,
  );
});

test('generic worker-role fallback is fixed before approval', async () => {
  const injectedRoots = await roots();
  const result = await runFakeRecon({
    profile: 'quick',
    workerRoleAvailable: false,
    roots: injectedRoots,
  });
  assert.equal(result.status, 'complete');
  const prepared = JSON.parse(
    await readFile(
      join(injectedRoots.packetRoot, 'raw', 'dispatch', 'prepared.json'),
      'utf8',
    ),
  );
  const approved = JSON.parse(
    await readFile(
      join(injectedRoots.packetRoot, 'raw', 'dispatch', 'approved.json'),
      'utf8',
    ),
  );
  assert.equal(prepared.approvalProjection.selection.role_selector, 'generic');
  assert.equal(approved.approvalProjection.selection.role_selector, 'generic');
});

test('dispatch-axis drift stops before accepted launch and publication', async () => {
  const injectedRoots = await roots();
  const result = await runFakeRecon({
    profile: 'quick',
    dispatchDrift: { effort: 'low' },
    roots: injectedRoots,
  });
  assert.equal(result.status, 'awaiting-approval');
  assert.equal(result.launched, false);
  await assert.rejects(
    readFile(
      join(injectedRoots.packetRoot, 'raw', 'dispatch', 'accepted.json'),
    ),
  );
  await assert.rejects(readFile(join(injectedRoots.packetRoot, 'packet.md')));
});

test('invalid worker output is quarantined and preserves the last valid ledger', async () => {
  const injectedRoots = await roots();
  const result = await runFakeRecon({
    profile: 'standard',
    invalidOutput: true,
    roots: injectedRoots,
  });
  assert.equal(result.status, 'partial');
  assert.equal(result.ledgerPreserved, true);
  assert.match(result.quarantinedPath, /raw[\\/]quarantine/);
  assert.equal(
    JSON.parse(
      await readFile(join(injectedRoots.packetRoot, 'claims.json'), 'utf8'),
    ).schemaVersion,
    1,
  );
});

test('contract enforcement runs by default but strict mode refuses it before launch', async () => {
  const contractRoots = await roots();
  const contract = await runFakeRecon({
    profile: 'quick',
    authorityLevel: 'contract-enforced',
    roots: contractRoots,
  });
  assert.equal(contract.status, 'complete');

  const strictRoots = await roots();
  const strict = await runFakeRecon({
    profile: 'quick',
    authorityLevel: 'contract-enforced',
    strict: true,
    roots: strictRoots,
  });
  assert.equal(strict.status, 'failed');
  assert.equal(strict.reason, 'STRICT_AUTHORITY_UNAVAILABLE');
  assert.equal(strict.launched, false);
  await assert.rejects(readFile(join(strictRoots.packetRoot, 'packet.md')));
});

test('mutation-capable source authority fails closed before launch', async () => {
  const injectedRoots = await roots();
  const result = await runFakeRecon({
    profile: 'quick',
    mutationCapableSource: true,
    roots: injectedRoots,
  });
  assert.equal(result.status, 'failed');
  assert.equal(result.reason, 'READ_ONLY_AUTHORITY_UNAVAILABLE');
  assert.equal(result.launched, false);
});

test('structural failure leaves diagnostics but no consumer packet', async () => {
  const injectedRoots = await roots();
  const result = await runFakeRecon({
    profile: 'quick',
    structuralFailure: true,
    roots: injectedRoots,
  });
  assert.equal(result.status, 'failed');
  assert.equal(result.reason, 'STRUCTURAL_VALIDATION_FAILED');
  await assert.rejects(readFile(join(injectedRoots.packetRoot, 'packet.md')));
  assert.equal(
    JSON.parse(
      await readFile(
        join(injectedRoots.packetRoot, 'raw', 'failure.json'),
        'utf8',
      ),
    ).code,
    'STRUCTURAL_VALIDATION_FAILED',
  );
});

test('documented candidate validation preserves the last-known-good packet until successful promotion', async () => {
  const fixture = await createPacketFixture({ profile: 'quick' });
  tempRoots.push(fixture.tempRoot);
  await renderPacket(fixture.packetRoot);
  const published = await readFile(
    join(fixture.packetRoot, 'packet.md'),
    'utf8',
  );

  fixture.manifest.schemaVersion = 99;
  await fixture.persist();
  const invalidCandidate = await validatePacket(fixture.packetRoot);
  assert.equal(
    invalidCandidate.valid,
    false,
    JSON.stringify(invalidCandidate, null, 2),
  );
  assert.equal(
    await readFile(join(fixture.packetRoot, 'packet.md'), 'utf8'),
    published,
  );
  await assert.rejects(renderPacket(fixture.packetRoot));
  assert.equal(
    await readFile(join(fixture.packetRoot, 'packet.md'), 'utf8'),
    published,
  );

  fixture.manifest.schemaVersion = 1;
  fixture.ledger.synthesis.answer = 'A successfully promoted replacement.';
  await fixture.persist();
  const validCandidate = await validatePacket(fixture.packetRoot);
  assert.equal(
    validCandidate.valid,
    true,
    JSON.stringify(validCandidate, null, 2),
  );
  await renderPacket(fixture.packetRoot);
  const replacement = await readFile(
    join(fixture.packetRoot, 'packet.md'),
    'utf8',
  );
  assert.notEqual(replacement, published);
  assert.match(replacement, /successfully promoted replacement/i);

  const fresh = await createPacketFixture({ profile: 'quick' });
  tempRoots.push(fresh.tempRoot);
  fresh.manifest.schemaVersion = 99;
  await fresh.persist();
  const structuralFailure = await validatePacket(fresh.packetRoot);
  assert.equal(structuralFailure.valid, false);
  await assert.rejects(readFile(join(fresh.packetRoot, 'packet.md'), 'utf8'));
});

test('parent handoff is directory-only and never leaks dossier contents', async () => {
  const injectedRoots = await roots();
  const result = await runFakeRecon({ profile: 'quick', roots: injectedRoots });
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
  assert.doesNotMatch(
    JSON.stringify(result),
    /alpha evidence|raw[\\/]dossiers/i,
  );
  assert.equal(result.directory, injectedRoots.packetRoot);
});

for (const reviewKind of ['semantic', 'adversarial', 'coverage']) {
  test(`missing ${reviewKind} review result blocks verified publication`, async () => {
    const injectedRoots = await roots();
    const result = await runFakeRecon({
      profile: 'standard',
      missingReviewResult: reviewKind,
      roots: injectedRoots,
    });
    assert.equal(result.status, 'failed');
    assert.equal(result.reason, 'STRUCTURAL_VALIDATION_FAILED');
    await assert.rejects(readFile(join(injectedRoots.packetRoot, 'packet.md')));
  });
}

test('tampered review result blocks verified publication', async () => {
  const injectedRoots = await roots();
  const result = await runFakeRecon({
    profile: 'standard',
    tamperReviewResult: 'semantic',
    roots: injectedRoots,
  });
  assert.equal(result.status, 'failed');
  assert.equal(result.reason, 'STRUCTURAL_VALIDATION_FAILED');
  await assert.rejects(readFile(join(injectedRoots.packetRoot, 'packet.md')));
});

test('standard workflow emits all typed review results and reconciles revision one into two', async () => {
  const injectedRoots = await roots();
  await runFakeRecon({ profile: 'standard', roots: injectedRoots });
  for (const reviewKind of ['semantic', 'adversarial', 'coverage']) {
    const result = JSON.parse(
      await readFile(
        join(injectedRoots.packetRoot, 'reviews', `${reviewKind}.json`),
        'utf8',
      ),
    );
    assert.equal(result.reviewKind, reviewKind);
    assert.equal(result.status, 'complete');
    assert.equal(result.dispositions[0].claimId, 'claim-1');
    const brief = JSON.parse(
      await readFile(join(injectedRoots.packetRoot, result.brief.path), 'utf8'),
    );
    const projectedClaims =
      brief.mode === 'adversary' ? brief.provisionalStatements : brief.claims;
    assert.equal(projectedClaims[0].id, 'claim-1');
    assert.equal(typeof projectedClaims[0].statement, 'string');
  }
  const reconciliation = JSON.parse(
    await readFile(
      join(injectedRoots.packetRoot, 'reviews', 'reconciliation.json'),
      'utf8',
    ),
  );
  assert.equal(reconciliation.inputLedger.revision, 1);
  assert.equal(reconciliation.outputRevision, 2);
  assert.deepEqual(
    reconciliation.incorporatedReviewIds.sort(),
    ['review-adversarial', 'review-coverage', 'review-semantic'].sort(),
  );
  const prior = JSON.parse(
    await readFile(
      join(injectedRoots.packetRoot, reconciliation.inputLedger.path),
      'utf8',
    ),
  );
  const current = JSON.parse(
    await readFile(join(injectedRoots.packetRoot, 'claims.json'), 'utf8'),
  );
  assert.equal(current.revision, 2);
  assert.equal(reconciliation.transitions[0].from, prior.claims[0].status);
  assert.deepEqual(current.claims[0].evidence, prior.claims[0].evidence);
  assert.deepEqual(
    current.claims[0].qualifications,
    prior.claims[0].qualifications,
  );
  assert.deepEqual(
    current.inputArtifacts
      .filter((reference) => reference.path.startsWith('reviews/'))
      .map((reference) => reference.path)
      .sort(),
    [
      'reviews/adversarial.json',
      'reviews/coverage.json',
      'reviews/semantic.json',
    ],
  );
});

test('thorough workflow receipts claim-bearing redundant and contradiction results', async () => {
  const injectedRoots = await roots();
  await runFakeRecon({ profile: 'thorough', roots: injectedRoots });
  const redundant = JSON.parse(
    await readFile(
      join(injectedRoots.packetRoot, 'reviews', 'redundant-verification.json'),
      'utf8',
    ),
  );
  assert.equal(redundant.reviewKind, 'redundant-verification');
  assert.deepEqual(redundant.dispositions, [
    { claimId: 'claim-1', disposition: 'affirmed' },
  ]);
  assert.equal(redundant.permittedInputs.length, 1);

  const contradiction = JSON.parse(
    await readFile(
      join(
        injectedRoots.packetRoot,
        'reviews',
        'contradiction-resolution.json',
      ),
      'utf8',
    ),
  );
  assert.equal(contradiction.reviewKind, 'contradiction-resolution');
  assert.deepEqual(contradiction.dispositions, [
    { claimId: 'claim-2', disposition: 'unresolved' },
  ]);
  assert.deepEqual(contradiction.contradictionDispositions, [
    {
      contradictionId: 'challenge-1',
      claimIds: ['claim-2'],
      disposition: 'unresolved',
    },
  ]);
});
