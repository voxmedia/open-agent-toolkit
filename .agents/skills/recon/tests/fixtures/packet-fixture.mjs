import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

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
} = {}) {
  const tempRoot = await mkdtemp(join(tmpdir(), 'recon-render-'));
  const packetRoot = join(tempRoot, 'packet');
  const sourcePath = join(tempRoot, 'source.txt');
  await mkdir(join(packetRoot, 'raw', 'dossiers'), { recursive: true });
  await mkdir(join(packetRoot, 'reviews', 'briefs'), { recursive: true });
  await writeFile(sourcePath, 'alpha evidence\nbeta context\n', 'utf8');

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
  const claimStatus = profile === 'quick' ? 'supported' : 'verified';
  const ledger = {
    kind: 'recon.claim-ledger',
    schemaVersion: 1,
    runId: 'run-render',
    revision: 2,
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
          profile === 'quick'
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
        from: profile === 'quick' ? 'provisional' : 'supported',
        to: claimStatus,
      },
      { claimId: 'claim-2', from: 'provisional', to: 'contested' },
    ],
  };
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
    profile === 'quick'
      ? quickStages
      : profile === 'thorough'
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
      requestedProfile: profile,
      achievedProfile: profile,
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
    })),
    artifacts: [claimsRef, dossierRef],
    gaps: [
      {
        id: 'gap-1',
        code: 'OPTIONAL_SOURCE_UNAVAILABLE',
        message: 'An optional comparison source was unavailable.',
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
