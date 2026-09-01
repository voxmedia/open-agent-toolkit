import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { isDeepStrictEqual, promisify } from 'node:util';

import { readOatConfig, writeOatConfig } from '@config/oat-config';
import YAML from 'yaml';

import {
  materializeBoundAssociation,
  parseAssociatedIssues,
  serializeAssociatedIssues,
} from './association';
import {
  assessProductionMutationAuthority,
  parseProductionMutationInvocation,
  resolveEffectiveRemotePolicy,
  validateProductionMutationAuthority,
  type ProductionMutationInvocation,
} from './authority';
import {
  acceptExternalObservation,
  buildExternalAction,
  parseExternalAction,
  type ExternalActionEnvelope,
} from './external-action';
import {
  parseHostCapabilityEvidence,
  selectHostExecution,
  type HostCapabilityEvidence,
} from './host-execution';
import type { RemoteCommandRequest } from './index';
import { resolveLocalProjection } from './local-projection';
import {
  buildManagedMarkdownBlock,
  inspectManagedMarkdown,
  insertManagedMarkdown,
  replaceManagedMarkdown,
} from './managed-markdown';
import {
  assessOutboundProjectionSafety,
  type OutboundProjection,
} from './outbound-projection-safety';
import type { RemoteCommandEnvelope, RemoteCommandStatus } from './output';
import type { BindingPreview } from './preview';
import { semanticDigest } from './provider';
import { composePurposePolicies } from './purpose-policy';
import { reconcileBinding } from './reconcile';
import type {
  PlannedBindingCreate,
  RemoteBaselineRecord,
  RemoteBindingMetadata,
  RemoteBindingState,
  RemoteSnapshotRecord,
  RemoteOperationRecord,
} from './schema';
import {
  applySharedStorageTransition,
  buildSharedStoragePreview,
} from './shared-storage';
import { sanitizeRemoteSnapshot } from './snapshot';
import { resolveRemoteStorageLocations } from './storage-locator';
import { RemoteSyncStore } from './store';

const execFileAsync = promisify(execFile);
const MAX_STDIN_BYTES = 65_536;
type PersistedApprovalPreview = BindingPreview & {
  revisionEvidence: NonNullable<
    NonNullable<RemoteOperationRecord['approvalPreview']>['revisionEvidence']
  >;
};

export interface ProductionRemoteRunnerDependencies {
  now(): string;
  randomId(): string;
  readObservationStdin(): Promise<unknown>;
  crash?(point: MaterializationCrashPoint): void;
}

export type MaterializationCrashPoint =
  | 'after-create-operation'
  | 'after-create-action'
  | 'after-create-authorization'
  | 'after-create-attempt'
  | 'before-create-envelope'
  | 'after-observation-acceptance'
  | 'after-verification-action-retired'
  | 'after-verification-handoff'
  | 'after-verification-action'
  | 'before-verification-envelope'
  | 'after-journal'
  | 'after-target'
  | 'after-metadata'
  | 'after-state'
  | 'after-snapshot'
  | 'after-baseline'
  | 'after-association'
  | 'after-terminal';

const DEFAULT_DEPENDENCIES: ProductionRemoteRunnerDependencies = {
  now: () => new Date().toISOString(),
  randomId: randomUUID,
  readObservationStdin: readJsonStdin,
};

export function createProductionRemoteRunner(
  overrides: Partial<ProductionRemoteRunnerDependencies> = {},
): (request: RemoteCommandRequest) => Promise<RemoteCommandEnvelope> {
  const dependencies = { ...DEFAULT_DEPENDENCIES, ...overrides };
  return async (request) => {
    const store = await openRepositoryStore(request.projectRoot);
    if (request.operation === 'operation-continue') {
      if (!request.operationId) {
        throw new Error('Operation continuation requires an operation ID.');
      }
      return continueOperation(request, store, dependencies);
    }
    if (request.operation === 'refresh') {
      return prepareRefresh(request, store, dependencies);
    }
    if (request.operation === 'publish' || request.operation === 'reconcile') {
      if (request.createTarget) {
        return prepareCreate(request, store, dependencies);
      }
      return prepareMutation(request, store, dependencies);
    }
    if (request.operation === 'intake') {
      return prepareIntake(request, store, dependencies);
    }
    return runSharedStorage(request, store, dependencies);
  };
}

async function prepareIntake(
  request: RemoteCommandRequest,
  store: RemoteSyncStore,
  dependencies: ProductionRemoteRunnerDependencies,
): Promise<RemoteCommandEnvelope> {
  if (!request.providerRef || !request.backlogId) {
    throw new Error('Intake requires a provider reference and backlog target.');
  }
  const separator = request.providerRef.indexOf(':');
  const provider = request.providerRef.slice(0, separator);
  const stableId = request.providerRef.slice(separator + 1);
  if (!['github', 'linear', 'jira'].includes(provider) || !stableId) {
    throw new Error('Provider reference must be provider:stable-id.');
  }
  const typedProvider = provider as RemoteBindingMetadata['provider'];
  if (!request.capabilityEvidenceStdin) {
    throw new Error('Intake requires current live host capability evidence.');
  }
  const capability = parseHostCapabilityEvidence(
    await dependencies.readObservationStdin(),
  );
  const selection = selectHostExecution({
    provider: typedProvider,
    context: capability.context,
    operation: 'read',
    candidates: [capability],
    attemptStarted: false,
  });
  if (!selection.selected)
    throw new Error(`No current host capability: ${selection.reason}.`);
  const operationId = durableId('op', dependencies.randomId());
  const bindingId = durableId('bnd', dependencies.randomId());
  const target = {
    kind: 'backlog' as const,
    scope: 'shared' as const,
    id: request.backlogId,
    path: `.oat/repo/pjm/backlog/items/${request.backlogId}.md`,
  };
  const action = buildExternalAction({
    operationId,
    stepId: durableId('step', dependencies.randomId()),
    provider: typedProvider,
    semanticOperation: 'read',
    context: capability.context,
    intent: { stableId, localTarget: target },
    expectedObservation: {
      fields: ['title', 'description', 'priority', 'status'],
      requireIdentity: true,
      stableId,
      capabilityEvidenceDigest: capability.evidenceDigest,
    },
    persistedPreview: {},
  });
  const now = dependencies.now();
  await store.createOperation({
    recordType: 'operation',
    schemaVersion: 2,
    operationId,
    correlationId: operationId,
    bindingId,
    provider: typedProvider,
    providerContext: compactContext(capability.context),
    lifecycleOperation: 'intake',
    operationClass: null,
    state: 'pending',
    reason: null,
    lastSafeStep: 'planned',
    preview: {
      digest: semanticDigest({
        operationId,
        bindingId,
        target,
        provider: typedProvider,
      }),
      bindingId,
      provider: typedProvider,
      providerContext: compactContext(capability.context),
      capabilityEvidenceDigest: capability.evidenceDigest,
      revisionDigest: 'unobserved',
      policyDigest: 'read-only',
    },
    authority: null,
    approval: null,
    createdAt: now,
    updatedAt: now,
    selectedExecution: {
      provider: typedProvider,
      surfaceKind: capability.surfaceKind,
      context: compactContext(capability.context),
      evidenceDigest: capability.evidenceDigest,
      semanticCapabilities: capability.semanticCapabilities,
    },
    attempts: [],
    observations: [],
    verification: [],
    retryDisposition: 'safe-before-attempt',
    steps: [],
    outcome: { classification: 'pending', message: null, verifiedAt: null },
  });
  await store.writeCurrentAction(operationId, action);
  return {
    schemaVersion: 1,
    status: 'pending',
    operation: request.operation,
    projectRoot: request.projectRoot,
    persisted: true,
    results: [],
    externalAction: action,
    recovery: [
      {
        code: 'host-observation-required',
        instruction: `Run the semantic action and continue operation ${operationId}.`,
      },
    ],
  };
}

async function runSharedStorage(
  request: RemoteCommandRequest,
  store: RemoteSyncStore,
  dependencies: ProductionRemoteRunnerDependencies,
): Promise<RemoteCommandEnvelope> {
  if (!request.storage)
    throw new Error('Shared-storage request is incomplete.');
  const config = await readOatConfig(request.projectRoot);
  const expectedConfigTarget = '.oat/config.json';
  const expectedProposedPaths = ['.oat/repo/pjm/remote/state'];
  if (
    request.storage.repositoryFingerprint !==
    store.locations.repositoryFingerprint
  ) {
    throw new Error('Shared storage repository fingerprint does not match.');
  }
  const actualMode = config.pjm?.remote?.storage?.state ?? 'local';
  if (actualMode !== request.storage.currentMode) {
    throw new Error(
      'Shared storage request current mode does not match configuration.',
    );
  }
  if (request.storage.configTarget !== expectedConfigTarget) {
    throw new Error(
      'Shared storage config target does not match the repository-owned target.',
    );
  }
  if (
    semanticDigest(request.storage.proposedPaths) !==
    semanticDigest(expectedProposedPaths)
  ) {
    throw new Error(
      'Shared storage proposed paths do not match repository-owned storage paths.',
    );
  }
  if (!request.storage.apply) {
    const preview = buildSharedStoragePreview({
      repositoryFingerprint: store.locations.repositoryFingerprint,
      configTarget: expectedConfigTarget,
      targetKind: 'repository',
      projectScope: null,
      currentMode: actualMode,
      retainedDataWarning:
        'Sanitized remote content and operation journals will enter Git history.',
      proposedPaths: expectedProposedPaths,
      createdAt: dependencies.now(),
    });
    await store.writeSharedStoragePreview(preview);
    return {
      schemaVersion: 1,
      status: 'needs-review',
      operation: request.operation,
      projectRoot: request.projectRoot,
      persisted: true,
      results: [],
      externalAction: null,
      recovery: [
        {
          code: 'fresh-approval-required',
          instruction: `Approve persisted shared-storage preview ${preview.digest}.`,
        },
      ],
    };
  }
  const preview = await store.readSharedStoragePreview();
  if (!preview)
    throw new Error('Shared storage apply has no persisted preview.');
  const now = dependencies.now();
  await applySharedStorageTransition({
    preview,
    approval: request.storageApprovalDigest
      ? {
          previewDigest: request.storageApprovalDigest,
          approvedAt: now,
          actor: 'current-cli-invocation',
          source: 'interactive-preview-approval',
        }
      : null,
    now,
    maxAgeMs: 300_000,
    current: {
      repositoryFingerprint: store.locations.repositoryFingerprint,
      configTarget: expectedConfigTarget,
      mode: actualMode,
    },
    writeSharedConfig: async () => {
      const remote = config.pjm?.remote;
      await writeOatConfig(request.projectRoot, {
        ...config,
        pjm: {
          ...config.pjm,
          remote: {
            schemaVersion: 1,
            policy: remote?.policy ?? {
              description: 'none',
              authority: { default: 'read-only' },
            },
            storage: { state: 'shared' },
          },
        },
      });
    },
  });
  return {
    schemaVersion: 1,
    status: 'ok',
    operation: request.operation,
    projectRoot: request.projectRoot,
    persisted: true,
    results: [],
    externalAction: null,
    recovery: [],
  };
}

async function prepareRefresh(
  request: RemoteCommandRequest,
  store: RemoteSyncStore,
  dependencies: ProductionRemoteRunnerDependencies,
): Promise<RemoteCommandEnvelope> {
  const { metadata, state } = await requireBinding(request.bindingId, store);
  if (!request.capabilityEvidenceStdin) {
    throw new Error('Refresh requires current live host capability evidence.');
  }
  const capability = parseHostCapabilityEvidence(
    await dependencies.readObservationStdin(),
  );
  const selection = selectHostExecution({
    provider: metadata.provider,
    context: metadata.remoteIdentity.context,
    operation: 'read',
    candidates: [capability],
    attemptStarted: false,
  });
  if (!selection.selected)
    throw new Error(`No current host capability: ${selection.reason}.`);
  const operationId = durableId('op', dependencies.randomId());
  const action = buildExternalAction({
    operationId,
    stepId: durableId('step', dependencies.randomId()),
    provider: metadata.provider,
    semanticOperation: 'read',
    context: metadata.remoteIdentity.context,
    intent: { stableId: metadata.remoteIdentity.stableId },
    expectedObservation: {
      fields: ['title', 'description', 'priority', 'status'],
      requireIdentity: true,
      stableId: metadata.remoteIdentity.stableId,
      capabilityEvidenceDigest: capability.evidenceDigest,
    },
    persistedPreview: {},
  });
  const now = dependencies.now();
  await store.createOperation(
    operationRecord({
      operationId,
      metadata,
      state,
      lifecycleOperation: 'refresh',
      operationClass: null,
      authority: null,
      previewDigest: semanticDigest({
        bindingId: metadata.bindingId,
        operation: 'refresh',
        now,
      }),
      capabilityEvidenceDigest: capability.evidenceDigest,
      policyDigest: 'read-only',
      now,
      verification: [],
      selectedExecution: selection.evidence,
    }),
  );
  await store.writeCurrentAction(operationId, action);
  return envelopeFrom(
    request,
    await requireOperation(operationId, store),
    metadata,
    action,
  );
}

async function prepareCreate(
  request: RemoteCommandRequest,
  store: RemoteSyncStore,
  dependencies: ProductionRemoteRunnerDependencies,
): Promise<RemoteCommandEnvelope> {
  const requested = request.createTarget;
  if (
    !requested ||
    !['github', 'linear', 'jira'].includes(requested.provider)
  ) {
    throw new Error('Unbound publication requires a supported provider.');
  }
  if (
    !/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(requested.localId) ||
    requested.localId.includes('..')
  ) {
    throw new Error('Unbound publication target ID is invalid.');
  }
  if (!request.capabilityEvidenceStdin) {
    throw new Error(
      'Unbound publication requires current live host capability evidence on stdin.',
    );
  }
  const capability = parseHostCapabilityEvidence(
    await dependencies.readObservationStdin(),
  );
  const provider = requested.provider as RemoteBindingMetadata['provider'];
  const selection = selectHostExecution({
    provider,
    context: capability.context,
    operation: 'create',
    candidates: [capability],
    attemptStarted: false,
  });
  if (!selection.selected)
    throw new Error(`No current host capability: ${selection.reason}.`);

  if (requested.localKind === 'project' && !requested.publicationFile) {
    throw new Error(
      'Project publication requires an explicit normalized publication projection.',
    );
  }
  const target: RemoteBindingMetadata['target'] =
    requested.localKind === 'backlog'
      ? {
          kind: 'backlog',
          scope: 'shared',
          id: requested.localId,
          path: `.oat/repo/pjm/backlog/items/${requested.localId}.md`,
        }
      : {
          kind: 'project',
          scope: 'shared',
          id: requested.localId,
          path: `.oat/projects/shared/${requested.localId}`,
        };
  const explicitExisting = request.previewOperationId
    ? await requireOperation(request.previewOperationId, store)
    : null;
  const invocation = await readCurrentMutationInvocation(request);
  let now = explicitExisting?.createdAt ?? dependencies.now();
  let local;
  if (target.kind === 'backlog') {
    const targetPath = resolveInsideProject(request.projectRoot, target.path);
    const content = await readFile(targetPath, 'utf8');
    if (Buffer.byteLength(content, 'utf8') > 1_048_576) {
      throw new Error('Unbound publication source exceeds the size limit.');
    }
    local = resolveLocalProjection({
      target: { kind: 'backlog', path: target.path, content },
      observedAt: now,
    });
  } else {
    const projectPublication = await readProjectPublication(
      request.projectRoot,
      requested.publicationFile!,
    );
    local = resolveLocalProjection({
      target: {
        kind: 'project',
        path: target.path,
        publication: projectPublication,
      },
      observedAt: now,
    });
  }
  const config = await readOatConfig(request.projectRoot);
  const repositoryPolicy = config.pjm?.remote?.policy ?? {
    description: 'none' as const,
    authority: { default: 'read-only' as const },
  };
  const descriptionPolicy = resolveEffectiveRemotePolicy({
    repository: repositoryPolicy,
    provider: repositoryPolicy.providers?.[provider],
    binding: {},
  });
  const effective = resolveEffectiveRemotePolicy({
    repository: repositoryPolicy,
    provider: repositoryPolicy.providers?.[provider],
    binding: {},
    completeDescriptionReplacement: descriptionPolicy.description === 'replace',
  });
  const authority = effective.authority.create;
  const publicationProjection: PlannedBindingCreate['publicationProjection'] = {
    title: target.kind === 'project' ? 'plan' : 'frontmatter',
    description:
      effective.description === 'none'
        ? 'none'
        : target.kind === 'project'
          ? 'summary'
          : 'description-section',
    priority: target.kind === 'project' ? 'plan' : 'frontmatter',
  };
  const usesDeterministicActiveIntent =
    authority === 'user-authorized' || authority === 'autonomous';
  const activeIntentDigest = semanticDigest({
    schemaVersion: 1,
    provider,
    providerContext: compactContext(capability.context),
    target,
    publicationProjection,
  });
  const deterministicOperationId = durableId('op', activeIntentDigest);
  const resolvedExisting =
    explicitExisting ??
    (usesDeterministicActiveIntent
      ? await store.readOperation(deterministicOperationId)
      : null);
  const resumedByActiveIntent = !explicitExisting && Boolean(resolvedExisting);
  if (
    resolvedExisting &&
    (resolvedExisting.operationClass !== 'create' ||
      !resolvedExisting.createIntent ||
      (resumedByActiveIntent
        ? !['planned', 'authorized', 'attempt-started'].includes(
            resolvedExisting.state,
          )
        : !['planned', 'authorized'].includes(resolvedExisting.state) ||
          resolvedExisting.attempts.length > 0))
  ) {
    throw new Error('Persisted create preview is not safely applicable.');
  }
  const existing = resolvedExisting;
  if (existing) {
    now = existing.createdAt;
    local = { ...local, observedAt: now };
  }
  const allocatedOperationId = existing
    ? null
    : durableId('op', dependencies.randomId());
  const operationId =
    existing?.operationId ??
    (usesDeterministicActiveIntent
      ? deterministicOperationId
      : allocatedOperationId!);
  const bindingId =
    existing?.bindingId ?? durableId('bnd', dependencies.randomId());
  const provenanceToken = `oat-binding:${bindingId}`;
  const projection = buildCreateProjection(
    local,
    effective.description,
    bindingId,
  );
  const safety = assessOutboundProjectionSafety(projection, {
    assessedAt: now,
  });
  if (safety.verdict !== 'safe') {
    throw new Error('Outbound safety evidence blocks unbound publication.');
  }
  const policyDigest = semanticDigest(effective);
  const preview = buildProductionMutationPreview({
    binding: { bindingId, provider, purposes: ['planning'] },
    target: {
      stableId: 'unbound',
      context: compactContext(capability.context),
    },
    baseline: null,
    revision: {
      strength: 'hash-only',
      token: null,
      updatedAt: null,
      contentHash: local.sourceRevision,
    },
    revisionEvidence: {
      source: 'local-source-unbound',
      strength: 'hash-only',
      updatedAt: null,
      observedAt: local.observedAt,
    },
    capability: {
      surfaceKind: selection.evidence.surfaceKind,
      evidenceDigest: selection.evidence.evidenceDigest,
      semanticCapabilities: selection.evidence.semanticCapabilities,
      context: compactContext(selection.evidence.context),
    },
    policy: { ...effective },
    projection,
    outboundSafety: safety,
    operationClass: 'create',
    fieldMask: Object.keys(projection) as Array<
      'title' | 'description' | 'priority'
    >,
    createdAt: now,
  });
  const authorityDecision = assessProductionMutationAuthority({
    effective: authority,
    invocation,
    preview,
    expected: {
      operationClass: 'create',
      targetId: `${target.kind}:${target.id}`,
      workflowId: target.id,
      workflowRevision: local.sourceRevision,
    },
    now: dependencies.now(),
    approvalMaxAgeMs: 300_000,
  });
  const createIntent: PlannedBindingCreate = {
    schemaVersion: 1,
    bindingId,
    operationId,
    provider,
    target,
    publicationProjection,
    providerContext: compactContext(capability.context),
    purposes: ['planning'],
    policyRestrictions: {},
    provenanceToken,
    localProjection: local,
    projectionStatus: 'complete',
    createdAt: now,
  };
  if (existing) {
    assertPreviewApplicationMatches(existing, {
      operationId,
      bindingId,
      provider,
      providerContext: compactContext(capability.context),
      capabilityEvidenceDigest: capability.evidenceDigest,
      revisionDigest: local.sourceRevision,
      revisionEvidence: preview.revisionEvidence,
      policyDigest,
      projectionDigest: safety.projectionDigest,
      safetyResultDigest: safety.resultDigest,
      previewDigest: preview.digest,
      approvalPreview: preview,
      descriptionMode: effective.description,
      createIntent,
    });
    if (
      authorityDecision.status === 'ready' &&
      authorityDecision.authority.sourceDigest !==
        existing.authority?.sourceDigest
    ) {
      throw new Error('Create authority evidence drifted from its preview.');
    }
    if (
      resumedByActiveIntent &&
      (existing.state !== 'planned' ||
        (await store.readCurrentAction(existing.operationId)))
    ) {
      return resumeCreateActionHandoff(request, existing, store, dependencies);
    }
  }
  if (authorityDecision.status === 'needs-review') {
    if (existing) {
      return approvalPreviewEnvelope(request, existing);
    }
    const verification = createVerification(projection, true);
    await store.createOperation({
      recordType: 'operation',
      schemaVersion: 2,
      operationId,
      correlationId: operationId,
      bindingId,
      provider,
      providerContext: compactContext(capability.context),
      lifecycleOperation: 'publish',
      operationClass: 'create',
      state: 'planned',
      reason: null,
      lastSafeStep: 'planned',
      preview: operationPreview({
        previewDigest: preview.digest,
        bindingId,
        provider,
        providerContext: compactContext(capability.context),
        capabilityEvidenceDigest: capability.evidenceDigest,
        revisionDigest: local.sourceRevision,
        revisionEvidence: preview.revisionEvidence,
        policyDigest,
        projectionDigest: safety.projectionDigest,
        safetyResultDigest: safety.resultDigest,
      }),
      approvalPreview: preview,
      descriptionMode: effective.description,
      authority: authorityDecision.authority,
      approval: null,
      createdAt: now,
      updatedAt: now,
      selectedExecution: capabilityReference(selection.evidence),
      attempts: [],
      observations: [],
      verification,
      retryDisposition: 'safe-before-attempt',
      steps: [],
      outcome: {
        classification: 'pending',
        message: 'fresh approval required',
        verifiedAt: null,
      },
      createIntent,
    });
    dependencies.crash?.('after-create-operation');
    return approvalPreviewEnvelope(
      request,
      await requireOperation(operationId, store),
    );
  }
  const action = buildExternalAction({
    operationId,
    stepId: durableId('step', operationId),
    provider,
    semanticOperation: 'create',
    context: capability.context,
    intent: {
      target: { kind: target.kind, scope: target.scope, id: target.id },
      fields: projection,
      provenanceToken,
    },
    expectedObservation: {
      fields: Object.keys(projection),
      requireIdentity: true,
      stableId: null,
      capabilityEvidenceDigest: capability.evidenceDigest,
    },
    persistedPreview: {
      projectionDigest: safety.projectionDigest,
      safetyResultDigest: safety.resultDigest,
    },
    projection,
    outboundSafety: safety,
  });
  const verification = createVerification(projection, true);
  const record: RemoteOperationRecord = {
    recordType: 'operation',
    schemaVersion: 2,
    operationId,
    correlationId: operationId,
    bindingId,
    provider,
    providerContext: compactContext(capability.context),
    lifecycleOperation: 'publish',
    operationClass: 'create',
    state: 'planned',
    reason: null,
    lastSafeStep: 'planned',
    preview: operationPreview({
      previewDigest: preview.digest,
      bindingId,
      provider,
      providerContext: compactContext(capability.context),
      capabilityEvidenceDigest: capability.evidenceDigest,
      revisionDigest: local.sourceRevision,
      revisionEvidence: preview.revisionEvidence,
      policyDigest,
      projectionDigest: safety.projectionDigest,
      safetyResultDigest: safety.resultDigest,
    }),
    approvalPreview: preview,
    descriptionMode: effective.description,
    authority: authorityDecision.authority,
    approval: authorityDecision.approval,
    createdAt: now,
    updatedAt: now,
    selectedExecution: {
      provider,
      surfaceKind: capability.surfaceKind,
      context: compactContext(capability.context),
      evidenceDigest: capability.evidenceDigest,
      semanticCapabilities: capability.semanticCapabilities,
    },
    attempts: [],
    observations: [],
    verification,
    retryDisposition: 'safe-before-attempt',
    steps: [],
    outcome: { classification: 'pending', message: null, verifiedAt: null },
    createIntent,
  };
  if (!existing) {
    await store.createOperation(record);
    dependencies.crash?.('after-create-operation');
  } else if (!existing.approval) {
    await store.transitionOperation(operationId, existing.state, {
      state: existing.state,
      updatedAt: dependencies.now(),
      approval: authorityDecision.approval,
    });
  }
  await store.writeCurrentAction(operationId, action);
  dependencies.crash?.('after-create-action');
  let persisted = await requireOperation(operationId, store);
  if (persisted.state === 'planned') {
    persisted = await store.transitionOperation(operationId, 'planned', {
      state: 'authorized',
      updatedAt: dependencies.now(),
      approval: authorityDecision.approval,
      lastSafeStep: 'authorized',
    });
  }
  dependencies.crash?.('after-create-authorization');
  if (persisted.state === 'authorized') {
    persisted = await store.transitionOperation(operationId, 'authorized', {
      state: 'attempt-started',
      updatedAt: dependencies.now(),
      appendAttempt: {
        attemptId: action.stepId,
        startedAt: now,
        completedAt: null,
        execution: capabilityReference(selection.evidence),
        requestDigest: action.actionDigest,
        receiptDigest: null,
      },
      lastSafeStep: 'attempt-started',
      retryDisposition: 'reconcile-required',
      outcome: record.outcome,
    });
  }
  dependencies.crash?.('after-create-attempt');
  dependencies.crash?.('before-create-envelope');
  return envelopeFrom(request, persisted, null, action);
}

async function prepareMutation(
  request: RemoteCommandRequest,
  store: RemoteSyncStore,
  dependencies: ProductionRemoteRunnerDependencies,
): Promise<RemoteCommandEnvelope> {
  const { metadata, state } = await requireBinding(request.bindingId, store);
  await assertCompleteProjectCreateProvenance(state, store);
  const existing = request.previewOperationId
    ? await requireOperation(request.previewOperationId, store)
    : null;
  if (
    existing &&
    (existing.operationClass !== 'update-fields' ||
      existing.bindingId !== metadata.bindingId ||
      existing.lifecycleOperation !==
        (request.operation === 'reconcile' ? 'reconcile' : 'publish') ||
      existing.state !== 'pending' ||
      existing.attempts.length > 0 ||
      (await store.readCurrentAction(existing.operationId)))
  ) {
    throw new Error('Persisted mutation preview is not safely applicable.');
  }
  const config = await readOatConfig(request.projectRoot);
  const repositoryPolicy = config.pjm?.remote?.policy ?? {
    description: 'none' as const,
    authority: { default: 'read-only' as const },
  };
  const providerPolicy = repositoryPolicy.providers?.[metadata.provider];
  const effective = resolveEffectiveRemotePolicy({
    repository: repositoryPolicy,
    provider: providerPolicy,
    binding: metadata.policyRestrictions,
  });
  const authority = effective.authority['update-fields'];
  if (!request.capabilityEvidenceStdin) {
    throw new Error(
      'Remote mutation requires current live host capability evidence on stdin.',
    );
  }
  const capability = parseHostCapabilityEvidence(
    await dependencies.readObservationStdin(),
  );
  const selection = selectHostExecution({
    provider: metadata.provider,
    context: metadata.remoteIdentity.context,
    operation: 'update',
    candidates: [capability],
    attemptStarted: false,
  });
  if (!selection.selected)
    throw new Error(`No current host capability: ${selection.reason}.`);
  const invocation = await readCurrentMutationInvocation(request);
  const now = existing?.createdAt ?? dependencies.now();
  const freshLocal =
    metadata.target.kind === 'backlog'
      ? await readBacklogProjection(
          request.projectRoot,
          metadata.target.path,
          now,
        )
      : state.localProjection.source === 'explicit-project-publication'
        ? state.localProjection
        : (() => {
            throw new Error(
              'Project mutation requires an explicit normalized publication projection.',
            );
          })();
  const freshState: RemoteBindingState = {
    ...state,
    localProjection: freshLocal,
  };
  if (!isDeepStrictEqual(state.localProjection, freshLocal)) {
    await store.writeBindingState(freshState);
  }
  const projection = planProductionMutationProjection({
    metadata,
    state: freshState,
    descriptionMode: effective.description,
    operation: request.operation === 'reconcile' ? 'reconcile' : 'publish',
    priorityMapping: true,
  });
  const safety = assessOutboundProjectionSafety(projection, {
    assessedAt: now,
  });
  const operationId =
    existing?.operationId ?? durableId('op', dependencies.randomId());
  const policyDigest = semanticDigest(effective);
  const preview = buildProductionMutationPreview({
    binding: {
      bindingId: metadata.bindingId,
      provider: metadata.provider,
      purposes: metadata.purposes,
    },
    target: {
      stableId: metadata.remoteIdentity.stableId,
      context: metadata.remoteIdentity.context,
    },
    baseline: state.baseline
      ? {
          baselineId: state.baseline.baselineId,
          digest: semanticDigest(state.baseline),
        }
      : null,
    revision: state.snapshot?.revision ?? {
      strength: 'unknown',
      token: null,
      updatedAt: null,
      contentHash: 'unobserved',
    },
    revisionEvidence: state.snapshot
      ? {
          source: 'remote',
          strength: state.snapshot.revision.strength,
          updatedAt: state.snapshot.revision.updatedAt,
          observedAt: state.snapshot.observedAt,
        }
      : {
          source: 'remote-unobserved',
          strength: 'unknown',
          updatedAt: null,
          observedAt: null,
        },
    capability: {
      surfaceKind: selection.evidence.surfaceKind,
      evidenceDigest: selection.evidence.evidenceDigest,
      semanticCapabilities: selection.evidence.semanticCapabilities,
      context: compactContext(selection.evidence.context),
    },
    policy: { ...effective },
    projection,
    outboundSafety: safety,
    operationClass: 'update-fields',
    fieldMask: Object.keys(projection) as Array<
      'title' | 'description' | 'priority'
    >,
    createdAt: now,
  });
  const authorityDecision = assessProductionMutationAuthority({
    effective: authority,
    invocation,
    preview,
    expected: {
      operationClass: 'update-fields',
      targetId: metadata.bindingId,
      workflowId: metadata.target.id,
      workflowRevision: freshState.localProjection.sourceRevision,
    },
    now: dependencies.now(),
    approvalMaxAgeMs: 300_000,
  });
  const action = buildExternalAction({
    operationId,
    stepId: durableId('step', dependencies.randomId()),
    provider: metadata.provider,
    semanticOperation: 'read',
    context: metadata.remoteIdentity.context,
    intent: { stableId: metadata.remoteIdentity.stableId },
    expectedObservation: {
      fields: ['title', 'description', 'priority', 'status'],
      requireIdentity: true,
      stableId: metadata.remoteIdentity.stableId,
      capabilityEvidenceDigest: capability.evidenceDigest,
    },
    persistedPreview: {
      projectionDigest: safety.projectionDigest,
      safetyResultDigest: safety.resultDigest,
    },
  });
  const verification = Object.entries(projection).map(([field, value]) => ({
    field,
    expectedHash: semanticDigest(value),
    observedHash: null,
    status: 'unavailable' as const,
  }));
  const plannedRecord = operationRecord({
    operationId,
    metadata,
    state: freshState,
    lifecycleOperation:
      request.operation === 'reconcile' ? 'reconcile' : 'publish',
    operationClass: 'update-fields',
    authority: authorityDecision.authority,
    approval: authorityDecision.approval,
    previewDigest: preview.digest,
    approvalPreview:
      authorityDecision.status === 'needs-review' ? preview : undefined,
    revisionEvidence: preview.revisionEvidence,
    descriptionMode: effective.description,
    capabilityEvidenceDigest: selection.evidence.evidenceDigest,
    policyDigest,
    projectionDigest: safety.projectionDigest,
    safetyResultDigest: safety.resultDigest,
    selectedExecution: selection.evidence,
    now,
    verification,
  });
  if (existing) {
    assertPreviewApplicationMatches(existing, {
      operationId,
      bindingId: metadata.bindingId,
      provider: metadata.provider,
      providerContext: metadata.remoteIdentity.context,
      capabilityEvidenceDigest: selection.evidence.evidenceDigest,
      revisionDigest: state.snapshot?.revision.contentHash ?? 'unobserved',
      revisionEvidence: preview.revisionEvidence,
      policyDigest,
      projectionDigest: safety.projectionDigest,
      safetyResultDigest: safety.resultDigest,
      previewDigest: preview.digest,
      approvalPreview: preview,
    });
    if (
      authorityDecision.status === 'ready' &&
      authorityDecision.authority.sourceDigest !==
        existing.authority?.sourceDigest
    ) {
      throw new Error('Mutation authority evidence drifted from its preview.');
    }
  }
  if (authorityDecision.status === 'needs-review') {
    if (existing) {
      throw new Error('Applying a preview requires fresh matching approval.');
    }
    await store.createOperation(plannedRecord);
    return approvalPreviewEnvelope(
      request,
      await requireOperation(operationId, store),
      metadata,
    );
  }
  if (existing) {
    await store.transitionOperation(operationId, 'pending', {
      state: 'pending',
      updatedAt: dependencies.now(),
      approval: authorityDecision.approval,
    });
  } else {
    await store.createOperation(plannedRecord);
  }
  await store.writeCurrentAction(operationId, action);
  return envelopeFrom(
    request,
    await requireOperation(operationId, store),
    metadata,
    action,
  );
}

async function continueOperation(
  request: RemoteCommandRequest,
  store: RemoteSyncStore,
  dependencies: ProductionRemoteRunnerDependencies,
): Promise<RemoteCommandEnvelope> {
  const operation = await requireOperation(request.operationId!, store);
  if (
    operation.createIntent &&
    !request.observationStdin &&
    ['planned', 'authorized'].includes(operation.state)
  ) {
    return resumeCreateActionHandoff(request, operation, store, dependencies);
  }
  if (
    operation.createIntent &&
    !request.observationStdin &&
    operation.state === 'attempt-started'
  ) {
    throw new Error(
      'Create attempt may already have executed; authoritative reconciliation is required before any retry.',
    );
  }
  if (operation.materializationPlan && operation.state !== 'verified') {
    return resumeMaterialization(request, operation, store, dependencies);
  }
  if (
    ['verified', 'uncertain', 'rejected', 'failed', 'blocked'].includes(
      operation.state,
    )
  ) {
    throw new Error(
      'Remote operation is terminal; observation replay is rejected.',
    );
  }
  if (operation.verificationHandoff && !request.observationStdin) {
    const action = restoreDurableVerificationAction(operation);
    return envelopeFrom(request, operation, null, action);
  }
  if (!request.observationStdin) {
    throw new Error(
      'Operation continuation requires stdin observation unless local materialization is pending.',
    );
  }
  let metadata = await store.readBindingMetadata(operation.bindingId);
  if (
    !metadata &&
    operation.lifecycleOperation !== 'intake' &&
    !operation.createIntent
  )
    throw new Error(`Remote binding '${operation.bindingId}' does not exist.`);
  const action = operation.verificationHandoff
    ? restoreDurableVerificationAction(operation)
    : await store.readCurrentAction(operation.operationId);
  if (!action)
    throw new Error(
      `Remote operation '${operation.operationId}' has no durable current action.`,
    );
  if (
    ['verified', 'uncertain', 'rejected', 'failed', 'blocked'].includes(
      operation.state,
    )
  ) {
    throw new Error(
      'Remote operation is terminal; observation replay is rejected.',
    );
  }
  const observation = acceptExternalObservation({
    action,
    observation: await dependencies.readObservationStdin(),
    acceptedStepDigests: new Set(
      operation.observations.flatMap((item) =>
        item.actionDigest ? [item.actionDigest] : [],
      ),
    ),
  });
  if (action.semanticOperation !== 'read') {
    dependencies.crash?.('after-observation-acceptance');
  }
  const now = dependencies.now();
  const observationEvidence = {
    observedAt: observation.observedAt,
    classification:
      observation.outcome.classification === 'observed'
        ? action.semanticOperation === 'read'
          ? ('none' as const)
          : ('committed' as const)
        : observation.outcome.classification === 'rejected'
          ? ('not-committed' as const)
          : ('unknown' as const),
    evidenceDigest: semanticDigest(observation),
    actionDigest: action.actionDigest,
  };
  if (observation.outcome.classification !== 'observed') {
    const terminal =
      observation.outcome.classification === 'rejected'
        ? 'rejected'
        : 'uncertain';
    const updated = await store.transitionOperation(
      operation.operationId,
      operation.state,
      {
        state: terminal,
        updatedAt: now,
        outcome: {
          classification: terminal,
          message: observation.outcome.diagnosticCode,
          verifiedAt: null,
        },
        appendObservation: observationEvidence,
        ...(action.semanticOperation === 'read'
          ? {}
          : {
              completeAttempt: {
                attemptId: action.stepId,
                completedAt: now,
                receiptDigest: observationEvidence.evidenceDigest,
              },
              lastSafeStep: 'verification-pending' as const,
              retryDisposition: 'reconcile-required' as const,
            }),
      },
    );
    return envelopeFrom(request, updated, metadata, null);
  }
  if (
    action.semanticOperation === 'read' &&
    operation.operationClass === 'update-fields' &&
    operation.state === 'pending'
  ) {
    if (!metadata) throw new Error('Mutation binding metadata is missing.');
    return continueMutationPreRead(
      request,
      operation,
      metadata,
      observation,
      store,
      dependencies,
      observationEvidence,
    );
  }
  if (action.semanticOperation !== 'read') {
    if (!observation.outcome.identity)
      throw new Error('Mutation observation lacks durable identity evidence.');
    const readAction = buildExternalAction({
      operationId: operation.operationId,
      stepId: durableId('verify', dependencies.randomId()),
      provider: operation.provider,
      semanticOperation: 'read',
      context: operation.providerContext,
      intent: { stableId: observation.outcome.identity.stableId },
      expectedObservation: {
        fields: ['title', 'description', 'priority', 'status'],
        requireIdentity: true,
        stableId:
          operation.createIntent?.provider === operation.provider
            ? observation.outcome.identity.stableId
            : (metadata?.remoteIdentity.stableId ??
              observation.outcome.identity.stableId),
        capabilityEvidenceDigest:
          operation.selectedExecution?.evidenceDigest ??
          observation.capabilityEvidenceDigest,
      },
      persistedPreview: {
        ...(operation.preview.projectionDigest
          ? { projectionDigest: operation.preview.projectionDigest }
          : {}),
        ...(operation.preview.safetyResultDigest
          ? { safetyResultDigest: operation.preview.safetyResultDigest }
          : {}),
      },
    });
    await store.writeActionEvidence(operation.operationId, readAction);
    await store.retireCurrentAction(operation.operationId, action);
    dependencies.crash?.('after-verification-action-retired');
    const updated = await store.transitionOperation(
      operation.operationId,
      operation.state,
      {
        state: 'verification-pending',
        updatedAt: now,
        outcome: {
          classification: 'pending',
          message: 'authoritative read-back required',
          verifiedAt: null,
        },
        appendObservation: observationEvidence,
        completeAttempt: {
          attemptId: action.stepId,
          completedAt: now,
          receiptDigest: observationEvidence.evidenceDigest,
        },
        lastSafeStep: 'verification-pending',
        retryDisposition: 'reconcile-required',
        currentAction: readAction as NonNullable<
          RemoteOperationRecord['currentAction']
        >,
        verificationHandoff: {
          acceptedMutation: {
            actionDigest: action.actionDigest,
            observedAt: observationEvidence.observedAt,
            evidenceDigest: observationEvidence.evidenceDigest,
            stableId: observation.outcome.identity.stableId,
          },
          verificationAction: readAction as NonNullable<
            RemoteOperationRecord['verificationHandoff']
          >['verificationAction'],
        },
      },
    );
    dependencies.crash?.('after-verification-handoff');
    dependencies.crash?.('after-verification-action');
    dependencies.crash?.('before-verification-envelope');
    return envelopeFrom(request, updated, metadata, readAction);
  }
  if (operation.lifecycleOperation === 'intake') {
    if (metadata)
      throw new Error('Intake operation binding is already materialized.');
    if (!observation.outcome.identity || !observation.outcome.revisionDigest) {
      throw new Error('Intake read-back lacks identity or revision evidence.');
    }
    const required = ['title', 'description', 'priority', 'status'];
    if (
      required.some(
        (field) => !Object.hasOwn(observation.outcome.fields, field),
      )
    ) {
      throw new Error('Intake read-back is missing a planned field.');
    }
    const target = action.intent.localTarget as
      | RemoteBindingMetadata['target']
      | undefined;
    if (!target)
      throw new Error('Intake operation lacks its durable local target.');
    metadata = {
      recordType: 'binding-metadata',
      schemaVersion: 1,
      bindingId: operation.bindingId,
      provider: operation.provider,
      target,
      remoteIdentity: {
        stableId: observation.outcome.identity.stableId,
        context: operation.providerContext,
        aliases: observation.outcome.identity.aliases.map((value) => ({
          kind: 'display' as const,
          value,
        })),
      },
      identityHistory: [],
      purposes: ['source'],
      policyRestrictions: {},
      publicationProjection: {
        title: 'frontmatter',
        description: 'description-section',
        priority: 'frontmatter',
      },
      provenanceToken: `oat-binding:${operation.bindingId}`,
      lifecycle: 'active',
      createdAt: operation.createdAt,
      updatedAt: now,
    };
    const snapshot = sanitizeRemoteSnapshot(
      {
        snapshotId: durableId('snap', dependencies.randomId()),
        bindingId: operation.bindingId,
        provider: operation.provider,
        observedAt: observation.observedAt,
        observedBy: {
          provider: operation.provider,
          surfaceKind: observation.surfaceKind,
          context: operation.providerContext,
          evidenceDigest: observation.capabilityEvidenceDigest,
          semanticCapabilities: ['read'],
        },
        identity: metadata.remoteIdentity,
        revision: {
          strength: 'hash-only',
          token: null,
          updatedAt: observation.observedAt,
          contentHash: observation.outcome.revisionDigest,
        },
        issue: {
          title: String(observation.outcome.fields.title ?? ''),
          description: String(observation.outcome.fields.description ?? ''),
          priority:
            observation.outcome.fields.priority == null
              ? null
              : String(observation.outcome.fields.priority),
          status: String(observation.outcome.fields.status ?? ''),
        },
        extensions: observation.outcome.extensions,
        lifecycle: 'active',
      },
      {
        allowedExtensionKeys: action.expectedObservation.extensionFields ?? [],
        suppressedFields: observation.outcome.suppressedFields,
      },
    );
    const targetMaterialization = await planIntakeBacklogTarget(
      request.projectRoot,
      target,
      snapshot,
      observation.observedAt,
    );
    const finalState: RemoteBindingState = {
      recordType: 'binding-state',
      schemaVersion: 2,
      bindingId: operation.bindingId,
      provider: operation.provider,
      metadataUpdatedAt: now,
      localProjection: targetMaterialization.localProjection,
      snapshot,
      baseline: baselineFromSnapshot({
        snapshot,
        operationId: operation.operationId,
        localProjectionRevision:
          targetMaterialization.localProjection.sourceRevision,
        agreedAt: now,
        descriptionMode: 'replace',
      }),
      capability: null,
      contentRedacted: snapshot.contentRedacted,
      lifecycle: 'active',
      lifecycleCondition: 'active',
      activeOperationIds: [],
      createdAt: now,
      updatedAt: now,
    };
    return stageAndResumeMaterialization({
      request,
      operation,
      store,
      dependencies,
      observationEvidence,
      verification: [],
      plan: {
        kind: targetMaterialization.seedContent
          ? 'intake-create'
          : 'intake-enrich',
        metadata,
        finalState,
        association: {
          provider: operation.provider,
          ref:
            observation.outcome.identity.aliases[0] ??
            observation.outcome.identity.stableId,
          bindingId: operation.bindingId,
          target,
          seedContent: targetMaterialization.seedContent,
        },
      },
    });
  }
  if (operation.lifecycleOperation === 'refresh') {
    if (!metadata) throw new Error('Refresh binding metadata is missing.');
    const state = await store.readBindingState(operation.bindingId);
    if (
      !state ||
      !observation.outcome.identity ||
      !observation.outcome.revisionDigest
    ) {
      throw new Error(
        'Refresh read-back lacks binding, identity, or revision evidence.',
      );
    }
    const required = ['title', 'description', 'priority', 'status'];
    if (
      required.some(
        (field) => !Object.hasOwn(observation.outcome.fields, field),
      )
    ) {
      throw new Error('Refresh read-back is missing a planned field.');
    }
    const snapshot = sanitizeRemoteSnapshot(
      {
        snapshotId: durableId('snap', dependencies.randomId()),
        bindingId: operation.bindingId,
        provider: operation.provider,
        observedAt: observation.observedAt,
        observedBy: {
          provider: operation.provider,
          surfaceKind: observation.surfaceKind,
          context: operation.providerContext,
          evidenceDigest: observation.capabilityEvidenceDigest,
          semanticCapabilities: ['read'],
        },
        identity: {
          stableId: observation.outcome.identity.stableId,
          context: operation.providerContext,
          aliases: observation.outcome.identity.aliases.map((value) => ({
            kind: 'display' as const,
            value,
          })),
        },
        revision: {
          strength: 'hash-only',
          token: null,
          updatedAt: observation.observedAt,
          contentHash: observation.outcome.revisionDigest,
        },
        issue: {
          title: String(observation.outcome.fields.title ?? ''),
          description: String(observation.outcome.fields.description ?? ''),
          priority:
            observation.outcome.fields.priority == null
              ? null
              : String(observation.outcome.fields.priority),
          status: String(observation.outcome.fields.status ?? ''),
        },
        extensions: observation.outcome.extensions,
        lifecycle: 'active',
      },
      {
        allowedExtensionKeys: action.expectedObservation.extensionFields ?? [],
        suppressedFields: observation.outcome.suppressedFields,
      },
    );
    await store.writeBindingState({
      ...state,
      snapshot,
      contentRedacted: snapshot.contentRedacted,
      updatedAt: now,
    });
  }
  const identityEvidence =
    observation.outcome.identity && observation.outcome.revisionDigest
      ? semanticDigest({
          provider: operation.provider,
          context: operation.providerContext,
          identity: observation.outcome.identity,
          revisionDigest: observation.outcome.revisionDigest,
        })
      : null;
  const verification = operation.verification.map((item) => {
    if (item.field === 'remoteIdentity') {
      return {
        ...item,
        expectedHash: identityEvidence ?? item.expectedHash,
        observedHash: identityEvidence,
        status: identityEvidence
          ? ('verified' as const)
          : ('unavailable' as const),
      };
    }
    const observedHash = Object.hasOwn(observation.outcome.fields, item.field)
      ? semanticDigest(observation.outcome.fields[item.field])
      : null;
    return {
      ...item,
      observedHash,
      status:
        observedHash === item.expectedHash
          ? ('verified' as const)
          : ('mismatch' as const),
    };
  });
  const verified = verification.every((item) => item.status === 'verified');
  if (!verified) {
    const uncertain = await store.transitionOperation(
      operation.operationId,
      operation.state,
      {
        state: 'uncertain',
        updatedAt: now,
        verification,
        outcome: {
          classification: 'uncertain',
          message: 'authoritative read-back mismatch',
          verifiedAt: null,
        },
        appendObservation: observationEvidence,
        lastSafeStep: 'verification-pending',
        retryDisposition: 'reconcile-required',
      },
    );
    return envelopeFrom(request, uncertain, metadata, null);
  }
  if (operation.createIntent) {
    if (!observation.outcome.identity || !observation.outcome.revisionDigest) {
      throw new Error('Create read-back lacks durable identity evidence.');
    }
    const intent = operation.createIntent;
    if (
      intent.target.kind === 'project' &&
      (intent.projectionStatus !== 'complete' ||
        intent.localProjection?.source !== 'explicit-project-publication')
    ) {
      throw new Error(
        'Persisted project create lacks a complete explicit local projection and requires reconciliation or repair.',
      );
    }
    metadata = {
      recordType: 'binding-metadata',
      schemaVersion: 1,
      bindingId: intent.bindingId,
      provider: intent.provider,
      target: intent.target,
      remoteIdentity: {
        stableId: observation.outcome.identity.stableId,
        context: intent.providerContext,
        aliases: observation.outcome.identity.aliases.map((value) => ({
          kind: 'display' as const,
          value,
        })),
      },
      identityHistory: [],
      purposes: intent.purposes,
      policyRestrictions: intent.policyRestrictions,
      publicationProjection: intent.publicationProjection,
      provenanceToken: intent.provenanceToken,
      lifecycle: 'active',
      createdAt: intent.createdAt,
      updatedAt: now,
    };
    const localProjection =
      intent.localProjection ??
      (intent.target.kind === 'backlog'
        ? await readBacklogProjection(
            request.projectRoot,
            intent.target.path,
            observation.observedAt,
          )
        : (() => {
            throw new Error(
              'Persisted project create lacks a complete explicit local projection and requires reconciliation or repair.',
            );
          })());
    const snapshot = snapshotFromObservation({
      snapshotId: durableId('snap', operation.operationId),
      bindingId: intent.bindingId,
      provider: intent.provider,
      context: intent.providerContext,
      identity: metadata.remoteIdentity,
      observation,
      allowedExtensionKeys: action.expectedObservation.extensionFields ?? [],
    });
    const finalState: RemoteBindingState = {
      recordType: 'binding-state',
      schemaVersion: 2,
      bindingId: intent.bindingId,
      provider: intent.provider,
      metadataUpdatedAt: now,
      localProjection,
      snapshot,
      baseline: baselineFromSnapshot({
        snapshot,
        operationId: operation.operationId,
        localProjectionRevision: localProjection.sourceRevision,
        agreedAt: now,
        descriptionMode: requireOperationDescriptionMode(operation),
      }),
      capability: null,
      contentRedacted: snapshot.contentRedacted,
      lifecycle: 'active',
      lifecycleCondition: 'active',
      activeOperationIds: [],
      createdAt: now,
      updatedAt: now,
    };
    return stageAndResumeMaterialization({
      request,
      operation,
      store,
      dependencies,
      observationEvidence,
      verification,
      plan: {
        kind: 'create',
        metadata,
        finalState,
        association:
          intent.target.kind === 'backlog'
            ? {
                provider: intent.provider,
                ref:
                  observation.outcome.identity.aliases[0] ??
                  observation.outcome.identity.stableId,
                bindingId: intent.bindingId,
                target: intent.target,
                seedContent: null,
              }
            : null,
      },
    });
  } else if (operation.operationClass === 'update-fields') {
    if (!metadata) throw new Error('Verified mutation binding is missing.');
    const state = await store.readBindingState(operation.bindingId);
    if (!state || !observation.outcome.identity) {
      throw new Error('Verified mutation lacks binding state or identity.');
    }
    const snapshot = snapshotFromObservation({
      snapshotId: durableId('snap', operation.operationId),
      bindingId: metadata.bindingId,
      provider: metadata.provider,
      context: metadata.remoteIdentity.context,
      identity: metadata.remoteIdentity,
      observation,
      allowedExtensionKeys: action.expectedObservation.extensionFields ?? [],
    });
    const finalState: RemoteBindingState = {
      ...state,
      snapshot,
      baseline: baselineFromSnapshot({
        snapshot,
        operationId: operation.operationId,
        localProjectionRevision: state.localProjection.sourceRevision,
        agreedAt: now,
        descriptionMode: requireOperationDescriptionMode(operation),
      }),
      contentRedacted: snapshot.contentRedacted,
      updatedAt: now,
    };
    return stageAndResumeMaterialization({
      request,
      operation,
      store,
      dependencies,
      observationEvidence,
      verification,
      plan: {
        kind: 'update',
        metadata,
        finalState,
        association: null,
      },
    });
  }
  const updated = await store.transitionOperation(
    operation.operationId,
    operation.state,
    {
      state: 'verified',
      updatedAt: now,
      verification,
      outcome: {
        classification: 'verified',
        message: 'authoritative read-back verified',
        verifiedAt: now,
      },
      appendObservation: observationEvidence,
      lastSafeStep: 'complete',
      retryDisposition: 'not-applicable',
    },
  );
  return envelopeFrom(request, updated, metadata, null);
}

async function resumeCreateActionHandoff(
  request: RemoteCommandRequest,
  operation: RemoteOperationRecord,
  store: RemoteSyncStore,
  dependencies: ProductionRemoteRunnerDependencies,
): Promise<RemoteCommandEnvelope> {
  if (operation.state === 'attempt-started') {
    throw new Error(
      'Create attempt may already have executed; authoritative reconciliation is required before any retry.',
    );
  }
  const action = await store.readCurrentAction(operation.operationId);
  if (!action) {
    throw new Error(
      `Create operation '${operation.operationId}' has no durable action; reapply that exact persisted operation before host execution.`,
    );
  }
  let current = operation;
  if (current.state === 'planned') {
    current = await store.transitionOperation(current.operationId, 'planned', {
      state: 'authorized',
      updatedAt: dependencies.now(),
      lastSafeStep: 'authorized',
    });
  }
  if (current.state === 'authorized') {
    if (!current.selectedExecution) {
      throw new Error(
        'Create action handoff lacks selected execution evidence.',
      );
    }
    current = await store.transitionOperation(
      current.operationId,
      'authorized',
      {
        state: 'attempt-started',
        updatedAt: dependencies.now(),
        appendAttempt: {
          attemptId: action.stepId,
          startedAt: current.createdAt,
          completedAt: null,
          execution: current.selectedExecution,
          requestDigest: action.actionDigest,
          receiptDigest: null,
        },
        lastSafeStep: 'attempt-started',
        retryDisposition: 'reconcile-required',
        outcome: {
          classification: 'pending',
          message: null,
          verifiedAt: null,
        },
      },
    );
  }
  if (
    current.state !== 'attempt-started' ||
    current.attempts.length !== 1 ||
    current.attempts[0]?.attemptId !== action.stepId ||
    current.attempts[0]?.requestDigest !== action.actionDigest
  ) {
    throw new Error('Create action handoff evidence is inconsistent.');
  }
  return envelopeFrom(request, current, null, action);
}

function restoreDurableVerificationAction(
  operation: RemoteOperationRecord,
): ExternalActionEnvelope {
  const handoff = operation.verificationHandoff;
  if (!handoff || operation.state !== 'verification-pending') {
    throw new Error(
      'Remote operation lacks a recoverable verification-pending handoff.',
    );
  }
  const durableAction = parseExternalAction(handoff.verificationAction);
  const currentAction = operation.currentAction
    ? parseExternalAction(operation.currentAction)
    : null;
  if (!currentAction || !isDeepStrictEqual(currentAction, durableAction)) {
    throw new Error(
      'Durable verification handoff contradicts the canonical current action.',
    );
  }
  return durableAction;
}

async function continueMutationPreRead(
  request: RemoteCommandRequest,
  operation: RemoteOperationRecord,
  metadata: RemoteBindingMetadata,
  observation: ReturnType<typeof acceptExternalObservation>,
  store: RemoteSyncStore,
  dependencies: ProductionRemoteRunnerDependencies,
  observationEvidence: RemoteOperationRecord['observations'][number],
): Promise<RemoteCommandEnvelope> {
  if (
    !observation.outcome.identity ||
    observation.outcome.identity.stableId !==
      metadata.remoteIdentity.stableId ||
    !observation.outcome.revisionDigest
  ) {
    throw new Error('Mutation pre-read identity or revision does not match.');
  }
  if (
    operation.preview.revisionDigest === 'unobserved' ||
    observation.outcome.revisionDigest !== operation.preview.revisionDigest
  ) {
    throw new Error('Mutation pre-read detected remote revision drift.');
  }
  const { state } = await requireBinding(metadata.bindingId, store);
  const local =
    metadata.target.kind === 'backlog'
      ? await readBacklogProjection(
          request.projectRoot,
          metadata.target.path,
          operation.createdAt,
        )
      : state.localProjection.source === 'explicit-project-publication'
        ? state.localProjection
        : (() => {
            throw new Error(
              'Project mutation requires an explicit normalized publication projection.',
            );
          })();

  const config = await readOatConfig(request.projectRoot);
  const repositoryPolicy = config.pjm?.remote?.policy ?? {
    description: 'none' as const,
    authority: { default: 'read-only' as const },
  };
  const effective = resolveEffectiveRemotePolicy({
    repository: repositoryPolicy,
    provider: repositoryPolicy.providers?.[metadata.provider],
    binding: metadata.policyRestrictions,
  });
  const policyDigest = semanticDigest(effective);
  if (
    effective.authority['update-fields'] !== operation.authority?.effective ||
    policyDigest !== operation.preview.policyDigest
  ) {
    throw new Error('Mutation policy or authority drifted after pre-read.');
  }
  const selected = operation.selectedExecution;
  if (
    !selected ||
    selected.provider !== metadata.provider ||
    selected.evidenceDigest !== operation.preview.capabilityEvidenceDigest ||
    !selected.semanticCapabilities.includes('update') ||
    semanticDigest(selected.context) !==
      semanticDigest(metadata.remoteIdentity.context)
  ) {
    throw new Error('Mutation capability or workflow context drifted.');
  }
  if (!state.snapshot) {
    throw new Error('Mutation pre-read requires an existing snapshot.');
  }
  const preReadState: RemoteBindingState = {
    ...state,
    localProjection: local,
    snapshot: {
      ...state.snapshot,
      observedAt: observation.observedAt,
      issue: {
        title: String(observation.outcome.fields.title ?? ''),
        description:
          observation.outcome.fields.description == null
            ? ''
            : String(observation.outcome.fields.description),
        priority:
          observation.outcome.fields.priority == null
            ? null
            : String(observation.outcome.fields.priority),
        status: String(observation.outcome.fields.status ?? ''),
      },
    },
  };
  const projection = planProductionMutationProjection({
    metadata,
    state: preReadState,
    descriptionMode: effective.description,
    operation:
      operation.lifecycleOperation === 'reconcile' ? 'reconcile' : 'publish',
    priorityMapping: true,
  });
  const safety = assessOutboundProjectionSafety(projection, {
    assessedAt: operation.createdAt,
  });
  if (
    safety.verdict !== 'safe' ||
    safety.projectionDigest !== operation.preview.projectionDigest ||
    safety.resultDigest !== operation.preview.safetyResultDigest
  ) {
    throw new Error('Mutation projection or safety evidence drifted.');
  }
  const preview = buildProductionMutationPreview({
    binding: {
      bindingId: metadata.bindingId,
      provider: metadata.provider,
      purposes: metadata.purposes,
    },
    target: {
      stableId: metadata.remoteIdentity.stableId,
      context: metadata.remoteIdentity.context,
    },
    baseline: state.baseline
      ? {
          baselineId: state.baseline.baselineId,
          digest: semanticDigest(state.baseline),
        }
      : null,
    revision: preReadState.snapshot!.revision,
    revisionEvidence: operation.preview.revisionEvidence!,
    capability: {
      surfaceKind: selected.surfaceKind as 'connector' | 'configured-cli',
      evidenceDigest: selected.evidenceDigest,
      semanticCapabilities: selected.semanticCapabilities,
      context: compactContext(selected.context),
    },
    policy: { ...effective },
    projection,
    outboundSafety: safety,
    operationClass: 'update-fields',
    fieldMask: Object.keys(projection) as Array<
      'title' | 'description' | 'priority'
    >,
    createdAt: operation.createdAt,
  });
  if (preview.digest !== operation.preview.digest) {
    throw new Error('Mutation preview drifted after authoritative pre-read.');
  }
  const invocation = await readCurrentMutationInvocation(request);
  const authorityDecision = validateProductionMutationAuthority({
    effective: effective.authority['update-fields'],
    invocation,
    preview,
    expected: {
      operationClass: 'update-fields',
      targetId: metadata.bindingId,
      workflowId: metadata.target.id,
      workflowRevision: local.sourceRevision,
    },
    now: dependencies.now(),
    approvalMaxAgeMs: 300_000,
  });
  if (
    authorityDecision.authority.sourceDigest !==
    operation.authority?.sourceDigest
  ) {
    throw new Error('Mutation authority evidence drifted after pre-read.');
  }
  const action = buildExternalAction({
    operationId: operation.operationId,
    stepId: durableId('mutate', dependencies.randomId()),
    provider: metadata.provider,
    semanticOperation: 'update',
    context: metadata.remoteIdentity.context,
    intent: { stableId: metadata.remoteIdentity.stableId, fields: projection },
    expectedObservation: {
      fields: Object.keys(projection),
      requireIdentity: true,
      stableId: metadata.remoteIdentity.stableId,
      capabilityEvidenceDigest: selected.evidenceDigest,
    },
    persistedPreview: {
      projectionDigest: safety.projectionDigest,
      safetyResultDigest: safety.resultDigest,
    },
    projection,
    outboundSafety: safety,
  });
  await store.transitionOperation(operation.operationId, operation.state, {
    state: 'authorized',
    updatedAt: dependencies.now(),
    outcome: {
      classification: 'pending',
      message: 'authoritative pre-read verified',
      verifiedAt: null,
    },
    appendObservation: observationEvidence,
    lastSafeStep: 'authorized',
  });
  await store.writeCurrentAction(operation.operationId, action);
  const attempted = await store.transitionOperation(
    operation.operationId,
    'authorized',
    {
      state: 'attempt-started',
      updatedAt: dependencies.now(),
      appendAttempt: {
        attemptId: action.stepId,
        startedAt: dependencies.now(),
        completedAt: null,
        execution: selected,
        requestDigest: action.actionDigest,
        receiptDigest: null,
      },
      lastSafeStep: 'attempt-started',
      retryDisposition: 'reconcile-required',
    },
  );
  return envelopeFrom(request, attempted, metadata, action);
}

async function readCurrentMutationInvocation(
  request: RemoteCommandRequest,
): Promise<ProductionMutationInvocation | null> {
  if (!request.authorityEvidenceFile) return null;
  const sourcePath = isAbsolute(request.authorityEvidenceFile)
    ? request.authorityEvidenceFile
    : resolve(request.projectRoot, request.authorityEvidenceFile);
  const raw = await readFile(sourcePath, 'utf8');
  if (Buffer.byteLength(raw, 'utf8') > 65_536) {
    throw new Error('Current caller invocation evidence exceeds 64 KiB.');
  }
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new Error('Current caller invocation evidence is not valid JSON.');
  }
  return parseProductionMutationInvocation(value);
}

async function readProjectPublication(
  projectRoot: string,
  publicationFile: string,
): Promise<{
  title: string;
  description: string | null;
  priority: string | null;
}> {
  const sourcePath = isAbsolute(publicationFile)
    ? publicationFile
    : resolve(projectRoot, publicationFile);
  const raw = await readFile(sourcePath, 'utf8');
  if (Buffer.byteLength(raw, 'utf8') > 65_536) {
    throw new Error('Project publication projection exceeds 64 KiB.');
  }
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new Error('Project publication projection is not valid JSON.');
  }
  if (
    typeof value !== 'object' ||
    value === null ||
    Array.isArray(value) ||
    Object.keys(value).some(
      (key) => !['title', 'description', 'priority'].includes(key),
    )
  ) {
    throw new Error('Project publication projection has invalid fields.');
  }
  const publication = value as Record<string, unknown>;
  if (
    typeof publication.title !== 'string' ||
    publication.title.length > 8_192 ||
    !publication.title.trim() ||
    !(
      publication.description === null ||
      typeof publication.description === 'string'
    ) ||
    !(
      publication.priority === null || typeof publication.priority === 'string'
    ) ||
    (typeof publication.priority === 'string' &&
      publication.priority.length > 255)
  ) {
    throw new Error('Project publication projection is invalid.');
  }
  return {
    title: publication.title,
    description: publication.description,
    priority: publication.priority,
  };
}

function buildCreateProjection(
  local: RemoteBindingState['localProjection'],
  descriptionMode: 'none' | 'managed-section' | 'replace',
  bindingId: string,
): OutboundProjection {
  const projection: OutboundProjection = {
    title: local.title,
    priority: local.priority,
  };
  if (descriptionMode === 'replace') {
    projection.description = local.description;
  } else if (descriptionMode === 'managed-section') {
    projection.description = buildManagedMarkdownBlock(
      bindingId,
      local.description ?? '',
    );
  }
  return projection;
}

function createVerification(
  projection: OutboundProjection,
  requireIdentity: boolean,
): RemoteOperationRecord['verification'] {
  return [
    ...Object.entries(projection).map(([field, value]) => ({
      field,
      expectedHash: semanticDigest(value),
      observedHash: null,
      status: 'unavailable' as const,
    })),
    ...(requireIdentity
      ? [
          {
            field: 'remoteIdentity',
            expectedHash: 'pending-authoritative-read-back',
            observedHash: null,
            status: 'unavailable' as const,
          },
        ]
      : []),
  ];
}

function operationPreview(input: {
  previewDigest: string;
  bindingId: string;
  provider: RemoteBindingMetadata['provider'];
  providerContext: Record<string, string>;
  capabilityEvidenceDigest: string;
  revisionDigest: string;
  revisionEvidence: PersistedApprovalPreview['revisionEvidence'];
  policyDigest: string;
  projectionDigest: string;
  safetyResultDigest: string;
}): RemoteOperationRecord['preview'] {
  return {
    digest: input.previewDigest,
    bindingId: input.bindingId,
    provider: input.provider,
    providerContext: input.providerContext,
    capabilityEvidenceDigest: input.capabilityEvidenceDigest,
    revisionDigest: input.revisionDigest,
    ...(input.revisionEvidence
      ? { revisionEvidence: input.revisionEvidence }
      : {}),
    policyDigest: input.policyDigest,
    projectionDigest: input.projectionDigest,
    safetyResultDigest: input.safetyResultDigest,
  };
}

function assertPreviewApplicationMatches(
  operation: RemoteOperationRecord,
  expected: {
    operationId: string;
    bindingId: string;
    provider: RemoteBindingMetadata['provider'];
    providerContext: Record<string, string>;
    capabilityEvidenceDigest: string;
    revisionDigest: string;
    revisionEvidence: PersistedApprovalPreview['revisionEvidence'];
    policyDigest: string;
    projectionDigest: string;
    safetyResultDigest: string;
    previewDigest: string;
    approvalPreview?: PersistedApprovalPreview;
    descriptionMode?: 'none' | 'managed-section' | 'replace';
    createIntent?: PlannedBindingCreate;
  },
): void {
  const preview = operationPreview(expected);
  if (
    operation.operationId !== expected.operationId ||
    !isDeepStrictEqual(operation.preview, preview) ||
    !isDeepStrictEqual(operation.approvalPreview, expected.approvalPreview) ||
    (expected.descriptionMode !== undefined &&
      operation.descriptionMode !== expected.descriptionMode) ||
    !isDeepStrictEqual(operation.createIntent, expected.createIntent)
  ) {
    throw new Error(
      'Persisted preview drifted from current load-bearing inputs.',
    );
  }
}

function approvalPreviewEnvelope(
  request: RemoteCommandRequest,
  operation: RemoteOperationRecord,
  metadata: RemoteBindingMetadata | null = null,
): RemoteCommandEnvelope {
  const revisionEvidence = operation.preview.revisionEvidence;
  if (!revisionEvidence) {
    throw new Error(
      'Persisted approval preview lacks digest-bound revision freshness evidence.',
    );
  }
  return {
    schemaVersion: 1,
    status: 'needs-review',
    operation: request.operation,
    projectRoot: request.projectRoot,
    persisted: true,
    results: [
      {
        bindingId: operation.bindingId,
        provider: operation.provider,
        target:
          metadata?.target.id ??
          operation.createIntent?.target.id ??
          operation.bindingId,
        status: 'needs-review',
        freshness: operation.updatedAt,
        authority: operation.authority?.effective ?? 'user-approved',
        diagnosticCode: 'preview-approval-required',
      },
    ],
    externalAction: null,
    approvalPreview: {
      operationId: operation.operationId,
      digest: operation.approvalPreview!.digest,
      operationClass: operation.approvalPreview!.operationClass,
      fieldMask: operation.approvalPreview!.fieldMask,
      renderedFields: operation.approvalPreview!.renderedFields,
      authority: operation.authority?.effective ?? 'user-approved',
      revision: {
        digest: operation.preview.revisionDigest,
        evidenceDigest: operation.approvalPreview!.componentDigests.revision,
        ...revisionEvidence,
      },
    },
    recovery: [
      {
        code: 'preview-operation',
        instruction: operation.operationId,
      },
      {
        code: 'preview-digest',
        instruction: operation.preview.digest,
      },
      {
        code: 'preview-approval-required',
        instruction:
          'Supply fresh matching approval and apply the exact persisted operation with --apply-preview.',
      },
    ],
  };
}

export function planProductionMutationProjection(input: {
  metadata: RemoteBindingMetadata;
  state: RemoteBindingState;
  descriptionMode: 'none' | 'managed-section' | 'replace';
  operation: 'publish' | 'reconcile';
  priorityMapping: boolean;
}): OutboundProjection {
  if (!input.state.snapshot) {
    throw new Error('Remote mutation requires a current bounded snapshot.');
  }
  const purpose = composePurposePolicies(input.metadata.purposes);
  const remoteDescription =
    input.descriptionMode === 'managed-section'
      ? managedDescriptionForReconciliation(
          input.state.snapshot.issue.description,
          input.metadata.bindingId,
        )
      : input.descriptionMode === 'none'
        ? null
        : input.state.snapshot.issue.description;
  const base = input.state.baseline
    ? {
        title: input.state.baseline.fields.title.value,
        description:
          input.descriptionMode === 'none'
            ? null
            : input.state.baseline.fields.description.value,
        priority: input.state.baseline.fields.priority.value,
      }
    : {
        title: input.state.snapshot.issue.title,
        description: remoteDescription,
        priority: input.state.snapshot.issue.priority,
      };
  const local = {
    title: input.state.localProjection.title,
    description:
      input.descriptionMode === 'none'
        ? null
        : input.state.localProjection.description,
    priority: input.state.localProjection.priority,
  };
  const remote = {
    title: input.state.snapshot.issue.title,
    description: remoteDescription,
    priority: input.state.snapshot.issue.priority,
  };
  const reconciliation = reconcileBinding({
    base,
    local,
    remote,
    fieldDirections: purpose.fields,
    descriptionMode: input.descriptionMode,
    priorityMapping: input.priorityMapping,
    remoteLifecycle: input.state.lifecycleCondition,
    uncertainOperation: false,
  });
  if (reconciliation.choiceRequired) {
    throw new Error(
      'Remote mutation has a same-field reconciliation conflict.',
    );
  }
  if (
    reconciliation.blockedBy.some(
      (value) => value !== 'priority-mapping-unavailable',
    )
  ) {
    throw new Error(
      `Remote mutation is blocked by ${reconciliation.blockedBy.join(', ')}.`,
    );
  }

  const projection: OutboundProjection = {};
  const shouldWrite = (field: 'title' | 'description' | 'priority') =>
    purpose.fields[field].includes('outbound') &&
    (input.operation === 'publish' ||
      reconciliation.fields[field]?.proposedDirection === 'outbound');
  if (shouldWrite('title')) projection.title = local.title;
  if (shouldWrite('description') && input.descriptionMode !== 'none') {
    if (input.descriptionMode === 'replace') {
      projection.description = local.description;
    } else {
      const current = input.state.snapshot.issue.description;
      const replacement = replaceManagedMarkdown(
        current,
        input.metadata.bindingId,
        local.description ?? '',
      );
      const managed =
        replacement.status === 'updated'
          ? replacement
          : replacement.reason === 'missing-boundary'
            ? insertManagedMarkdown(
                current,
                input.metadata.bindingId,
                local.description ?? '',
              )
            : replacement;
      if (managed.status !== 'updated') {
        throw new Error(
          `Managed description requires a choice: ${managed.reason}.`,
        );
      }
      projection.description = managed.body;
    }
  }
  if (input.priorityMapping && shouldWrite('priority')) {
    projection.priority = local.priority;
  }
  if (Object.keys(projection).length === 0) {
    throw new Error(
      'Effective binding purpose and field policy permit no outbound fields.',
    );
  }
  return projection;
}

function managedDescriptionForReconciliation(
  body: string,
  bindingId: string,
): string {
  const inspection = inspectManagedMarkdown(body, bindingId);
  if (inspection.status === 'managed') return inspection.content;
  if (inspection.status === 'absent') return body;
  throw new Error(
    `Remote managed description has invalid boundaries: ${inspection.reason}.`,
  );
}

async function readBacklogProjection(
  projectRoot: string,
  relativePath: string,
  observedAt: string,
) {
  const targetPath = resolveInsideProject(projectRoot, relativePath);
  const content = await readFile(targetPath, 'utf8');
  if (Buffer.byteLength(content, 'utf8') > 1_048_576) {
    throw new Error('Mutation projection source exceeds the size limit.');
  }
  return resolveLocalProjection({
    target: { kind: 'backlog', path: relativePath, content },
    observedAt,
  });
}

async function stageAndResumeMaterialization(input: {
  request: RemoteCommandRequest;
  operation: RemoteOperationRecord;
  store: RemoteSyncStore;
  dependencies: ProductionRemoteRunnerDependencies;
  observationEvidence: RemoteOperationRecord['observations'][number];
  verification: RemoteOperationRecord['verification'];
  plan: NonNullable<RemoteOperationRecord['materializationPlan']>;
}): Promise<RemoteCommandEnvelope> {
  const now = input.dependencies.now();
  const staged = await input.store.transitionOperation(
    input.operation.operationId,
    input.operation.state,
    {
      state: input.operation.state,
      updatedAt: now,
      verification: input.verification,
      outcome: {
        classification: 'partial',
        message: 'remote effect verified; local materialization pending',
        verifiedAt: now,
      },
      appendObservation: input.observationEvidence,
      lastSafeStep: 'verification-pending',
      retryDisposition: 'reconcile-required',
      materializationPlan: input.plan,
      appendMaterializationStep: {
        step: 'journal',
        completedAt: now,
        evidenceDigest: semanticDigest(input.plan),
      },
    },
  );
  input.dependencies.crash?.('after-journal');
  return resumeMaterialization(
    input.request,
    staged,
    input.store,
    input.dependencies,
  );
}

async function resumeMaterialization(
  request: RemoteCommandRequest,
  operation: RemoteOperationRecord,
  store: RemoteSyncStore,
  dependencies: ProductionRemoteRunnerDependencies,
): Promise<RemoteCommandEnvelope> {
  const plan = operation.materializationPlan;
  if (!plan || operation.state === 'verified') {
    throw new Error('Remote operation has no resumable materialization plan.');
  }
  const completed = () =>
    new Set((operation.materializationSteps ?? []).map((item) => item.step));
  const complete = async (
    step: NonNullable<
      RemoteOperationRecord['materializationSteps']
    >[number]['step'],
    evidence: unknown,
    crashPoint: MaterializationCrashPoint,
  ) => {
    if (completed().has(step)) return;
    operation = await store.transitionOperation(
      operation.operationId,
      operation.state,
      {
        state: operation.state,
        updatedAt: dependencies.now(),
        appendMaterializationStep: {
          step,
          completedAt: dependencies.now(),
          evidenceDigest: semanticDigest(evidence),
        },
      },
    );
    dependencies.crash?.(crashPoint);
  };

  if (plan.association?.seedContent && !completed().has('target')) {
    await writeSeedTarget(
      request.projectRoot,
      plan.association.target,
      plan.association.seedContent,
      operation.operationId,
    );
    await complete('target', plan.association.seedContent, 'after-target');
  }
  if (plan.kind !== 'update' && !completed().has('metadata')) {
    if (plan.kind === 'create') {
      const identityEvidence = operation.verification.find(
        (item) => item.field === 'remoteIdentity',
      )?.observedHash;
      if (!identityEvidence) {
        throw new Error('Create materialization lacks identity verification.');
      }
      await store.materializeVerifiedBinding(
        operation.operationId,
        plan.metadata,
        {
          provider: plan.metadata.provider,
          stableId: plan.metadata.remoteIdentity.stableId,
          verifiedAt: operation.outcome.verifiedAt!,
          evidenceDigest: identityEvidence,
        },
      );
    } else {
      await store.materializeIntakeBinding(plan.metadata);
    }
    await complete('metadata', plan.metadata, 'after-metadata');
  }

  let state = await store.readBindingState(operation.bindingId);
  if (!completed().has('state')) {
    const initial = {
      ...plan.finalState,
      snapshot: null,
      baseline: null,
      contentRedacted: false,
    };
    if (!state) {
      await store.writeBindingState(initial);
      state = initial;
    } else {
      assertMaterializationStateCompatible(state, plan.finalState);
    }
    await complete('state', initial, 'after-state');
  }
  state = (await store.readBindingState(operation.bindingId))!;
  if (!completed().has('snapshot')) {
    if (plan.kind === 'update') {
      state = {
        ...state,
        snapshot: plan.finalState.snapshot,
        contentRedacted: plan.finalState.contentRedacted,
        updatedAt: plan.finalState.updatedAt,
      };
      await store.writeBindingState(state);
    } else if (!state.snapshot) {
      state = {
        ...state,
        snapshot: plan.finalState.snapshot,
        contentRedacted: plan.finalState.contentRedacted,
        updatedAt: plan.finalState.updatedAt,
      };
      await store.writeBindingState(state);
    } else if (!isDeepStrictEqual(state.snapshot, plan.finalState.snapshot)) {
      throw new Error('Existing snapshot conflicts with materialization plan.');
    }
    await complete('snapshot', plan.finalState.snapshot, 'after-snapshot');
  }
  state = (await store.readBindingState(operation.bindingId))!;
  if (!completed().has('baseline')) {
    if (plan.kind === 'update') {
      state = { ...state, baseline: plan.finalState.baseline };
      await store.writeBindingState(state);
    } else if (!state.baseline) {
      state = { ...state, baseline: plan.finalState.baseline };
      await store.writeBindingState(state);
    } else if (!isDeepStrictEqual(state.baseline, plan.finalState.baseline)) {
      throw new Error('Existing baseline conflicts with materialization plan.');
    }
    await complete('baseline', plan.finalState.baseline, 'after-baseline');
  }
  if (plan.association && !completed().has('association')) {
    await writeVerifiedAssociation(
      request.projectRoot,
      {
        bindingId: plan.association.bindingId,
        provider: plan.association.provider,
        target: plan.association.target,
      },
      plan.association.ref,
      operation.operationId,
    );
    await complete('association', plan.association, 'after-association');
  }
  const terminal = await store.transitionOperation(
    operation.operationId,
    operation.state,
    {
      state: 'verified',
      updatedAt: dependencies.now(),
      outcome: {
        classification: 'verified',
        message: 'authoritative read-back and local materialization verified',
        verifiedAt: operation.outcome.verifiedAt,
      },
      lastSafeStep: 'complete',
      retryDisposition: 'not-applicable',
    },
  );
  dependencies.crash?.('after-terminal');
  return envelopeFrom(request, terminal, plan.metadata, null);
}

function assertMaterializationStateCompatible(
  existing: RemoteBindingState,
  planned: RemoteBindingState,
): void {
  const withoutProgress = (state: RemoteBindingState) => ({
    ...state,
    snapshot: null,
    baseline: null,
    contentRedacted: false,
    updatedAt: planned.updatedAt,
  });
  if (!isDeepStrictEqual(withoutProgress(existing), withoutProgress(planned))) {
    throw new Error(
      'Existing binding state conflicts with materialization plan.',
    );
  }
}

function snapshotFromObservation(input: {
  snapshotId: string;
  bindingId: string;
  provider: RemoteBindingMetadata['provider'];
  context: Record<string, string>;
  identity: RemoteBindingMetadata['remoteIdentity'];
  observation: ReturnType<typeof acceptExternalObservation>;
  allowedExtensionKeys: readonly string[];
}): RemoteSnapshotRecord {
  if (!input.observation.outcome.revisionDigest) {
    throw new Error('Authoritative read-back lacks revision evidence.');
  }
  const required = ['title', 'description', 'priority'];
  if (
    required.some(
      (field) => !Object.hasOwn(input.observation.outcome.fields, field),
    )
  ) {
    throw new Error('Authoritative read-back is missing a core field.');
  }
  return sanitizeRemoteSnapshot(
    {
      snapshotId: input.snapshotId,
      bindingId: input.bindingId,
      provider: input.provider,
      observedAt: input.observation.observedAt,
      observedBy: {
        provider: input.provider,
        surfaceKind: input.observation.surfaceKind,
        context: input.context,
        evidenceDigest: input.observation.capabilityEvidenceDigest,
        semanticCapabilities: ['read'],
      },
      identity: input.identity,
      revision: {
        strength: 'hash-only',
        token: null,
        updatedAt: input.observation.observedAt,
        contentHash: input.observation.outcome.revisionDigest,
      },
      issue: {
        title: String(input.observation.outcome.fields.title ?? ''),
        description: String(input.observation.outcome.fields.description ?? ''),
        priority:
          input.observation.outcome.fields.priority == null
            ? null
            : String(input.observation.outcome.fields.priority),
        status: String(input.observation.outcome.fields.status ?? 'unknown'),
      },
      extensions: input.observation.outcome.extensions,
      lifecycle: 'active',
    },
    {
      allowedExtensionKeys: input.allowedExtensionKeys,
      suppressedFields: input.observation.outcome.suppressedFields,
    },
  );
}

function baselineFromSnapshot(input: {
  snapshot: RemoteSnapshotRecord;
  operationId: string;
  localProjectionRevision: string;
  agreedAt: string;
  descriptionMode: 'none' | 'managed-section' | 'replace';
}): RemoteBaselineRecord {
  const field = (value: string | null) => ({
    value,
    hash: semanticDigest(value),
  });
  let governedDescription: string | null;
  if (input.descriptionMode === 'none') {
    governedDescription = null;
  } else if (input.descriptionMode === 'replace') {
    governedDescription = input.snapshot.issue.description;
  } else {
    const inspection = inspectManagedMarkdown(
      input.snapshot.issue.description,
      input.snapshot.bindingId,
    );
    if (inspection.status !== 'managed') {
      const reason =
        inspection.status === 'absent' ? 'missing-boundary' : inspection.reason;
      throw new Error(
        `Verified managed description has invalid boundaries: ${reason}.`,
      );
    }
    governedDescription = inspection.content;
  }
  return {
    recordType: 'baseline',
    schemaVersion: 1,
    baselineId: durableId('base', input.operationId),
    bindingId: input.snapshot.bindingId,
    agreedAt: input.agreedAt,
    acceptedByOperationId: input.operationId,
    localProjectionRevision: input.localProjectionRevision,
    remoteRevision: input.snapshot.revision,
    fields: {
      title: field(input.snapshot.issue.title),
      description: field(governedDescription),
      priority: field(input.snapshot.issue.priority),
    },
  };
}

function requireOperationDescriptionMode(
  operation: RemoteOperationRecord,
): 'none' | 'managed-section' | 'replace' {
  if (!operation.descriptionMode) {
    throw new Error(
      'Mutation operation lacks its persisted effective description policy.',
    );
  }
  return operation.descriptionMode;
}

async function planIntakeBacklogTarget(
  projectRoot: string,
  target: RemoteBindingMetadata['target'],
  snapshot: RemoteSnapshotRecord,
  observedAt: string,
): Promise<{
  seedContent: string | null;
  localProjection: RemoteBindingState['localProjection'];
}> {
  if (target.kind !== 'backlog') {
    throw new Error('Intake requires a backlog target.');
  }
  const path = resolveInsideProject(projectRoot, target.path);
  try {
    const content = await readFile(path, 'utf8');
    return {
      seedContent: null,
      localProjection: resolveLocalProjection({
        target: { kind: 'backlog', path: target.path, content },
        observedAt,
      }),
    };
  } catch (error) {
    if (!isNodeError(error) || error.code !== 'ENOENT') throw error;
  }
  const frontmatter = new YAML.Document({
    id: target.id,
    title: snapshot.issue.title,
    priority: snapshot.issue.priority,
    associated_issues: [],
  });
  const content = `---\n${frontmatter.toString().trimEnd()}\n---\n\n## Description\n\n${snapshot.issue.description}\n`;
  return {
    seedContent: content,
    localProjection: resolveLocalProjection({
      target: { kind: 'backlog', path: target.path, content },
      observedAt,
    }),
  };
}

async function writeSeedTarget(
  projectRoot: string,
  target: RemoteBindingMetadata['target'],
  content: string,
  operationId: string,
): Promise<void> {
  if (target.kind !== 'backlog') {
    throw new Error('Seed materialization requires a backlog target.');
  }
  const path = resolveInsideProject(projectRoot, target.path);
  try {
    const existing = await readFile(path, 'utf8');
    if (existing !== content) {
      throw new Error('Existing intake target conflicts with its staged plan.');
    }
    return;
  } catch (error) {
    if (!isNodeError(error) || error.code !== 'ENOENT') throw error;
  }
  await mkdir(dirname(path), { recursive: true });
  const temporary = resolve(
    dirname(path),
    `.${target.id}.${operationId.replace(/[^A-Za-z0-9_-]/g, '_')}.tmp`,
  );
  try {
    await writeFile(temporary, content, { encoding: 'utf8', flag: 'wx' });
    await rename(temporary, path);
  } catch (error) {
    await unlink(temporary).catch(() => undefined);
    throw error;
  }
}

function buildProductionMutationPreview(input: {
  binding: {
    bindingId: string;
    provider: RemoteBindingMetadata['provider'];
    purposes: string[];
  };
  target: { stableId: string; context: Record<string, string> };
  baseline: { baselineId: string; digest: string } | null;
  revision: RemoteSnapshotRecord['revision'];
  revisionEvidence: PersistedApprovalPreview['revisionEvidence'];
  capability: {
    surfaceKind: 'connector' | 'configured-cli';
    evidenceDigest: string;
    semanticCapabilities: string[];
    context: Record<string, string>;
  };
  policy: Record<string, unknown>;
  projection: OutboundProjection;
  outboundSafety: ReturnType<typeof assessOutboundProjectionSafety>;
  operationClass: 'create' | 'update-fields';
  fieldMask: Array<'title' | 'description' | 'priority'>;
  createdAt: string;
}): PersistedApprovalPreview {
  const componentDigests = {
    target: semanticDigest(input.target),
    baseline: semanticDigest(input.baseline),
    revision: semanticDigest({
      revision: input.revision,
      evidence: input.revisionEvidence,
    }),
    capability: semanticDigest(input.capability),
    policy: semanticDigest(input.policy),
    projection: input.outboundSafety.projectionDigest,
    outboundSafety: input.outboundSafety.resultDigest,
  };
  const digest = semanticDigest({
    schemaVersion: 1,
    binding: input.binding,
    operationClass: input.operationClass,
    fieldMask: input.fieldMask,
    createdAt: input.createdAt,
    componentDigests,
    revisionEvidence: input.revisionEvidence,
  });
  return {
    schemaVersion: 1,
    digest,
    bindingId: input.binding.bindingId,
    provider: input.binding.provider,
    operationClass: input.operationClass,
    fieldMask: input.fieldMask,
    createdAt: input.createdAt,
    componentDigests,
    revisionEvidence: input.revisionEvidence,
    renderedFields: {
      title: { kind: 'value', value: input.projection.title ?? null },
      description: {
        kind: 'hash',
        digest: semanticDigest(input.projection.description ?? null),
        bytes: Buffer.byteLength(input.projection.description ?? '', 'utf8'),
      },
      priority: { kind: 'value', value: input.projection.priority ?? null },
    },
  };
}

function operationRecord(input: {
  operationId: string;
  metadata: RemoteBindingMetadata;
  state: RemoteBindingState;
  lifecycleOperation: 'refresh' | 'publish' | 'reconcile';
  operationClass: 'update-fields' | null;
  authority: RemoteOperationRecord['authority'];
  approval?: RemoteOperationRecord['approval'];
  previewDigest: string;
  approvalPreview?: PersistedApprovalPreview;
  revisionEvidence?: PersistedApprovalPreview['revisionEvidence'];
  descriptionMode?: 'none' | 'managed-section' | 'replace';
  capabilityEvidenceDigest: string;
  policyDigest: string;
  projectionDigest?: string;
  safetyResultDigest?: string;
  selectedExecution?: HostCapabilityEvidence;
  now: string;
  verification: RemoteOperationRecord['verification'];
}): RemoteOperationRecord {
  return {
    recordType: 'operation',
    schemaVersion: 2,
    operationId: input.operationId,
    correlationId: input.operationId,
    bindingId: input.metadata.bindingId,
    provider: input.metadata.provider,
    providerContext: input.metadata.remoteIdentity.context,
    lifecycleOperation: input.lifecycleOperation,
    operationClass: input.operationClass,
    state: 'pending',
    reason: null,
    lastSafeStep: 'planned',
    preview: {
      digest: input.previewDigest,
      bindingId: input.metadata.bindingId,
      provider: input.metadata.provider,
      providerContext: input.metadata.remoteIdentity.context,
      capabilityEvidenceDigest: input.capabilityEvidenceDigest,
      revisionDigest:
        input.state.snapshot?.revision.contentHash ?? 'unobserved',
      ...(input.revisionEvidence
        ? { revisionEvidence: input.revisionEvidence }
        : {}),
      policyDigest: input.policyDigest,
      ...(input.projectionDigest
        ? {
            projectionDigest: input.projectionDigest,
            safetyResultDigest: input.safetyResultDigest!,
          }
        : {}),
    },
    ...(input.approvalPreview
      ? { approvalPreview: input.approvalPreview }
      : {}),
    ...(input.descriptionMode
      ? { descriptionMode: input.descriptionMode }
      : {}),
    authority: input.authority,
    approval: input.approval ?? null,
    createdAt: input.now,
    updatedAt: input.now,
    selectedExecution: input.selectedExecution
      ? {
          provider: input.selectedExecution.provider,
          surfaceKind: input.selectedExecution.surfaceKind,
          context: input.selectedExecution.context,
          evidenceDigest: input.selectedExecution.evidenceDigest,
          semanticCapabilities: input.selectedExecution.semanticCapabilities,
        }
      : null,
    attempts: [],
    observations: [],
    verification: input.verification,
    retryDisposition: 'safe-before-attempt',
    steps: [],
    outcome: { classification: 'pending', message: null, verifiedAt: null },
  };
}

async function requireBinding(
  bindingId: string | undefined,
  store: RemoteSyncStore,
) {
  if (!bindingId) throw new Error('Remote binding ID is required.');
  const [metadata, state] = await Promise.all([
    store.readBindingMetadata(bindingId),
    store.readBindingState(bindingId),
  ]);
  if (!metadata || !state)
    throw new Error(`Remote binding '${bindingId}' does not exist.`);
  return { metadata, state };
}

async function assertCompleteProjectCreateProvenance(
  state: RemoteBindingState,
  store: RemoteSyncStore,
): Promise<void> {
  const acceptedByOperationId = state.baseline?.acceptedByOperationId;
  if (!acceptedByOperationId) return;
  const originatingOperation = await store.readOperation(acceptedByOperationId);
  const intent = originatingOperation?.createIntent;
  if (
    intent?.target.kind === 'project' &&
    (intent.projectionStatus !== 'complete' ||
      intent.localProjection?.source !== 'explicit-project-publication')
  ) {
    throw new Error(
      'Persisted project create provenance is incomplete; reconcile or repair it before later mutation.',
    );
  }
}

async function requireOperation(operationId: string, store: RemoteSyncStore) {
  const operation = await store.readOperation(operationId);
  if (!operation)
    throw new Error(`Remote operation '${operationId}' does not exist.`);
  return operation;
}

function compactContext(
  context: Readonly<Record<string, string | undefined>>,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(context).filter((entry): entry is [string, string] =>
      Boolean(entry[1]),
    ),
  );
}

function capabilityReference(
  capability: HostCapabilityEvidence,
): NonNullable<RemoteOperationRecord['selectedExecution']> {
  return {
    provider: capability.provider,
    surfaceKind: capability.surfaceKind,
    context: compactContext(capability.context),
    evidenceDigest: capability.evidenceDigest,
    semanticCapabilities: capability.semanticCapabilities,
  };
}

function envelopeFrom(
  request: RemoteCommandRequest,
  operation: RemoteOperationRecord,
  metadata: RemoteBindingMetadata | null,
  action: ExternalActionEnvelope | null,
): RemoteCommandEnvelope {
  const status: RemoteCommandStatus = action
    ? 'pending'
    : operation.outcome.classification === 'verified'
      ? 'ok'
      : operation.outcome.classification;
  return {
    schemaVersion: 1,
    status,
    operation: request.operation,
    projectRoot: request.projectRoot,
    persisted: true,
    results: [
      {
        bindingId: metadata?.bindingId ?? operation.bindingId,
        provider: metadata?.provider ?? operation.provider,
        target:
          metadata?.target.id ?? actionTargetId(action) ?? operation.bindingId,
        status,
        freshness: operation.updatedAt,
        authority: operation.authority?.effective ?? 'read-only',
        diagnosticCode: operation.reason?.code ?? null,
      },
    ],
    externalAction: action,
    recovery: action
      ? [
          {
            code: 'host-observation-required',
            instruction: `Run the semantic action and continue operation ${operation.operationId}.`,
          },
        ]
      : [],
  };
}

function actionTargetId(action: ExternalActionEnvelope | null): string | null {
  const target = action?.intent.localTarget ?? action?.intent.target;
  return target && typeof target === 'object' && 'id' in target
    ? String(target.id)
    : null;
}

async function openRepositoryStore(
  projectRoot: string,
): Promise<RemoteSyncStore> {
  const config = await readOatConfig(projectRoot);
  const stateStorage = config.pjm?.remote?.storage?.state ?? 'local';
  const [{ stdout: commonOutput }, { stdout: originOutput }] =
    await Promise.all([
      execFileAsync('git', ['rev-parse', '--git-common-dir'], {
        cwd: projectRoot,
      }),
      execFileAsync('git', ['config', '--get', 'remote.origin.url'], {
        cwd: projectRoot,
      }).catch(() => ({ stdout: '' })),
    ]);
  const common = commonOutput.trim();
  return new RemoteSyncStore(
    resolveRemoteStorageLocations({
      repoRoot: projectRoot,
      gitCommonDir: isAbsolute(common) ? common : resolve(projectRoot, common),
      repositoryIdentity:
        originOutput.trim() || `local-repository:${resolve(projectRoot)}`,
      stateStorage,
      target: { kind: 'backlog', scope: 'shared', path: null },
    }),
  );
}

async function readJsonStdin(): Promise<unknown> {
  const chunks: Buffer[] = [];
  let bytes = 0;
  for await (const chunk of process.stdin) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    bytes += buffer.length;
    if (bytes > MAX_STDIN_BYTES)
      throw new Error('Observation stdin exceeds the size limit.');
    chunks.push(buffer);
  }
  if (chunks.length === 0) throw new Error('Observation stdin is empty.');
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function resolveInsideProject(
  projectRoot: string,
  relativePath: string,
): string {
  const root = resolve(projectRoot);
  const candidate = resolve(root, relativePath);
  const pathFromRoot = relative(root, candidate);
  if (
    pathFromRoot === '' ||
    pathFromRoot === '..' ||
    pathFromRoot.startsWith(`..${sep}`) ||
    isAbsolute(pathFromRoot)
  ) {
    throw new Error('Remote target path escapes the adopted repository.');
  }
  return candidate;
}

async function writeVerifiedAssociation(
  projectRoot: string,
  intent: Pick<PlannedBindingCreate, 'bindingId' | 'provider' | 'target'>,
  remoteRef: string,
  randomId: string,
): Promise<void> {
  const path = resolveInsideProject(projectRoot, intent.target.path);
  const content = await readFile(path, 'utf8');
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) throw new Error('Association target requires frontmatter.');
  const document = YAML.parseDocument(match[1]!, { uniqueKeys: true });
  if (document.errors.length > 0) {
    throw new Error('Association target frontmatter is invalid.');
  }
  const values = document.toJS() as Record<string, unknown>;
  const existing = parseAssociatedIssues(values.associated_issues);
  const existingBinding = existing.find(
    (entry) =>
      entry.kind === 'reference' && entry.bindingId === intent.bindingId,
  );
  if (existingBinding) {
    if (
      existingBinding.kind === 'reference' &&
      existingBinding.type === intent.provider &&
      existingBinding.ref === remoteRef
    ) {
      return;
    }
    throw new Error(
      `Association for binding '${intent.bindingId}' conflicts with its materialization plan.`,
    );
  }
  const next = materializeBoundAssociation(existing, {
    type: intent.provider,
    ref: remoteRef,
    bindingId: intent.bindingId,
  });
  document.set('associated_issues', serializeAssociatedIssues(next));
  const updated = content.replace(
    match[0],
    `---\n${document.toString().trimEnd()}\n---`,
  );
  const temporary = resolve(
    dirname(path),
    `.${intent.bindingId}.${randomId.replace(/[^A-Za-z0-9_-]/g, '_')}.tmp`,
  );
  try {
    await writeFile(temporary, updated, { encoding: 'utf8', flag: 'wx' });
    await rename(temporary, path);
  } catch (error) {
    await unlink(temporary).catch(() => undefined);
    throw error;
  }
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error;
}

function durableId(prefix: string, value: string): string {
  return `${prefix}_${value.replace(/[^A-Za-z0-9_-]/g, '_')}`;
}
