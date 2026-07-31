import { canonicalizeJson, hashCanonicalJson } from './canonical-json';
import type {
  PlanValidationReceiptV1,
  ReviewAccountingV1,
  ReviewCommandEvidenceV1,
  ReviewPlanV1,
  ReviewerTerminalV1,
  ValidatedAssignmentProjectionV1,
} from './types';

export interface AccountingValidationError {
  code: string;
  pointer: string;
  message: string;
}

export interface ReviewOutputValidationContext {
  receipt: PlanValidationReceiptV1;
  plan: Pick<ReviewPlanV1, 'strategy' | 'verificationBoundary'>;
  assignment: ValidatedAssignmentProjectionV1;
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

function commandResultDigest(command: ReviewCommandEvidenceV1): string {
  return hashCanonicalJson({
    scopeRefs: command.scopeRefs,
    provenance: command.provenance,
    result: command.result,
  });
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

  const echoed = {
    lanes: accounting.lanes
      .map((lane) => ({
        id: lane.id,
        paths: lane.paths,
        primaryObligationIds: lane.primaryObligationIds,
        seamObligationIds: lane.seamObligationIds,
        primaryContingency:
          context.assignment.lanes.find((entry) => entry.id === lane.id)
            ?.primaryContingency ?? null,
      }))
      .sort((left, right) => left.id.localeCompare(right.id)),
    classifications: accounting.classifications
      .map((classification) => ({
        id: classification.id,
        kind: classification.kind,
        reason: classification.reason,
        paths: classification.paths,
        disposition: classification.planDisposition,
        strategy: classification.strategy,
        checks: classification.plannedChecks,
        exclusionAuthority: classification.exclusionAuthority,
      }))
      .sort((left, right) => left.id.localeCompare(right.id)),
  };
  if (!same(echoed, context.assignment)) {
    add(
      errors,
      'assignment-mismatch',
      '/reviewAccounting',
      'accounting assignment projection differs from the validated plan',
    );
  }
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
      ((claim.kind === 'consequential-absence' ||
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
      if (
        claim.findingId === null ||
        !findingIds.has(claim.findingId) ||
        claim.disposition !== 'verified' ||
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
  terminal: ReviewerTerminalV1,
  errors: AccountingValidationError[],
): void {
  const accounting = terminal.reviewAccounting;
  let incomplete = false;
  accounting.lanes.forEach((lane, index) => {
    const pointer = `/reviewAccounting/lanes/${index}`;
    const allIndexes = lane.paths.map((_, pathIndex) => pathIndex);
    const coverageValid =
      (lane.inspectionCoverage === 'all' &&
        lane.uninspectedPathIndexes.length === 0 &&
        lane.uncoveredObligationIds.length === 0) ||
      (lane.inspectionCoverage === 'partial' &&
        lane.uninspectedPathIndexes.length > 0 &&
        lane.uninspectedPathIndexes.length < lane.paths.length &&
        lane.uncoveredObligationIds.length > 0) ||
      (lane.inspectionCoverage === 'none' &&
        same(lane.uninspectedPathIndexes, allIndexes) &&
        same(
          [...lane.uncoveredObligationIds].sort(),
          [...lane.primaryObligationIds].sort(),
        ));
    const workerValid =
      (lane.workerOutcome === 'not-delegated' &&
        lane.dossierDigest === null &&
        lane.primaryCompletion.outcome === 'not-needed') ||
      (lane.workerOutcome === 'complete' &&
        lane.dossierDigest !== null &&
        lane.inspectionCoverage === 'all' &&
        lane.primaryCompletion.outcome === 'not-needed') ||
      ((lane.workerOutcome === 'partial' ||
        lane.workerOutcome === 'uncovered') &&
        (lane.workerOutcome === 'partial'
          ? lane.dossierDigest !== null
          : lane.dossierDigest === null) &&
        ['complete', 'partial', 'not-attempted', 'not-permitted'].includes(
          lane.primaryCompletion.outcome,
        ));
    if (!coverageValid || !workerValid) {
      add(errors, 'invalid-outcome', pointer, 'lane outcome matrix is invalid');
    }
    if (lane.inspectionCoverage !== 'all') incomplete = true;
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
  validateRegistries(terminal, errors);
  validateOutcomes(terminal, errors);
  return errors.length === 0
    ? { valid: true, outputDigest: hashCanonicalJson(terminal) }
    : { valid: false, errors };
}
