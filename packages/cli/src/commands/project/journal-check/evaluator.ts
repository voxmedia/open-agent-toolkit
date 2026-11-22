import {
  isFreestyleState,
  normalizePhaseId,
  parseBriefOutcomes,
  parseTaskProgress,
  readFrontmatterMetadata,
  readJournalRecords,
  validateGoalOutcomeAudit,
} from '@open-agent-toolkit/control-plane';

import {
  checkDispatchPayloads,
  checkFreestyleRecords,
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
  JournalCoverage,
  JournalCoverageInput,
  JournalCoveragePhase,
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
  const workflowMode = isFreestyleState(input.stateContent)
    ? 'freestyle'
    : workflowModeOf(stateRecord);
  const scope =
    input.boundary === 'review' && input.scope != null
      ? [...new Set(input.scope)]
      : null;

  // Freestyle is recognized before the spec-driven default and has no
  // lifecycle journal contract, so no task-mode or phase-unit rule applies;
  // it gets the coverage report instead.
  if (workflowMode === 'freestyle') {
    return evaluateFreestyleJournal(input);
  }

  const briefMode = isBriefMode(workflowMode);
  const progress = parseTaskProgress(input.planContent, input.journalContent, {
    phaseUnits: briefMode,
    extractedUnits: workflowMode === 'goal',
  });

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

/**
 * A `## Phase <id>:` heading whose id the shared reader does not recognize,
 * such as a project-native `P7`, `A-1a` or `FM-1`. The trailing colon is part
 * of the shape so ordinary prose headings (`## Phases`, `## Phase notes`) are
 * never read as phases.
 */
const NATIVE_PHASE_HEADING_PATTERN = /^(?:Revision )?Phase ([^\s:]+):/;

export interface FreestyleJournalCheckInput {
  boundary: JournalCheckInput['boundary'];
  /** Validated phase scope (normalized ids), or null for every phase. */
  scope?: readonly string[] | null;
  /** `null` when the project has no `plan.md`. */
  planContent: string | null;
  /** `null` when the project has no `implementation.md`. */
  journalContent: string | null;
  stateContent: string;
}

interface PhaseOccurrence {
  heading: string;
  sources: Array<{ path: JournalCoverageInput; line: number }>;
}

function collectPhases(
  documents: ReadonlyArray<
    [JournalCoverageInput, ReturnType<typeof readJournalRecords> | null]
  >,
): {
  recognized: Map<string, PhaseOccurrence>;
  untitled: Map<string, PhaseOccurrence>;
  native: Map<string, PhaseOccurrence>;
} {
  const recognized = new Map<string, PhaseOccurrence>();
  const untitled = new Map<string, PhaseOccurrence>();
  const native = new Map<string, PhaseOccurrence>();
  const add = (
    map: Map<string, PhaseOccurrence>,
    id: string,
    heading: string,
    path: JournalCoverageInput,
    line: number,
  ): void => {
    const occurrence = map.get(id) ?? { heading, sources: [] };
    occurrence.sources.push({ path, line });
    map.set(id, occurrence);
  };
  for (const [path, records] of documents) {
    for (const section of records?.sections ?? []) {
      if (section.phase !== null) {
        add(
          recognized,
          section.phase.declaredPhaseId,
          section.text,
          path,
          section.line,
        );
        continue;
      }
      const nativeId = NATIVE_PHASE_HEADING_PATTERN.exec(section.text)?.[1];
      if (nativeId === undefined) {
        continue;
      }
      // An OAT phase id with nothing after the colon: the shared reader needs
      // a title (`## Phase p01: <title>`), so this is a missing title, not a
      // project-native id.
      const titleless =
        normalizePhaseId(nativeId) ??
        (/^\d+$/.test(nativeId) ? normalizePhaseId(`p${nativeId}`) : null);
      if (titleless !== null) {
        add(untitled, titleless, section.text, path, section.line);
      } else {
        add(native, nativeId, section.text, path, section.line);
      }
    }
  }
  return { recognized, untitled, native };
}

/**
 * The phase ids a freestyle project's documents name, for validating
 * `--scope`: every recognized OAT phase id in either document.
 */
export function freestylePhaseIds(
  planContent: string | null,
  journalContent: string | null,
): Set<string> {
  const { recognized } = collectPhases([
    ['plan.md', planContent === null ? null : readJournalRecords(planContent)],
    [
      'implementation.md',
      journalContent === null ? null : readJournalRecords(journalContent),
    ],
  ]);
  return new Set(recognized.keys());
}

/**
 * Evaluate a freestyle project's journal: report coverage, then hold the
 * validated phases to the record-consistency rules.
 *
 * Neither document is required. A missing `plan.md` or `implementation.md` is
 * listed under `coverage.missing` and the check still succeeds; phases come
 * from whichever document exists. Only a recognized phase with a journal
 * section is validated, and a refusal comes only from a record-consistency
 * finding on such a phase, so an empty or absent journal reports zero
 * validated phases rather than a pass over work.
 */
export function evaluateFreestyleJournal(
  input: FreestyleJournalCheckInput,
): JournalCheckResult {
  const scope =
    input.boundary === 'review' && input.scope != null
      ? [...new Set(input.scope)]
      : null;
  const plan =
    input.planContent === null ? null : readJournalRecords(input.planContent);
  const journal =
    input.journalContent === null
      ? null
      : readJournalRecords(input.journalContent);
  const missing: JournalCoverageInput[] = [
    ...(plan === null ? (['plan.md'] as const) : []),
    ...(journal === null ? (['implementation.md'] as const) : []),
  ];
  const { recognized, untitled, native } = collectPhases([
    ['plan.md', plan],
    ['implementation.md', journal],
  ]);

  const phases: JournalCoveragePhase[] = [];
  const validated = new Set<string>();
  for (const [id, occurrence] of recognized) {
    const inJournal = occurrence.sources.some(
      (source) => source.path === 'implementation.md',
    );
    const skip =
      scope !== null && !scope.includes(id)
        ? {
            reason: 'out-of-scope' as const,
            message: `Phase ${id} is outside --scope.`,
          }
        : journal === null
          ? {
              reason: 'journal-missing' as const,
              message: `implementation.md is absent, so phase ${id} has no records to validate.`,
            }
          : !inJournal
            ? {
                reason: 'no-journal-section' as const,
                message: `plan.md declares phase ${id} and implementation.md has no section for it, so it has no records to validate.`,
              }
            : null;
    if (skip === null) {
      validated.add(id);
    }
    phases.push({
      id,
      heading: occurrence.heading,
      outcome: skip === null ? 'validated' : 'skipped',
      reason: skip?.reason ?? null,
      message: skip?.message ?? null,
      sources: occurrence.sources,
    });
  }
  for (const [id, occurrence] of untitled) {
    phases.push({
      id,
      heading: occurrence.heading,
      outcome: 'skipped',
      reason: 'untitled-phase-heading',
      message: `The heading "## ${occurrence.heading}" has no title, so it is not read as phase ${id}'s section and its records are not validated; add a title after the colon.`,
      sources: occurrence.sources,
    });
  }
  for (const [id, occurrence] of native) {
    phases.push({
      id,
      heading: occurrence.heading,
      outcome: 'skipped',
      reason: 'unrecognized-phase-id',
      message: `${id} is not an OAT phase id (pNN or p-revN), so no record rule applies to it and its records are not validated.`,
      sources: occurrence.sources,
    });
  }

  const context: RuleContext = {
    boundary: input.boundary,
    workflowMode: 'freestyle',
    scope: scope === null ? null : new Set(scope),
    journal: journal ?? readJournalRecords(''),
    plan: plan ?? readJournalRecords(''),
    journalMeta: readFrontmatterMetadata(input.journalContent ?? ''),
    stateMeta: readFrontmatterMetadata(input.stateContent),
    progress: parseTaskProgress('', ''),
    approvedDeferredPhases: new Set(),
    findings: [],
  };
  checkFreestyleRecords(context, validated);
  const reasons = context.findings
    .map(toReason)
    .sort(
      (left, right) =>
        (left.line ?? Number.MAX_SAFE_INTEGER) -
        (right.line ?? Number.MAX_SAFE_INTEGER),
    );

  const coverage: JournalCoverage = {
    missing,
    recognized: recognized.size,
    validated: validated.size,
    skipped: phases.filter((phase) => phase.outcome === 'skipped').length,
    phases,
  };
  return {
    status: reasons.length === 0 ? 'ok' : 'refused',
    boundary: input.boundary,
    workflowMode: 'freestyle',
    scope,
    reasons,
    warnings: [],
    overrides: [],
    coverage,
  };
}
