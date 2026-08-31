import { mkdir, mkdtemp, realpath, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

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
    ? resolve(dirname(roots.packetRoot))
    : await mkdtemp(join(tmpdir(), 'recon-render-'));
  const packetRoot = roots
    ? resolve(roots.packetRoot)
    : join(tempRoot, 'packet');
  const sourceRoot = roots ? resolve(roots.sourceRoot) : tempRoot;
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
            : ['review-semantic', 'review-adversarial', 'review-coverage'],
        derivedFrom: [dossierRef],
        challenges: [],
      },
      {
        id: 'claim-2',
        statement: 'A secondary interpretation remains open.',
        status: 'contested',
        evidence: [{ evidenceId: 'evidence-1', relation: 'qualifies' }],
        qualifications: ['Needs another source.'],
        reviewIds: ['review-adversarial'],
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
    ledger.inputArtifacts.push(priorRef);
    reviewArtifacts.push(priorRef);
    const briefs = {
      verify: {
        kind: 'recon.review-brief',
        schemaVersion: 1,
        id: 'brief-verify',
        runId: 'run-render',
        mode: 'verify',
        createdAt: '2026-08-31T00:03:00.000Z',
        excludedInputs: ['prior_reasoning'],
        claims: [],
        sources: [],
      },
      adversary: {
        kind: 'recon.review-brief',
        schemaVersion: 1,
        id: 'brief-adversary',
        runId: 'run-render',
        mode: 'adversary',
        createdAt: '2026-08-31T00:03:00.000Z',
        excludedInputs: ['prior_reasoning'],
        scope: { included: ['source-1'], excluded: [] },
        questions: ['What evidence exists?'],
        provisionalStatements: [],
      },
    };
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
    for (const [id, reviewKind, briefMode, disposition] of [
      ['review-semantic', 'semantic', 'verify', 'affirmed'],
      ['review-adversarial', 'adversarial', 'adversary', 'unchallenged'],
      ['review-coverage', 'coverage', 'adversary', 'covered'],
    ]) {
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
        dispositions: [{ claimId: 'claim-1', disposition }],
        newEvidence: [],
        coverageFindings: [],
        unresolvedIssues: [],
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
      ],
      transitions: structuredClone(ledger.transitions),
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
  const approvalEnvelope = {
    provider: 'fixture',
    model: 'fixture-model',
    effort: 'high',
    route: 'fake',
    role: 'recon-worker',
    serviceTier: 'fixture',
    waves: [{ id: 'wave-gather', laneCap: 1, concurrency: 1 }],
  };
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
    stages: stageModes.map((mode, index) => ({
      kind: 'recon.stage-result',
      schemaVersion: 1,
      id: `stage-${index + 1}`,
      mode,
      status: 'complete',
      artifactIds:
        mode === 'semantic-verification'
          ? ['review-semantic']
          : mode === 'adversarial'
            ? ['review-adversarial']
            : mode === 'coverage'
              ? ['review-coverage']
              : mode === 'reconciliation'
                ? ['review-reconciliation']
                : [],
    })),
    artifacts: [claimsRef, dossierRef, ...reviewArtifacts],
    gaps: [
      {
        id: 'gap-1',
        code: 'OPTIONAL_SOURCE_UNAVAILABLE',
        message: 'An optional comparison source was unavailable.',
        material: false,
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
