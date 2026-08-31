import {
  buildExternalAction,
  type ExternalActionEnvelope,
} from './external-action';
import {
  selectHostExecution,
  type HostCapabilityEvidence,
} from './host-execution';
import {
  requireCurrentOutboundSafety,
  type OutboundProjection,
  type OutboundProjectionSafetyResult,
} from './outbound-projection-safety';
import { validatePreviewApproval, type PreviewApproval } from './preview';
import {
  semanticDigest,
  type NormalizedRemoteIssue,
  type ProviderAdapter,
} from './provider';
import type { RemoteSnapshotRecord } from './schema';
import {
  sanitizeRemoteSnapshot,
  type SanitizableRemoteSnapshot,
} from './snapshot';

export interface LifecycleBinding {
  bindingId: string;
  provider: 'github' | 'linear' | 'jira';
  context: Record<string, string>;
  localTargetId: string;
  snapshot: RemoteSnapshotRecord | null;
  baseline: LifecycleBaseline | null;
}

export interface LifecycleBaseline {
  acceptedAt: string;
  fields: {
    title: string;
    description: string | null;
    priority: string | null;
  };
  localRevision: string;
  remoteRevisionDigest: string;
}

export interface LifecycleStore {
  readBinding(bindingId: string): Promise<LifecycleBinding | null>;
  commitRefresh(
    bindingId: string,
    snapshot: RemoteSnapshotRecord,
  ): Promise<void>;
  commitIntake(input: {
    binding: LifecycleBinding;
    snapshot: RemoteSnapshotRecord;
    baseline: LifecycleBaseline;
    mode: 'create' | 'enrich';
  }): Promise<void>;
}

export interface LifecycleReadProvider {
  adapter: ProviderAdapter;
  read(input: {
    provider: LifecycleBinding['provider'];
    context: Record<string, string>;
    stableId?: string;
  }): Promise<{
    observation: Parameters<ProviderAdapter['normalize']>[0];
    snapshot: SanitizableRemoteSnapshot;
    allowedExtensionKeys?: string[];
  }>;
}

export interface LifecycleDependencies {
  store: LifecycleStore;
  provider: LifecycleReadProvider;
  now(): string;
}

export async function refreshBinding(
  bindingId: string,
  dependencies: LifecycleDependencies,
): Promise<{ status: 'ok'; snapshot: RemoteSnapshotRecord }> {
  const binding = await requireBinding(bindingId, dependencies.store);
  const remote = await dependencies.provider.read({
    provider: binding.provider,
    context: binding.context,
  });
  const snapshot = normalizeSnapshot(
    binding,
    remote,
    dependencies.provider.adapter,
  );
  await dependencies.store.commitRefresh(binding.bindingId, snapshot);
  return { status: 'ok', snapshot };
}

export async function intakeRemoteIssue(
  input: {
    binding: Omit<LifecycleBinding, 'snapshot' | 'baseline'>;
    mode: 'create' | 'enrich';
    localRevision: string;
  },
  dependencies: LifecycleDependencies,
): Promise<{
  status: 'ok';
  snapshot: RemoteSnapshotRecord;
  baseline: LifecycleBaseline;
}> {
  const remote = await dependencies.provider.read({
    provider: input.binding.provider,
    context: input.binding.context,
  });
  const binding: LifecycleBinding = {
    ...input.binding,
    snapshot: null,
    baseline: null,
  };
  const snapshot = normalizeSnapshot(
    binding,
    remote,
    dependencies.provider.adapter,
  );
  const issue = dependencies.provider.adapter.normalize(remote.observation);
  const baseline: LifecycleBaseline = {
    acceptedAt: dependencies.now(),
    fields: {
      title: issue.title,
      description: issue.description,
      priority: issue.priority,
    },
    localRevision: input.localRevision,
    remoteRevisionDigest: issue.revisionDigest,
  };
  await dependencies.store.commitIntake({
    binding,
    snapshot,
    baseline,
    mode: input.mode,
  });
  return { status: 'ok', snapshot, baseline };
}

function normalizeSnapshot(
  binding: LifecycleBinding,
  remote: Awaited<ReturnType<LifecycleReadProvider['read']>>,
  adapter: ProviderAdapter,
): RemoteSnapshotRecord {
  if (adapter.provider !== binding.provider)
    throw new Error('Lifecycle provider adapter mismatch.');
  const issue: NormalizedRemoteIssue = adapter.normalize(remote.observation);
  if (issue.provider !== binding.provider)
    throw new Error('Lifecycle observation provider mismatch.');
  return sanitizeRemoteSnapshot(
    {
      ...remote.snapshot,
      bindingId: binding.bindingId,
      provider: binding.provider,
      issue: {
        title: issue.title,
        description: issue.description ?? '',
        priority: issue.priority,
        status: issue.status,
      },
    },
    { allowedExtensionKeys: remote.allowedExtensionKeys },
  );
}

async function requireBinding(
  bindingId: string,
  store: LifecycleStore,
): Promise<LifecycleBinding> {
  const binding = await store.readBinding(bindingId);
  if (!binding)
    throw new Error(`Remote binding '${bindingId}' does not exist.`);
  return binding;
}

export function baselineRevisionDigest(baseline: LifecycleBaseline): string {
  return semanticDigest(baseline);
}

export async function publishUnboundBinding<T>(
  input: T,
  dependencies: { createAndBind(value: T): Promise<unknown> },
): Promise<unknown> {
  return dependencies.createAndBind(input);
}

export interface ResolvedMutationAuthority {
  effective: 'read-only' | 'user-authorized' | 'user-approved' | 'autonomous';
  sourceDigest: string;
  instructionDigest?: string;
  approval?: PreviewApproval;
  activeWorkflow?: { workflowId: string; revision: string };
}

export type CurrentMutationInvocation =
  | { kind: 'interactive'; invocationId: string; evidenceDigest: string }
  | {
      kind: 'workflow';
      invocationId: string;
      workflowId: string;
      revision: string;
    };

export interface MutationLifecycleStore {
  persistPlanned(input: {
    operationId: string;
    bindingId: string;
    previewDigest: string;
    projectionDigest: string;
    safetyResultDigest: string;
    authority: ResolvedMutationAuthority;
  }): Promise<void>;
  markAttemptStarted(
    operationId: string,
    action: ExternalActionEnvelope,
    capability: HostCapabilityEvidence,
  ): Promise<void>;
  markTerminal(
    operationId: string,
    status: 'verified' | 'blocked' | 'uncertain' | 'rejected',
    evidenceDigest: string,
  ): Promise<void>;
}

export interface MutationLifecycleDependencies {
  store: MutationLifecycleStore;
  preRead(input: {
    binding: LifecycleBinding;
  }): Promise<{ revisionDigest: string }>;
  resolveCurrentAuthority(input: {
    binding: LifecycleBinding;
    operation: 'create' | 'update';
  }): Promise<ResolvedMutationAuthority>;
  currentInvocation(): Promise<CurrentMutationInvocation>;
  recomputeAfterPreRead(input: {
    binding: LifecycleBinding;
    operation: 'create' | 'update';
    revisionDigest: string;
  }): Promise<{
    projection: OutboundProjection;
    outboundSafety: OutboundProjectionSafetyResult;
    previewDigest: string;
    policyDigest: string;
    capabilityCandidates: HostCapabilityEvidence[];
  }>;
  now(): string;
  approvalMaxAgeMs: number;
  execute(action: ExternalActionEnvelope): Promise<{
    classification: 'committed' | 'not-committed' | 'unknown';
    evidenceDigest: string;
  }>;
  readBack(input: {
    binding: LifecycleBinding;
    action: ExternalActionEnvelope;
  }): Promise<{ fields: OutboundProjection; revisionDigest: string }>;
}

export interface PublishBindingInput {
  operationId: string;
  stepId: string;
  binding: LifecycleBinding;
  operation: 'create' | 'update';
  projection: OutboundProjection;
  outboundSafety: OutboundProjectionSafetyResult;
  preview: {
    digest: string;
    observedRevisionDigest: string;
    projectionDigest: string;
    safetyResultDigest: string;
    policyDigest: string;
    capabilityEvidenceDigest: string;
    createdAt: string;
  };
}

export async function publishBinding(
  input: PublishBindingInput,
  dependencies: MutationLifecycleDependencies,
): Promise<{
  status: 'verified' | 'blocked' | 'uncertain' | 'rejected';
  action?: ExternalActionEnvelope;
}> {
  requireCurrentOutboundSafety(input.projection, input.outboundSafety);
  if (
    input.preview.projectionDigest !== input.outboundSafety.projectionDigest ||
    input.preview.safetyResultDigest !== input.outboundSafety.resultDigest
  ) {
    throw new Error('Publish preview safety evidence is stale or mismatched.');
  }
  const preRead = await dependencies.preRead({ binding: input.binding });
  if (preRead.revisionDigest !== input.preview.observedRevisionDigest) {
    await dependencies.store.markTerminal(
      input.operationId,
      'blocked',
      semanticDigest(preRead),
    );
    return { status: 'blocked' };
  }
  const [authority, invocation, recomputed] = await Promise.all([
    dependencies.resolveCurrentAuthority({
      binding: input.binding,
      operation: input.operation,
    }),
    dependencies.currentInvocation(),
    dependencies.recomputeAfterPreRead({
      binding: input.binding,
      operation: input.operation,
      revisionDigest: preRead.revisionDigest,
    }),
  ]);
  assertResolvedAuthority(authority, invocation, input, dependencies);
  requireCurrentOutboundSafety(
    recomputed.projection,
    recomputed.outboundSafety,
  );
  if (
    semanticDigest(recomputed.projection) !==
      semanticDigest(input.projection) ||
    recomputed.outboundSafety.projectionDigest !==
      input.preview.projectionDigest ||
    recomputed.outboundSafety.resultDigest !==
      input.preview.safetyResultDigest ||
    recomputed.previewDigest !== input.preview.digest ||
    recomputed.policyDigest !== input.preview.policyDigest
  ) {
    throw new Error(
      'Mutation projection, safety, preview, or policy drifted after pre-read.',
    );
  }
  const selection = selectHostExecution({
    provider: input.binding.provider,
    context: input.binding.context,
    operation: input.operation,
    candidates: recomputed.capabilityCandidates,
    attemptStarted: false,
  });
  if (!selection.selected)
    throw new Error(`No current host capability: ${selection.reason}.`);
  if (
    selection.evidence.evidenceDigest !== input.preview.capabilityEvidenceDigest
  ) {
    throw new Error(
      'Host capability evidence drifted before mutation attempt.',
    );
  }
  await dependencies.store.persistPlanned({
    operationId: input.operationId,
    bindingId: input.binding.bindingId,
    previewDigest: input.preview.digest,
    projectionDigest: input.preview.projectionDigest,
    safetyResultDigest: input.preview.safetyResultDigest,
    authority,
  });
  const action = buildExternalAction({
    operationId: input.operationId,
    stepId: input.stepId,
    provider: input.binding.provider,
    semanticOperation: input.operation,
    context: input.binding.context,
    intent: {
      stableId: input.binding.snapshot?.identity.stableId ?? null,
      fields: recomputed.projection,
    },
    expectedObservation: {
      fields: Object.keys(input.projection),
      requireIdentity: true,
    },
    persistedPreview: input.preview,
    projection: recomputed.projection,
    outboundSafety: recomputed.outboundSafety,
  });
  await dependencies.store.markAttemptStarted(
    input.operationId,
    action,
    selection.evidence,
  );
  const attempt = await dependencies.execute(action);
  if (attempt.classification === 'not-committed') {
    await dependencies.store.markTerminal(
      input.operationId,
      'rejected',
      attempt.evidenceDigest,
    );
    return { status: 'rejected', action };
  }
  if (attempt.classification === 'unknown') {
    await dependencies.store.markTerminal(
      input.operationId,
      'uncertain',
      attempt.evidenceDigest,
    );
    return { status: 'uncertain', action };
  }
  try {
    const readback = await dependencies.readBack({
      binding: input.binding,
      action,
    });
    const verified = Object.entries(input.projection).every(
      ([field, value]) =>
        readback.fields[field as keyof OutboundProjection] === value,
    );
    const status = verified ? 'verified' : 'uncertain';
    await dependencies.store.markTerminal(
      input.operationId,
      status,
      semanticDigest(readback),
    );
    return { status, action };
  } catch {
    await dependencies.store.markTerminal(
      input.operationId,
      'uncertain',
      semanticDigest({ code: 'readback-unavailable' }),
    );
    return { status: 'uncertain', action };
  }
}

export async function reconcileRemoteBinding(
  input: PublishBindingInput & { conflicts: string[] },
  dependencies: MutationLifecycleDependencies,
): ReturnType<typeof publishBinding> {
  if (input.conflicts.length > 0) return { status: 'blocked' };
  return publishBinding(input, dependencies);
}

function assertResolvedAuthority(
  authority: ResolvedMutationAuthority,
  invocation: CurrentMutationInvocation,
  input: PublishBindingInput,
  dependencies: MutationLifecycleDependencies,
): void {
  if (authority.effective === 'read-only')
    throw new Error('Remote mutation is read-only.');
  if (
    authority.effective === 'user-authorized' &&
    (invocation.kind !== 'interactive' ||
      invocation.evidenceDigest !== authority.instructionDigest)
  ) {
    throw new Error(
      'Explicit user instruction does not authorize this mutation.',
    );
  }
  if (
    authority.effective === 'user-approved' &&
    (!authority.approval ||
      !validatePreviewApproval(
        {
          schemaVersion: 1,
          digest: input.preview.digest,
          bindingId: input.binding.bindingId,
          provider: input.binding.provider,
          operationClass:
            input.operation === 'create' ? 'create' : 'update-fields',
          fieldMask: Object.keys(input.projection) as Array<
            'title' | 'description' | 'priority'
          >,
          createdAt: input.preview.createdAt,
          componentDigests: {
            target: 'persisted',
            baseline: 'persisted',
            revision: input.preview.observedRevisionDigest,
            capability: input.preview.capabilityEvidenceDigest,
            policy: input.preview.policyDigest,
            projection: input.preview.projectionDigest,
            outboundSafety: input.preview.safetyResultDigest,
          },
          renderedFields: {
            title: { kind: 'hash', digest: 'persisted', bytes: 0 },
            description: { kind: 'hash', digest: 'persisted', bytes: 0 },
            priority: { kind: 'hash', digest: 'persisted', bytes: 0 },
          },
        },
        authority.approval,
        { now: dependencies.now(), maxAgeMs: dependencies.approvalMaxAgeMs },
      ).valid)
  ) {
    throw new Error('Fresh approval does not match the current preview.');
  }
  if (
    authority.effective === 'autonomous' &&
    (invocation.kind !== 'workflow' ||
      !authority.activeWorkflow ||
      invocation.workflowId !== authority.activeWorkflow.workflowId ||
      invocation.revision !== authority.activeWorkflow.revision)
  ) {
    throw new Error(
      'Autonomous mutation requires current active-workflow authority.',
    );
  }
}
