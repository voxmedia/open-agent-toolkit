import type {
  ReviewLaneV1,
  ReviewPlanV1,
  ReviewScopeRefV1,
  WorkerDossierV1,
} from './types';

export interface WorkerDossierValidationError {
  code: string;
  pointer: string;
  message: string;
}

function duplicateErrors(
  values: readonly string[],
  code: string,
  pointer: string,
  label: string,
): WorkerDossierValidationError[] {
  const seen = new Set<string>();
  const errors: WorkerDossierValidationError[] = [];
  values.forEach((value, index) => {
    if (seen.has(value)) {
      errors.push({
        code,
        pointer: `${pointer}/${index}`,
        message: `${label} ${value} is duplicated`,
      });
    }
    seen.add(value);
  });
  return errors;
}

function validateScopeRefs(
  refs: readonly ReviewScopeRefV1[],
  pointer: string,
  lane: ReviewLaneV1,
): WorkerDossierValidationError[] {
  const errors: WorkerDossierValidationError[] = [];
  refs.forEach((ref, refIndex) => {
    const refPointer = `${pointer}/${refIndex}`;
    if (ref.bucket !== 'lane' || ref.bucketId !== lane.id) {
      errors.push({
        code: 'dossier-scope-out-of-lane',
        pointer: refPointer,
        message: 'worker evidence scope must reference its assigned lane',
      });
    }
    errors.push(
      ...duplicateErrors(
        ref.pathIndexes.map(String),
        'duplicate-scope-path-index',
        `${refPointer}/pathIndexes`,
        'path index',
      ),
    );
    ref.pathIndexes.forEach((pathIndex, index) => {
      if (
        !Number.isInteger(pathIndex) ||
        pathIndex < 0 ||
        pathIndex >= lane.paths.length
      ) {
        errors.push({
          code: 'dossier-scope-path-index-out-of-bounds',
          pointer: `${refPointer}/pathIndexes/${index}`,
          message: `path index ${pathIndex} is outside lane ${lane.id}`,
        });
      }
    });
  });
  return errors;
}

function boundedValueErrors(
  values: readonly string[],
  allowed: ReadonlySet<string>,
  pointer: string,
  duplicateCode: string,
  outOfScopeCode: string,
  label: string,
): WorkerDossierValidationError[] {
  const errors = duplicateErrors(values, duplicateCode, pointer, label);
  values.forEach((value, index) => {
    if (!allowed.has(value)) {
      errors.push({
        code: outOfScopeCode,
        pointer: `${pointer}/${index}`,
        message: `${label} ${value} is outside the assigned lane`,
      });
    }
  });
  return errors;
}

export function validateWorkerDossier(
  plan: ReviewPlanV1,
  expectedPlanDigest: string,
  dossier: WorkerDossierV1,
): WorkerDossierValidationError[] {
  const errors: WorkerDossierValidationError[] = [];
  if (dossier.runId !== plan.runId) {
    errors.push({
      code: 'dossier-run-mismatch',
      pointer: '/runId',
      message: 'dossier run does not match the validated plan',
    });
  }
  if (dossier.planDigest !== expectedPlanDigest) {
    errors.push({
      code: 'dossier-plan-mismatch',
      pointer: '/planDigest',
      message: 'dossier plan digest does not match the validated plan',
    });
  }

  const lane = plan.lanes.find((candidate) => candidate.id === dossier.laneId);
  if (lane === undefined || !lane.delegated) {
    errors.push({
      code: 'dossier-lane-mismatch',
      pointer: '/laneId',
      message: 'dossier lane must identify a delegated plan lane',
    });
    return errors;
  }

  const allowedPaths = new Set(lane.paths);
  const allowedObligations = new Set([
    ...lane.primaryObligationIds,
    ...lane.seamObligationIds,
  ]);
  errors.push(
    ...boundedValueErrors(
      dossier.inspectedPaths,
      allowedPaths,
      '/inspectedPaths',
      'duplicate-inspected-path',
      'dossier-path-out-of-scope',
      'inspected path',
    ),
    ...boundedValueErrors(
      dossier.inspectedObligationIds,
      allowedObligations,
      '/inspectedObligationIds',
      'duplicate-inspected-obligation',
      'dossier-obligation-out-of-scope',
      'inspected obligation',
    ),
    ...boundedValueErrors(
      dossier.uncoveredObligationIds,
      new Set(lane.primaryObligationIds),
      '/uncoveredObligationIds',
      'duplicate-uncovered-obligation',
      'uncovered-obligation-out-of-scope',
      'uncovered obligation',
    ),
  );

  const commandIds = dossier.commands.map((command) => command.id);
  const evidenceIds = dossier.evidence.map((evidence) => evidence.id);
  const candidateFindingIds = dossier.candidateFindings.map(
    (finding) => finding.id,
  );
  errors.push(
    ...duplicateErrors(
      commandIds,
      'duplicate-command-id',
      '/commands',
      'command ID',
    ),
    ...duplicateErrors(
      evidenceIds,
      'duplicate-evidence-id',
      '/evidence',
      'evidence ID',
    ),
    ...duplicateErrors(
      candidateFindingIds,
      'duplicate-candidate-finding-id',
      '/candidateFindings',
      'candidate finding ID',
    ),
  );

  const commandIdSet = new Set(commandIds);
  const evidenceIdSet = new Set(evidenceIds);
  dossier.commands.forEach((command, index) => {
    errors.push(
      ...validateScopeRefs(
        command.scopeRefs,
        `/commands/${index}/scopeRefs`,
        lane,
      ),
    );
  });
  dossier.evidence.forEach((evidence, index) => {
    errors.push(
      ...validateScopeRefs(
        evidence.scopeRefs,
        `/evidence/${index}/scopeRefs`,
        lane,
      ),
    );
    if (evidence.kind === 'command' && !commandIdSet.has(evidence.commandId)) {
      errors.push({
        code: 'unknown-command-reference',
        pointer: `/evidence/${index}/commandId`,
        message: `command ${evidence.commandId} does not exist in the dossier`,
      });
    }
  });
  dossier.candidateFindings.forEach((finding, findingIndex) => {
    errors.push(
      ...duplicateErrors(
        finding.evidenceRefIds,
        'duplicate-finding-evidence-reference',
        `/candidateFindings/${findingIndex}/evidenceRefIds`,
        'evidence reference',
      ),
    );
    finding.evidenceRefIds.forEach((evidenceId, evidenceIndex) => {
      if (!evidenceIdSet.has(evidenceId)) {
        errors.push({
          code: 'unknown-evidence-reference',
          pointer: `/candidateFindings/${findingIndex}/evidenceRefIds/${evidenceIndex}`,
          message: `evidence ${evidenceId} does not exist in the dossier`,
        });
      }
    });
  });

  const inspectedPaths = new Set(dossier.inspectedPaths);
  const inspectedObligations = new Set(dossier.inspectedObligationIds);
  const uncoveredObligations = new Set(dossier.uncoveredObligationIds);
  const missingPath = lane.paths.some((path) => !inspectedPaths.has(path));
  const missingPrimaryObligation = lane.primaryObligationIds.some(
    (id) => !inspectedObligations.has(id),
  );
  const invalidObligationPartition = lane.primaryObligationIds.some(
    (id) => inspectedObligations.has(id) === uncoveredObligations.has(id),
  );

  if (
    dossier.outcome === 'complete' &&
    (missingPath ||
      missingPrimaryObligation ||
      dossier.uncoveredObligationIds.length > 0)
  ) {
    errors.push({
      code: 'complete-dossier-incomplete',
      pointer: '/outcome',
      message:
        'complete dossiers must cover every lane path and primary obligation',
    });
  }
  if (dossier.outcome === 'partial') {
    if (
      !missingPath &&
      !missingPrimaryObligation &&
      dossier.uncoveredObligationIds.length === 0 &&
      dossier.uncertainty.length === 0
    ) {
      errors.push({
        code: 'partial-dossier-without-gap',
        pointer: '/outcome',
        message: 'partial dossiers must identify incomplete coverage',
      });
    }
    if (invalidObligationPartition) {
      errors.push({
        code: 'invalid-partial-obligation-partition',
        pointer: '/uncoveredObligationIds',
        message:
          'partial dossiers must partition primary obligations into inspected and uncovered sets',
      });
    }
  }
  return errors;
}
