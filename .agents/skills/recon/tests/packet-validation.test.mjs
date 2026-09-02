import assert from 'node:assert/strict';
import {
  cp,
  mkdtemp,
  mkdir,
  readFile,
  realpath,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { afterEach, test } from 'node:test';

import { hashCanonicalJson, hashFile } from '../scripts/lib/canonical-json.mjs';
import { validatePacket } from '../scripts/validate-packet.mjs';
import {
  createApprovalBinding,
  createApprovalProjection,
} from './fixtures/packet-fixture.mjs';

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
    waveId: `wave-${mode}`,
    mode,
    status: 'complete',
    artifactIds: [],
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
  const root = await realpath(await mkdtemp(join(tmpdir(), 'recon-packet-')));
  const packetRoot = join(root, 'packet');
  const sourceRoot = join(root, 'sources');
  tempRoots.push(root);
  await mkdir(join(packetRoot, 'raw', 'dossiers'), { recursive: true });
  await mkdir(join(packetRoot, 'raw', 'captures'), { recursive: true });
  await mkdir(join(packetRoot, 'reviews'), { recursive: true });
  await mkdir(sourceRoot, { recursive: true });

  let sourcePath = join(sourceRoot, 'source.txt');
  await cp(new URL('source.txt', fixtureRoot), sourcePath);
  sourcePath = await realpath(sourcePath);
  const dossierPath = join(packetRoot, 'raw', 'dossiers', 'dossier-1.json');
  await writeJson(dossierPath, {
    kind: 'recon.raw-dossier',
    schemaVersion: 1,
    id: 'dossier-gather',
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
      root: await realpath(sourceRoot),
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
    revision: profile === 'quick' ? 1 : 2,
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
            ? [
                'review-semantic',
                'review-adversarial',
                'review-coverage',
                ...(profile === 'thorough'
                  ? [
                      'review-redundant-verification',
                      'review-contradiction-resolution',
                    ]
                  : []),
              ]
            : [],
        derivedFrom: [dossierRef],
        challenges:
          profile === 'thorough'
            ? [{ id: 'challenge-1', material: false, status: 'resolved' }]
            : [],
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
  const reviewArtifacts = [];
  const reviewPaths = new Map();
  if (profile !== 'quick') {
    const priorLedger = structuredClone(ledger);
    priorLedger.revision = 1;
    priorLedger.claims[0].status = 'supported';
    priorLedger.claims[0].reviewIds = [];
    priorLedger.transitions[0] = {
      claimId: 'claim-1',
      from: 'provisional',
      to: 'supported',
    };
    const priorPath = join(packetRoot, 'raw', 'drafts', 'claims-v1.json');
    await mkdir(join(packetRoot, 'raw', 'drafts'), { recursive: true });
    await writeJson(priorPath, priorLedger);
    const priorRef = {
      path: 'raw/drafts/claims-v1.json',
      digest: await hashFile(priorPath),
    };
    ledger.transitions[0] = {
      claimId: 'claim-1',
      from: 'supported',
      to: claimStatus,
    };
    ledger.inputArtifacts.push(priorRef);
    reviewArtifacts.push(priorRef);

    const verifyBrief = {
      kind: 'recon.review-brief',
      schemaVersion: 1,
      id: 'brief-verify',
      runId: 'run-1',
      mode: 'verify',
      createdAt: '2026-08-31T00:03:00.000Z',
      excludedInputs: ['prior_reasoning'],
      claims: [
        {
          id: 'claim-1',
          statement: ledger.claims[0].statement,
          evidence: [
            {
              id: evidence.id,
              sourceId: evidence.sourceId,
              displayExcerpt: evidence.displayExcerpt,
              locator: structuredClone(evidence.locator),
            },
          ],
        },
      ],
      sources: [structuredClone(source)],
    };
    const adversaryBrief = {
      kind: 'recon.review-brief',
      schemaVersion: 1,
      id: 'brief-adversary',
      runId: 'run-1',
      mode: 'adversary',
      createdAt: '2026-08-31T00:03:00.000Z',
      excludedInputs: ['prior_reasoning'],
      scope: { included: ['fixture'], excluded: [] },
      questions: ['What evidence exists?'],
      provisionalStatements: [
        { id: 'claim-1', statement: ledger.claims[0].statement },
      ],
    };
    const coverageBrief = {
      kind: 'recon.review-brief',
      schemaVersion: 1,
      id: 'brief-coverage',
      runId: 'run-1',
      mode: 'coverage',
      createdAt: '2026-08-31T00:03:00.000Z',
      excludedInputs: ['prior_reasoning'],
      scope: { included: ['fixture'], excluded: [] },
      questions: ['What evidence exists?'],
      claims: [{ id: 'claim-1', statement: ledger.claims[0].statement }],
    };
    const briefSpecs = [
      ['verify', verifyBrief],
      ['adversary', adversaryBrief],
      ['coverage', coverageBrief],
      ...(profile === 'thorough'
        ? [
            [
              'redundant-verify',
              { ...structuredClone(verifyBrief), id: 'brief-redundant-verify' },
            ],
            [
              'contradiction-resolution',
              {
                ...structuredClone(adversaryBrief),
                id: 'brief-contradiction-resolution',
              },
            ],
          ]
        : []),
    ];
    for (const [name, brief] of briefSpecs) {
      const path = join(packetRoot, 'reviews', 'briefs', `${name}.json`);
      await mkdir(join(packetRoot, 'reviews', 'briefs'), { recursive: true });
      await writeJson(path, brief);
      const ref = {
        path: `reviews/briefs/${name}.json`,
        digest: await hashFile(path),
      };
      reviewPaths.set(`brief-${name}`, { path, value: brief, ref });
      reviewArtifacts.push(ref);
    }
    const resultSpecs = [
      ['review-semantic', 'semantic', 'brief-verify', 'affirmed'],
      ['review-adversarial', 'adversarial', 'brief-adversary', 'unchallenged'],
      ['review-coverage', 'coverage', 'brief-coverage', 'covered'],
      ...(profile === 'thorough'
        ? [
            [
              'review-redundant-verification',
              'redundant-verification',
              'brief-redundant-verify',
              'affirmed',
            ],
            [
              'review-contradiction-resolution',
              'contradiction-resolution',
              'brief-contradiction-resolution',
              'resolved',
            ],
          ]
        : []),
    ];
    for (const [id, reviewKind, briefId, disposition] of resultSpecs) {
      const brief = reviewPaths.get(briefId);
      const value = {
        kind: 'recon.review-result',
        schemaVersion: 1,
        id,
        runId: 'run-1',
        reviewKind,
        reviewerLane: `lane-${reviewKind}`,
        status: 'complete',
        brief: { ...brief.ref },
        permittedInputs: [{ ...brief.ref }],
        excludedInputs: ['prior_reasoning'],
        dispositions: [{ claimId: 'claim-1', disposition }],
        newEvidence: [],
        evidenceAssociations: [],
        coverageFindings: [],
        unresolvedIssues: [],
        ...(reviewKind === 'contradiction-resolution'
          ? {
              contradictionDispositions: [
                {
                  contradictionId: 'challenge-1',
                  claimIds: ['claim-1'],
                  disposition: 'resolved',
                },
              ],
            }
          : {}),
      };
      const path = join(packetRoot, 'reviews', `${reviewKind}.json`);
      await writeJson(path, value);
      const ref = {
        path: `reviews/${reviewKind}.json`,
        digest: await hashFile(path),
      };
      reviewPaths.set(id, { path, value, ref });
      reviewArtifacts.push(ref);
    }
    const reconciliation = {
      kind: 'recon.review-result',
      schemaVersion: 1,
      id: 'review-reconciliation',
      runId: 'run-1',
      reviewKind: 'reconciliation',
      reviewerLane: 'lane-reconciliation',
      status: 'complete',
      inputLedger: { ...priorRef, revision: 1 },
      outputRevision: 2,
      incorporatedReviewIds: [
        'review-semantic',
        'review-adversarial',
        'review-coverage',
        ...(profile === 'thorough'
          ? ['review-redundant-verification', 'review-contradiction-resolution']
          : []),
      ],
      transitions: structuredClone(ledger.transitions),
      additions: [],
      removals: [],
      removalDispositions: [],
      coverageDispositions: [],
      permittedInputs: [
        priorRef,
        ...reviewArtifacts.filter((ref) => ref.path.startsWith('reviews/')),
      ],
      excludedInputs: [],
      dispositions: [],
      newEvidence: [],
      evidenceAssociations: [],
      coverageFindings: [],
      unresolvedIssues: [],
    };
    const reconciliationPath = join(
      packetRoot,
      'reviews',
      'reconciliation.json',
    );
    await writeJson(reconciliationPath, reconciliation);
    const ref = {
      path: 'reviews/reconciliation.json',
      digest: await hashFile(reconciliationPath),
    };
    reviewPaths.set('review-reconciliation', {
      path: reconciliationPath,
      value: reconciliation,
      ref,
    });
    reviewArtifacts.push(ref);
  }
  const claimsPath = join(packetRoot, 'claims.json');
  await writeJson(claimsPath, ledger);
  const claimsRef = {
    path: 'claims.json',
    digest: await hashFile(claimsPath),
  };
  const stageDefinitions = stagesFor(profile);
  const stageLaneId = (stage) =>
    stage.mode === 'semantic-verification'
      ? 'lane-semantic'
      : `lane-${stage.mode}`;
  const approvalProjection = createApprovalProjection({
    runId: 'run-1',
    stages: stageDefinitions,
    laneIdForStage: stageLaneId,
    concurrency: profile === 'thorough' ? 4 : 2,
    laneCap: profile === 'thorough' ? 20 : 10,
  });
  const approvalBinding = createApprovalBinding(approvalProjection);
  const stageArtifacts = [];
  const stageRows = [];
  for (const stage of stageDefinitions) {
    const laneId = stageLaneId(stage);
    let artifactId;
    if (stage.mode === 'semantic-verification') artifactId = 'review-semantic';
    else if (stage.mode === 'adversarial') artifactId = 'review-adversarial';
    else if (stage.mode === 'coverage') artifactId = 'review-coverage';
    else if (stage.mode === 'reconciliation')
      artifactId = 'review-reconciliation';
    else if (stage.mode === 'redundant-verification')
      artifactId = 'review-redundant-verification';
    else if (stage.mode === 'contradiction-resolution')
      artifactId = 'review-contradiction-resolution';
    else {
      artifactId = `stage-artifact-${stage.mode}`;
      const mode =
        stage.mode === 'locator-validation'
          ? 'verify'
          : stage.mode === 'redundant-gather'
            ? 'gather'
            : stage.mode;
      const path = join(
        packetRoot,
        'raw',
        'dossiers',
        `stage-${stage.mode}.json`,
      );
      await writeJson(path, {
        kind: 'recon.raw-dossier',
        schemaVersion: 1,
        id: artifactId,
        runId: 'run-1',
        waveId: `wave-${stage.mode}`,
        laneId,
        mode,
        outcome: 'complete',
        allowedInputs: ['source-1'],
        excludedInputs: [],
        findings: [],
        uncertainty: [],
        contradictions: [],
        gaps: [],
      });
      stageArtifacts.push({
        path: `raw/dossiers/stage-${stage.mode}.json`,
        digest: await hashFile(path),
      });
    }
    const dispatchReceiptIds = [];
    for (const state of ['prepared', 'approved', 'accepted', 'completed']) {
      const id = `dispatch-${stage.id}-${state}`;
      const path = join(packetRoot, 'raw', 'dispatch', `${id}.json`);
      await mkdir(join(packetRoot, 'raw', 'dispatch'), { recursive: true });
      await writeJson(path, {
        kind: 'recon.dispatch-receipt',
        schemaVersion: 1,
        id,
        runId: 'run-1',
        stageId: stage.id,
        laneId,
        state,
        approvalProjection,
        approvalCanonicalJson: approvalBinding.approvalCanonicalJson,
        approvalFingerprint: approvalBinding.approvalFingerprint,
        approvedAt: state === 'prepared' ? null : approvalBinding.approvedAt,
        approvalEvidence:
          state === 'prepared' ? null : approvalBinding.approvalEvidence,
        catalogRecheck:
          state === 'accepted' || state === 'completed'
            ? approvalBinding.catalogRecheck
            : null,
        launchAcceptance:
          state === 'accepted' || state === 'completed'
            ? {
                status: 'accepted',
                acceptedAt: '2026-08-31T00:01:00.000Z',
                handle: `handle-${stage.id}`,
              }
            : null,
        terminalOutcome:
          state === 'completed'
            ? {
                status: 'completed',
                completedAt: '2026-08-31T00:01:30.000Z',
              }
            : null,
        ...(state === 'completed' ? { artifactIds: [artifactId] } : {}),
      });
      stageArtifacts.push({
        path: `raw/dispatch/${id}.json`,
        digest: await hashFile(path),
      });
      dispatchReceiptIds.push(id);
    }
    stageRows.push({
      ...stage,
      laneId,
      artifactIds: [artifactId],
      dispatchReceiptIds,
    });
  }
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
      ...approvalBinding,
    },
    stages: stageRows,
    artifacts: [claimsRef, dossierRef, ...reviewArtifacts, ...stageArtifacts],
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
    reviewPaths,
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

async function persistReview(packet, id, { updateManifest = true } = {}) {
  const review = packet.reviewPaths.get(id);
  await writeJson(review.path, review.value);
  if (updateManifest) review.ref.digest = await hashFile(review.path);
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

for (const sourceKind of [
  'repository',
  'url',
  'command-output',
  'connected-resource',
]) {
  test(`valid ${sourceKind} locator reopens its exact source identity`, async () => {
    const packet = await makePacket({ sourceKind });
    const result = await validatePacket(packet.packetRoot);
    assert.equal(result.valid, true, JSON.stringify(result, null, 2));
  });
}

test('valid lower-assurance packet publishes as an honest partial', async () => {
  const packet = await makePacket({ profile: 'standard', status: 'partial' });
  const omittedStages = packet.manifest.stages.slice(4);
  for (const stage of omittedStages) {
    stage.status = 'omitted';
    stage.artifactIds = [];
    stage.dispatchReceiptIds = [];
    stage.message = `${stage.mode} was omitted after the quick profile completed.`;
  }
  packet.manifest.artifacts = packet.manifest.artifacts.filter(
    (artifact) => !artifact.path.startsWith('reviews/'),
  );
  packet.manifest.run.achievedProfile = 'quick';
  packet.ledger.claims[0].status = 'supported';
  packet.ledger.claims[0].reviewIds = [];
  packet.ledger.revision = 1;
  packet.ledger.transitions[0] = {
    claimId: 'claim-1',
    from: 'provisional',
    to: 'supported',
  };
  packet.manifest.gaps.push(
    ...omittedStages.map((stage, index) => ({
      id: `gap-${index + 1}`,
      code: 'PASS_OMITTED',
      message: `${stage.mode} was omitted after the quick profile completed.`,
      material: true,
    })),
  );
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

test('revision-one provisional claims use genesis rather than an invented transition', async () => {
  const genesis = await makePacket({ claimStatus: 'provisional' });
  genesis.ledger.transitions = [];
  await persist(genesis);
  const valid = await validatePacket(genesis.packetRoot);
  assert.equal(valid.valid, true, JSON.stringify(valid, null, 2));

  const incoming = await makePacket({ claimStatus: 'provisional' });
  incoming.ledger.transitions = [
    { claimId: 'claim-1', from: 'unsupported', to: 'provisional' },
  ];
  await persist(incoming);
  await expectInvalid(incoming, 'INVALID_PROVISIONAL_GENESIS');

  const self = await makePacket({ claimStatus: 'provisional' });
  self.ledger.transitions = [
    { claimId: 'claim-1', from: 'provisional', to: 'provisional' },
  ];
  await persist(self);
  await expectInvalid(self, 'ILLEGAL_CLAIM_TRANSITION');

  const later = await makePacket({ claimStatus: 'provisional' });
  later.ledger.revision = 2;
  later.ledger.transitions = [];
  await persist(later);
  await expectInvalid(later, 'INVALID_PROVISIONAL_GENESIS');
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
  approval.manifest.execution.approvalProjection.selection.effort_selector =
    'low';
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

test('verified claims require unique complete typed review results bound to immutable briefs', async () => {
  const missing = await makePacket({ profile: 'standard' });
  missing.ledger.claims[0].reviewIds[0] = 'review-missing';
  await persist(missing);
  await expectInvalid(missing, 'MISSING_INDEPENDENT_REVIEW');

  const duplicate = await makePacket({ profile: 'standard' });
  duplicate.ledger.claims[0].reviewIds = [
    'review-semantic',
    'review-semantic',
    'review-coverage',
  ];
  await persist(duplicate);
  await expectInvalid(duplicate, 'DUPLICATE_REVIEW_ID');

  const wrongKind = await makePacket({ profile: 'standard' });
  wrongKind.reviewPaths.get('review-semantic').value.reviewKind =
    'reconciliation';
  await persistReview(wrongKind, 'review-semantic');
  await expectInvalid(wrongKind, 'REVIEW_KIND_MISMATCH');

  const wrongBrief = await makePacket({ profile: 'standard' });
  wrongBrief.reviewPaths.get('review-semantic').value.brief.digest =
    `sha256:${'0'.repeat(64)}`;
  await persistReview(wrongBrief, 'review-semantic');
  await expectInvalid(wrongBrief, 'REVIEW_BRIEF_MISMATCH');

  const failed = await makePacket({ profile: 'standard' });
  failed.reviewPaths.get('review-semantic').value.status = 'failed';
  await persistReview(failed, 'review-semantic');
  await expectInvalid(failed, 'INCOMPLETE_INDEPENDENT_REVIEW');

  const disposition = await makePacket({ profile: 'standard' });
  disposition.reviewPaths.get(
    'review-adversarial',
  ).value.dispositions[0].disposition = 'challenged';
  await persistReview(disposition, 'review-adversarial');
  await expectInvalid(disposition, 'REVIEW_DISPOSITION_MISMATCH');

  const tampered = await makePacket({ profile: 'standard' });
  tampered.reviewPaths
    .get('review-coverage')
    .value.unresolvedIssues.push('tampered without manifest rehash');
  await persistReview(tampered, 'review-coverage', { updateManifest: false });
  await expectInvalid(tampered, 'ARTIFACT_DIGEST_MISMATCH');
});

test('persisted review evidence associations reject cross-claim, duplicate, conflicting, and unincorporated links', async () => {
  const evidenceFor = (packet, id, excerpt = 'Review evidence.') => ({
    ...structuredClone(packet.ledger.evidence[0]),
    id,
    displayExcerpt: excerpt,
  });
  const associationFor = (evidenceId, claimId = 'claim-1') => ({
    evidenceId,
    claimId,
    relation: 'supports',
  });

  const crossClaim = await makePacket({ profile: 'standard' });
  const crossSemantic = crossClaim.reviewPaths.get('review-semantic').value;
  crossSemantic.newEvidence = [
    evidenceFor(crossClaim, 'evidence-review-cross-claim'),
  ];
  crossSemantic.evidenceAssociations = [
    associationFor('evidence-review-cross-claim', 'claim-2'),
  ];
  await persistReview(crossClaim, 'review-semantic');
  await expectInvalid(crossClaim, 'REVIEW_EVIDENCE_ASSOCIATION_MISMATCH');

  const duplicate = await makePacket({ profile: 'standard' });
  const duplicateSemantic = duplicate.reviewPaths.get('review-semantic').value;
  duplicateSemantic.newEvidence = [
    evidenceFor(duplicate, 'evidence-review-duplicate'),
  ];
  duplicateSemantic.evidenceAssociations = [
    associationFor('evidence-review-duplicate'),
    associationFor('evidence-review-duplicate'),
  ];
  await persistReview(duplicate, 'review-semantic');
  await expectInvalid(duplicate, 'REVIEW_EVIDENCE_ASSOCIATION_MISMATCH');

  const conflicting = await makePacket({ profile: 'standard' });
  const conflictingSemantic =
    conflicting.reviewPaths.get('review-semantic').value;
  const conflictingAdversarial =
    conflicting.reviewPaths.get('review-adversarial').value;
  conflictingSemantic.newEvidence = [
    evidenceFor(conflicting, 'evidence-review-conflict', 'first bytes'),
  ];
  conflictingSemantic.evidenceAssociations = [
    associationFor('evidence-review-conflict'),
  ];
  conflictingAdversarial.newEvidence = [
    evidenceFor(conflicting, 'evidence-review-conflict', 'different bytes'),
  ];
  conflictingAdversarial.evidenceAssociations = [
    associationFor('evidence-review-conflict'),
  ];
  await persistReview(conflicting, 'review-semantic');
  await persistReview(conflicting, 'review-adversarial');
  await expectInvalid(conflicting, 'RECONCILIATION_EVIDENCE_INVENTION');

  const unincorporated = await makePacket({ profile: 'standard' });
  const unincorporatedSemantic =
    unincorporated.reviewPaths.get('review-semantic').value;
  unincorporatedSemantic.newEvidence = [
    evidenceFor(unincorporated, 'evidence-review-unincorporated'),
  ];
  unincorporatedSemantic.evidenceAssociations = [];
  await persistReview(unincorporated, 'review-semantic');
  await expectInvalid(unincorporated, 'REVIEW_EVIDENCE_ASSOCIATION_MISMATCH');

  const invented = await makePacket({ profile: 'standard' });
  const inventedSemantic = invented.reviewPaths.get('review-semantic').value;
  inventedSemantic.evidenceAssociations = [
    associationFor('evidence-review-not-supplied'),
  ];
  await persistReview(invented, 'review-semantic');
  await expectInvalid(invented, 'REVIEW_EVIDENCE_ASSOCIATION_MISMATCH');

  const noNewEvidence = await makePacket({ profile: 'standard' });
  const valid = await validatePacket(noNewEvidence.packetRoot);
  assert.equal(valid.valid, true, JSON.stringify(valid, null, 2));
});

test('closed schemas reject incomplete declared artifacts and missing ledger sections', async () => {
  const packet = await makePacket({ profile: 'standard' });
  delete packet.ledger.synthesis;
  await persist(packet);
  await expectInvalid(packet, 'MISSING_REQUIRED_FIELD');

  const result = await makePacket({ profile: 'standard' });
  delete result.reviewPaths.get('review-semantic').value.permittedInputs;
  await persistReview(result, 'review-semantic');
  await expectInvalid(result, 'MISSING_REQUIRED_FIELD');
});

test('reconciliation binds the prior ledger revision and exact transitions', async () => {
  const revision = await makePacket({ profile: 'standard' });
  revision.reviewPaths.get('review-reconciliation').value.inputLedger.revision =
    2;
  await persistReview(revision, 'review-reconciliation');
  await expectInvalid(revision, 'RECONCILIATION_REVISION_MISMATCH');

  const transitions = await makePacket({ profile: 'standard' });
  transitions.reviewPaths.get('review-reconciliation').value.transitions = [];
  await persistReview(transitions, 'review-reconciliation');
  await expectInvalid(transitions, 'RECONCILIATION_TRANSITION_MISMATCH');
});

test('only exact and redacted-exact locator states are assurance eligible', async () => {
  for (const state of ['stale', 'invalid']) {
    const packet = await makePacket();
    packet.ledger.evidence[0].locatorValidation.status = state;
    await persist(packet);
    await expectInvalid(packet, 'CLAIM_ASSURANCE_INVALID');
  }

  const retained = await makePacket();
  retained.ledger.evidence[0].locatorValidation.status = 'stale';
  retained.ledger.claims[0].status = 'provisional';
  retained.ledger.transitions = [];
  await persist(retained);
  const result = await validatePacket(retained.packetRoot);
  assert.equal(result.valid, true, JSON.stringify(result, null, 2));
});

test('locators bind exact source identity, observation time, and version tokens', async () => {
  const file = await makePacket();
  file.ledger.evidence[0].locator.path = join(file.sourceRoot, 'other.txt');
  await persist(file);
  await expectInvalid(file, 'SOURCE_IDENTITY_MISMATCH');

  const repository = await makePacket({ sourceKind: 'repository' });
  repository.ledger.evidence[0].locator.revision = 'def456';
  await persist(repository);
  await expectInvalid(repository, 'SOURCE_VERSION_MISMATCH');

  const url = await makePacket({ sourceKind: 'url' });
  url.ledger.evidence[0].locator.url = 'https://example.test/other';
  await persist(url);
  await expectInvalid(url, 'SOURCE_VERSION_MISMATCH');

  const urlTime = await makePacket({ sourceKind: 'url' });
  urlTime.ledger.evidence[0].locator.retrievedAt = '2026-08-30T00:00:00.000Z';
  await persist(urlTime);
  await expectInvalid(urlTime, 'SOURCE_VERSION_MISMATCH');

  const command = await makePacket({ sourceKind: 'command-output' });
  command.ledger.evidence[0].locator.artifactPath = 'raw/captures/other.txt';
  await persist(command);
  await expectInvalid(command, 'SOURCE_VERSION_MISMATCH');

  const commandIdentity = await makePacket({ sourceKind: 'command-output' });
  commandIdentity.ledger.evidence[0].locator.commandDigest = `sha256:${'0'.repeat(64)}`;
  await persist(commandIdentity);
  await expectInvalid(commandIdentity, 'SOURCE_VERSION_MISMATCH');

  const connected = await makePacket({ sourceKind: 'connected-resource' });
  connected.ledger.evidence[0].locator.system = 'other';
  await persist(connected);
  await expectInvalid(connected, 'SOURCE_VERSION_MISMATCH');

  const connectedTime = await makePacket({
    sourceKind: 'connected-resource',
  });
  connectedTime.ledger.evidence[0].locator.retrievedAt =
    '2026-08-30T00:00:00.000Z';
  await persist(connectedTime);
  await expectInvalid(connectedTime, 'SOURCE_VERSION_MISMATCH');
});

test('whole-file locators are supported but half-specified ranges are rejected', async () => {
  const whole = await makePacket();
  delete whole.ledger.evidence[0].locator.lineStart;
  delete whole.ledger.evidence[0].locator.lineEnd;
  whole.ledger.evidence[0].displayExcerpt = 'beta context';
  whole.ledger.evidence[0].contentHash = hashCanonicalJson('beta context');
  await persist(whole);
  assert.equal((await validatePacket(whole.packetRoot)).valid, true);

  const half = await makePacket();
  delete half.ledger.evidence[0].locator.lineEnd;
  await persist(half);
  await expectInvalid(half, 'INVALID_LOCATOR_RANGE');
});

test('URL validator-state locators reopen a pinned snapshot and reject token drift', async () => {
  const packet = await makePacket({ sourceKind: 'url' });
  const source = packet.manifest.sources[0];
  source.validatorState = {
    etag: '"fixture-v1"',
    capturePath: source.capturePath,
    captureDigest: source.captureDigest,
  };
  delete source.capturePath;
  delete source.captureDigest;
  packet.ledger.evidence[0].locator.validatorToken = hashCanonicalJson({
    etag: '"fixture-v1"',
    lastModified: null,
  });
  await persist(packet);
  const valid = await validatePacket(packet.packetRoot);
  assert.equal(valid.valid, true, JSON.stringify(valid, null, 2));

  packet.ledger.evidence[0].locator.validatorToken = hashCanonicalJson({
    etag: '"fixture-v2"',
    lastModified: null,
  });
  await persist(packet);
  await expectInvalid(packet, 'SOURCE_VERSION_MISMATCH');
});

test('managed packet and source paths reject ancestor and final-component symlinks', async () => {
  const artifact = await makePacket();
  const dossierPath = join(
    artifact.packetRoot,
    'raw',
    'dossiers',
    'dossier-1.json',
  );
  const outside = join(artifact.sourceRoot, 'outside.json');
  await cp(dossierPath, outside);
  await rm(dossierPath);
  await symlink(outside, dossierPath);
  await expectInvalid(artifact, 'SYMLINK_ESCAPE');

  const capture = await makePacket({ sourceKind: 'url' });
  const captureDirectory = join(capture.packetRoot, 'raw', 'captures');
  const realDirectory = join(capture.sourceRoot, 'captures');
  await mkdir(realDirectory);
  await cp(join(captureDirectory, 'url.txt'), join(realDirectory, 'url.txt'));
  await rm(captureDirectory, { recursive: true });
  await symlink(realDirectory, captureDirectory);
  await expectInvalid(capture, 'SYMLINK_ESCAPE');
});

test('declared repository and packet trust roots reject symlink aliases', async () => {
  const repository = await makePacket({ sourceKind: 'repository' });
  const repositoryAlias = join(dirname(repository.sourceRoot), 'source-alias');
  await symlink(repository.sourceRoot, repositoryAlias, 'dir');
  repository.manifest.sources[0].root = repositoryAlias;
  await persist(repository);
  await expectInvalid(repository, 'SYMLINK_ESCAPE');

  const packet = await makePacket();
  const packetAlias = join(dirname(packet.packetRoot), 'packet-alias');
  await symlink(packet.packetRoot, packetAlias, 'dir');
  const validation = await validatePacket(packetAlias);
  assert.ok(
    validation.errors.some((error) => error.code === 'SYMLINK_ESCAPE'),
    JSON.stringify(validation, null, 2),
  );
});

test('material gaps permit honest same-profile partial but never complete publication', async () => {
  const partial = await makePacket({ status: 'partial' });
  partial.manifest.gaps.push({
    id: 'gap-material',
    code: 'COVERAGE_GAP',
    message: 'A material scope gap remains.',
    material: true,
  });
  await writeJson(partial.manifestPath, partial.manifest);
  const partialResult = await validatePacket(partial.packetRoot);
  assert.equal(
    partialResult.valid,
    true,
    JSON.stringify(partialResult, null, 2),
  );

  const complete = await makePacket();
  complete.manifest.gaps.push({
    id: 'gap-material',
    code: 'COVERAGE_GAP',
    message: 'A material scope gap remains.',
    material: true,
  });
  await writeJson(complete.manifestPath, complete.manifest);
  await expectInvalid(complete, 'MATERIAL_GAP_REQUIRES_PARTIAL');
});
