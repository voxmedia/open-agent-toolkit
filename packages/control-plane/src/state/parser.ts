import { parseFrontmatterRecord } from '../shared/utils/frontmatter';
import {
  normalizeNullableString,
  parseBoolean,
} from '../shared/utils/normalize';
import {
  GOAL_RECOVERY_STAGES,
  GOAL_STATUSES,
  MILESTONE_STATUSES,
  WORKFLOW_MODES,
  type DeliveryMember,
  type DeliveryMemberStatus,
  type ExecutionMode,
  type GoalDelivery,
  type GoalRecovery,
  type GoalStatus,
  type MilestoneGateCarrier,
  type MilestoneGates,
  type MilestoneStatus,
  type ExplainerDecisionV1,
  type Lifecycle,
  type Phase,
  type PhaseStatus,
  type ProjectBlocker,
  type WorkflowMode,
} from '../types';
import { normalizePhaseId } from './tasks';

const PHASES = [
  'discovery',
  'spec',
  'design',
  'plan',
  'implement',
  'decomposition',
] as const;
const PHASE_STATUSES = ['in_progress', 'complete', 'pr_open'] as const;
const EXECUTION_MODES = ['single-thread', 'subagent-driven'] as const;
const LIFECYCLE_VALUES = ['active', 'paused', 'complete'] as const;
const EXPLAINER_DECISIONS = ['generate', 'skip'] as const;
const EXPLAINER_SOURCES = [
  'interactive',
  'kickoff_prompt',
  'autonomous_policy',
  'capability_probe',
  'failed_attempt',
] as const;
const EXPLAINER_DECISION_KEYS = [
  'decision',
  'source',
  'decided_at',
  'failed_attempt_evidence',
] as const;
const EXPLAINER_ALLOWED_PAIRS = {
  projectExplainer: new Set([
    'generate:interactive',
    'skip:interactive',
    'generate:kickoff_prompt',
  ]),
  projectRecap: new Set([
    'generate:interactive',
    'skip:interactive',
    'generate:autonomous_policy',
    'skip:capability_probe',
    'skip:failed_attempt',
  ]),
} as const;
const ISO_TIMESTAMP_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

export interface ParsedStateFrontmatter {
  currentTask: string | null;
  lastCommit: string | null;
  blockers: ProjectBlocker[];
  hillCheckpoints: string[];
  hillCompleted: string[];
  parallelExecution: boolean;
  phase: Phase | null;
  phaseStatus: PhaseStatus | null;
  executionMode: ExecutionMode;
  lifecycle: Lifecycle | null;
  pauseTimestamp: string | null;
  pauseReason: string | null;
  workflowMode: WorkflowMode | null;
  workflowOrigin: string | null;
  docsUpdated: string | null;
  prStatus: string | null;
  prUrl: string | null;
  projectCreated: string | null;
  projectCompleted: string | null;
  projectStateUpdated: string | null;
  projectExplainer: ExplainerDecisionV1 | null;
  projectRecap: ExplainerDecisionV1 | null;
  generated: boolean;
  template: boolean;
  /**
   * Goal state, parsed only when `oat_workflow_mode: goal` (absent for every
   * other mode). Values are read leniently: an unknown enum value reads as
   * `null` and a malformed record reads as `null`, so validation owners report
   * the defect instead of the reader inventing a value. The terminal audit is
   * kept raw for `validateGoalOutcomeAudit`.
   */
  milestone?: string | null;
  milestoneStatus?: MilestoneStatus | null;
  goalStatus?: GoalStatus | null;
  goalOutcomeAudit?: Record<string, unknown> | null;
  goalRecovery?: GoalRecovery | null;
  deliveries?: GoalDelivery[];
  milestoneGates?: Record<string, MilestoneGates>;
}

export interface ParsedGoalStateFrontmatter {
  milestone: string | null;
  milestoneStatus: MilestoneStatus | null;
  goalStatus: GoalStatus | null;
  goalOutcomeAudit: Record<string, unknown> | null;
  goalRecovery: GoalRecovery | null;
  deliveries: GoalDelivery[];
  milestoneGates: Record<string, MilestoneGates>;
}

const EMPTY_PARSED_STATE: ParsedStateFrontmatter = {
  currentTask: null,
  lastCommit: null,
  blockers: [],
  hillCheckpoints: [],
  hillCompleted: [],
  parallelExecution: false,
  phase: null,
  phaseStatus: null,
  executionMode: 'single-thread',
  lifecycle: null,
  pauseTimestamp: null,
  pauseReason: null,
  workflowMode: null,
  workflowOrigin: null,
  docsUpdated: null,
  prStatus: null,
  prUrl: null,
  projectCreated: null,
  projectCompleted: null,
  projectStateUpdated: null,
  projectExplainer: null,
  projectRecap: null,
  generated: false,
  template: false,
};

export function parseStateFrontmatter(content: string): ParsedStateFrontmatter {
  const parsed = parseFrontmatterRecord(content);
  if (Object.keys(parsed).length === 0) {
    return EMPTY_PARSED_STATE;
  }

  const workflowMode = normalizeEnum(parsed.oat_workflow_mode, WORKFLOW_MODES);

  return {
    currentTask: normalizeNullableString(parsed.oat_current_task, {
      treatPlaceholdersAsNull: true,
    }),
    lastCommit: normalizeNullableString(parsed.oat_last_commit, {
      treatPlaceholdersAsNull: true,
    }),
    blockers: parseBlockers(parsed.oat_blockers),
    hillCheckpoints: parseStringArray(parsed.oat_hill_checkpoints),
    hillCompleted: parseStringArray(parsed.oat_hill_completed),
    parallelExecution: parseBoolean(parsed.oat_parallel_execution),
    phase: normalizeEnum(parsed.oat_phase, PHASES),
    phaseStatus: normalizeEnum(parsed.oat_phase_status, PHASE_STATUSES),
    executionMode:
      normalizeEnum(parsed.oat_execution_mode, EXECUTION_MODES) ??
      'single-thread',
    lifecycle: normalizeEnum(parsed.oat_lifecycle, LIFECYCLE_VALUES),
    pauseTimestamp: normalizeNullableString(parsed.oat_pause_timestamp, {
      treatPlaceholdersAsNull: true,
    }),
    pauseReason: normalizeNullableString(parsed.oat_pause_reason, {
      treatPlaceholdersAsNull: true,
    }),
    workflowMode,
    workflowOrigin: normalizeNullableString(parsed.oat_workflow_origin, {
      treatPlaceholdersAsNull: true,
    }),
    docsUpdated: normalizeNullableString(parsed.oat_docs_updated, {
      treatPlaceholdersAsNull: true,
    }),
    prStatus: normalizeNullableString(parsed.oat_pr_status, {
      treatPlaceholdersAsNull: true,
    }),
    prUrl: normalizeNullableString(parsed.oat_pr_url, {
      treatPlaceholdersAsNull: true,
    }),
    projectCreated: normalizeNullableString(parsed.oat_project_created, {
      treatPlaceholdersAsNull: true,
    }),
    projectCompleted: normalizeNullableString(parsed.oat_project_completed, {
      treatPlaceholdersAsNull: true,
    }),
    projectStateUpdated: normalizeNullableString(
      parsed.oat_project_state_updated,
      {
        treatPlaceholdersAsNull: true,
      },
    ),
    projectExplainer: parseExplainerDecision(
      parsed.oat_project_explainer,
      'projectExplainer',
    ),
    projectRecap: parseExplainerDecision(
      parsed.oat_project_recap,
      'projectRecap',
    ),
    generated: parseBoolean(parsed.oat_generated),
    template: parseBoolean(parsed.oat_template),
    ...(workflowMode === 'goal' && parseGoalStateRecord(parsed)),
  };
}

/** Goal state fields from a parsed `state.md` frontmatter record. */
export function parseGoalStateRecord(
  parsed: Record<string, unknown>,
): ParsedGoalStateFrontmatter {
  return {
    milestone: normalizeMilestoneId(parsed.oat_milestone),
    milestoneStatus: normalizeEnum(
      parsed.oat_milestone_status,
      MILESTONE_STATUSES,
    ),
    goalStatus: normalizeEnum(parsed.oat_goal_status, GOAL_STATUSES),
    goalOutcomeAudit: isPlainRecord(parsed.oat_goal_outcome_audit)
      ? parsed.oat_goal_outcome_audit
      : null,
    goalRecovery: parseGoalRecovery(parsed.oat_goal_recovery),
    deliveries: Array.isArray(parsed.oat_deliveries)
      ? parsed.oat_deliveries
          .map(parseDelivery)
          .filter((delivery): delivery is GoalDelivery => delivery !== null)
      : [],
    milestoneGates: parseMilestoneGates(parsed.oat_milestone_gates),
  };
}

const MILESTONE_ID_PATTERN = /^m(\d+)$/;

/**
 * Normalize a milestone id to its canonical form (`m1` and `m01` both become
 * `m01`); anything else reads as `null`.
 */
export function normalizeMilestoneId(value: unknown): string | null {
  const normalized = normalizeNullableString(value, {
    treatPlaceholdersAsNull: true,
  });
  const digits = normalized?.match(MILESTONE_ID_PATTERN)?.[1];
  return digits === undefined
    ? null
    : `m${digits.replace(/^0+(?=\d)/, '').padStart(2, '0')}`;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(value: unknown): string | null {
  return normalizeNullableString(value, { treatPlaceholdersAsNull: true });
}

function readStringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((item) => readString(item))
    .filter((item): item is string => item !== null);
}

/**
 * A persisted phase-id list with every id normalized the way the Milestones
 * reader normalizes membership (`p1` → `p01`); tokens that are not phase ids
 * are dropped, and plan validation reports them.
 */
function readPhaseIdList(value: unknown): string[] {
  return readStringList(value)
    .map((item) => normalizePhaseId(item))
    .filter((item): item is string => item !== null);
}

function parseGoalRecovery(value: unknown): GoalRecovery | null {
  if (!isPlainRecord(value)) {
    return null;
  }
  const milestone = normalizeMilestoneId(value.milestone);
  const stage = normalizeEnum(value.stage, GOAL_RECOVERY_STAGES);
  if (milestone === null || stage === null) {
    return null;
  }
  return {
    milestone,
    delivery_id: readString(value.delivery_id),
    phase_ids: readPhaseIdList(value.phase_ids),
    stage,
    review_artifact: readString(value.review_artifact),
  };
}

const MEMBER_STATUSES = ['open', 'merged', 'closed'] as const;

function parseMember(value: unknown): DeliveryMember | null {
  if (!isPlainRecord(value)) {
    return null;
  }
  return {
    url: readString(value.url),
    base: readString(value.base),
    reviewed_head: readString(value.reviewed_head),
    observed_head: readString(value.observed_head),
    observed_base: readString(value.observed_base),
    status: normalizeEnum<DeliveryMemberStatus>(value.status, MEMBER_STATUSES),
  };
}

function parseDelivery(value: unknown): GoalDelivery | null {
  if (!isPlainRecord(value)) {
    return null;
  }
  const deliveryId = readString(value.delivery_id);
  if (deliveryId === null) {
    return null;
  }
  const lookup = isPlainRecord(value.lookup) ? value.lookup : null;
  const review = isPlainRecord(value.integrated_review)
    ? value.integrated_review
    : null;
  const attainment = isPlainRecord(value.endpoint_attainment)
    ? value.endpoint_attainment
    : null;

  return {
    delivery_id: deliveryId,
    milestone: normalizeMilestoneId(value.milestone),
    scope: readPhaseIdList(value.scope),
    endpoint: normalizeEnum(value.endpoint, ['open', 'merged'] as const),
    kind: normalizeEnum(value.kind, ['pr', 'stack'] as const),
    status: normalizeEnum(value.status, [
      'registering',
      'open',
      'at_endpoint',
      'superseded',
    ] as const),
    superseded_by: readString(value.superseded_by),
    corrects_delivery_id: readString(value.corrects_delivery_id),
    covers_scope_of: readString(value.covers_scope_of),
    lookup: lookup && {
      repository: readString(lookup.repository),
      head_branch: readString(lookup.head_branch),
      head_sha_at_registration: readString(lookup.head_sha_at_registration),
    },
    members: Array.isArray(value.members)
      ? value.members
          .map(parseMember)
          .filter((member): member is DeliveryMember => member !== null)
      : [],
    integrated_review: review && {
      artifact: readString(review.artifact),
      scope: readPhaseIdList(review.scope),
      bound_revisions: Array.isArray(review.bound_revisions)
        ? review.bound_revisions.filter(isPlainRecord).map((revision) => ({
            member: typeof revision.member === 'number' ? revision.member : 0,
            base: readString(revision.base),
            head: readString(revision.head),
          }))
        : [],
      disposition: normalizeEnum(review.disposition, [
        'passed',
        'stale',
        'failed',
      ] as const),
    },
    exit_gate: parseGateCarrier(value.exit_gate),
    endpoint_attainment: attainment && {
      observed_at: readString(attainment.observed_at),
      members: Array.isArray(attainment.members)
        ? attainment.members.filter(isPlainRecord).map((member) => ({
            url: readString(member.url),
            head: readString(member.head),
            base: readString(member.base),
            status: normalizeEnum<DeliveryMemberStatus>(
              member.status,
              MEMBER_STATUSES,
            ),
          }))
        : [],
    },
  };
}

function parseGateCarrier(value: unknown): MilestoneGateCarrier | null {
  if (!isPlainRecord(value)) {
    return null;
  }
  const subject = isPlainRecord(value.subject) ? value.subject : null;
  const subjectKind = subject ? readString(subject.kind) : null;
  return {
    status: readString(value.status),
    resolution: readString(value.resolution),
    disposition: readString(value.disposition),
    config_fingerprint: readString(value.config_fingerprint),
    reviewed_head: readString(value.reviewed_head),
    subject:
      subject && subjectKind
        ? {
            kind: subjectKind,
            scope: readPhaseIdList(subject.scope),
            ref: readString(subject.ref),
          }
        : null,
    decided_at: readString(value.decided_at),
    freshness: normalizeEnum(value.freshness, ['fresh', 'stale'] as const),
    freshness_reason: readString(value.freshness_reason),
  };
}

function parseMilestoneGates(value: unknown): Record<string, MilestoneGates> {
  if (!isPlainRecord(value)) {
    return {};
  }
  const gates: Record<string, MilestoneGates> = {};
  for (const [key, carriers] of Object.entries(value)) {
    const milestoneId = normalizeMilestoneId(key);
    if (milestoneId === null || !isPlainRecord(carriers)) {
      continue;
    }
    gates[milestoneId] = {
      plan: parseGateCarrier(carriers.plan),
      exit: parseGateCarrier(carriers.exit),
    };
  }
  return gates;
}

function parseExplainerDecision(
  value: unknown,
  product: keyof typeof EXPLAINER_ALLOWED_PAIRS,
): ExplainerDecisionV1 | null {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const keys = Object.keys(record);
  if (
    keys.some(
      (key) => !(EXPLAINER_DECISION_KEYS as readonly string[]).includes(key),
    )
  ) {
    return null;
  }

  const decision = normalizeEnum(record.decision, EXPLAINER_DECISIONS);
  const source = normalizeEnum(record.source, EXPLAINER_SOURCES);
  const decidedAt = normalizeNullableString(record.decided_at);
  const hasFailedAttemptEvidence = Object.hasOwn(
    record,
    'failed_attempt_evidence',
  );
  const rawFailedAttemptEvidence = record.failed_attempt_evidence;
  const failedAttemptEvidence =
    typeof rawFailedAttemptEvidence === 'string'
      ? rawFailedAttemptEvidence
      : null;
  const isFailedAttempt =
    product === 'projectRecap' &&
    decision === 'skip' &&
    source === 'failed_attempt';
  if (
    decision === null ||
    source === null ||
    decidedAt === null ||
    !ISO_TIMESTAMP_PATTERN.test(decidedAt) ||
    Number.isNaN(Date.parse(decidedAt)) ||
    !EXPLAINER_ALLOWED_PAIRS[product].has(`${decision}:${source}`) ||
    (isFailedAttempt
      ? !isFailedAttemptEvidenceLocator(failedAttemptEvidence)
      : hasFailedAttemptEvidence)
  ) {
    return null;
  }

  return {
    decision,
    source,
    decided_at: decidedAt,
    ...(isFailedAttempt && {
      failed_attempt_evidence: failedAttemptEvidence as string,
    }),
  };
}

function isFailedAttemptEvidenceLocator(value: string | null): value is string {
  if (value === null) return false;
  const parts = value.split('/');
  const runSlug = parts[1];
  const fileName = parts[2];
  return (
    parts.length === 3 &&
    parts[0] === 'explainers' &&
    typeof runSlug === 'string' &&
    /^[a-z0-9][a-z0-9._-]*$/.test(runSlug) &&
    typeof fileName === 'string' &&
    ['manifest.json', 'failure.json'].includes(fileName)
  );
}

function parseBlockers(value: unknown): ProjectBlocker[] {
  if (typeof value === 'string') {
    const normalized = normalizeNullableString(value, {
      treatPlaceholdersAsNull: true,
    });
    if (normalized === null) return [];
    try {
      value = JSON.parse(normalized);
    } catch {
      return [normalized];
    }
  }
  if (!Array.isArray(value)) return [];

  const blockers: ProjectBlocker[] = [];
  for (const item of value) {
    if (typeof item === 'string') {
      const reason = normalizeNullableString(item, {
        treatPlaceholdersAsNull: true,
      });
      if (reason !== null) blockers.push(reason);
      continue;
    } else if (
      typeof item === 'object' &&
      item !== null &&
      !Array.isArray(item)
    ) {
      const record = item as Record<string, unknown>;
      if (
        typeof record.task_id === 'string' &&
        record.task_id.trim() &&
        typeof record.reason === 'string' &&
        record.reason.trim() &&
        typeof record.since === 'string' &&
        record.since.trim()
      ) {
        // Preserve the producer's literal fields.
        blockers.push({
          task_id: record.task_id,
          reason: record.reason,
          since: record.since,
        });
        continue;
      }
    }
    // Keep invalid entries visible to consumers that stop on a nonempty list.
    try {
      blockers.push(`Malformed blocker entry: ${JSON.stringify(item)}`);
    } catch {
      // Legal YAML aliases can form cycles that JSON cannot represent.
      blockers.push('Malformed blocker entry: [unserializable value]');
    }
  }
  return blockers;
}

function parseStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) =>
        normalizeNullableString(item, { treatPlaceholdersAsNull: true }),
      )
      .filter((item): item is string => item !== null);
  }

  if (typeof value !== 'string') {
    return [];
  }

  const normalized = value.trim();
  if (
    normalizeNullableString(normalized, { treatPlaceholdersAsNull: true }) ==
    null
  ) {
    return [];
  }

  try {
    const parsed = JSON.parse(normalized);
    if (Array.isArray(parsed)) {
      return parsed
        .map((item) =>
          normalizeNullableString(item, { treatPlaceholdersAsNull: true }),
        )
        .filter((item): item is string => item !== null);
    }
  } catch {
    return [normalized];
  }

  return [];
}

function normalizeEnum<T extends string>(
  value: unknown,
  allowedValues: readonly T[],
): T | null {
  const normalized = normalizeNullableString(value, {
    treatPlaceholdersAsNull: true,
  });
  if (normalized == null) {
    return null;
  }

  return allowedValues.includes(normalized as T) ? (normalized as T) : null;
}
