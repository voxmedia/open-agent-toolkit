import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, test } from 'node:test';

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
  const root = await mkdtemp(join(tmpdir(), 'fake-recon-workflow-'));
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
  assert.equal(prepared.selection.role, 'generic');
  assert.equal(approved.approvalEnvelope.role, 'generic');
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
});
