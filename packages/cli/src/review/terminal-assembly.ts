import type {
  DirectReviewClaimKind,
  PlanValidationReceiptV1,
  ReviewAccountingV1,
  ReviewClaimVerificationV1,
  ReviewPlanV1,
  ReviewerTerminalOverlayV1,
  ReviewerTerminalV1,
  ReviewerVerificationClaimOverlayV1,
  ValidatedAssignmentProjectionV1,
  ValidatedWorkerCoverageProjectionV1,
} from './types';

export interface ReviewerTerminalAssemblyContextV1 {
  receipt: PlanValidationReceiptV1;
  plan: Pick<ReviewPlanV1, 'strategy' | 'verificationBoundary'> & {
    lanes: Array<
      Pick<ReviewPlanV1['lanes'][number], 'id' | 'delegated' | 'replay'>
    >;
  };
  assignment: ValidatedAssignmentProjectionV1;
  workerCoverage: ValidatedWorkerCoverageProjectionV1[];
}

export class ReviewTerminalAssemblyError extends Error {
  readonly code: string;
  readonly pointer: string;

  constructor(code: string, pointer: string, message: string) {
    super(message);
    this.name = 'ReviewTerminalAssemblyError';
    this.code = code;
    this.pointer = pointer;
  }
}

function fail(code: string, pointer: string, message: string): never {
  throw new ReviewTerminalAssemblyError(code, pointer, message);
}

const ARTIFACT_FINDING_SEVERITY_ORDER = new Map([
  ['critical', 0],
  ['important', 1],
  ['medium', 2],
  ['minor', 3],
]);

function comparePromotedFindingSelectors(
  left: ReviewerVerificationClaimOverlayV1 & { findingId: string | null },
  right: ReviewerVerificationClaimOverlayV1 & { findingId: string | null },
): number {
  const artifactSelector = /^artifact:(critical|important|medium|minor):(\d+)$/;
  const leftArtifact =
    left.findingId === null ? null : artifactSelector.exec(left.findingId);
  const rightArtifact =
    right.findingId === null ? null : artifactSelector.exec(right.findingId);
  if (leftArtifact !== null && rightArtifact !== null) {
    return (
      ARTIFACT_FINDING_SEVERITY_ORDER.get(leftArtifact[1]!)! -
        ARTIFACT_FINDING_SEVERITY_ORDER.get(rightArtifact[1]!)! ||
      Number(leftArtifact[2]) - Number(rightArtifact[2])
    );
  }
  const leftId = left.findingId ?? '';
  const rightId = right.findingId ?? '';
  return leftId < rightId
    ? -1
    : leftId > rightId
      ? 1
      : left.claimId < right.claimId
        ? -1
        : left.claimId > right.claimId
          ? 1
          : 0;
}

function exactSelectorMap<T>(
  entries: readonly T[],
  expectedIds: readonly string[],
  selector: (entry: T) => string,
  pointer: string,
): Map<string, T> {
  const expected = new Set(expectedIds);
  const byId = new Map<string, T>();
  entries.forEach((entry, index) => {
    const id = selector(entry);
    if (byId.has(id)) {
      fail(
        'duplicate-overlay-selector',
        `${pointer}/${index}`,
        `overlay selector ${id} is duplicated`,
      );
    }
    if (!expected.has(id)) {
      fail(
        'unknown-overlay-selector',
        `${pointer}/${index}`,
        `overlay selector ${id} is not launcher-owned`,
      );
    }
    byId.set(id, entry);
  });
  const missing = expectedIds.find((id) => !byId.has(id));
  if (missing !== undefined) {
    fail(
      'missing-overlay-selector',
      pointer,
      `overlay selector ${missing} is missing`,
    );
  }
  return byId;
}

function validateLaneBindings(
  laneIds: readonly string[],
  knownLaneIds: ReadonlySet<string>,
  pointer: string,
): void {
  const seen = new Set<string>();
  laneIds.forEach((laneId, index) => {
    if (seen.has(laneId)) {
      fail(
        'duplicate-overlay-selector',
        `${pointer}/${index}`,
        `lane binding ${laneId} is duplicated`,
      );
    }
    if (!knownLaneIds.has(laneId)) {
      fail(
        'unknown-overlay-selector',
        `${pointer}/${index}`,
        `lane binding ${laneId} is not launcher-owned`,
      );
    }
    seen.add(laneId);
  });
}

function assembleDirectClaim(
  claim: ReviewerVerificationClaimOverlayV1,
  kind: Exclude<DirectReviewClaimKind, 'promoted-finding'>,
  knownLaneIds: ReadonlySet<string>,
  pointer: string,
): ReviewClaimVerificationV1 {
  validateLaneBindings(claim.laneIds, knownLaneIds, `${pointer}/laneIds`);
  return {
    claimId: claim.claimId,
    kind,
    findingId: null,
    laneIds: [...claim.laneIds],
    mode: 'direct',
    disposition: claim.disposition,
    evidenceRefIds: [...claim.evidenceRefIds],
  };
}

function assembleVerification(
  terminal: ReviewerTerminalOverlayV1,
  context: ReviewerTerminalAssemblyContextV1,
): ReviewClaimVerificationV1[] {
  const overlay = terminal.reviewAccounting.verification;
  const knownLaneIds = new Set(context.assignment.lanes.map((lane) => lane.id));
  const required = new Set(
    context.plan.verificationBoundary.requiredClaims.map((claim) => claim.kind),
  );
  const verification: ReviewClaimVerificationV1[] = [];

  if (required.has('promoted-finding')) {
    if (overlay.promotedFindings.length === 0) {
      fail(
        'missing-overlay-selector',
        '/reviewAccounting/verification/promotedFindings',
        'required promoted-finding verification is missing',
      );
    }
    const seenFindingIds = new Set<string>();
    overlay.promotedFindings.forEach((claim, index) => {
      const pointer = `/reviewAccounting/verification/promotedFindings/${index}`;
      validateLaneBindings(claim.laneIds, knownLaneIds, `${pointer}/laneIds`);
      if (claim.findingId !== null) {
        if (seenFindingIds.has(claim.findingId)) {
          fail(
            'duplicate-overlay-selector',
            `${pointer}/findingId`,
            `promoted finding ${claim.findingId} is duplicated`,
          );
        }
        seenFindingIds.add(claim.findingId);
      }
    });
    let promotedFindings = [...overlay.promotedFindings];
    if (
      terminal.status === 'complete' &&
      terminal.candidate.kind === 'structured'
    ) {
      const findingIds = terminal.candidate.review.findings.map(
        (finding) => finding.id,
      );
      const claimsByFinding = new Set(
        overlay.promotedFindings
          .map((claim) => claim.findingId)
          .filter((findingId): findingId is string => findingId !== null),
      );
      const validNoFindingClaim =
        findingIds.length === 0 &&
        overlay.promotedFindings.length === 1 &&
        overlay.promotedFindings[0]!.findingId === null;
      if (
        !validNoFindingClaim &&
        (findingIds.length !== claimsByFinding.size ||
          findingIds.some((findingId) => !claimsByFinding.has(findingId)) ||
          overlay.promotedFindings.some((claim) => claim.findingId === null))
      ) {
        fail(
          'overlay-selector-mismatch',
          '/reviewAccounting/verification/promotedFindings',
          'promoted-finding selectors do not match structured findings',
        );
      }
      const claimByFindingId = new Map(
        overlay.promotedFindings
          .filter(
            (
              claim,
            ): claim is typeof claim & {
              findingId: string;
            } => claim.findingId !== null,
          )
          .map((claim) => [claim.findingId, claim]),
      );
      promotedFindings =
        findingIds.length === 0
          ? promotedFindings
          : findingIds.map((findingId) => claimByFindingId.get(findingId)!);
    } else {
      promotedFindings.sort(comparePromotedFindingSelectors);
    }
    promotedFindings.forEach((claim) =>
      verification.push({
        claimId: claim.claimId,
        kind: 'promoted-finding',
        findingId: claim.findingId,
        laneIds: [...claim.laneIds],
        mode: 'direct',
        disposition: claim.disposition,
        evidenceRefIds: [...claim.evidenceRefIds],
      }),
    );
  } else if (overlay.promotedFindings.length > 0) {
    fail(
      'extra-overlay-selector',
      '/reviewAccounting/verification/promotedFindings',
      'promoted-finding verification is not required by the sealed plan',
    );
  }

  const directSlots = [
    ['consequential-absence', 'consequentialAbsence'],
    ['worker-conflict', 'workerConflict'],
    ['cross-lane-gap', 'crossLaneGap'],
  ] as const;
  for (const [kind, field] of directSlots) {
    const claim = overlay[field];
    if (required.has(kind)) {
      if (claim === null) {
        fail(
          'missing-overlay-selector',
          `/reviewAccounting/verification/${field}`,
          `required ${kind} verification is missing`,
        );
      }
      verification.push(
        assembleDirectClaim(
          claim,
          kind,
          knownLaneIds,
          `/reviewAccounting/verification/${field}`,
        ),
      );
    } else if (claim !== null) {
      fail(
        'extra-overlay-selector',
        `/reviewAccounting/verification/${field}`,
        `${kind} verification is not required by the sealed plan`,
      );
    }
  }

  const expectedSamples =
    context.plan.verificationBoundary.positiveCoverage.laneIds;
  const sampleByLane = exactSelectorMap(
    overlay.positiveCoverage,
    expectedSamples,
    (claim) => claim.laneId,
    '/reviewAccounting/verification/positiveCoverage',
  );
  expectedSamples.forEach((laneId) => {
    const claim = sampleByLane.get(laneId)!;
    verification.push({
      claimId: claim.claimId,
      kind: 'positive-coverage-sample',
      findingId: null,
      laneIds: [laneId],
      mode: 'sample',
      disposition: claim.disposition,
      evidenceRefIds: [...claim.evidenceRefIds],
    });
  });

  const deterministicLaneIds = context.plan.lanes
    .filter((lane) => lane.delegated && lane.replay === 'accept-provenance')
    .map((lane) => lane.id);
  const deterministicByLane = exactSelectorMap(
    overlay.deterministicResults,
    deterministicLaneIds,
    (claim) => {
      if (claim.laneIds.length !== 1) {
        fail(
          'overlay-selector-mismatch',
          '/reviewAccounting/verification/deterministicResults',
          'each deterministic result must select exactly one sealed provenance lane',
        );
      }
      return claim.laneIds[0]!;
    },
    '/reviewAccounting/verification/deterministicResults',
  );
  deterministicLaneIds.forEach((laneId) => {
    const claim = deterministicByLane.get(laneId)!;
    verification.push({
      claimId: claim.claimId,
      kind: 'deterministic-result',
      findingId: null,
      laneIds: [laneId],
      mode: 'provenance',
      disposition: claim.disposition,
      evidenceRefIds: [...claim.evidenceRefIds],
    });
  });
  return verification;
}

function assembleAccounting(
  terminal: ReviewerTerminalOverlayV1,
  context: ReviewerTerminalAssemblyContextV1,
): ReviewAccountingV1 {
  const overlay = terminal.reviewAccounting;
  const planLanes = new Map(context.plan.lanes.map((lane) => [lane.id, lane]));
  const expectedLaneIds = context.assignment.lanes.map((lane) => lane.id);
  const laneOverlays = exactSelectorMap(
    overlay.lanes,
    expectedLaneIds,
    (lane) => lane.laneId,
    '/reviewAccounting/lanes',
  );
  const coverageByLane = new Map<string, ValidatedWorkerCoverageProjectionV1>();
  context.workerCoverage.forEach((coverage, index) => {
    if (!planLanes.has(coverage.laneId)) {
      fail(
        'unknown-worker-coverage',
        `/workerCoverage/${index}/laneId`,
        `worker coverage lane ${coverage.laneId} is not in the sealed plan`,
      );
    }
    if (coverageByLane.has(coverage.laneId)) {
      fail(
        'duplicate-worker-coverage',
        `/workerCoverage/${index}/laneId`,
        `worker coverage lane ${coverage.laneId} is duplicated`,
      );
    }
    coverageByLane.set(coverage.laneId, coverage);
  });

  const lanes = context.assignment.lanes.map((assignment) => {
    const authored = laneOverlays.get(assignment.id)!;
    const planLane = planLanes.get(assignment.id);
    if (planLane === undefined) {
      fail(
        'sealed-state-mismatch',
        '/plan/lanes',
        `assignment lane ${assignment.id} is absent from the sealed plan`,
      );
    }
    const coverage = coverageByLane.get(assignment.id);
    if (!planLane.delegated && coverage !== undefined) {
      fail(
        'extra-worker-coverage',
        '/workerCoverage',
        `inline lane ${assignment.id} has delegated worker coverage`,
      );
    }
    const workerOutcome: ReviewAccountingV1['lanes'][number]['workerOutcome'] =
      planLane.delegated ? (coverage?.outcome ?? 'uncovered') : 'not-delegated';
    return {
      id: assignment.id,
      paths: [...assignment.paths],
      primaryObligationIds: [...assignment.primaryObligationIds],
      seamObligationIds: [...assignment.seamObligationIds],
      workerOutcome,
      dossierDigest: coverage?.dossierDigest ?? null,
      inspectionCoverage: authored.inspectionCoverage,
      uninspectedPathIndexes: [...authored.uninspectedPathIndexes],
      uncoveredObligationIds: [...authored.uncoveredObligationIds],
      commands: structuredClone(authored.commands),
      evidenceRefIds: [...authored.evidenceRefIds],
      uncertainty: [...authored.uncertainty],
      primaryCompletion: structuredClone(authored.primaryCompletion),
    };
  });

  const expectedClassificationIds = context.assignment.classifications.map(
    (classification) => classification.id,
  );
  const classificationOverlays = exactSelectorMap(
    overlay.classifications,
    expectedClassificationIds,
    (classification) => classification.classificationId,
    '/reviewAccounting/classifications',
  );
  const classifications = context.assignment.classifications.map(
    (assignment) => {
      const authored = classificationOverlays.get(assignment.id)!;
      return {
        id: assignment.id,
        kind: assignment.kind,
        reason: assignment.reason,
        paths: [...assignment.paths],
        planDisposition: assignment.disposition,
        strategy: assignment.strategy,
        plannedChecks: [...assignment.checks],
        exclusionAuthority: assignment.exclusionAuthority,
        outcome: authored.outcome,
        inspectionCoverage: authored.inspectionCoverage,
        uninspectedPathIndexes: [...authored.uninspectedPathIndexes],
        commands: structuredClone(authored.commands),
        uncertainty: [...authored.uncertainty],
      };
    },
  );

  return {
    schemaVersion: 1,
    receipt: context.receipt.token,
    contextDigest: context.receipt.contextDigest,
    planDigest: context.receipt.planDigest,
    assignmentDigest: context.receipt.assignmentDigest,
    strategy: context.plan.strategy,
    completion:
      terminal.status === 'complete' ? 'complete' : 'blocked-incomplete',
    evidence: structuredClone(overlay.evidence),
    lanes,
    classifications,
    verification: assembleVerification(terminal, context),
    budget: structuredClone(overlay.budget),
  };
}

export function assembleReviewerTerminal(
  overlay: ReviewerTerminalOverlayV1,
  context: ReviewerTerminalAssemblyContextV1,
): ReviewerTerminalV1 {
  const reviewAccounting = assembleAccounting(overlay, context);
  if (overlay.status === 'complete') {
    return {
      schemaVersion: 1,
      status: 'complete',
      candidate: structuredClone(overlay.candidate),
      reviewAccounting: reviewAccounting as ReviewAccountingV1 & {
        completion: 'complete';
      },
    };
  }
  return {
    schemaVersion: 1,
    status: 'blocked',
    reason: overlay.reason,
    diagnostics: [...overlay.diagnostics],
    reviewAccounting: reviewAccounting as ReviewAccountingV1 & {
      completion: 'blocked-incomplete';
    },
  };
}
