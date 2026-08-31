import { cp, mkdir, mkdtemp, realpath, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

import { createReviewBrief } from '../../scripts/create-review-brief.mjs';
import {
  canonicalJson,
  hashCanonicalJson,
  hashFile,
} from '../../scripts/lib/canonical-json.mjs';

export function createApprovalProjection({
  runId,
  stages,
  laneIdForStage,
  concurrency = 2,
  laneCap = 10,
}) {
  const selection = {
    provider: 'fixture-provider',
    dispatch_context: 'nested-native',
    dispatch_policy: 'economy',
    dispatch_ceiling: 'high',
    selected_route: 'fake',
    selection_source: 'native-default',
    candidates_considered: ['fixture-model'],
    selection_reason: 'native-catalog',
    role_name: 'recon-worker',
    role_class: 'recon',
    role_selector: 'recon-worker',
    model_selector: 'fixture-model',
    model_selector_granularity: 'exact-native-model-choice',
    effort_selector: 'high',
    reasoning_mode_selector: 'fixture-reasoning',
    service_tier_selector: 'fixture',
    guidance_reference: 'subagent-orchestration/references/provider-fixture.md',
    guidance_version: '2026-08-31',
    guidance_verified_at: '2026-08-31',
    guidance_status: 'fresh',
  };
  const pinnedTarget = {
    provider: selection.provider,
    dispatch_context: selection.dispatch_context,
    selected_route: selection.selected_route,
    role_selector: selection.role_selector,
    model_selector: selection.model_selector,
    model_selector_granularity: selection.model_selector_granularity,
    effort_selector: selection.effort_selector,
    reasoning_mode_selector: selection.reasoning_mode_selector,
    service_tier_selector: selection.service_tier_selector,
  };
  return {
    schema: 'oat-dispatch-approval/v1',
    prepared_record_version: 1,
    run_id: runId,
    prepared_at: '2026-08-31T00:00:30.000Z',
    request: {
      request_id: `dispatch-${runId}`,
      caller: 'recon',
      objective: 'Find fixture evidence.',
      action: 'analysis',
      expected_output: 'versioned-dossiers',
      verification_evidence: 'artifact-digests',
      escalate_when: ['approved scope is insufficient'],
    },
    selection,
    execution: {
      waves: stages.map((stage) => {
        const laneId = laneIdForStage(stage);
        return {
          wave_id: `wave-${stage.mode}`,
          conditional: false,
          task_class: 'intelligent-recon',
          model_class_floor: 'intelligent-recon',
          scope: `packet:${stage.mode}`,
          lanes: [{ lane_id: laneId, scope: `packet/${stage.mode}` }],
          authority: 'contract-enforced',
          authorization_scope: `run:${runId}`,
          writable_roots: [`raw/${stage.mode}/${laneId}`],
          deadline_seconds: 60,
          retry_limit: 0,
          fallback: { mode: 'block' },
          dispatch_mode: 'background',
          context_fork_controls: { fork_turns: 'all' },
          concurrency,
          lane_cap: laneCap,
          payload_digest: hashCanonicalJson({
            runId,
            mode: stage.mode,
            laneId,
          }),
        };
      }),
      run_maximum_floor: 'intelligent-recon',
      pinned_target: pinnedTarget,
    },
    catalog_observation: {
      id: `catalog-${runId}`,
      source: 'tool-schema',
      dispatch_context: selection.dispatch_context,
      observed_at: '2026-08-31T00:00:00.000Z',
      relevant_catalog_fingerprint: hashCanonicalJson(pinnedTarget),
    },
  };
}

export function createApprovalBinding(approvalProjection) {
  const approvalFingerprint = hashCanonicalJson(approvalProjection);
  return {
    approvalProjection,
    approvalCanonicalJson: canonicalJson(approvalProjection),
    approvalFingerprint,
    approvedAt: '2026-08-31T00:00:45.000Z',
    approvalEvidence: {
      type: 'explicit-user-approval',
      fingerprint: approvalFingerprint,
    },
    catalogRecheck: {
      ...approvalProjection.catalog_observation,
      id: `${approvalProjection.catalog_observation.id}-recheck`,
      observed_at: '2026-08-31T00:00:50.000Z',
    },
  };
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
  failedStageMode,
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
  const stagesByProfile = {
    quick: quickStages,
    standard: standardStages,
    thorough: thoroughStages,
  };
  const stageModes = stagesByProfile[requestedProfile];
  const completedModes = new Set(stagesByProfile[achievedProfile] ?? []);
  const stageLaneId = (mode) =>
    mode === 'semantic-verification' ? 'lane-semantic' : `lane-${mode}`;
  const approvalProjection = createApprovalProjection({
    runId: 'run-render',
    stages: stageModes.map((mode) => ({ mode })),
    laneIdForStage: ({ mode }) => stageLaneId(mode),
    concurrency: requestedProfile === 'thorough' ? 4 : 2,
    laneCap: requestedProfile === 'thorough' ? 20 : 10,
  });
  const approvalBinding = createApprovalBinding(approvalProjection);
  const stageArtifacts = [];
  const stageRows = [];
  for (const [index, mode] of stageModes.entries()) {
    const stageId = `stage-${index + 1}`;
    const laneId = stageLaneId(mode);
    if (!completedModes.has(mode)) {
      const stageStatus = mode === failedStageMode ? 'failed' : 'omitted';
      stageRows.push({
        kind: 'recon.stage-result',
        schemaVersion: 1,
        id: stageId,
        waveId: `wave-${mode}`,
        mode,
        laneId,
        status: stageStatus,
        artifactIds: [],
        dispatchReceiptIds: [],
        message: `${mode} was ${stageStatus} before a complete artifact was accepted.`,
      });
      continue;
    }
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
    for (const state of ['prepared', 'approved', 'accepted', 'completed']) {
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
                handle: `handle-${stageId}`,
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
      kind: 'recon.stage-result',
      schemaVersion: 1,
      id: stageId,
      waveId: `wave-${mode}`,
      mode,
      laneId,
      status: 'complete',
      artifactIds: [artifactId],
      dispatchReceiptIds,
    });
  }
  const incompleteStageGaps = stageRows
    .filter((stage) => stage.status !== 'complete')
    .map((stage, index) => ({
      id: `gap-stage-${index + 1}`,
      code: stage.status === 'failed' ? 'PASS_FAILED' : 'PASS_OMITTED',
      message: `${stage.mode} was ${stage.status}; no complete result was published.`,
      material: true,
      sourceIds: [],
      claimIds: [],
      coverageFindingIds: [],
    }));
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
      ...approvalBinding,
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
      ...incompleteStageGaps,
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
