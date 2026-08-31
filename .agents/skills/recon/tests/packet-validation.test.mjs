import assert from 'node:assert/strict';
import { cp, mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { afterEach, test } from 'node:test';

import { hashCanonicalJson, hashFile } from '../scripts/lib/canonical-json.mjs';
import { validatePacket } from '../scripts/validate-packet.mjs';

const fixtureRoot = new URL('./fixtures/', import.meta.url);
const tempRoots = [];

afterEach(async () => {
  await Promise.all(
    tempRoots
      .splice(0)
      .map((root) => rm(root, { recursive: true, force: true })),
  );
});

function stagesFor(profile) {
  const modes = ['map', 'gather', 'compile', 'locator-validation'];
  if (profile === 'standard' || profile === 'thorough') {
    modes.push(
      'semantic-verification',
      'adversarial',
      'coverage',
      'reconciliation',
    );
  }
  if (profile === 'thorough') {
    modes.push(
      'redundant-gather',
      'redundant-verification',
      'contradiction-resolution',
    );
  }
  return modes.map((mode, index) => ({
    kind: 'recon.stage-result',
    schemaVersion: 1,
    id: `stage-${index + 1}`,
    mode,
    status: 'complete',
  }));
}

async function writeJson(path, value) {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function makePacket({
  profile = 'quick',
  status = 'complete',
  claimStatus = profile === 'quick' ? 'supported' : 'verified',
  sourceKind = 'file',
} = {}) {
  const root = await mkdtemp(join(tmpdir(), 'recon-packet-'));
  const packetRoot = join(root, 'packet');
  const sourceRoot = join(root, 'sources');
  tempRoots.push(root);
  await mkdir(join(packetRoot, 'raw', 'dossiers'), { recursive: true });
  await mkdir(join(packetRoot, 'raw', 'captures'), { recursive: true });
  await mkdir(join(packetRoot, 'reviews'), { recursive: true });
  await mkdir(sourceRoot, { recursive: true });

  const sourcePath = join(sourceRoot, 'source.txt');
  await cp(new URL('source.txt', fixtureRoot), sourcePath);
  const dossierPath = join(packetRoot, 'raw', 'dossiers', 'dossier-1.json');
  await writeJson(dossierPath, {
    kind: 'recon.raw-dossier',
    schemaVersion: 1,
    runId: 'run-1',
    waveId: 'wave-1',
    laneId: 'lane-1',
    mode: 'gather',
    outcome: 'complete',
    allowedInputs: ['source-1'],
    excludedInputs: [],
    findings: [],
    uncertainty: [],
    contradictions: [],
    gaps: [],
  });
  const dossierRef = {
    path: 'raw/dossiers/dossier-1.json',
    digest: await hashFile(dossierPath),
  };

  let source;
  let locator;
  if (sourceKind === 'repository') {
    source = {
      kind: 'repository',
      id: 'source-1',
      available: true,
      authority: 'contract-enforced',
      observedAt: '2026-08-31T00:00:00.000Z',
      validationState: 'pinned',
      root: sourceRoot,
      revision: 'abc123',
      dirty: false,
      contentHashes: { 'source.txt': await hashFile(sourcePath) },
    };
    locator = {
      kind: 'repository',
      path: 'source.txt',
      revision: 'abc123',
      lineStart: 1,
      lineEnd: 1,
    };
  } else if (sourceKind === 'url') {
    const capturePath = join(packetRoot, 'raw', 'captures', 'url.txt');
    await cp(new URL('url-capture.txt', fixtureRoot), capturePath);
    source = {
      kind: 'url',
      id: 'source-1',
      available: true,
      authority: 'provider-enforced',
      observedAt: '2026-08-31T00:00:00.000Z',
      validationState: 'pinned',
      url: 'https://example.test/evidence',
      capturePath: 'raw/captures/url.txt',
      captureDigest: await hashFile(capturePath),
    };
    locator = {
      kind: 'url',
      url: source.url,
      retrievedAt: source.observedAt,
    };
  } else if (sourceKind === 'command-output') {
    const capturePath = join(packetRoot, 'raw', 'captures', 'command.txt');
    await cp(new URL('command-output.txt', fixtureRoot), capturePath);
    source = {
      kind: 'command-output',
      id: 'source-1',
      available: true,
      authority: 'contract-enforced',
      observedAt: '2026-08-31T00:00:00.000Z',
      validationState: 'pinned',
      argv: ['example', '--read-only'],
      cwd: sourceRoot,
      exitStatus: 0,
      outputPath: 'raw/captures/command.txt',
      outputDigest: await hashFile(capturePath),
      environmentNames: ['PATH'],
    };
    locator = {
      kind: 'command-output',
      artifactPath: source.outputPath,
      lineStart: 1,
      lineEnd: 1,
      commandDigest: hashCanonicalJson(source.argv),
    };
  } else if (sourceKind === 'connected-resource') {
    const capturePath = join(packetRoot, 'raw', 'captures', 'connected.json');
    await cp(new URL('connected-resource.json', fixtureRoot), capturePath);
    source = {
      kind: 'connected-resource',
      id: 'source-1',
      available: true,
      authority: 'provider-enforced',
      observedAt: '2026-08-31T00:00:00.000Z',
      validationState: 'pinned',
      system: 'fixture',
      resourceId: 'resource-1',
      resourceVersion: 'v1',
      capturePath: 'raw/captures/connected.json',
      captureDigest: await hashFile(capturePath),
    };
    locator = {
      kind: 'connected-resource',
      system: source.system,
      resourceId: source.resourceId,
      resourceVersion: 'v1',
      fieldOrSection: 'finding',
      retrievedAt: source.observedAt,
    };
  } else {
    source = {
      kind: 'file',
      id: 'source-1',
      available: true,
      authority: 'contract-enforced',
      observedAt: '2026-08-31T00:00:00.000Z',
      validationState: 'pinned',
      path: sourcePath,
      contentHash: await hashFile(sourcePath),
    };
    locator = { kind: 'file', path: sourcePath, lineStart: 1, lineEnd: 1 };
  }

  const evidence = {
    id: 'evidence-1',
    sourceId: 'source-1',
    locator,
    displayExcerpt: 'alpha evidence',
    observedAt: '2026-08-31T00:00:00.000Z',
    contentHash: hashCanonicalJson('alpha evidence'),
    locatorValidation: {
      status: 'exact',
      validatedAt: '2026-08-31T00:01:00.000Z',
    },
    provenance: dossierRef,
  };
  const ledger = {
    kind: 'recon.claim-ledger',
    schemaVersion: 1,
    runId: 'run-1',
    revision: 1,
    inputArtifacts: [dossierRef],
    synthesis: {
      answer: 'The fixture contains alpha evidence.',
      keyClaimIds: ['claim-1'],
      caveats: [],
      unresolvedQuestionIds: [],
    },
    evidence: [evidence],
    claims: [
      {
        id: 'claim-1',
        statement: 'The fixture contains alpha evidence.',
        status: claimStatus,
        evidence: [{ evidenceId: 'evidence-1', relation: 'supports' }],
        qualifications: [],
        reviewIds:
          claimStatus === 'verified'
            ? ['review-semantic', 'review-adversarial', 'review-coverage']
            : [],
        derivedFrom: [dossierRef],
        challenges: [],
      },
    ],
    unresolvedQuestions: [],
    transitions: [
      {
        claimId: 'claim-1',
        from: 'provisional',
        to: claimStatus,
      },
    ],
  };
  const claimsPath = join(packetRoot, 'claims.json');
  await writeJson(claimsPath, ledger);
  const claimsRef = {
    path: 'claims.json',
    digest: await hashFile(claimsPath),
  };
  const approvalEnvelope = {
    provider: 'fixture-provider',
    model: 'fixture-model',
    effort: 'high',
    route: 'fake',
    role: 'recon-worker',
    serviceTier: 'fixture',
    waves: [{ id: 'wave-1', laneCap: 1, concurrency: 1 }],
  };
  const manifest = {
    kind: 'recon.packet-manifest',
    schemaVersion: 1,
    run: {
      id: 'run-1',
      topic: 'fixture',
      status,
      requestedProfile: profile,
      achievedProfile: profile,
      createdAt: '2026-08-31T00:00:00.000Z',
      updatedAt: '2026-08-31T00:02:00.000Z',
    },
    request: {
      objective: 'Find fixture evidence.',
      questions: ['What evidence exists?'],
      includedScope: ['fixture'],
      excludedScope: [],
      contextReferences: [],
      outputPath: packetRoot,
    },
    sources: [source],
    execution: {
      approvalEnvelope,
      approvalFingerprint: hashCanonicalJson(approvalEnvelope),
    },
    stages: stagesFor(profile),
    artifacts: [claimsRef, dossierRef],
    gaps: [],
  };
  const manifestPath = join(packetRoot, 'manifest.json');
  await writeJson(manifestPath, manifest);

  return {
    packetRoot,
    sourceRoot,
    sourcePath,
    manifestPath,
    claimsPath,
    manifest,
    ledger,
  };
}

async function persist(packet) {
  await writeJson(packet.claimsPath, packet.ledger);
  const claimRef = packet.manifest.artifacts.find(
    (artifact) => artifact.path === 'claims.json',
  );
  if (claimRef) claimRef.digest = await hashFile(packet.claimsPath);
  await writeJson(packet.manifestPath, packet.manifest);
}

async function expectInvalid(packet, code) {
  const result = await validatePacket(packet.packetRoot);
  assert.equal(result.valid, false, JSON.stringify(result, null, 2));
  assert.ok(
    result.errors.some((error) => error.code === code),
    `expected ${code}, got ${result.errors.map((error) => error.code).join(', ')}`,
  );
  return result;
}

for (const profile of ['quick', 'standard', 'thorough']) {
  test(`valid ${profile} packet derives the requested profile`, async () => {
    const packet = await makePacket({ profile });
    const result = await validatePacket(packet.packetRoot);
    assert.equal(result.valid, true, JSON.stringify(result, null, 2));
    assert.equal(result.achievedProfile, profile);
    assert.equal(result.publishable, true);
  });
}

test('valid lower-assurance packet publishes as an honest partial', async () => {
  const packet = await makePacket({ profile: 'standard', status: 'partial' });
  packet.manifest.stages = stagesFor('quick');
  packet.manifest.run.achievedProfile = 'quick';
  packet.ledger.claims[0].status = 'supported';
  packet.ledger.claims[0].reviewIds = [];
  packet.ledger.transitions[0].to = 'supported';
  packet.manifest.gaps.push({
    id: 'gap-1',
    code: 'PASS_OMITTED',
    message: 'Independent review did not complete.',
  });
  await persist(packet);
  const result = await validatePacket(packet.packetRoot);
  assert.equal(result.valid, true, JSON.stringify(result, null, 2));
  assert.equal(result.achievedProfile, 'quick');
  assert.equal(result.status, 'partial');
});

test('rejects invalid schema versions and duplicate identifiers', async () => {
  const versioned = await makePacket();
  versioned.ledger.schemaVersion = 99;
  await persist(versioned);
  await expectInvalid(versioned, 'UNSUPPORTED_SCHEMA_VERSION');

  const duplicate = await makePacket();
  duplicate.ledger.claims.push(structuredClone(duplicate.ledger.claims[0]));
  await persist(duplicate);
  await expectInvalid(duplicate, 'DUPLICATE_ID');
});

test('rejects illegal claim state transitions and quick verification', async () => {
  const transition = await makePacket();
  transition.ledger.transitions[0] = {
    claimId: 'claim-1',
    from: 'unsupported',
    to: 'verified',
  };
  await persist(transition);
  await expectInvalid(transition, 'ILLEGAL_CLAIM_TRANSITION');

  const quick = await makePacket({ claimStatus: 'verified' });
  await expectInvalid(quick, 'PROFILE_ASSURANCE_EXCEEDED');
});

test('rejects missing artifacts, hash mismatches, and path escape', async () => {
  const missing = await makePacket();
  await rm(join(missing.packetRoot, 'raw', 'dossiers', 'dossier-1.json'));
  await expectInvalid(missing, 'MISSING_ARTIFACT');

  const mismatch = await makePacket();
  mismatch.manifest.artifacts[0].digest = `sha256:${'0'.repeat(64)}`;
  await writeJson(mismatch.manifestPath, mismatch.manifest);
  await expectInvalid(mismatch, 'ARTIFACT_DIGEST_MISMATCH');

  const escape = await makePacket();
  escape.manifest.artifacts.push({
    path: '../outside.json',
    digest: `sha256:${'0'.repeat(64)}`,
  });
  await writeJson(escape.manifestPath, escape.manifest);
  await expectInvalid(escape, 'PATH_ESCAPE');
});

test('detects source drift, wrong excerpts, and shifted lines', async () => {
  const drift = await makePacket({ sourceKind: 'repository' });
  await writeFile(drift.sourcePath, 'changed evidence\n', 'utf8');
  await expectInvalid(drift, 'SOURCE_DRIFT');

  const excerpt = await makePacket();
  excerpt.ledger.evidence[0].displayExcerpt = 'wrong excerpt';
  await persist(excerpt);
  await expectInvalid(excerpt, 'LOCATOR_EXCERPT_MISMATCH');

  const shifted = await makePacket();
  shifted.ledger.evidence[0].locator.lineStart = 2;
  shifted.ledger.evidence[0].locator.lineEnd = 2;
  await persist(shifted);
  await expectInvalid(shifted, 'LOCATOR_EXCERPT_MISMATCH');
});

for (const sourceKind of ['url', 'command-output', 'connected-resource']) {
  test(`detects changed ${sourceKind} captures`, async () => {
    const packet = await makePacket({ sourceKind });
    const source = packet.manifest.sources[0];
    const relativePath = source.capturePath ?? source.outputPath;
    await writeFile(join(packet.packetRoot, relativePath), 'changed\n', 'utf8');
    await expectInvalid(packet, 'SOURCE_DRIFT');
  });
}

test('rejects connected-resource version drift and insufficient provenance', async () => {
  const version = await makePacket({ sourceKind: 'connected-resource' });
  version.ledger.evidence[0].locator.resourceVersion = 'v2';
  await persist(version);
  await expectInvalid(version, 'SOURCE_VERSION_MISMATCH');

  const provenance = await makePacket({ sourceKind: 'url' });
  delete provenance.manifest.sources[0].captureDigest;
  await writeJson(provenance.manifestPath, provenance.manifest);
  await expectInvalid(provenance, 'INSUFFICIENT_PROVENANCE');
});

test('rejects approval fingerprint drift and unresolved verification challenge', async () => {
  const approval = await makePacket();
  approval.manifest.execution.approvalEnvelope.effort = 'low';
  await writeJson(approval.manifestPath, approval.manifest);
  await expectInvalid(approval, 'APPROVAL_FINGERPRINT_MISMATCH');

  const challenged = await makePacket({ profile: 'standard' });
  challenged.ledger.claims[0].challenges.push({
    id: 'challenge-1',
    material: true,
    status: 'unresolved',
  });
  await persist(challenged);
  await expectInvalid(challenged, 'UNRESOLVED_VERIFICATION_CHALLENGE');
});

test('accepts transiently validated redacted-exact evidence without persisting secrets', async () => {
  const packet = await makePacket();
  await writeFile(packet.sourcePath, 'token=super-secret-value\n', 'utf8');
  const source = packet.manifest.sources[0];
  source.contentHash = await hashFile(packet.sourcePath);
  const evidence = packet.ledger.evidence[0];
  evidence.displayExcerpt = 'token=[REDACTED]';
  evidence.locatorValidation.status = 'redacted-exact';
  delete evidence.contentHash;
  evidence.redaction = {
    applied: true,
    categories: ['credential'],
    originalPersisted: false,
  };
  await persist(packet);
  const result = await validatePacket(packet.packetRoot);
  assert.equal(result.valid, true, JSON.stringify(result, null, 2));
  assert.doesNotMatch(JSON.stringify(result), /super-secret-value/);
  assert.doesNotMatch(
    await readFile(packet.claimsPath, 'utf8'),
    /super-secret-value/,
  );
});

test('rejects an unredacted secret span without echoing it in diagnostics', async () => {
  const packet = await makePacket();
  await writeFile(packet.sourcePath, 'token=super-secret-value\n', 'utf8');
  packet.manifest.sources[0].contentHash = await hashFile(packet.sourcePath);
  packet.ledger.evidence[0].displayExcerpt = 'token=super-secret-value';
  packet.ledger.evidence[0].contentHash = hashCanonicalJson(
    'token=super-secret-value',
  );
  await persist(packet);
  const result = await expectInvalid(packet, 'UNREDACTED_SECRET');
  assert.doesNotMatch(JSON.stringify(result), /super-secret-value/);
});

test('structural failure removes a stale packet entry point', async () => {
  const packet = await makePacket();
  await writeFile(join(packet.packetRoot, 'packet.md'), '# stale\n', 'utf8');
  packet.manifest.schemaVersion = 99;
  await writeJson(packet.manifestPath, packet.manifest);
  const result = await validatePacket(packet.packetRoot, {
    removePublishedOnFailure: true,
  });
  assert.equal(result.valid, false);
  await assert.rejects(readFile(join(packet.packetRoot, 'packet.md'), 'utf8'));
  assert.equal(basename(result.packetRoot), basename(packet.packetRoot));
});
