import {
  isBriefMode,
  normalizeMilestoneId,
  normalizePhaseId,
  parseProvisionalPhaseIds,
  parseTaskProgress,
  readMilestoneMembership,
  recordLineMask,
  type MilestoneMembershipErrorCode,
  type WorkflowMode,
} from '@open-agent-toolkit/control-plane';

import { parseFrontmatterFromContent } from './frontmatter';

/**
 * Plan validation profiles. Each workflow mode validates `plan.md` against
 * one profile:
 *
 * - `task`: spec-driven, quick and import plans. Phase ids come from task
 *   headings; no profile-specific body rules.
 * - `lite`: the lite single-phase rules.
 * - `brief`: taskless phase blocks (`**Intent:**`, `**Exit evidence:**`,
 *   optional `**Provisional:**`). Phase ids come from `## Phase` headings.
 * - `goal`: every `brief` rule plus the goal milestone rules: membership
 *   read through the control-plane Milestones reader (its error codes map
 *   onto `goal-*` codes), frozen delivery scopes from `oat_deliveries`,
 *   parallel groups inside one milestone, `oat_plan_source: goal`, and
 *   canonical phase ids in persisted registry lists.
 */
export type PlanProfile = 'task' | 'lite' | 'brief' | 'goal';

export interface ValidationContext {
  profile: PlanProfile;
  workflowMode: WorkflowMode | null;
  stateFrontmatter: Record<string, unknown> | null;
  /**
   * The journal (`implementation.md`), when readable. Goal membership reads it
   * so a phase the journal marks extracted need not belong to a milestone.
   */
  implementationContent?: string | null;
}

export type BriefValidationErrorCode =
  | 'brief-no-phases'
  | 'brief-duplicate-phase'
  | 'brief-phase-missing-intent'
  | 'brief-phase-missing-exit-evidence'
  | 'brief-provisional-invalid'
  | 'brief-first-phase-provisional'
  | 'brief-malformed-phase-heading';

export type BriefValidationWarningCode = 'brief-task-headings-ignored';

export type GoalValidationErrorCode =
  | 'goal-milestones-missing'
  | 'goal-milestones-malformed'
  | 'goal-duplicate-milestone'
  | 'goal-milestone-empty'
  | 'goal-milestone-unknown-phase'
  | 'goal-phase-in-multiple-milestones'
  | 'goal-phase-without-milestone'
  | 'goal-shipped-milestone-changed'
  | 'goal-delivered-scope-changed'
  | 'goal-group-crosses-milestone'
  | 'goal-plan-source'
  | 'goal-noncanonical-phase-id';

export type LiteValidationErrorCode =
  | 'lite-multi-phase'
  | 'lite-parallel-groups'
  | 'lite-criterion-without-command';

export type ValidationIssue =
  | {
      severity: 'error';
      code:
        | BriefValidationErrorCode
        | GoalValidationErrorCode
        | LiteValidationErrorCode;
      message: string;
    }
  | {
      severity: 'warning';
      code: BriefValidationWarningCode;
      message: string;
    };

export function resolvePlanProfile(mode: WorkflowMode | null): PlanProfile {
  if (mode === 'lite') return 'lite';
  if (isBriefMode(mode)) return mode;
  return 'task';
}

// ---------------------------------------------------------------------------
// lite profile (rules moved unchanged from validate-plan.ts)
// ---------------------------------------------------------------------------

export type LitePlanValidationResult =
  | { ok: true }
  | {
      ok: false;
      code:
        | 'lite-multi-phase'
        | 'lite-parallel-groups'
        | 'lite-criterion-without-command';
      message: string;
    };

function validationCriteria(planContent: string): string[] | null {
  const heading = /^## Validation Criteria[ \t]*$/m.exec(planContent);
  if (!heading) return null;
  const bodyStart = heading.index + heading[0].length;
  const remaining = planContent.slice(bodyStart);
  const nextHeading = /^##\s+/m.exec(remaining);
  const body = remaining.slice(0, nextHeading?.index ?? remaining.length);
  return body
    .split('\n')
    .filter((line) => /^\s*-\s+/.test(line))
    .map((line) => line.replace(/^\s*-\s+(?:\[[ xX]\]\s*)?/, '').trim());
}

export function validateLitePlan(
  planContent: string,
  workflowMode: string | null | undefined,
): LitePlanValidationResult {
  if (workflowMode !== 'lite') {
    return { ok: true };
  }

  const phaseCount = planContent.match(/^## Phase\b.*$/gm)?.length ?? 0;
  if (phaseCount !== 1) {
    return {
      ok: false,
      code: 'lite-multi-phase',
      message: `Lite plans must contain exactly one phase; found ${phaseCount}.`,
    };
  }

  const frontmatter = parseFrontmatterFromContent(planContent);
  const groups =
    frontmatter.kind === 'invalid'
      ? undefined
      : frontmatter.data['oat_plan_parallel_groups'];
  if (
    groups !== undefined &&
    groups !== null &&
    !(Array.isArray(groups) && groups.length === 0)
  ) {
    return {
      ok: false,
      code: 'lite-parallel-groups',
      message: 'Lite plans must declare no parallel groups.',
    };
  }

  const criteria = validationCriteria(planContent);
  const invalidCriterion = criteria?.find(
    (criterion) =>
      !criterion.startsWith('manual:') && !/`[^`\n]+`/.test(criterion),
  );
  if (!criteria || criteria.length === 0 || invalidCriterion !== undefined) {
    return {
      ok: false,
      code: 'lite-criterion-without-command',
      message:
        'Every lite Validation Criteria bullet must name a command in backticks or start with manual: after the bullet marker.',
    };
  }

  return { ok: true };
}

// ---------------------------------------------------------------------------
// phase id extraction
// ---------------------------------------------------------------------------

function extractTaskHeadingPhaseIds(planContent: string): string[] {
  const matches = planContent.match(/### Task (p\d+)-t\d+/g) ?? [];
  const ids = matches.map((m) => {
    const parts = m.split(' ');
    return parts[2]!.split('-')[0]!;
  });
  return Array.from(new Set(ids)).sort();
}

/**
 * The normalized id and name of a `## Phase` heading line, or `null` when the
 * line is not a well-formed phase heading. Delegates to the control-plane
 * phase-unit parser so heading spellings (`## Phase 1:`, `## Phase p01:`,
 * `## Phase p-rev1:`, `## Revision Phase 1:`) normalize exactly as progress
 * reads them.
 */
export function parsePhaseHeadingLine(
  line: string,
): { phaseId: string; name: string } | null {
  const phase = parseTaskProgress(line, '', { phaseUnits: true }).phases[0];
  return phase ? { phaseId: phase.phaseId, name: phase.name } : null;
}

function phaseIdOfHeading(line: string): string | null {
  return parsePhaseHeadingLine(line)?.phaseId ?? null;
}

/**
 * Normalized `## Phase` heading ids in document order, outside fenced and
 * indented code, each listed once.
 */
function extractBriefPhaseIds(planContent: string): string[] {
  const ids = parseTaskProgress(planContent, '', {
    phaseUnits: true,
  }).phases.map((phase) => phase.phaseId);
  return Array.from(new Set(ids));
}

export function extractPhaseIds(
  content: string,
  profile: PlanProfile,
): string[] {
  return profile === 'brief' || profile === 'goal'
    ? extractBriefPhaseIds(content)
    : extractTaskHeadingPhaseIds(content);
}

// ---------------------------------------------------------------------------
// brief profile
// ---------------------------------------------------------------------------

/**
 * Plan record lines, through the control-plane reader that phase-unit
 * progress and quick plan readiness use, so a fenced example phase block
 * never validates or fails a real plan.
 */
function recordLines(content: string): string[] {
  const lines = content.split('\n');
  const mask = recordLineMask(lines);
  return lines.filter((_, index) => mask[index]);
}

const PHASE_HEADING_CANDIDATE = /^##[ \t]+(?:Revision[ \t]+)?Phase\b/;
const SECTION_HEADING = /^#{1,2}[ \t]/;
const ANY_HEADING = /^#/;
const TASK_HEADING = /^###[ \t]+Task\b/;
const FIELD_MARKER = /^\*\*[^*\n]+:\*\*/;
const INTENT_MARKER = /^\*\*Intent:\*\*(.*)$/;
const EXIT_EVIDENCE_MARKER = /^\*\*Exit evidence:\*\*(.*)$/;
const PROVISIONAL_LINE = /^\*\*Provisional:\*\*/;
// The control-plane parser's grammar: a space after the marker, then the value.
const PROVISIONAL_VALID = /^\*\*Provisional:\*\*\s+(?:yes|no)$/;

interface BriefPhaseBlock {
  phaseId: string;
  lines: string[];
  taskHeadings: number;
}

/**
 * Whether a phase block carries `marker` with content: a non-empty value on
 * the marker line, or at least one continuation line before the next blank
 * line or field marker.
 */
function hasFilledField(lines: string[], marker: RegExp): boolean {
  for (const [index, line] of lines.entries()) {
    const match = line.trim().match(marker);
    if (!match) continue;
    if ((match[1] ?? '').trim().length > 0) return true;
    const next = (lines[index + 1] ?? '').trim();
    if (next.length > 0 && !FIELD_MARKER.test(next)) return true;
  }
  return false;
}

function readBriefPhaseBlocks(content: string): {
  blocks: BriefPhaseBlock[];
  malformed: string[];
} {
  const blocks: BriefPhaseBlock[] = [];
  const malformed: string[] = [];
  // Marker ownership ends at the next line starting with `#` (the phase block
  // grammar); task-heading attribution lasts until the next `#`/`##` heading.
  let owner: BriefPhaseBlock | null = null;
  let section: BriefPhaseBlock | null = null;

  for (const line of recordLines(content)) {
    if (PHASE_HEADING_CANDIDATE.test(line)) {
      const phaseId = phaseIdOfHeading(line);
      if (phaseId == null) {
        malformed.push(line.trim());
        owner = null;
        section = null;
        continue;
      }
      const block: BriefPhaseBlock = { phaseId, lines: [], taskHeadings: 0 };
      blocks.push(block);
      owner = block;
      section = block;
      continue;
    }

    if (SECTION_HEADING.test(line)) {
      owner = null;
      section = null;
      continue;
    }

    if (TASK_HEADING.test(line) && section != null) {
      section.taskHeadings += 1;
    }

    if (ANY_HEADING.test(line)) {
      owner = null;
      continue;
    }

    owner?.lines.push(line);
  }

  return { blocks, malformed };
}

function validateBriefPlan(content: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const { blocks, malformed } = readBriefPhaseBlocks(content);

  for (const heading of malformed) {
    issues.push({
      severity: 'error',
      code: 'brief-malformed-phase-heading',
      message: `brief-malformed-phase-heading: "${heading}" is not a phase heading; use "## Phase pNN: <name>".`,
    });
  }

  if (blocks.length === 0) {
    issues.push({
      severity: 'error',
      code: 'brief-no-phases',
      message:
        'brief-no-phases: Brief plans must declare at least one "## Phase pNN: <name>" block.',
    });
    return issues;
  }

  const seen = new Set<string>();
  const reported = new Set<string>();
  for (const { phaseId } of blocks) {
    if (seen.has(phaseId) && !reported.has(phaseId)) {
      reported.add(phaseId);
      issues.push({
        severity: 'error',
        code: 'brief-duplicate-phase',
        message: `brief-duplicate-phase: Phase ${phaseId} is declared more than once.`,
      });
    }
    seen.add(phaseId);
  }

  for (const block of blocks) {
    if (!hasFilledField(block.lines, INTENT_MARKER)) {
      issues.push({
        severity: 'error',
        code: 'brief-phase-missing-intent',
        message: `brief-phase-missing-intent: Phase ${block.phaseId} has no non-empty **Intent:**.`,
      });
    }
    if (!hasFilledField(block.lines, EXIT_EVIDENCE_MARKER)) {
      issues.push({
        severity: 'error',
        code: 'brief-phase-missing-exit-evidence',
        message: `brief-phase-missing-exit-evidence: Phase ${block.phaseId} has no non-empty **Exit evidence:**.`,
      });
    }
    for (const line of block.lines) {
      const trimmed = line.trim();
      if (PROVISIONAL_LINE.test(trimmed) && !PROVISIONAL_VALID.test(trimmed)) {
        issues.push({
          severity: 'error',
          code: 'brief-provisional-invalid',
          message: `brief-provisional-invalid: Phase ${block.phaseId} has "${trimmed}"; use "**Provisional:** yes" or "**Provisional:** no".`,
        });
      }
    }
  }

  const firstPhaseId = blocks[0]!.phaseId;
  if (parseProvisionalPhaseIds(content).has(firstPhaseId)) {
    issues.push({
      severity: 'error',
      code: 'brief-first-phase-provisional',
      message: `brief-first-phase-provisional: The first phase (${firstPhaseId}) cannot be provisional.`,
    });
  }

  const withTasks = blocks.filter((block) => block.taskHeadings > 0);
  if (withTasks.length > 0) {
    issues.push({
      severity: 'warning',
      code: 'brief-task-headings-ignored',
      message: `brief-task-headings-ignored: Task headings in plan.md under ${withTasks
        .map((block) => block.phaseId)
        .join(
          ', ',
        )} do not count toward brief progress; record execution tasks in implementation.md.`,
    });
  }

  return issues;
}

export function validatePlanForProfile(
  content: string,
  ctx: ValidationContext,
): ValidationIssue[] {
  switch (ctx.profile) {
    case 'lite': {
      const result = validateLitePlan(content, 'lite');
      return result.ok
        ? []
        : [{ severity: 'error', code: result.code, message: result.message }];
    }
    case 'brief':
      return validateBriefPlan(content);
    case 'goal':
      return [...validateBriefPlan(content), ...validateGoalPlan(content, ctx)];
    case 'task':
      return [];
  }
}

// ---------------------------------------------------------------------------
// goal profile
// ---------------------------------------------------------------------------

/**
 * Each Milestones reader error code maps onto exactly one goal rule code, so
 * the reader stays the one membership predicate and validation never
 * re-parses the table.
 */
export const GOAL_MEMBERSHIP_RULE_CODES: Readonly<
  Record<MilestoneMembershipErrorCode, GoalValidationErrorCode>
> = {
  'milestones-missing': 'goal-milestones-missing',
  'milestones-malformed': 'goal-milestones-malformed',
  'milestone-duplicate': 'goal-duplicate-milestone',
  'milestone-empty': 'goal-milestone-empty',
  'milestone-unknown-phase': 'goal-milestone-unknown-phase',
  'phase-in-multiple-milestones': 'goal-phase-in-multiple-milestones',
  'phase-without-milestone': 'goal-phase-without-milestone',
};

function goalError(
  code: GoalValidationErrorCode,
  message: string,
): ValidationIssue {
  return { severity: 'error', code, message: `${code}: ${message}` };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function rawList(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

interface RawDelivery {
  label: string;
  milestone: string | null;
  scope: string[];
}

function readRawDeliveries(
  state: Record<string, unknown> | null,
): RawDelivery[] {
  return rawList(state?.['oat_deliveries'])
    .filter(isRecord)
    .map((entry, index) => ({
      label:
        typeof entry['delivery_id'] === 'string'
          ? entry['delivery_id']
          : `oat_deliveries[${index}]`,
      milestone: normalizeMilestoneId(entry['milestone']),
      scope: rawList(entry['scope'])
        .map((token) => normalizePhaseId(String(token)))
        .filter((token): token is string => token !== null),
    }));
}

/**
 * Persisted phase-id lists in the goal registry. The state reader normalizes
 * these and drops tokens that are not phase ids; validation reports every
 * token that is not already canonical so the drift is repaired at its source.
 */
function persistedPhaseIdLists(
  state: Record<string, unknown> | null,
): { field: string; values: unknown[] }[] {
  if (state === null) return [];
  const lists: { field: string; values: unknown[] }[] = [];
  const carrierLists = (prefix: string, carrier: unknown): void => {
    if (isRecord(carrier) && isRecord(carrier['subject'])) {
      lists.push({
        field: `${prefix}.subject.scope`,
        values: rawList(carrier['subject']['scope']),
      });
    }
  };

  const recovery = state['oat_goal_recovery'];
  if (isRecord(recovery)) {
    lists.push({
      field: 'oat_goal_recovery.phase_ids',
      values: rawList(recovery['phase_ids']),
    });
  }
  for (const [index, entry] of rawList(state['oat_deliveries']).entries()) {
    if (!isRecord(entry)) continue;
    const prefix = `oat_deliveries[${index}]`;
    lists.push({ field: `${prefix}.scope`, values: rawList(entry['scope']) });
    if (isRecord(entry['integrated_review'])) {
      lists.push({
        field: `${prefix}.integrated_review.scope`,
        values: rawList(entry['integrated_review']['scope']),
      });
    }
    carrierLists(`${prefix}.exit_gate`, entry['exit_gate']);
  }
  const gates = state['oat_milestone_gates'];
  if (isRecord(gates)) {
    for (const [milestone, carriers] of Object.entries(gates)) {
      if (!isRecord(carriers)) continue;
      carrierLists(`oat_milestone_gates.${milestone}.plan`, carriers['plan']);
      carrierLists(`oat_milestone_gates.${milestone}.exit`, carriers['exit']);
    }
  }
  return lists;
}

function validateGoalPlan(
  content: string,
  ctx: ValidationContext,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const frontmatter = parseFrontmatterFromContent(content);
  const planData = frontmatter.kind === 'invalid' ? {} : frontmatter.data;

  if (planData['oat_plan_source'] !== 'goal') {
    issues.push(
      goalError(
        'goal-plan-source',
        `Goal plans must declare "oat_plan_source: goal"; found ${JSON.stringify(planData['oat_plan_source'] ?? null)}.`,
      ),
    );
  }

  const membership = readMilestoneMembership(
    content,
    ctx.implementationContent ?? '',
  );
  for (const error of membership.errors) {
    issues.push(
      goalError(GOAL_MEMBERSHIP_RULE_CODES[error.code], error.message),
    );
  }

  const owners = new Map<string, string>();
  for (const row of membership.milestones) {
    for (const phaseId of row.phaseIds) {
      if (!owners.has(phaseId)) owners.set(phaseId, row.milestoneId);
    }
  }
  const declaredMilestones = new Set(
    membership.milestones.map((row) => row.milestoneId),
  );
  const declaredPhases = new Set(extractBriefPhaseIds(content));

  for (const delivery of readRawDeliveries(ctx.stateFrontmatter)) {
    if (!membership.present || delivery.milestone === null) continue;
    if (!declaredMilestones.has(delivery.milestone)) {
      issues.push(
        goalError(
          'goal-shipped-milestone-changed',
          `Delivery ${delivery.label} shipped milestone ${delivery.milestone}, which the Milestones table no longer declares.`,
        ),
      );
      continue;
    }
    for (const phaseId of delivery.scope) {
      if (!declaredPhases.has(phaseId)) {
        issues.push(
          goalError(
            'goal-delivered-scope-changed',
            `Delivery ${delivery.label} froze ${phaseId} in its scope, but the brief no longer declares it.`,
          ),
        );
        continue;
      }
      const owner = owners.get(phaseId);
      if (owner !== undefined && owner !== delivery.milestone) {
        issues.push(
          goalError(
            'goal-delivered-scope-changed',
            `Delivery ${delivery.label} froze ${phaseId} under ${delivery.milestone}, but the Milestones table now assigns it to ${owner}.`,
          ),
        );
      } else if (owner === undefined) {
        issues.push(
          goalError(
            'goal-delivered-scope-changed',
            `Delivery ${delivery.label} froze ${phaseId} under ${delivery.milestone}, but the Milestones table no longer lists it there.`,
          ),
        );
      }
    }
  }

  for (const [index, group] of rawList(
    planData['oat_plan_parallel_groups'],
  ).entries()) {
    const groupOwners = new Set<string>();
    for (const member of rawList(group)) {
      const phaseId = normalizePhaseId(String(member));
      const owner = phaseId === null ? undefined : owners.get(phaseId);
      if (owner !== undefined) groupOwners.add(owner);
    }
    if (groupOwners.size > 1) {
      issues.push(
        goalError(
          'goal-group-crosses-milestone',
          `Parallel group ${index} spans milestones ${[...groupOwners].join(', ')}; a group must sit inside one milestone.`,
        ),
      );
    }
  }

  for (const { field, values } of persistedPhaseIdLists(ctx.stateFrontmatter)) {
    for (const value of values) {
      const token = typeof value === 'string' ? value : String(value);
      if (normalizePhaseId(token) !== token) {
        issues.push(
          goalError(
            'goal-noncanonical-phase-id',
            `${field} holds ${JSON.stringify(value)}, which is not a canonical phase id like "p01" or "p-rev1".`,
          ),
        );
      }
    }
  }

  return issues;
}
