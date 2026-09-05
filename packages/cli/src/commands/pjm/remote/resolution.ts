import { semanticDigest, type RemoteProvider } from './provider';

export interface ResolutionIdentity {
  stableId: string;
  context: Record<string, string | undefined>;
  aliases: Array<{ kind: 'url' | 'display' | 'key'; value: string }>;
}

export interface ResolutionBinding {
  bindingId: string;
  provider: RemoteProvider;
  targetRef: string;
  remoteIdentity: ResolutionIdentity;
  identityHistory: Array<{
    provider: RemoteProvider;
    identity: ResolutionIdentity;
    replacedAt: string;
    replacedByOperationId: string;
  }>;
  lifecycle: 'active' | 'blocked' | 'tombstoned';
  snapshotDigest: string | null;
}

export interface ResolutionApproval {
  previewDigest: string;
  approvedAt: string;
  source: string;
}

export interface ResolutionJournal {
  schemaVersion: 1;
  operationId: string;
  bindingId: string;
  kind: 'relink' | 'detach' | 'recreate';
  previewDigest: string;
  state: 'pending' | 'blocked' | 'partial' | 'uncertain' | 'complete';
  bindingTransitionCompleted: boolean;
  associationCompleted: boolean;
  resultingBinding: ResolutionBinding | null;
  searchCompleted?: boolean;
  createIntentPersisted?: boolean;
  createAttempted?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ResolutionStore {
  findByIdentity(
    provider: RemoteProvider,
    identity: ResolutionIdentity,
  ): Promise<string | null>;
  writeBinding(binding: ResolutionBinding): Promise<void>;
  writeAssociation(input: {
    targetRef: string;
    bindingId: string | null;
    referenceRef: string | null;
  }): Promise<void>;
  readJournal(operationId: string): Promise<ResolutionJournal | null>;
  writeJournal(journal: ResolutionJournal): Promise<void>;
}

interface CommonResolutionInput {
  operationId: string;
  binding: ResolutionBinding;
  now: string;
  previewDigest: string;
  approval?: ResolutionApproval;
  crash?: (point: 'after-binding' | 'after-association') => void;
}

export async function relinkBinding(
  input: CommonResolutionInput & {
    replacement: {
      identity: ResolutionIdentity;
      verifiedAt: string;
      evidenceDigest: string;
    };
  },
  store: ResolutionStore,
): Promise<{ binding: ResolutionBinding; journal: ResolutionJournal }> {
  assertFreshApproval(input);
  assertVerifiedReplacement(input.replacement);
  const duplicate = await store.findByIdentity(
    input.binding.provider,
    input.replacement.identity,
  );
  if (duplicate && duplicate !== input.binding.bindingId) {
    throw new Error(`Replacement identity is already bound by '${duplicate}'.`);
  }
  let journal = await store.readJournal(input.operationId);
  if (!journal) {
    journal = createJournal(input, 'relink');
    await store.writeJournal(journal);
  }
  if (!journal.bindingTransitionCompleted) {
    const nextBinding: ResolutionBinding = {
      ...input.binding,
      remoteIdentity: structuredClone(input.replacement.identity),
      identityHistory: [
        ...input.binding.identityHistory,
        {
          provider: input.binding.provider,
          identity: structuredClone(input.binding.remoteIdentity),
          replacedAt: input.now,
          replacedByOperationId: input.operationId,
        },
      ],
      lifecycle: 'active',
    };
    await store.writeBinding(nextBinding);
    journal = {
      ...journal,
      state: 'partial',
      bindingTransitionCompleted: true,
      resultingBinding: nextBinding,
      updatedAt: input.now,
    };
    await store.writeJournal(journal);
    input.crash?.('after-binding');
  }
  if (!journal.associationCompleted) {
    await store.writeAssociation({
      targetRef: input.binding.targetRef,
      bindingId: input.binding.bindingId,
      referenceRef: null,
    });
    journal = completeAssociation(journal, input.now);
    await store.writeJournal(journal);
    input.crash?.('after-association');
  }
  return { binding: journal.resultingBinding!, journal };
}

export async function detachBinding(
  input: CommonResolutionInput & { keepReference: boolean },
  store: ResolutionStore,
): Promise<{ binding: ResolutionBinding; journal: ResolutionJournal }> {
  assertFreshApproval(input);
  let journal = await store.readJournal(input.operationId);
  if (!journal) {
    journal = createJournal(input, 'detach');
    await store.writeJournal(journal);
  }
  if (!journal.bindingTransitionCompleted) {
    const nextBinding: ResolutionBinding = {
      ...input.binding,
      lifecycle: 'tombstoned',
    };
    await store.writeBinding(nextBinding);
    journal = {
      ...journal,
      state: 'partial',
      bindingTransitionCompleted: true,
      resultingBinding: nextBinding,
      updatedAt: input.now,
    };
    await store.writeJournal(journal);
    input.crash?.('after-binding');
  }
  if (!journal.associationCompleted) {
    await store.writeAssociation({
      targetRef: input.binding.targetRef,
      bindingId: null,
      referenceRef: input.keepReference
        ? `${input.binding.provider}:${input.binding.remoteIdentity.stableId}`
        : null,
    });
    journal = completeAssociation(journal, input.now);
    await store.writeJournal(journal);
    input.crash?.('after-association');
  }
  return { binding: journal.resultingBinding!, journal };
}

export type DuplicateSearchOutcome =
  | {
      kind: 'found-existing';
      replacement: {
        identity: ResolutionIdentity;
        verifiedAt: string;
        evidenceDigest: string;
      };
    }
  | { kind: 'search-unavailable' }
  | { kind: 'ambiguous'; candidates: string[] }
  | { kind: 'no-match' };

export type RecreateAttemptOutcome =
  | {
      kind: 'committed';
      replacement: {
        identity: ResolutionIdentity;
        verifiedAt: string;
        evidenceDigest: string;
      };
    }
  | { kind: 'uncertain' }
  | { kind: 'rejected' };

export async function recreateBinding(
  input: CommonResolutionInput & {
    searchDuplicates(): Promise<DuplicateSearchOutcome>;
    createReplacement(): Promise<RecreateAttemptOutcome>;
  },
  store: ResolutionStore,
): Promise<{
  status: 'verified' | 'blocked' | 'uncertain';
  binding: ResolutionBinding;
  journal: ResolutionJournal;
}> {
  assertFreshApproval(input);
  let journal = await store.readJournal(input.operationId);
  if (journal?.createAttempted && !journal.bindingTransitionCompleted) {
    return {
      status: 'uncertain',
      binding: { ...input.binding, lifecycle: 'blocked' },
      journal,
    };
  }
  if (!journal) {
    journal = createJournal(input, 'recreate');
    await store.writeJournal(journal);
  }
  const search = await input.searchDuplicates();
  journal = {
    ...journal,
    searchCompleted: true,
    updatedAt: input.now,
  };
  await store.writeJournal(journal);
  if (search.kind === 'search-unavailable' || search.kind === 'ambiguous') {
    journal = { ...journal, state: 'blocked', updatedAt: input.now };
    await store.writeJournal(journal);
    return { status: 'blocked', binding: input.binding, journal };
  }

  let replacement:
    | Extract<DuplicateSearchOutcome, { kind: 'found-existing' }>['replacement']
    | null = null;
  if (search.kind === 'found-existing') {
    replacement = search.replacement;
  } else {
    journal = {
      ...journal,
      createIntentPersisted: true,
      updatedAt: input.now,
    };
    await store.writeJournal(journal);
    journal = { ...journal, createAttempted: true, updatedAt: input.now };
    await store.writeJournal(journal);
    const create = await input.createReplacement();
    if (create.kind !== 'committed') {
      journal = {
        ...journal,
        state: create.kind === 'uncertain' ? 'uncertain' : 'blocked',
        updatedAt: input.now,
      };
      await store.writeJournal(journal);
      return {
        status: create.kind === 'uncertain' ? 'uncertain' : 'blocked',
        binding: { ...input.binding, lifecycle: 'blocked' },
        journal,
      };
    }
    replacement = create.replacement;
  }

  assertVerifiedReplacement(replacement);
  const duplicate = await store.findByIdentity(
    input.binding.provider,
    replacement.identity,
  );
  if (duplicate && duplicate !== input.binding.bindingId) {
    throw new Error(`Replacement identity is already bound by '${duplicate}'.`);
  }
  if (!journal.bindingTransitionCompleted) {
    const nextBinding: ResolutionBinding = {
      ...input.binding,
      remoteIdentity: structuredClone(replacement.identity),
      identityHistory: [
        ...input.binding.identityHistory,
        {
          provider: input.binding.provider,
          identity: structuredClone(input.binding.remoteIdentity),
          replacedAt: input.now,
          replacedByOperationId: input.operationId,
        },
      ],
      lifecycle: 'active',
    };
    await store.writeBinding(nextBinding);
    journal = {
      ...journal,
      state: 'partial',
      bindingTransitionCompleted: true,
      resultingBinding: nextBinding,
      updatedAt: input.now,
    };
    await store.writeJournal(journal);
    input.crash?.('after-binding');
  }
  if (!journal.associationCompleted) {
    await store.writeAssociation({
      targetRef: input.binding.targetRef,
      bindingId: input.binding.bindingId,
      referenceRef: null,
    });
    journal = completeAssociation(journal, input.now);
    await store.writeJournal(journal);
    input.crash?.('after-association');
  }
  return { status: 'verified', binding: journal.resultingBinding!, journal };
}

function assertFreshApproval(input: CommonResolutionInput): void {
  const approval = input.approval;
  const age = approval
    ? Date.parse(input.now) - Date.parse(approval.approvedAt)
    : Number.POSITIVE_INFINITY;
  if (
    !approval ||
    approval.previewDigest !== input.previewDigest ||
    !Number.isFinite(age) ||
    age < 0 ||
    age > 5 * 60 * 1_000
  ) {
    throw new Error('Resolution requires fresh approval of the exact preview.');
  }
}

function assertVerifiedReplacement(replacement: {
  identity: ResolutionIdentity;
  verifiedAt: string;
  evidenceDigest: string;
}): void {
  if (
    replacement.identity.stableId.length === 0 ||
    replacement.evidenceDigest.length === 0 ||
    !Number.isFinite(Date.parse(replacement.verifiedAt))
  ) {
    throw new Error('Relink requires a verified stable replacement identity.');
  }
}

function createJournal(
  input: CommonResolutionInput,
  kind: ResolutionJournal['kind'],
): ResolutionJournal {
  return {
    schemaVersion: 1,
    operationId: input.operationId,
    bindingId: input.binding.bindingId,
    kind,
    previewDigest: input.previewDigest,
    state: 'pending',
    bindingTransitionCompleted: false,
    associationCompleted: false,
    resultingBinding: null,
    createdAt: input.now,
    updatedAt: input.now,
  };
}

function completeAssociation(
  journal: ResolutionJournal,
  updatedAt: string,
): ResolutionJournal {
  return {
    ...journal,
    state: 'complete',
    associationCompleted: true,
    updatedAt,
  };
}

export function buildResolutionPreviewDigest(input: {
  kind: ResolutionJournal['kind'];
  binding: ResolutionBinding;
  replacement?: ResolutionIdentity;
  keepReference?: boolean;
}): string {
  return semanticDigest(input);
}
