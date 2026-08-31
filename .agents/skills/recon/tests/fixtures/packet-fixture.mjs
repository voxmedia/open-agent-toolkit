import { mkdir, mkdtemp, realpath, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

import { createReviewBrief } from '../../scripts/create-review-brief.mjs';
import {
  hashCanonicalJson,
  hashFile,
} from '../../scripts/lib/canonical-json.mjs';

async function writeJson(path, value) {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

export async function createPacketFixture({
  profile = 'standard',
  status = 'complete',
  requestedProfile = profile,
  achievedProfile = profile,
  roots,
} = {}) {
  const tempRoot = roots
    ? await realpath(resolve(dirname(roots.packetRoot)))
    : await realpath(await mkdtemp(join(tmpdir(), 'recon-render-')));
  const packetRoot = roots
    ? await realpath(resolve(roots.packetRoot))
    : join(tempRoot, 'packet');
  const sourceRoot = roots
    ? await realpath(resolve(roots.sourceRoot))
    : tempRoot;
  let sourcePath = join(sourceRoot, 'source.txt');
  await mkdir(join(packetRoot, 'raw', 'dossiers'), { recursive: true });
  await mkdir(join(packetRoot, 'reviews', 'briefs'), { recursive: true });
  await mkdir(sourceRoot, { recursive: true });
  await writeFile(sourcePath, 'alpha evidence\nbeta context\n', 'utf8');
  sourcePath = await realpath(sourcePath);

  const dossierPath = join(packetRoot, 'raw', 'dossiers', 'gather.json');
  await writeJson(dossierPath, {
    kind: 'recon.raw-dossier',
    schemaVersion: 1,
    id: 'dossier-input',
    runId: 'run-render',
    waveId: 'wave-gather',
    laneId: 'lane-gather',
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
    path: 'raw/dossiers/gather.json',
    digest: await hashFile(dossierPath),
  };

  const source = {
    kind: 'file',
    id: 'source-1',
    available: true,
    authority: 'contract-enforced',
    observedAt: '2026-08-31T00:00:00.000Z',
    validationState: 'pinned',
    path: sourcePath,
    contentHash: await hashFile(sourcePath),
  };
  const claimStatus = achievedProfile === 'quick' ? 'supported' : 'verified';
  const ledger = {
    kind: 'recon.claim-ledger',
    schemaVersion: 1,
    runId: 'run-render',
    revision: achievedProfile === 'quick' ? 1 : 2,
    inputArtifacts: [dossierRef],
    synthesis: {
      answer: 'The source contains alpha evidence.',
      keyClaimIds: ['claim-1'],
      caveats: ['Evidence is scoped to the pinned fixture.'],
      unresolvedQuestionIds: ['question-1'],
    },
    evidence: [
      {
        id: 'evidence-1',
        sourceId: 'source-1',
        locator: {
          kind: 'file',
          path: sourcePath,
          lineStart: 1,
          lineEnd: 1,
        },
        displayExcerpt: 'alpha evidence',
        observedAt: '2026-08-31T00:00:00.000Z',
        contentHash: hashCanonicalJson('alpha evidence'),
        locatorValidation: {
          status: 'exact',
          validatedAt: '2026-08-31T00:01:00.000Z',
        },
        provenance: dossierRef,
      },
    ],
    claims: [
      {
        id: 'claim-1',
        statement: 'The source contains alpha evidence.',
        status: claimStatus,
        evidence: [{ evidenceId: 'evidence-1', relation: 'supports' }],
        qualifications: ['Scoped to source-1.'],
        reviewIds:
          achievedProfile === 'quick'
            ? []
            : [
                'review-semantic',
                'review-adversarial',
                'review-coverage',
                ...(achievedProfile === 'thorough'
                  ? ['review-redundant-verification']
                  : []),
              ],
        derivedFrom: [dossierRef],
        challenges: [],
      },
      {
        id: 'claim-2',
        statement: 'A secondary interpretation remains open.',
        status: 'contested',
        evidence: [{ evidenceId: 'evidence-1', relation: 'qualifies' }],
        qualifications: ['Needs another source.'],
        reviewIds: [
          'review-adversarial',
          ...(achievedProfile === 'thorough'
            ? ['review-contradiction-resolution']
            : []),
        ],
        derivedFrom: [dossierRef],
        challenges: [
          { id: 'challenge-1', material: true, status: 'unresolved' },
        ],
      },
    ],
    unresolvedQuestions: [
      { id: 'question-1', question: 'Does another source confirm the result?' },
    ],
    transitions: [
      {
        claimId: 'claim-1',
        from: achievedProfile === 'quick' ? 'provisional' : 'supported',
        to: claimStatus,
      },
      { claimId: 'claim-2', from: 'provisional', to: 'contested' },
    ],
  };
  const reviewArtifacts = [];
  if (achievedProfile !== 'quick') {
    const priorLedger = structuredClone(ledger);
    priorLedger.revision = 1;
    priorLedger.claims[0].status = 'supported';
    priorLedger.claims[0].reviewIds = [];
    if (achievedProfile === 'thorough') {
      priorLedger.claims[1].reviewIds = ['review-adversarial'];
    }
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
    ledger.transitions = ledger.transitions.filter(
      (transition) => transition.claimId === 'claim-1',
    );
    ledger.inputArtifacts.push(priorRef);
    reviewArtifacts.push(priorRef);
    const briefManifest = {
      run: { id: 'run-render' },
      request: {
        includedScope: ['source-1'],
        excludedScope: [],
        questions: ['What evidence exists?'],
      },
      sources: [source],
    };
    const briefs = Object.fromEntries(
      ['verify', 'adversary', 'coverage'].map((mode) => [
        mode,
        createReviewBrief({
          id: `brief-${mode}`,
          mode,
          createdAt: '2026-08-31T00:03:00.000Z',
          manifest: briefManifest,
          ledger: priorLedger,
          claimIds: ['claim-1'],
        }),
      ]),
    );
    if (achievedProfile === 'thorough') {
      briefs['redundant-verify'] = createReviewBrief({
        id: 'brief-redundant-verify',
        mode: 'verify',
        createdAt: '2026-08-31T00:03:00.000Z',
        manifest: briefManifest,
        ledger: priorLedger,
        claimIds: ['claim-1'],
      });
      briefs['contradiction-resolution'] = createReviewBrief({
        id: 'brief-contradiction-resolution',
        mode: 'adversary',
        createdAt: '2026-08-31T00:03:00.000Z',
        manifest: briefManifest,
        ledger: priorLedger,
        claimIds: ['claim-2'],
      });
    }
    const briefRefs = {};
    for (const [mode, brief] of Object.entries(briefs)) {
      const path = join(packetRoot, 'reviews', 'briefs', `${mode}.json`);
      await writeJson(path, brief);
      briefRefs[mode] = {
        path: `reviews/briefs/${mode}.json`,
        digest: await hashFile(path),
      };
      reviewArtifacts.push(briefRefs[mode]);
    }
    const resultSpecs = [
      ['review-semantic', 'semantic', 'verify', 'affirmed'],
      ['review-adversarial', 'adversarial', 'adversary', 'unchallenged'],
      ['review-coverage', 'coverage', 'coverage', 'covered'],
      ...(achievedProfile === 'thorough'
        ? [
            [
              'review-redundant-verification',
              'redundant-verification',
              'redundant-verify',
              'affirmed',
            ],
            [
              'review-contradiction-resolution',
              'contradiction-resolution',
              'contradiction-resolution',
              'unresolved',
            ],
          ]
        : []),
    ];
    for (const [id, reviewKind, briefMode, disposition] of resultSpecs) {
      const claimId =
        reviewKind === 'contradiction-resolution' ? 'claim-2' : 'claim-1';
      const result = {
        kind: 'recon.review-result',
        schemaVersion: 1,
        id,
        runId: 'run-render',
        reviewKind,
        reviewerLane: `lane-${reviewKind}`,
        status: 'complete',
        brief: { ...briefRefs[briefMode] },
        permittedInputs: [{ ...briefRefs[briefMode] }],
        excludedInputs: ['prior_reasoning'],
        dispositions: [{ claimId, disposition }],
        newEvidence: [],
        coverageFindings: [],
        unresolvedIssues: [],
        ...(reviewKind === 'contradiction-resolution'
          ? {
              contradictionDispositions: [
                {
                  contradictionId: 'challenge-1',
                  claimIds: ['claim-2'],
                  disposition: 'unresolved',
                },
              ],
            }
          : {}),
      };
      const path = join(packetRoot, 'reviews', `${reviewKind}.json`);
      await writeJson(path, result);
      reviewArtifacts.push({
        path: `reviews/${reviewKind}.json`,
        digest: await hashFile(path),
      });
    }
    const reconciliation = {
      kind: 'recon.review-result',
      schemaVersion: 1,
      id: 'review-reconciliation',
      runId: 'run-render',
      reviewKind: 'reconciliation',
      reviewerLane: 'lane-reconciliation',
      status: 'complete',
      inputLedger: { ...priorRef, revision: 1 },
      outputRevision: 2,
      incorporatedReviewIds: [
        'review-semantic',
        'review-adversarial',
        'review-coverage',
        ...(achievedProfile === 'thorough'
          ? ['review-redundant-verification', 'review-contradiction-resolution']
          : []),
      ],
      transitions: structuredClone(ledger.transitions),
      additions: [],
      removals: [],
      removalDispositions: [],
      coverageDispositions: [],
      permittedInputs: [...reviewArtifacts],
      excludedInputs: [],
      dispositions: [],
      newEvidence: [],
      coverageFindings: [],
      unresolvedIssues: [],
    };
    const path = join(packetRoot, 'reviews', 'reconciliation.json');
    await writeJson(path, reconciliation);
    reviewArtifacts.push({
      path: 'reviews/reconciliation.json',
      digest: await hashFile(path),
    });
  }
  const claimsPath = join(packetRoot, 'claims.json');
  await writeJson(claimsPath, ledger);
  const claimsRef = { path: 'claims.json', digest: await hashFile(claimsPath) };

  const quickStages = ['map', 'gather', 'compile', 'locator-validation'];
  const standardStages = [
    ...quickStages,
    'semantic-verification',
    'adversarial',
    'coverage',
    'reconciliation',
  ];
  const thoroughStages = [
    ...standardStages,
    'redundant-gather',
    'redundant-verification',
    'contradiction-resolution',
  ];
  const stageModes =
    achievedProfile === 'quick'
      ? quickStages
      : achievedProfile === 'thorough'
        ? thoroughStages
        : standardStages;
  const stageLaneId = (mode) =>
    mode === 'semantic-verification' ? 'lane-semantic' : `lane-${mode}`;
  const approvalEnvelope = {
    provider: 'fixture',
    model: 'fixture-model',
    effort: 'high',
    reasoningMode: 'fixture-reasoning',
    route: 'fake',
    role: 'recon-worker',
    serviceTier: 'fixture',
    authority: 'contract-enforced',
    deadlineSeconds: 60,
    retryLimit: 0,
    concurrency: achievedProfile === 'thorough' ? 4 : 2,
    laneCap: achievedProfile === 'thorough' ? 20 : 10,
    waves: stageModes.map((mode) => ({
      id: `wave-${mode}`,
      mode,
      required: true,
      lanes: [{ id: stageLaneId(mode), required: true }],
    })),
  };
  const stageArtifacts = [];
  const stageRows = [];
  for (const [index, mode] of stageModes.entries()) {
    const stageId = `stage-${index + 1}`;
    const laneId = stageLaneId(mode);
    let artifactId;
    if (mode === 'semantic-verification') artifactId = 'review-semantic';
    else if (mode === 'adversarial') artifactId = 'review-adversarial';
    else if (mode === 'coverage') artifactId = 'review-coverage';
    else if (mode === 'reconciliation') artifactId = 'review-reconciliation';
    else if (mode === 'redundant-verification')
      artifactId = 'review-redundant-verification';
    else if (mode === 'contradiction-resolution')
      artifactId = 'review-contradiction-resolution';
    else {
      artifactId = `dossier-${mode}`;
      const dossierMode =
        mode === 'locator-validation'
          ? 'verify'
          : mode === 'redundant-gather'
            ? 'gather'
            : mode;
      const artifactPath = join(
        packetRoot,
        'raw',
        'dossiers',
        `stage-${mode}.json`,
      );
      await writeJson(artifactPath, {
        kind: 'recon.raw-dossier',
        schemaVersion: 1,
        id: artifactId,
        runId: 'run-render',
        waveId: `wave-${mode}`,
        laneId,
        mode: dossierMode,
        outcome: 'complete',
        allowedInputs: ['source-1'],
        excludedInputs: [],
        findings: [],
        uncertainty: [],
        contradictions: [],
        gaps: [],
      });
      stageArtifacts.push({
        path: `raw/dossiers/stage-${mode}.json`,
        digest: await hashFile(artifactPath),
      });
    }
    const dispatchReceiptIds = [];
    for (const state of ['accepted', 'completed']) {
      const id = `dispatch-${stageId}-${state}`;
      const path = join(packetRoot, 'raw', 'dispatch', `${id}.json`);
      await mkdir(dirname(path), { recursive: true });
      await writeJson(path, {
        kind: 'recon.dispatch-receipt',
        schemaVersion: 1,
        id,
        runId: 'run-render',
        stageId,
        laneId,
        state,
        selection: {
          provider: approvalEnvelope.provider,
          model: approvalEnvelope.model,
          effort: approvalEnvelope.effort,
          reasoningMode: approvalEnvelope.reasoningMode,
          route: approvalEnvelope.route,
          role: approvalEnvelope.role,
          serviceTier: approvalEnvelope.serviceTier,
        },
        approvalEnvelope,
        fingerprint: hashCanonicalJson(approvalEnvelope),
        acceptedEnvelope: approvalEnvelope,
        ...(state === 'completed' ? { artifactIds: [artifactId] } : {}),
      });
      stageArtifacts.push({
        path: `raw/dispatch/${id}.json`,
        digest: await hashFile(path),
      });
      dispatchReceiptIds.push(id);
    }
    stageRows.push({
      kind: 'recon.stage-result',
      schemaVersion: 1,
      id: stageId,
      mode,
      laneId,
      status: 'complete',
      artifactIds: [artifactId],
      dispatchReceiptIds,
    });
  }
  const manifest = {
    kind: 'recon.packet-manifest',
    schemaVersion: 1,
    run: {
      id: 'run-render',
      topic: 'render fixture',
      status,
      requestedProfile,
      achievedProfile,
      createdAt: '2026-08-31T00:00:00.000Z',
      updatedAt: '2026-08-31T00:02:00.000Z',
    },
    request: {
      objective: 'Find fixture evidence.',
      questions: ['What evidence exists?'],
      includedScope: ['source-1'],
      excludedScope: ['unrelated sources'],
      contextReferences: [],
      outputPath: packetRoot,
    },
    sources: [source],
    execution: {
      approvalEnvelope,
      approvalFingerprint: hashCanonicalJson(approvalEnvelope),
    },
    stages: stageRows,
    artifacts: [claimsRef, dossierRef, ...reviewArtifacts, ...stageArtifacts],
    gaps: [
      {
        id: 'gap-1',
        code: 'OPTIONAL_SOURCE_UNAVAILABLE',
        message: 'An optional comparison source was unavailable.',
        material: false,
        sourceIds: [],
        claimIds: [],
        coverageFindingIds: [],
      },
    ],
  };
  const manifestPath = join(packetRoot, 'manifest.json');
  await writeJson(manifestPath, manifest);

  return {
    tempRoot,
    packetRoot,
    sourcePath,
    manifestPath,
    claimsPath,
    manifest,
    ledger,
    persist: async () => {
      await writeJson(claimsPath, ledger);
      manifest.artifacts[0].digest = await hashFile(claimsPath);
      await writeJson(manifestPath, manifest);
    },
  };
}
