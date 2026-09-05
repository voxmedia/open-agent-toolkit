import { buildReviewedBatch, reduceReviewedBatchOutcomes } from './batch';
import { semanticDigest, type RemoteProvider } from './provider';
import type { RemoteBatchRecord, RemoteOperationRecord } from './schema';

export type CloseoutStepState = RemoteOperationRecord['state'];
export type CloseoutPurpose = 'source' | 'planning' | 'delivery' | 'reference';
export type CloseoutAuthority =
  | 'read-only'
  | 'user-approved'
  | 'user-authorized'
  | 'autonomous';

export interface CloseoutStepPlan {
  authority: CloseoutAuthority;
  sourceDigest: string;
  previewDigest: string;
}

export interface CloseoutBindingPlan {
  bindingId: string;
  operationId: string;
  provider: RemoteProvider;
  purposes: readonly CloseoutPurpose[];
  annotation?: CloseoutStepPlan;
  transition?: CloseoutStepPlan;
  providerAutomation?: boolean;
}

export interface CloseoutSubstep {
  stepId: string;
  kind: 'annotation' | 'transition';
  state: CloseoutStepState;
  previewDigest: string;
  authority: CloseoutAuthority;
  authoritySourceDigest: string;
  approvalRequirement: 'none' | 'explicit-instruction' | 'fresh-approval';
  dependsOn: string[];
}

export interface CloseoutJournal {
  schemaVersion: 1;
  operationId: string;
  bindingId: string;
  provider: RemoteProvider;
  projectPath: string;
  previewDigest: string;
  state: CloseoutStepState;
  substeps: CloseoutSubstep[];
  createdAt: string;
  updatedAt: string;
}

export interface CloseoutStore {
  readOperation(operationId: string): Promise<CloseoutJournal | null>;
  writeOperation(operation: CloseoutJournal): Promise<void>;
  writeBatch(batch: RemoteBatchRecord): Promise<void>;
}

export interface CloseoutInput {
  batchId: string;
  projectPath: string;
  plans: readonly CloseoutBindingPlan[];
  now: string;
  approval?: RemoteBatchRecord['approval'];
}

export interface CloseoutResult {
  batch: RemoteBatchRecord;
  operations: CloseoutJournal[];
}

export async function closeoutBindings(
  input: CloseoutInput,
  store: CloseoutStore,
): Promise<CloseoutResult> {
  assertUniqueBindings(input.plans);
  const operations: CloseoutJournal[] = [];
  for (const plan of input.plans) {
    const operation = buildCloseoutJournal(plan, input.projectPath, input.now);
    await store.writeOperation(operation);
    operations.push(operation);
  }

  let batch = buildReviewedBatch({
    batchId: input.batchId,
    lifecycleOperation: 'closeout',
    members: operations.map((operation) => ({
      bindingId: operation.bindingId,
      operationId: operation.operationId,
      bindingPreviewDigest: operation.previewDigest,
    })),
    authority: {
      effective: strictestAuthority(
        operations.flatMap((operation) =>
          operation.substeps.map((step) => step.authority),
        ),
      ),
      sourceDigest: semanticDigest(
        operations.flatMap((operation) =>
          operation.substeps.map((step) => step.authoritySourceDigest),
        ),
      ),
    },
    approval: input.approval,
    createdAt: input.now,
  });
  batch = reduceReviewedBatchOutcomes(
    batch,
    Object.fromEntries(
      operations.map((operation) => [operation.operationId, operation.state]),
    ),
    input.now,
  );
  await store.writeBatch(batch);
  return { batch, operations };
}

function buildCloseoutJournal(
  plan: CloseoutBindingPlan,
  projectPath: string,
  now: string,
): CloseoutJournal {
  if (plan.providerAutomation && plan.transition) {
    throw new Error(
      `Binding '${plan.bindingId}' cannot combine provider automation with an OAT transition.`,
    );
  }
  const purposes = new Set(plan.purposes);
  const substeps: CloseoutSubstep[] = [];
  if (plan.annotation && (purposes.has('source') || purposes.has('planning'))) {
    substeps.push(buildSubstep(plan, 'annotation', plan.annotation, []));
  }
  if (plan.transition && purposes.has('planning')) {
    substeps.push(
      buildSubstep(
        plan,
        'transition',
        plan.transition,
        substeps.map((step) => step.stepId),
      ),
    );
  }
  const state = plan.providerAutomation
    ? 'verified'
    : substeps.length === 0
      ? 'blocked'
      : reduceCloseoutState(substeps);
  const previewDigest = semanticDigest({
    bindingId: plan.bindingId,
    operationId: plan.operationId,
    provider: plan.provider,
    projectPath,
    purposes: [...purposes].sort(),
    providerAutomation: plan.providerAutomation ?? false,
    substeps,
  });
  return {
    schemaVersion: 1,
    operationId: plan.operationId,
    bindingId: plan.bindingId,
    provider: plan.provider,
    projectPath,
    previewDigest,
    state,
    substeps,
    createdAt: now,
    updatedAt: now,
  };
}

function buildSubstep(
  plan: CloseoutBindingPlan,
  kind: CloseoutSubstep['kind'],
  step: CloseoutStepPlan,
  dependsOn: string[],
): CloseoutSubstep {
  return {
    stepId: `${plan.operationId}_${kind}`,
    kind,
    state: step.authority === 'read-only' ? 'blocked' : 'pending',
    previewDigest: step.previewDigest,
    authority: step.authority,
    authoritySourceDigest: step.sourceDigest,
    approvalRequirement:
      step.authority === 'user-approved'
        ? 'fresh-approval'
        : step.authority === 'user-authorized'
          ? 'explicit-instruction'
          : 'none',
    dependsOn,
  };
}

export function reduceCloseoutState(
  substeps: readonly CloseoutSubstep[],
): CloseoutStepState {
  const states = substeps.map((step) => step.state);
  if (states.every((state) => state === 'verified')) return 'verified';
  if (
    states.includes('partial') ||
    (states.includes('verified') &&
      states.some((state) => state !== 'verified'))
  ) {
    return 'partial';
  }
  if (states.includes('uncertain')) return 'uncertain';
  if (states.some((state) => state === 'attempt-started'))
    return 'attempt-started';
  if (states.some((state) => state === 'verification-pending'))
    return 'verification-pending';
  if (states.some((state) => state === 'pending')) return 'pending';
  if (states.some((state) => state === 'authorized')) return 'authorized';
  if (states.every((state) => state === 'blocked')) return 'blocked';
  if (states.some((state) => state === 'rejected')) return 'rejected';
  return 'failed';
}

function strictestAuthority(
  authorities: readonly CloseoutAuthority[],
): CloseoutAuthority {
  const rank: Record<CloseoutAuthority, number> = {
    'read-only': 0,
    'user-approved': 1,
    'user-authorized': 2,
    autonomous: 3,
  };
  return authorities.reduce<CloseoutAuthority>(
    (strictest, authority) =>
      rank[authority] < rank[strictest] ? authority : strictest,
    'autonomous',
  );
}

function assertUniqueBindings(plans: readonly CloseoutBindingPlan[]): void {
  const bindingIds = new Set<string>();
  const operationIds = new Set<string>();
  for (const plan of plans) {
    if (bindingIds.has(plan.bindingId))
      throw new Error(`Duplicate closeout binding '${plan.bindingId}'.`);
    if (operationIds.has(plan.operationId))
      throw new Error(`Duplicate closeout operation '${plan.operationId}'.`);
    bindingIds.add(plan.bindingId);
    operationIds.add(plan.operationId);
  }
}
