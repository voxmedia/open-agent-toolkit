import YAML from 'yaml';

import type { ExecutionMode, Phase, PhaseStatus, WorkflowMode } from '../types';

const FRONTMATTER_PATTERN = /^---\s*\n([\s\S]*?)\n---\s*(?:\n|$)/;
const PLACEHOLDER_PATTERN = /^\{[^}]+\}$/;

const PHASES = ['discovery', 'spec', 'design', 'plan', 'implement'] as const;
const PHASE_STATUSES = ['in_progress', 'complete', 'pr_open'] as const;
const EXECUTION_MODES = ['single-thread', 'subagent-driven'] as const;
const WORKFLOW_MODES = ['spec-driven', 'quick', 'import'] as const;

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
  const frontmatter = extractFrontmatter(content);
  if (frontmatter == null) {
    return EMPTY_PARSED_STATE;
  }

  let parsed: unknown;

  try {
    parsed = YAML.parse(frontmatter);
  } catch {
    return EMPTY_PARSED_STATE;
  }

  if (!isRecord(parsed)) {
    return EMPTY_PARSED_STATE;
  }

  return {
    currentTask: normalizeNullableString(parsed.oat_current_task),
    lastCommit: normalizeNullableString(parsed.oat_last_commit),
    blockers: parseStringArray(parsed.oat_blockers),
    hillCheckpoints: parseStringArray(parsed.oat_hill_checkpoints),
    hillCompleted: parseStringArray(parsed.oat_hill_completed),
    parallelExecution: parseBoolean(parsed.oat_parallel_execution),
    phase: normalizeEnum(parsed.oat_phase, PHASES),
    phaseStatus: normalizeEnum(parsed.oat_phase_status, PHASE_STATUSES),
    executionMode:
      normalizeEnum(parsed.oat_execution_mode, EXECUTION_MODES) ??
      'single-thread',
    workflowMode: normalizeEnum(parsed.oat_workflow_mode, WORKFLOW_MODES),
    workflowOrigin: normalizeNullableString(parsed.oat_workflow_origin),
    docsUpdated: normalizeNullableString(parsed.oat_docs_updated),
    prStatus: normalizeNullableString(parsed.oat_pr_status),
    prUrl: normalizeNullableString(parsed.oat_pr_url),
    projectCreated: normalizeNullableString(parsed.oat_project_created),
    projectCompleted: normalizeNullableString(parsed.oat_project_completed),
    projectStateUpdated: normalizeNullableString(
      parsed.oat_project_state_updated,
    ),
    generated: parseBoolean(parsed.oat_generated),
    template: parseBoolean(parsed.oat_template),
  };
}

function extractFrontmatter(content: string): string | null {
  const match = content.match(FRONTMATTER_PATTERN);
  return match?.[1] ?? null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function normalizeNullableString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return value == null ? null : String(value);
  }

  const normalized = value.trim();
  if (
    !normalized ||
    normalized === 'null' ||
    PLACEHOLDER_PATTERN.test(normalized)
  ) {
    return null;
  }

  return normalized;
}

function parseBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') {
      return true;
    }

    if (normalized === 'false') {
      return false;
    }
  }

  return false;
}

function parseStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => normalizeNullableString(item))
      .filter((item): item is string => item !== null);
  }

  if (typeof value !== 'string') {
    return [];
  }

  const normalized = value.trim();
  if (
    !normalized ||
    normalized === 'null' ||
    PLACEHOLDER_PATTERN.test(normalized)
  ) {
    return [];
  }

  try {
    const parsed = JSON.parse(normalized);
    if (Array.isArray(parsed)) {
      return parsed
        .map((item) => normalizeNullableString(item))
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
  const normalized = normalizeNullableString(value);
  if (normalized == null) {
    return null;
  }

  return allowedValues.includes(normalized as T) ? (normalized as T) : null;
}
