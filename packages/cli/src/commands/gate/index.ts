import { spawn } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { basename, isAbsolute, join, relative } from 'node:path';

import {
  buildCommandContext,
  type CommandContext,
  type GlobalOptions,
} from '@app/command-context';
import type { LatestReview } from '@commands/review/latest';
import {
  getFrontmatterBlock,
  parseFrontmatterScalarFields,
  parseGeneratedTime,
} from '@commands/shared/frontmatter';
import { readGlobalOptions } from '@commands/shared/shared.utils';
import {
  BUILTIN_EXEC_TARGETS,
  readOatConfig,
  readOatLocalConfig,
  readUserConfig,
  writeOatConfig,
  writeOatLocalConfig,
  writeUserConfig,
  type ExecTarget,
  type ExecTargetConfig,
  type GateConfig,
  type GateOnFailure,
  type OatConfig,
  type OatLocalConfig,
  type UserConfig,
  type WorkflowGatesConfig,
} from '@config/oat-config';
import {
  resolveEffectiveConfig,
  resolveExecTargetViews,
  resolveExecTargets,
  resolveGate,
  type ResolvedConfig,
} from '@config/resolve';
import { dirExists, fileExists } from '@fs/io';
import { normalizeToPosixPath, resolveProjectRoot } from '@fs/paths';
import {
  classifyModelFamily,
  type ModelFamily,
} from '@providers/identity/family';
import {
  resolveIdentityConfidence,
  type IdentityConfidence,
  type IdentityProvenance,
  type IdentityRecord,
} from '@providers/identity/provenance';
import { parseDispatchStamps } from '@providers/identity/stamp';
import { Command } from 'commander';
import YAML from 'yaml';

import {
  parseReviewGateVerdict,
  severityDisplayName,
  type ReviewArtifactGateInvocation,
  type ReviewGateVerdict,
} from './review-verdict';

interface GateCommandDependencies {
  buildCommandContext: (options: GlobalOptions) => CommandContext;
  resolveProjectRoot: (cwd: string) => Promise<string>;
  readOatConfig: (repoRoot: string) => Promise<OatConfig>;
  writeOatConfig: (repoRoot: string, config: OatConfig) => Promise<void>;
  readOatLocalConfig: (repoRoot: string) => Promise<OatLocalConfig>;
  writeOatLocalConfig: (
    repoRoot: string,
    config: OatLocalConfig,
  ) => Promise<void>;
  readUserConfig: (userConfigDir: string) => Promise<UserConfig>;
  writeUserConfig: (userConfigDir: string, config: UserConfig) => Promise<void>;
  resolveEffectiveConfig: (
    repoRoot: string,
    userConfigDir: string,
    env: NodeJS.ProcessEnv,
  ) => Promise<ResolvedConfig>;
  runProcess: (
    command: string,
    args: string[],
    options: ProcessRunOptions,
  ) => Promise<ProcessRunResult>;
  parseReviewGateVerdict: typeof parseReviewGateVerdict;
  processEnv: NodeJS.ProcessEnv;
}

interface GateSetOptions {
  command?: string;
  description?: string;
  onFailure?: string;
  maxAttempts?: string;
  disable?: boolean;
  layer?: string;
}

interface GateUnsetOptions {
  layer?: string;
}

interface TargetSetOptions {
  runtime?: string;
  baseCommandJson?: string;
  hostDetectionJson?: string;
  availabilityJson?: string;
  invocationModel?: string;
  invocationReasoningEffort?: string;
  priority?: string;
  disable?: boolean;
  layer?: string;
}

interface TargetUnsetOptions {
  layer?: string;
}

interface CrossProviderExecOptions {
  target?: string;
  avoid?: string;
  currentRuntime?: string;
  producerIdentity?: string;
}

interface ReviewGateOptions extends CrossProviderExecOptions {
  project?: string;
  reviewScope?: string;
  reviewType?: string;
  exitNonzeroOn?: string;
}

interface ProcessRunOptions {
  cwd: string;
  env: NodeJS.ProcessEnv;
  purpose: 'host-detection' | 'availability' | 'execute';
  stdio: 'ignore' | 'inherit';
  timeoutMs: number;
}

interface ProcessRunResult {
  exitCode: number;
  timedOut?: boolean;
}

type CrossProviderAvoid = 'same-family' | 'same-runtime' | 'none';
type GateDiversityAchieved =
  | 'different-family'
  | 'degraded-to-different-slug'
  | 'same-family - no diverse target available'
  | 'unknown-producer';
type GateWriteLayer = 'shared' | 'local' | 'user';
type ReviewGateThreshold = 'critical' | 'important' | 'medium' | 'minor';
type ReviewProjectResolutionSource =
  | 'declared'
  | 'active-project'
  | 'single-candidate';
type GateConfigContainer = OatConfig | OatLocalConfig | UserConfig;
type GateConfigMutation = (config: GateConfigContainer) => GateConfigContainer;

export interface SelectedExecTarget {
  id: string;
  target: ExecTarget;
  model?: string;
  family: ModelFamily;
  diversity?: GateDiversityMetadata;
  noDiverseFamilyFallback?: boolean;
}

interface GateProducerIdentity {
  value: string;
  provenance: IdentityProvenance;
  confidence: IdentityConfidence;
  family: ModelFamily;
  avoidFamilies: ModelFamily[];
  contributingScopes?: string[];
  contributingStampCount?: number;
  diversityClaimable: boolean;
  source: 'flag' | 'stamp' | 'aggregated-stamps' | 'unknown';
}

interface GateDiversityMetadata {
  avoid: CrossProviderAvoid;
  achieved: GateDiversityAchieved;
  producer: {
    value: string;
    provenance: IdentityProvenance;
    confidence: IdentityConfidence;
    family: ModelFamily;
    source: GateProducerIdentity['source'];
    avoidFamilies: ModelFamily[];
    contributingScopes?: string[];
    contributingStampCount?: number;
  };
  reviewer: {
    target: string;
    runtime: string;
    family: ModelFamily;
    model?: string;
  };
  warning?: string;
}

interface GateInvocationMetadata {
  readonly runId: string;
  readonly targetId: string;
  readonly runtime: string;
  readonly model: string | 'provider-default' | 'unknown';
  readonly reasoningEffort: string | 'provider-default' | 'unknown';
  readonly source: 'exec-target-config' | 'unknown';
}

interface ResolvedReviewProject {
  path: string;
  source: ReviewProjectResolutionSource;
}

type CorroborationStatus = 'matched' | 'missing' | 'mismatched';
type ProjectCorroborationStatus = CorroborationStatus | 'ambient';

interface GateTargetCorroboration {
  run: CorroborationStatus;
  project: ProjectCorroborationStatus;
  expectedProject: string;
  actual: {
    containingProject: string | null;
    artifactProject: string | null;
    normalizedArtifactProject: string | null;
    matchingArtifactPaths: string[];
  };
}

interface GateInvocationCorroboration {
  run: CorroborationStatus;
  project: ProjectCorroborationStatus;
  invocation: CorroborationStatus;
  expected: {
    project: string;
    invocation: GateInvocationMetadata;
  };
  actual: {
    containingProject: string | null;
    artifactProject: string | null;
    normalizedArtifactProject: string | null;
    matchingArtifactPaths: string[];
    invocation: ReviewArtifactGateInvocation | null;
  };
}

interface ReviewGateArtifactCandidate extends Omit<
  LatestReview,
  'generatedAt'
> {
  generatedAt: string | null;
  containingProject: string;
  gateRunId: string | null;
  artifactProject: string | null;
  generatedTime: number;
  lifecycleRank: number;
  signature: string;
  content: string;
}

const DEFAULT_DEPENDENCIES: GateCommandDependencies = {
  buildCommandContext,
  resolveProjectRoot,
  readOatConfig,
  writeOatConfig,
  readOatLocalConfig,
  writeOatLocalConfig,
  readUserConfig,
  writeUserConfig,
  resolveEffectiveConfig,
  runProcess: runChildProcess,
  parseReviewGateVerdict,
  processEnv: process.env,
};

const VALID_ON_FAILURE: readonly GateOnFailure[] = ['block', 'prompt', 'warn'];
const VALID_WRITE_LAYERS: readonly GateWriteLayer[] = [
  'shared',
  'local',
  'user',
];
const VALID_CROSS_PROVIDER_AVOIDS: readonly CrossProviderAvoid[] = [
  'same-family',
  'same-runtime',
  'none',
];
const VALID_REVIEW_GATE_THRESHOLDS: readonly ReviewGateThreshold[] = [
  'critical',
  'important',
  'medium',
  'minor',
];
const VALID_IDENTITY_PROVENANCES: readonly IdentityProvenance[] = [
  'declared',
  'observed',
  'inferred',
  'unknown',
];
const REVIEW_GATE_CONTEXT_NOTE =
  'This review is gate-originated. If you run `oat-project-review-provide`, set `oat_review_invocation: gate` in the review artifact. Write a canonical review artifact with `### Critical`, `### Important`, `### Medium`, and `### Minor` headings in that order, using `None` for empty sections.';
const GATE_CHECK_TIMEOUT_MS = 5_000;
const GATE_EXEC_TIMEOUT_MS = 10 * 60 * 1_000;

function reviewGateProjectContext(project: ResolvedReviewProject): string {
  return [
    `Resolved OAT project path: ${project.path}. Run the review for this project path.`,
    `Project resolution source: ${project.source}.`,
  ].join('\n');
}

function assembleReviewGatePrompt(segments: string[]): string {
  return segments
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0)
    .join('\n\n');
}

function normalizedTargetInvocation(
  target: ExecTarget,
): Pick<GateInvocationMetadata, 'model' | 'reasoningEffort' | 'source'> {
  const invocation = target.invocation;
  return {
    model: invocation?.model ?? 'unknown',
    reasoningEffort: invocation?.reasoningEffort ?? 'unknown',
    source: invocation ? 'exec-target-config' : 'unknown',
  };
}

function createGateInvocationMetadata(
  runId: string,
  selected: SelectedExecTarget,
): GateInvocationMetadata {
  const configuredInvocation = normalizedTargetInvocation(selected.target);
  const selectedModel = selected.model;
  const configuredModel = selected.target.invocation?.model;
  if (
    selectedModel &&
    configuredModel !== undefined &&
    configuredModel !== selectedModel
  ) {
    throw new Error(
      `Exec target "${selected.id}" configures invocation model ${configuredModel}, but selected model ${selectedModel} would be executed.`,
    );
  }

  return Object.freeze({
    runId,
    targetId: selected.id,
    runtime: selected.target.runtime,
    ...configuredInvocation,
    ...(selectedModel
      ? { model: selectedModel, source: 'exec-target-config' as const }
      : {}),
  });
}

function gateInvocationPromptContext(
  invocation: GateInvocationMetadata,
): string {
  const frontmatter = YAML.stringify({
    oat_gate_run_id: invocation.runId,
    oat_gate_target: invocation.targetId,
    oat_gate_runtime: invocation.runtime,
    oat_invocation_model: invocation.model,
    oat_invocation_reasoning_effort: invocation.reasoningEffort,
    oat_invocation_source: invocation.source,
  }).trimEnd();
  return [
    'Gate invocation metadata (copy these exact values into the gate review artifact frontmatter):',
    frontmatter,
  ].join('\n');
}

function corroborateGateInvocation(
  expected: GateInvocationMetadata,
  actual: ReviewArtifactGateInvocation | undefined,
  targetCorroboration: GateTargetCorroboration,
): GateInvocationCorroboration {
  const invocationFields = [
    ['targetId', expected.targetId, actual?.targetId],
    ['runtime', expected.runtime, actual?.runtime],
    ['model', expected.model, actual?.model],
    ['reasoningEffort', expected.reasoningEffort, actual?.reasoningEffort],
    ['source', expected.source, actual?.source],
  ] as const;
  const invocation: CorroborationStatus = invocationFields.some(
    ([, , actualValue]) => !actualValue,
  )
    ? 'missing'
    : invocationFields.every(
          ([, expectedValue, actualValue]) => expectedValue === actualValue,
        )
      ? 'matched'
      : 'mismatched';

  return {
    run: targetCorroboration.run,
    project: targetCorroboration.project,
    invocation,
    expected: {
      project: targetCorroboration.expectedProject,
      invocation: expected,
    },
    actual: {
      ...targetCorroboration.actual,
      invocation: actual ?? null,
    },
  };
}

async function runChildProcess(
  command: string,
  args: string[],
  options: ProcessRunOptions,
): Promise<ProcessRunResult> {
  return new Promise((resolve, reject) => {
    let timedOut = false;
    let killTimeout: NodeJS.Timeout | null = null;
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env,
      stdio: options.stdio,
    });
    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
      killTimeout = setTimeout(() => {
        child.kill('SIGKILL');
      }, 5_000);
      killTimeout.unref();
    }, options.timeoutMs);
    timeout.unref();

    child.on('error', (error) => {
      clearTimeout(timeout);
      if (killTimeout) {
        clearTimeout(killTimeout);
      }
      reject(error);
    });
    child.on('close', (code) => {
      clearTimeout(timeout);
      if (killTimeout) {
        clearTimeout(killTimeout);
      }
      resolve({
        exitCode: timedOut ? 124 : (code ?? 1),
        ...(timedOut ? { timedOut: true } : {}),
      });
    });
  });
}

function isGateWriteLayer(value: string): value is GateWriteLayer {
  return (VALID_WRITE_LAYERS as readonly string[]).includes(value);
}

function writeError(context: CommandContext, error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  if (context.json) {
    context.logger.json({ status: 'error', message });
  } else {
    context.logger.error(message);
  }
  process.exitCode = 1;
}

function writeJsonValue(context: CommandContext, payload: unknown): void {
  if (context.json) {
    context.logger.json(payload);
    return;
  }

  context.logger.info(JSON.stringify(payload, null, 2));
}

function writeSuccess(
  context: CommandContext,
  payload: Record<string, unknown>,
): void {
  if (context.json) {
    context.logger.json({ status: 'ok', ...payload });
    return;
  }

  context.logger.info(JSON.stringify({ status: 'ok', ...payload }, null, 2));
}

function trimRequired(value: string, label: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`${label} must be a non-empty string.`);
  }
  return trimmed;
}

function parseLayer(value: string | undefined): GateWriteLayer {
  const layer = value?.trim() || 'user';
  if (!isGateWriteLayer(layer)) {
    throw new Error(
      '--layer must be one of shared | local | user; auto is not supported for gate writes.',
    );
  }
  return layer;
}

function parseCrossProviderAvoid(
  value: string | undefined,
): CrossProviderAvoid {
  const avoid = value?.trim() || 'same-family';
  if (!(VALID_CROSS_PROVIDER_AVOIDS as readonly string[]).includes(avoid)) {
    throw new Error(
      '--avoid must be one of same-family | same-runtime | none.',
    );
  }
  return avoid as CrossProviderAvoid;
}

function parseReviewGateThreshold(
  value: string | undefined,
): ReviewGateThreshold {
  const threshold = value?.trim() || 'important';
  if (
    !(VALID_REVIEW_GATE_THRESHOLDS as readonly string[]).includes(threshold)
  ) {
    throw new Error(
      '--exit-nonzero-on must be one of critical | important | medium | minor.',
    );
  }
  return threshold as ReviewGateThreshold;
}

function parseOnFailure(value: string | undefined): GateOnFailure {
  if (!value || !(VALID_ON_FAILURE as readonly string[]).includes(value)) {
    throw new Error('--on-failure must be one of block | prompt | warn.');
  }
  return value as GateOnFailure;
}

function parsePositiveInteger(
  value: string | undefined,
  flag: string,
  defaultValue: number,
): number {
  if (value === undefined) {
    return defaultValue;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`${flag} must be an integer greater than or equal to 1.`);
  }
  return parsed;
}

function parseNumericFlag(
  value: string | undefined,
  flag: string,
  defaultValue: number,
): number {
  if (value === undefined) {
    return defaultValue;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${flag} must be a finite number.`);
  }
  return parsed;
}

function resolveGateExecTimeoutMs(env: NodeJS.ProcessEnv): number {
  const rawValue = env.OAT_GATE_EXEC_TIMEOUT_MS?.trim();
  if (!rawValue) {
    return GATE_EXEC_TIMEOUT_MS;
  }

  const parsed = Number(rawValue);
  if (!Number.isInteger(parsed) || parsed < 1) {
    return GATE_EXEC_TIMEOUT_MS;
  }

  return parsed;
}

function parseArgvJson(value: string, flag: string): string[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch (error) {
    const detail = error instanceof Error ? `: ${error.message}` : '';
    throw new Error(`${flag} must be valid JSON${detail}`, { cause: error });
  }

  if (
    !Array.isArray(parsed) ||
    parsed.length === 0 ||
    !parsed.every((item): item is string => typeof item === 'string') ||
    !parsed[0]?.trim()
  ) {
    throw new Error(
      `${flag} must be a non-empty JSON array of strings whose first item is not empty.`,
    );
  }

  return [...parsed];
}

function parseOptionalArgvJson(
  value: string | undefined,
  flag: string,
): string[] | undefined {
  return value === undefined ? undefined : parseArgvJson(value, flag);
}

function parseGateConfig(options: GateSetOptions): GateConfig | null {
  if (options.disable) {
    return null;
  }

  return {
    command: trimRequired(options.command ?? '', '--command'),
    onFailure: parseOnFailure(options.onFailure),
    maxAttempts: parsePositiveInteger(options.maxAttempts, '--max-attempts', 2),
    ...(options.description?.trim()
      ? { description: options.description.trim() }
      : {}),
  };
}

function detectDevBuildGateCommandWarnings(command: string): string[] {
  const normalized = command.trim();
  if (
    !/^node\s+(?:"[^"]*\/packages\/cli\/dist\/index\.js"|'[^']*\/packages\/cli\/dist\/index\.js'|\S*\/packages\/cli\/dist\/index\.js)\s+gate(?:\s|$)/.test(
      normalized,
    )
  ) {
    return [];
  }

  return [
    'Durable docs/config should reference `oat gate ...`; absolute dev-build paths are reserved for local development of unmerged behavior.',
  ];
}

function parseExecTargetConfig(
  options: TargetSetOptions,
): ExecTargetConfig | null {
  if (options.disable) {
    return null;
  }

  const baseCommandJson = options.baseCommandJson;
  if (baseCommandJson === undefined) {
    throw new Error('--base-command-json is required unless --disable is set.');
  }

  return {
    runtime: trimRequired(options.runtime ?? '', '--runtime'),
    baseCommand: parseArgvJson(baseCommandJson, '--base-command-json'),
    ...(options.priority !== undefined
      ? { priority: parseNumericFlag(options.priority, '--priority', 0) }
      : {}),
    ...(options.invocationModel !== undefined ||
    options.invocationReasoningEffort !== undefined
      ? {
          invocation: {
            ...(options.invocationModel !== undefined
              ? {
                  model: trimRequired(
                    options.invocationModel,
                    '--invocation-model',
                  ),
                }
              : {}),
            ...(options.invocationReasoningEffort !== undefined
              ? {
                  reasoningEffort: trimRequired(
                    options.invocationReasoningEffort,
                    '--invocation-reasoning-effort',
                  ),
                }
              : {}),
          },
        }
      : {}),
    ...(options.hostDetectionJson !== undefined
      ? {
          hostDetectionCommand: parseOptionalArgvJson(
            options.hostDetectionJson,
            '--host-detection-json',
          ),
        }
      : {}),
    ...(options.availabilityJson !== undefined
      ? {
          availabilityCommand: parseOptionalArgvJson(
            options.availabilityJson,
            '--availability-json',
          ),
        }
      : {}),
  };
}

function updateWorkflowGates(
  config: GateConfigContainer,
  update: (gates: WorkflowGatesConfig) => WorkflowGatesConfig,
): GateConfigContainer {
  return {
    ...config,
    workflow: {
      ...config.workflow,
      gates: update(config.workflow?.gates ?? {}),
    },
  };
}

function setSkillGate(
  config: GateConfigContainer,
  skillName: string,
  gate: GateConfig | null,
): GateConfigContainer {
  return updateWorkflowGates(config, (gates) => ({
    ...gates,
    skills: {
      ...gates.skills,
      [skillName]: gate,
    },
  }));
}

function unsetSkillGate(
  config: GateConfigContainer,
  skillName: string,
): GateConfigContainer {
  return updateWorkflowGates(config, (gates) => {
    const skills = { ...gates.skills };
    delete skills[skillName];
    return {
      ...gates,
      skills,
    };
  });
}

function setExecTarget(
  config: GateConfigContainer,
  targetId: string,
  target: ExecTargetConfig | null,
): GateConfigContainer {
  return updateWorkflowGates(config, (gates) => {
    const existing = gates.execTargets?.[targetId];
    const value =
      target === null
        ? target
        : existing === null || existing === undefined
          ? { priority: 0, ...target }
          : {
              ...existing,
              ...target,
              ...(existing.invocation || target.invocation
                ? {
                    invocation: {
                      ...existing.invocation,
                      ...target.invocation,
                    },
                  }
                : {}),
            };
    return {
      ...gates,
      execTargets: {
        ...gates.execTargets,
        [targetId]: value,
      },
    };
  });
}

function unsetExecTarget(
  config: GateConfigContainer,
  targetId: string,
): GateConfigContainer {
  return updateWorkflowGates(config, (gates) => {
    const execTargets = { ...gates.execTargets };
    delete execTargets[targetId];
    return {
      ...gates,
      execTargets,
    };
  });
}

async function readEffectiveConfig(
  context: CommandContext,
  dependencies: GateCommandDependencies,
): Promise<ResolvedConfig> {
  const repoRoot = await dependencies.resolveProjectRoot(context.cwd);
  const userConfigDir = join(context.home, '.oat');
  return dependencies.resolveEffectiveConfig(
    repoRoot,
    userConfigDir,
    dependencies.processEnv,
  );
}

function sortedExecTargetEntries(
  registry: Readonly<Record<string, ExecTarget>>,
): Array<{ id: string; target: ExecTarget }> {
  return Object.entries(registry)
    .map(([id, target]) => ({ id, target }))
    .sort((left, right) => {
      const priority = right.target.priority - left.target.priority;
      return priority === 0 ? left.id.localeCompare(right.id) : priority;
    });
}

function cloneExecTarget(target: ExecTarget): ExecTarget {
  return {
    runtime: target.runtime,
    baseCommand: [...target.baseCommand],
    priority: target.priority,
    ...(target.invocation ? { invocation: { ...target.invocation } } : {}),
    ...(target.models ? { models: [...target.models] } : {}),
    ...(target.hostDetectionCommand
      ? { hostDetectionCommand: [...target.hostDetectionCommand] }
      : {}),
    ...(target.availabilityCommand
      ? { availabilityCommand: [...target.availabilityCommand] }
      : {}),
  };
}

function identityFromRecords(
  records: IdentityRecord[],
  source: GateProducerIdentity['source'],
): GateProducerIdentity {
  const resolved = resolveIdentityConfidence(records);
  const family = classifyModelFamily({ value: resolved.value });
  return {
    value: resolved.value,
    provenance: resolved.provenance,
    confidence: resolved.confidence,
    family,
    avoidFamilies:
      resolved.diversityClaimable && family !== 'unknown' ? [family] : [],
    diversityClaimable: resolved.diversityClaimable,
    source,
  };
}

function unknownProducerIdentity(): GateProducerIdentity {
  return identityFromRecords([], 'unknown');
}

function parseProducerIdentityOption(
  value: string | undefined,
): GateProducerIdentity {
  const trimmed = value?.trim();
  if (!trimmed) {
    return unknownProducerIdentity();
  }

  const separator = trimmed.lastIndexOf(':');
  const producer = separator > 0 ? trimmed.slice(0, separator).trim() : '';
  const provenance = separator > 0 ? trimmed.slice(separator + 1).trim() : '';
  if (!producer || !provenance) {
    throw new Error(
      '--producer-identity must use <value>:<declared|observed|inferred|unknown>.',
    );
  }
  if (!(VALID_IDENTITY_PROVENANCES as readonly string[]).includes(provenance)) {
    throw new Error(
      '--producer-identity provenance must be one of declared | observed | inferred | unknown.',
    );
  }

  return identityFromRecords(
    [{ value: producer, provenance: provenance as IdentityProvenance }],
    'flag',
  );
}

function identityFromStamp(
  stamp: ReturnType<typeof parseDispatchStamps>[number],
): GateProducerIdentity {
  return identityFromRecords(
    [{ value: stamp.producer, provenance: stamp.provenance }],
    'stamp',
  );
}

function exactIdentityFromStamp(
  stamp: ReturnType<typeof parseDispatchStamps>[number],
): GateProducerIdentity {
  const identity = identityFromStamp(stamp);
  return identity.diversityClaimable && identity.family !== 'unknown'
    ? identity
    : unknownProducerIdentity();
}

function aggregateIdentityFromStamps(
  stamps: ReturnType<typeof parseDispatchStamps>,
): GateProducerIdentity {
  if (stamps.length === 0) {
    return unknownProducerIdentity();
  }

  const identities = stamps.map(identityFromStamp);
  const avoidFamilies = [
    ...new Set(
      identities.flatMap((identity) =>
        identity.diversityClaimable && identity.family !== 'unknown'
          ? [identity.family]
          : [],
      ),
    ),
  ];

  return {
    ...unknownProducerIdentity(),
    avoidFamilies,
    contributingScopes: [...new Set(stamps.map((stamp) => stamp.scope))],
    contributingStampCount: stamps.length,
    diversityClaimable: avoidFamilies.length > 0,
    source: 'aggregated-stamps',
  };
}

function phaseNumber(scope: string): number | undefined {
  const match = scope.match(/^p(\d+)(?:$|-t\d+$)/);
  const value = match?.[1];
  return value === undefined ? undefined : Number.parseInt(value, 10);
}

function reviewScopeRange(
  scope: string,
): { start: number; end: number } | null {
  if (scope === 'final') {
    return { start: 0, end: Number.MAX_SAFE_INTEGER };
  }

  const range = scope.match(/^p(\d+)-p(\d+)$/);
  if (!range) {
    return null;
  }

  return {
    start: Number.parseInt(range[1] ?? '0', 10),
    end: Number.parseInt(range[2] ?? '0', 10),
  };
}

function stampInReviewScope(stampScope: string, reviewScope: string): boolean {
  const range = reviewScopeRange(reviewScope);
  if (!range) {
    return false;
  }

  const stampPhase = phaseNumber(stampScope);
  return (
    stampPhase !== undefined &&
    stampPhase >= range.start &&
    stampPhase <= range.end
  );
}

async function readStampedProducerIdentity(options: {
  repoRoot: string;
  projectPath: string;
  reviewScope?: string;
}): Promise<GateProducerIdentity> {
  const scope = options.reviewScope?.trim();
  if (!scope) {
    return unknownProducerIdentity();
  }

  let markdown: string;
  try {
    markdown = await readFile(
      join(options.repoRoot, options.projectPath, 'implementation.md'),
      'utf8',
    );
  } catch {
    return unknownProducerIdentity();
  }

  const stamps = parseDispatchStamps(markdown).filter(
    (candidate) => candidate.role === 'implementer' || candidate.role === 'fix',
  );
  if (!reviewScopeRange(scope)) {
    const exactStamp = [...stamps]
      .reverse()
      .find((candidate) => candidate.scope === scope);
    return exactStamp
      ? exactIdentityFromStamp(exactStamp)
      : unknownProducerIdentity();
  }

  return aggregateIdentityFromStamps(
    stamps.filter((candidate) => stampInReviewScope(candidate.scope, scope)),
  );
}

async function resolveReviewProducerIdentity(options: {
  explicit?: string;
  repoRoot: string;
  projectPath: string;
  reviewScope?: string;
}): Promise<GateProducerIdentity> {
  if (options.explicit?.trim()) {
    return parseProducerIdentityOption(options.explicit);
  }

  return readStampedProducerIdentity(options);
}

function findPinnedModelArg(argv: readonly string[]): string | undefined {
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--model') {
      const value = argv[index + 1]?.trim();
      return value || undefined;
    }
    if (arg?.startsWith('--model=')) {
      const value = arg.slice('--model='.length).trim();
      return value || undefined;
    }
  }

  return undefined;
}

function targetCandidateModels(target: ExecTarget): string[] | undefined {
  const pinnedModel = findPinnedModelArg(target.baseCommand);
  if (pinnedModel) {
    return [pinnedModel];
  }

  if (target.models && target.models.length > 0) {
    return [...target.models];
  }

  return undefined;
}

function candidateFamily(
  target: ExecTarget,
  model: string | undefined,
): ModelFamily {
  if (model) {
    return classifyModelFamily({ value: model });
  }

  return classifyModelFamily({ value: '', providerId: target.runtime });
}

function expandExecTargetCandidates(
  id: string,
  target: ExecTarget,
): SelectedExecTarget[] {
  const models = targetCandidateModels(target);
  if (!models) {
    return [
      {
        id,
        target: cloneExecTarget(target),
        family: candidateFamily(target, undefined),
      },
    ];
  }

  return models.map((model) => ({
    id,
    target: cloneExecTarget(target),
    model,
    family: candidateFamily(target, model),
  }));
}

function producerHasKnownFamily(identity: GateProducerIdentity): boolean {
  return identity.avoidFamilies.length > 0;
}

function shouldAttemptNoDiverseFallback(avoid: CrossProviderAvoid): boolean {
  return avoid === 'same-family';
}

function achievedDiversity(
  selected: SelectedExecTarget,
  producerIdentity: GateProducerIdentity,
): GateDiversityAchieved {
  if (!producerHasKnownFamily(producerIdentity)) {
    return 'unknown-producer';
  }

  if (
    selected.family !== 'unknown' &&
    !producerIdentity.avoidFamilies.includes(selected.family)
  ) {
    return 'different-family';
  }

  if (
    producerIdentity.source !== 'aggregated-stamps' &&
    selected.model &&
    selected.model !== producerIdentity.value
  ) {
    return 'degraded-to-different-slug';
  }

  return 'same-family - no diverse target available';
}

function diversityFallbackWarning(
  achieved: GateDiversityAchieved,
): string | undefined {
  if (
    achieved !== 'unknown-producer' &&
    achieved !== 'degraded-to-different-slug' &&
    achieved !== 'same-family - no diverse target available'
  ) {
    return undefined;
  }

  return `No different-family gate target was available; running with achieved=${achieved}.`;
}

function attachDiversityMetadata(
  selected: SelectedExecTarget,
  avoid: CrossProviderAvoid,
  producerIdentity: GateProducerIdentity,
): SelectedExecTarget {
  const achieved = achievedDiversity(selected, producerIdentity);
  const warning = selected.noDiverseFamilyFallback
    ? diversityFallbackWarning(achieved)
    : undefined;

  return {
    ...selected,
    diversity: {
      avoid,
      achieved,
      producer: {
        value: producerIdentity.value,
        provenance: producerIdentity.provenance,
        confidence: producerIdentity.confidence,
        family: producerIdentity.family,
        source: producerIdentity.source,
        avoidFamilies: producerIdentity.avoidFamilies,
        ...(producerIdentity.contributingScopes
          ? { contributingScopes: producerIdentity.contributingScopes }
          : {}),
        ...(producerIdentity.contributingStampCount === undefined
          ? {}
          : {
              contributingStampCount: producerIdentity.contributingStampCount,
            }),
      },
      reviewer: {
        target: selected.id,
        runtime: selected.target.runtime,
        family: selected.family,
        ...(selected.model ? { model: selected.model } : {}),
      },
      ...(warning ? { warning } : {}),
    },
  };
}

function argvHead(argv: string[]): [string, string[]] {
  return [argv[0] ?? '', argv.slice(1)];
}

function listExecTargetCandidates(
  registry: Readonly<Record<string, ExecTarget>>,
  currentRuntime: string,
  avoid: CrossProviderAvoid,
  producerIdentity: GateProducerIdentity = unknownProducerIdentity(),
): SelectedExecTarget[] {
  const shouldAvoidSameFamily =
    avoid === 'same-family' && producerHasKnownFamily(producerIdentity);
  const shouldAvoidSameRuntime =
    currentRuntime !== 'unknown' &&
    (avoid === 'same-runtime' ||
      (avoid === 'same-family' && !producerHasKnownFamily(producerIdentity)));

  return sortedExecTargetEntries(registry)
    .filter(
      ({ target }) =>
        !shouldAvoidSameRuntime || target.runtime !== currentRuntime,
    )
    .flatMap(({ id, target }) => expandExecTargetCandidates(id, target))
    .filter(
      (candidate) =>
        !shouldAvoidSameFamily ||
        (candidate.family !== 'unknown' &&
          !producerIdentity.avoidFamilies.includes(candidate.family)),
    );
}

export function selectExecTarget(
  registry: Readonly<Record<string, ExecTarget>>,
  currentRuntime: string,
  avoid: CrossProviderAvoid,
  producerIdentity?: GateProducerIdentity,
): SelectedExecTarget | null {
  return (
    listExecTargetCandidates(
      registry,
      currentRuntime,
      avoid,
      producerIdentity,
    )[0] ?? null
  );
}

async function firstAvailableExecTarget(
  candidates: SelectedExecTarget[],
  context: CommandContext,
  dependencies: GateCommandDependencies,
): Promise<SelectedExecTarget | null> {
  for (const candidate of candidates) {
    const availabilityCommand = candidate.target.availabilityCommand;
    if (
      !availabilityCommand ||
      (await checkArgv(
        availabilityCommand,
        'availability',
        context,
        dependencies,
      ))
    ) {
      return candidate;
    }
  }

  return null;
}

async function checkArgv(
  argv: string[],
  purpose: ProcessRunOptions['purpose'],
  context: CommandContext,
  dependencies: GateCommandDependencies,
): Promise<boolean> {
  const [command, args] = argvHead(argv);
  if (!command) {
    return false;
  }

  try {
    const result = await dependencies.runProcess(command, args, {
      cwd: context.cwd,
      env: dependencies.processEnv,
      purpose,
      stdio: 'ignore',
      timeoutMs: GATE_CHECK_TIMEOUT_MS,
    });
    return result.exitCode === 0;
  } catch {
    return false;
  }
}

async function resolveCurrentRuntime(
  currentRuntime: string | undefined,
  context: CommandContext,
  dependencies: GateCommandDependencies,
): Promise<string> {
  const override = currentRuntime?.trim();
  if (override) {
    return override;
  }

  for (const { target } of sortedExecTargetEntries(BUILTIN_EXEC_TARGETS)) {
    if (
      target.hostDetectionCommand &&
      (await checkArgv(
        target.hostDetectionCommand,
        'host-detection',
        context,
        dependencies,
      ))
    ) {
      return target.runtime;
    }
  }

  return 'unknown';
}

async function selectAvailableExecTarget(
  registry: Readonly<Record<string, ExecTarget>>,
  currentRuntime: string,
  avoid: CrossProviderAvoid,
  producerIdentity: GateProducerIdentity,
  context: CommandContext,
  dependencies: GateCommandDependencies,
): Promise<SelectedExecTarget | null> {
  const selected = await firstAvailableExecTarget(
    listExecTargetCandidates(registry, currentRuntime, avoid, producerIdentity),
    context,
    dependencies,
  );
  if (selected) {
    return selected;
  }

  if (!shouldAttemptNoDiverseFallback(avoid)) {
    return null;
  }

  const fallback = await firstAvailableExecTarget(
    listExecTargetCandidates(
      registry,
      currentRuntime,
      'none',
      unknownProducerIdentity(),
    ),
    context,
    dependencies,
  );

  return fallback ? { ...fallback, noDiverseFamilyFallback: true } : null;
}

async function resolveSelectedExecTarget(
  targets: Readonly<Record<string, ExecTarget>>,
  options: CrossProviderExecOptions,
  producerIdentity: GateProducerIdentity,
  context: CommandContext,
  dependencies: GateCommandDependencies,
): Promise<SelectedExecTarget> {
  const explicitTarget = options.target?.trim();

  if (explicitTarget) {
    const target = targets[explicitTarget];
    if (!target) {
      throw new Error(`Unknown exec target "${explicitTarget}".`);
    }

    return attachDiversityMetadata(
      expandExecTargetCandidates(explicitTarget, target)[0]!,
      'none',
      producerIdentity,
    );
  }

  const avoid = parseCrossProviderAvoid(options.avoid);
  const currentRuntime = await resolveCurrentRuntime(
    options.currentRuntime,
    context,
    dependencies,
  );
  const selected = await selectAvailableExecTarget(
    targets,
    currentRuntime,
    avoid,
    producerIdentity,
    context,
    dependencies,
  );

  if (!selected) {
    throw new Error(noEligibleTargetMessage(currentRuntime, avoid));
  }

  return attachDiversityMetadata(selected, avoid, producerIdentity);
}

async function executeTarget(
  selected: SelectedExecTarget,
  prompt: string[],
  context: CommandContext,
  dependencies: GateCommandDependencies,
): Promise<ProcessRunResult> {
  const [command, baseArgs] = argvHead(selected.target.baseCommand);
  if (!command) {
    throw new Error(`Exec target "${selected.id}" has an empty base command.`);
  }

  const modelArgs =
    selected.model && !findPinnedModelArg(selected.target.baseCommand)
      ? ['--model', selected.model]
      : [];
  const timeoutMs = resolveGateExecTimeoutMs(dependencies.processEnv);

  if (!context.json) {
    context.logger.info(
      `Running gate target ${selected.id} (${selected.target.runtime}); timeout=${timeoutMs}ms.`,
    );
  }

  try {
    return await dependencies.runProcess(
      command,
      [...baseArgs, ...modelArgs, ...prompt],
      {
        cwd: context.cwd,
        env: dependencies.processEnv,
        purpose: 'execute',
        stdio: 'inherit',
        timeoutMs,
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to launch exec target "${selected.id}" (${command}): ${message}`,
      { cause: error },
    );
  }
}

function logGateDiversity(
  selected: SelectedExecTarget,
  context: CommandContext,
): void {
  const diversity = selected.diversity;
  if (!diversity || context.json) {
    return;
  }

  if (diversity.warning) {
    context.logger.warn(diversity.warning);
  }

  context.logger.info(
    `Gate diversity: achieved=${diversity.achieved} producer=${diversity.producer.value} producer_family=${diversity.producer.family} provenance=${diversity.producer.provenance} confidence=${diversity.producer.confidence} reviewer=${diversity.reviewer.target} reviewer_family=${diversity.reviewer.family}`,
  );
}

function noEligibleTargetMessage(
  currentRuntime: string,
  avoid: CrossProviderAvoid,
): string {
  return `No eligible gate exec target found for current runtime "${currentRuntime}" with --avoid ${avoid}. Install or configure an alternate runtime, rerun with --avoid none, or pin a target with --target <id>.`;
}

function normalizeRepoRelativeProjectPath(
  repoRoot: string,
  pathValue: string,
): string {
  const trimmed = pathValue.trim().replace(/\/+$/, '');
  const withoutState = trimmed.endsWith('/state.md')
    ? trimmed.slice(0, -'/state.md'.length)
    : trimmed;
  const repoRelative = isAbsolute(withoutState)
    ? relative(repoRoot, withoutState)
    : withoutState;

  const normalized = normalizeToPosixPath(repoRelative).replace(/^\.\//, '');
  if (normalized === '..' || normalized.startsWith('../')) {
    throw new Error(
      `Project path must resolve inside the current repository: ${pathValue}`,
    );
  }
  return normalized;
}

async function listProjectCandidates(
  repoRoot: string,
  projectsRoot: string,
): Promise<string[]> {
  const normalizedProjectsRoot = normalizeRepoRelativeProjectPath(
    repoRoot,
    projectsRoot,
  );
  const absoluteProjectsRoot = join(repoRoot, normalizedProjectsRoot);
  let scopeEntries;

  try {
    scopeEntries = await readdir(absoluteProjectsRoot, { withFileTypes: true });
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'ENOENT'
    ) {
      return [];
    }
    throw error;
  }

  const candidates = (
    await Promise.all(
      scopeEntries
        .filter((entry) => entry.isDirectory())
        .map(async (scopeEntry) => {
          const directProjectPath = normalizeToPosixPath(
            join(normalizedProjectsRoot, scopeEntry.name),
          );
          if (await fileExists(join(repoRoot, directProjectPath, 'state.md'))) {
            return [directProjectPath];
          }

          const scopePath = join(absoluteProjectsRoot, scopeEntry.name);
          const projectEntries = await readdir(scopePath, {
            withFileTypes: true,
          });
          return Promise.all(
            projectEntries
              .filter((entry) => entry.isDirectory())
              .map(async (projectEntry) => {
                const projectPath = normalizeToPosixPath(
                  join(
                    normalizedProjectsRoot,
                    scopeEntry.name,
                    projectEntry.name,
                  ),
                );
                return (await fileExists(
                  join(repoRoot, projectPath, 'state.md'),
                ))
                  ? projectPath
                  : null;
              }),
          );
        }),
    )
  )
    .flat()
    .filter((candidate): candidate is string => candidate !== null)
    .sort();

  return candidates;
}

async function assertProjectPath(
  repoRoot: string,
  projectPath: string,
  source: string,
): Promise<string> {
  const normalizedPath = normalizeRepoRelativeProjectPath(
    repoRoot,
    projectPath,
  );
  const absolutePath = join(repoRoot, normalizedPath);
  if (
    !(await dirExists(absolutePath)) ||
    !(await fileExists(join(absolutePath, 'state.md')))
  ) {
    throw new Error(
      `${source} project "${projectPath}" does not resolve to a project directory containing state.md.`,
    );
  }

  return normalizedPath;
}

async function resolveExplicitReviewProject(
  repoRoot: string,
  projectsRoot: string,
  projectValue: string,
): Promise<string> {
  const trimmed = projectValue.trim();
  if (!trimmed) {
    throw new Error('--project must be a non-empty project path or name.');
  }

  const looksLikePath =
    trimmed.includes('/') || trimmed.startsWith('.') || isAbsolute(trimmed);
  if (looksLikePath) {
    return assertProjectPath(repoRoot, trimmed, '--project');
  }

  const candidates = await listProjectCandidates(repoRoot, projectsRoot);
  const matches = candidates.filter(
    (candidate) => basename(candidate) === trimmed,
  );
  if (matches.length === 1) {
    return matches[0]!;
  }
  if (matches.length > 1) {
    throw new Error(
      `Multiple OAT projects match --project "${trimmed}": ${matches.join(', ')}. Pass a full project path instead.`,
    );
  }

  return assertProjectPath(repoRoot, `${projectsRoot}/${trimmed}`, '--project');
}

function resolvedProjectsRoot(effective: ResolvedConfig): string {
  return String(
    effective.resolved['projects.root']?.value ??
      effective.shared.projects?.root ??
      '.oat/projects/shared',
  );
}

async function resolveReviewProject(options: {
  repoRoot: string;
  effective: ResolvedConfig;
  project?: string;
}): Promise<ResolvedReviewProject> {
  const projectsRoot = resolvedProjectsRoot(options.effective);

  if (options.project !== undefined) {
    return {
      path: await resolveExplicitReviewProject(
        options.repoRoot,
        projectsRoot,
        options.project,
      ),
      source: 'declared',
    };
  }

  const activeProject = options.effective.local.activeProject?.trim();
  if (activeProject) {
    return {
      path: await assertProjectPath(options.repoRoot, activeProject, 'Active'),
      source: 'active-project',
    };
  }

  const candidates = await listProjectCandidates(
    options.repoRoot,
    projectsRoot,
  );
  if (candidates.length === 0) {
    throw new Error(
      'No OAT project could be resolved for gate review. Set an active project or pass --project <path-or-name>.',
    );
  }
  if (candidates.length > 1) {
    throw new Error(
      `Multiple OAT projects could be resolved for gate review: ${candidates.join(', ')}. Pass --project <path-or-name>.`,
    );
  }

  return {
    path: candidates[0]!,
    source: 'single-candidate',
  };
}

function reviewGateLifecycleRank(scope: string): number {
  const normalizedScope = scope.trim().toLowerCase();
  if (normalizedScope === 'final') {
    return Number.MAX_SAFE_INTEGER;
  }

  const phases = [...normalizedScope.matchAll(/p(\d+)/g)].map((match) =>
    Number.parseInt(match[1] ?? '0', 10),
  );
  if (phases.length === 0) {
    return 0;
  }

  const tasks = [...normalizedScope.matchAll(/(?:^|[-_])t(\d+)/g)].map(
    (match) => Number.parseInt(match[1] ?? '0', 10),
  );
  const latestPhase = Math.max(...phases);
  const latestTask = tasks.length > 0 ? Math.max(...tasks) : 9999;

  return latestPhase * 10_000 + latestTask;
}

async function readReviewGateArtifactCandidate(
  repoRoot: string,
  containingProject: string,
  relativePath: string,
): Promise<ReviewGateArtifactCandidate | null> {
  const content = await readFile(join(repoRoot, relativePath), 'utf8');
  const frontmatter = getFrontmatterBlock(content);
  if (!frontmatter) {
    return null;
  }

  const scalarFields = parseFrontmatterScalarFields(frontmatter, [
    'oat_generated_at',
    'oat_review_scope',
    'oat_gate_run_id',
    'oat_project',
  ]);
  const frontmatterString = (key: string): string | null =>
    scalarFields.values[key] ?? null;
  const generatedAt = frontmatterString('oat_generated_at');
  const parsedGeneratedTime = generatedAt
    ? parseGeneratedTime(generatedAt)
    : Number.NaN;
  const generatedTime = Number.isNaN(parsedGeneratedTime)
    ? Number.NEGATIVE_INFINITY
    : parsedGeneratedTime;

  const scope = frontmatterString('oat_review_scope') ?? '';

  return {
    path: relativePath,
    scope,
    generatedAt,
    kind: 'project',
    archived: false,
    actionable: true,
    containingProject,
    gateRunId: frontmatterString('oat_gate_run_id'),
    artifactProject: frontmatterString('oat_project'),
    generatedTime,
    lifecycleRank: reviewGateLifecycleRank(scope),
    signature: createHash('sha256').update(content).digest('hex'),
    content,
  };
}

function sortReviewGateArtifacts(
  left: ReviewGateArtifactCandidate,
  right: ReviewGateArtifactCandidate,
): number {
  if (left.generatedTime !== right.generatedTime) {
    return right.generatedTime - left.generatedTime;
  }
  if (left.lifecycleRank !== right.lifecycleRank) {
    return right.lifecycleRank - left.lifecycleRank;
  }
  return left.path.localeCompare(right.path);
}

async function listActiveProjectReviewCandidates(options: {
  repoRoot: string;
  projectPath: string;
}): Promise<ReviewGateArtifactCandidate[]> {
  const projectPath = normalizeRepoRelativeProjectPath(
    options.repoRoot,
    options.projectPath,
  );
  const reviewsDir = `${projectPath}/reviews`;
  let entries;

  try {
    entries = await readdir(join(options.repoRoot, reviewsDir), {
      withFileTypes: true,
    });
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'ENOENT'
    ) {
      return [];
    }
    throw error;
  }

  return (
    await Promise.all(
      entries
        .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
        .map((entry) =>
          readReviewGateArtifactCandidate(
            options.repoRoot,
            projectPath,
            normalizeToPosixPath(join(reviewsDir, entry.name)),
          ),
        ),
    )
  )
    .filter(
      (candidate): candidate is ReviewGateArtifactCandidate =>
        candidate !== null,
    )
    .sort(sortReviewGateArtifacts);
}

async function listReviewGateArtifactCandidates(options: {
  repoRoot: string;
  effective: ResolvedConfig;
  reviewProject: ResolvedReviewProject;
}): Promise<ReviewGateArtifactCandidate[]> {
  const configuredProjects = await listProjectCandidates(
    options.repoRoot,
    resolvedProjectsRoot(options.effective),
  );
  const projectPaths = [
    ...new Set([...configuredProjects, options.reviewProject.path]),
  ];
  const candidates = await Promise.all(
    projectPaths.map((projectPath) =>
      listActiveProjectReviewCandidates({
        repoRoot: options.repoRoot,
        projectPath,
      }),
    ),
  );

  return candidates.flat().sort(sortReviewGateArtifacts);
}

function findProducedReviewArtifact(
  before: readonly ReviewGateArtifactCandidate[],
  after: readonly ReviewGateArtifactCandidate[],
): ReviewGateArtifactCandidate | null {
  const beforeSignatures = new Map(
    before.map((candidate) => [candidate.path, candidate.signature]),
  );

  return (
    after.find(
      (candidate) =>
        beforeSignatures.get(candidate.path) !== candidate.signature,
    ) ?? null
  );
}

function resolveRunCorrelatedReviewArtifact(options: {
  runId: string;
  before: readonly ReviewGateArtifactCandidate[];
  after: readonly ReviewGateArtifactCandidate[];
}): {
  artifact: ReviewGateArtifactCandidate | null;
  diagnosticArtifact: ReviewGateArtifactCandidate | null;
  matchingArtifactPaths: string[];
} {
  const matches = options.after.filter(
    (candidate) => candidate.gateRunId === options.runId,
  );
  const artifact = matches.length === 1 ? matches[0]! : null;

  return {
    artifact,
    diagnosticArtifact:
      artifact ?? findProducedReviewArtifact(options.before, options.after),
    matchingArtifactPaths: matches.map((candidate) => candidate.path).sort(),
  };
}

function normalizeArtifactProject(
  repoRoot: string,
  artifactProject: string | null,
): string | null {
  if (!artifactProject) {
    return null;
  }

  try {
    const normalized = normalizeRepoRelativeProjectPath(
      repoRoot,
      artifactProject,
    );
    return normalized || null;
  } catch {
    return null;
  }
}

function corroborateReviewTarget(options: {
  repoRoot: string;
  reviewProject: ResolvedReviewProject;
  gateInvocation: GateInvocationMetadata;
  artifact: ReviewGateArtifactCandidate | null;
  diagnosticArtifact: ReviewGateArtifactCandidate | null;
  matchingArtifactPaths: string[];
}): GateTargetCorroboration {
  const actualArtifact = options.artifact ?? options.diagnosticArtifact;
  const normalizedArtifactProject = normalizeArtifactProject(
    options.repoRoot,
    actualArtifact?.artifactProject ?? null,
  );
  const run: CorroborationStatus =
    options.matchingArtifactPaths.length > 1
      ? 'mismatched'
      : actualArtifact?.gateRunId === options.gateInvocation.runId
        ? 'matched'
        : actualArtifact?.gateRunId
          ? 'mismatched'
          : 'missing';
  let project: ProjectCorroborationStatus = 'ambient';
  if (options.reviewProject.source === 'declared') {
    project = !actualArtifact?.artifactProject
      ? 'missing'
      : actualArtifact.containingProject === options.reviewProject.path &&
          normalizedArtifactProject === options.reviewProject.path
        ? 'matched'
        : 'mismatched';
  }

  return {
    run,
    project,
    expectedProject: options.reviewProject.path,
    actual: {
      containingProject: actualArtifact?.containingProject ?? null,
      artifactProject: actualArtifact?.artifactProject ?? null,
      normalizedArtifactProject,
      matchingArtifactPaths: options.matchingArtifactPaths,
    },
  };
}

function reviewBlocksAtThreshold(
  verdict: ReviewGateVerdict,
  threshold: ReviewGateThreshold,
): boolean {
  if (verdict.counts.critical > 0) {
    return true;
  }
  if (threshold === 'critical') {
    return false;
  }
  if (verdict.counts.important > 0) {
    return true;
  }
  if (threshold === 'important') {
    return false;
  }
  if (verdict.counts.medium > 0) {
    return true;
  }
  if (threshold === 'medium') {
    return false;
  }
  return verdict.counts.minor > 0;
}

function buildReviewGateHandoff(options: {
  artifactPath: string;
  verdict: ReviewGateVerdict;
  threshold: ReviewGateThreshold;
  blocking: boolean;
}): string {
  const receiveInstruction = `Run oat-project-review-receive for ${options.artifactPath} before treating this gate review as consumed.`;
  const thresholdIndex = VALID_REVIEW_GATE_THRESHOLDS.indexOf(
    options.threshold,
  );
  const nonBlockingSeverities = VALID_REVIEW_GATE_THRESHOLDS.slice(
    thresholdIndex + 1,
  ).filter((severity) => options.verdict.counts[severity] > 0);
  const hasFinalNonBlockingFindings =
    options.verdict.scope === 'final' &&
    !options.blocking &&
    nonBlockingSeverities.length > 0;

  if (!hasFinalNonBlockingFindings) {
    return receiveInstruction;
  }

  const counts = nonBlockingSeverities
    .map((severity) => `${severity}=${options.verdict.counts[severity]}`)
    .join(', ');

  return `Gate passed at the ${options.threshold} threshold, but the final review still contains non-blocking findings (${counts}). Run oat-project-review-receive for ${options.artifactPath} to disposition them before marking the final review row passed.`;
}

function reviewGateOutcome(payload: {
  blocking: boolean;
  normalization?: ReviewGateVerdict['normalization'];
}):
  | 'review_completed_blocking_findings'
  | 'review_completed_artifact_normalized_gate_passed'
  | 'review_completed_gate_passed' {
  if (payload.blocking) {
    return 'review_completed_blocking_findings';
  }
  if (payload.normalization) {
    return 'review_completed_artifact_normalized_gate_passed';
  }
  return 'review_completed_gate_passed';
}

function writeReviewGateResult(
  context: CommandContext,
  payload: {
    status: 'ok' | 'blocked';
    runId: string;
    target: string;
    project: string;
    projectResolutionSource: ReviewProjectResolutionSource;
    artifactPath: string;
    generatedAt: string;
    threshold: ReviewGateThreshold;
    blocking: boolean;
    counts: ReviewGateVerdict['counts'];
    reviewType: ReviewGateVerdict['reviewType'];
    scope: string | null;
    invocation: string | null;
    normalization?: ReviewGateVerdict['normalization'];
    handoff: string;
    diversity?: GateDiversityMetadata;
    gateInvocation: GateInvocationMetadata;
    corroboration: GateInvocationCorroboration;
  },
): void {
  const outcome = reviewGateOutcome(payload);
  if (context.json) {
    context.logger.json({ outcome, ...payload, receiveEligible: true });
    return;
  }

  if (outcome === 'review_completed_blocking_findings') {
    context.logger.info('Review completed and found blocking issues.');
  } else if (outcome === 'review_completed_artifact_normalized_gate_passed') {
    context.logger.info(
      payload.normalization?.persisted
        ? 'Review completed, artifact was normalized, and gate passed.'
        : 'Review completed, the immutable artifact snapshot was normalized in memory, and gate passed.',
    );
  } else {
    context.logger.info('Review completed and gate passed.');
  }
  context.logger.info(
    `Run: ${payload.runId} (generated ${payload.generatedAt})`,
  );
  context.logger.info(`Review artifact: ${payload.artifactPath}`);
  if (payload.normalization) {
    context.logger.info(
      `${payload.normalization.persisted ? 'Artifact normalized' : 'Artifact snapshot normalized in memory; source file unchanged'}: inserted ${payload.normalization.insertedSeverities.map((severity) => severityDisplayName(severity)).join(', ')} empty Findings section(s).`,
    );
  }
  context.logger.info(
    `Verdict: ${payload.status} (critical=${payload.counts.critical}, important=${payload.counts.important}, medium=${payload.counts.medium}, minor=${payload.counts.minor})`,
  );
  if (payload.diversity) {
    if (payload.diversity.warning) {
      context.logger.warn(payload.diversity.warning);
    }
    context.logger.info(
      `Gate diversity: achieved=${payload.diversity.achieved} producer=${payload.diversity.producer.value} producer_family=${payload.diversity.producer.family} provenance=${payload.diversity.producer.provenance} confidence=${payload.diversity.producer.confidence} reviewer=${payload.diversity.reviewer.target} reviewer_family=${payload.diversity.reviewer.family}`,
    );
  }
  context.logger.info(payload.handoff);
}

function writeReviewGateExecutionFailure(
  context: CommandContext,
  payload: {
    runId: string;
    target: string;
    project: string;
    projectResolutionSource: ReviewProjectResolutionSource;
    exitCode: number;
    timedOut?: boolean;
    timeoutMs?: number;
    gateInvocation: GateInvocationMetadata;
    corroboration?: GateInvocationCorroboration;
  },
): void {
  const message = payload.timedOut
    ? `Review did not complete: target ${payload.target} timed out after ${payload.timeoutMs}ms.`
    : `Review did not complete: target ${payload.target} exited with code ${payload.exitCode}.`;
  if (context.json) {
    context.logger.json({
      status: 'review_failed',
      outcome: 'review_did_not_complete',
      runId: payload.runId,
      target: payload.target,
      project: payload.project,
      projectResolutionSource: payload.projectResolutionSource,
      gateInvocation: payload.gateInvocation,
      ...(payload.corroboration
        ? { corroboration: payload.corroboration }
        : {}),
      exitCode: payload.exitCode,
      timedOut: payload.timedOut ?? false,
      ...(payload.timeoutMs !== undefined
        ? { timeoutMs: payload.timeoutMs }
        : {}),
      message,
    });
    return;
  }

  context.logger.error(message);
}

function writeReviewGateUnexpectedFailure(
  context: CommandContext,
  payload: {
    project: string;
    projectResolutionSource: ReviewProjectResolutionSource;
    target: string;
    gateInvocation: GateInvocationMetadata;
    error: unknown;
  },
): void {
  const message =
    payload.error instanceof Error
      ? payload.error.message
      : String(payload.error);
  if (context.json) {
    context.logger.json({
      status: 'review_failed',
      outcome: 'unexpected_post_selection_failure',
      runId: payload.gateInvocation.runId,
      target: payload.target,
      project: payload.project,
      projectResolutionSource: payload.projectResolutionSource,
      gateInvocation: payload.gateInvocation,
      message,
    });
    return;
  }

  context.logger.error(
    `Review failed after target selection for ${payload.target}: ${message}`,
  );
}

function writeReviewGateArtifactValidationFailure(
  context: CommandContext,
  payload: {
    runId: string;
    target: string;
    project: string;
    projectResolutionSource: ReviewProjectResolutionSource;
    artifactPath: string | null;
    generatedAt: string | null;
    message: string;
    recovery: string;
    gateInvocation: GateInvocationMetadata;
    corroboration?: GateInvocationCorroboration;
  },
): void {
  if (context.json) {
    context.logger.json({
      status: 'artifact_validation_failed',
      outcome: 'review_completed_artifact_validation_failed',
      runId: payload.runId,
      target: payload.target,
      project: payload.project,
      projectResolutionSource: payload.projectResolutionSource,
      artifactPath: payload.artifactPath,
      generatedAt: payload.generatedAt,
      gateInvocation: payload.gateInvocation,
      ...(payload.corroboration
        ? { corroboration: payload.corroboration }
        : {}),
      receiveEligible: false,
      handoff: null,
      message: payload.message,
      recovery: payload.recovery,
    });
    return;
  }

  context.logger.error(
    `Review completed but artifact validation failed: ${payload.message}`,
  );
  context.logger.error(payload.recovery);
}

function writeReviewGateTargetingFailure(
  context: CommandContext,
  payload: {
    runId: string;
    target: string;
    project: string;
    projectResolutionSource: ReviewProjectResolutionSource;
    artifactPath: string | null;
    generatedAt: string | null;
    message: string;
    gateInvocation: GateInvocationMetadata;
    corroboration: GateTargetCorroboration;
  },
): void {
  const corroboration: GateInvocationCorroboration = {
    run: payload.corroboration.run,
    project: payload.corroboration.project,
    invocation: 'missing',
    expected: {
      project: payload.corroboration.expectedProject,
      invocation: payload.gateInvocation,
    },
    actual: {
      ...payload.corroboration.actual,
      invocation: null,
    },
  };
  if (context.json) {
    context.logger.json({
      status: 'targeting_correlation_failed',
      outcome: 'review_completed_targeting_correlation_failed',
      runId: payload.runId,
      target: payload.target,
      project: payload.project,
      projectResolutionSource: payload.projectResolutionSource,
      artifactPath: payload.artifactPath,
      generatedAt: payload.generatedAt,
      gateInvocation: payload.gateInvocation,
      corroboration,
      receiveEligible: false,
      remediable: false,
      handoff: null,
      message: payload.message,
    });
    return;
  }

  context.logger.error(
    `Review completed but target correlation failed: ${payload.message}`,
  );
  context.logger.error(
    `Expected project=${payload.corroboration.expectedProject} run=${payload.gateInvocation.runId}; actual containing_project=${payload.corroboration.actual.containingProject ?? 'missing'} artifact_project=${payload.corroboration.actual.artifactProject ?? 'missing'} run_matches=${payload.corroboration.actual.matchingArtifactPaths.join(',') || 'none'}.`,
  );
  context.logger.error(
    'This targeting failure is not receive-eligible and must be corrected before severity or invocation remediation.',
  );
}

async function updateConfigLayer(
  context: CommandContext,
  layer: GateWriteLayer,
  dependencies: GateCommandDependencies,
  mutate: GateConfigMutation,
): Promise<void> {
  const repoRoot = await dependencies.resolveProjectRoot(context.cwd);
  const userConfigDir = join(context.home, '.oat');

  if (layer === 'shared') {
    const config = await dependencies.readOatConfig(repoRoot);
    await dependencies.writeOatConfig(repoRoot, mutate(config) as OatConfig);
    return;
  }

  if (layer === 'local') {
    const config = await dependencies.readOatLocalConfig(repoRoot);
    await dependencies.writeOatLocalConfig(
      repoRoot,
      mutate(config) as OatLocalConfig,
    );
    return;
  }

  const config = await dependencies.readUserConfig(userConfigDir);
  await dependencies.writeUserConfig(
    userConfigDir,
    mutate(config) as UserConfig,
  );
}

async function runResolve(
  skillName: string,
  context: CommandContext,
  dependencies: GateCommandDependencies,
): Promise<void> {
  try {
    const effective = await readEffectiveConfig(context, dependencies);
    writeJsonValue(context, resolveGate(effective, skillName));
    process.exitCode = 0;
  } catch (error) {
    writeError(context, error);
  }
}

async function runGateSet(
  skillName: string,
  options: GateSetOptions,
  context: CommandContext,
  dependencies: GateCommandDependencies,
): Promise<void> {
  try {
    const layer = parseLayer(options.layer);
    const normalizedSkill = trimRequired(skillName, '<skill>');
    const gate = parseGateConfig(options);
    const warnings = gate
      ? detectDevBuildGateCommandWarnings(gate.command)
      : [];
    await updateConfigLayer(context, layer, dependencies, (config) =>
      setSkillGate(config, normalizedSkill, gate),
    );
    if (!context.json) {
      for (const warning of warnings) {
        context.logger.warn(warning);
      }
    }
    writeSuccess(context, {
      layer,
      skill: normalizedSkill,
      gate,
      ...(warnings.length > 0 ? { warnings } : {}),
    });
    process.exitCode = 0;
  } catch (error) {
    writeError(context, error);
  }
}

async function runGateUnset(
  skillName: string,
  options: GateUnsetOptions,
  context: CommandContext,
  dependencies: GateCommandDependencies,
): Promise<void> {
  try {
    const layer = parseLayer(options.layer);
    const normalizedSkill = trimRequired(skillName, '<skill>');
    await updateConfigLayer(context, layer, dependencies, (config) =>
      unsetSkillGate(config, normalizedSkill),
    );
    writeSuccess(context, { layer, skill: normalizedSkill });
    process.exitCode = 0;
  } catch (error) {
    writeError(context, error);
  }
}

async function runTargetSet(
  targetId: string,
  options: TargetSetOptions,
  context: CommandContext,
  dependencies: GateCommandDependencies,
): Promise<void> {
  try {
    const layer = parseLayer(options.layer);
    const normalizedTargetId = trimRequired(targetId, '<id>');
    const target = parseExecTargetConfig(options);
    await updateConfigLayer(context, layer, dependencies, (config) =>
      setExecTarget(config, normalizedTargetId, target),
    );
    writeSuccess(context, { layer, target: normalizedTargetId, value: target });
    process.exitCode = 0;
  } catch (error) {
    writeError(context, error);
  }
}

async function runTargetUnset(
  targetId: string,
  options: TargetUnsetOptions,
  context: CommandContext,
  dependencies: GateCommandDependencies,
): Promise<void> {
  try {
    const layer = parseLayer(options.layer);
    const normalizedTargetId = trimRequired(targetId, '<id>');
    await updateConfigLayer(context, layer, dependencies, (config) =>
      unsetExecTarget(config, normalizedTargetId),
    );
    writeSuccess(context, { layer, target: normalizedTargetId });
    process.exitCode = 0;
  } catch (error) {
    writeError(context, error);
  }
}

async function runTargetList(
  context: CommandContext,
  dependencies: GateCommandDependencies,
): Promise<void> {
  try {
    const views = resolveExecTargetViews(
      await readEffectiveConfig(context, dependencies),
    );
    const targets = await Promise.all(
      Object.entries(views)
        .sort(([leftId, left], [rightId, right]) => {
          const priority = right.target.priority - left.target.priority;
          return priority === 0 ? leftId.localeCompare(rightId) : priority;
        })
        .map(async ([id, view]) => {
          const availabilityCommand = view.target.availabilityCommand;
          const available =
            view.enabled &&
            (!availabilityCommand ||
              (await checkArgv(
                availabilityCommand,
                'availability',
                context,
                dependencies,
              )));
          const invocation = normalizedTargetInvocation(view.target);
          return {
            id,
            runtime: view.target.runtime,
            origin: view.origin,
            explicitlyConfigured: view.explicitlyConfigured,
            enabled: view.enabled,
            available,
            invocation: {
              ...invocation,
            },
          };
        }),
    );
    writeSuccess(context, { targets });
    process.exitCode = 0;
  } catch (error) {
    writeError(context, error);
  }
}

async function runCrossProviderExec(
  prompt: string[],
  options: CrossProviderExecOptions,
  context: CommandContext,
  dependencies: GateCommandDependencies,
): Promise<void> {
  try {
    const effective = await readEffectiveConfig(context, dependencies);
    const targets = resolveExecTargets(effective);
    const producerIdentity = parseProducerIdentityOption(
      options.producerIdentity,
    );
    const selected = await resolveSelectedExecTarget(
      targets,
      options,
      producerIdentity,
      context,
      dependencies,
    );

    logGateDiversity(selected, context);
    const result = await executeTarget(selected, prompt, context, dependencies);
    process.exitCode = result.exitCode;
  } catch (error) {
    writeError(context, error);
  }
}

async function runReviewGate(
  prompt: string[],
  options: ReviewGateOptions,
  context: CommandContext,
  dependencies: GateCommandDependencies,
): Promise<void> {
  const runId = randomUUID();
  let postSelectionContext:
    | {
        project: string;
        projectResolutionSource: ReviewProjectResolutionSource;
        target: string;
        gateInvocation: GateInvocationMetadata;
      }
    | undefined;
  try {
    const repoRoot = await dependencies.resolveProjectRoot(context.cwd);
    const userConfigDir = join(context.home, '.oat');
    const effective = await dependencies.resolveEffectiveConfig(
      repoRoot,
      userConfigDir,
      dependencies.processEnv,
    );
    const reviewProject = await resolveReviewProject({
      repoRoot,
      effective,
      project: options.project,
    });
    const projectPath = reviewProject.path;
    const targets = resolveExecTargets(effective);
    const producerIdentity = await resolveReviewProducerIdentity({
      explicit: options.producerIdentity,
      repoRoot,
      projectPath,
      reviewScope: options.reviewScope,
    });
    const selected = await resolveSelectedExecTarget(
      targets,
      options,
      producerIdentity,
      context,
      dependencies,
    );
    const gateInvocation = createGateInvocationMetadata(runId, selected);
    postSelectionContext = {
      project: projectPath,
      projectResolutionSource: reviewProject.source,
      target: selected.id,
      gateInvocation,
    };
    const threshold = parseReviewGateThreshold(options.exitNonzeroOn);
    const before = await listReviewGateArtifactCandidates({
      repoRoot,
      effective,
      reviewProject,
    });
    const reviewPrompt = assembleReviewGatePrompt([
      REVIEW_GATE_CONTEXT_NOTE,
      reviewGateProjectContext(reviewProject),
      gateInvocationPromptContext(gateInvocation),
      ...(options.reviewType?.trim()
        ? [`Review type: ${options.reviewType.trim()}.`]
        : []),
      ...(options.reviewScope?.trim()
        ? [`Review scope: ${options.reviewScope.trim()}.`]
        : []),
      prompt.join(' '),
    ]);
    const childResult = await executeTarget(
      selected,
      [reviewPrompt],
      context,
      dependencies,
    );
    const childExitCode = childResult.exitCode;

    if (childExitCode !== 0) {
      writeReviewGateExecutionFailure(context, {
        runId,
        target: selected.id,
        project: projectPath,
        projectResolutionSource: reviewProject.source,
        exitCode: childExitCode,
        timedOut: childResult.timedOut ?? false,
        timeoutMs: resolveGateExecTimeoutMs(dependencies.processEnv),
        gateInvocation,
      });
      process.exitCode = childExitCode;
      return;
    }

    const after = await listReviewGateArtifactCandidates({
      repoRoot,
      effective,
      reviewProject,
    });
    const artifactResolution = resolveRunCorrelatedReviewArtifact({
      runId,
      before,
      after,
    });
    const initialTargetCorroboration = corroborateReviewTarget({
      repoRoot,
      reviewProject,
      gateInvocation,
      artifact: artifactResolution.artifact,
      diagnosticArtifact: artifactResolution.diagnosticArtifact,
      matchingArtifactPaths: artifactResolution.matchingArtifactPaths,
    });
    const producedArtifact = artifactResolution.artifact;
    if (!producedArtifact) {
      const diagnosticArtifact = artifactResolution.diagnosticArtifact;
      const message =
        artifactResolution.matchingArtifactPaths.length > 1
          ? `Multiple direct review artifacts carried gate run ID ${runId}.`
          : initialTargetCorroboration.run === 'mismatched'
            ? `The changed review artifact did not carry the expected gate run ID ${runId}.`
            : `No direct active project review artifact carried gate run ID ${runId}.`;
      writeReviewGateTargetingFailure(context, {
        runId,
        target: selected.id,
        project: projectPath,
        projectResolutionSource: reviewProject.source,
        artifactPath: diagnosticArtifact?.path ?? null,
        generatedAt: diagnosticArtifact?.generatedAt ?? null,
        message,
        gateInvocation,
        corroboration: initialTargetCorroboration,
      });
      process.exitCode = 1;
      return;
    }

    if (
      producedArtifact.containingProject !== reviewProject.path ||
      (reviewProject.source === 'declared' &&
        initialTargetCorroboration.project !== 'matched')
    ) {
      writeReviewGateTargetingFailure(context, {
        runId,
        target: selected.id,
        project: projectPath,
        projectResolutionSource: reviewProject.source,
        artifactPath: producedArtifact.path,
        generatedAt: producedArtifact.generatedAt,
        message:
          producedArtifact.containingProject !== reviewProject.path
            ? 'Review artifact was written outside the resolved review project.'
            : initialTargetCorroboration.project === 'missing'
              ? 'Review artifact is missing oat_project for the explicitly declared project.'
              : 'Review artifact project identity does not match the explicitly declared project.',
        gateInvocation,
        corroboration: initialTargetCorroboration,
      });
      process.exitCode = 1;
      return;
    }

    if (
      !producedArtifact.generatedAt ||
      !Number.isFinite(producedArtifact.generatedTime)
    ) {
      writeReviewGateArtifactValidationFailure(context, {
        runId,
        target: selected.id,
        project: projectPath,
        projectResolutionSource: reviewProject.source,
        artifactPath: producedArtifact.path,
        generatedAt: producedArtifact.generatedAt,
        message:
          'Review artifact oat_generated_at is missing or is not a valid timestamp.',
        recovery: `Set oat_generated_at to a valid timestamp in ${producedArtifact.path}, then rerun the gate. Invoke oat-project-review-receive only after the gate returns a receive-eligible result.`,
        gateInvocation,
        corroboration: corroborateGateInvocation(
          gateInvocation,
          undefined,
          initialTargetCorroboration,
        ),
      });
      process.exitCode = 1;
      return;
    }

    let verdict: ReviewGateVerdict;
    try {
      verdict = await dependencies.parseReviewGateVerdict(
        join(repoRoot, producedArtifact.path),
        {
          normalizeMissingEmptySeveritySections: true,
          artifactSnapshot: {
            content: producedArtifact.content,
            signature: producedArtifact.signature,
          },
        },
      );
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      writeReviewGateArtifactValidationFailure(context, {
        runId,
        target: selected.id,
        project: projectPath,
        projectResolutionSource: reviewProject.source,
        artifactPath: producedArtifact.path,
        generatedAt: producedArtifact.generatedAt,
        message: detail,
        recovery: `The review artifact was created at ${producedArtifact.path} but could not be consumed. Fix the artifact format, then rerun the gate to revalidate it. Invoke oat-project-review-receive only after the gate returns a receive-eligible result; if the only issue is a missing zero-count severity heading, rerun the gate to normalize the same artifact instead of creating a new review version.`,
        gateInvocation,
        corroboration: corroborateGateInvocation(
          gateInvocation,
          undefined,
          initialTargetCorroboration,
        ),
      });
      process.exitCode = 1;
      return;
    }
    const targetCorroboration = initialTargetCorroboration;
    const corroboration = corroborateGateInvocation(
      gateInvocation,
      verdict.gateInvocation,
      targetCorroboration,
    );
    if (
      corroboration.run !== 'matched' ||
      corroboration.invocation !== 'matched'
    ) {
      const missing =
        corroboration.run === 'missing' ||
        corroboration.invocation === 'missing';
      writeReviewGateArtifactValidationFailure(context, {
        runId,
        target: selected.id,
        project: projectPath,
        projectResolutionSource: reviewProject.source,
        artifactPath: producedArtifact.path,
        generatedAt: producedArtifact.generatedAt,
        message: missing
          ? 'Review artifact invocation metadata is missing required gate-owned values.'
          : 'Review artifact invocation metadata does not match the gate-owned configured invocation.',
        recovery: `Copy the exact gate invocation fields from the review prompt into ${producedArtifact.path}, then run oat-project-review-receive only after the artifact validates.`,
        gateInvocation,
        corroboration,
      });
      process.exitCode = 1;
      return;
    }
    if (verdict.invocation !== 'gate') {
      writeReviewGateArtifactValidationFailure(context, {
        runId,
        target: selected.id,
        project: projectPath,
        projectResolutionSource: reviewProject.source,
        artifactPath: producedArtifact.path,
        generatedAt: producedArtifact.generatedAt,
        message:
          'Review artifact is missing the required gate invocation marker `oat_review_invocation: gate`.',
        recovery: `Set oat_review_invocation: gate in ${producedArtifact.path}, then run oat-project-review-receive only after the artifact validates.`,
        gateInvocation,
        corroboration,
      });
      process.exitCode = 1;
      return;
    }
    const blocking = reviewBlocksAtThreshold(verdict, threshold);
    const handoff = buildReviewGateHandoff({
      artifactPath: producedArtifact.path,
      verdict,
      threshold,
      blocking,
    });

    writeReviewGateResult(context, {
      status: blocking ? 'blocked' : 'ok',
      runId,
      target: selected.id,
      project: projectPath,
      projectResolutionSource: reviewProject.source,
      artifactPath: producedArtifact.path,
      generatedAt: producedArtifact.generatedAt,
      threshold,
      blocking,
      counts: verdict.counts,
      reviewType: verdict.reviewType,
      scope: verdict.scope,
      invocation: verdict.invocation,
      normalization: verdict.normalization,
      handoff,
      diversity: selected.diversity,
      gateInvocation,
      corroboration,
    });
    process.exitCode = blocking ? 1 : 0;
  } catch (error) {
    if (postSelectionContext) {
      writeReviewGateUnexpectedFailure(context, {
        ...postSelectionContext,
        error,
      });
      process.exitCode = 1;
    } else {
      writeError(context, error);
    }
  }
}

export function createGateCommand(
  overrides: Partial<GateCommandDependencies> = {},
): Command {
  const dependencies: GateCommandDependencies = {
    ...DEFAULT_DEPENDENCIES,
    ...overrides,
  };

  const cmd = new Command('gate').description(
    'Resolve and manage workflow gate configuration',
  );

  cmd
    .command('resolve')
    .description('Print the resolved gate configuration for a skill')
    .argument('<skill>', 'Gate-aware skill name')
    .action(async (skillName: string, _options: unknown, command: Command) => {
      const context = dependencies.buildCommandContext(
        readGlobalOptions(command),
      );
      await runResolve(skillName, context, dependencies);
    });

  cmd
    .command('set')
    .description('Set a skill gate in a concrete config layer')
    .argument('<skill>', 'Gate-aware skill name')
    .option('--command <command>', 'Gate command to run')
    .option('--description <description>', 'Gate purpose and follow-up notes')
    .option('--on-failure <mode>', 'Failure behavior: block, prompt, or warn')
    .option('--max-attempts <count>', 'Maximum block remediation attempts')
    .option('--disable', 'Disable this skill gate in the selected layer')
    .option('--layer <layer>', 'Config layer to write: shared, local, or user')
    .action(
      async (skillName: string, options: GateSetOptions, command: Command) => {
        const context = dependencies.buildCommandContext(
          readGlobalOptions(command),
        );
        await runGateSet(skillName, options, context, dependencies);
      },
    );

  cmd
    .command('unset')
    .description('Remove a skill gate entry from a concrete config layer')
    .argument('<skill>', 'Gate-aware skill name')
    .option('--layer <layer>', 'Config layer to write: shared, local, or user')
    .action(
      async (
        skillName: string,
        options: GateUnsetOptions,
        command: Command,
      ) => {
        const context = dependencies.buildCommandContext(
          readGlobalOptions(command),
        );
        await runGateUnset(skillName, options, context, dependencies);
      },
    );

  cmd
    .command('cross-provider-exec')
    .description('Run a prompt through an alternate configured runtime target')
    .option('--target <id>', 'Run this exact exec target')
    .option(
      '--avoid <mode>',
      'Avoidance mode: same-family, same-runtime, or none',
    )
    .option(
      '--current-runtime <runtime>',
      'Override detected runtime for testing or manual routing',
    )
    .option(
      '--producer-identity <identity>',
      'Producer identity as <value>:<declared|observed|inferred|unknown>',
    )
    .argument('<prompt...>', 'Prompt arguments appended to the target command')
    .action(
      async (
        prompt: string[],
        options: CrossProviderExecOptions,
        command: Command,
      ) => {
        const context = dependencies.buildCommandContext(
          readGlobalOptions(command),
        );
        await runCrossProviderExec(prompt, options, context, dependencies);
      },
    );

  cmd
    .command('review')
    .description('Run a review gate and map review findings to exit status')
    .option('--target <id>', 'Run this exact exec target')
    .option(
      '--avoid <mode>',
      'Avoidance mode: same-family, same-runtime, or none',
    )
    .option(
      '--current-runtime <runtime>',
      'Override detected runtime for testing or manual routing',
    )
    .option(
      '--producer-identity <identity>',
      'Producer identity as <value>:<declared|observed|inferred|unknown>',
    )
    .option(
      '--project <path-or-name>',
      'Project path or name to review; defaults to the active project',
    )
    .option('--review-scope <scope>', 'Review scope hint for the provider')
    .option('--review-type <type>', 'Review type hint for the provider')
    .option(
      '--exit-nonzero-on <severity>',
      'Lowest severity that exits nonzero: critical, important, medium, or minor',
    )
    .argument(
      '<prompt...>',
      'Review prompt arguments appended to the target command',
    )
    .action(
      async (
        prompt: string[],
        options: ReviewGateOptions,
        command: Command,
      ) => {
        const context = dependencies.buildCommandContext(
          readGlobalOptions(command),
        );
        await runReviewGate(prompt, options, context, dependencies);
      },
    );

  const target = new Command('target').description(
    'Manage gate execution targets',
  );

  target
    .command('set')
    .description('Set an exec target in a concrete config layer')
    .argument('<id>', 'Exec target id')
    .option('--runtime <runtime>', 'Logical runtime family')
    .option(
      '--base-command-json <json>',
      'JSON argv array for the base command',
    )
    .option(
      '--host-detection-json <json>',
      'JSON argv array for host detection',
    )
    .option('--availability-json <json>', 'JSON argv array for availability')
    .option(
      '--invocation-model <model>',
      'Configured invocation model or provider-default',
    )
    .option(
      '--invocation-reasoning-effort <effort>',
      'Configured reasoning effort or provider-default',
    )
    .option('--priority <number>', 'Target priority, higher wins')
    .option('--disable', 'Disable this exec target in the selected layer')
    .option('--layer <layer>', 'Config layer to write: shared, local, or user')
    .action(
      async (targetId: string, options: TargetSetOptions, command: Command) => {
        const context = dependencies.buildCommandContext(
          readGlobalOptions(command),
        );
        await runTargetSet(targetId, options, context, dependencies);
      },
    );

  target
    .command('list')
    .description('List resolved exec targets and configuration provenance')
    .action(async (_options: unknown, command: Command) => {
      const context = dependencies.buildCommandContext(
        readGlobalOptions(command),
      );
      await runTargetList(context, dependencies);
    });

  target
    .command('unset')
    .description('Remove an exec target entry from a concrete config layer')
    .argument('<id>', 'Exec target id')
    .option('--layer <layer>', 'Config layer to write: shared, local, or user')
    .action(
      async (
        targetId: string,
        options: TargetUnsetOptions,
        command: Command,
      ) => {
        const context = dependencies.buildCommandContext(
          readGlobalOptions(command),
        );
        await runTargetUnset(targetId, options, context, dependencies);
      },
    );

  cmd.addCommand(target);

  return cmd;
}
