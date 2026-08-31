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
