import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import {
  mkdir,
  readFile,
  readdir,
  rename,
  unlink,
  writeFile,
} from 'node:fs/promises';
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
import { reduceReviewedBatchOutcomes, resumeReviewedBatch } from './batch';
import {
  closeoutBindings,
  type CloseoutJournal,
  type CloseoutStore,
} from './closeout';
import {
  acceptRemoteDiscussionObservation,
  readRemoteDiscussion,
} from './discussion';
import { runRemoteDoctorChecks } from './doctor';
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
import { migrateRemoteAssociations } from './migrate';
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
  | 'after-resolution-observation-journal'
  | 'after-resolution-action-pointer'
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
    if (request.operation === 'closeout') {
      return prepareCloseout(request, store, dependencies);
    }
    if (request.operation === 'discussion') {
      return prepareDiscussion(request, store, dependencies);
    }
    if (request.operation === 'resolve') {
      return prepareResolution(request, store, dependencies);
    }
    if (request.operation === 'doctor') {
      return runProductionDoctor(request, store, dependencies);
    }
    if (request.operation === 'migrate') {
      return runProductionMigration(request, store, dependencies);
    }
    if (request.operation === 'storage-transition') {
      return runSharedStorage(request, store, dependencies);
    }
    return assertNeverRemoteOperation(request.operation);
  };
}

async function prepareCloseout(
  request: RemoteCommandRequest,
  store: RemoteSyncStore,
  dependencies: ProductionRemoteRunnerDependencies,
): Promise<RemoteCommandEnvelope> {
  if (!request.projectPath) {
    throw new Error('Closeout requires an explicit local project path.');
  }
  const metadata = (await store.listBindingMetadata()).filter(
    (binding) =>
      binding.target.kind === 'project' &&
      (binding.target.id === request.projectPath ||
        binding.target.path === request.projectPath),
  );
  const eligible = metadata.filter((binding) =>
    binding.purposes.some((purpose) =>
      ['source', 'planning'].includes(purpose),
    ),
  );
  if (eligible.length === 0) {
    return emptyPersistedEnvelope(request, 'ok');
  }

  if (request.previewOperationId) {
    return applyCloseoutBatch(request, eligible, store, dependencies);
  }
  if (!request.capabilityEvidenceStdin) {
    throw new Error(
      'Closeout preview requires current host capability evidence.',
    );
  }
  const capabilityInput = await dependencies.readObservationStdin();
  const capabilities = (
    Array.isArray(capabilityInput) ? capabilityInput : [capabilityInput]
  ).map(parseHostCapabilityEvidence);

  const config = await readOatConfig(request.projectRoot);
  const repositoryPolicy = config.pjm?.remote?.policy ?? {
    description: 'none' as const,
    authority: { default: 'read-only' as const },
  };
  const now = dependencies.now();
  const byBindingId = new Map(
    eligible.map((binding) => [binding.bindingId, binding]),
  );
  const batchId = durableId('batch', dependencies.randomId());
  const actionByStep = new Map<string, ExternalActionEnvelope>();
  const capabilityByOperation = new Map<string, HostCapabilityEvidence>();
  const plans = eligible.map((binding) => {
    const effective = resolveEffectiveRemotePolicy({
      repository: repositoryPolicy,
      provider: repositoryPolicy.providers?.[binding.provider],
      binding: binding.policyRestrictions,
    });
    const sourceDigest = semanticDigest(effective);
    const operationId = durableId('op', dependencies.randomId());
    const step = (kind: 'annotation' | 'transition') => {
      const semanticOperation =
        kind === 'annotation' ? 'annotate' : 'transition';
      const selection = selectHostExecution({
        provider: binding.provider,
        context: binding.remoteIdentity.context,
        operation: semanticOperation,
        candidates: capabilities,
        attemptStarted: false,
      });
      if (!selection.selected) {
        throw new Error(`No current closeout capability: ${selection.reason}.`);
      }
      const pinned = capabilityByOperation.get(operationId);
      if (
        pinned &&
        pinned.evidenceDigest !== selection.evidence.evidenceDigest
      ) {
        throw new Error(
          'Composite closeout substeps selected inconsistent host capability evidence.',
        );
      }
      capabilityByOperation.set(operationId, selection.evidence);
      const stepId = `${operationId}_${kind}`;
      const intent =
        kind === 'annotation'
          ? {
              stableId: binding.remoteIdentity.stableId,
              body: `OAT closeout recorded for project ${binding.target.id}.`,
            }
          : {
              stableId: binding.remoteIdentity.stableId,
              transition: 'completed',
            };
      const projection: OutboundProjection =
        kind === 'annotation'
          ? { annotation: intent.body }
          : { status: intent.transition };
      const safety = assessOutboundProjectionSafety(projection, {
        assessedAt: now,
      });
      const action = buildExternalAction({
        operationId,
        stepId,
        provider: binding.provider,
        semanticOperation,
        context: binding.remoteIdentity.context,
        intent,
        expectedObservation: {
          fields: Object.keys(projection),
          requireIdentity: true,
          stableId: binding.remoteIdentity.stableId,
          capabilityEvidenceDigest: selection.evidence.evidenceDigest,
        },
        persistedPreview: {
          projectionDigest: safety.projectionDigest,
          safetyResultDigest: safety.resultDigest,
        },
        projection,
        outboundSafety: safety,
      });
      actionByStep.set(stepId, action);
      return {
        authority: effective.authority[semanticOperation],
        sourceDigest,
        previewDigest: semanticDigest({
          actionDigest: action.actionDigest,
          capabilityEvidenceDigest: selection.evidence.evidenceDigest,
          projectionDigest: safety.projectionDigest,
          safetyResultDigest: safety.resultDigest,
          sourceDigest,
        }),
      };
    };
    return {
      bindingId: binding.bindingId,
      operationId,
      provider: binding.provider,
      purposes: binding.purposes,
      ...(binding.purposes.some((purpose) =>
        ['source', 'planning'].includes(purpose),
      )
        ? { annotation: step('annotation') }
        : {}),
      ...(binding.purposes.includes('planning')
        ? { transition: step('transition') }
        : {}),
    };
  });
  const bridge: CloseoutStore = {
    async readOperation(operationId) {
      return closeoutJournalFromRecord(
        await store.readOperation(operationId),
        request.projectPath!,
      );
    },
    async writeOperation(journal) {
      const existing = await store.readOperation(journal.operationId);
      if (existing) return;
      const binding = byBindingId.get(journal.bindingId);
      if (!binding) {
        throw new Error(
          `Closeout binding '${journal.bindingId}' left the reviewed set.`,
        );
      }
      const state = await store.readBindingState(journal.bindingId);
      await store.createOperation(
        closeoutRecordFromJournal(
          journal,
          binding,
          state,
          batchId,
          capabilityByOperation.get(journal.operationId)!,
          actionByStep,
        ),
      );
    },
    async writeBatch(batch) {
      await store.createBatch(batch);
    },
  };
  const closeout = await closeoutBindings(
    {
      batchId,
      projectPath: request.projectPath,
      plans,
      now,
    },
    bridge,
  );
  for (const action of actionByStep.values()) {
    await store.writeActionEvidence(action.operationId, action);
  }
  const status = batchStatus(closeout.batch.state);
  const nextReview = (
    await Promise.all(
      closeout.operations.map((candidate) =>
        store.readOperation(candidate.operationId),
      ),
    )
  )
    .filter((candidate): candidate is RemoteOperationRecord => !!candidate)
    .flatMap((candidate) =>
      candidate.steps.map((step) => ({ operation: candidate, step })),
    )
    .find(({ step }) => step.state === 'planned' || step.state === 'pending');
  return {
    schemaVersion: 1,
    status,
    operation: request.operation,
    projectRoot: request.projectRoot,
    persisted: true,
    results: closeout.operations.map((operation) => {
      const binding = byBindingId.get(operation.bindingId)!;
      return {
        bindingId: binding.bindingId,
        provider: binding.provider,
        target: binding.target.id,
        status: operationStatus(operation.state),
        freshness: operation.updatedAt,
        authority: strictestCloseoutAuthority(operation),
        diagnosticCode:
          operation.state === 'blocked' ? 'closeout-blocked' : null,
      };
    }),
    externalAction: null,
    ...(nextReview?.step.approvalPreview
      ? {
          approvalPreview: publicApprovalPreview(
            nextReview.operation.operationId,
            nextReview.step.approvalPreview,
            nextReview.step.authority.effective,
            nextReview.step.authority.sourceDigest,
            nextReview.operation.preview.revisionDigest,
          ),
        }
      : {}),
    recovery:
      status === 'needs-review'
        ? closeout.operations.flatMap((operation) => {
            const next = operation.substeps.find(
              (step) => step.state === 'planned' || step.state === 'pending',
            );
            return next
              ? [
                  {
                    code: 'fresh-approval-required',
                    instruction: (() => {
                      const action = actionByStep.get(next.stepId)!;
                      return `Approve exact ${next.kind} preview ${next.previewDigest} in closeout batch ${closeout.batch.batchId}; target=${semanticDigest(action.intent)} capability=${action.expectedObservation.capabilityEvidenceDigest} policy=${next.authoritySourceDigest} projection=${action.outboundSafety?.projectionDigest ?? 'none'} safety=${action.outboundSafety?.resultDigest ?? 'none'} action=${action.actionDigest}; apply one substep at a time.`;
                    })(),
                  },
                ]
              : [];
          })
        : [],
  };
}

async function applyCloseoutBatch(
  request: RemoteCommandRequest,
  eligible: readonly RemoteBindingMetadata[],
  store: RemoteSyncStore,
  dependencies: ProductionRemoteRunnerDependencies,
): Promise<RemoteCommandEnvelope> {
  const batch = await store.readBatch(request.previewOperationId!);
  if (!batch || batch.lifecycleOperation !== 'closeout') {
    throw new Error('Closeout apply requires an existing closeout batch.');
  }
  const operations = await Promise.all(
    batch.members.map((member) => requireOperation(member.operationId, store)),
  );
  resumeReviewedBatch(
    batch,
    operations.map((operation) => ({
      bindingId: operation.bindingId,
      operationId: operation.operationId,
      bindingPreviewDigest: operation.preview.digest,
    })),
  );
  const operation = operations.find((candidate) =>
    candidate.steps.some((step) => step.state === 'planned'),
  );
  if (!operation) {
    return {
      ...emptyPersistedEnvelope(
        request,
        batch.state === 'complete' ? 'ok' : 'blocked',
      ),
      results: operations.map((item) => ({
        bindingId: item.bindingId,
        provider: item.provider,
        target:
          eligible.find((binding) => binding.bindingId === item.bindingId)
            ?.target.id ?? item.bindingId,
        status: operationStatus(item.state),
        freshness: item.updatedAt,
        authority: 'composite',
        diagnosticCode: item.reason?.code ?? null,
      })),
    };
  }
  const step = operation.steps.find(
    (candidate) =>
      candidate.state === 'planned' &&
      (candidate.semanticOperation !== 'transition' ||
        operation.steps
          .filter((item) => item.semanticOperation === 'annotate')
          .every((item) => item.state === 'verified')),
  );
  if (!step) {
    throw new Error('Closeout has no dependency-safe substep to apply.');
  }
  if (!request.capabilityEvidenceStdin) {
    throw new Error(
      'Closeout apply requires current host capability evidence.',
    );
  }
  const capability = parseHostCapabilityEvidence(
    await dependencies.readObservationStdin(),
  );
  const selection = selectHostExecution({
    provider: operation.provider,
    context: operation.providerContext,
    operation: step.semanticOperation as 'annotate' | 'transition',
    candidates: [capability],
    attemptStarted: false,
  });
  if (
    !selection.selected ||
    capability.evidenceDigest !== operation.selectedExecution?.evidenceDigest
  ) {
    throw new Error(
      'Closeout capability does not match the pinned composite preview.',
    );
  }
  const action = await store.readAction(operation.operationId, step.stepId);
  if (!action || action.actionDigest !== step.actionDigest) {
    throw new Error('Closeout exact reviewed action is missing or mismatched.');
  }
  const metadata = eligible.find(
    (binding) => binding.bindingId === operation.bindingId,
  );
  if (!metadata) throw new Error('Closeout binding left the reviewed set.');
  const state = await store.readBindingState(metadata.bindingId);
  if (!state) throw new Error('Closeout binding state is missing.');
  const invocation = await readCurrentMutationInvocation(request);
  const authority = validateProductionMutationAuthority({
    effective: step.authority.effective,
    invocation,
    preview: persistedBindingPreview(
      step.approvalPreview ??
        (() => {
          throw new Error(
            'Closeout substep lacks its persisted approval preview.',
          );
        })(),
    ),
    expected: {
      operationClass: step.semanticOperation,
      targetId: operation.bindingId,
      workflowId: metadata.target.id,
      workflowRevision: state.localProjection.sourceRevision,
    },
    now: dependencies.now(),
    approvalMaxAgeMs: 300_000,
  });
  const updatedStep = {
    ...step,
    state: 'attempt-started' as const,
    approval: authority.approval
      ? {
          previewDigest: authority.approval.previewDigest,
          approvedAt: authority.approval.approvedAt,
          source: authority.approval.source,
        }
      : null,
    attempts: [...step.attempts, action.actionDigest],
    retryDisposition: 'reconcile-required' as const,
  };
  const now = dependencies.now();
  const updated: RemoteOperationRecord = {
    ...operation,
    state: 'attempt-started',
    updatedAt: now,
    steps: operation.steps.map((candidate) =>
      candidate.stepId === step.stepId ? updatedStep : candidate,
    ),
    attempts: [
      ...operation.attempts,
      {
        attemptId: action.stepId,
        startedAt: now,
        completedAt: null,
        execution: capabilityReference(capability),
        requestDigest: action.actionDigest,
        receiptDigest: null,
      },
    ],
    retryDisposition: 'reconcile-required',
  };
  await store.updateOperation(updated);
  await store.writeCurrentAction(operation.operationId, action);
  await store.updateBatch(
    reduceReviewedBatchOutcomes(
      batch,
      { [operation.operationId]: 'attempt-started' },
      now,
    ),
  );
  return envelopeFrom(request, updated, metadata, action);
}

function closeoutStepApprovalPreview(
  operation: RemoteOperationRecord,
  step: RemoteOperationRecord['steps'][number],
  action: ExternalActionEnvelope,
): PersistedApprovalPreview {
  const revisionEvidence = operation.preview.revisionEvidence;
  if (!revisionEvidence) {
    throw new Error('Closeout substep lacks revision freshness evidence.');
  }
  const digest = (component: string) =>
    semanticDigest({
      operationId: operation.operationId,
      stepId: step.stepId,
      component,
    });
  return {
    schemaVersion: 1,
    digest: step.previewDigest,
    bindingId: operation.bindingId,
    provider: operation.provider,
    operationClass: step.semanticOperation,
    fieldMask: ['title'],
    createdAt: operation.createdAt,
    componentDigests: {
      target: semanticDigest(action.intent),
      baseline: digest('baseline'),
      revision: operation.preview.revisionDigest,
      capability: operation.preview.capabilityEvidenceDigest,
      policy: operation.preview.policyDigest,
      projection:
        action.outboundSafety?.projectionDigest ??
        operation.preview.projectionDigest ??
        digest('projection'),
      outboundSafety:
        action.outboundSafety?.resultDigest ??
        operation.preview.safetyResultDigest ??
        digest('outbound-safety'),
    },
    renderedFields: {
      title: {
        kind: 'hash',
        digest: semanticDigest(action.intent),
        bytes: Buffer.byteLength(JSON.stringify(action.intent), 'utf8'),
      },
      description: { kind: 'value', value: null },
      priority: { kind: 'value', value: null },
    },
    revisionEvidence,
  };
}

async function prepareDiscussion(
  request: RemoteCommandRequest,
  store: RemoteSyncStore,
  dependencies: ProductionRemoteRunnerDependencies,
): Promise<RemoteCommandEnvelope> {
  const { metadata } = await requireBinding(request.bindingId, store);
  if (request.capabilityEvidenceStdin) {
    const capability = parseHostCapabilityEvidence(
      await dependencies.readObservationStdin(),
    );
    const selection = selectHostExecution({
      provider: metadata.provider,
      context: metadata.remoteIdentity.context,
      operation: 'read-discussion',
      candidates: [capability],
      attemptStarted: false,
    });
    if (!selection.selected) {
      return unavailableDiscussionEnvelope(
        request,
        metadata,
        dependencies.now(),
        selection.reason,
      );
    }
    const now = dependencies.now();
    const operationId = durableId('op', dependencies.randomId());
    const action = buildExternalAction({
      operationId,
      stepId: durableId('discussion', dependencies.randomId()),
      provider: metadata.provider,
      semanticOperation: 'read-discussion',
      context: metadata.remoteIdentity.context,
      intent: {
        stableId: metadata.remoteIdentity.stableId,
        limit: request.discussionLimit ?? 0,
      },
      expectedObservation: {
        fields: [],
        requireIdentity: false,
        stableId: metadata.remoteIdentity.stableId,
        capabilityEvidenceDigest: capability.evidenceDigest,
      },
      persistedPreview: {},
    });
    await store.createOperation({
      recordType: 'operation',
      schemaVersion: 2,
      operationId,
      correlationId: operationId,
      bindingId: metadata.bindingId,
      provider: metadata.provider,
      providerContext: metadata.remoteIdentity.context,
      lifecycleOperation: 'discussion',
      operationClass: null,
      state: 'pending',
      reason: {
        code: `discussion-limit-${request.discussionLimit ?? 0}-remaining-${request.discussionLimit ?? 0}-pages-0`,
        message: 'Bounded non-persistent discussion read.',
      },
      lastSafeStep: 'planned',
      preview: {
        digest: semanticDigest({
          actionDigest: action.actionDigest,
          bindingId: metadata.bindingId,
          limit: request.discussionLimit,
        }),
        bindingId: metadata.bindingId,
        provider: metadata.provider,
        providerContext: metadata.remoteIdentity.context,
        capabilityEvidenceDigest: capability.evidenceDigest,
        revisionDigest: 'non-persistent-evidence',
        policyDigest: 'read-only',
      },
      authority: null,
      approval: null,
      createdAt: now,
      updatedAt: now,
      selectedExecution: capabilityReference(capability),
      attempts: [],
      observations: [],
      verification: [],
      retryDisposition: 'safe-before-attempt',
      steps: [],
      outcome: {
        classification: 'pending',
        message: 'bounded discussion observation required',
        verifiedAt: null,
      },
    });
    await store.writeCurrentAction(operationId, action);
    return {
      ...envelopeFrom(
        request,
        (await store.readOperation(operationId))!,
        metadata,
        action,
      ),
      recovery: [
        {
          code: 'host-observation-required',
          instruction: `Run the bounded discussion action and continue operation ${operationId}.`,
        },
      ],
    };
  }
  const evidence = await readRemoteDiscussion(
    {
      bindingId: metadata.bindingId,
      limit: request.discussionLimit ?? 0,
      maxPages: 10,
      observedAt: dependencies.now(),
    },
    null,
  );
  return {
    ...unavailableDiscussionEnvelope(
      request,
      metadata,
      evidence.observedAt,
      'unavailable',
    ),
    discussionEvidence: evidence,
  };
}

function unavailableDiscussionEnvelope(
  request: RemoteCommandRequest,
  metadata: RemoteBindingMetadata,
  observedAt: string,
  reason: string,
): RemoteCommandEnvelope {
  return {
    schemaVersion: 1,
    status: 'blocked',
    operation: request.operation,
    projectRoot: request.projectRoot,
    persisted: false,
    results: [
      {
        bindingId: metadata.bindingId,
        provider: metadata.provider,
        target: metadata.target.id,
        status: 'blocked',
        freshness: observedAt,
        authority: 'read-only',
        diagnosticCode: 'discussion-capability-unavailable',
      },
    ],
    externalAction: null,
    recovery: [
      {
        code: 'live-host-service-required',
        instruction: `Current provider-neutral discussion capability is ${reason}.`,
      },
    ],
  };
}

async function prepareResolution(
  request: RemoteCommandRequest,
  store: RemoteSyncStore,
  dependencies: ProductionRemoteRunnerDependencies,
): Promise<RemoteCommandEnvelope> {
  const { metadata, state } = await requireBinding(request.bindingId, store);
  if (!request.resolutionKind) {
    throw new Error('Resolution requires an explicit resolution kind.');
  }
  if (request.previewOperationId) {
    const preview = await requireOperation(request.previewOperationId, store);
    if (
      preview.bindingId !== metadata.bindingId ||
      preview.lifecycleOperation !== request.resolutionKind
    ) {
      throw new Error(
        'Resolution preview does not match this binding and kind.',
      );
    }
    return applyResolutionPreview(
      request,
      metadata,
      state,
      preview,
      store,
      dependencies,
    );
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
  const now = dependencies.now();
  const resolutionAction = await resolveCurrentResolutionAction(
    request,
    metadata,
    state,
    dependencies,
  );
  const operationId = durableId('op', dependencies.randomId());
  const operationWithoutApproval: RemoteOperationRecord = {
    recordType: 'operation',
    schemaVersion: 2,
    operationId,
    correlationId: operationId,
    bindingId: metadata.bindingId,
    provider: metadata.provider,
    providerContext: metadata.remoteIdentity.context,
    lifecycleOperation: request.resolutionKind,
    operationClass: request.resolutionKind,
    state: 'planned',
    reason: {
      code: 'fresh-approval-and-evidence-required',
      message:
        'Resolution preview requires fresh approval and verified replacement evidence before mutation.',
    },
    lastSafeStep: 'planned',
    preview: {
      digest: 'pending-resolution-preview',
      bindingId: metadata.bindingId,
      provider: metadata.provider,
      providerContext: metadata.remoteIdentity.context,
      capabilityEvidenceDigest: resolutionAction.capabilityEvidenceDigest,
      revisionDigest: state.snapshot?.revision.contentHash ?? 'unobserved',
      revisionEvidence: revisionEvidenceFromState(state),
      policyDigest: semanticDigest(
        resolutionPolicyEvidence(effective, metadata, request.resolutionKind),
      ),
    },
    authority: {
      effective: effective.authority[request.resolutionKind],
      sourceDigest: semanticDigest(effective.authorityTrace),
    },
    approval: null,
    createdAt: now,
    updatedAt: now,
    selectedExecution: resolutionAction.selectedExecution,
    attempts: [],
    observations: [],
    verification: [],
    retryDisposition: 'safe-before-attempt',
    steps: [],
    outcome: {
      classification: 'pending',
      message: 'fresh approval and verified evidence required',
      verifiedAt: null,
    },
  };
  const approvalPreview = resolutionApprovalPreview(
    operationWithoutApproval,
    metadata,
    state,
    request.providerRef,
  );
  const operation: RemoteOperationRecord = {
    ...operationWithoutApproval,
    preview: {
      ...operationWithoutApproval.preview,
      digest: approvalPreview.digest,
    },
    approvalPreview,
  };
  await store.createOperation(operation);
  return resolutionPreviewEnvelope(request, metadata, operation);
}

async function applyResolutionPreview(
  request: RemoteCommandRequest,
  metadata: RemoteBindingMetadata,
  state: RemoteBindingState,
  operation: RemoteOperationRecord,
  store: RemoteSyncStore,
  dependencies: ProductionRemoteRunnerDependencies,
): Promise<RemoteCommandEnvelope> {
  const pendingCreate =
    operation.lifecycleOperation === 'recreate' &&
    operation.reason?.code === 'recreate-create-approval-required';
  if (pendingCreate) {
    const action = await store.readAction(
      operation.operationId,
      `${operation.operationId}_create`,
    );
    if (!action) {
      throw new Error(
        'Recreate create-substep action is missing or mismatched.',
      );
    }
    const effective = await effectivePolicyForBinding(
      request.projectRoot,
      metadata,
    );
    const policyEvidence = resolutionPolicyEvidence(
      effective,
      metadata,
      'recreate',
    );
    const projection = planRecreateNewRecordProjection({
      metadata,
      state,
      descriptionMode: effective.description,
      priorityMapping: resolveRecreatePriorityPolicy(metadata).enabled,
    });
    const assessedAt = operation.approvalPreview?.createdAt;
    if (!assessedAt) {
      throw new Error('Recreate create-substep safety evidence is missing.');
    }
    const safety = assessOutboundProjectionSafety(projection, { assessedAt });
    const currentPreimage = resolutionCreatePreimage(metadata, state);
    const expectedPreviewDigest = semanticDigest({
      bindingId: metadata.bindingId,
      target: metadata.target,
      policyDigest: semanticDigest(policyEvidence),
      projectionDigest: safety.projectionDigest,
      safetyResultDigest: safety.resultDigest,
      capabilityEvidenceDigest: operation.selectedExecution!.evidenceDigest,
      provenanceToken: metadata.provenanceToken,
      preimage: semanticDigest(currentPreimage),
    });
    const expectedPreview: RemoteOperationRecord['preview'] = {
      ...operation.preview,
      digest: expectedPreviewDigest,
      revisionDigest: state.snapshot?.revision.contentHash ?? 'unobserved',
      revisionEvidence: revisionEvidenceFromState(state),
      policyDigest: semanticDigest(policyEvidence),
      projectionDigest: safety.projectionDigest,
      safetyResultDigest: safety.resultDigest,
    };
    const expectedOperation = {
      ...operation,
      preview: expectedPreview,
      descriptionMode: effective.description,
    };
    const expectedApprovalPreview = resolutionCreateApprovalPreview(
      expectedOperation,
      action,
    );
    if (
      !isDeepStrictEqual(action.intent.fields, projection) ||
      action.outboundSafety?.projectionDigest !== safety.projectionDigest ||
      action.outboundSafety.resultDigest !== safety.resultDigest ||
      !isDeepStrictEqual(operation.preview, expectedPreview) ||
      operation.descriptionMode !== effective.description ||
      !isDeepStrictEqual(operation.approvalPreview, expectedApprovalPreview)
    ) {
      throw new Error(
        'Recreate create-substep policy, projection, safety, or binding preimage drifted.',
      );
    }
    const invocation = await readCurrentMutationInvocation(request);
    const authority = validateProductionMutationAuthority({
      effective: operation.authority!.effective,
      invocation,
      preview: persistedBindingPreview(operation.approvalPreview!),
      expected: {
        operationClass: 'recreate',
        targetId: metadata.bindingId,
        workflowId: metadata.target.id,
        workflowRevision: state.localProjection.sourceRevision,
      },
      now: dependencies.now(),
      approvalMaxAgeMs: 300_000,
    });
    const now = dependencies.now();
    const updated: RemoteOperationRecord = {
      ...operation,
      state: 'attempt-started',
      approval: authority.approval,
      updatedAt: now,
      reason: {
        code: 'recreate-create-attempt-started',
        message: 'Approved create substep handed off exactly once.',
      },
      attempts: [
        ...operation.attempts,
        {
          attemptId: action.stepId,
          startedAt: now,
          completedAt: null,
          execution: operation.selectedExecution!,
          requestDigest: action.actionDigest,
          receiptDigest: null,
        },
      ],
      retryDisposition: 'reconcile-required',
    };
    await store.updateOperation(updated);
    await store.writeCurrentAction(operation.operationId, action);
    return envelopeFrom(request, updated, metadata, action);
  }
  const persistedBindingTransition = operation.verification.some(
    (entry) =>
      entry.field === 'binding-transition' && entry.status === 'verified',
  );
  const effective = await effectivePolicyForBinding(
    request.projectRoot,
    metadata,
  );
  const lifecycleOperation = operation.lifecycleOperation as
    | 'relink'
    | 'detach'
    | 'recreate';
  const currentResolutionAction = await resolveCurrentResolutionAction(
    request,
    metadata,
    state,
    dependencies,
  );
  const expectedAuthority: NonNullable<RemoteOperationRecord['authority']> = {
    effective: effective.authority[lifecycleOperation],
    sourceDigest: semanticDigest(effective.authorityTrace),
  };
  const expectedPreviewInputs: RemoteOperationRecord['preview'] = {
    ...operation.preview,
    capabilityEvidenceDigest: currentResolutionAction.capabilityEvidenceDigest,
    revisionDigest: state.snapshot?.revision.contentHash ?? 'unobserved',
    revisionEvidence: revisionEvidenceFromState(state),
    policyDigest: semanticDigest(
      resolutionPolicyEvidence(effective, metadata, lifecycleOperation),
    ),
  };
  const expectedOperationInputs: RemoteOperationRecord = {
    ...operation,
    preview: expectedPreviewInputs,
    authority: expectedAuthority,
    selectedExecution: currentResolutionAction.selectedExecution,
  };
  const expectedApprovalPreview = resolutionApprovalPreview(
    expectedOperationInputs,
    metadata,
    state,
    request.providerRef,
  );
  const expectedPreview: RemoteOperationRecord['preview'] = {
    ...expectedPreviewInputs,
    digest: expectedApprovalPreview.digest,
  };
  if (
    !persistedBindingTransition &&
    (!isDeepStrictEqual(operation.preview, expectedPreview) ||
      !isDeepStrictEqual(operation.authority, expectedAuthority) ||
      !isDeepStrictEqual(
        operation.selectedExecution,
        currentResolutionAction.selectedExecution,
      ) ||
      !isDeepStrictEqual(operation.approvalPreview, expectedApprovalPreview))
  ) {
    throw new Error(
      'Resolution capability, semantic action, policy, authority, revision, or public approval preview drifted.',
    );
  }
  const invocation = await readCurrentMutationInvocation(request);
  const authority = validateProductionMutationAuthority({
    effective: effective.authority[lifecycleOperation],
    invocation,
    preview: persistedBindingPreview(operation.approvalPreview!),
    expected: {
      operationClass: operation.lifecycleOperation as
        | 'relink'
        | 'detach'
        | 'recreate',
      targetId: metadata.bindingId,
      workflowId: metadata.target.id,
      workflowRevision: state.localProjection.sourceRevision,
    },
    now: dependencies.now(),
    approvalMaxAgeMs: 300_000,
  });
  if (operation.lifecycleOperation === 'detach') {
    const now = dependencies.now();
    const nextMetadata: RemoteBindingMetadata = {
      ...metadata,
      lifecycle: 'tombstoned',
      updatedAt: now,
    };
    const finalState: RemoteBindingState = {
      ...state,
      metadataUpdatedAt: now,
      lifecycle: 'tombstoned',
      lifecycleCondition: 'missing-or-invisible',
      updatedAt: now,
    };
    return stageAndResumeMaterialization({
      request,
      operation,
      store,
      dependencies,
      approval: authority.approval,
      observationEvidence: {
        observedAt: now,
        classification: 'none',
        evidenceDigest: semanticDigest({
          operationId: operation.operationId,
          kind: 'detach',
          finalState,
        }),
      },
      verification: [
        {
          field: 'binding-transition',
          expectedHash: semanticDigest(finalState),
          observedHash: semanticDigest(finalState),
          status: 'verified',
        },
      ],
      plan: {
        kind: 'update',
        metadata: nextMetadata,
        finalState,
        association:
          metadata.target.kind === 'backlog'
            ? {
                provider: metadata.provider,
                ref: metadata.remoteIdentity.stableId,
                bindingId: metadata.bindingId,
                target: metadata.target,
                seedContent: null,
                resolutionBindingId: null,
                resolutionReferenceRef: `${metadata.provider}:${metadata.remoteIdentity.stableId}`,
              }
            : null,
        terminal: {
          state: 'verified',
          message: 'detach materialization verified',
          verifiedAt: now,
        },
      },
    });
  }
  if (!currentResolutionAction.semanticOperation) {
    throw new Error('Resolution host action evidence is missing.');
  }
  const semanticOperation = currentResolutionAction.semanticOperation;
  const stableId =
    semanticOperation === 'read'
      ? currentResolutionAction.intent.stableId
      : null;
  const action = buildExternalAction({
    operationId: operation.operationId,
    stepId: durableId('resolution', dependencies.randomId()),
    provider: metadata.provider,
    semanticOperation,
    context: metadata.remoteIdentity.context,
    intent: currentResolutionAction.intent,
    expectedObservation: {
      fields:
        semanticOperation === 'read'
          ? ['title', 'description', 'priority', 'status']
          : ['title'],
      ...(semanticOperation === 'search-duplicates'
        ? {
            extensionFields: ['duplicateSearchOutcome', 'candidateCount'],
          }
        : {}),
      requireIdentity: semanticOperation === 'read',
      stableId,
      capabilityEvidenceDigest:
        currentResolutionAction.capabilityEvidenceDigest,
    },
    persistedPreview: {},
  });
  const updated: RemoteOperationRecord = {
    ...operation,
    state: 'pending',
    authority: authority.authority,
    approval: authority.approval,
    selectedExecution: currentResolutionAction.selectedExecution,
    reason: {
      code: `resolution-${operation.lifecycleOperation}-observation-required`,
      message: 'Provider-neutral resolution evidence is required.',
    },
    updatedAt: dependencies.now(),
  };
  await store.updateOperation(updated);
  await store.writeCurrentAction(operation.operationId, action);
  return envelopeFrom(request, updated, metadata, action);
}

async function runProductionDoctor(
  request: RemoteCommandRequest,
  store: RemoteSyncStore,
  dependencies: ProductionRemoteRunnerDependencies,
): Promise<RemoteCommandEnvelope> {
  const config = await readOatConfig(request.projectRoot);
  const metadata = await store.listBindingMetadata();
  const associationTargets = await Promise.all(
    (await discoverDeclaredAssociationPaths(request.projectRoot)).map((path) =>
      readMigrationTarget(request.projectRoot, path),
    ),
  );
  const associatedBindingIds = associationTargets.flatMap((target) =>
    parseAssociatedIssues(target.associatedIssues).flatMap((association) =>
      association.kind === 'reference' && association.bindingId
        ? [association.bindingId]
        : [],
    ),
  );
  let hostCapabilityAvailability: Array<{
    bindingId: string;
    available: boolean;
  }>;
  if (request.capabilityEvidenceStdin) {
    const capabilityInput = await dependencies.readObservationStdin();
    const capabilities = (
      Array.isArray(capabilityInput) ? capabilityInput : [capabilityInput]
    ).map(parseHostCapabilityEvidence);
    hostCapabilityAvailability = metadata.map((binding) => ({
      bindingId: binding.bindingId,
      available: Boolean(
        selectHostExecution({
          provider: binding.provider,
          context: binding.remoteIdentity.context,
          operation: 'read',
          candidates: capabilities,
          attemptStarted: false,
        }).selected,
      ),
    }));
  } else {
    hostCapabilityAvailability = metadata.map((binding) => ({
      bindingId: binding.bindingId,
      available: false,
    }));
  }
  const checks = await runRemoteDoctorChecks({
    portableBindingsDir: store.locations.portable.bindingsDir,
    operationalBindingsDir: store.locations.operational.bindingsDir,
    operationsDir: store.locations.operational.operationsDir,
    policy: config.pjm?.remote,
    now: dependencies.now(),
    staleAfterMs: 24 * 60 * 60 * 1_000,
    associatedBindingIds,
    retentionBreaches: [],
    hostCapabilityAvailability,
    evidenceAvailability: {
      associations: true,
      retention: true,
      hostCapabilities: request.capabilityEvidenceStdin === true,
    },
  });
  const failures = checks.filter((check) => check.status === 'fail');
  return {
    ...emptyPersistedEnvelope(
      request,
      failures.length === 0 ? 'ok' : 'blocked',
    ),
    recovery: failures.map((check) => ({
      code: check.name.replace(/[^A-Za-z0-9_-]/g, '-'),
      instruction: check.fix ?? check.message,
    })),
  };
}

async function runProductionMigration(
  request: RemoteCommandRequest,
  store: RemoteSyncStore,
  dependencies: ProductionRemoteRunnerDependencies,
): Promise<RemoteCommandEnvelope> {
  if (!request.migrationMode) {
    throw new Error('Migration requires check or apply mode.');
  }
  const bindings = await store.listBindingMetadata();
  const declaredPaths = await discoverDeclaredAssociationPaths(
    request.projectRoot,
  );
  const paths = [
    ...new Set([
      ...declaredPaths,
      ...bindings.flatMap((binding) =>
        binding.target.kind === 'backlog' ? [binding.target.path] : [],
      ),
    ]),
  ].sort();
  const inspected = await Promise.all(
    paths.map((path) => readMigrationTarget(request.projectRoot, path)),
  );
  const targets = inspected.filter(
    (target) => target.associatedIssues.length > 0,
  );
  const previewDigest = semanticDigest({
    operation: 'local-remote-association-migration',
    targets: targets.map((target) => ({
      path: target.path,
      preimageDigest: semanticDigest(target.content),
      before: target.associatedIssues,
      after: target.migration.associatedIssues,
    })),
  });
  if (request.migrationMode === 'apply') {
    if (request.migrationApprovalDigest !== previewDigest) {
      throw new Error('Apply requires the exact approved migration preview.');
    }
    for (const target of targets) {
      if (!target.migration.changed) continue;
      if ((await readFile(target.absolutePath, 'utf8')) !== target.content) {
        throw new Error(
          `Migration target '${target.path}' changed after its approved preimage was read.`,
        );
      }
      target.document.set(
        'associated_issues',
        target.migration.associatedIssues,
      );
      const updated = target.content.replace(
        target.frontmatter,
        `---\n${target.document.toString().trimEnd()}\n---`,
      );
      const temporary = resolve(
        dirname(target.absolutePath),
        `.remote-migration.${dependencies
          .randomId()
          .replace(/[^A-Za-z0-9_-]/g, '_')}.tmp`,
      );
      try {
        await writeFile(temporary, updated, { encoding: 'utf8', flag: 'wx' });
        await rename(temporary, target.absolutePath);
      } catch (error) {
        await unlink(temporary).catch(() => undefined);
        throw error;
      }
    }
    return {
      ...emptyPersistedEnvelope(request, 'ok'),
      recovery: [],
    };
  }
  return {
    schemaVersion: 1,
    status: 'needs-review',
    operation: request.operation,
    projectRoot: request.projectRoot,
    persisted: false,
    results: [],
    externalAction: null,
    recovery: [
      {
        code: 'migration-preview',
        instruction: `Review local-only migration preview ${previewDigest}; ${paths.length} declared local targets were inspected and ${targets.length} association candidates were found without provider contact.`,
      },
    ],
  };
}

async function discoverDeclaredAssociationPaths(
  projectRoot: string,
): Promise<string[]> {
  const paths: string[] = [];
  const backlogRoot = resolve(
    projectRoot,
    '.oat',
    'repo',
    'pjm',
    'backlog',
    'items',
  );
  for (const entry of await readBoundedDirectory(backlogRoot)) {
    if (entry.isFile() && entry.name.endsWith('.md')) {
      paths.push(`.oat/repo/pjm/backlog/items/${entry.name}`);
    }
  }
  for (const scope of ['local', 'shared', 'synced'] as const) {
    const scopeRoot = resolve(projectRoot, '.oat', 'projects', scope);
    for (const entry of await readBoundedDirectory(scopeRoot)) {
      if (!entry.isDirectory()) continue;
      const relativePath = `.oat/projects/${scope}/${entry.name}/state.md`;
      try {
        await readFile(resolveInsideProject(projectRoot, relativePath), 'utf8');
        paths.push(relativePath);
      } catch (error) {
        if (!(isNodeError(error) && error.code === 'ENOENT')) throw error;
      }
    }
  }
  return paths.sort();
}

async function readBoundedDirectory(path: string) {
  try {
    return await readdir(path, { withFileTypes: true });
  } catch (error) {
    if (isNodeError(error) && error.code === 'ENOENT') return [];
    throw error;
  }
}

async function readMigrationTarget(projectRoot: string, path: string) {
  const absolutePath = resolveInsideProject(projectRoot, path);
  const content = await readFile(absolutePath, 'utf8');
  if (Buffer.byteLength(content, 'utf8') > 1_048_576) {
    throw new Error('Migration target exceeds the size limit.');
  }
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) throw new Error('Migration target requires frontmatter.');
  const document = YAML.parseDocument(match[1]!, { uniqueKeys: true });
  if (document.errors.length > 0) {
    throw new Error('Migration target frontmatter is invalid.');
  }
  const values = document.toJS() as Record<string, unknown>;
  const associatedIssues = Array.isArray(values.associated_issues)
    ? values.associated_issues
    : [];
  return {
    path,
    absolutePath,
    content,
    frontmatter: match[0],
    document,
    associatedIssues,
    migration: migrateRemoteAssociations({
      mode: 'check',
      associatedIssues,
    }),
  };
}

function closeoutRecordFromJournal(
  journal: CloseoutJournal,
  metadata: RemoteBindingMetadata,
  state: RemoteBindingState | null,
  batchId: string,
  capability: HostCapabilityEvidence,
  actionByStep: ReadonlyMap<string, ExternalActionEnvelope>,
): RemoteOperationRecord {
  const operationState = closeoutRecordState(journal.state);
  let record: RemoteOperationRecord = {
    recordType: 'operation',
    schemaVersion: 2,
    operationId: journal.operationId,
    correlationId: batchId,
    bindingId: journal.bindingId,
    provider: journal.provider,
    providerContext: metadata.remoteIdentity.context,
    lifecycleOperation: 'closeout',
    operationClass: 'composite',
    state: operationState,
    reason:
      operationState === 'blocked'
        ? {
            code: 'closeout-blocked',
            message: 'No closeout substep is currently executable.',
          }
        : null,
    lastSafeStep: operationState === 'verified' ? 'complete' : 'planned',
    preview: {
      digest: journal.previewDigest,
      bindingId: journal.bindingId,
      provider: journal.provider,
      providerContext: metadata.remoteIdentity.context,
      capabilityEvidenceDigest: capability.evidenceDigest,
      revisionDigest: state?.snapshot?.revision.contentHash ?? 'unobserved',
      revisionEvidence: revisionEvidenceFromState(state),
      policyDigest: semanticDigest({
        policyRestrictions: metadata.policyRestrictions,
        purposes: metadata.purposes,
      }),
      projectionDigest: semanticDigest(
        journal.substeps.map(
          (step) =>
            actionByStep.get(step.stepId)?.outboundSafety?.projectionDigest,
        ),
      ),
      safetyResultDigest: semanticDigest(
        journal.substeps.map(
          (step) => actionByStep.get(step.stepId)?.outboundSafety?.resultDigest,
        ),
      ),
    },
    authority: null,
    approval: null,
    createdAt: journal.createdAt,
    updatedAt: journal.updatedAt,
    selectedExecution: capabilityReference(capability),
    attempts: [],
    observations: [],
    verification: [],
    retryDisposition:
      operationState === 'verified' ? 'not-applicable' : 'safe-before-attempt',
    steps: journal.substeps.map((step) => ({
      stepId: step.stepId,
      semanticOperation:
        step.kind === 'annotation'
          ? ('annotate' as const)
          : ('transition' as const),
      state: closeoutRecordState(step.state),
      actionDigest:
        actionByStep.get(step.stepId)?.actionDigest ??
        (() => {
          throw new Error(
            `Closeout step '${step.stepId}' lacks its exact action.`,
          );
        })(),
      previewDigest: step.previewDigest,
      authority: {
        effective: step.authority,
        sourceDigest: step.authoritySourceDigest,
      },
      approvalRequirement: step.approvalRequirement,
      approval: null,
      attempts: [],
      verification: [],
      retryDisposition:
        step.state === 'verified' ? 'not-applicable' : 'safe-before-attempt',
    })),
    outcome: {
      classification:
        operationState === 'verified'
          ? 'verified'
          : operationState === 'blocked'
            ? 'blocked'
            : operationState === 'partial'
              ? 'partial'
              : operationState === 'uncertain'
                ? 'uncertain'
                : operationState === 'rejected'
                  ? 'rejected'
                  : 'pending',
      message: operationState === 'blocked' ? 'closeout blocked' : null,
      verifiedAt: operationState === 'verified' ? journal.updatedAt : null,
    },
  };
  record = {
    ...record,
    steps: record.steps.map((step) => ({
      ...step,
      approvalPreview: closeoutStepApprovalPreview(
        record,
        step,
        actionByStep.get(step.stepId)!,
      ),
    })),
  };
  return record;
}

function closeoutJournalFromRecord(
  record: RemoteOperationRecord | null,
  projectPath: string,
): CloseoutJournal | null {
  if (!record || record.lifecycleOperation !== 'closeout') return null;
  return {
    schemaVersion: 1,
    operationId: record.operationId,
    bindingId: record.bindingId,
    provider: record.provider,
    projectPath,
    previewDigest: record.preview.digest,
    state: record.state,
    substeps: record.steps.map((step) => ({
      stepId: step.stepId,
      kind: step.semanticOperation === 'annotate' ? 'annotation' : 'transition',
      state: step.state,
      previewDigest: step.previewDigest,
      authority: step.authority.effective,
      authoritySourceDigest: step.authority.sourceDigest,
      approvalRequirement: step.approvalRequirement,
      dependsOn:
        step.semanticOperation === 'transition'
          ? record.steps
              .filter((candidate) => candidate.semanticOperation === 'annotate')
              .map((candidate) => candidate.stepId)
          : [],
    })),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function closeoutRecordState(
  state: CloseoutJournal['state'],
): RemoteOperationRecord['state'] {
  return state === 'pending' ? 'planned' : state;
}

function operationStatus(state: CloseoutJournal['state']): RemoteCommandStatus {
  if (state === 'verified') return 'ok';
  if (state === 'planned' || state === 'pending' || state === 'authorized') {
    return 'needs-review';
  }
  if (state === 'attempt-started' || state === 'verification-pending') {
    return 'pending';
  }
  return state;
}

function batchStatus(
  state:
    | 'planned'
    | 'pending'
    | 'authorized'
    | 'in-progress'
    | 'partial'
    | 'uncertain'
    | 'blocked'
    | 'complete',
): RemoteCommandStatus {
  if (state === 'complete') return 'ok';
  if (state === 'planned' || state === 'pending' || state === 'authorized') {
    return 'needs-review';
  }
  if (state === 'in-progress') return 'pending';
  return state;
}

function strictestCloseoutAuthority(journal: CloseoutJournal): string {
  const levels = [
    'read-only',
    'user-approved',
    'user-authorized',
    'autonomous',
  ];
  return journal.substeps.reduce(
    (strictest, step) =>
      levels.indexOf(step.authority) < levels.indexOf(strictest)
        ? step.authority
        : strictest,
    'autonomous',
  );
}

async function effectivePolicyForBinding(
  projectRoot: string,
  metadata: RemoteBindingMetadata,
) {
  const config = await readOatConfig(projectRoot);
  const repository = config.pjm?.remote?.policy ?? {
    description: 'none' as const,
    authority: { default: 'read-only' as const },
  };
  return resolveEffectiveRemotePolicy({
    repository,
    provider: repository.providers?.[metadata.provider],
    binding: metadata.policyRestrictions,
  });
}

type ResolutionActionEvidence =
  | {
      semanticOperation: null;
      intent: null;
      capabilityEvidenceDigest: string;
      selectedExecution: null;
    }
  | {
      semanticOperation: 'read';
      intent: { stableId: string };
      capabilityEvidenceDigest: string;
      selectedExecution: NonNullable<
        RemoteOperationRecord['selectedExecution']
      >;
    }
  | {
      semanticOperation: 'search-duplicates';
      intent: { query: string };
      capabilityEvidenceDigest: string;
      selectedExecution: NonNullable<
        RemoteOperationRecord['selectedExecution']
      >;
    };

async function resolveCurrentResolutionAction(
  request: RemoteCommandRequest,
  metadata: RemoteBindingMetadata,
  state: RemoteBindingState,
  dependencies: ProductionRemoteRunnerDependencies,
): Promise<ResolutionActionEvidence> {
  if (request.resolutionKind === 'detach') {
    return {
      semanticOperation: null,
      intent: null,
      capabilityEvidenceDigest: semanticDigest({
        mode: 'no-host-action',
        lifecycleOperation: 'detach',
      }),
      selectedExecution: null,
    };
  }
  if (
    request.resolutionKind !== 'relink' &&
    request.resolutionKind !== 'recreate'
  ) {
    throw new Error('Resolution requires an explicit supported kind.');
  }
  if (!request.capabilityEvidenceStdin) {
    throw new Error(
      'Relink and recreate preview requires current live host capability evidence.',
    );
  }
  const capability = parseHostCapabilityEvidence(
    await dependencies.readObservationStdin(),
  );
  const now = Date.parse(dependencies.now());
  const observedAt = Date.parse(capability.observedAt);
  if (
    !Number.isFinite(now) ||
    !Number.isFinite(observedAt) ||
    observedAt > now ||
    now - observedAt > 300_000
  ) {
    throw new Error('Resolution capability evidence is stale or future-dated.');
  }
  const semanticOperation =
    request.resolutionKind === 'relink' ? 'read' : 'search-duplicates';
  const selection = selectHostExecution({
    provider: metadata.provider,
    context: metadata.remoteIdentity.context,
    operation: semanticOperation,
    candidates: [capability],
    attemptStarted: false,
  });
  if (!selection.selected) {
    throw new Error(`No current host capability: ${selection.reason}.`);
  }
  const selectedEvidence = {
    capabilityEvidenceDigest: selection.evidence.evidenceDigest,
    selectedExecution: capabilityReference(selection.evidence),
  };
  if (semanticOperation === 'read') {
    return {
      semanticOperation,
      intent: {
        stableId: parseProviderReference(
          request.providerRef,
          metadata.provider,
        ),
      },
      ...selectedEvidence,
    };
  }
  return {
    semanticOperation,
    intent: { query: state.localProjection.title },
    ...selectedEvidence,
  };
}

function resolveRecreatePriorityPolicy(metadata: RemoteBindingMetadata) {
  const evidence = metadata.providerMappingEvidence?.priority;
  const mappingAvailable = evidence?.status === 'safe';
  const localSource = metadata.publicationProjection.priority;
  return {
    enabled: mappingAvailable && localSource !== 'none',
    mappingAvailable,
    localSource,
    evidence:
      evidence ??
      ({
        status: 'unavailable',
        evidenceDigest: null,
        observedAt: null,
      } as const),
  };
}

function resolutionPolicyEvidence(
  effective: Awaited<ReturnType<typeof effectivePolicyForBinding>>,
  metadata: RemoteBindingMetadata,
  operation: 'relink' | 'detach' | 'recreate',
) {
  const priorityPolicy = resolveRecreatePriorityPolicy(metadata);
  return {
    effective,
    ...(operation === 'recreate'
      ? {
          priorityMapping: {
            enabled: priorityPolicy.enabled,
            mappingAvailable: priorityPolicy.mappingAvailable,
            localSource: priorityPolicy.localSource,
            source: 'provider-binding-evidence' as const,
            evidence: priorityPolicy.evidence,
          },
        }
      : {}),
  };
}

function resolutionApprovalPreview(
  operation: RemoteOperationRecord,
  metadata: RemoteBindingMetadata,
  state: RemoteBindingState,
  providerRef: string | undefined,
): PersistedApprovalPreview {
  const revisionEvidence = operation.preview.revisionEvidence;
  if (!revisionEvidence) {
    throw new Error('Resolution preview lacks revision freshness evidence.');
  }
  const digest = (value: string, evidence: unknown = null) =>
    semanticDigest({
      operationId: operation.operationId,
      component: value,
      evidence,
    });
  const operationClass = operation.lifecycleOperation as
    | 'relink'
    | 'detach'
    | 'recreate';
  const fieldMask = ['title'] as const;
  const componentDigests = {
    target: digest('target', {
      target: metadata.target,
      remoteIdentity: metadata.remoteIdentity,
      providerRef: providerRef ?? null,
    }),
    baseline: digest('baseline', state.baseline),
    revision: digest('revision', {
      digest: operation.preview.revisionDigest,
      revisionEvidence,
    }),
    capability: digest('capability', {
      mode: operation.selectedExecution ? 'selected' : 'no-host-action',
      selectedExecution: operation.selectedExecution,
      evidenceDigest: operation.preview.capabilityEvidenceDigest,
    }),
    policy: operation.preview.policyDigest,
    projection: digest('projection', {
      semanticAction:
        operation.lifecycleOperation === 'detach'
          ? null
          : operation.lifecycleOperation === 'relink'
            ? {
                operation: 'read',
                intent: {
                  stableId: parseProviderReference(
                    providerRef,
                    metadata.provider,
                  ),
                },
              }
            : {
                operation: 'search-duplicates',
                intent: { query: state.localProjection.title },
              },
    }),
    outboundSafety: digest('outbound-safety', {
      operation: operation.lifecycleOperation,
      outboundMutation: false,
    }),
  };
  return {
    schemaVersion: 1,
    digest: semanticDigest({
      schemaVersion: 1,
      bindingId: operation.bindingId,
      provider: operation.provider,
      operationClass,
      fieldMask,
      createdAt: operation.createdAt,
      componentDigests,
      authority: {
        effective: operation.authority?.effective ?? 'read-only',
        evidenceDigest:
          operation.authority?.sourceDigest ?? 'unbound-authority',
      },
    }),
    bindingId: operation.bindingId,
    provider: operation.provider,
    operationClass,
    fieldMask: [...fieldMask],
    createdAt: operation.createdAt,
    componentDigests,
    renderedFields: {
      title: { kind: 'value', value: operation.lifecycleOperation },
      description: { kind: 'value', value: null },
      priority: { kind: 'value', value: null },
    },
    revisionEvidence,
  };
}

function resolutionCreateApprovalPreview(
  operation: RemoteOperationRecord,
  action: ExternalActionEnvelope,
): PersistedApprovalPreview {
  const revisionEvidence = operation.preview.revisionEvidence;
  if (!revisionEvidence) {
    throw new Error('Recreate substep lacks revision freshness evidence.');
  }
  const projection = operation.preview.projectionDigest!;
  const safety = operation.preview.safetyResultDigest!;
  const fields = action.intent.fields as Record<
    'title' | 'description' | 'priority',
    string | null
  >;
  const fieldMask = Object.keys(fields) as Array<
    'title' | 'description' | 'priority'
  >;
  const rendered = (field: 'title' | 'description' | 'priority') => {
    const value = Object.hasOwn(fields, field) ? fields[field] : null;
    return {
      kind: 'hash' as const,
      digest: semanticDigest(value),
      bytes: Buffer.byteLength(JSON.stringify(value), 'utf8'),
    };
  };
  return {
    schemaVersion: 1,
    digest: operation.preview.digest,
    bindingId: operation.bindingId,
    provider: operation.provider,
    operationClass: 'recreate',
    fieldMask,
    createdAt: operation.updatedAt,
    componentDigests: {
      target: semanticDigest({ bindingId: operation.bindingId }),
      baseline: operation.preview.revisionDigest,
      revision: operation.preview.revisionDigest,
      capability: operation.preview.capabilityEvidenceDigest,
      policy: operation.preview.policyDigest,
      projection,
      outboundSafety: safety,
    },
    renderedFields: {
      title: rendered('title'),
      description: rendered('description'),
      priority: rendered('priority'),
    },
    revisionEvidence,
  };
}

async function writeResolutionAssociation(
  projectRoot: string,
  targetRef: string,
  originalBindingId: string,
  input: {
    bindingId: string | null;
    referenceRef: string | null;
  },
  currentMetadata: RemoteBindingMetadata | null,
): Promise<void> {
  const target = await readMigrationTarget(projectRoot, targetRef);
  const existing = parseAssociatedIssues(target.associatedIssues);
  const retained = existing.filter(
    (entry) =>
      !(entry.kind === 'reference' && entry.bindingId === originalBindingId),
  );
  if (input.referenceRef) {
    const separator = input.referenceRef.indexOf(':');
    retained.push({
      kind: 'reference',
      type: input.referenceRef.slice(0, separator),
      ref: input.referenceRef.slice(separator + 1),
    });
  } else if (input.bindingId) {
    if (!currentMetadata) {
      throw new Error('Resolution binding metadata disappeared.');
    }
    retained.push({
      kind: 'reference',
      type: currentMetadata.provider,
      ref: currentMetadata.remoteIdentity.stableId,
      bindingId: input.bindingId,
    });
  }
  target.document.set('associated_issues', serializeAssociatedIssues(retained));
  const updated = target.content.replace(
    target.frontmatter,
    `---\n${target.document.toString().trimEnd()}\n---`,
  );
  await writeFile(target.absolutePath, updated, 'utf8');
}

function parseProviderReference(
  value: string | undefined,
  expectedProvider: RemoteBindingMetadata['provider'],
): string {
  const separator = value?.indexOf(':') ?? -1;
  if (
    !value ||
    separator < 1 ||
    value.slice(0, separator) !== expectedProvider ||
    separator === value.length - 1
  ) {
    throw new Error(
      `Resolution replacement must be an explicit ${expectedProvider}:stable-id reference.`,
    );
  }
  return value.slice(separator + 1);
}

function resolutionPreviewEnvelope(
  request: RemoteCommandRequest,
  metadata: RemoteBindingMetadata,
  operation: RemoteOperationRecord,
): RemoteCommandEnvelope {
  return {
    schemaVersion: 1,
    status: 'needs-review',
    operation: request.operation,
    projectRoot: request.projectRoot,
    persisted: true,
    results: [
      {
        bindingId: metadata.bindingId,
        provider: metadata.provider,
        target: metadata.target.id,
        status: 'needs-review',
        freshness: operation.updatedAt,
        authority: operation.authority?.effective ?? 'read-only',
        diagnosticCode: operation.reason?.code ?? null,
      },
    ],
    externalAction: null,
    approvalPreview: publicApprovalPreview(
      operation.operationId,
      operation.approvalPreview!,
      operation.authority!.effective,
      operation.authority!.sourceDigest,
      operation.preview.revisionDigest,
    ),
    recovery: [
      {
        code: 'fresh-approval-and-evidence-required',
        instruction: `Approve persisted ${operation.lifecycleOperation} preview ${operation.operationId} only with current verified replacement evidence.`,
      },
    ],
  };
}

function emptyPersistedEnvelope(
  request: RemoteCommandRequest,
  status: RemoteCommandStatus,
): RemoteCommandEnvelope {
  return {
    schemaVersion: 1,
    status,
    operation: request.operation,
    projectRoot: request.projectRoot,
    persisted: true,
    results: [],
    externalAction: null,
    recovery: [],
  };
}

function assertNeverRemoteOperation(operation: never): never {
  throw new Error(`Unsupported remote lifecycle operation '${operation}'.`);
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
  if (
    ['verified', 'uncertain', 'rejected', 'failed', 'blocked'].includes(
      operation.state,
    )
  ) {
    throw new Error(
      'Remote operation is terminal; observation replay is rejected.',
    );
  }
  if (operation.materializationPlan) {
    return resumeMaterialization(request, operation, store, dependencies);
  }
  if (operation.verificationHandoff && !request.observationStdin) {
    const action = restoreDurableVerificationAction(operation);
    return envelopeFrom(request, operation, null, action);
  }
  if (
    !request.observationStdin &&
    operation.lifecycleOperation === 'recreate' &&
    operation.reason?.code === 'recreate-found-existing-readback-required'
  ) {
    const action = await store.readAction(
      operation.operationId,
      `${operation.operationId}_duplicate_read`,
    );
    if (!action) {
      throw new Error('Recreate replacement read action evidence is missing.');
    }
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
  let action = operation.verificationHandoff
    ? restoreDurableVerificationAction(operation)
    : operation.currentAction
      ? parseExternalAction(operation.currentAction)
      : await store.readCurrentAction(operation.operationId);
  if (!action && operation.lifecycleOperation === 'closeout') {
    const pendingStep = operation.steps.find(
      (step) => step.state === 'attempt-started',
    );
    action = pendingStep
      ? await store.readAction(operation.operationId, pendingStep.stepId)
      : null;
  }
  if (
    !action &&
    operation.lifecycleOperation === 'recreate' &&
    operation.reason?.code === 'recreate-found-existing-readback-required'
  ) {
    action = await store.readAction(
      operation.operationId,
      `${operation.operationId}_duplicate_read`,
    );
  }
  if (!action)
    throw new Error(
      `Remote operation '${operation.operationId}' has no durable current action.`,
    );
  if (operation.lifecycleOperation === 'discussion') {
    return continueDiscussionOperation(
      request,
      operation,
      metadata,
      action,
      store,
      dependencies,
    );
  }
  if (operation.lifecycleOperation === 'closeout') {
    return continueCloseoutOperation(
      request,
      operation,
      metadata,
      action,
      store,
      dependencies,
    );
  }
  if (['relink', 'recreate'].includes(operation.lifecycleOperation)) {
    return continueResolutionOperation(
      request,
      operation,
      metadata,
      action,
      store,
      dependencies,
    );
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

function parseDuplicateSearchOutcome(
  observation: ReturnType<typeof acceptExternalObservation>,
): 'found-existing' | 'search-unavailable' | 'ambiguous' | 'no-match' {
  const outcome = observation.outcome.extensions?.duplicateSearchOutcome;
  if (
    outcome !== 'found-existing' &&
    outcome !== 'search-unavailable' &&
    outcome !== 'ambiguous' &&
    outcome !== 'no-match'
  ) {
    throw new Error('Duplicate search requires an explicit bounded outcome.');
  }
  if (outcome === 'found-existing' && !observation.outcome.identity) {
    throw new Error('Found-existing duplicate evidence requires identity.');
  }
  if (outcome !== 'found-existing' && observation.outcome.identity) {
    throw new Error('Duplicate search outcome contradicts identity evidence.');
  }
  if (outcome === 'ambiguous') {
    const count = observation.outcome.extensions?.candidateCount;
    if (
      typeof count !== 'number' ||
      !Number.isSafeInteger(count) ||
      count < 2
    ) {
      throw new Error(
        'Ambiguous duplicate evidence requires a bounded candidate count.',
      );
    }
  }
  return outcome;
}

async function continueCloseoutOperation(
  request: RemoteCommandRequest,
  operation: RemoteOperationRecord,
  metadata: RemoteBindingMetadata | null,
  action: ExternalActionEnvelope,
  store: RemoteSyncStore,
  dependencies: ProductionRemoteRunnerDependencies,
): Promise<RemoteCommandEnvelope> {
  if (!metadata) throw new Error('Closeout binding metadata is missing.');
  if (
    action.semanticOperation !== 'read' &&
    !(await store.readCurrentAction(operation.operationId))
  ) {
    await store.writeCurrentAction(operation.operationId, action);
  }
  if (action.semanticOperation === 'read' && operation.verificationHandoff) {
    const staleMutation = await store.readCurrentAction(operation.operationId);
    if (
      staleMutation &&
      staleMutation.actionDigest ===
        operation.verificationHandoff.acceptedMutation.actionDigest
    ) {
      await store.retireCurrentAction(operation.operationId, staleMutation);
    }
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
  const now = observation.observedAt;
  const activeStep =
    action.semanticOperation === 'read'
      ? operation.steps.find((step) => step.state === 'verification-pending')
      : operation.steps.find((step) => step.stepId === action.stepId);
  if (!activeStep) {
    throw new Error('Closeout observation does not match an active substep.');
  }
  if (observation.outcome.classification !== 'observed') {
    const terminal =
      observation.outcome.classification === 'rejected'
        ? ('rejected' as const)
        : ('uncertain' as const);
    if (action.semanticOperation !== 'read') {
      await store.retireCurrentAction(operation.operationId, action);
    }
    const updated: RemoteOperationRecord = {
      ...operation,
      state: terminal,
      steps: operation.steps.map((step) =>
        step.stepId === activeStep.stepId ? { ...step, state: terminal } : step,
      ),
      updatedAt: now,
      outcome: {
        classification: terminal,
        message: observation.outcome.diagnosticCode,
        verifiedAt: null,
      },
    };
    await store.updateOperation(updated);
    const batch = await store.readBatch(operation.correlationId);
    if (batch) {
      await store.updateBatch(
        reduceReviewedBatchOutcomes(
          batch,
          { [operation.operationId]: terminal },
          now,
        ),
      );
    }
    return envelopeFrom(request, updated, metadata, null);
  }
  if (!observation.outcome.identity) {
    throw new Error(
      'Closeout observation lacks authoritative identity evidence.',
    );
  }
  if (action.semanticOperation !== 'read') {
    const readAction = buildExternalAction({
      operationId: operation.operationId,
      stepId: durableId('closeout_verify', dependencies.randomId()),
      provider: operation.provider,
      semanticOperation: 'read',
      context: operation.providerContext,
      intent: { stableId: observation.outcome.identity.stableId },
      expectedObservation: {
        fields: activeStep.semanticOperation === 'transition' ? ['status'] : [],
        ...(activeStep.semanticOperation === 'annotate'
          ? { extensionFields: ['annotationDigest'] }
          : {}),
        requireIdentity: true,
        stableId: metadata.remoteIdentity.stableId,
        capabilityEvidenceDigest:
          operation.selectedExecution?.evidenceDigest ??
          observation.capabilityEvidenceDigest,
      },
      persistedPreview: {},
    });
    await store.writeActionEvidence(operation.operationId, readAction);
    const updated: RemoteOperationRecord = {
      ...operation,
      state: 'verification-pending',
      steps: operation.steps.map((step) =>
        step.stepId === activeStep.stepId
          ? { ...step, state: 'verification-pending' as const }
          : step,
      ),
      currentAction: readAction as NonNullable<
        RemoteOperationRecord['currentAction']
      >,
      verificationHandoff: {
        acceptedMutation: {
          actionDigest: action.actionDigest,
          observedAt: now,
          evidenceDigest: semanticDigest(observation),
          stableId: observation.outcome.identity.stableId,
        },
        verificationAction: readAction as NonNullable<
          RemoteOperationRecord['verificationHandoff']
        >['verificationAction'],
      },
      observations: [
        ...operation.observations,
        {
          observedAt: now,
          classification: 'committed',
          evidenceDigest: semanticDigest(observation),
          actionDigest: action.actionDigest,
        },
      ],
      attempts: operation.attempts.map((attempt) =>
        attempt.attemptId === action.stepId
          ? {
              ...attempt,
              completedAt: now,
              receiptDigest: semanticDigest(observation),
            }
          : attempt,
      ),
      updatedAt: now,
    };
    await store.updateOperation(updated);
    await store.retireCurrentAction(operation.operationId, action);
    return envelopeFrom(request, updated, metadata, readAction);
  }
  if (
    observation.outcome.identity.stableId !== metadata.remoteIdentity.stableId
  ) {
    throw new Error('Closeout read-back identity does not match the binding.');
  }
  const mutationAction = await store.readAction(
    operation.operationId,
    activeStep.stepId,
  );
  if (!mutationAction) {
    throw new Error('Closeout mutation evidence is missing before read-back.');
  }
  const readBackMatches =
    activeStep.semanticOperation === 'transition'
      ? observation.outcome.fields.status === mutationAction.intent.transition
      : observation.outcome.extensions?.annotationDigest ===
        semanticDigest(mutationAction.intent.body);
  if (!readBackMatches) {
    throw new Error(
      'Closeout authoritative read-back did not verify the exact mutation.',
    );
  }
  const steps = operation.steps.map((step) =>
    step.stepId === activeStep.stepId
      ? {
          ...step,
          state: 'verified' as const,
          verification: [...step.verification, semanticDigest(observation)],
          retryDisposition: 'not-applicable' as const,
        }
      : step,
  );
  const complete = steps.every((step) => step.state === 'verified');
  const {
    currentAction: _currentAction,
    verificationHandoff: _verificationHandoff,
    ...withoutCurrentAction
  } = operation;
  const updated: RemoteOperationRecord = {
    ...withoutCurrentAction,
    state: complete ? 'verified' : 'planned',
    steps,
    observations: [
      ...operation.observations,
      {
        observedAt: now,
        classification: 'none',
        evidenceDigest: semanticDigest(observation),
        actionDigest: action.actionDigest,
      },
    ],
    verification: complete
      ? [
          {
            field: 'composite-closeout',
            expectedHash: operation.preview.digest,
            observedHash: operation.preview.digest,
            status: 'verified',
          },
        ]
      : operation.verification,
    updatedAt: now,
    lastSafeStep: complete ? 'complete' : 'planned',
    retryDisposition: complete ? 'not-applicable' : 'safe-before-attempt',
    outcome: {
      classification: complete ? 'verified' : 'pending',
      message: complete ? 'authoritative closeout read-back verified' : null,
      verifiedAt: complete ? now : null,
    },
  };
  await store.updateOperation(updated);
  const batch = await store.readBatch(operation.correlationId);
  if (batch && complete) {
    await store.updateBatch(
      reduceReviewedBatchOutcomes(
        batch,
        { [operation.operationId]: 'verified' },
        now,
      ),
    );
  }
  return {
    ...envelopeFrom(request, updated, metadata, null),
    status: complete ? 'ok' : 'needs-review',
    ...(!complete
      ? (() => {
          const next = steps.find((step) => step.state === 'planned')!;
          return {
            approvalPreview: publicApprovalPreview(
              updated.operationId,
              next.approvalPreview!,
              next.authority.effective,
              next.authority.sourceDigest,
              updated.preview.revisionDigest,
            ),
          };
        })()
      : {}),
    recovery: complete
      ? []
      : (() => {
          const next = steps.find((step) => step.state === 'planned')!;
          return [
            {
              code: 'next-closeout-substep-approval-required',
              instruction: `Approve exact ${next.semanticOperation} preview ${next.previewDigest} in batch ${operation.correlationId}.`,
            },
          ];
        })(),
  };
}

async function continueDiscussionOperation(
  request: RemoteCommandRequest,
  operation: RemoteOperationRecord,
  metadata: RemoteBindingMetadata | null,
  action: ExternalActionEnvelope,
  store: RemoteSyncStore,
  dependencies: ProductionRemoteRunnerDependencies,
): Promise<RemoteCommandEnvelope> {
  if (!metadata) throw new Error('Discussion binding metadata is missing.');
  const bounds = operation.reason?.code.match(
    /^discussion-limit-(\d+)-remaining-(\d+)-pages-(\d+)$/,
  );
  const limit = Number(bounds?.[1]);
  const remaining = Number(bounds?.[2]);
  const pages = Number(bounds?.[3]);
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) {
    throw new Error('Persisted discussion limit is invalid.');
  }
  if (!Number.isSafeInteger(remaining) || remaining < 1 || remaining > limit) {
    throw new Error('Persisted discussion remaining limit is invalid.');
  }
  const rawObservation = await dependencies.readObservationStdin();
  const evidence = await acceptRemoteDiscussionObservation({
    action,
    observation: rawObservation,
    bindingId: operation.bindingId,
    limit: remaining,
    maxPages: 1,
  });
  await store.retireCurrentAction(operation.operationId, action);
  const verified = evidence.status === 'available';
  const nextCursor = discussionObservationCursor(rawObservation);
  const nextRemaining = remaining - evidence.items.length;
  if (verified && nextCursor && nextRemaining > 0 && pages + 1 < 10) {
    const nextAction = buildExternalAction({
      operationId: operation.operationId,
      stepId: durableId('discussion', dependencies.randomId()),
      provider: metadata.provider,
      semanticOperation: 'read-discussion',
      context: metadata.remoteIdentity.context,
      intent: {
        stableId: metadata.remoteIdentity.stableId,
        limit: nextRemaining,
        cursor: nextCursor,
      },
      expectedObservation: {
        fields: [],
        requireIdentity: false,
        stableId: metadata.remoteIdentity.stableId,
        capabilityEvidenceDigest:
          operation.selectedExecution?.evidenceDigest ??
          action.expectedObservation.capabilityEvidenceDigest,
      },
      persistedPreview: {},
    });
    const updated: RemoteOperationRecord = {
      ...operation,
      state: 'pending',
      reason: {
        code: `discussion-limit-${limit}-remaining-${nextRemaining}-pages-${pages + 1}`,
        message: 'Bounded non-persistent discussion read continuation.',
      },
      observations: [
        ...operation.observations,
        {
          observedAt: evidence.observedAt,
          classification: 'none',
          evidenceDigest: semanticDigest({
            status: evidence.status,
            pagesRead: evidence.pagesRead,
            itemCount: evidence.items.length,
            truncated: evidence.truncated,
          }),
          actionDigest: action.actionDigest,
        },
      ],
      updatedAt: evidence.observedAt,
    };
    await store.updateOperation(updated);
    await store.writeCurrentAction(operation.operationId, nextAction);
    return {
      ...envelopeFrom(request, updated, metadata, nextAction),
      status: 'pending',
      discussionEvidence: evidence,
    };
  }
  const updated = await store.transitionOperation(
    operation.operationId,
    operation.state,
    {
      state: verified ? 'verified' : 'blocked',
      updatedAt: evidence.observedAt,
      appendObservation: {
        observedAt: evidence.observedAt,
        classification: 'none',
        evidenceDigest: semanticDigest(evidence),
        actionDigest: action.actionDigest,
      },
      lastSafeStep: verified ? 'complete' : 'planned',
      retryDisposition: verified ? 'not-applicable' : 'safe-before-attempt',
      outcome: {
        classification: verified ? 'verified' : 'blocked',
        message: verified
          ? 'bounded discussion evidence returned'
          : 'discussion unavailable',
        verifiedAt: verified ? evidence.observedAt : null,
      },
    },
  );
  return {
    ...envelopeFrom(request, updated, metadata, null),
    status: verified ? 'ok' : 'blocked',
    discussionEvidence: evidence,
  };
}

function discussionObservationCursor(value: unknown): string | null {
  if (!value || typeof value !== 'object') return null;
  const cursor = (value as { nextCursor?: unknown }).nextCursor;
  return typeof cursor === 'string' && cursor.length > 0 ? cursor : null;
}

async function continueResolutionOperation(
  request: RemoteCommandRequest,
  operation: RemoteOperationRecord,
  metadata: RemoteBindingMetadata | null,
  action: ExternalActionEnvelope,
  store: RemoteSyncStore,
  dependencies: ProductionRemoteRunnerDependencies,
): Promise<RemoteCommandEnvelope> {
  if (!metadata) throw new Error('Resolution binding metadata is missing.');
  const state = await store.readBindingState(metadata.bindingId);
  if (!state) throw new Error('Resolution binding state is missing.');
  if (!operation.approval) {
    throw new Error('Resolution continuation lacks its bound approval.');
  }
  if (action.semanticOperation === 'read' && operation.verificationHandoff) {
    const staleMutation = await store.readCurrentAction(operation.operationId);
    if (
      staleMutation &&
      staleMutation.actionDigest ===
        operation.verificationHandoff.acceptedMutation.actionDigest
    ) {
      await store.retireCurrentAction(operation.operationId, staleMutation);
    }
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
  if (observation.outcome.classification !== 'observed') {
    const terminal =
      observation.outcome.classification === 'rejected'
        ? ('rejected' as const)
        : ('uncertain' as const);
    const observationEvidence = {
      observedAt: observation.observedAt,
      classification:
        terminal === 'rejected'
          ? ('not-committed' as const)
          : ('unknown' as const),
      evidenceDigest: semanticDigest(observation),
      actionDigest: action.actionDigest,
    };
    if (
      operation.lifecycleOperation === 'recreate' &&
      action.semanticOperation === 'create'
    ) {
      const frozenMetadata: RemoteBindingMetadata = {
        ...metadata,
        lifecycle: 'blocked',
        updatedAt: observation.observedAt,
      };
      const frozenState: RemoteBindingState = {
        ...state,
        metadataUpdatedAt: observation.observedAt,
        lifecycle: 'blocked',
        lifecycleCondition: 'temporarily-unavailable',
        updatedAt: observation.observedAt,
      };
      return stageAndResumeMaterialization({
        request,
        operation,
        store,
        dependencies,
        observationEvidence,
        verification: operation.verification,
        plan: {
          kind: 'update',
          metadata: frozenMetadata,
          finalState: frozenState,
          association: null,
          retireAction: {
            stepId: action.stepId,
            actionDigest: action.actionDigest,
          },
          terminal: {
            state: terminal,
            message: observation.outcome.diagnosticCode,
            verifiedAt: null,
          },
        },
      });
    }
    const updated = await store.transitionOperation(
      operation.operationId,
      operation.state,
      {
        state: terminal,
        updatedAt: observation.observedAt,
        outcome: {
          classification: terminal,
          message: observation.outcome.diagnosticCode,
          verifiedAt: null,
        },
        appendObservation: observationEvidence,
      },
    );
    dependencies.crash?.('after-resolution-observation-journal');
    await store.retireCurrentAction(operation.operationId, action);
    dependencies.crash?.('after-resolution-action-pointer');
    return envelopeFrom(request, updated, metadata, null);
  }
  if (
    operation.lifecycleOperation === 'recreate' &&
    action.semanticOperation === 'search-duplicates'
  ) {
    const duplicateOutcome = parseDuplicateSearchOutcome(observation);
    if (duplicateOutcome === 'found-existing') {
      if (!observation.outcome.identity) {
        throw new Error('Found-existing duplicate evidence requires identity.');
      }
    } else if (duplicateOutcome !== 'no-match') {
      const updated = await store.transitionOperation(
        operation.operationId,
        operation.state,
        {
          state: 'blocked',
          updatedAt: observation.observedAt,
          appendObservation: {
            observedAt: observation.observedAt,
            classification: 'none',
            evidenceDigest: semanticDigest(observation),
            actionDigest: action.actionDigest,
          },
          outcome: {
            classification: 'blocked',
            message: `duplicate search ${duplicateOutcome}`,
            verifiedAt: null,
          },
          retryDisposition: 'safe-before-attempt',
        },
      );
      dependencies.crash?.('after-resolution-observation-journal');
      await store.retireCurrentAction(operation.operationId, action);
      dependencies.crash?.('after-resolution-action-pointer');
      return envelopeFrom(request, updated, metadata, null);
    }
    if (duplicateOutcome === 'found-existing') {
      const identity = observation.outcome.identity!;
      const readAction = buildExternalAction({
        operationId: operation.operationId,
        stepId: `${operation.operationId}_duplicate_read`,
        provider: operation.provider,
        semanticOperation: 'read',
        context: operation.providerContext,
        intent: { stableId: identity.stableId },
        expectedObservation: {
          fields: ['title', 'description', 'priority', 'status'],
          requireIdentity: true,
          stableId: identity.stableId,
          capabilityEvidenceDigest: operation.selectedExecution!.evidenceDigest,
        },
        persistedPreview: {},
      });
      await store.writeActionEvidence(operation.operationId, readAction);
      const updated: RemoteOperationRecord = {
        ...operation,
        state: 'pending',
        reason: {
          code: 'recreate-found-existing-readback-required',
          message: 'Authoritative replacement read-back is required.',
        },
        observations: [
          ...operation.observations,
          {
            observedAt: observation.observedAt,
            classification: 'none',
            evidenceDigest: semanticDigest(observation),
            actionDigest: action.actionDigest,
          },
        ],
        updatedAt: observation.observedAt,
      };
      await store.updateOperation(updated);
      dependencies.crash?.('after-resolution-observation-journal');
      await store.retireCurrentAction(operation.operationId, action);
      dependencies.crash?.('after-resolution-action-pointer');
      await store.writeCurrentAction(operation.operationId, readAction);
      return envelopeFrom(request, updated, metadata, readAction);
    } else {
      if (
        !operation.selectedExecution?.semanticCapabilities.includes('create')
      ) {
        throw new Error(
          'Pinned resolution capability cannot create a replacement.',
        );
      }
      const effective = await effectivePolicyForBinding(
        request.projectRoot,
        metadata,
      );
      const policyEvidence = resolutionPolicyEvidence(
        effective,
        metadata,
        'recreate',
      );
      const projection = planRecreateNewRecordProjection({
        metadata,
        state,
        descriptionMode: effective.description,
        priorityMapping: resolveRecreatePriorityPolicy(metadata).enabled,
      });
      const safety = assessOutboundProjectionSafety(projection, {
        assessedAt: dependencies.now(),
      });
      if (safety.verdict !== 'safe') {
        throw new Error(
          'Recreate create-substep is blocked by outbound safety.',
        );
      }
      const stepId = `${operation.operationId}_create`;
      const preimage = resolutionCreatePreimage(metadata, state);
      const previewDigest = semanticDigest({
        bindingId: metadata.bindingId,
        target: metadata.target,
        policyDigest: semanticDigest(policyEvidence),
        projectionDigest: safety.projectionDigest,
        safetyResultDigest: safety.resultDigest,
        capabilityEvidenceDigest: operation.selectedExecution.evidenceDigest,
        provenanceToken: metadata.provenanceToken,
        preimage: semanticDigest(preimage),
      });
      const createAction = buildExternalAction({
        operationId: operation.operationId,
        stepId,
        provider: operation.provider,
        semanticOperation: 'create',
        context: operation.providerContext,
        intent: {
          target: {
            kind: metadata.target.kind,
            id: metadata.target.id,
            scope: metadata.target.scope,
          },
          fields: projection,
          provenanceToken: metadata.provenanceToken,
        },
        expectedObservation: {
          fields: Object.keys(projection),
          requireIdentity: true,
          stableId: null,
          capabilityEvidenceDigest: operation.selectedExecution.evidenceDigest,
        },
        persistedPreview: {
          projectionDigest: safety.projectionDigest,
          safetyResultDigest: safety.resultDigest,
        },
        projection,
        outboundSafety: safety,
      });
      await store.writeActionEvidence(operation.operationId, createAction);
      const now = dependencies.now();
      let updated: RemoteOperationRecord = {
        ...operation,
        state: 'planned',
        preview: {
          ...operation.preview,
          digest: previewDigest,
          revisionDigest: state.snapshot?.revision.contentHash ?? 'unobserved',
          revisionEvidence: revisionEvidenceFromState(state),
          policyDigest: semanticDigest(policyEvidence),
          projectionDigest: safety.projectionDigest,
          safetyResultDigest: safety.resultDigest,
        },
        descriptionMode: effective.description,
        observations: [
          ...operation.observations,
          {
            observedAt: observation.observedAt,
            classification: 'none',
            evidenceDigest: semanticDigest(observation),
            actionDigest: action.actionDigest,
          },
        ],
        reason: {
          code: 'recreate-create-approval-required',
          message:
            'Fresh approval of the exact gated create substep is required.',
        },
        approval: null,
        retryDisposition: 'safe-before-attempt',
        updatedAt: now,
      };
      updated = {
        ...updated,
        approvalPreview: resolutionCreateApprovalPreview(updated, createAction),
      };
      await store.updateOperation(updated);
      dependencies.crash?.('after-resolution-observation-journal');
      await store.retireCurrentAction(operation.operationId, action);
      dependencies.crash?.('after-resolution-action-pointer');
      const envelope = approvalPreviewEnvelope(request, updated, metadata);
      return {
        ...envelope,
        recovery: [
          ...envelope.recovery,
          {
            code: 'recreate-create-substep-approval-required',
            instruction: `Approve exact recreate create-substep preview ${previewDigest} before action handoff.`,
          },
        ],
      };
    }
  }
  if (!observation.outcome.identity) {
    throw new Error('Resolution observation lacks verified identity evidence.');
  }
  if (
    action.semanticOperation === 'read' &&
    operation.lifecycleOperation === 'recreate' &&
    operation.verificationHandoff
  ) {
    const createEvidence = await store.readAction(
      operation.operationId,
      `${operation.operationId}_create`,
    );
    const expected = createEvidence?.intent.fields as
      | Record<string, unknown>
      | undefined;
    if (
      !expected ||
      Object.entries(expected).some(
        ([field, value]) => observation.outcome.fields[field] !== value,
      )
    ) {
      throw new Error(
        'Recreate authoritative read-back does not match the gated projection.',
      );
    }
  }
  if (action.semanticOperation === 'create') {
    if (!operation.selectedExecution?.semanticCapabilities.includes('read')) {
      throw new Error(
        'Pinned recreate capability cannot perform authoritative read-back.',
      );
    }
    const readAction = buildExternalAction({
      operationId: operation.operationId,
      stepId: durableId('resolution_verify', dependencies.randomId()),
      provider: operation.provider,
      semanticOperation: 'read',
      context: operation.providerContext,
      intent: { stableId: observation.outcome.identity.stableId },
      expectedObservation: {
        fields: ['title', 'description', 'priority', 'status'],
        requireIdentity: true,
        stableId: observation.outcome.identity.stableId,
        capabilityEvidenceDigest:
          operation.selectedExecution?.evidenceDigest ??
          observation.capabilityEvidenceDigest,
      },
      persistedPreview: {},
    });
    await store.writeActionEvidence(operation.operationId, readAction);
    const updated: RemoteOperationRecord = {
      ...operation,
      state: 'verification-pending',
      currentAction: readAction as NonNullable<
        RemoteOperationRecord['currentAction']
      >,
      verificationHandoff: {
        acceptedMutation: {
          actionDigest: action.actionDigest,
          observedAt: observation.observedAt,
          evidenceDigest: semanticDigest(observation),
          stableId: observation.outcome.identity.stableId,
        },
        verificationAction: readAction as NonNullable<
          RemoteOperationRecord['verificationHandoff']
        >['verificationAction'],
      },
      attempts: operation.attempts.map((attempt) =>
        attempt.attemptId === action.stepId
          ? {
              ...attempt,
              completedAt: observation.observedAt,
              receiptDigest: semanticDigest(observation),
            }
          : attempt,
      ),
      observations: [
        ...operation.observations,
        {
          observedAt: observation.observedAt,
          classification: 'committed',
          evidenceDigest: semanticDigest(observation),
          actionDigest: action.actionDigest,
        },
      ],
      updatedAt: observation.observedAt,
    };
    await store.updateOperation(updated);
    await store.retireCurrentAction(operation.operationId, action);
    return envelopeFrom(request, updated, metadata, readAction);
  }
  const replacement = {
    identity: {
      stableId: observation.outcome.identity.stableId,
      context: operation.providerContext,
      aliases: observation.outcome.identity.aliases.map((value) => ({
        kind: 'display' as const,
        value,
      })),
    },
    verifiedAt: observation.observedAt,
    evidenceDigest: semanticDigest(observation),
  };
  if (
    action.semanticOperation === 'read' &&
    action.expectedObservation.stableId !== replacement.identity.stableId
  ) {
    throw new Error(
      'Relink observation does not match the approved replacement.',
    );
  }
  const now = dependencies.now();
  const nextIdentity: RemoteBindingMetadata['remoteIdentity'] = {
    stableId: replacement.identity.stableId,
    context: operation.providerContext,
    aliases: replacement.identity.aliases,
  };
  const nextMetadata: RemoteBindingMetadata = {
    ...metadata,
    remoteIdentity: nextIdentity,
    identityHistory: [
      ...metadata.identityHistory,
      {
        provider: metadata.provider,
        identity: metadata.remoteIdentity,
        replacedAt: now,
        replacedByOperationId: operation.operationId,
      },
    ],
    lifecycle: 'active',
    updatedAt: now,
  };
  const snapshot = snapshotFromObservation({
    snapshotId: durableId('snap', operation.operationId),
    bindingId: metadata.bindingId,
    provider: metadata.provider,
    context: operation.providerContext,
    identity: nextIdentity,
    observation,
    allowedExtensionKeys: action.expectedObservation.extensionFields ?? [],
  });
  const finalState: RemoteBindingState = {
    ...state,
    metadataUpdatedAt: now,
    snapshot,
    baseline: baselineFromSnapshot({
      snapshot,
      operationId: operation.operationId,
      localProjectionRevision: state.localProjection.sourceRevision,
      agreedAt: now,
      descriptionMode: 'replace',
    }),
    contentRedacted: snapshot.contentRedacted,
    lifecycle: 'active',
    lifecycleCondition: 'active',
    updatedAt: now,
  };
  if (!state.snapshot) {
    throw new Error(
      'Resolution replacement requires the complete former snapshot.',
    );
  }
  const resolutionEvidence = {
    schemaVersion: 1 as const,
    formerSnapshot: state.snapshot,
    replacementSnapshot: snapshot,
    journalDigest: semanticDigest({
      operationId: operation.operationId,
      lifecycleOperation: operation.lifecycleOperation,
      observationDigest: semanticDigest(observation),
      formerSnapshot: state.snapshot,
      replacementSnapshot: snapshot,
    }),
  };
  return stageAndResumeMaterialization({
    request,
    operation,
    store,
    dependencies,
    observationEvidence: {
      observedAt: observation.observedAt,
      classification: 'none',
      evidenceDigest: semanticDigest(observation),
      actionDigest: action.actionDigest,
    },
    verification: [
      {
        field: 'former-snapshot',
        expectedHash: semanticDigest(state.snapshot),
        observedHash: semanticDigest(state.snapshot),
        status: 'verified',
      },
      {
        field: 'replacement-snapshot',
        expectedHash: semanticDigest(snapshot),
        observedHash: semanticDigest(snapshot),
        status: 'verified',
      },
    ],
    plan: {
      kind: 'update',
      metadata: nextMetadata,
      finalState,
      resolutionEvidence,
      retireAction: {
        stepId: action.stepId,
        actionDigest: action.actionDigest,
      },
      association:
        metadata.target.kind === 'backlog'
          ? {
              provider: metadata.provider,
              ref:
                replacement.identity.aliases[0]?.value ??
                replacement.identity.stableId,
              bindingId: metadata.bindingId,
              target: metadata.target,
              seedContent: null,
            }
          : null,
    },
  });
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

function resolutionCreatePreimage(
  metadata: RemoteBindingMetadata,
  state: RemoteBindingState,
): Record<string, unknown> {
  return {
    bindingId: metadata.bindingId,
    provider: metadata.provider,
    target: metadata.target,
    remoteIdentity: metadata.remoteIdentity,
    purposes: metadata.purposes,
    policyRestrictions: metadata.policyRestrictions,
    publicationProjection: metadata.publicationProjection,
    provenanceToken: metadata.provenanceToken,
    lifecycle: metadata.lifecycle,
    localProjection: state.localProjection,
    snapshot: state.snapshot,
    baseline: state.baseline,
    stateLifecycle: state.lifecycle,
    lifecycleCondition: state.lifecycleCondition,
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
    approvalPreview: publicApprovalPreview(
      operation.operationId,
      operation.approvalPreview!,
      operation.authority?.effective ?? 'user-approved',
      operation.authority?.sourceDigest ?? 'unbound-authority',
      operation.preview.revisionDigest,
    ),
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

function publicApprovalPreview(
  operationId: string,
  preview: NonNullable<RemoteOperationRecord['approvalPreview']>,
  authority: string,
  authorityEvidenceDigest: string,
  revisionDigest: string,
): NonNullable<RemoteCommandEnvelope['approvalPreview']> {
  if (!preview.revisionEvidence) {
    throw new Error(
      'Persisted approval preview lacks digest-bound revision freshness evidence.',
    );
  }
  return {
    operationId,
    digest: preview.digest,
    operationClass: preview.operationClass,
    fieldMask: preview.fieldMask,
    renderedFields: preview.renderedFields,
    authority,
    componentDigests: {
      target: preview.componentDigests.target,
      baseline: preview.componentDigests.baseline,
      capability: preview.componentDigests.capability,
      authority: authorityEvidenceDigest,
      policy: preview.componentDigests.policy,
      projection: preview.componentDigests.projection,
      outboundSafety: preview.componentDigests.outboundSafety,
    },
    revision: {
      digest: revisionDigest,
      evidenceDigest: preview.componentDigests.revision,
      ...preview.revisionEvidence,
    },
  };
}

function persistedBindingPreview(
  preview: NonNullable<RemoteOperationRecord['approvalPreview']>,
): BindingPreview {
  if (
    !preview.renderedFields.title ||
    !preview.renderedFields.description ||
    !preview.renderedFields.priority
  ) {
    throw new Error(
      'Persisted approval preview has incomplete rendered fields.',
    );
  }
  return preview as BindingPreview;
}

function revisionEvidenceFromState(
  state: RemoteBindingState | null,
): PersistedApprovalPreview['revisionEvidence'] {
  return state?.snapshot
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

function planRecreateNewRecordProjection(input: {
  metadata: RemoteBindingMetadata;
  state: RemoteBindingState;
  descriptionMode: 'none' | 'managed-section' | 'replace';
  priorityMapping: boolean;
}): OutboundProjection {
  const purpose = composePurposePolicies(input.metadata.purposes);
  const candidate = buildCreateProjection(
    input.state.localProjection,
    input.descriptionMode,
    input.metadata.bindingId,
  );
  const projection: OutboundProjection = {};
  if (purpose.fields.title.includes('outbound')) {
    projection.title = candidate.title;
  }
  if (
    input.descriptionMode !== 'none' &&
    purpose.fields.description.includes('outbound')
  ) {
    projection.description = candidate.description;
  }
  if (input.priorityMapping && purpose.fields.priority.includes('outbound')) {
    projection.priority = candidate.priority;
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
  approval?: RemoteOperationRecord['approval'];
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
      ...(input.approval !== undefined ? { approval: input.approval } : {}),
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

  if (plan.resolutionEvidence) {
    const evidence = plan.resolutionEvidence;
    const observationDigest = operation.observations.at(-1)?.evidenceDigest;
    if (
      !observationDigest ||
      !isDeepStrictEqual(
        evidence.replacementSnapshot,
        plan.finalState.snapshot,
      ) ||
      evidence.journalDigest !==
        semanticDigest({
          operationId: operation.operationId,
          lifecycleOperation: operation.lifecycleOperation,
          observationDigest,
          formerSnapshot: evidence.formerSnapshot,
          replacementSnapshot: evidence.replacementSnapshot,
        })
    ) {
      throw new Error(
        'Resolution snapshot evidence is incomplete or mismatched.',
      );
    }
  }
  if (plan.retireAction && !completed().has('action-pointer')) {
    const evidence = await store.readAction(
      operation.operationId,
      plan.retireAction.stepId,
    );
    if (!evidence || evidence.actionDigest !== plan.retireAction.actionDigest) {
      throw new Error('Resolution action evidence is missing or mismatched.');
    }
    await store.retireCurrentActionPointerIfPresent(
      operation.operationId,
      evidence,
    );
    await complete(
      'action-pointer',
      plan.retireAction,
      'after-resolution-action-pointer',
    );
  }

  if (plan.association?.seedContent && !completed().has('target')) {
    await writeSeedTarget(
      request.projectRoot,
      plan.association.target,
      plan.association.seedContent,
      operation.operationId,
    );
    await complete('target', plan.association.seedContent, 'after-target');
  }
  if (!completed().has('metadata')) {
    if (plan.kind === 'update') {
      await store.updateBindingMetadata(plan.metadata);
    } else if (plan.kind === 'create') {
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
    if (plan.kind === 'update') {
      await store.writeBindingState(initial);
      state = initial;
    } else if (!state) {
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
    if (plan.kind === 'update') {
      await writeResolutionAssociation(
        request.projectRoot,
        plan.association.target.path,
        operation.bindingId,
        {
          bindingId:
            plan.association.resolutionBindingId ?? plan.association.bindingId,
          referenceRef: plan.association.resolutionReferenceRef ?? null,
        },
        plan.metadata,
      );
    } else {
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
    }
    await complete('association', plan.association, 'after-association');
  }
  const terminal = await store.transitionOperation(
    operation.operationId,
    operation.state,
    {
      state: plan.terminal?.state ?? 'verified',
      updatedAt: dependencies.now(),
      outcome: {
        classification: plan.terminal?.state ?? 'verified',
        message:
          plan.terminal?.message ??
          'authoritative read-back and local materialization verified',
        verifiedAt: plan.terminal?.verifiedAt ?? operation.outcome.verifiedAt,
      },
      lastSafeStep:
        (plan.terminal?.state ?? 'verified') === 'verified'
          ? 'complete'
          : 'verification-pending',
      retryDisposition:
        (plan.terminal?.state ?? 'verified') === 'verified'
          ? 'not-applicable'
          : 'reconcile-required',
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
