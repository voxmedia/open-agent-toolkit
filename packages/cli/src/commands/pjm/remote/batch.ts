import { semanticDigest } from './provider';
import { RemoteBatchRecordSchema, type RemoteBatchRecord } from './schema';

export type ReviewedBatchMember = RemoteBatchRecord['members'][number];
export type ReviewedBatchOutcome = RemoteBatchRecord['outcomes'][string];

export interface BuildReviewedBatchInput {
  batchId: string;
  lifecycleOperation: RemoteBatchRecord['lifecycleOperation'];
  members: readonly ReviewedBatchMember[];
  authority: RemoteBatchRecord['authority'];
  approval?: RemoteBatchRecord['approval'];
  createdAt: string;
}

export function buildReviewedBatch(
  input: BuildReviewedBatchInput,
): RemoteBatchRecord {
  const members = canonicalMembers(input.members);
  assertUniqueMembers(members);
  const membershipDigest = digestMembership(members);
  const previewDigest = semanticDigest({
    lifecycleOperation: input.lifecycleOperation,
    membershipDigest,
    authority: input.authority,
    members,
  });
  const approval =
    input.approval?.previewDigest === previewDigest ? input.approval : null;

  return RemoteBatchRecordSchema.parse({
    recordType: 'batch',
    schemaVersion: 1,
    batchId: input.batchId,
    lifecycleOperation: input.lifecycleOperation,
    state: approval ? 'authorized' : 'pending',
    membershipDigest,
    previewDigest,
    authority: input.authority,
    approval,
    createdAt: input.createdAt,
    updatedAt: input.createdAt,
    members,
    outcomes: Object.fromEntries(
      members.map((member) => [member.operationId, 'planned']),
    ),
  });
}

export function resumeReviewedBatch(
  batch: RemoteBatchRecord,
  currentMembers: readonly ReviewedBatchMember[],
): RemoteBatchRecord {
  const parsed = RemoteBatchRecordSchema.parse(batch);
  const membershipDigest = digestMembership(canonicalMembers(currentMembers));
  if (membershipDigest !== parsed.membershipDigest) {
    throw new Error(
      `Reviewed batch '${parsed.batchId}' membership changed; create and approve a new batch.`,
    );
  }
  return parsed;
}

export function reduceReviewedBatchOutcomes(
  batch: RemoteBatchRecord,
  updates: Partial<Record<string, ReviewedBatchOutcome>>,
  updatedAt: string,
): RemoteBatchRecord {
  const parsed = RemoteBatchRecordSchema.parse(batch);
  const operationIds = new Set(
    parsed.members.map((member) => member.operationId),
  );
  for (const operationId of Object.keys(updates)) {
    if (!operationIds.has(operationId)) {
      throw new Error(
        `Operation '${operationId}' is not a member of reviewed batch '${parsed.batchId}'.`,
      );
    }
  }
  const outcomes = { ...parsed.outcomes };
  for (const [operationId, state] of Object.entries(updates)) {
    if (state !== undefined) {
      assertMonotonicOutcome(operationId, outcomes[operationId]!, state);
      outcomes[operationId] = state;
    }
  }
  return RemoteBatchRecordSchema.parse({
    ...parsed,
    outcomes,
    state: reduceBatchState(Object.values(outcomes)),
    updatedAt,
  });
}

const TERMINAL_MEMBER_OUTCOMES: ReadonlySet<ReviewedBatchOutcome> = new Set([
  'verified',
  'blocked',
  'uncertain',
  'rejected',
  'failed',
  'partial',
]);

const OUTCOME_RANK: Partial<Record<ReviewedBatchOutcome, number>> = {
  planned: 0,
  pending: 0,
  authorized: 1,
  'attempt-started': 2,
  'verification-pending': 3,
};

function assertMonotonicOutcome(
  operationId: string,
  previous: ReviewedBatchOutcome,
  next: ReviewedBatchOutcome,
): void {
  if (previous === next) return;
  if (
    TERMINAL_MEMBER_OUTCOMES.has(previous) ||
    (OUTCOME_RANK[next] ?? Number.POSITIVE_INFINITY) <
      (OUTCOME_RANK[previous] ?? Number.POSITIVE_INFINITY)
  ) {
    throw new Error(
      `Reviewed batch outcome for '${operationId}' cannot regress from '${previous}' to '${next}'.`,
    );
  }
}

function canonicalMembers(
  members: readonly ReviewedBatchMember[],
): ReviewedBatchMember[] {
  return [...members].sort(
    (left, right) =>
      left.bindingId.localeCompare(right.bindingId) ||
      left.operationId.localeCompare(right.operationId),
  );
}

function assertUniqueMembers(members: readonly ReviewedBatchMember[]): void {
  const bindingIds = new Set<string>();
  const operationIds = new Set<string>();
  for (const member of members) {
    if (bindingIds.has(member.bindingId)) {
      throw new Error(`Duplicate reviewed binding '${member.bindingId}'.`);
    }
    if (operationIds.has(member.operationId)) {
      throw new Error(`Duplicate reviewed operation '${member.operationId}'.`);
    }
    bindingIds.add(member.bindingId);
    operationIds.add(member.operationId);
  }
}

function digestMembership(members: readonly ReviewedBatchMember[]): string {
  return semanticDigest(
    members.map(({ bindingId, operationId, bindingPreviewDigest }) => ({
      bindingId,
      operationId,
      bindingPreviewDigest,
    })),
  );
}

function reduceBatchState(
  outcomes: readonly ReviewedBatchOutcome[],
): RemoteBatchRecord['state'] {
  if (outcomes.every((state) => state === 'verified')) return 'complete';
  const anyVerified = outcomes.some((state) => state === 'verified');
  if (anyVerified) return 'partial';
  if (outcomes.some((state) => state === 'partial')) return 'partial';
  if (outcomes.some((state) => state === 'uncertain')) return 'uncertain';
  if (outcomes.every((state) => state === 'blocked')) return 'blocked';
  if (outcomes.some((state) => state === 'attempt-started'))
    return 'in-progress';
  if (outcomes.some((state) => state === 'authorized')) return 'authorized';
  return 'pending';
}
