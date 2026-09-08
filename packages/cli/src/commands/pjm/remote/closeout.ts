import { buildReviewedBatch, reduceReviewedBatchOutcomes } from './batch';
import { semanticDigest, type RemoteProvider } from './provider';
import { composePurposePolicies } from './purpose-policy';
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

export type CloseoutCrashPoint =
  | 'before-annotation'
  | 'after-annotation'
  | 'before-transition'
  | 'after-transition';

export type ExecuteCloseoutStep = (
  step: CloseoutSubstep,
) => Promise<'verified' | 'uncertain' | 'rejected' | 'blocked' | 'failed'>;

export interface CloseoutAuthorization {
  kind: 'approval' | 'instruction';
  previewDigest: string;
  authorizedAt: string;
  source: string;
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

export async function resumeCloseoutOperation(
  journal: CloseoutJournal,
  store: CloseoutStore,
  executeStep: ExecuteCloseoutStep,
  crash?: (point: CloseoutCrashPoint) => void,
  now: () => string = () => new Date().toISOString(),
  authorization?: CloseoutAuthorization,
): Promise<CloseoutJournal> {
  let current = cloneJournal(journal);
  for (let index = 0; index < current.substeps.length; index += 1) {
    const step = current.substeps[index]!;
    if (step.state === 'verified') continue;
    if (
      [
        'attempt-started',
        'verification-pending',
        'partial',
        'uncertain',
        'rejected',
      ].includes(step.state)
    ) {
      continue;
    }
    if (step.state === 'blocked' || step.state === 'failed') continue;
    const dependenciesVerified = step.dependsOn.every((dependencyId) =>
      current.substeps.some(
        (candidate) =>
          candidate.stepId === dependencyId && candidate.state === 'verified',
      ),
    );
    if (!dependenciesVerified) continue;

    assertStepAuthorized(step, authorization, now());

    crash?.(`before-${step.kind}`);
    current.substeps[index] = { ...step, state: 'attempt-started' };
    current = withReducedState(current, now());
    await store.writeOperation(current);

    const outcome = await executeStep(current.substeps[index]!);
    current.substeps[index] = {
      ...current.substeps[index]!,
      state: outcome,
    };
    current = withReducedState(current, now());
    await store.writeOperation(current);
    crash?.(`after-${step.kind}`);
  }
  current = withReducedState(current, now());
  await store.writeOperation(current);
  return current;
}

function assertStepAuthorized(
  step: CloseoutSubstep,
  authorization: CloseoutAuthorization | undefined,
  currentTime: string,
): void {
  if (step.approvalRequirement === 'none') return;
  const age = authorization
    ? Date.parse(currentTime) - Date.parse(authorization.authorizedAt)
    : Number.POSITIVE_INFINITY;
  const expectedKind =
    step.approvalRequirement === 'fresh-approval' ? 'approval' : 'instruction';
  if (
    !authorization ||
    authorization.kind !== expectedKind ||
    authorization.previewDigest !== step.previewDigest ||
    !authorization.source ||
    !Number.isFinite(age) ||
    age < 0 ||
    age > 5 * 60 * 1_000
  ) {
    throw new Error(
      `Closeout ${step.approvalRequirement} must authorize the exact current composite preview.`,
    );
  }
}

function withReducedState(
  journal: CloseoutJournal,
  updatedAt: string,
): CloseoutJournal {
  return {
    ...journal,
    state: reduceCloseoutState(journal.substeps),
    updatedAt,
  };
}

function cloneJournal(journal: CloseoutJournal): CloseoutJournal {
  return {
    ...journal,
    substeps: journal.substeps.map((step) => ({
      ...step,
      dependsOn: [...step.dependsOn],
    })),
  };
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
  const composed = composePurposePolicies([...purposes]);
  const substeps: CloseoutSubstep[] = [];
  if (
    plan.annotation &&
    composed.closeout.annotation === 'propose' &&
    composed.lifecycle.includes('annotate')
  ) {
    substeps.push(buildSubstep(plan, 'annotation', plan.annotation, []));
  }
  if (
    plan.transition &&
    composed.closeout.transition === 'propose' &&
    composed.lifecycle.includes('transition')
  ) {
    substeps.push(
      buildSubstep(
        plan,
        'transition',
        plan.transition,
        substeps.map((step) => step.stepId),
      ),
    );
  }
  const state =
    plan.providerAutomation &&
    composed.closeout.transition === 'provider-automation'
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
