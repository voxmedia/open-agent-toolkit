import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readFile, rename, unlink, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { promisify } from 'node:util';

import { readOatConfig, writeOatConfig } from '@config/oat-config';
import YAML from 'yaml';

import {
  materializeBoundAssociation,
  parseAssociatedIssues,
  serializeAssociatedIssues,
} from './association';
import { resolveEffectiveRemotePolicy } from './authority';
import {
  acceptExternalObservation,
  buildExternalAction,
  type ExternalActionEnvelope,
} from './external-action';
import {
  parseHostCapabilityEvidence,
  selectHostExecution,
  type HostCapabilityEvidence,
} from './host-execution';
import type { RemoteCommandRequest } from './index';
import { resolveLocalProjection } from './local-projection';
import { assessOutboundProjectionSafety } from './outbound-projection-safety';
import type { RemoteCommandEnvelope, RemoteCommandStatus } from './output';
import { buildBindingPreview } from './preview';
import { semanticDigest } from './provider';
import type {
  PlannedBindingCreate,
  RemoteBindingMetadata,
  RemoteBindingState,
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

export interface ProductionRemoteRunnerDependencies {
  now(): string;
  randomId(): string;
  readObservationStdin(): Promise<unknown>;
}

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
      if (!request.operationId || !request.observationStdin) {
        throw new Error(
          'Operation continuation requires an operation ID and stdin observation.',
        );
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
    context: {},
    intent: { stableId, localTarget: target },
    expectedObservation: {
      fields: ['title', 'description', 'priority', 'status'],
      requireIdentity: true,
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
    providerContext: {},
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
      providerContext: {},
      capabilityEvidenceDigest: 'host-discovery-required',
      revisionDigest: 'unobserved',
      policyDigest: 'read-only',
    },
    authority: null,
    approval: null,
    createdAt: now,
    updatedAt: now,
    selectedExecution: null,
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
  if (!request.storage.apply) {
    const preview = buildSharedStoragePreview({
      repositoryFingerprint: store.locations.repositoryFingerprint,
      configTarget: request.storage.configTarget,
      targetKind: 'repository',
      projectScope: null,
      currentMode: actualMode,
      retainedDataWarning:
        'Sanitized remote content and operation journals will enter Git history.',
      proposedPaths: request.storage.proposedPaths,
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
      configTarget: request.storage.configTarget,
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
      capabilityEvidenceDigest:
        state.capability?.evidenceDigest ?? 'host-discovery-required',
      policyDigest: 'read-only',
      now,
      verification: [],
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
  if (requested.localKind !== 'backlog') {
    throw new Error(
      'Project publication requires an explicit normalized publication projection.',
    );
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

  const target = {
    kind: 'backlog' as const,
    scope: 'shared' as const,
    id: requested.localId,
    path: `.oat/repo/pjm/backlog/items/${requested.localId}.md`,
  };
  const targetPath = resolveInsideProject(request.projectRoot, target.path);
  const content = await readFile(targetPath, 'utf8');
  if (Buffer.byteLength(content, 'utf8') > 1_048_576) {
    throw new Error('Unbound publication source exceeds the size limit.');
  }
  const now = dependencies.now();
  const local = resolveLocalProjection({
    target: { kind: 'backlog', path: target.path, content },
    observedAt: now,
  });
  const projection = {
    title: local.title,
    description: local.description,
    priority: local.priority,
    sourceRevision: local.sourceRevision,
  };
  const safety = assessOutboundProjectionSafety(projection, {
    assessedAt: now,
  });
  if (safety.verdict !== 'safe') {
    throw new Error('Outbound safety evidence blocks unbound publication.');
  }

  const config = await readOatConfig(request.projectRoot);
  const repositoryPolicy = config.pjm?.remote?.policy ?? {
    description: 'none' as const,
    authority: { default: 'read-only' as const },
  };
  const effective = resolveEffectiveRemotePolicy({
    repository: repositoryPolicy,
    provider: repositoryPolicy.providers?.[provider],
    binding: {},
  });
  const authority = effective.authority.create;
  if (authority !== 'user-authorized') {
    throw new Error(
      `Unbound publication requires durable ${authority} evidence before execution.`,
    );
  }

  const operationId = durableId('op', dependencies.randomId());
  const bindingId = durableId('bnd', dependencies.randomId());
  const provenanceToken = `oat-binding:${bindingId}`;
  const policyDigest = semanticDigest(effective);
  const preview = buildBindingPreview({
    binding: { bindingId, provider, purposes: ['planning'] },
    target: {
      stableId: 'unbound',
      context: compactContext(capability.context),
    },
    baseline: null,
    revision: {
      strength: 'hash-only',
      token: null,
      updatedAt: now,
      contentHash: local.sourceRevision,
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
    fieldMask: ['title', 'description', 'priority'],
    createdAt: now,
  });
  const createIntent: PlannedBindingCreate = {
    schemaVersion: 1,
    bindingId,
    operationId,
    provider,
    target,
    publicationProjection: {
      title: 'frontmatter',
      description: 'description-section',
      priority: 'frontmatter',
    },
    providerContext: compactContext(capability.context),
    purposes: ['planning'],
    policyRestrictions: {},
    provenanceToken,
    createdAt: now,
  };
  const action = buildExternalAction({
    operationId,
    stepId: durableId('step', dependencies.randomId()),
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
    },
    persistedPreview: {
      projectionDigest: safety.projectionDigest,
      safetyResultDigest: safety.resultDigest,
    },
    projection,
    outboundSafety: safety,
  });
  const verification = [
    ...Object.entries(projection).map(([field, value]) => ({
      field,
      expectedHash: semanticDigest(value),
      observedHash: null,
      status: 'unavailable' as const,
    })),
    {
      field: 'remoteIdentity',
      expectedHash: 'pending-authoritative-read-back',
      observedHash: null,
      status: 'unavailable' as const,
    },
  ];
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
    state: 'pending',
    reason: null,
    lastSafeStep: 'authorized',
    preview: {
      digest: preview.digest,
      bindingId,
      provider,
      providerContext: compactContext(capability.context),
      capabilityEvidenceDigest: capability.evidenceDigest,
      revisionDigest: local.sourceRevision,
      policyDigest,
      projectionDigest: safety.projectionDigest,
      safetyResultDigest: safety.resultDigest,
    },
    authority: { effective: authority, sourceDigest: policyDigest },
    approval: null,
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
  });
  await store.writeCurrentAction(operationId, action);
  return envelopeFrom(
    request,
    await requireOperation(operationId, store),
    null,
    action,
  );
}

async function prepareMutation(
  request: RemoteCommandRequest,
  store: RemoteSyncStore,
  dependencies: ProductionRemoteRunnerDependencies,
): Promise<RemoteCommandEnvelope> {
  const { metadata, state } = await requireBinding(request.bindingId, store);
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
  if (authority === 'read-only')
    throw new Error('Remote mutation is read-only under current policy.');
  if (authority !== 'user-authorized') {
    throw new Error(
      `Remote mutation requires durable ${authority} evidence before execution.`,
    );
  }
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
  const projection = {
    title: state.localProjection.title,
    description: state.localProjection.description,
    priority: state.localProjection.priority,
    sourceRevision: state.localProjection.sourceRevision,
  };
  const now = dependencies.now();
  const safety = assessOutboundProjectionSafety(projection, {
    assessedAt: now,
  });
  const operationId = durableId('op', dependencies.randomId());
  const policyDigest = semanticDigest(effective);
  const preview = buildBindingPreview({
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
    fieldMask: ['title', 'description', 'priority'],
    createdAt: now,
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
  await store.createOperation(
    operationRecord({
      operationId,
      metadata,
      state,
      lifecycleOperation:
        request.operation === 'reconcile' ? 'reconcile' : 'publish',
      operationClass: 'update-fields',
      authority: { effective: authority, sourceDigest: policyDigest },
      previewDigest: preview.digest,
      capabilityEvidenceDigest: selection.evidence.evidenceDigest,
      policyDigest,
      projectionDigest: safety.projectionDigest,
      safetyResultDigest: safety.resultDigest,
      selectedExecution: selection.evidence,
      now,
      verification,
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

async function continueOperation(
  request: RemoteCommandRequest,
  store: RemoteSyncStore,
  dependencies: ProductionRemoteRunnerDependencies,
): Promise<RemoteCommandEnvelope> {
  const operation = await requireOperation(request.operationId!, store);
  let metadata = await store.readBindingMetadata(operation.bindingId);
  if (
    !metadata &&
    operation.lifecycleOperation !== 'intake' &&
    !operation.createIntent
  )
    throw new Error(`Remote binding '${operation.bindingId}' does not exist.`);
  const action = await store.readCurrentAction(operation.operationId);
  if (!action)
    throw new Error(
      `Remote operation '${operation.operationId}' has no durable current action.`,
    );
  const observation = acceptExternalObservation({
    action,
    observation: await dependencies.readObservationStdin(),
  });
  const now = dependencies.now();
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
        fields: operation.verification
          .map((item) => item.field)
          .filter((field) => field !== 'remoteIdentity'),
        requireIdentity: true,
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
      },
    );
    await store.writeCurrentAction(operation.operationId, readAction);
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
    const snapshot = sanitizeRemoteSnapshot({
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
      lifecycle: 'active',
    });
    await store.materializeIntakeBinding(metadata);
    await store.writeBindingState({
      recordType: 'binding-state',
      schemaVersion: 2,
      bindingId: operation.bindingId,
      provider: operation.provider,
      metadataUpdatedAt: now,
      localProjection: {
        title: snapshot.issue.title,
        description: snapshot.issue.description,
        priority: snapshot.issue.priority,
        source: 'backlog-description',
        sourceRevision: observation.outcome.revisionDigest,
        observedAt: observation.observedAt,
      },
      snapshot,
      baseline: null,
      capability: null,
      contentRedacted: snapshot.contentRedacted,
      lifecycle: 'active',
      lifecycleCondition: 'active',
      activeOperationIds: [],
      createdAt: now,
      updatedAt: now,
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
    const snapshot = sanitizeRemoteSnapshot({
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
      lifecycle: 'active',
    });
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
  const updated = await store.transitionOperation(
    operation.operationId,
    operation.state,
    {
      state: verified ? 'verified' : 'uncertain',
      updatedAt: now,
      verification,
      outcome: {
        classification: verified ? 'verified' : 'uncertain',
        message: verified
          ? 'authoritative read-back verified'
          : 'authoritative read-back mismatch',
        verifiedAt: verified ? now : null,
      },
    },
  );
  if (verified && operation.createIntent) {
    if (!observation.outcome.identity || !observation.outcome.revisionDigest) {
      throw new Error('Create read-back lacks durable identity evidence.');
    }
    const intent = operation.createIntent;
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
    await store.materializeVerifiedBinding(operation.operationId, metadata, {
      provider: intent.provider,
      stableId: observation.outcome.identity.stableId,
      verifiedAt: now,
      evidenceDigest: identityEvidence!,
    });
    await store.writeBindingState({
      recordType: 'binding-state',
      schemaVersion: 2,
      bindingId: intent.bindingId,
      provider: intent.provider,
      metadataUpdatedAt: now,
      localProjection: {
        title: String(observation.outcome.fields.title ?? ''),
        description:
          observation.outcome.fields.description == null
            ? null
            : String(observation.outcome.fields.description),
        priority:
          observation.outcome.fields.priority == null
            ? null
            : String(observation.outcome.fields.priority),
        source: 'backlog-description',
        sourceRevision: String(
          observation.outcome.fields.sourceRevision ??
            observation.outcome.revisionDigest,
        ),
        observedAt: observation.observedAt,
      },
      snapshot: null,
      baseline: null,
      capability: null,
      contentRedacted: false,
      lifecycle: 'active',
      lifecycleCondition: 'active',
      activeOperationIds: [],
      createdAt: now,
      updatedAt: now,
    });
    await writeVerifiedAssociation(
      request.projectRoot,
      intent,
      observation.outcome.identity.aliases[0] ??
        observation.outcome.identity.stableId,
      dependencies.randomId(),
    );
  }
  return envelopeFrom(request, updated, metadata, null);
}

async function continueMutationPreRead(
  request: RemoteCommandRequest,
  operation: RemoteOperationRecord,
  metadata: RemoteBindingMetadata,
  observation: ReturnType<typeof acceptExternalObservation>,
  store: RemoteSyncStore,
  dependencies: ProductionRemoteRunnerDependencies,
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
  if (metadata.target.kind !== 'backlog') {
    throw new Error(
      'Project mutation requires an explicit normalized publication projection.',
    );
  }
  const targetPath = resolveInsideProject(
    request.projectRoot,
    metadata.target.path,
  );
  const content = await readFile(targetPath, 'utf8');
  if (Buffer.byteLength(content, 'utf8') > 1_048_576) {
    throw new Error('Mutation projection source exceeds the size limit.');
  }
  const local = resolveLocalProjection({
    target: {
      kind: 'backlog',
      path: metadata.target.path,
      content,
    },
    observedAt: operation.createdAt,
  });
  const projection = {
    title: local.title,
    description: local.description,
    priority: local.priority,
    sourceRevision: local.sourceRevision,
  };
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
    policyDigest !== operation.authority.sourceDigest ||
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
  const preview = buildBindingPreview({
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
    revision: state.snapshot!.revision,
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
    fieldMask: ['title', 'description', 'priority'],
    createdAt: operation.createdAt,
  });
  if (preview.digest !== operation.preview.digest) {
    throw new Error('Mutation preview drifted after authoritative pre-read.');
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
    },
    persistedPreview: {
      projectionDigest: safety.projectionDigest,
      safetyResultDigest: safety.resultDigest,
    },
    projection,
    outboundSafety: safety,
  });
  const updated = await store.transitionOperation(
    operation.operationId,
    operation.state,
    {
      state: 'authorized',
      updatedAt: dependencies.now(),
      outcome: {
        classification: 'pending',
        message: 'authoritative pre-read verified',
        verifiedAt: null,
      },
    },
  );
  await store.writeCurrentAction(operation.operationId, action);
  return envelopeFrom(request, updated, metadata, action);
}

function operationRecord(input: {
  operationId: string;
  metadata: RemoteBindingMetadata;
  state: RemoteBindingState;
  lifecycleOperation: 'refresh' | 'publish' | 'reconcile';
  operationClass: 'update-fields' | null;
  authority: RemoteOperationRecord['authority'];
  previewDigest: string;
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
      policyDigest: input.policyDigest,
      ...(input.projectionDigest
        ? {
            projectionDigest: input.projectionDigest,
            safetyResultDigest: input.safetyResultDigest!,
          }
        : {}),
    },
    authority: input.authority,
    approval: null,
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
  intent: PlannedBindingCreate,
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
  const next = materializeBoundAssociation(
    parseAssociatedIssues(values.associated_issues),
    {
      type: intent.provider,
      ref: remoteRef,
      bindingId: intent.bindingId,
    },
  );
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

function durableId(prefix: string, value: string): string {
  return `${prefix}_${value.replace(/[^A-Za-z0-9_-]/g, '_')}`;
}
