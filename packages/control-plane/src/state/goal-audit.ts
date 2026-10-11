import type {
  BriefOutcome,
  GoalAuditError,
  GoalAuditOutcomeDisposition,
  GoalAuditOutcomeEntry,
  GoalAuditPhaseDisposition,
  GoalAuditPhaseEntry,
  GoalOutcomeAudit,
  GoalOutcomeAuditValidation,
  PhaseProgress,
} from '../types';
import { readRecordLines } from './quick-plan-readiness';
import { normalizePhaseId } from './tasks';

const OUTCOMES_HEADING_PATTERN = /^## Outcomes[ \t]*$/;
const HEADING_LINE_PATTERN = /^#/;
const OUTCOME_ITEM_PATTERN = /^(\d+)\.[ \t]+(.*)$/;

const PHASE_DISPOSITIONS: readonly GoalAuditPhaseDisposition[] = [
  'accepted',
  'extracted',
  'deferred',
  'retired',
];
const OUTCOME_DISPOSITIONS: readonly GoalAuditOutcomeDisposition[] = [
  'met',
  'extracted',
  'deferred',
  'retired',
];

/**
 * The numbered outcomes of a brief's `## Outcomes` section, in document
 * order. Fenced and indented code is ignored; an item's text is its first
 * line plus any continuation lines up to the next item or blank line, with
 * whitespace collapsed. The number and text together bind an audit entry.
 */
export function parseBriefOutcomes(planContent: string): BriefOutcome[] {
  const outcomes: BriefOutcome[] = [];
  let inSection = false;
  let current: BriefOutcome | null = null;

  for (const line of readRecordLines(planContent.split('\n'))) {
    if (OUTCOMES_HEADING_PATTERN.test(line)) {
      inSection = true;
      current = null;
      continue;
    }
    if (HEADING_LINE_PATTERN.test(line)) {
      inSection = false;
      current = null;
      continue;
    }
    if (!inSection) {
      continue;
    }

    const trimmed = line.trim();
    const item = trimmed.match(OUTCOME_ITEM_PATTERN);
    if (item?.[1] !== undefined) {
      current = {
        number: normalizeOutcomeNumber(item[1]),
        text: collapse(item[2] ?? ''),
      };
      outcomes.push(current);
      continue;
    }
    if (trimmed === '' || trimmed.startsWith('<!--')) {
      current = null;
      continue;
    }
    if (current !== null) {
      current.text = collapse(`${current.text} ${trimmed}`);
    }
  }

  return outcomes;
}

/**
 * The single terminal-audit predicate (A3). It enumerates the brief's full
 * phase inventory — ordinary, revision and extracted phases alike, before any
 * execution-scope filtering — and every numbered outcome, and reports each
 * unknown, duplicate, omitted or contradictory reference. The router and the
 * closeout boundary consume this result rather than re-validating.
 *
 * `fullPhaseInventory` is the goal phase-unit progress (`phaseUnits` and
 * `extractedUnits`), so "accepted" means the real phase-unit contract reports
 * acceptance, including provisional precedence.
 */
export function validateGoalOutcomeAudit(
  audit: unknown,
  fullPhaseInventory: readonly PhaseProgress[],
  outcomes: readonly BriefOutcome[],
): GoalOutcomeAuditValidation {
  const errors: GoalAuditError[] = [];
  if (audit === null || audit === undefined) {
    return invalid([
      {
        code: 'audit-missing',
        message:
          'No outcome audit is recorded; oat-project-goal records it with the terminal declaration.',
      },
    ]);
  }
  if (!isRecord(audit)) {
    return invalid([
      {
        code: 'audit-malformed',
        message: 'The outcome audit is not a mapping.',
      },
    ]);
  }

  const disposition = audit.disposition;
  if (disposition !== 'met' && disposition !== 'met_with_deferrals') {
    errors.push({
      code: 'audit-disposition-invalid',
      message: 'The audit disposition must be "met" or "met_with_deferrals".',
    });
  }
  for (const field of ['decided_at', 'declaration_ref', 'brief_identity']) {
    if (!isNonEmptyString(audit[field])) {
      errors.push({
        code: 'audit-field-missing',
        message: `The audit has no ${field}.`,
        subject: field,
      });
    }
  }

  const phases = validatePhaseEntries(audit.phases, fullPhaseInventory, errors);
  const outcomeEntries = validateOutcomeEntries(
    audit.outcomes,
    outcomes,
    errors,
  );

  const hasDeferral =
    Object.values(phases).some(isDeferralLike) ||
    Object.values(outcomeEntries).some(isDeferralLike);
  if (disposition === 'met' && hasDeferral) {
    errors.push({
      code: 'audit-met-with-deferrals',
      message:
        'The audit says "met" while an obligation is deferred or retired; use "met_with_deferrals".',
    });
  }

  if (errors.length > 0) {
    return invalid(errors);
  }

  return {
    valid: true,
    errors: [],
    audit: {
      disposition: disposition as GoalOutcomeAudit['disposition'],
      decided_at: audit.decided_at as string,
      declaration_ref: audit.declaration_ref as string,
      brief_identity: audit.brief_identity as string,
      phases,
      outcomes: outcomeEntries,
    },
  };
}

function validatePhaseEntries(
  value: unknown,
  inventory: readonly PhaseProgress[],
  errors: GoalAuditError[],
): Record<string, GoalAuditPhaseEntry> {
  const entries: Record<string, GoalAuditPhaseEntry> = {};
  if (!isRecord(value)) {
    errors.push({
      code: 'audit-malformed',
      message: 'The audit has no phases mapping.',
    });
  }
  const byId = new Map<string, PhaseProgress>();
  for (const phase of inventory) {
    if (!byId.has(phase.phaseId)) {
      byId.set(phase.phaseId, phase);
    }
  }

  for (const [key, raw] of Object.entries(isRecord(value) ? value : {})) {
    const phaseId = normalizePhaseId(key.trim());
    const phase = phaseId === null ? undefined : byId.get(phaseId);
    if (phaseId === null || phase === undefined) {
      errors.push({
        code: 'audit-phase-unknown',
        message: `The audit names ${key}, which the brief does not declare.`,
        subject: key,
      });
      continue;
    }
    if (entries[phaseId] !== undefined) {
      errors.push({
        code: 'audit-phase-duplicate',
        message: `The audit names ${phaseId} more than once.`,
        subject: phaseId,
      });
      continue;
    }

    const record = isRecord(raw) ? raw : null;
    const disposition = record?.disposition;
    if (
      record === null ||
      !PHASE_DISPOSITIONS.includes(disposition as GoalAuditPhaseDisposition)
    ) {
      errors.push({
        code: 'audit-phase-disposition-invalid',
        message: `Phase ${phaseId} needs one disposition: accepted, extracted, deferred or retired.`,
        subject: phaseId,
      });
      continue;
    }
    const entry: GoalAuditPhaseEntry = {
      disposition: disposition as GoalAuditPhaseDisposition,
      reason: readOptionalString(record.reason),
      scope_decision_ref: readOptionalString(record.scope_decision_ref),
    };
    entries[phaseId] = entry;
    checkPhaseEntry(phaseId, entry, phase, errors);
  }

  for (const phaseId of byId.keys()) {
    if (entries[phaseId] === undefined && !hasErrorFor(errors, phaseId)) {
      errors.push({
        code: 'audit-phase-omitted',
        message: `The audit has no disposition for phase ${phaseId}.`,
        subject: phaseId,
      });
    }
  }

  return entries;
}

function checkPhaseEntry(
  phaseId: string,
  entry: GoalAuditPhaseEntry,
  phase: PhaseProgress,
  errors: GoalAuditError[],
): void {
  const extracted = phase.extracted !== undefined;
  const accepted =
    !extracted &&
    phase.provisional !== true &&
    phase.total > 0 &&
    phase.completed === phase.total;

  if (extracted && entry.disposition !== 'extracted') {
    errors.push({
      code: 'audit-phase-contradictory',
      message: `Phase ${phaseId} is extracted to ${phase.extracted?.to}; its audit disposition must be "extracted".`,
      subject: phaseId,
    });
    return;
  }

  switch (entry.disposition) {
    case 'accepted':
      if (!accepted) {
        errors.push({
          code: 'audit-phase-not-accepted',
          message: `Phase ${phaseId} is claimed accepted, but the phase-unit contract does not report it accepted${phase.provisional === true ? ' (it is provisional)' : ''}.`,
          subject: phaseId,
        });
      }
      return;
    case 'extracted':
      if (!extracted) {
        errors.push({
          code: 'audit-phase-not-extracted',
          message: `Phase ${phaseId} is claimed extracted, but the journal does not mark it extracted with a target.`,
          subject: phaseId,
        });
      }
      return;
    case 'deferred':
    case 'retired':
      if (accepted) {
        errors.push({
          code: 'audit-phase-contradictory',
          message: `Phase ${phaseId} is accepted but the audit says ${entry.disposition}.`,
          subject: phaseId,
        });
      }
      if (
        !isNonEmptyString(entry.reason) ||
        !isNonEmptyString(entry.scope_decision_ref)
      ) {
        errors.push({
          code: 'audit-deferral-reason-missing',
          message: `Phase ${phaseId} is ${entry.disposition} without a reason and scope_decision_ref.`,
          subject: phaseId,
        });
      }
      return;
  }
}

function validateOutcomeEntries(
  value: unknown,
  outcomes: readonly BriefOutcome[],
  errors: GoalAuditError[],
): Record<string, GoalAuditOutcomeEntry> {
  const entries: Record<string, GoalAuditOutcomeEntry> = {};
  if (!isRecord(value)) {
    errors.push({
      code: 'audit-malformed',
      message: 'The audit has no outcomes mapping.',
    });
  }
  const byNumber = new Map<string, BriefOutcome>();
  for (const outcome of outcomes) {
    if (!byNumber.has(outcome.number)) {
      byNumber.set(outcome.number, outcome);
    }
  }

  for (const [key, raw] of Object.entries(isRecord(value) ? value : {})) {
    const number = /^\d+$/.test(key.trim())
      ? normalizeOutcomeNumber(key.trim())
      : null;
    const outcome = number === null ? undefined : byNumber.get(number);
    if (number === null || outcome === undefined) {
      errors.push({
        code: 'audit-outcome-unknown',
        message: `The audit names outcome ${key}, which the brief does not number.`,
        subject: key,
      });
      continue;
    }
    if (entries[number] !== undefined) {
      errors.push({
        code: 'audit-outcome-duplicate',
        message: `The audit names outcome ${number} more than once.`,
        subject: number,
      });
      continue;
    }

    const record = isRecord(raw) ? raw : null;
    const disposition = record?.disposition;
    if (
      record === null ||
      !OUTCOME_DISPOSITIONS.includes(disposition as GoalAuditOutcomeDisposition)
    ) {
      errors.push({
        code: 'audit-outcome-disposition-invalid',
        message: `Outcome ${number} needs one disposition: met, extracted, deferred or retired.`,
        subject: number,
      });
      continue;
    }
    const entry: GoalAuditOutcomeEntry = {
      disposition: disposition as GoalAuditOutcomeDisposition,
      evidence_or_ref: readOptionalString(record.evidence_or_ref),
      text: typeof record.text === 'string' ? record.text : '',
    };
    entries[number] = entry;

    if (collapse(entry.text) !== outcome.text) {
      errors.push({
        code: 'audit-outcome-text-changed',
        message: `Outcome ${number}'s audited text no longer matches the brief.`,
        subject: number,
      });
    }
    if (!isNonEmptyString(entry.evidence_or_ref)) {
      errors.push({
        code: 'audit-outcome-evidence-missing',
        message: `Outcome ${number} is ${entry.disposition} without evidence or a scope-decision reference.`,
        subject: number,
      });
    }
  }

  for (const number of byNumber.keys()) {
    if (entries[number] === undefined && !hasErrorFor(errors, number)) {
      errors.push({
        code: 'audit-outcome-omitted',
        message: `The audit has no disposition for outcome ${number}.`,
        subject: number,
      });
    }
  }

  return entries;
}

function invalid(errors: GoalAuditError[]): GoalOutcomeAuditValidation {
  return { valid: false, errors, audit: null };
}

function isDeferralLike(entry: { disposition: string }): boolean {
  return entry.disposition === 'deferred' || entry.disposition === 'retired';
}

function hasErrorFor(errors: readonly GoalAuditError[], subject: string) {
  return errors.some((error) => error.subject === subject);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '';
}

function readOptionalString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function normalizeOutcomeNumber(digits: string): string {
  return digits.replace(/^0+(?=\d)/, '');
}

function collapse(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}
