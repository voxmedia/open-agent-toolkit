import { parseFrontmatterRecord } from '../shared/utils/frontmatter';
import {
  normalizeNullableString,
  parseBoolean,
} from '../shared/utils/normalize';
import type {
  ExecutionMode,
  Lifecycle,
  Phase,
  PhaseStatus,
  WorkflowMode,
} from '../types';

const PHASES = ['discovery', 'spec', 'design', 'plan', 'implement'] as const;
const PHASE_STATUSES = ['in_progress', 'complete', 'pr_open'] as const;
const EXECUTION_MODES = ['single-thread', 'subagent-driven'] as const;
const WORKFLOW_MODES = ['spec-driven', 'quick', 'import'] as const;
const LIFECYCLE_VALUES = ['active', 'paused', 'complete'] as const;

export interface ParsedStateFrontmatter {
  currentTask: string | null;
  lastCommit: string | null;
  blockers: string[];
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
  generated: boolean;
  template: boolean;
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
  generated: false,
  template: false,
};

export function parseStateFrontmatter(content: string): ParsedStateFrontmatter {
  const parsed = parseFrontmatterRecord(content);
  if (Object.keys(parsed).length === 0) {
    return EMPTY_PARSED_STATE;
  }

  return {
    currentTask: normalizeNullableString(parsed.oat_current_task, {
      treatPlaceholdersAsNull: true,
    }),
    lastCommit: normalizeNullableString(parsed.oat_last_commit, {
      treatPlaceholdersAsNull: true,
    }),
    blockers: parseStringArray(parsed.oat_blockers),
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
    workflowMode: normalizeEnum(parsed.oat_workflow_mode, WORKFLOW_MODES),
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
    generated: parseBoolean(parsed.oat_generated),
    template: parseBoolean(parsed.oat_template),
  };
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
