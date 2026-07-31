import {
  allocateReviewTimeBudget,
  evaluateWholeDiffEligibility,
} from './budget';
import { canonicalizeJson } from './canonical-json';
import {
  DIRECT_REVIEW_CLAIM_KINDS,
  PROVENANCE_EVIDENCE_STRATEGIES,
} from './types';
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

export function validatePrimaryContingency(
  plan: ReviewPlanV1,
): PlanValidationError[] {
  const errors: PlanValidationError[] = [];
  plan.lanes.forEach((lane, index) => {
    const paths = new Set(lane.paths);
    const obligations = new Set(lane.primaryObligationIds);
    if (
      (lane.primaryContingency.allowed &&
        (!lane.delegated ||
          (lane.primaryContingency.paths.length === 0 &&
            lane.primaryContingency.obligationIds.length === 0))) ||
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

function validatePlanBucketIds(plan: ReviewPlanV1): PlanValidationError[] {
  const errors: PlanValidationError[] = [];
  const laneIds = new Set<string>();
  plan.lanes.forEach((lane, index) => {
    if (laneIds.has(lane.id)) {
      errors.push({
        code: 'duplicate-lane-id',
        pointer: `/lanes/${index}/id`,
        message: `lane ID ${lane.id} is duplicated`,
      });
    }
    laneIds.add(lane.id);
  });

  const classificationIds = new Set<string>();
  plan.classifications.forEach((classification, index) => {
    if (classificationIds.has(classification.id)) {
      errors.push({
        code: 'duplicate-classification-id',
        pointer: `/classifications/${index}/id`,
        message: `classification ID ${classification.id} is duplicated`,
      });
    }
    if (laneIds.has(classification.id)) {
      errors.push({
        code: 'duplicate-plan-bucket-id',
        pointer: `/classifications/${index}/id`,
        message: `plan bucket ID ${classification.id} is already used by a lane`,
      });
    }
    classificationIds.add(classification.id);
  });
  return errors;
}

function validateVerificationBoundary(
  plan: ReviewPlanV1,
): PlanValidationError[] {
  const errors: PlanValidationError[] = [];
  const claims = plan.verificationBoundary.requiredClaims;
  const seenClaims = new Set<string>();
  claims.forEach((claim, index) => {
    if (seenClaims.has(claim.kind)) {
      errors.push({
        code: 'duplicate-direct-claim-kind',
        pointer: `/verificationBoundary/requiredClaims/${index}/kind`,
        message: `direct claim kind ${claim.kind} is duplicated`,
      });
    }
    seenClaims.add(claim.kind);
  });
  if (
    claims.length !== DIRECT_REVIEW_CLAIM_KINDS.length ||
    DIRECT_REVIEW_CLAIM_KINDS.some((kind) => !seenClaims.has(kind))
  ) {
    errors.push({
      code: 'incomplete-direct-claim-kinds',
      pointer: '/verificationBoundary/requiredClaims',
      message:
        'verification boundary must contain every direct claim kind once',
    });
  }

  const positive = plan.verificationBoundary.positiveCoverage;
  if (positive.laneIds.length === 0 || positive.rationale.trim().length === 0) {
    errors.push({
      code: 'empty-positive-coverage',
      pointer: '/verificationBoundary/positiveCoverage',
      message: 'positive coverage requires lanes and a non-empty rationale',
    });
  }
  const laneIds = new Set(plan.lanes.map((lane) => lane.id));
  const positiveIds = new Set<string>();
  positive.laneIds.forEach((id, index) => {
    if (!laneIds.has(id)) {
      errors.push({
        code: 'invalid-positive-coverage-lane',
        pointer: `/verificationBoundary/positiveCoverage/laneIds/${index}`,
        message: `positive coverage lane ${id} does not exist`,
      });
    }
    if (positiveIds.has(id)) {
      errors.push({
        code: 'duplicate-positive-coverage-lane',
        pointer: `/verificationBoundary/positiveCoverage/laneIds/${index}`,
        message: `positive coverage lane ${id} is duplicated`,
      });
    }
    positiveIds.add(id);
  });

  const requiredFields =
    plan.verificationBoundary.deterministicAcceptance.requiredFields;
  const expectedFields: ReviewPlanV1['verificationBoundary']['deterministicAcceptance']['requiredFields'] =
    ['command', 'cwd', 'scopeRefs', 'provenance', 'result'];
  if (
    requiredFields.length !== expectedFields.length ||
    new Set(requiredFields).size !== requiredFields.length ||
    expectedFields.some((field) => !requiredFields.includes(field))
  ) {
    errors.push({
      code: 'invalid-deterministic-acceptance-fields',
      pointer: '/verificationBoundary/deterministicAcceptance/requiredFields',
      message: 'deterministic acceptance fields must be complete and unique',
    });
  }
  return errors;
}

function nonEmpty(values: readonly string[]): boolean {
  return values.length > 0 && values.every((value) => value.trim().length > 0);
}

function isProvenanceEvidenceStrategy(
  strategy: ReviewPlanV1['lanes'][number]['strategy'],
): boolean {
  return PROVENANCE_EVIDENCE_STRATEGIES.some(
    (candidate) => candidate === strategy,
  );
}

function validateDelegationStructure(
  plan: ReviewPlanV1,
): PlanValidationError[] {
  const errors: PlanValidationError[] = [];
  const lanesById = new Map<string, ReviewPlanV1['lanes'][number]>();
  plan.lanes.forEach((lane) => {
    if (!lanesById.has(lane.id)) {
      lanesById.set(lane.id, lane);
    }
  });

  const economics = plan.delegationEconomics;
  const delegated =
    plan.strategy === 'delegated' || economics.decision === 'delegate';
  if ((plan.strategy === 'delegated') !== (economics.decision === 'delegate')) {
    errors.push({
      code: 'delegation-decision-mismatch',
      pointer: '/delegationEconomics/decision',
      message: 'strategy and delegation decision must agree',
    });
  }

  if (!delegated) {
    plan.lanes.forEach((lane, index) => {
      if (lane.delegated) {
        errors.push({
          code: 'inline-plan-has-delegated-lane',
          pointer: `/lanes/${index}/delegated`,
          message: 'inline plans cannot mark lanes as delegated',
        });
      }
      if (lane.replay === 'accept-provenance') {
        errors.push({
          code: 'inline-provenance-acceptance',
          pointer: `/lanes/${index}/replay`,
          message:
            'inline lanes cannot bypass direct verification by accepting provenance',
        });
      }
    });
    return errors;
  }

  if (
    !nonEmpty(economics.expectedSavings) ||
    !nonEmpty(economics.coordinationCosts) ||
    economics.decisionRationale.trim().length === 0
  ) {
    errors.push({
      code: 'missing-delegation-economics',
      pointer: '/delegationEconomics',
      message:
        'delegation requires expected savings, coordination costs, and rationale',
    });
  }

  const independentIds = new Set<string>();
  let independentSubstantialCount = 0;
  economics.independentLaneIds.forEach((id, index) => {
    const pointer = `/delegationEconomics/independentLaneIds/${index}`;
    if (independentIds.has(id)) {
      errors.push({
        code: 'duplicate-independent-lane',
        pointer,
        message: `independent lane ${id} is duplicated`,
      });
      return;
    }
    independentIds.add(id);
    const lane = lanesById.get(id);
    if (
      lane === undefined ||
      !lane.delegated ||
      !lane.substantial ||
      !lane.independenceRationale?.trim() ||
      !lane.substantialityRationale?.trim()
    ) {
      errors.push({
        code: 'invalid-independent-substantial-lane',
        pointer,
        message:
          'independent lanes must exist, be delegated and substantial, and include both rationales',
      });
      return;
    }
    independentSubstantialCount += 1;
  });
  if (independentSubstantialCount < 2) {
    errors.push({
      code: 'insufficient-independent-substantial-lanes',
      pointer: '/delegationEconomics/independentLaneIds',
      message: 'delegation requires at least two independent substantial lanes',
    });
  }

  plan.lanes.forEach((lane, index) => {
    if (lane.delegated && !independentIds.has(lane.id)) {
      errors.push({
        code: 'delegated-lane-not-independent',
        pointer: `/lanes/${index}/delegated`,
        message: `delegated lane ${lane.id} is not an independent lane`,
      });
    }
  });

  const nonReplayedIds = new Set<string>();
  let provenanceLaneCount = 0;
  economics.nonReplayedLaneIds.forEach((id, index) => {
    const pointer = `/delegationEconomics/nonReplayedLaneIds/${index}`;
    if (nonReplayedIds.has(id)) {
      errors.push({
        code: 'duplicate-non-replayed-lane',
        pointer,
        message: `non-replayed lane ${id} is duplicated`,
      });
      return;
    }
    nonReplayedIds.add(id);
    const lane = lanesById.get(id);
    if (
      lane === undefined ||
      !independentIds.has(id) ||
      !lane.delegated ||
      lane.evidenceClass !== 'deterministic' ||
      lane.replay !== 'accept-provenance' ||
      !isProvenanceEvidenceStrategy(lane.strategy)
    ) {
      errors.push({
        code: isProvenanceEvidenceStrategy(lane?.strategy ?? 'path-diff')
          ? 'invalid-non-replayed-lane'
          : 'non-provenance-evidence-strategy',
        pointer,
        message:
          'non-replayed lanes must be independent delegated deterministic lanes using command or inventory evidence',
      });
      return;
    }
    provenanceLaneCount += 1;
  });
  plan.lanes.forEach((lane, index) => {
    if (lane.replay === 'accept-provenance' && !nonReplayedIds.has(lane.id)) {
      errors.push({
        code: 'unregistered-provenance-lane',
        pointer: `/lanes/${index}/replay`,
        message:
          'lanes accepted by provenance must be registered as non-replayed',
      });
    }
  });
  if (provenanceLaneCount === 0) {
    errors.push({
      code: 'delegation-requires-provenance-lane',
      pointer: '/delegationEconomics/nonReplayedLaneIds',
      message:
        'delegation requires a deterministic lane accepted without semantic replay',
    });
  }

  if (plan.timeAllocation === null) {
    errors.push({
      code: 'insufficient-delegation-budget',
      pointer: '/timeAllocation',
      message:
        'delegation requires sealed reconciliation and output budget allocation',
    });
  }
  return errors;
}

function validateLaneDeadlines(
  plan: ReviewPlanV1,
  allocation: ReviewPlanV1['timeAllocation'],
): PlanValidationError[] {
  const errors: PlanValidationError[] = [];
  plan.lanes.forEach((lane, index) => {
    if (!lane.delegated) {
      if (lane.deadlineMs !== null) {
        errors.push({
          code: 'inline-lane-deadline',
          pointer: `/lanes/${index}/deadlineMs`,
          message: 'non-delegated lanes cannot declare a worker deadline',
        });
      }
      return;
    }
    if (allocation === null) {
      if (lane.deadlineMs !== null) {
        errors.push({
          code: 'unbudgeted-lane-deadline',
          pointer: `/lanes/${index}/deadlineMs`,
          message:
            'lanes cannot declare a deadline without a sealed time budget',
        });
      }
      return;
    }
    if (
      lane.deadlineMs === null ||
      lane.deadlineMs <= allocation.planningDeadlineMs ||
      lane.deadlineMs > allocation.evidenceDeadlineMs
    ) {
      errors.push({
        code: 'lane-evidence-deadline-out-of-bounds',
        pointer: `/lanes/${index}/deadlineMs`,
        message:
          'delegated lane deadline must be after planning and at or before the evidence cutoff',
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
    ...validatePlanBucketIds(plan),
    ...validateVerificationBoundary(plan),
    ...validatePrimaryContingency(plan),
    ...validateDelegationStructure(plan),
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
  if (plan.strategy === 'whole-diff-inline' && !eligibility.allowed) {
    errors.push({
      code: 'whole-diff-execution-denied',
      pointer: '/strategy',
      message: 'whole-diff execution is denied by the sealed policy',
    });
  }
  if (plan.strategy === 'whole-diff-inline') {
    plan.lanes.forEach((lane, laneIndex) => {
      if (lane.strategy !== 'path-diff' || lane.delegated) {
        errors.push({
          code: 'inconsistent-whole-diff-lane',
          pointer: `/lanes/${laneIndex}/strategy`,
          message:
            'whole-diff inline execution requires non-delegated path-diff lanes',
        });
      }
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
  errors.push(...validateLaneDeadlines(plan, expectedAllocation));
  return errors;
}
