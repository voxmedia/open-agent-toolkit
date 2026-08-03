import type {
  PlanValidationReceiptV1,
  ReviewAccountingSeedV1,
  ReviewPlanV1,
  ValidatedAssignmentProjectionV1,
} from './types';

export function buildReviewAccountingSeed(
  receipt: PlanValidationReceiptV1,
  plan: Pick<ReviewPlanV1, 'strategy' | 'verificationBoundary'>,
  assignment: ValidatedAssignmentProjectionV1,
): ReviewAccountingSeedV1 {
  return {
    schemaVersion: 1,
    receipt: receipt.token,
    contextDigest: receipt.contextDigest,
    planDigest: receipt.planDigest,
    assignmentDigest: receipt.assignmentDigest,
    strategy: plan.strategy,
    lanes: assignment.lanes.map((lane) => ({
      id: lane.id,
      paths: [...lane.paths],
      primaryObligationIds: [...lane.primaryObligationIds],
      seamObligationIds: [...lane.seamObligationIds],
    })),
    classifications: assignment.classifications.map((classification) => ({
      id: classification.id,
      kind: classification.kind,
      reason: classification.reason,
      paths: [...classification.paths],
      planDisposition: classification.disposition,
      strategy: classification.strategy,
      plannedChecks: [...classification.checks],
      exclusionAuthority: classification.exclusionAuthority,
    })),
    verificationBoundary: structuredClone(plan.verificationBoundary),
  };
}
