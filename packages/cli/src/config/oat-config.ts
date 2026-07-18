import { execSync } from 'node:child_process';
import { lstat, readFile } from 'node:fs/promises';
import { basename, isAbsolute, join, relative, resolve, sep } from 'node:path';

import { atomicWriteJson, dirExists, fileExists } from '@fs/io';
import { normalizeToPosixPath, validateRealPathWithinScope } from '@fs/paths';

import {
  normalizeDispatchMatrix,
  type WorkflowDispatchProviderValue,
} from './dispatch-matrix';
import { parseJsonConfig } from './json';
import { resolveUserSyncConfig } from './user-sync-config';

export {
  VALID_DISPATCH_MATRIX_TIERS,
  isCodexMaterializedRouteTarget,
  isWorkflowDispatchCandidateLadder,
  isWorkflowDispatchFallbackRoute,
  toWorkflowDispatchCandidateLadder,
  validateDispatchRouteTarget,
  type DispatchRouteTargetValidation,
  type WorkflowDispatchCandidate,
  type WorkflowDispatchCandidateLadder,
  type WorkflowDispatchFallbackRoute,
  type WorkflowDispatchLegacyMatrixCell,
  type WorkflowDispatchMatrixCell,
  type WorkflowDispatchMatrixTier,
  type WorkflowDispatchProviderValue,
  type WorkflowDispatchRoute,
  type WorkflowDispatchRouteEntry,
  type WorkflowDispatchRouteTarget,
} from './dispatch-matrix';

export interface OatDocumentationConfig {
  root?: string;
  tooling?: string;
  config?: string;
  index?: string;
  requireForProjectCompletion?: boolean;
}

export interface OatGitConfig {
  defaultBranch?: string;
}

export interface OatArchiveConfig {
  s3Uri?: string;
  s3SyncOnComplete?: boolean;
  summaryExportPath?: string;
  wrapUpExportPath?: string;
  awsProfile?: string;
  awsRegion?: string;
}

export type WorkflowHillCheckpointDefault = 'every' | 'final';
export type WorkflowProjectLog = true | false | 'auto';
export type WorkflowPostImplementStep = 'summary' | 'document' | 'pr';
export type WorkflowPostImplementLegacySequence =
  | 'wait'
  | 'summary'
  | 'pr'
  | 'docs-pr';
export interface WorkflowPostImplementStructuredSequence {
  preApproval: WorkflowPostImplementStep[];
  postApproval: WorkflowPostImplementStep[];
}
export type WorkflowPostImplementSequence =
  | WorkflowPostImplementLegacySequence
  | WorkflowPostImplementStructuredSequence;
export type WorkflowReviewExecutionModel =
  | 'subagent'
  | 'inline'
  | 'fresh-session';
export type WorkflowDesignMode = 'collaborative' | 'selective' | 'draft';
export type WorkflowCodexDispatchCeiling =
  | 'low'
  | 'medium'
  | 'high'
  | 'xhigh'
  | 'max';
export type WorkflowClaudeDispatchCeiling =
  | 'haiku'
  | 'sonnet'
  | 'opus'
  | 'fable';
export type WorkflowDispatchCeilingPreset =
  | 'balanced'
  | 'maximum'
  | 'cost-conscious';
export type WorkflowDispatchPolicyMode = 'managed' | 'inherit';
export type WorkflowManagedDispatchPolicy =
  | 'economy'
  | 'balanced'
  | 'high'
  | 'frontier'
  | 'uncapped';
export type GateOnFailure = 'block' | 'prompt' | 'warn';
export type GateAvoid = 'same-family' | 'same-runtime' | 'none';
export const MIN_GATE_TIMEOUT_MS = 1_000;
export const MAX_GATE_TIMEOUT_MS = 14_400_000;

export function isValidGateTimeoutMs(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= MIN_GATE_TIMEOUT_MS &&
    value <= MAX_GATE_TIMEOUT_MS
  );
}

export interface WorkflowDispatchCeiling {
  preset?: WorkflowDispatchCeilingPreset;
  recommendationVersion?: string;
  providers?: Record<string, WorkflowDispatchProviderValue>;
}

export interface WorkflowDispatchPolicy {
  mode: WorkflowDispatchPolicyMode;
  policy?: WorkflowManagedDispatchPolicy;
}

export interface WorkflowAutoArtifactReview {
  plan?: boolean;
  analysis?: boolean;
}

export interface GateConfig {
  command: string;
  onFailure: GateOnFailure;
  description?: string;
  maxAttempts?: number;
}

export interface ExecTargetInvocation {
  model?: string | 'provider-default';
  reasoningEffort?: string | 'provider-default';
}

export interface ExecTarget {
  runtime: string;
  baseCommand: string[];
  invocation?: ExecTargetInvocation;
  models?: string[];
  hostDetectionCommand?: string[];
  availabilityCommand?: string[];
  priority: number;
  timeoutMs?: number;
}

export type ExecTargetConfig = Partial<ExecTarget>;

export interface WorkflowGatesConfig {
  execTargets?: Record<string, ExecTargetConfig | null>;
  skills?: Record<string, GateConfig | null>;
}

export interface WorkflowGateTimeouts {
  code?: number;
  artifact?: number;
}

export interface OatWorkflowConfig {
  hillCheckpointDefault?: WorkflowHillCheckpointDefault;
  archiveOnComplete?: boolean;
  createPrOnComplete?: boolean;
  postImplementSequence?: WorkflowPostImplementSequence;
  reviewExecutionModel?: WorkflowReviewExecutionModel;
  autoReviewAtHillCheckpoints?: boolean;
  autoNarrowReReviewScope?: boolean;
  autoArtifactReview?: WorkflowAutoArtifactReview;
  projectLog?: WorkflowProjectLog;
  projectLogLedgerPath?: string;
  designMode?: WorkflowDesignMode;
  dispatchPolicy?: WorkflowDispatchPolicy;
  dispatchCeiling?: WorkflowDispatchCeiling;
  gateTimeouts?: WorkflowGateTimeouts;
  gates?: WorkflowGatesConfig;
}

const VALID_HILL_CHECKPOINT_DEFAULTS: readonly WorkflowHillCheckpointDefault[] =
  ['every', 'final'];
const VALID_POST_IMPLEMENT_LEGACY_SEQUENCES: readonly WorkflowPostImplementLegacySequence[] =
  ['wait', 'summary', 'pr', 'docs-pr'];
const VALID_POST_IMPLEMENT_STEPS: readonly WorkflowPostImplementStep[] = [
  'summary',
  'document',
  'pr',
];
const LEGACY_POST_IMPLEMENT_SEQUENCES: Readonly<
  Record<
    WorkflowPostImplementLegacySequence,
    WorkflowPostImplementStructuredSequence
  >
> = {
  wait: { preApproval: [], postApproval: [] },
  summary: { preApproval: ['summary'], postApproval: [] },
  pr: { preApproval: ['summary', 'pr'], postApproval: [] },
  'docs-pr': {
    preApproval: ['summary', 'document', 'pr'],
    postApproval: [],
  },
};
const VALID_REVIEW_EXECUTION_MODELS: readonly WorkflowReviewExecutionModel[] = [
  'subagent',
  'inline',
  'fresh-session',
];
const VALID_DESIGN_MODES: readonly WorkflowDesignMode[] = [
  'collaborative',
  'selective',
  'draft',
];
export const VALID_CODEX_DISPATCH_CEILINGS: readonly WorkflowCodexDispatchCeiling[] =
  ['low', 'medium', 'high', 'xhigh', 'max'];
export const VALID_CLAUDE_DISPATCH_CEILINGS: readonly WorkflowClaudeDispatchCeiling[] =
  ['haiku', 'sonnet', 'opus', 'fable'];
export const VALID_DISPATCH_CEILING_PRESETS: readonly WorkflowDispatchCeilingPreset[] =
  ['balanced', 'maximum', 'cost-conscious'];
export const VALID_DISPATCH_POLICY_MODES: readonly WorkflowDispatchPolicyMode[] =
  ['managed', 'inherit'];
export const VALID_MANAGED_DISPATCH_POLICIES: readonly WorkflowManagedDispatchPolicy[] =
  ['economy', 'balanced', 'high', 'frontier', 'uncapped'];
const VALID_GATE_ON_FAILURES: readonly GateOnFailure[] = [
  'block',
  'prompt',
  'warn',
];

export const BUILTIN_EXEC_TARGETS: Readonly<Record<string, ExecTarget>> = {
  'codex-default': {
    runtime: 'codex',
    baseCommand: ['codex', 'exec'],
    invocation: {
      model: 'provider-default',
      reasoningEffort: 'provider-default',
    },
    hostDetectionCommand: [
      'sh',
      '-c',
      '[ -n "$CODEX_THREAD_ID" ] || [ -n "$CODEX_SESSION_ID" ]',
    ],
    availabilityCommand: ['codex', '--version'],
    priority: 100,
  },
  'claude-default': {
    runtime: 'claude',
    baseCommand: ['claude', '-p'],
    invocation: {
      model: 'provider-default',
      reasoningEffort: 'provider-default',
    },
    hostDetectionCommand: ['sh', '-c', 'test -n "$CLAUDECODE"'],
    availabilityCommand: ['claude', '--version'],
    priority: 100,
  },
  'cursor-default': {
    runtime: 'cursor',
    baseCommand: ['cursor-agent', '-p'],
    invocation: {
      model: 'provider-default',
      reasoningEffort: 'provider-default',
    },
    hostDetectionCommand: ['sh', '-c', 'test -n "$CURSOR_AGENT"'],
    availabilityCommand: [
      'sh',
      '-c',
      'command -v cursor-agent || command -v agent',
    ],
    priority: 70,
  },
};

export function normalizeWorkflowPostImplementSequence(
  value: unknown,
): WorkflowPostImplementStructuredSequence | undefined {
  if (
    typeof value === 'string' &&
    (VALID_POST_IMPLEMENT_LEGACY_SEQUENCES as readonly string[]).includes(value)
  ) {
    const legacy =
      LEGACY_POST_IMPLEMENT_SEQUENCES[
        value as WorkflowPostImplementLegacySequence
      ];
    return {
      preApproval: [...legacy.preApproval],
      postApproval: [...legacy.postApproval],
    };
  }

  if (!isRecord(value)) {
    return undefined;
  }

  const keys = Object.keys(value);
  if (
    keys.length !== 2 ||
    !keys.includes('preApproval') ||
    !keys.includes('postApproval') ||
    !Array.isArray(value.preApproval) ||
    !Array.isArray(value.postApproval)
  ) {
    return undefined;
  }

  const steps = [...value.preApproval, ...value.postApproval];
  if (
    !steps.every(
      (step): step is WorkflowPostImplementStep =>
        typeof step === 'string' &&
        (VALID_POST_IMPLEMENT_STEPS as readonly string[]).includes(step),
    ) ||
    new Set(steps).size !== steps.length
  ) {
    return undefined;
  }

  return {
    preApproval: [...value.preApproval],
    postApproval: [...value.postApproval],
  };
}

export function isWorkflowPostImplementStructuredSequence(
  value: unknown,
): value is WorkflowPostImplementStructuredSequence {
  return (
    isRecord(value) &&
    normalizeWorkflowPostImplementSequence(value) !== undefined
  );
}
function normalizeMaxAttempts(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 2;
  }

  const attempts = Math.trunc(value);
  return attempts >= 1 ? attempts : 2;
}

function normalizeArgv(value: unknown): string[] | undefined {
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    !value.every((item): item is string => typeof item === 'string')
  ) {
    return undefined;
  }

  const [executable] = value;
  if (executable === undefined || !executable.trim()) {
    return undefined;
  }

  return [...value];
}

function normalizeStringList(value: unknown): string[] | undefined {
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    !value.every(
      (item): item is string =>
        typeof item === 'string' && item.trim().length > 0,
    )
  ) {
    return undefined;
  }

  return value.map((item) => item.trim());
}

function normalizeGateConfig(value: unknown): GateConfig | null | undefined {
  if (value === null) {
    return null;
  }
  if (!isRecord(value)) {
    return undefined;
  }

  const command = trimNonEmptyString(value.command);
  if (
    command === undefined ||
    typeof value.onFailure !== 'string' ||
    !(VALID_GATE_ON_FAILURES as readonly string[]).includes(value.onFailure)
  ) {
    return undefined;
  }

  const gate: GateConfig = {
    command,
    onFailure: value.onFailure as GateOnFailure,
    maxAttempts: normalizeMaxAttempts(value.maxAttempts),
  };
  const description = trimNonEmptyString(value.description);
  if (description !== undefined) {
    gate.description = description;
  }

  return gate;
}

function normalizeExecTarget(
  value: unknown,
): ExecTargetConfig | null | undefined {
  if (value === null) {
    return null;
  }
  if (!isRecord(value)) {
    return undefined;
  }

  const target: ExecTargetConfig = {};

  const runtime = trimNonEmptyString(value.runtime);
  if (runtime !== undefined) {
    target.runtime = runtime;
  }

  const baseCommand = normalizeArgv(value.baseCommand);
  if (baseCommand !== undefined) {
    target.baseCommand = baseCommand;
  }

  if (isRecord(value.invocation)) {
    const model = trimNonEmptyString(value.invocation.model);
    const reasoningEffort = trimNonEmptyString(
      value.invocation.reasoningEffort,
    );
    if (model !== undefined || reasoningEffort !== undefined) {
      target.invocation = {
        ...(model !== undefined ? { model } : {}),
        ...(reasoningEffort !== undefined ? { reasoningEffort } : {}),
      };
    }
  }

  const models = normalizeStringList(value.models);
  if (models !== undefined) {
    target.models = models;
  }

  if ('priority' in value) {
    if (typeof value.priority === 'number' && Number.isFinite(value.priority)) {
      target.priority = value.priority;
    }
  }
  if (isValidGateTimeoutMs(value.timeoutMs)) {
    target.timeoutMs = value.timeoutMs;
  }

  const hostDetectionCommand = normalizeArgv(value.hostDetectionCommand);
  if (hostDetectionCommand !== undefined) {
    target.hostDetectionCommand = hostDetectionCommand;
  }
  const availabilityCommand = normalizeArgv(value.availabilityCommand);
  if (availabilityCommand !== undefined) {
    target.availabilityCommand = availabilityCommand;
  }

  return Object.keys(target).length > 0 ? target : undefined;
}

function normalizeRecordMap<T>(
  value: unknown,
  normalizeValue: (entry: unknown) => T | null | undefined,
): Record<string, T | null> | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const next: Record<string, T | null> = {};
  for (const [key, rawEntry] of Object.entries(value)) {
    if (!key.trim()) {
      continue;
    }
    const normalized = normalizeValue(rawEntry);
    if (normalized !== undefined) {
      next[key] = normalized;
    }
  }

  return Object.keys(next).length > 0 ? next : undefined;
}

function normalizeWorkflowConfig(
  parsed: unknown,
): OatWorkflowConfig | undefined {
  if (!isRecord(parsed)) {
    return undefined;
  }

  const next: OatWorkflowConfig = {};

  if (
    typeof parsed.hillCheckpointDefault === 'string' &&
    (VALID_HILL_CHECKPOINT_DEFAULTS as readonly string[]).includes(
      parsed.hillCheckpointDefault,
    )
  ) {
    next.hillCheckpointDefault =
      parsed.hillCheckpointDefault as WorkflowHillCheckpointDefault;
  }

  if (typeof parsed.archiveOnComplete === 'boolean') {
    next.archiveOnComplete = parsed.archiveOnComplete;
  }

  if (typeof parsed.createPrOnComplete === 'boolean') {
    next.createPrOnComplete = parsed.createPrOnComplete;
  }

  const postImplementSequence = normalizeWorkflowPostImplementSequence(
    parsed.postImplementSequence,
  );
  if (postImplementSequence !== undefined) {
    next.postImplementSequence =
      typeof parsed.postImplementSequence === 'string'
        ? (parsed.postImplementSequence as WorkflowPostImplementLegacySequence)
        : postImplementSequence;
  }

  if (
    typeof parsed.reviewExecutionModel === 'string' &&
    (VALID_REVIEW_EXECUTION_MODELS as readonly string[]).includes(
      parsed.reviewExecutionModel,
    )
  ) {
    next.reviewExecutionModel =
      parsed.reviewExecutionModel as WorkflowReviewExecutionModel;
  }

  if (typeof parsed.autoReviewAtHillCheckpoints === 'boolean') {
    next.autoReviewAtHillCheckpoints = parsed.autoReviewAtHillCheckpoints;
  }

  if (typeof parsed.autoNarrowReReviewScope === 'boolean') {
    next.autoNarrowReReviewScope = parsed.autoNarrowReReviewScope;
  }

  if (isRecord(parsed.autoArtifactReview)) {
    const autoArtifactReview: WorkflowAutoArtifactReview = {};
    if (typeof parsed.autoArtifactReview.plan === 'boolean') {
      autoArtifactReview.plan = parsed.autoArtifactReview.plan;
    }
    if (typeof parsed.autoArtifactReview.analysis === 'boolean') {
      autoArtifactReview.analysis = parsed.autoArtifactReview.analysis;
    }
    if (Object.keys(autoArtifactReview).length > 0) {
      next.autoArtifactReview = autoArtifactReview;
    }
  }

  if (typeof parsed.projectLog === 'boolean' || parsed.projectLog === 'auto') {
    next.projectLog = parsed.projectLog;
  }

  const projectLogLedgerPath = trimNonEmptyString(parsed.projectLogLedgerPath);
  if (projectLogLedgerPath !== undefined) {
    next.projectLogLedgerPath = projectLogLedgerPath;
  }

  if (
    typeof parsed.designMode === 'string' &&
    (VALID_DESIGN_MODES as readonly string[]).includes(parsed.designMode)
  ) {
    next.designMode = parsed.designMode as WorkflowDesignMode;
  }

  if (isRecord(parsed.dispatchPolicy)) {
    const mode =
      typeof parsed.dispatchPolicy.mode === 'string' &&
      (VALID_DISPATCH_POLICY_MODES as readonly string[]).includes(
        parsed.dispatchPolicy.mode,
      )
        ? (parsed.dispatchPolicy.mode as WorkflowDispatchPolicyMode)
        : undefined;

    if (mode === 'inherit') {
      next.dispatchPolicy = { mode };
    }

    if (
      mode === 'managed' &&
      typeof parsed.dispatchPolicy.policy === 'string' &&
      (VALID_MANAGED_DISPATCH_POLICIES as readonly string[]).includes(
        parsed.dispatchPolicy.policy,
      )
    ) {
      next.dispatchPolicy = {
        mode,
        policy: parsed.dispatchPolicy.policy as WorkflowManagedDispatchPolicy,
      };
    }
  }

  if (isRecord(parsed.dispatchCeiling)) {
    const dispatchCeiling: WorkflowDispatchCeiling = {};

    if (
      typeof parsed.dispatchCeiling.preset === 'string' &&
      (VALID_DISPATCH_CEILING_PRESETS as readonly string[]).includes(
        parsed.dispatchCeiling.preset,
      )
    ) {
      dispatchCeiling.preset = parsed.dispatchCeiling
        .preset as WorkflowDispatchCeilingPreset;
    }

    const recommendationVersion = trimNonEmptyString(
      parsed.dispatchCeiling.recommendationVersion,
    );
    if (recommendationVersion !== undefined) {
      dispatchCeiling.recommendationVersion = recommendationVersion;
    }

    if (isRecord(parsed.dispatchCeiling.providers)) {
      const normalized = normalizeDispatchMatrix(
        parsed.dispatchCeiling.providers,
        {
          pathPrefix: 'workflow.dispatchCeiling.providers',
          compatibilityMode: 'layered-config',
        },
      );
      if (Object.keys(normalized.providers).length > 0) {
        dispatchCeiling.providers = normalized.providers;
      }
    }

    if (Object.keys(dispatchCeiling).length > 0) {
      next.dispatchCeiling = dispatchCeiling;
    }
  }

  if (isRecord(parsed.gateTimeouts)) {
    const gateTimeouts: WorkflowGateTimeouts = {};
    if (isValidGateTimeoutMs(parsed.gateTimeouts.code)) {
      gateTimeouts.code = parsed.gateTimeouts.code;
    }
    if (isValidGateTimeoutMs(parsed.gateTimeouts.artifact)) {
      gateTimeouts.artifact = parsed.gateTimeouts.artifact;
    }
    if (Object.keys(gateTimeouts).length > 0) {
      next.gateTimeouts = gateTimeouts;
    }
  }

  if (isRecord(parsed.gates)) {
    const gates: WorkflowGatesConfig = {};
    const execTargets = normalizeRecordMap(
      parsed.gates.execTargets,
      normalizeExecTarget,
    );
    if (execTargets !== undefined) {
      gates.execTargets = execTargets;
    }

    const skills = normalizeRecordMap(parsed.gates.skills, normalizeGateConfig);
    if (skills !== undefined) {
      gates.skills = skills;
    }

    if (Object.keys(gates).length > 0) {
      next.gates = gates;
    }
  }

  return Object.keys(next).length > 0 ? next : undefined;
}

export type OatToolsConfig = Partial<
  Record<
    | 'core'
    | 'ideas'
    | 'docs'
    | 'workflows'
    | 'utility'
    | 'project-management'
    | 'research'
    | 'brainstorm',
    boolean
  >
>;

export interface OatConfig {
  version: number;
  worktrees?: { root: string };
  projects?: { root: string };
  git?: OatGitConfig;
  archive?: OatArchiveConfig;
  tools?: OatToolsConfig;
  documentation?: OatDocumentationConfig;
  localPaths?: string[];
  autoReviewAtCheckpoints?: boolean;
  workflow?: OatWorkflowConfig;
}

export interface OatLocalConfig {
  version: number;
  activeProject?: string | null;
  lastPausedProject?: string | null;
  activeIdea?: string | null;
  workflow?: OatWorkflowConfig;
}

export interface UserConfig {
  version: number;
  activeIdea?: string | null;
  updateNotifications?: boolean;
  workflow?: OatWorkflowConfig;
}

export interface ActiveProjectResolution {
  name: string | null;
  path: string | null;
  status: 'active' | 'missing' | 'unset';
}

const DEFAULT_OAT_CONFIG: OatConfig = { version: 1 };
const DEFAULT_OAT_LOCAL_CONFIG: OatLocalConfig = { version: 1 };
const DEFAULT_USER_CONFIG: UserConfig = { version: 1 };

function getConfigPath(repoRoot: string): string {
  return join(repoRoot, '.oat', 'config.json');
}

function getLocalConfigPath(repoRoot: string): string {
  return join(repoRoot, '.oat', 'config.local.json');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isMissingFileError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'ENOENT'
  );
}

function trimPathValue(value: string): string {
  return value.replace(/\/+$/, '').replace(/^\.\//, '').trim();
}

function trimNonEmptyString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function normalizeProjectPath(
  repoRoot: string,
  pathValue: string | null | undefined,
): string | null {
  if (pathValue == null) {
    return null;
  }

  const trimmed = pathValue.trim();
  if (!trimmed) {
    return null;
  }

  const repoRootResolved = resolve(repoRoot);
  const absoluteResolved = resolve(repoRootResolved, trimmed);
  const relativePath = relative(repoRootResolved, absoluteResolved);
  const isInsideRepo =
    !isAbsolute(relativePath) &&
    relativePath !== '..' &&
    !relativePath.startsWith(`..${sep}`);

  if (!isInsideRepo) {
    return null;
  }

  const normalizedRelative = trimPathValue(normalizeToPosixPath(relativePath));
  return normalizedRelative && normalizedRelative !== '.'
    ? normalizedRelative
    : null;
}

async function normalizeReadableProjectPath(
  repoRoot: string,
  pathValue: string | null | undefined,
): Promise<string | null> {
  const normalizedPath = normalizeProjectPath(repoRoot, pathValue);
  if (!normalizedPath) {
    return null;
  }

  const absolutePath = join(repoRoot, normalizedPath);
  try {
    await lstat(absolutePath);
  } catch (error) {
    return isMissingFileError(error) ? normalizedPath : null;
  }

  try {
    const validated = await validateRealPathWithinScope(absolutePath, repoRoot);
    return (await dirExists(validated.realPath))
      ? normalizeProjectPath(validated.realScopeRoot, validated.realPath)
      : null;
  } catch {
    return null;
  }
}

function normalizeOatConfig(parsed: unknown): OatConfig {
  const next: OatConfig = { ...DEFAULT_OAT_CONFIG };
  if (!isRecord(parsed)) {
    return next;
  }

  if (
    isRecord(parsed.worktrees) &&
    typeof parsed.worktrees.root === 'string' &&
    parsed.worktrees.root.trim()
  ) {
    next.worktrees = { root: parsed.worktrees.root.trim() };
  }

  if (
    isRecord(parsed.projects) &&
    typeof parsed.projects.root === 'string' &&
    parsed.projects.root.trim()
  ) {
    next.projects = { root: parsed.projects.root.trim() };
  }

  if (isRecord(parsed.git)) {
    const git: OatGitConfig = {};
    if (
      typeof parsed.git.defaultBranch === 'string' &&
      parsed.git.defaultBranch.trim()
    ) {
      git.defaultBranch = parsed.git.defaultBranch.trim();
    }
    if (Object.keys(git).length > 0) {
      next.git = git;
    }
  }

  if (isRecord(parsed.archive)) {
    const archive: OatArchiveConfig = {};
    if (
      typeof parsed.archive.s3Uri === 'string' &&
      parsed.archive.s3Uri.trim()
    ) {
      archive.s3Uri = parsed.archive.s3Uri.trim().replace(/\/+$/, '');
    }
    if (typeof parsed.archive.s3SyncOnComplete === 'boolean') {
      archive.s3SyncOnComplete = parsed.archive.s3SyncOnComplete;
    }
    if (
      typeof parsed.archive.summaryExportPath === 'string' &&
      parsed.archive.summaryExportPath.trim()
    ) {
      archive.summaryExportPath = normalizeToPosixPath(
        parsed.archive.summaryExportPath.trim().replace(/\/+$/, ''),
      );
    }
    if (
      typeof parsed.archive.wrapUpExportPath === 'string' &&
      parsed.archive.wrapUpExportPath.trim()
    ) {
      archive.wrapUpExportPath = normalizeToPosixPath(
        parsed.archive.wrapUpExportPath.trim().replace(/\/+$/, ''),
      );
    }
    const awsProfile = trimNonEmptyString(parsed.archive.awsProfile);
    if (awsProfile !== undefined) {
      archive.awsProfile = awsProfile;
    }
    const awsRegion = trimNonEmptyString(parsed.archive.awsRegion);
    if (awsRegion !== undefined) {
      archive.awsRegion = awsRegion;
    }
    if (Object.keys(archive).length > 0) {
      next.archive = archive;
    }
  }

  if (isRecord(parsed.tools)) {
    const validPacks = [
      'core',
      'ideas',
      'docs',
      'workflows',
      'utility',
      'project-management',
      'research',
      'brainstorm',
    ] as const;
    const tools: OatToolsConfig = {};

    for (const pack of validPacks) {
      if (typeof parsed.tools[pack] === 'boolean') {
        tools[pack] = parsed.tools[pack];
      }
    }

    if (Object.keys(tools).length > 0) {
      next.tools = tools;
    }
  }

  if (isRecord(parsed.documentation)) {
    const doc: OatDocumentationConfig = {};
    if (
      typeof parsed.documentation.root === 'string' &&
      parsed.documentation.root.trim()
    ) {
      doc.root = parsed.documentation.root.trim();
    }
    if (
      typeof parsed.documentation.tooling === 'string' &&
      parsed.documentation.tooling.trim()
    ) {
      doc.tooling = parsed.documentation.tooling.trim();
    }
    if (
      typeof parsed.documentation.config === 'string' &&
      parsed.documentation.config.trim()
    ) {
      doc.config = parsed.documentation.config.trim();
    }
    if (
      typeof parsed.documentation.index === 'string' &&
      parsed.documentation.index.trim()
    ) {
      doc.index = parsed.documentation.index.trim();
    }
    if (typeof parsed.documentation.requireForProjectCompletion === 'boolean') {
      doc.requireForProjectCompletion =
        parsed.documentation.requireForProjectCompletion;
    }
    if (Object.keys(doc).length > 0) {
      next.documentation = doc;
    }
  }

  if (Array.isArray(parsed.localPaths)) {
    const filtered = parsed.localPaths.filter(
      (v): v is string => typeof v === 'string' && v.trim() !== '',
    );
    if (filtered.length > 0) {
      next.localPaths = [...new Set(filtered)].sort();
    }
  }

  if (typeof parsed.autoReviewAtCheckpoints === 'boolean') {
    next.autoReviewAtCheckpoints = parsed.autoReviewAtCheckpoints;
  }

  const workflow = normalizeWorkflowConfig(parsed.workflow);
  if (workflow) {
    next.workflow = workflow;
  }

  return next;
}

function normalizeOatLocalConfig(
  repoRoot: string,
  parsed: unknown,
): OatLocalConfig {
  const next: OatLocalConfig = { ...DEFAULT_OAT_LOCAL_CONFIG };
  if (!isRecord(parsed)) {
    return next;
  }

  if ('activeProject' in parsed) {
    const rawValue =
      typeof parsed.activeProject === 'string' || parsed.activeProject === null
        ? parsed.activeProject
        : null;
    next.activeProject = normalizeProjectPath(repoRoot, rawValue);
  }

  if ('lastPausedProject' in parsed) {
    const rawValue =
      typeof parsed.lastPausedProject === 'string' ||
      parsed.lastPausedProject === null
        ? parsed.lastPausedProject
        : null;
    next.lastPausedProject = normalizeProjectPath(repoRoot, rawValue);
  }

  if ('activeIdea' in parsed) {
    next.activeIdea =
      typeof parsed.activeIdea === 'string' && parsed.activeIdea.trim()
        ? parsed.activeIdea.trim()
        : null;
  }

  const workflow = normalizeWorkflowConfig(parsed.workflow);
  if (workflow) {
    next.workflow = workflow;
  }

  return next;
}

export function resolveLocalPaths(config: OatConfig): string[] {
  return config.localPaths ?? [];
}

export async function readOatConfig(repoRoot: string): Promise<OatConfig> {
  const configPath = getConfigPath(repoRoot);

  try {
    const raw = await readFile(configPath, 'utf8');
    return normalizeOatConfig(parseJsonConfig(raw, configPath));
  } catch (error) {
    if (isMissingFileError(error)) {
      return { ...DEFAULT_OAT_CONFIG };
    }

    throw error;
  }
}

export async function readOatLocalConfig(
  repoRoot: string,
): Promise<OatLocalConfig> {
  const configPath = getLocalConfigPath(repoRoot);

  try {
    const raw = await readFile(configPath, 'utf8');
    const normalized = normalizeOatLocalConfig(
      repoRoot,
      parseJsonConfig(raw, configPath),
    );
    if (normalized.activeProject !== undefined) {
      normalized.activeProject = await normalizeReadableProjectPath(
        repoRoot,
        normalized.activeProject,
      );
    }
    return normalized;
  } catch (error) {
    if (isMissingFileError(error)) {
      return { ...DEFAULT_OAT_LOCAL_CONFIG };
    }

    throw error;
  }
}

export async function writeOatConfig(
  repoRoot: string,
  config: OatConfig,
): Promise<void> {
  const configPath = getConfigPath(repoRoot);
  const normalized = normalizeOatConfig(config);
  await atomicWriteJson(configPath, normalized);
}

export async function writeOatLocalConfig(
  repoRoot: string,
  config: OatLocalConfig,
): Promise<void> {
  const configPath = getLocalConfigPath(repoRoot);
  const normalized = normalizeOatLocalConfig(repoRoot, config);
  await atomicWriteJson(configPath, normalized);
}

export async function resolveActiveProject(
  repoRoot: string,
): Promise<ActiveProjectResolution> {
  const localConfig = await readOatLocalConfig(repoRoot);
  const projectPath = localConfig.activeProject ?? null;

  if (!projectPath) {
    return { name: null, path: null, status: 'unset' };
  }

  let resolvedProjectPath = projectPath;
  let absoluteProjectPath = join(repoRoot, projectPath);
  try {
    const validated = await validateRealPathWithinScope(
      absoluteProjectPath,
      repoRoot,
    );
    const canonicalProjectPath = normalizeProjectPath(
      validated.realScopeRoot,
      validated.realPath,
    );
    if (!canonicalProjectPath) {
      throw new Error('Project path resolves to the repository root.');
    }
    resolvedProjectPath = canonicalProjectPath;
    absoluteProjectPath = validated.realPath;
  } catch {
    return {
      name: basename(absoluteProjectPath),
      path: projectPath,
      status: 'missing',
    };
  }
  const statePath = join(absoluteProjectPath, 'state.md');
  const isValid =
    (await dirExists(absoluteProjectPath)) && (await fileExists(statePath));

  return {
    name: basename(absoluteProjectPath),
    path: resolvedProjectPath,
    status: isValid ? 'active' : 'missing',
  };
}

export async function setActiveProject(
  repoRoot: string,
  projectRelativePath: string,
): Promise<void> {
  const normalizedPath = normalizeProjectPath(repoRoot, projectRelativePath);
  if (!normalizedPath) {
    throw new Error(
      `Active project path must be repo-relative or inside repo root: ${projectRelativePath}`,
    );
  }

  let canonicalPath: string;
  try {
    const validated = await validateRealPathWithinScope(
      join(repoRoot, normalizedPath),
      repoRoot,
    );
    const canonicalProjectPath = normalizeProjectPath(
      validated.realScopeRoot,
      validated.realPath,
    );
    if (!canonicalProjectPath || !(await dirExists(validated.realPath))) {
      throw new Error('Project directory is missing.');
    }
    canonicalPath = canonicalProjectPath;
  } catch {
    throw new Error(
      `Active project path must be repo-relative or inside repo root: ${projectRelativePath}`,
    );
  }

  const localConfig = await readOatLocalConfig(repoRoot);
  await writeOatLocalConfig(repoRoot, {
    ...localConfig,
    activeProject: canonicalPath,
  });
}

export async function clearActiveProject(
  repoRoot: string,
  options?: { lastPaused?: string },
): Promise<void> {
  const localConfig = await readOatLocalConfig(repoRoot);
  const lastPaused =
    options?.lastPaused === undefined
      ? localConfig.lastPausedProject
      : normalizeProjectPath(repoRoot, options.lastPaused);

  await writeOatLocalConfig(repoRoot, {
    ...localConfig,
    activeProject: null,
    lastPausedProject: lastPaused,
  });
}

function getUserConfigPath(userConfigDir: string): string {
  return join(userConfigDir, 'config.json');
}

const USER_CONFIG_OWNED_KEYS = new Set([
  'version',
  'activeIdea',
  'updateNotifications',
  'workflow',
  'knownStrays',
]);

function normalizeUserConfig(parsed: unknown): UserConfig {
  const next: UserConfig = { ...DEFAULT_USER_CONFIG };
  if (!isRecord(parsed)) {
    return next;
  }

  if ('activeIdea' in parsed) {
    next.activeIdea =
      typeof parsed.activeIdea === 'string' && parsed.activeIdea.trim()
        ? parsed.activeIdea.trim()
        : null;
  }

  if (typeof parsed.updateNotifications === 'boolean') {
    next.updateNotifications = parsed.updateNotifications;
  }

  const workflow = normalizeWorkflowConfig(parsed.workflow);
  if (workflow) {
    next.workflow = workflow;
  }

  return next;
}

async function readUnknownUserConfigFields(
  configPath: string,
): Promise<Record<string, unknown>> {
  try {
    const parsed = parseJsonConfig(
      await readFile(configPath, 'utf8'),
      configPath,
    );
    if (!isRecord(parsed)) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(parsed).filter(
        ([key]) => !USER_CONFIG_OWNED_KEYS.has(key),
      ),
    );
  } catch (error) {
    if (isMissingFileError(error)) {
      return {};
    }

    throw error;
  }
}

export async function readUserConfig(
  userConfigDir: string,
): Promise<UserConfig> {
  const configPath = getUserConfigPath(userConfigDir);

  try {
    const raw = await readFile(configPath, 'utf8');
    return normalizeUserConfig(parseJsonConfig(raw, configPath));
  } catch (error) {
    if (isMissingFileError(error)) {
      return { ...DEFAULT_USER_CONFIG };
    }

    throw error;
  }
}

export async function writeUserConfig(
  userConfigDir: string,
  config: UserConfig,
): Promise<void> {
  const configPath = getUserConfigPath(userConfigDir);
  await resolveUserSyncConfig(userConfigDir);
  const unknownFields = await readUnknownUserConfigFields(configPath);
  const normalized = normalizeUserConfig(config);
  await atomicWriteJson(configPath, { ...unknownFields, ...normalized });
}

export async function resolveActiveIdea(
  repoRoot: string,
  userConfigDir: string,
): Promise<string | null> {
  const localConfig = await readOatLocalConfig(repoRoot);
  if (localConfig.activeIdea) {
    return localConfig.activeIdea;
  }

  const userConfig = await readUserConfig(userConfigDir);
  return userConfig.activeIdea ?? null;
}

export async function setActiveIdea(
  repoRoot: string,
  ideaPath: string,
): Promise<void> {
  const localConfig = await readOatLocalConfig(repoRoot);
  await writeOatLocalConfig(repoRoot, {
    ...localConfig,
    activeIdea: ideaPath.trim(),
  });
}

export async function clearActiveIdea(repoRoot: string): Promise<void> {
  const localConfig = await readOatLocalConfig(repoRoot);
  await writeOatLocalConfig(repoRoot, {
    ...localConfig,
    activeIdea: null,
  });
}

export function detectDefaultBranch(repoRoot: string): string {
  try {
    const branch = execSync(
      'gh repo view --json defaultBranchRef --jq .defaultBranchRef.name',
      {
        cwd: repoRoot,
        encoding: 'utf8',
        timeout: 10_000,
        stdio: ['pipe', 'pipe', 'pipe'],
      },
    ).trim();
    if (branch) return branch;
  } catch {
    // gh not available or not authenticated — fall through
  }

  try {
    const ref = execSync('git rev-parse --abbrev-ref origin/HEAD', {
      cwd: repoRoot,
      encoding: 'utf8',
      timeout: 5_000,
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
    if (ref.startsWith('origin/')) return ref.replace('origin/', '');
  } catch {
    // origin/HEAD not set — fall through
  }

  return 'main';
}
