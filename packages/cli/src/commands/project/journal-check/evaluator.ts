import {
  parseBriefOutcomes,
  parseTaskProgress,
  readFrontmatterMetadata,
  readJournalRecords,
  validateGoalOutcomeAudit,
} from '@open-agent-toolkit/control-plane';

import {
  checkDispatchPayloads,
  checkMetadata,
  checkOverviewTotals,
  checkPhaseUnitRecords,
  checkReceiptsAndDeferrals,
  checkReferencesLast,
  checkRunLines,
  checkTaskModePhaseStatus,
  checkTaskModeRecords,
  checkTemplateResidue,
  isBriefMode,
  OVERRIDE_ELIGIBILITY,
  overrideCoversSubject,
  readOverrides,
  type Finding,
  type RuleContext,
} from './rules';
import type {
  JournalCheckInput,
  JournalCheckReason,
  JournalCheckResult,
  JournalOverride,
} from './types';

function workflowModeOf(stateRecord: Record<string, unknown> | null): string {
  const mode = stateRecord?.oat_workflow_mode;
  return typeof mode === 'string' && mode.length > 0 ? mode : 'spec-driven';
}

function approvedDeferredPhases(
  workflowMode: string,
  stateRecord: Record<string, unknown> | null,
  input: JournalCheckInput,
  progress: ReturnType<typeof parseTaskProgress>,
): Set<string> {
  const phases = new Set<string>();
  if (workflowMode !== 'goal') {
    return phases;
  }
  // Only a valid, exhaustive outcome audit can approve a deferral; an invalid
  // or missing audit approves nothing (the closeout invariant reports it).
  const validation = validateGoalOutcomeAudit(
    stateRecord?.oat_goal_outcome_audit,
    progress.phases,
    parseBriefOutcomes(input.planContent),
  );
  if (!validation.valid || validation.audit === null) {
    return phases;
  }
  for (const [phaseId, entry] of Object.entries(validation.audit.phases)) {
    if (entry.disposition === 'deferred' || entry.disposition === 'retired') {
      phases.add(phaseId);
    }
  }
  return phases;
}

function toReason(finding: Finding): JournalCheckReason {
  return {
    code: finding.code,
    path: finding.path,
    line: finding.line,
    owner: finding.owner,
    message: finding.message,
  };
}

/**
 * Evaluate one journal at one lifecycle boundary. Pure and read-only: the
 * same bytes always give the same result, and nothing is written.
 *
 * Task modes (spec-driven, quick, import, lite) use the shared journal record
 * reader: normalized plan task ids map to unique journal blocks with exactly
 * one owned terminal status and owned commit evidence or an approved scope
 * disposition. Brief and goal use the landed phase-unit progress and goal
 * outcome audit readers; failed, cancelled and no-change execution records
 * are valid history without a SHA and approved deferrals stay incomplete.
 * Delivery coverage and the post-implementation sequence stay with the
 * closeout invariant (`closeout-check`), which `complete-state` evaluates
 * beside this evaluator.
 */
export function evaluateJournal(input: JournalCheckInput): JournalCheckResult {
  const journalMeta = readFrontmatterMetadata(input.journalContent);
  const stateMeta = readFrontmatterMetadata(input.stateContent);
  const stateRecord = stateMeta.state === 'ok' ? stateMeta.record : null;
  const workflowMode = workflowModeOf(stateRecord);
  const briefMode = isBriefMode(workflowMode);
  const progress = parseTaskProgress(input.planContent, input.journalContent, {
    phaseUnits: briefMode,
    extractedUnits: workflowMode === 'goal',
  });
  const scope =
    input.boundary === 'review' && input.scope != null
      ? [...new Set(input.scope)]
      : null;

  const context: RuleContext = {
    boundary: input.boundary,
    workflowMode,
    scope: scope === null ? null : new Set(scope),
    journal: readJournalRecords(input.journalContent),
    plan: readJournalRecords(input.planContent),
    journalMeta,
    stateMeta,
    progress,
    approvedDeferredPhases: approvedDeferredPhases(
      workflowMode,
      stateRecord,
      input,
      progress,
    ),
    findings: [],
  };

  checkMetadata(context, input.stateContent.split('\n'));
  if (briefMode) {
    checkPhaseUnitRecords(context);
  } else {
    checkTaskModeRecords(context);
    checkTaskModePhaseStatus(context);
  }
  checkOverviewTotals(context);
  checkReferencesLast(context);
  checkReceiptsAndDeferrals(context);
  checkDispatchPayloads(context);
  checkRunLines(context);
  checkTemplateResidue(context);
  const parsedOverrides = readOverrides(context);

  // Overrides suppress only eligible gaps whose subject the override's scope
  // covers; nothing else is overridable, and the checker never writes one.
  const applied = new Set<number>();
  const remaining = context.findings.filter((finding) => {
    if (finding.severity !== 'refuse' || finding.subject === undefined) {
      return true;
    }
    const subject = finding.subject;
    const covering = parsedOverrides.find(
      (override) =>
        OVERRIDE_ELIGIBILITY[override.code].has(finding.code) &&
        overrideCoversSubject(override, subject),
    );
    if (covering === undefined) {
      return true;
    }
    applied.add(covering.line);
    return false;
  });

  const overrides: JournalOverride[] = parsedOverrides.map((override) => ({
    code: override.code,
    authorizedBy: override.authorizedBy,
    scope: override.scope,
    reason: override.reason,
    line: override.line,
    applied: applied.has(override.line),
  }));
  const warnings = remaining
    .filter((finding) => finding.severity === 'warn')
    .map(toReason);
  for (const override of overrides) {
    if (!override.applied) {
      warnings.push({
        code: 'override-unused',
        path: 'implementation.md',
        line: override.line,
        owner: 'oat-project-complete',
        message: `Override ${override.code} for ${override.scope} covers no eligible gap.`,
      });
    }
  }
  const reasons = remaining
    .filter((finding) => finding.severity === 'refuse')
    .map(toReason)
    .sort(
      (left, right) =>
        (left.line ?? Number.MAX_SAFE_INTEGER) -
        (right.line ?? Number.MAX_SAFE_INTEGER),
    );

  return {
    status: reasons.length === 0 ? 'ok' : 'refused',
    boundary: input.boundary,
    workflowMode,
    scope,
    reasons,
    warnings,
    overrides,
  };
}
