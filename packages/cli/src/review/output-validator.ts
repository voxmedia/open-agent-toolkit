import { canonicalizeJson, hashCanonicalJson } from './canonical-json';
import { commandResultDigest } from './command-result-digest';
import { findingIdMatchesSeverity } from './structured-finding-identity';
import type {
  ArtifactFindingProjectionV1,
  PlanValidationReceiptV1,
  ReviewAccountingV1,
  ReviewCommandEvidenceV1,
  ReviewPlanV1,
  ReviewerTerminalV1,
  ValidatedAssignmentProjectionV1,
  ValidatedWorkerCoverageProjectionV1,
} from './types';

export interface AccountingValidationError {
  code: string;
  pointer: string;
  message: string;
}

export interface ReviewOutputValidationContext {
  receipt: PlanValidationReceiptV1;
  plan: Pick<ReviewPlanV1, 'strategy' | 'verificationBoundary'> & {
    lanes: Array<
      Pick<ReviewPlanV1['lanes'][number], 'id' | 'delegated' | 'replay'>
    >;
  };
  assignment: ValidatedAssignmentProjectionV1;
  workerCoverage?: ValidatedWorkerCoverageProjectionV1[];
  artifactFindingProjection?: ArtifactFindingProjectionV1;
}

export type OutputValidationResult =
  | { valid: true; outputDigest: string }
  | { valid: false; errors: AccountingValidationError[] };

function add(
  errors: AccountingValidationError[],
  code: string,
  pointer: string,
  message: string,
): void {
  errors.push({ code, pointer, message });
}

function same(left: unknown, right: unknown): boolean {
  return canonicalizeJson(left) === canonicalizeJson(right);
}

function validateExactBucketIds(
  actualIds: readonly string[],
  expectedIds: readonly string[],
  pointer: string,
  errors: AccountingValidationError[],
): void {
  const seen = new Set<string>();
  actualIds.forEach((id, index) => {
    if (seen.has(id)) {
      add(
        errors,
        'duplicate-assignment-bucket',
        `${pointer}/${index}/id`,
        `assignment bucket ${id} is duplicated`,
      );
    }
    seen.add(id);
  });
  const expected = new Set(expectedIds);
  if (
    seen.size !== expected.size ||
    [...seen].some((id) => !expected.has(id)) ||
    [...expected].some((id) => !seen.has(id))
  ) {
    add(
      errors,
      'assignment-mismatch',
      pointer,
      'accounting bucket identities differ from the validated assignment',
    );
  }
}

function validateIdentity(
  context: ReviewOutputValidationContext,
  accounting: ReviewAccountingV1,
  errors: AccountingValidationError[],
): void {
  if (accounting.receipt !== context.receipt.token) {
    add(
      errors,
      'receipt-mismatch',
      '/reviewAccounting/receipt',
      'receipt does not match',
    );
  }
  for (const field of ['contextDigest', 'planDigest'] as const) {
    if (accounting[field] !== context.receipt[field]) {
      add(
        errors,
        'digest-mismatch',
        `/reviewAccounting/${field}`,
        `${field} does not match the validated receipt`,
      );
    }
  }
  if (accounting.assignmentDigest !== context.receipt.assignmentDigest) {
    add(
      errors,
      'assignment-mismatch',
      '/reviewAccounting/assignmentDigest',
      'assignment digest does not match the validated receipt',
    );
  }
  if (accounting.strategy !== context.plan.strategy) {
    add(
      errors,
      'digest-mismatch',
      '/reviewAccounting/strategy',
      'strategy does not match the validated plan',
    );
  }

  if (
    accounting.lanes.length !== context.assignment.lanes.length ||
    accounting.classifications.length !==
      context.assignment.classifications.length
  ) {
    add(
      errors,
      'assignment-mismatch',
      '/reviewAccounting/lanes',
      'accounting bucket count differs from the validated plan',
    );
  }
  validateExactBucketIds(
    accounting.lanes.map((lane) => lane.id),
    context.assignment.lanes.map((lane) => lane.id),
    '/reviewAccounting/lanes',
    errors,
  );
  validateExactBucketIds(
    accounting.classifications.map((classification) => classification.id),
    context.assignment.classifications.map(
      (classification) => classification.id,
    ),
    '/reviewAccounting/classifications',
    errors,
  );
  const expectedLanes = new Map(
    context.assignment.lanes.map((lane) => [lane.id, lane]),
  );
  accounting.lanes.forEach((lane, index) => {
    const expected = expectedLanes.get(lane.id);
    if (expected === undefined) {
      add(
        errors,
        'assignment-mismatch',
        `/reviewAccounting/lanes/${index}/id`,
        `lane ${lane.id} is not in the validated assignment`,
      );
      return;
    }
    for (const field of [
      'paths',
      'primaryObligationIds',
      'seamObligationIds',
    ] as const) {
      if (!same(lane[field], expected[field])) {
        add(
          errors,
          'assignment-mismatch',
          `/reviewAccounting/lanes/${index}/${field}`,
          `${field} differs from the validated assignment`,
        );
      }
    }
  });
  const expectedClassifications = new Map(
    context.assignment.classifications.map((classification) => [
      classification.id,
      classification,
    ]),
  );
  accounting.classifications.forEach((classification, index) => {
    const expected = expectedClassifications.get(classification.id);
    if (expected === undefined) {
      add(
        errors,
        'assignment-mismatch',
        `/reviewAccounting/classifications/${index}/id`,
        `classification ${classification.id} is not in the validated assignment`,
      );
      return;
    }
    const comparisons = {
      kind: expected.kind,
      reason: expected.reason,
      paths: expected.paths,
      planDisposition: expected.disposition,
      strategy: expected.strategy,
      plannedChecks: expected.checks,
      exclusionAuthority: expected.exclusionAuthority,
    };
    for (const [field, expectedValue] of Object.entries(comparisons)) {
      const actual = classification[field as keyof typeof classification];
      if (!same(actual, expectedValue)) {
        add(
          errors,
          'assignment-mismatch',
          `/reviewAccounting/classifications/${index}/${field}`,
          `${field} differs from the validated assignment`,
        );
      }
    }
  });
}

function collectCommands(
  accounting: ReviewAccountingV1,
  errors: AccountingValidationError[],
): Map<string, ReviewCommandEvidenceV1> {
  const commands = new Map<string, ReviewCommandEvidenceV1>();
  const candidates: Array<{
    command: ReviewCommandEvidenceV1;
    pointer: string;
  }> = [];
  accounting.lanes.forEach((lane, laneIndex) => {
    lane.commands.forEach((command, index) =>
      candidates.push({
        command,
        pointer: `/reviewAccounting/lanes/${laneIndex}/commands/${index}`,
      }),
    );
    lane.primaryCompletion.commands.forEach((command, index) =>
      candidates.push({
        command,
        pointer: `/reviewAccounting/lanes/${laneIndex}/primaryCompletion/commands/${index}`,
      }),
    );
  });
  accounting.classifications.forEach((classification, classificationIndex) => {
    classification.commands.forEach((command, index) =>
      candidates.push({
        command,
        pointer: `/reviewAccounting/classifications/${classificationIndex}/commands/${index}`,
      }),
    );
  });
  for (const candidate of candidates) {
    if (commands.has(candidate.command.id)) {
      add(
        errors,
        'duplicate-command-id',
        `${candidate.pointer}/id`,
        `command ID ${candidate.command.id} is duplicated`,
      );
    } else {
      commands.set(candidate.command.id, candidate.command);
    }
  }
  return commands;
}

function validateScopeRefs(
  refs: ReviewCommandEvidenceV1['scopeRefs'],
  pointer: string,
  bucketSizes: Map<string, number>,
  errors: AccountingValidationError[],
): void {
  refs.forEach((ref, index) => {
    const key = `${ref.bucket}:${ref.bucketId}`;
    const size = bucketSizes.get(key);
    if (
      size === undefined ||
      ref.pathIndexes.some((pathIndex) => pathIndex < 0 || pathIndex >= size)
    ) {
      add(
        errors,
        'invalid-scope-reference',
        `${pointer}/${index}`,
        'scope reference does not resolve to an accounting bucket',
      );
    }
  });
}

function validateRegistries(
  context: ReviewOutputValidationContext,
  terminal: ReviewerTerminalV1,
  errors: AccountingValidationError[],
): void {
  const accounting = terminal.reviewAccounting;
  const bucketSizes = new Map<string, number>();
  accounting.lanes.forEach((lane) =>
    bucketSizes.set(`lane:${lane.id}`, lane.paths.length),
  );
  accounting.classifications.forEach((classification) =>
    bucketSizes.set(
      `classification:${classification.id}`,
      classification.paths.length,
    ),
  );
  const commands = collectCommands(accounting, errors);
  for (const [id, command] of commands) {
    validateScopeRefs(
      command.scopeRefs,
      `/reviewAccounting/commands/${id}/scopeRefs`,
      bucketSizes,
      errors,
    );
  }

  const evidence = new Map<string, ReviewAccountingV1['evidence'][number]>();
  accounting.evidence.forEach((entry, index) => {
    const pointer = `/reviewAccounting/evidence/${index}`;
    if (evidence.has(entry.id)) {
      add(
        errors,
        'duplicate-evidence-id',
        `${pointer}/id`,
        `evidence ID ${entry.id} is duplicated`,
      );
    } else {
      evidence.set(entry.id, entry);
    }
    validateScopeRefs(
      entry.scopeRefs,
      `${pointer}/scopeRefs`,
      bucketSizes,
      errors,
    );
    if (entry.kind === 'command') {
      const command = commands.get(entry.commandId);
      if (command === undefined) {
        add(
          errors,
          'unknown-command-reference',
          `${pointer}/commandId`,
          'command evidence refers to an unknown command',
        );
      } else if (entry.commandResultDigest !== commandResultDigest(command)) {
        add(
          errors,
          'digest-mismatch',
          `${pointer}/commandResultDigest`,
          'command result digest does not match',
        );
      }
    }
  });

  const evidenceReferences: Array<{ id: string; pointer: string }> = [];
  accounting.lanes.forEach((lane, laneIndex) => {
    lane.evidenceRefIds.forEach((id, index) =>
      evidenceReferences.push({
        id,
        pointer: `/reviewAccounting/lanes/${laneIndex}/evidenceRefIds/${index}`,
      }),
    );
    lane.primaryCompletion.evidenceRefIds.forEach((id, index) =>
      evidenceReferences.push({
        id,
        pointer: `/reviewAccounting/lanes/${laneIndex}/primaryCompletion/evidenceRefIds/${index}`,
      }),
    );
  });

  const claims = new Map<string, ReviewAccountingV1['verification'][number]>();
  const laneIds = new Set(accounting.lanes.map((lane) => lane.id));
  const findingIds = new Set<string>();
  if (
    terminal.status === 'complete' &&
    terminal.candidate.kind === 'structured'
  ) {
    terminal.candidate.review.findings.forEach((finding, index) => {
      if (!findingIdMatchesSeverity(finding.id, finding.severity)) {
        add(
          errors,
          'invalid-finding-id',
          `/candidate/review/findings/${index}/id`,
          `finding ID ${finding.id} does not match severity ${finding.severity}`,
        );
      }
      if (findingIds.has(finding.id)) {
        add(
          errors,
          'duplicate-finding-id',
          `/candidate/review/findings/${index}/id`,
          `finding ID ${finding.id} is duplicated`,
        );
      }
      findingIds.add(finding.id);
    });
  } else if (
    terminal.status === 'complete' &&
    terminal.candidate.kind === 'artifact-draft'
  ) {
    const projection = context.artifactFindingProjection;
    if (projection === undefined) {
      add(
        errors,
        'missing-artifact-projection',
        '/candidate',
        'artifact output requires a launcher-derived finding projection',
      );
    } else {
      if (
        projection.schemaVersion !== 1 ||
        !/^[0-9a-f]{64}$/.test(projection.snapshotDigest) ||
        projection.accountingDigest !== hashCanonicalJson(accounting)
      ) {
        add(
          errors,
          'artifact-projection-mismatch',
          '/artifactFindingProjection',
          'artifact projection is not bound to the accepted accounting snapshot',
        );
      }
      projection.findingIds.forEach((findingId, index) => {
        if (findingIds.has(findingId)) {
          add(
            errors,
            'duplicate-finding-id',
            `/artifactFindingProjection/findingIds/${index}`,
            `finding ID ${findingId} is duplicated`,
          );
        }
        findingIds.add(findingId);
      });
    }
  }

  accounting.verification.forEach((claim, index) => {
    const pointer = `/reviewAccounting/verification/${index}`;
    if (claims.has(claim.claimId)) {
      add(
        errors,
        'duplicate-claim-id',
        `${pointer}/claimId`,
        `claim ID ${claim.claimId} is duplicated`,
      );
    } else {
      claims.set(claim.claimId, claim);
    }
    claim.laneIds.forEach((id, laneIndex) => {
      if (!laneIds.has(id)) {
        add(
          errors,
          'unknown-lane-reference',
          `${pointer}/laneIds/${laneIndex}`,
          `lane ${id} does not exist`,
        );
      }
    });
    claim.evidenceRefIds.forEach((id, evidenceIndex) =>
      evidenceReferences.push({
        id,
        pointer: `${pointer}/evidenceRefIds/${evidenceIndex}`,
      }),
    );

    const directKinds = new Set([
      'promoted-finding',
      'consequential-absence',
      'worker-conflict',
      'cross-lane-gap',
    ]);
    const expectedMode =
      claim.kind === 'deterministic-result'
        ? 'provenance'
        : claim.kind === 'positive-coverage-sample'
          ? 'sample'
          : 'direct';
    const dispositionAllowed =
      claim.disposition === 'verified' ||
      ((claim.kind === 'promoted-finding' ||
        claim.kind === 'consequential-absence' ||
        claim.kind === 'worker-conflict' ||
        claim.kind === 'cross-lane-gap') &&
        claim.disposition === 'rejected') ||
      (claim.disposition === 'unresolved' &&
        accounting.completion === 'blocked-incomplete');
    if (
      claim.mode !== expectedMode ||
      !dispositionAllowed ||
      (directKinds.has(claim.kind) && claim.mode !== 'direct')
    ) {
      add(
        errors,
        'invalid-claim-disposition',
        pointer,
        'claim mode or disposition is invalid',
      );
    }
    if (claim.kind === 'promoted-finding') {
      const verifiesFinding =
        claim.findingId !== null &&
        findingIds.has(claim.findingId) &&
        claim.disposition === 'verified';
      const verifiesNoPromotion =
        claim.findingId === null && claim.disposition === 'rejected';
      if (
        (!verifiesFinding && !verifiesNoPromotion) ||
        claim.evidenceRefIds.length === 0
      ) {
        add(
          errors,
          'missing-verification-claim',
          pointer,
          'promoted finding claim is not directly verified',
        );
      }
    } else if (claim.findingId !== null) {
      add(
        errors,
        'invalid-claim-disposition',
        `${pointer}/findingId`,
        'only promoted finding claims may name a finding',
      );
    }
    if (
      claim.kind === 'deterministic-result' &&
      !claim.evidenceRefIds.some((id) => evidence.get(id)?.kind === 'command')
    ) {
      add(
        errors,
        'invalid-claim-disposition',
        pointer,
        'deterministic result requires command evidence',
      );
    }
  });

  const provenanceLaneIds = context.plan.lanes
    .filter((lane) => lane.delegated && lane.replay === 'accept-provenance')
    .map((lane) => lane.id);
  const provenanceLanes = new Set(provenanceLaneIds);
  const deterministicClaims = accounting.verification
    .map((claim, index) => ({ claim, index }))
    .filter(({ claim }) => claim.kind === 'deterministic-result');
  deterministicClaims.forEach(({ claim, index }) => {
    const pointer = `/reviewAccounting/verification/${index}`;
    const laneId = claim.laneIds.length === 1 ? claim.laneIds[0] : undefined;
    if (laneId === undefined || !provenanceLanes.has(laneId)) {
      add(
        errors,
        'invalid-deterministic-provenance',
        `${pointer}/laneIds`,
        'deterministic result must select exactly one sealed provenance lane',
      );
      return;
    }
    const hasScopedCommandEvidence = claim.evidenceRefIds.some((evidenceId) => {
      const entry = evidence.get(evidenceId);
      if (entry?.kind !== 'command') return false;
      const command = commands.get(entry.commandId);
      if (command === undefined) return false;
      const scopesLane = (
        refs: ReviewCommandEvidenceV1['scopeRefs'],
      ): boolean =>
        refs.some((ref) => ref.bucket === 'lane' && ref.bucketId === laneId);
      return scopesLane(entry.scopeRefs) && scopesLane(command.scopeRefs);
    });
    if (!hasScopedCommandEvidence) {
      add(
        errors,
        'invalid-deterministic-provenance',
        pointer,
        `deterministic result for lane ${laneId} requires command evidence scoped to that lane`,
      );
    }
  });
  provenanceLaneIds.forEach((laneId) => {
    const matching = deterministicClaims.filter(
      ({ claim }) => claim.laneIds.length === 1 && claim.laneIds[0] === laneId,
    );
    if (matching.length !== 1) {
      add(
        errors,
        'missing-deterministic-provenance',
        '/reviewAccounting/verification',
        `sealed provenance lane ${laneId} requires exactly one deterministic result`,
      );
    }
  });

  const requiredDirectKinds = new Set(
    context.plan.verificationBoundary.requiredClaims.map(
      (required) => required.kind,
    ),
  );
  for (const requiredKind of requiredDirectKinds) {
    const matching = accounting.verification.filter(
      (claim) =>
        claim.kind === requiredKind &&
        claim.mode === 'direct' &&
        claim.evidenceRefIds.length > 0,
    );
    if (matching.length === 0) {
      add(
        errors,
        'missing-required-claim',
        '/reviewAccounting/verification',
        `required direct claim ${requiredKind} is missing evidence`,
      );
    }
  }

  const plannedSamples = new Set(
    context.plan.verificationBoundary.positiveCoverage.laneIds,
  );
  const sampledLanes = new Set<string>();
  accounting.verification
    .filter((claim) => claim.kind === 'positive-coverage-sample')
    .forEach((claim, index) => {
      const valid =
        claim.mode === 'sample' &&
        claim.disposition === 'verified' &&
        claim.evidenceRefIds.length > 0 &&
        claim.laneIds.length > 0 &&
        claim.laneIds.every((laneId) => plannedSamples.has(laneId));
      if (!valid) {
        add(
          errors,
          'missing-positive-coverage',
          `/reviewAccounting/verification/${index}`,
          'positive coverage claim is not an evidenced planned sample',
        );
      }
      claim.laneIds.forEach((laneId) => sampledLanes.add(laneId));
    });
  if (
    plannedSamples.size !== sampledLanes.size ||
    [...plannedSamples].some((laneId) => !sampledLanes.has(laneId))
  ) {
    add(
      errors,
      'missing-positive-coverage',
      '/reviewAccounting/verification',
      'positive coverage samples do not match the validated plan',
    );
  }

  for (const findingId of findingIds) {
    const matching = accounting.verification.filter(
      (claim) =>
        claim.kind === 'promoted-finding' && claim.findingId === findingId,
    );
    if (matching.length !== 1) {
      add(
        errors,
        'missing-verification-claim',
        '/reviewAccounting/verification',
        `finding ${findingId} must have exactly one promoted-finding claim`,
      );
    }
  }
  for (const reference of evidenceReferences) {
    if (!evidence.has(reference.id)) {
      add(
        errors,
        'unknown-evidence-reference',
        reference.pointer,
        `evidence ${reference.id} does not exist`,
      );
    }
  }
}

function validateOutcomes(
  context: ReviewOutputValidationContext,
  terminal: ReviewerTerminalV1,
  errors: AccountingValidationError[],
): void {
  const accounting = terminal.reviewAccounting;
  const expectedLanes = new Map(
    context.assignment.lanes.map((lane) => [lane.id, lane]),
  );
  const planLanes = new Map(context.plan.lanes.map((lane) => [lane.id, lane]));
  const workerCoverage = context.workerCoverage ?? [];
  const workerCoverageByLane = new Map<
    string,
    ValidatedWorkerCoverageProjectionV1
  >();
  workerCoverage.forEach((coverage, index) => {
    if (workerCoverageByLane.has(coverage.laneId)) {
      add(
        errors,
        'duplicate-worker-coverage',
        `/workerCoverage/${index}/laneId`,
        `worker coverage for lane ${coverage.laneId} is duplicated`,
      );
    }
    workerCoverageByLane.set(coverage.laneId, coverage);
  });
  let incomplete = false;
  accounting.lanes.forEach((lane, index) => {
    const pointer = `/reviewAccounting/lanes/${index}`;
    const expected = expectedLanes.get(lane.id);
    if (expected === undefined) return;
    const planLane = planLanes.get(lane.id);
    const contingency = expected.primaryContingency;
    const contingencyPathIndexes = contingency.paths.map((path) =>
      lane.paths.indexOf(path),
    );
    const completedPathIndexes = new Set(
      lane.primaryCompletion.completedPathIndexes,
    );
    const completedObligationIds = new Set(
      lane.primaryCompletion.completedObligationIds,
    );
    const workerProjection = workerCoverageByLane.get(lane.id);
    const expectedPathIndexSet = new Set(
      expected.paths.map((_, pathIndex) => pathIndex),
    );
    const expectedPrimaryObligationSet = new Set(expected.primaryObligationIds);
    let workerUncoveredPathIndexes: number[];
    let workerUncoveredObligationIds: string[];
    if (lane.workerOutcome === 'uncovered') {
      workerUncoveredPathIndexes = [...expectedPathIndexSet];
      workerUncoveredObligationIds = [...expectedPrimaryObligationSet];
    } else if (lane.workerOutcome === 'not-delegated') {
      const inlinePathIndexes = new Set(lane.uninspectedPathIndexes);
      const inlineObligationIds = new Set(lane.uncoveredObligationIds);
      if (
        inlinePathIndexes.size !== lane.uninspectedPathIndexes.length ||
        inlineObligationIds.size !== lane.uncoveredObligationIds.length ||
        [...inlinePathIndexes].some(
          (pathIndex) => !expectedPathIndexSet.has(pathIndex),
        ) ||
        [...inlineObligationIds].some(
          (obligationId) => !expectedPrimaryObligationSet.has(obligationId),
        )
      ) {
        add(
          errors,
          'invalid-worker-coverage',
          pointer,
          'inline coverage must be a unique subset of the validated lane',
        );
      }
      workerUncoveredPathIndexes = [...lane.uninspectedPathIndexes];
      workerUncoveredObligationIds = [...lane.uncoveredObligationIds];
    } else if (workerProjection === undefined) {
      add(
        errors,
        'missing-worker-coverage',
        pointer,
        'delegated worker coverage requires a launcher-validated dossier projection',
      );
      workerUncoveredPathIndexes = [...expectedPathIndexSet];
      workerUncoveredObligationIds = [...expectedPrimaryObligationSet];
    } else {
      const inspectedPathIndexes = new Set(
        workerProjection.inspectedPathIndexes,
      );
      const uncoveredPathIndexes = new Set(
        workerProjection.uncoveredPathIndexes,
      );
      const inspectedObligationIds = new Set(
        workerProjection.inspectedObligationIds,
      );
      const uncoveredObligationIds = new Set(
        workerProjection.uncoveredObligationIds,
      );
      const validPathPartition =
        inspectedPathIndexes.size ===
          workerProjection.inspectedPathIndexes.length &&
        uncoveredPathIndexes.size ===
          workerProjection.uncoveredPathIndexes.length &&
        [...expectedPathIndexSet].every(
          (pathIndex) =>
            inspectedPathIndexes.has(pathIndex) !==
            uncoveredPathIndexes.has(pathIndex),
        ) &&
        [...inspectedPathIndexes, ...uncoveredPathIndexes].every((pathIndex) =>
          expectedPathIndexSet.has(pathIndex),
        );
      const validObligationPartition =
        inspectedObligationIds.size ===
          workerProjection.inspectedObligationIds.length &&
        uncoveredObligationIds.size ===
          workerProjection.uncoveredObligationIds.length &&
        [...expectedPrimaryObligationSet].every(
          (obligationId) =>
            inspectedObligationIds.has(obligationId) !==
            uncoveredObligationIds.has(obligationId),
        ) &&
        [...inspectedObligationIds, ...uncoveredObligationIds].every(
          (obligationId) => expectedPrimaryObligationSet.has(obligationId),
        );
      if (!validPathPartition || !validObligationPartition) {
        add(
          errors,
          'invalid-worker-coverage',
          `/workerCoverage/${workerCoverage.indexOf(workerProjection)}`,
          'worker coverage does not exactly partition the validated lane',
        );
      }
      if (
        workerProjection.validationRunId !== context.receipt.validationRunId ||
        workerProjection.planDigest !== context.receipt.planDigest ||
        workerProjection.outcome !== lane.workerOutcome ||
        workerProjection.dossierDigest !== lane.dossierDigest ||
        !/^[0-9a-f]{64}$/.test(workerProjection.dossierDigest)
      ) {
        add(
          errors,
          'worker-coverage-identity-mismatch',
          pointer,
          'worker coverage is not bound to this validation run and accepted dossier',
        );
      }
      workerUncoveredPathIndexes = [...uncoveredPathIndexes];
      workerUncoveredObligationIds = [...uncoveredObligationIds];
    }
    const expectedPathIndexes = new Set(contingencyPathIndexes);
    const expectedObligationIds = new Set(contingency.obligationIds);
    const completedSubsetValid =
      completedPathIndexes.size ===
        lane.primaryCompletion.completedPathIndexes.length &&
      completedObligationIds.size ===
        lane.primaryCompletion.completedObligationIds.length &&
      [...completedPathIndexes].every((item) =>
        expectedPathIndexes.has(item),
      ) &&
      [...completedObligationIds].every((item) =>
        expectedObligationIds.has(item),
      ) &&
      [...completedPathIndexes].every((item) =>
        workerUncoveredPathIndexes.includes(item),
      ) &&
      [...completedObligationIds].every((item) =>
        workerUncoveredObligationIds.includes(item),
      );
    const exactCompletion =
      completedSubsetValid &&
      completedPathIndexes.size === expectedPathIndexes.size &&
      completedObligationIds.size === expectedObligationIds.size;
    const hasCompletionEvidence =
      lane.primaryCompletion.evidenceRefIds.length > 0;
    const hasCompletionCommands = lane.primaryCompletion.commands.length > 0;
    const primaryOutcomeValid =
      (lane.primaryCompletion.outcome === 'not-needed' &&
        (lane.workerOutcome === 'not-delegated' ||
          lane.workerOutcome === 'complete') &&
        completedPathIndexes.size === 0 &&
        completedObligationIds.size === 0 &&
        !hasCompletionCommands &&
        !hasCompletionEvidence) ||
      (lane.primaryCompletion.outcome === 'not-permitted' &&
        !contingency.allowed &&
        (lane.workerOutcome === 'partial' ||
          lane.workerOutcome === 'uncovered') &&
        completedPathIndexes.size === 0 &&
        completedObligationIds.size === 0 &&
        !hasCompletionCommands &&
        !hasCompletionEvidence) ||
      (lane.primaryCompletion.outcome === 'not-attempted' &&
        contingency.allowed &&
        (lane.workerOutcome === 'partial' ||
          lane.workerOutcome === 'uncovered') &&
        completedPathIndexes.size === 0 &&
        completedObligationIds.size === 0 &&
        !hasCompletionCommands &&
        !hasCompletionEvidence) ||
      (lane.primaryCompletion.outcome === 'complete' &&
        contingency.allowed &&
        (lane.workerOutcome === 'partial' ||
          lane.workerOutcome === 'uncovered') &&
        exactCompletion &&
        hasCompletionEvidence) ||
      (lane.primaryCompletion.outcome === 'partial' &&
        contingency.allowed &&
        (lane.workerOutcome === 'partial' ||
          lane.workerOutcome === 'uncovered') &&
        completedSubsetValid &&
        hasCompletionEvidence &&
        (completedPathIndexes.size > 0 || completedObligationIds.size > 0) &&
        !exactCompletion);
    if (!primaryOutcomeValid) {
      add(
        errors,
        'invalid-contingency',
        `${pointer}/primaryCompletion`,
        'primary completion does not match the permitted contingency',
      );
    }

    const workerIdentityValid =
      (lane.workerOutcome === 'not-delegated' &&
        planLane?.delegated === false &&
        lane.dossierDigest === null &&
        workerProjection === undefined) ||
      (lane.workerOutcome === 'uncovered' &&
        planLane?.delegated === true &&
        lane.dossierDigest === null &&
        workerProjection === undefined) ||
      ((lane.workerOutcome === 'complete' ||
        lane.workerOutcome === 'partial') &&
        planLane?.delegated === true &&
        lane.dossierDigest !== null &&
        workerProjection !== undefined);
    if (!workerIdentityValid) {
      add(errors, 'invalid-outcome', pointer, 'lane worker outcome is invalid');
    }

    const remainingPathIndexes = workerUncoveredPathIndexes.filter(
      (pathIndex) => !completedPathIndexes.has(pathIndex),
    );
    const remainingObligationIds = workerUncoveredObligationIds.filter(
      (obligationId) => !completedObligationIds.has(obligationId),
    );
    const derivedCoverage =
      remainingPathIndexes.length === 0 && remainingObligationIds.length === 0
        ? 'all'
        : remainingPathIndexes.length === lane.paths.length &&
            remainingObligationIds.length === lane.primaryObligationIds.length
          ? 'none'
          : 'partial';
    if (
      lane.inspectionCoverage !== derivedCoverage ||
      !same(
        [...lane.uninspectedPathIndexes].sort((left, right) => left - right),
        [...remainingPathIndexes].sort((left, right) => left - right),
      ) ||
      !same(
        [...lane.uncoveredObligationIds].sort(),
        [...remainingObligationIds].sort(),
      )
    ) {
      add(
        errors,
        'contingency-coverage-mismatch',
        pointer,
        'reported coverage does not match worker and primary evidence',
      );
    }
    if (derivedCoverage !== 'all') incomplete = true;
  });

  accounting.classifications.forEach((classification, index) => {
    const pointer = `/reviewAccounting/classifications/${index}`;
    const excluded =
      classification.kind === 'excluded' &&
      classification.planDisposition === 'justified-exclusion' &&
      classification.strategy === 'none' &&
      classification.exclusionAuthority !== null &&
      classification.outcome === 'excluded' &&
      classification.inspectionCoverage === 'excluded' &&
      classification.uninspectedPathIndexes.length === 0 &&
      classification.commands.length === 0;
    const inspected =
      classification.kind !== 'excluded' &&
      classification.planDisposition === 'inspect' &&
      classification.strategy !== 'none' &&
      classification.plannedChecks.length > 0 &&
      ((classification.outcome === 'complete' &&
        classification.inspectionCoverage === 'all' &&
        classification.uninspectedPathIndexes.length === 0) ||
        (classification.outcome === 'partial' &&
          classification.inspectionCoverage === 'partial' &&
          classification.uninspectedPathIndexes.length > 0) ||
        (classification.outcome === 'uncovered' &&
          classification.inspectionCoverage === 'none' &&
          classification.uninspectedPathIndexes.length ===
            classification.paths.length));
    if (!excluded && !inspected) {
      add(
        errors,
        'invalid-classification',
        pointer,
        'classification outcome matrix is invalid',
      );
    }
    if (!excluded && classification.inspectionCoverage !== 'all') {
      incomplete = true;
    }
  });
  if (
    accounting.verification.some((claim) => claim.disposition === 'unresolved')
  ) {
    incomplete = true;
  }
  if (
    (incomplete && accounting.completion !== 'blocked-incomplete') ||
    (!incomplete && accounting.completion !== 'complete') ||
    (accounting.completion === 'blocked-incomplete' &&
      terminal.status !== 'blocked') ||
    (accounting.completion === 'complete' && terminal.status !== 'complete')
  ) {
    add(
      errors,
      'invalid-outcome',
      '/reviewAccounting/completion',
      'terminal status and accounting completion are contradictory',
    );
  }
}

export function validateReviewOutput(
  context: ReviewOutputValidationContext,
  terminal: ReviewerTerminalV1,
): OutputValidationResult {
  const errors: AccountingValidationError[] = [];
  validateIdentity(context, terminal.reviewAccounting, errors);
  validateRegistries(context, terminal, errors);
  validateOutcomes(context, terminal, errors);
  return errors.length === 0
    ? { valid: true, outputDigest: hashCanonicalJson(terminal) }
    : { valid: false, errors };
}
