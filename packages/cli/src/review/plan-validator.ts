import {
  allocateReviewTimeBudget,
  evaluateWholeDiffEligibility,
} from './budget';
import { canonicalizeJson } from './canonical-json';
import type {
  PreparedReviewContextV1,
  ReviewPlanV1,
  ValidatedAssignmentProjectionV1,
} from './types';

export interface PlanValidationError {
  code: string;
  pointer: string;
  message: string;
}

function exactOwnershipErrors(
  authoritative: readonly string[],
  assignments: Array<{ value: string; pointer: string }>,
  kind: 'path' | 'obligation',
): PlanValidationError[] {
  const expected = new Set(authoritative);
  const owners = new Map<string, string[]>();
  for (const assignment of assignments) {
    const existing = owners.get(assignment.value) ?? [];
    existing.push(assignment.pointer);
    owners.set(assignment.value, existing);
  }
  const errors: PlanValidationError[] = [];
  for (const [value, pointers] of owners) {
    if (!expected.has(value)) {
      errors.push({
        code: `fabricated-${kind}`,
        pointer: pointers[0]!,
        message: `${kind} ${value} is not authoritative`,
      });
    } else if (pointers.length > 1) {
      errors.push({
        code: `duplicate-${kind}-owner`,
        pointer: pointers[1]!,
        message: `${kind} ${value} has multiple primary owners`,
      });
    }
  }
  for (const value of expected) {
    if (!owners.has(value)) {
      errors.push({
        code: `missing-${kind}-owner`,
        pointer: kind === 'path' ? '/lanes' : '/lanes',
        message: `${kind} ${value} has no primary owner`,
      });
    }
  }
  return errors;
}

export function validatePlanPathAccounting(
  context: PreparedReviewContextV1,
  plan: ReviewPlanV1,
): PlanValidationError[] {
  const assignments: Array<{ value: string; pointer: string }> = [];
  plan.lanes.forEach((lane, laneIndex) => {
    lane.paths.forEach((path, pathIndex) =>
      assignments.push({
        value: path,
        pointer: `/lanes/${laneIndex}/paths/${pathIndex}`,
      }),
    );
  });
  plan.classifications.forEach((classification, classificationIndex) => {
    classification.paths.forEach((path, pathIndex) =>
      assignments.push({
        value: path,
        pointer: `/classifications/${classificationIndex}/paths/${pathIndex}`,
      }),
    );
  });
  return exactOwnershipErrors(
    context.changeMap.files.map((file) => file.path),
    assignments,
    'path',
  );
}

export function validatePlanObligationAccounting(
  context: PreparedReviewContextV1,
  plan: ReviewPlanV1,
): PlanValidationError[] {
  const authoritative = context.obligations.map((obligation) => obligation.id);
  const assignments: Array<{ value: string; pointer: string }> = [];
  plan.lanes.forEach((lane, laneIndex) => {
    lane.primaryObligationIds.forEach((id, obligationIndex) =>
      assignments.push({
        value: id,
        pointer: `/lanes/${laneIndex}/primaryObligationIds/${obligationIndex}`,
      }),
    );
  });
  const errors = exactOwnershipErrors(authoritative, assignments, 'obligation');
  const expected = new Set(authoritative);
  plan.lanes.forEach((lane, laneIndex) => {
    lane.seamObligationIds.forEach((id, obligationIndex) => {
      if (!expected.has(id)) {
        errors.push({
          code: 'invalid-seam-obligation',
          pointer: `/lanes/${laneIndex}/seamObligationIds/${obligationIndex}`,
          message: `seam obligation ${id} is not authoritative`,
        });
      }
      if (lane.primaryObligationIds.includes(id)) {
        errors.push({
          code: 'contradictory-seam-owner',
          pointer: `/lanes/${laneIndex}/seamObligationIds/${obligationIndex}`,
          message: `seam obligation ${id} is also primary in the same lane`,
        });
      }
    });
  });
  return errors;
}

export function projectValidatedAssignments(
  plan: ReviewPlanV1,
): ValidatedAssignmentProjectionV1 {
  return {
    lanes: plan.lanes
      .map((lane) => ({
        id: lane.id,
        paths: [...lane.paths].sort(),
        primaryObligationIds: [...lane.primaryObligationIds].sort(),
        seamObligationIds: [...lane.seamObligationIds].sort(),
        primaryContingency: {
          allowed: lane.primaryContingency.allowed,
          paths: [...lane.primaryContingency.paths].sort(),
          obligationIds: [...lane.primaryContingency.obligationIds].sort(),
        },
      }))
      .sort((left, right) => left.id.localeCompare(right.id)),
    classifications: plan.classifications
      .map((classification) => ({
        ...structuredClone(classification),
        paths: [...classification.paths].sort(),
        checks: [...classification.checks].sort(),
      }))
      .sort((left, right) => left.id.localeCompare(right.id)),
  };
}

function validateClassificationPolicy(
  plan: ReviewPlanV1,
): PlanValidationError[] {
  const errors: PlanValidationError[] = [];
  plan.classifications.forEach((classification, index) => {
    const pointer = `/classifications/${index}`;
    if (
      (classification.kind === 'generated' ||
        classification.kind === 'bookkeeping') &&
      (classification.disposition !== 'inspect' ||
        classification.strategy === 'none' ||
        classification.checks.length === 0)
    ) {
      errors.push({
        code: 'classification-cannot-skip-inspection',
        pointer,
        message: `${classification.kind} classification must be inspected`,
      });
    }
    if (
      classification.kind === 'excluded' &&
      (classification.disposition !== 'justified-exclusion' ||
        classification.strategy !== 'none' ||
        !classification.exclusionAuthority)
    ) {
      errors.push({
        code: 'invalid-exclusion-authority',
        pointer,
        message: 'excluded classification requires explicit authority',
      });
    }
  });
  return errors;
}

function validateContingencies(plan: ReviewPlanV1): PlanValidationError[] {
  const errors: PlanValidationError[] = [];
  plan.lanes.forEach((lane, index) => {
    const paths = new Set(lane.paths);
    const obligations = new Set(lane.primaryObligationIds);
    if (
      (!lane.primaryContingency.allowed &&
        (lane.primaryContingency.paths.length > 0 ||
          lane.primaryContingency.obligationIds.length > 0)) ||
      lane.primaryContingency.paths.some((path) => !paths.has(path)) ||
      lane.primaryContingency.obligationIds.some((id) => !obligations.has(id))
    ) {
      errors.push({
        code: 'invalid-primary-contingency',
        pointer: `/lanes/${index}/primaryContingency`,
        message: 'primary contingency must be a permitted assignment subset',
      });
    }
  });
  return errors;
}

export function validateReviewPlan(
  context: PreparedReviewContextV1,
  plan: ReviewPlanV1,
): PlanValidationError[] {
  const errors = [
    ...validatePlanPathAccounting(context, plan),
    ...validatePlanObligationAccounting(context, plan),
    ...validateClassificationPolicy(plan),
    ...validateContingencies(plan),
  ];
  if (
    plan.runId !== context.runId ||
    plan.contextDigest !== context.contextDigest
  ) {
    errors.push({
      code: 'context-identity-mismatch',
      pointer: '/contextDigest',
      message: 'plan identity does not match the sealed context',
    });
  }
  const eligibility = evaluateWholeDiffEligibility({
    changeMap: context.changeMap,
    contextBudget: context.budget.context,
    coherentLaneCount: plan.lanes.length,
    hasConsequentialSeam:
      plan.lanes.length > 1 &&
      plan.lanes.some((lane) => lane.risk === 'consequential'),
  });
  if (canonicalizeJson(plan.wholeDiff) !== canonicalizeJson(eligibility)) {
    errors.push({
      code: 'whole-diff-policy-drift',
      pointer: '/wholeDiff',
      message: 'whole-diff fields differ from sealed policy',
    });
  }
  const time = context.budget.time;
  const expectedAllocation =
    time === null
      ? null
      : allocateReviewTimeBudget({
          totalMs: time.totalMs,
          source: time.source,
          startedAtMs: time.deadlineMs - time.totalMs,
        }).allocation;
  if (
    canonicalizeJson(plan.timeAllocation) !==
    canonicalizeJson(expectedAllocation)
  ) {
    errors.push({
      code: 'time-allocation-policy-drift',
      pointer: '/timeAllocation',
      message: 'time allocation differs from the sealed outer budget',
    });
  }
  return errors;
}
