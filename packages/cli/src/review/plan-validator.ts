import type { PreparedReviewContextV1, ReviewPlanV1 } from './types';

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
