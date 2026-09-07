import { cp, mkdir, mkdtemp, realpath, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

import { createReviewBrief } from '../../scripts/create-review-brief.mjs';
import {
  hashCanonicalJson,
  hashFile,
} from '../../scripts/lib/canonical-json.mjs';
import { approvalFingerprintInput } from '../../scripts/lib/contracts.mjs';

export function approveExecution(
  execution,
  approvedAt = '2026-08-31T00:00:45.000Z',
) {
  const { approval: _approval, ...approved } = execution;
  return {
    ...approved,
    approval: {
      type: 'explicit-user-approval',
      approvedAt,
      fingerprint: hashCanonicalJson(approvalFingerprintInput(approved)),
    },
  };
}

export function writeRootForMode(mode) {
  if (['map', 'redundant-gather'].includes(mode)) {
    return `raw/dossiers/pass-${mode}.json`;
  }
  if (mode === 'gather') return 'raw/dossiers';
  if (mode === 'compile') return 'claims.json';
  if (mode === 'semantic-verification') return 'reviews/semantic.json';
  return `reviews/${mode}.json`;
}

export function createExecutionApproval({
  modes,
  laneIdForMode,
  writeRoot = writeRootForMode,
  concurrency = 2,
  role = 'recon-worker',
  authority = 'contract-enforced',
}) {
  return approveExecution({
    provider: 'fixture-provider',
    route: 'fake',
    role,
    model: 'fixture-model',
    effort: 'high',
    reasoningMode: 'fixture-reasoning',
    serviceTier: 'fixture',
    authority,
    maxConcurrency: concurrency,
    deadlineSeconds: 60,
    retryLimit: 0,
    waves: modes.map((mode) => ({
      waveId: `wave-${mode}`,
      mode,
      taskClass: 'intelligent-recon',
      lanes: [
        {
          laneId: laneIdForMode(mode),
          scope: `packet/${mode}`,
          writeRoot: writeRoot(mode),
        },
      ],
      conditional: false,
    })),
  });
}

async function writeJson(path, value) {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

export async function createPacketFixture({
  profile = 'standard',
  status = 'complete',
  requestedProfile = profile,
  achievedProfile = profile,
  sourceKind = 'file',
  failedPassMode,
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
    : join(tempRoot, 'sources');
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

  const sourceBase = {
    id: 'source-1',
    available: true,
    authority: 'contract-enforced',
    observedAt: '2026-08-31T00:00:00.000Z',
    validationState: 'pinned',
  };
  let source;
  let locator;
  if (sourceKind === 'repository') {
    source = {
      ...sourceBase,
      kind: 'repository',
      root: await realpath(sourceRoot),
      revision: 'abc123',
      dirty: false,
      contentHashes: { 'source.txt': await hashFile(sourcePath) },
    };
    locator = {
      kind: 'repository',
      path: 'source.txt',
      revision: source.revision,
      lineStart: 1,
      lineEnd: 1,
    };
  } else if (sourceKind === 'url') {
    sourcePath = join(packetRoot, 'raw', 'captures', 'url.txt');
    await mkdir(dirname(sourcePath), { recursive: true });
    await cp(new URL('url-capture.txt', import.meta.url), sourcePath);
    source = {
      ...sourceBase,
      kind: 'url',
      authority: 'provider-enforced',
      url: 'https://example.test/evidence',
      capturePath: 'raw/captures/url.txt',
      captureDigest: await hashFile(sourcePath),
    };
    locator = {
      kind: 'url',
      url: source.url,
      retrievedAt: source.observedAt,
    };
  } else if (sourceKind === 'command-output') {
    sourcePath = join(packetRoot, 'raw', 'captures', 'command.txt');
    await mkdir(dirname(sourcePath), { recursive: true });
    await cp(new URL('command-output.txt', import.meta.url), sourcePath);
    source = {
      ...sourceBase,
      kind: 'command-output',
      argv: ['example', '--read-only'],
      cwd: sourceRoot,
      exitStatus: 0,
      outputPath: 'raw/captures/command.txt',
      outputDigest: await hashFile(sourcePath),
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
    sourcePath = join(packetRoot, 'raw', 'captures', 'connected.json');
    await mkdir(dirname(sourcePath), { recursive: true });
    await cp(new URL('connected-resource.json', import.meta.url), sourcePath);
    source = {
      ...sourceBase,
      kind: 'connected-resource',
      authority: 'provider-enforced',
      system: 'fixture',
      resourceId: 'resource-1',
      resourceVersion: 'v1',
      capturePath: 'raw/captures/connected.json',
      captureDigest: await hashFile(sourcePath),
    };
    locator = {
      kind: 'connected-resource',
      system: source.system,
      resourceId: source.resourceId,
      resourceVersion: source.resourceVersion,
      fieldOrSection: 'finding',
      retrievedAt: source.observedAt,
    };
  } else {
    source = {
      ...sourceBase,
      kind: 'file',
      path: sourcePath,
      contentHash: await hashFile(sourcePath),
    };
    locator = {
      kind: 'file',
      path: sourcePath,
      lineStart: 1,
      lineEnd: 1,
    };
  }
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
        locator,
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
        evidenceAssociations: [],
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
      evidenceAssociations: [],
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

  const quickPasses = ['map', 'gather', 'compile'];
  const standardPasses = [
    ...quickPasses,
    'semantic-verification',
    'adversarial',
    'coverage',
    'reconciliation',
  ];
  const thoroughPasses = [
    ...standardPasses,
    'redundant-gather',
    'redundant-verification',
    'contradiction-resolution',
  ];
  const passesByProfile = {
    quick: quickPasses,
    standard: standardPasses,
    thorough: thoroughPasses,
  };
  const passModes = passesByProfile[requestedProfile];
  const completedModes = new Set(passesByProfile[achievedProfile] ?? []);
  const passLaneId = (mode) =>
    mode === 'semantic-verification' ? 'lane-semantic' : `lane-${mode}`;
  const execution = createExecutionApproval({
    modes: passModes,
    laneIdForMode: passLaneId,
    concurrency: requestedProfile === 'thorough' ? 4 : 2,
  });
  const passArtifacts = [];
  const incompletePassGaps = [];
  for (const mode of passModes) {
    const laneId = passLaneId(mode);
    if (!completedModes.has(mode)) {
      const passStatus = mode === failedPassMode ? 'failed' : 'omitted';
      incompletePassGaps.push({
        id: `gap-pass-${incompletePassGaps.length + 1}`,
        code: passStatus === 'failed' ? 'PASS_FAILED' : 'PASS_OMITTED',
        message: `${mode} was ${passStatus}; no complete result was published.`,
        material: true,
        sourceIds: [],
        claimIds: [],
        coverageFindingIds: [],
      });
      continue;
    }
    if (!['map', 'gather', 'redundant-gather'].includes(mode)) continue;
    const artifactPath = join(
      packetRoot,
      'raw',
      'dossiers',
      `pass-${mode}.json`,
    );
    await writeJson(artifactPath, {
      kind: 'recon.raw-dossier',
      schemaVersion: 1,
      id: `dossier-${mode}`,
      runId: 'run-render',
      waveId: `wave-${mode}`,
      laneId,
      mode: mode === 'redundant-gather' ? 'gather' : mode,
      outcome: 'complete',
      allowedInputs: ['source-1'],
      excludedInputs: [],
      findings: [],
      uncertainty: [],
      contradictions: [],
      gaps: [],
    });
    passArtifacts.push({
      path: `raw/dossiers/pass-${mode}.json`,
      digest: await hashFile(artifactPath),
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
    execution,
    artifacts: [claimsRef, dossierRef, ...reviewArtifacts, ...passArtifacts],
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
      ...incompletePassGaps,
    ],
  };
  const manifestPath = join(packetRoot, 'manifest.json');
  await writeJson(manifestPath, manifest);

  return {
    tempRoot,
    packetRoot,
    sourceRoot,
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
