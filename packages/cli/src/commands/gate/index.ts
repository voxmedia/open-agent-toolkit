import { execFileSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import {
  basename,
  dirname,
  isAbsolute,
  join,
  relative,
  resolve,
} from 'node:path';

import {
  buildCommandContext,
  type CommandContext,
  type GlobalOptions,
} from '@app/command-context';
import {
  appendProjectLog,
  commitProjectLog,
  committedProjectLogIdentityState,
  GATE_RECEIPTS_DIRNAME,
  PROJECT_LOG_FILENAME,
  type GateProjectLogReceipt,
  type ProjectLogCommitResult,
} from '@commands/project/log/append';
import type { LatestReview } from '@commands/review/latest';
import {
  getFrontmatterBlock,
  parseFrontmatterScalarFields,
  parseGeneratedTime,
  parseSkillGateOverrides,
  SKILL_GATE_OVERRIDE_DISABLED,
  SKILL_GATE_OVERRIDE_SOURCE,
} from '@commands/shared/frontmatter';
import { readGlobalOptions } from '@commands/shared/shared.utils';
import { parseJsonConfig } from '@config/json';
import {
  BUILTIN_EXEC_TARGETS,
  MAX_GATE_TIMEOUT_MS,
  MIN_GATE_TIMEOUT_MS,
  isValidGateTimeoutMs,
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
import { getOwnKey } from '@config/own-keys';
import {
  resolveEffectiveConfig,
  resolveExecTargetViews,
  resolveExecTargets,
  resolveGate,
  resolveGateWithSource,
  type GateConfigSource,
  type ResolvedConfig,
} from '@config/resolve';
import { dirExists, fileExists } from '@fs/io';
import {
  normalizeToPosixPath,
  resolveProjectRoot,
  validateRealPathWithinScope,
} from '@fs/paths';
import {
  buildDispatchReport,
  type DispatchReportV1,
} from '@providers/identity/dispatch-report';
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
  createGateActivityProbe,
  type GateActivityEvidence,
} from './activity-probes';
import {
  createBranchLocalGateCli,
  currentGateCliLaunch,
  readGateRouteReceipt,
  removeBranchLocalGateCli,
  type BranchLocalGateCli,
} from './branch-local-cli';
import {
  runChildProcess,
  type ProcessRunOptions,
  type ProcessRunResult,
} from './child-process';
import { validateConfiguredGateCommand } from './configured-command';
import {
  parseReviewGateVerdict,
  severityDisplayName,
  type ReviewArtifactGateInvocation,
  type ReviewGateVerdict,
} from './review-verdict';
import { createGateRouteCommand } from './route';

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
  createGateActivityProbe: typeof createGateActivityProbe;
  createBranchLocalGateCli: typeof createBranchLocalGateCli;
  currentGateCliLaunch: typeof currentGateCliLaunch;
  removeBranchLocalGateCli: typeof removeBranchLocalGateCli;
  readGateRouteReceipt: typeof readGateRouteReceipt;
  runProcess: (
    command: string,
    args: string[],
    options: ProcessRunOptions,
  ) => Promise<ProcessRunResult>;
  parseReviewGateVerdict: typeof parseReviewGateVerdict;
  appendProjectLog: typeof appendProjectLog;
  processEnv: NodeJS.ProcessEnv;
  writeGateRunMarker: (
    path: string,
    marker: GateRunMarker,
    warn: (message: string) => void,
  ) => Promise<boolean>;
  removeGateRunMarker: (
    path: string,
    warn: (message: string) => void,
  ) => Promise<void>;
  writeGateProjectLogReceipt: (
    path: string,
    receipt: GateProjectLogReceipt,
    warn: (message: string) => void,
  ) => Promise<boolean>;
  sleep: (ms: number) => Promise<void>;
  writeDiagnostic: (message: string) => void;
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
  timeoutMs?: string;
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
  timeoutMs?: string;
}

interface ReviewGateOptions extends CrossProviderExecOptions {
  project?: string;
  reviewScope?: string;
  reviewType?: string;
  exitNonzeroOn?: string;
}

interface ResolveGateOptions {
  /**
   * Absent: legacy raw output. `true`: project-aware using the active project.
   * String: project-aware using that explicit path or name.
   */
  project?: string | boolean;
}

type GateTimeoutSource =
  | 'cli'
  | 'target'
  | 'config'
  | 'env'
  | 'scope-default'
  | 'default';

interface GateTimeoutResolution {
  timeoutMs: number;
  source: GateTimeoutSource;
}

interface GateRunMarker {
  runId: string;
  targetId: string;
  runtime: string;
  reviewType: string | null;
  reviewScope: string | null;
  project: string;
  startedAt: string;
  budgetMs: number;
  budgetSource: GateTimeoutSource;
}

type PersistedTimeoutLayer = 'local' | 'shared' | 'user';

interface RawGateTimeoutConfig {
  layer: PersistedTimeoutLayer;
  value: unknown;
}

interface RawGateTimeoutLayers {
  target: RawGateTimeoutConfig[];
  workflow: RawGateTimeoutConfig[];
}

type CrossProviderAvoid = 'same-family' | 'same-runtime' | 'none';
type GateDiversityAchieved =
  | 'different-family'
  | 'degraded-to-different-slug'
  | 'same-family - no diverse target available'
  | 'unknown-producer';
type GateWriteLayer = 'shared' | 'local' | 'user';
type ReviewGateThreshold = 'critical' | 'important' | 'medium' | 'minor';
type ReviewGateTerminalStatus =
  | 'ok'
  | 'blocked'
  | 'review_failed'
  | 'artifact_missing'
  | 'targeting_correlation_failed'
  | 'artifact_validation_failed';
/**
 * Ordered labels for the work `runReviewGate` performs after a target is
 * selected. The label is diagnostic context for the `review_failed` envelope;
 * it is never evidence about whether a committed artifact is receive-eligible.
 */
type PostSelectionStep =
  | 'target-dispatch'
  | 'artifact-scan'
  | 'artifact-correlation'
  | 'artifact-validation'
  | 'verdict-parse'
  | 'invocation-corroboration'
  | 'verdict-disposition';
interface ReviewGateProjectLogFinalization {
  repoRoot: string;
  home: string;
  project: string;
  ref: string;
  target: string;
  threshold: ReviewGateThreshold;
  status: ReviewGateTerminalStatus;
  exitCode: number;
  counts?: ReviewGateVerdict['counts'];
  artifactPath?: string;
  artifactSignature?: string;
  runId: string;
}
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
  source: 'flag' | 'stamp' | 'aggregated-stamps' | 'environment' | 'unknown';
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
  createGateActivityProbe,
  createBranchLocalGateCli,
  currentGateCliLaunch,
  removeBranchLocalGateCli,
  readGateRouteReceipt,
  runProcess: runChildProcess,
  parseReviewGateVerdict,
  appendProjectLog,
  processEnv: process.env,
  writeGateRunMarker,
  removeGateRunMarker,
  writeGateProjectLogReceipt,
  sleep: async (ms) => {
    await new Promise((settle) => setTimeout(settle, ms));
  },
  writeDiagnostic: (message) => process.stderr.write(message),
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
const REVIEW_GATE_CONTEXT_NOTE = [
  'This review is gate-originated. If you run `oat-project-review-provide`, set `oat_review_invocation: gate` in the review artifact. Write a canonical review artifact with `### Critical`, `### Important`, `### Medium`, and `### Minor` headings in that order, using `None` for empty sections.',
  'Complete the review, artifact write, and required bookkeeping inline or through a synchronously awaited child before this headless process exits. Do not start background tasks, monitors, or waiters that outlive this turn.',
  "Artifact hygiene contract: Before finishing or committing, format every file you created or edited. Use the concrete write/fix formatting command supplied by the governing plan, task, or brief. If none is usable, discover the repository's documented write/fix command from applicable `AGENTS.md`/`CLAUDE.md` instructions and relevant package manifests; do not infer or hardcode a formatter. Prefer a file-scoped invocation when supported, and avoid rewriting unrelated files. If no command is discoverable, warn once with `no format command discovered in repo instructions; skipping`, then continue.",
].join('\n\n');
const GATE_CHECK_TIMEOUT_MS = 5_000;
const GATE_EXEC_TIMEOUT_MS = 15 * 60 * 1_000;
const GATE_LIVENESS_INTERVAL_MS = 30_000;
const AMBIENT_ACTIVITY_ATTRIBUTION = 'not attributable to this gate child';

async function writeGateRunMarker(
  path: string,
  marker: GateRunMarker,
  warn: (message: string) => void,
): Promise<boolean> {
  try {
    await mkdir(join(tmpdir(), 'oat-gate-runs'), { recursive: true });
    await writeFile(path, `${JSON.stringify(marker, null, 2)}\n`, 'utf8');
    return true;
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    warn(`Unable to write gate run marker ${path}: ${detail}`);
    return false;
  }
}

/**
 * Writes a gate partial-finalization receipt.
 *
 * Injected like `writeGateRunMarker`, but deliberately not stored beside it:
 * the run marker lives in `tmpdir()` because it dies with the run, while a
 * receipt has to survive into the later process that finishes the
 * finalization, so it lives under the project it belongs to.
 */
async function writeGateProjectLogReceipt(
  path: string,
  receipt: GateProjectLogReceipt,
  warn: (message: string) => void,
): Promise<boolean> {
  try {
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    warn(`Unable to write gate project log receipt ${path}: ${detail}`);
    return false;
  }
  warnWhenReceiptIsTracked(path, warn);
  return true;
}

/**
 * Warns when the receipt just written is not ignored by git.
 *
 * "Untracked" is a property of the repository's ignore rules, not of this
 * module: a repository that relocates `projects.root`, or drops the shipped
 * repository-wide gate-receipts ignore rule, gets a receipt that the next
 * `git add -A` would commit — the exact dirty worktree finalization exists to
 * prevent. The
 * receipt is still written, because losing the finalization would be worse
 * than a tracked file; the operator is told instead. A repository this path
 * cannot interrogate stays silent rather than warning speculatively.
 */
function warnWhenReceiptIsTracked(
  path: string,
  warn: (message: string) => void,
): void {
  try {
    execFileSync('git', ['check-ignore', '--quiet', '--', path], {
      cwd: dirname(path),
      stdio: ['ignore', 'ignore', 'ignore'],
    });
  } catch (error) {
    // Exit 1 means "not ignored"; anything else (not a repository, git
    // missing) is not evidence either way.
    const status =
      error && typeof error === 'object' && 'status' in error
        ? (error as { status?: number }).status
        : undefined;
    if (status !== 1) {
      return;
    }
    warn(
      `Gate project log receipt ${path} is not ignored by git. Add a gate-receipts ignore rule for this projects root, or the receipt will be committed by the next repository-wide add.`,
    );
  }
}

async function removeGateRunMarker(
  path: string,
  warn: (message: string) => void,
): Promise<void> {
  try {
    await rm(path);
  } catch (error) {
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === 'ENOENT'
    ) {
      return;
    }
    const detail = error instanceof Error ? error.message : String(error);
    warn(`Unable to remove gate run marker ${path}: ${detail}`);
  }
}

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

function buildGateDispatchReport(
  invocation: GateInvocationMetadata,
  scope: string,
): DispatchReportV1 {
  const report = buildDispatchReport({
    scope,
    action: 'review',
    role: 'reviewer',
    resolution: {
      status: 'resolved',
      provider: invocation.runtime,
      value: null,
      policyMode: null,
      policy: null,
      source: null,
      providers: {
        [invocation.runtime]: {
          dispatchArgs: null,
          selection: {
            role: 'reviewer',
            requestedCandidate: null,
            candidateTier: null,
            candidateIndex: null,
            ceilingTier: null,
            ceilingTarget: null,
            selectedValue: null,
            selectionMode: 'gate-invocation',
            selectionBranch: 'gate-configured-invocation',
            target: null,
            cellSource: null,
          },
        },
      },
    },
    requestedControls: {
      model: {
        value: null,
        mechanism: 'base-role',
        reason:
          'Configured gate invocation is reported separately from runtime identity.',
      },
      effort: {
        value: null,
        mechanism: 'base-role',
        reason:
          'Configured gate invocation is reported separately from runtime identity.',
      },
    },
    configuredDefaults: {
      model: null,
      modelSource: null,
      effort: null,
      effortSource: null,
    },
    gateInvocation: invocation,
  });

  return {
    ...report,
    route: { ...report.route, target: invocation.targetId },
  };
}

function gateInvocationPromptContext(
  invocation: GateInvocationMetadata,
): string {
  const frontmatter = YAML.stringify({
    oat_gate_headless: true,
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

function parseGateTimeoutFlag(value: string, flag: string): number {
  const parsed = Number(value);
  if (!isValidGateTimeoutMs(parsed)) {
    throw new Error(
      `${flag} must be an integer between ${MIN_GATE_TIMEOUT_MS} and ${MAX_GATE_TIMEOUT_MS}.`,
    );
  }
  return parsed;
}

function resolveGateExecTimeout(input: {
  cliTimeoutMs?: string;
  target: ExecTarget;
  effective: ResolvedConfig;
  reviewType?: string;
  reviewScope?: string;
  env: NodeJS.ProcessEnv;
  warn: (message: string) => void;
  rawPersisted?: RawGateTimeoutLayers;
}): GateTimeoutResolution {
  if (input.cliTimeoutMs !== undefined) {
    return {
      timeoutMs: parseGateTimeoutFlag(input.cliTimeoutMs, '--timeout-ms'),
      source: 'cli',
    };
  }

  const warned = new Set<string>();
  const warnOnce = (key: string, message: string): void => {
    if (!warned.has(key)) {
      warned.add(key);
      input.warn(message);
    }
  };

  for (const persisted of input.rawPersisted?.target ?? []) {
    if (isValidGateTimeoutMs(persisted.value)) {
      return { timeoutMs: persisted.value, source: 'target' };
    }
    warnOnce(
      `target:${persisted.layer}`,
      `Ignoring invalid target.timeoutMs from ${persisted.layer} config; using the next timeout source.`,
    );
  }

  if (
    (input.rawPersisted?.target.length ?? 0) === 0 &&
    input.target.timeoutMs !== undefined
  ) {
    if (isValidGateTimeoutMs(input.target.timeoutMs)) {
      return { timeoutMs: input.target.timeoutMs, source: 'target' };
    }
    input.warn(
      'Ignoring invalid target.timeoutMs; using the next timeout source.',
    );
  }

  const reviewType = input.reviewType?.trim().toLowerCase();
  if (reviewType === 'code' || reviewType === 'artifact') {
    const key = `workflow.gateTimeouts.${reviewType}`;
    for (const persisted of input.rawPersisted?.workflow ?? []) {
      if (isValidGateTimeoutMs(persisted.value)) {
        return { timeoutMs: persisted.value, source: 'config' };
      }
      warnOnce(
        `${key}:${persisted.layer}`,
        `Ignoring invalid ${key} from ${persisted.layer} config; using the next timeout source.`,
      );
    }
    const entry = input.effective.resolved[key];
    if (
      (input.rawPersisted?.workflow.length ?? 0) === 0 &&
      entry?.value !== null &&
      entry?.value !== undefined
    ) {
      if (isValidGateTimeoutMs(entry.value)) {
        return { timeoutMs: entry.value, source: 'config' };
      }
      warnOnce(
        `${key}:${entry.source}`,
        `Ignoring invalid ${key} from ${entry.source}; using the next timeout source.`,
      );
    }
  }

  const envValue = input.env.OAT_GATE_EXEC_TIMEOUT_MS?.trim();
  if (envValue) {
    const parsed = Number(envValue);
    if (isValidGateTimeoutMs(parsed)) {
      return { timeoutMs: parsed, source: 'env' };
    }
    warnOnce(
      'env',
      'Ignoring invalid OAT_GATE_EXEC_TIMEOUT_MS; using the next timeout source.',
    );
  }

  const scope = input.reviewScope?.trim().toLowerCase() ?? '';
  if (reviewType === 'artifact') {
    return { timeoutMs: 900_000, source: 'scope-default' };
  }
  if (reviewType === 'code') {
    if (/^p\d+-t\d+$/.test(scope)) {
      return { timeoutMs: 900_000, source: 'scope-default' };
    }
    if (
      scope === 'final' ||
      /^p\d+$/.test(scope) ||
      /^p\d+-p\d+$/.test(scope)
    ) {
      return { timeoutMs: 1_800_000, source: 'scope-default' };
    }
  }

  return { timeoutMs: GATE_EXEC_TIMEOUT_MS, source: 'default' };
}

function rawRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

async function readRawConfig(path: string): Promise<Record<string, unknown>> {
  try {
    return rawRecord(parseJsonConfig(await readFile(path, 'utf8'), path)) ?? {};
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'ENOENT'
    ) {
      return {};
    }
    throw error;
  }
}

async function readRawGateTimeoutLayers(input: {
  repoRoot: string;
  userConfigDir: string;
  targetId: string;
  reviewType?: string;
}): Promise<RawGateTimeoutLayers> {
  const configs = await Promise.all([
    readRawConfig(join(input.repoRoot, '.oat', 'config.local.json')),
    readRawConfig(join(input.repoRoot, '.oat', 'config.json')),
    readRawConfig(join(input.userConfigDir, 'config.json')),
  ]);
  const layers = ['local', 'shared', 'user'] as const;
  const target: RawGateTimeoutConfig[] = [];
  const workflow: RawGateTimeoutConfig[] = [];
  const reviewType = input.reviewType?.trim().toLowerCase();

  for (const [index, config] of configs.entries()) {
    const layer = layers[index]!;
    const workflowConfig = rawRecord(config.workflow);
    const gates = rawRecord(workflowConfig?.gates);
    const execTargets = rawRecord(gates?.execTargets);
    const rawTarget = rawRecord(execTargets?.[input.targetId]);
    if (
      rawTarget &&
      Object.prototype.hasOwnProperty.call(rawTarget, 'timeoutMs')
    ) {
      target.push({ layer, value: rawTarget.timeoutMs });
    }

    const gateTimeouts = rawRecord(workflowConfig?.gateTimeouts);
    if (
      (reviewType === 'code' || reviewType === 'artifact') &&
      gateTimeouts &&
      Object.prototype.hasOwnProperty.call(gateTimeouts, reviewType)
    ) {
      workflow.push({ layer, value: gateTimeouts[reviewType] });
    }
  }

  return { target, workflow };
}

function resolveGateLivenessIntervalMs(env: NodeJS.ProcessEnv): number {
  const rawValue = env.OAT_GATE_LIVENESS_INTERVAL_MS?.trim();
  if (!rawValue) {
    return GATE_LIVENESS_INTERVAL_MS;
  }

  const parsed = Number(rawValue);
  if (!Number.isInteger(parsed) || parsed < 1) {
    return GATE_LIVENESS_INTERVAL_MS;
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
    ...(options.timeoutMs !== undefined
      ? { timeoutMs: parseGateTimeoutFlag(options.timeoutMs, '--timeout-ms') }
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
    // `targetId` comes from `oat gate target set <id>`. Without the own-key
    // guard, an id of `__proto__` reads `Object.prototype`, which is truthy,
    // so this takes the merge branch and silently omits the `priority: 0`
    // default the create branch applies.
    const existing = getOwnKey(gates.execTargets ?? {}, targetId);
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

function parseEnvironmentProducerIdentity(
  value: string | undefined,
): GateProducerIdentity {
  const trimmed = value?.trim();
  if (!trimmed) {
    return unknownProducerIdentity();
  }

  const separator = trimmed.lastIndexOf(':');
  const producer = separator > 0 ? trimmed.slice(0, separator).trim() : '';
  const provenance = separator > 0 ? trimmed.slice(separator + 1).trim() : '';
  if (!producer || provenance !== 'declared') {
    return unknownProducerIdentity();
  }

  return identityFromRecords(
    [{ value: producer, provenance: 'declared' }],
    'environment',
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

function aggregateIdentityFromStamp(
  stamp: ReturnType<typeof parseDispatchStamps>[number],
): GateProducerIdentity {
  const producerIdentity = identityFromStamp(stamp);
  if (
    producerIdentity.diversityClaimable &&
    producerIdentity.family !== 'unknown'
  ) {
    return producerIdentity;
  }

  return identityFromRecords(
    [{ value: stamp.target, provenance: 'inferred' }],
    'stamp',
  );
}

function aggregateIdentityFromStamps(
  stamps: ReturnType<typeof parseDispatchStamps>,
): GateProducerIdentity {
  if (stamps.length === 0) {
    return unknownProducerIdentity();
  }

  const identities = stamps.map(aggregateIdentityFromStamp);
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
  env: NodeJS.ProcessEnv;
  explicit?: string;
  repoRoot: string;
  projectPath: string;
  reviewScope?: string;
}): Promise<GateProducerIdentity> {
  if (options.explicit?.trim()) {
    return parseProducerIdentityOption(options.explicit);
  }

  const stamped = await readStampedProducerIdentity(options);
  if (stamped.diversityClaimable) {
    return stamped;
  }

  const environment = parseEnvironmentProducerIdentity(
    options.env.OAT_GATE_PRODUCER_IDENTITY,
  );
  return environment.diversityClaimable ? environment : stamped;
}

function reviewerChildProcessEnv(env: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const childEnv = { ...env };
  delete childEnv.OAT_GATE_PRODUCER_IDENTITY;
  return childEnv;
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
      stdin: 'ignore',
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
    // `--target <id>` is a free-form user string. Without the own-key read an
    // id of `__proto__` or `constructor` returns a truthy inherited member and
    // slips past the unknown-target rejection below.
    const target = getOwnKey(targets, explicitTarget);
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
  timeout: GateTimeoutResolution,
): Promise<ProcessRunResult> {
  const [command, baseArgs] = argvHead(selected.target.baseCommand);
  if (!command) {
    throw new Error(`Exec target "${selected.id}" has an empty base command.`);
  }

  const modelArgs =
    selected.model && !findPinnedModelArg(selected.target.baseCommand)
      ? ['--model', selected.model]
      : [];
  const livenessIntervalMs = resolveGateLivenessIntervalMs(
    dependencies.processEnv,
  );
  const activityProbe = await dependencies.createGateActivityProbe({
    runtime: selected.target.runtime,
    cwd: context.cwd,
    home: context.home,
    spawnedAt: Date.now(),
  });

  if (context.json) {
    dependencies.writeDiagnostic(
      `${JSON.stringify({
        type: 'gate-start',
        target: selected.id,
        runtime: selected.target.runtime,
        timeoutMs: timeout.timeoutMs,
        timeoutSource: timeout.source,
      })}\n`,
    );
  } else {
    context.logger.info(
      `Running gate target ${selected.id} (${selected.target.runtime}); timeout=${timeout.timeoutMs}ms (source=${timeout.source}).`,
    );
  }

  try {
    return await dependencies.runProcess(
      command,
      [...baseArgs, ...modelArgs, ...prompt],
      {
        cwd: context.cwd,
        env: dependencies.processEnv,
        ...(activityProbe ? { activityProbe } : {}),
        livenessIntervalMs,
        onLiveness: ({
          elapsedMs,
          hardBudgetMs,
          idleMs,
          processAlive,
          activityProbeStatus,
          lastActivityEvidence,
        }) => {
          const telemetry = {
            elapsedMs,
            hardBudgetMs,
            idleMs,
            processAlive,
            ...(activityProbeStatus ? { activityProbeStatus } : {}),
            ...(lastActivityEvidence ? { lastActivityEvidence } : {}),
            target: selected.id,
            type: 'gate-liveness',
          };
          if (context.json) {
            dependencies.writeDiagnostic(`${JSON.stringify(telemetry)}\n`);
          } else {
            const activityDescription = lastActivityEvidence
              ? lastActivityEvidence.scope === 'ambient-runtime'
                ? `ambient runtime activity (${AMBIENT_ACTIVITY_ATTRIBUTION})`
                : 'project-directory activity'
              : `${activityProbeStatus?.status ?? 'unavailable'} (${activityProbeStatus?.attemptedPath ?? 'no path'})`;
            context.logger.info(
              `Gate liveness: target=${selected.id} elapsed_ms=${elapsedMs} idle_ms=${idleMs} hard_budget_ms=${hardBudgetMs} process_alive=${processAlive} activity_evidence=${activityDescription}.`,
            );
          }
        },
        purpose: 'execute',
        stdin: 'ignore',
        stdio: 'pipe',
        stdoutDestination: context.json ? 'stderr' : 'stdout',
        timeoutMs: timeout.timeoutMs,
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
  let realProjectPath: string;
  let canonicalPath: string;
  try {
    const validated = await validateRealPathWithinScope(absolutePath, repoRoot);
    realProjectPath = validated.realPath;
    canonicalPath = normalizeRepoRelativeProjectPath(
      validated.realScopeRoot,
      validated.realPath,
    );
  } catch {
    throw new Error(
      `${source} project "${projectPath}" must resolve inside the current repository through a readable real path.`,
    );
  }
  if (
    !(await dirExists(realProjectPath)) ||
    !(await fileExists(join(realProjectPath, 'state.md')))
  ) {
    throw new Error(
      `${source} project "${projectPath}" does not resolve to a project directory containing state.md.`,
    );
  }

  return canonicalPath;
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
  /** Command named in resolution errors, so guidance matches the caller. */
  commandLabel?: string;
}): Promise<ResolvedReviewProject> {
  const projectsRoot = resolvedProjectsRoot(options.effective);
  const commandLabel = options.commandLabel ?? 'gate review';

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
      `No OAT project could be resolved for ${commandLabel}. Set an active project or pass --project <path-or-name>.`,
    );
  }
  if (candidates.length > 1) {
    throw new Error(
      `Multiple OAT projects could be resolved for ${commandLabel}: ${candidates.join(', ')}. Pass --project <path-or-name>.`,
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
    dispatchReport: DispatchReportV1;
    corroboration: GateInvocationCorroboration;
    lateCompletion?: true;
    postSelectionRecovery?: true;
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
    timeoutSource?: GateTimeoutSource;
    noOutputProduced?: boolean;
    refusal?: string;
    activityEvidence?: GateActivityEvidence;
    gateInvocation: GateInvocationMetadata;
    dispatchReport: DispatchReportV1;
    corroboration?: GateInvocationCorroboration;
  },
): void {
  const message = payload.refusal
    ? `Review did not complete: reviewer refused the headless route (${payload.refusal}).`
    : payload.timedOut
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
      dispatchReport: payload.dispatchReport,
      ...(payload.corroboration
        ? { corroboration: payload.corroboration }
        : {}),
      exitCode: payload.exitCode,
      timedOut: payload.timedOut ?? false,
      ...(payload.timeoutMs !== undefined
        ? { timeoutMs: payload.timeoutMs }
        : {}),
      ...(payload.timeoutSource !== undefined
        ? { timeoutSource: payload.timeoutSource }
        : {}),
      ...(payload.noOutputProduced !== undefined
        ? { noOutputProduced: payload.noOutputProduced }
        : {}),
      ...(payload.refusal ? { refusal: payload.refusal } : {}),
      ...(payload.activityEvidence
        ? { activityEvidence: payload.activityEvidence }
        : {}),
      message,
    });
    return;
  }

  context.logger.error(message);
  if (payload.activityEvidence && !payload.refusal) {
    context.logger.error(
      formatGateActivityEvidenceDiagnostic(payload.activityEvidence),
    );
  }
}

function formatGateActivityEvidenceDiagnostic(
  evidence: GateActivityEvidence,
  now = Date.now(),
): string {
  const transcriptScope =
    evidence.scope === 'ambient-runtime'
      ? `${evidence.runtime} ambient transcript`
      : `${evidence.runtime} project transcript`;
  const baselineState = evidence.changedSinceBaseline
    ? 'changed since baseline'
    : 'did not change since baseline';
  const observedAgoMs = Math.max(0, now - evidence.observedAt);
  const lastChangeTiming =
    evidence.lastChangeAt === null
      ? 'latest transcript change time unavailable'
      : `latest transcript change was ${Math.max(
          0,
          evidence.observedAt - evidence.lastChangeAt,
        )}ms before observation`;
  const attributionWarning =
    evidence.scope === 'ambient-runtime'
      ? ` This activity is ${AMBIENT_ACTIVITY_ATTRIBUTION}.`
      : '';
  return `Activity evidence: ${transcriptScope} metadata ${baselineState}; observed ${observedAgoMs}ms ago; ${lastChangeTiming}.${attributionWarning}`;
}

/**
 * A stable, routable code for the post-selection failure: the thrown error's
 * own `code` when it has one, otherwise its constructor name.
 */
function postSelectionFailureCode(error: unknown): string {
  const code = (error as { code?: unknown } | null | undefined)?.code;
  if (typeof code === 'string' && code.trim().length > 0) {
    return code;
  }
  if (typeof code === 'number') {
    return String(code);
  }
  if (error instanceof Error) {
    return error.constructor.name;
  }
  return 'UnknownError';
}

function writeReviewGateUnexpectedFailure(
  context: CommandContext,
  payload: {
    project: string;
    projectResolutionSource: ReviewProjectResolutionSource;
    target: string;
    gateInvocation: GateInvocationMetadata;
    dispatchReport: DispatchReportV1;
    step: PostSelectionStep;
    ineligibility?: PostSelectionRecoveryCause;
    error: unknown;
  },
): void {
  const message =
    payload.error instanceof Error
      ? payload.error.message
      : String(payload.error);
  // When a committed artifact was found but did not survive re-validation, the
  // eligibility cause is the routable code; the thrown sub-step still names
  // what failed.
  const code = payload.ineligibility ?? postSelectionFailureCode(payload.error);
  if (context.json) {
    context.logger.json({
      status: 'review_failed',
      outcome: 'unexpected_post_selection_failure',
      runId: payload.gateInvocation.runId,
      target: payload.target,
      project: payload.project,
      projectResolutionSource: payload.projectResolutionSource,
      gateInvocation: payload.gateInvocation,
      dispatchReport: payload.dispatchReport,
      postSelection: { step: payload.step, code },
      message,
    });
    return;
  }

  context.logger.error(
    `Review failed after target selection for ${payload.target}: ${message} (post-selection step: ${payload.step})`,
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
    dispatchReport: DispatchReportV1;
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
      dispatchReport: payload.dispatchReport,
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

function writeReviewGateArtifactMissing(
  context: CommandContext,
  payload: {
    runId: string;
    target: string;
    project: string;
    projectResolutionSource: ReviewProjectResolutionSource;
    gateInvocation: GateInvocationMetadata;
    dispatchReport: DispatchReportV1;
  },
): void {
  const message = `Review target ${payload.target} completed without producing the required correlated review artifact.`;
  const recovery =
    'Fix the accepted headless target so it can write and finalize the review artifact before the process exits, then start a new gate run.';
  if (context.json) {
    context.logger.json({
      status: 'artifact_missing',
      outcome: 'review_completed_artifact_missing',
      runId: payload.runId,
      target: payload.target,
      project: payload.project,
      projectResolutionSource: payload.projectResolutionSource,
      artifactPath: null,
      generatedAt: null,
      gateInvocation: payload.gateInvocation,
      dispatchReport: payload.dispatchReport,
      receiveEligible: false,
      remediable: false,
      handoff: null,
      message,
      recovery,
    });
    return;
  }

  context.logger.error(message);
  context.logger.error(recovery);
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
    dispatchReport: DispatchReportV1;
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
      dispatchReport: payload.dispatchReport,
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

const GATE_PROJECT_LOG_PRODUCER = 'oat gate review';
const GATE_PROJECT_LOG_COMMIT_MESSAGE =
  'chore(oat): record gate review in project log';

/**
 * Commits `project-log.md` after this gate run appends to it.
 *
 * The retry, the index-lock classification, and the log mutation itself belong
 * to the `oat project log` module (DR-260718), so this is a thin gate-side
 * wrapper that supplies the gate's commit message and its injected sleep. The
 * recovery entry point calls the same implementation, so a finalization
 * completed later is the finalization the gate would have made.
 *
 * Never throws and never removes an index lock: git failures are reported to
 * the caller, which degrades to a diagnostic rather than altering the gate's
 * exit status.
 */
async function commitReviewGateProjectLog(
  repoRoot: string,
  logPath: string,
  identity: { key: string; body: string },
  sleep: (ms: number) => Promise<void>,
): Promise<ProjectLogCommitResult> {
  return commitProjectLog(
    {
      repoRoot,
      logPath,
      message: GATE_PROJECT_LOG_COMMIT_MESSAGE,
      identity,
    },
    { sleep },
  );
}

function resolveGateProjectPath(repoRoot: string, project: string): string {
  return isAbsolute(project) ? project : join(repoRoot, project);
}

function resolveWorktreeRoot(repoRoot: string): string {
  try {
    return execFileSync('git', ['rev-parse', '--show-toplevel'], {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  } catch {
    return repoRoot;
  }
}

/**
 * Quotes a value for the copy-pasteable recovery command. Anything outside the
 * safe set is single-quoted so a body full of spaces and `=` tokens survives a
 * shell round trip verbatim.
 */
function shellQuote(value: string): string {
  return /^[\w@%+=:,./-]+$/.test(value)
    ? value
    : `'${value.replaceAll("'", `'\\''`)}'`;
}

function composeGateProjectLogRecoveryCommand(input: {
  projectPath: string;
  producer: string;
  ref: string;
  body: string;
  runId: string;
}): string {
  return [
    'oat project log append',
    `--project ${shellQuote(input.projectPath)}`,
    '--structural',
    `--producer ${shellQuote(input.producer)}`,
    `--ref ${shellQuote(input.ref)}`,
    `--body ${shellQuote(input.body)}`,
    `--idempotency-key ${shellQuote(input.runId)}`,
    '--commit',
  ].join(' ');
}

/**
 * Warns once per pending gate project-log receipt at the start of a run.
 *
 * A receipt is `stale` only once the *committed* log carries its run id: the
 * append landed and was committed, so the recovery command will observe
 * `already-appended` and clear the receipt. Anything else is `pending`
 * finalization work.
 *
 * Reading the working tree instead is what made this wrong. A run whose commit
 * retries were exhausted leaves its entry in the working tree and nowhere else
 * — that is precisely the state the receipt exists to describe — so a
 * working-tree reader calls every unfinished finalization finished, and the
 * receipt that would have completed it is dismissed as leftovers.
 *
 * The staleness question is answered by the log module, so the gate never reads
 * `project-log.md` itself.
 */
async function warnPendingGateProjectLogReceipts(options: {
  context: CommandContext;
  dependencies: GateCommandDependencies;
  repoRoot: string;
  project: string;
}): Promise<void> {
  const projectDir = resolveGateProjectPath(options.repoRoot, options.project);
  const receiptsDir = join(projectDir, GATE_RECEIPTS_DIRNAME);
  // The staleness question is about the log of the project being gated. A
  // receipt that travelled with a copied project directory records the other
  // tree's absolute path, and reading that would make the verdict a statement
  // about a log this run does not own.
  const projectLogPath = join(projectDir, PROJECT_LOG_FILENAME);
  let entries: string[];
  try {
    entries = await readdir(receiptsDir);
  } catch {
    return;
  }

  for (const name of entries
    .filter((entry) => entry.endsWith('.json'))
    .sort()) {
    const receiptPath = join(receiptsDir, name);
    let receipt: GateProjectLogReceipt;
    try {
      receipt = JSON.parse(
        await readFile(receiptPath, 'utf8'),
      ) as GateProjectLogReceipt;
    } catch {
      continue;
    }
    const foreignLogPath =
      typeof receipt.logPath === 'string' &&
      resolve(receipt.logPath) !== resolve(projectLogPath)
        ? receipt.logPath
        : undefined;
    // A receipt that names another tree's log cannot be shown to be stale
    // here, so it stays pending and the disagreement is reported.
    //
    // `present` is required, not merely "not absent": a log the committed tree
    // cannot answer for leaves the work pending, because an unfinished
    // finalization that is reported as stale is one nobody will finish.
    const stale =
      foreignLogPath === undefined &&
      (await committedProjectLogIdentityState(
        options.repoRoot,
        projectLogPath,
        receipt.runId,
        receipt.body,
      )) === 'present';
    const state = stale ? 'stale' : 'pending';
    if (options.context.json) {
      options.dependencies.writeDiagnostic(
        `${JSON.stringify({
          type: 'gate-project-log-receipt-pending',
          state,
          project: options.project,
          receiptPath,
          logPath: projectLogPath,
          ...(foreignLogPath !== undefined
            ? { recordedLogPath: foreignLogPath }
            : {}),
          runId: receipt.runId,
          recovery: receipt.recovery?.command,
        })}\n`,
      );
      continue;
    }
    options.context.logger.warn(
      `Warning: a ${state} gate project log receipt exists at ${receiptPath}${
        foreignLogPath !== undefined
          ? ` (it records another tree's log at ${foreignLogPath})`
          : ''
      }. Complete it with: ${receipt.recovery?.command ?? 'oat project log append --commit'}`,
    );
  }
}

/**
 * Emits the durable partial-finalization receipt and its diagnostic.
 *
 * Reached only when the retry budget is exhausted against an index lock: the
 * entry is in the log but not in a commit, so a later process must finish the
 * job. The receipt carries the exact recovery command, and the diagnostic
 * prints it verbatim so an operator or orchestrator can run it without
 * reconstructing any of the gate's state.
 */
async function emitGateProjectLogPartialFinalization(options: {
  context: CommandContext;
  dependencies: GateCommandDependencies;
  finalization: ReviewGateProjectLogFinalization;
  appendStatus: 'appended' | 'already-appended';
  logPath: string;
  body: string;
  commit: ProjectLogCommitResult;
}): Promise<void> {
  const { commit, context, dependencies, finalization } = options;
  const projectPath = resolveGateProjectPath(
    finalization.repoRoot,
    finalization.project,
  );
  const receiptPath = join(
    projectPath,
    GATE_RECEIPTS_DIRNAME,
    `${finalization.runId}.json`,
  );
  const command = composeGateProjectLogRecoveryCommand({
    projectPath,
    producer: GATE_PROJECT_LOG_PRODUCER,
    ref: finalization.ref,
    body: options.body,
    runId: finalization.runId,
  });
  const receipt: GateProjectLogReceipt = {
    runId: finalization.runId,
    project: finalization.project,
    projectPath,
    worktreeRoot: resolveWorktreeRoot(finalization.repoRoot),
    logPath: options.logPath,
    artifactPath: finalization.artifactPath ?? null,
    artifactSignature: finalization.artifactSignature ?? null,
    appendStatus: options.appendStatus,
    commitStatus: commit.outcome,
    lockClass: commit.lockClass ?? null,
    attempts: commit.attempts,
    producer: GATE_PROJECT_LOG_PRODUCER,
    ref: finalization.ref,
    body: options.body,
    recovery: { command },
  };

  const written = await dependencies.writeGateProjectLogReceipt(
    receiptPath,
    receipt,
    // `logger.warn` is suppressed in JSON mode, and a receipt warning is
    // exactly what automation needs to see, so route it the same way the
    // finalization diagnostics go.
    (message) => {
      if (context.json) {
        dependencies.writeDiagnostic(
          `${JSON.stringify({
            type: 'gate-project-log-receipt-warning',
            project: finalization.project,
            receiptPath,
            message,
          })}\n`,
        );
        return;
      }
      context.logger.warn(message);
    },
  );
  if (!written) {
    return;
  }

  if (context.json) {
    dependencies.writeDiagnostic(
      `${JSON.stringify({
        type: 'gate-project-log-partial-finalization',
        project: finalization.project,
        receiptPath,
        logPath: options.logPath,
        lockClass: receipt.lockClass,
        attempts: receipt.attempts,
        recovery: command,
      })}\n`,
    );
    return;
  }
  context.logger.warn(
    `Warning: the oat gate review project log entry is appended but not committed (${
      receipt.commitStatus === 'entry-missing-after-commit'
        ? 'the committed log does not carry this run'
        : receipt.commitStatus === 'commit-unverified'
          ? 'the committed log could not be read back'
          : (receipt.lockClass ?? 'unknown')
    } after ${receipt.attempts} attempts). Receipt: ${receiptPath}. Complete it with: ${command}`,
  );
}

async function finalizeReviewGateProjectLog(
  context: CommandContext,
  dependencies: GateCommandDependencies,
  finalization: ReviewGateProjectLogFinalization,
): Promise<void> {
  const findings = finalization.counts
    ? ` findings=critical:${finalization.counts.critical},important:${finalization.counts.important},medium:${finalization.counts.medium},minor:${finalization.counts.minor}`
    : '';
  const artifact = finalization.artifactPath
    ? ` artifact=${finalization.artifactPath}`
    : '';
  // The run id is the finalization's stable event identity: it makes the entry
  // recognizable to a retry or to a later recovery, so neither ever appends a
  // second entry for the same run. It is an additive token on the one-line
  // structural body, which no consumer parses.
  const body = `target=${finalization.target} threshold=${finalization.threshold}${findings} exit=${finalization.exitCode} status=${finalization.status}${artifact} run=${finalization.runId}`;

  // Finalization runs after the JSON envelope is emitted, and `logger.warn` is
  // suppressed in JSON mode. Automation would otherwise get no signal that the
  // project log is still dirty, so route these through the diagnostic channel.
  const report = (
    type: 'gate-project-log-append-failed' | 'gate-project-log-commit-failed',
    reason: string,
    logPath?: string,
  ): void => {
    if (context.json) {
      dependencies.writeDiagnostic(
        `${JSON.stringify({
          type,
          reason,
          ...(logPath != null ? { logPath } : {}),
          project: finalization.project,
        })}\n`,
      );
      return;
    }
    const subject =
      type === 'gate-project-log-append-failed'
        ? 'append oat gate review result to the project log'
        : 'commit the oat gate review project log entry';
    context.logger.warn(
      `Warning: unable to ${subject}: ${reason}. Gate result is unchanged.`,
    );
  };

  try {
    const result = await dependencies.appendProjectLog({
      repoRoot: finalization.repoRoot,
      home: finalization.home,
      project: finalization.project,
      structural: true,
      producer: GATE_PROJECT_LOG_PRODUCER,
      ref: finalization.ref,
      body,
      idempotencyKey: finalization.runId,
    });

    if (result.status === 'skipped') {
      return;
    }

    // `already-appended` is success: this run's entry is in the log, so the
    // only work left is the commit.
    const commit = await commitReviewGateProjectLog(
      finalization.repoRoot,
      result.logPath,
      { key: finalization.runId, body },
      dependencies.sleep,
    );
    if (commit.error != null) {
      report('gate-project-log-commit-failed', commit.error, result.logPath);
    }
    // Both dispositions leave the run's entry uncommitted, and both are
    // finished by the same idempotent recovery command: the lock case never
    // reached a commit, and the missing-entry case reached one that did not
    // carry this run. Either way the durable receipt is what carries the work
    // into the later process that completes it.
    if (
      commit.outcome === 'blocked-by-index-lock' ||
      commit.outcome === 'entry-missing-after-commit' ||
      commit.outcome === 'commit-unverified'
    ) {
      await emitGateProjectLogPartialFinalization({
        context,
        dependencies,
        finalization,
        appendStatus: result.status,
        logPath: result.logPath,
        body,
        commit,
      });
    }
  } catch (error) {
    report(
      'gate-project-log-append-failed',
      error instanceof Error ? error.message : String(error),
    );
  }
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

type GateResolution =
  | 'configured'
  | 'configured_disabled_by_project'
  | 'not_configured';

interface ProjectGateOverrideEvidence {
  value: typeof SKILL_GATE_OVERRIDE_DISABLED;
  source: string;
}

interface ProjectAwareGateResolution {
  skill: string;
  resolution: GateResolution;
  configuredGate: GateConfig | null;
  effectiveGate: GateConfig | null;
  configSource: GateConfigSource | null;
  projectOverride: ProjectGateOverrideEvidence | null;
}

/**
 * Read the project's declared gate overrides.
 *
 * Fails closed rather than defaulting to "no overrides": unreadable project
 * state would otherwise silently launch a gate the operator disabled. CRLF
 * checkouts are normalized first so a line-ending difference is not mistaken
 * for missing frontmatter.
 */
async function readProjectGateOverrides(
  repoRoot: string,
  projectPath: string,
): Promise<Record<string, typeof SKILL_GATE_OVERRIDE_DISABLED>> {
  const statePath = normalizeToPosixPath(join(projectPath, 'state.md'));
  const content = await readFile(join(repoRoot, statePath), 'utf8');
  const frontmatter = getFrontmatterBlock(content.replace(/\r\n/g, '\n'));
  if (frontmatter === null) {
    throw new Error(
      `${statePath}: project state has no readable YAML frontmatter block, so gate overrides cannot be resolved. Repair the state file before resolving a project-aware gate.`,
    );
  }

  return parseSkillGateOverrides(frontmatter, statePath).overrides;
}

/**
 * Project-aware resolution. `configuredGate` is retained even when an override
 * makes the effective gate null, so project-disabled evidence can never be
 * mistaken for absent configuration.
 */
async function resolveProjectAwareGate(options: {
  skillName: string;
  projectValue: string | boolean;
  repoRoot: string;
  effective: ResolvedConfig;
}): Promise<ProjectAwareGateResolution> {
  const project = await resolveReviewProject({
    repoRoot: options.repoRoot,
    effective: options.effective,
    // Same active/name/path contract as `oat gate review`; only the guidance
    // wording follows the caller, so a `gate resolve` failure does not tell the
    // operator to fix a review command they never ran.
    commandLabel: 'gate resolve',
    // A bare `--project` defers to the same active/single-candidate rules
    // `oat gate review` uses when it is given no explicit project.
    ...(typeof options.projectValue === 'string'
      ? { project: options.projectValue }
      : {}),
  });
  const overrides = await readProjectGateOverrides(
    options.repoRoot,
    project.path,
  );
  const projectOverride: ProjectGateOverrideEvidence | null =
    overrides[options.skillName] === SKILL_GATE_OVERRIDE_DISABLED
      ? {
          value: SKILL_GATE_OVERRIDE_DISABLED,
          source: SKILL_GATE_OVERRIDE_SOURCE,
        }
      : null;

  const { gate, source } = resolveGateWithSource(
    options.effective,
    options.skillName,
  );

  // An override never fabricates configuration: with no configured gate the
  // resolution stays `not_configured` while the override remains visible.
  // `configSource` still reports the layer that owned the decision when one
  // explicitly declared the skill `null`, so an operator can tell a deliberate
  // layer-level disable from a skill no layer mentions at all. It stays null in
  // the latter case, and `configuredGate` is null either way.
  if (!gate) {
    return {
      skill: options.skillName,
      resolution: 'not_configured',
      configuredGate: null,
      effectiveGate: null,
      configSource: source,
      projectOverride,
    };
  }

  if (projectOverride) {
    return {
      skill: options.skillName,
      resolution: 'configured_disabled_by_project',
      configuredGate: gate,
      effectiveGate: null,
      configSource: source,
      projectOverride,
    };
  }

  return {
    skill: options.skillName,
    resolution: 'configured',
    configuredGate: gate,
    effectiveGate: gate,
    configSource: source,
    projectOverride: null,
  };
}

async function runResolve(
  skillName: string,
  options: ResolveGateOptions,
  context: CommandContext,
  dependencies: GateCommandDependencies,
): Promise<void> {
  try {
    const effective = await readEffectiveConfig(context, dependencies);

    // Without project context this stays byte-identical to the legacy raw
    // `GateConfig | null` output that external consumers already parse.
    if (options.project === undefined) {
      writeJsonValue(context, resolveGate(effective, skillName));
      process.exitCode = 0;
      return;
    }

    const repoRoot = await dependencies.resolveProjectRoot(context.cwd);
    writeJsonValue(
      context,
      await resolveProjectAwareGate({
        skillName,
        projectValue: options.project,
        repoRoot,
        effective,
      }),
    );
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
    if (gate) {
      const validation = validateConfiguredGateCommand(gate.command);
      if (validation.kind === 'invalid') {
        throw new Error(validation.message);
      }
    }
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
    const repoRoot = await dependencies.resolveProjectRoot(context.cwd);
    const rawPersisted = await readRawGateTimeoutLayers({
      repoRoot,
      userConfigDir: join(context.home, '.oat'),
      targetId: selected.id,
    });
    const timeout = resolveGateExecTimeout({
      cliTimeoutMs: options.timeoutMs,
      target: selected.target,
      effective,
      env: dependencies.processEnv,
      warn: context.logger.warn,
      rawPersisted,
    });
    const result = await executeTarget(
      selected,
      prompt,
      context,
      dependencies,
      timeout,
    );
    process.exitCode = result.exitCode;
  } catch (error) {
    writeError(context, error);
  }
}

/**
 * The immutable bytes and identity of the run-correlated artifact that was
 * selected for this gate run. Recovery re-validates this snapshot, never the
 * current contents of `path`.
 */
interface ReviewGateArtifactSnapshot {
  path: string;
  generatedAt: string | null;
  generatedTime: number;
  containingProject: string;
  content: string;
  signature: string;
}

/** Run identity the eligibility checks and their envelopes need. */
interface ReviewArtifactDispositionIdentity {
  runId: string;
  repoRoot: string;
  target: string;
  project: string;
  projectResolutionSource: ReviewProjectResolutionSource;
  gateInvocation: GateInvocationMetadata;
  dispatchReport: DispatchReportV1;
  targetCorroboration: GateTargetCorroboration;
  threshold: ReviewGateThreshold;
}

/** Why a selected artifact is not receive-eligible. */
type ReviewArtifactIneligibilityCause =
  | 'artifact_outside_review_project'
  | 'declared_project_identity_missing'
  | 'declared_project_identity_mismatched'
  | 'artifact_generated_at_invalid'
  | 'artifact_verdict_unparsable'
  | 'gate_invocation_metadata_missing'
  | 'gate_invocation_metadata_mismatched'
  | 'gate_invocation_marker_missing';

/**
 * What `postSelection.code` reports when a committed artifact was found: either
 * why it was ineligible, or that the recovery re-validation itself failed.
 */
type PostSelectionRecoveryCause =
  | ReviewArtifactIneligibilityCause
  | 'recovery_revalidation_failed';

/**
 * Collects the result envelope before any of it reaches the real logger.
 *
 * `writeReviewGateResult` makes several human-mode calls, so a failure partway
 * through would otherwise leave a half-printed success followed by the
 * `review_failed` line. Buffering keeps the recovery emission all-or-nothing.
 */
function createBufferedResultContext(context: CommandContext): {
  context: CommandContext;
  flush: () => void;
} {
  const pending: (() => void)[] = [];
  return {
    context: {
      ...context,
      logger: {
        ...context.logger,
        debug: (message: string) => {
          pending.push(() => context.logger.debug(message));
        },
        info: (message: string) => {
          pending.push(() => context.logger.info(message));
        },
        warn: (message: string) => {
          pending.push(() => context.logger.warn(message));
        },
        error: (message: string) => {
          pending.push(() => context.logger.error(message));
        },
        success: (message: string) => {
          pending.push(() => context.logger.success(message));
        },
        json: (payload: unknown) => {
          pending.push(() => context.logger.json(payload));
        },
      },
    },
    flush: () => {
      for (const emit of pending) {
        emit();
      }
      pending.length = 0;
    },
  };
}

type ReviewArtifactDisposition =
  | {
      eligible: true;
      verdict: ReviewGateVerdict;
      blocking: boolean;
      corroboration: GateInvocationCorroboration;
      generatedAt: string;
    }
  | {
      eligible: false;
      cause: ReviewArtifactIneligibilityCause;
      status: 'targeting_correlation_failed' | 'artifact_validation_failed';
      verdict?: ReviewGateVerdict;
      writeEnvelope: (context: CommandContext) => void;
    };

interface ReviewArtifactDispositionHooks {
  onStep?: (step: PostSelectionStep) => void;
  onVerdict?: (verdict: ReviewGateVerdict) => void;
}

/**
 * The single eligibility pipeline for a selected review artifact: project
 * containment, timestamp validity, verdict parsing from the immutable
 * snapshot, gate-invocation corroboration, the gate invocation marker, and the
 * blocking threshold.
 *
 * Both the normal path and post-selection recovery call this function so that
 * a recovered artifact can never skip a check the normal path applies. It
 * never re-reads `snapshot.path`, never re-dispatches a reviewer, and never
 * writes an envelope itself: an ineligible artifact returns the exact existing
 * failure writer for its caller to invoke.
 */
async function disposeValidatedReviewArtifact(
  snapshot: ReviewGateArtifactSnapshot,
  identity: ReviewArtifactDispositionIdentity,
  dependencies: GateCommandDependencies,
  hooks: ReviewArtifactDispositionHooks = {},
): Promise<ReviewArtifactDisposition> {
  hooks.onStep?.('artifact-validation');
  const outsideReviewProject = snapshot.containingProject !== identity.project;
  if (
    outsideReviewProject ||
    (identity.projectResolutionSource === 'declared' &&
      identity.targetCorroboration.project !== 'matched')
  ) {
    const message = outsideReviewProject
      ? 'Review artifact was written outside the resolved review project.'
      : identity.targetCorroboration.project === 'missing'
        ? 'Review artifact is missing oat_project for the explicitly declared project.'
        : 'Review artifact project identity does not match the explicitly declared project.';
    return {
      eligible: false,
      status: 'targeting_correlation_failed',
      cause: outsideReviewProject
        ? 'artifact_outside_review_project'
        : identity.targetCorroboration.project === 'missing'
          ? 'declared_project_identity_missing'
          : 'declared_project_identity_mismatched',
      writeEnvelope: (context) => {
        writeReviewGateTargetingFailure(context, {
          runId: identity.runId,
          target: identity.target,
          project: identity.project,
          projectResolutionSource: identity.projectResolutionSource,
          artifactPath: snapshot.path,
          generatedAt: snapshot.generatedAt,
          message,
          gateInvocation: identity.gateInvocation,
          dispatchReport: identity.dispatchReport,
          corroboration: identity.targetCorroboration,
        });
      },
    };
  }

  const generatedAt = snapshot.generatedAt;
  if (!generatedAt || !Number.isFinite(snapshot.generatedTime)) {
    return {
      eligible: false,
      status: 'artifact_validation_failed',
      cause: 'artifact_generated_at_invalid',
      writeEnvelope: (context) => {
        writeReviewGateArtifactValidationFailure(context, {
          runId: identity.runId,
          target: identity.target,
          project: identity.project,
          projectResolutionSource: identity.projectResolutionSource,
          artifactPath: snapshot.path,
          generatedAt: snapshot.generatedAt,
          message:
            'Review artifact oat_generated_at is missing or is not a valid timestamp.',
          recovery: `Set oat_generated_at to a valid timestamp in ${snapshot.path}, then rerun the gate. Invoke oat-project-review-receive only after the gate returns a receive-eligible result.`,
          gateInvocation: identity.gateInvocation,
          dispatchReport: identity.dispatchReport,
          corroboration: corroborateGateInvocation(
            identity.gateInvocation,
            undefined,
            identity.targetCorroboration,
          ),
        });
      },
    };
  }

  hooks.onStep?.('verdict-parse');
  let verdict: ReviewGateVerdict;
  try {
    verdict = await dependencies.parseReviewGateVerdict(
      join(identity.repoRoot, snapshot.path),
      {
        normalizeMissingEmptySeveritySections: true,
        artifactSnapshot: {
          content: snapshot.content,
          signature: snapshot.signature,
        },
      },
    );
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return {
      eligible: false,
      status: 'artifact_validation_failed',
      cause: 'artifact_verdict_unparsable',
      writeEnvelope: (context) => {
        writeReviewGateArtifactValidationFailure(context, {
          runId: identity.runId,
          target: identity.target,
          project: identity.project,
          projectResolutionSource: identity.projectResolutionSource,
          artifactPath: snapshot.path,
          generatedAt: snapshot.generatedAt,
          message: detail,
          recovery: `The review artifact was created at ${snapshot.path} but could not be consumed. Fix the artifact format, then rerun the gate to revalidate it. Invoke oat-project-review-receive only after the gate returns a receive-eligible result; if the only issue is a missing zero-count severity heading, rerun the gate to normalize the same artifact instead of creating a new review version.`,
          gateInvocation: identity.gateInvocation,
          dispatchReport: identity.dispatchReport,
          corroboration: corroborateGateInvocation(
            identity.gateInvocation,
            undefined,
            identity.targetCorroboration,
          ),
        });
      },
    };
  }
  hooks.onVerdict?.(verdict);

  hooks.onStep?.('invocation-corroboration');
  const corroboration = corroborateGateInvocation(
    identity.gateInvocation,
    verdict.gateInvocation,
    identity.targetCorroboration,
  );
  if (
    corroboration.run !== 'matched' ||
    corroboration.invocation !== 'matched'
  ) {
    const missing =
      corroboration.run === 'missing' || corroboration.invocation === 'missing';
    return {
      eligible: false,
      status: 'artifact_validation_failed',
      cause: missing
        ? 'gate_invocation_metadata_missing'
        : 'gate_invocation_metadata_mismatched',
      verdict,
      writeEnvelope: (context) => {
        writeReviewGateArtifactValidationFailure(context, {
          runId: identity.runId,
          target: identity.target,
          project: identity.project,
          projectResolutionSource: identity.projectResolutionSource,
          artifactPath: snapshot.path,
          generatedAt: snapshot.generatedAt,
          message: missing
            ? 'Review artifact invocation metadata is missing required gate-owned values.'
            : 'Review artifact invocation metadata does not match the gate-owned configured invocation.',
          recovery: `Copy the exact gate invocation fields from the review prompt into ${snapshot.path}, then run oat-project-review-receive only after the artifact validates.`,
          gateInvocation: identity.gateInvocation,
          dispatchReport: identity.dispatchReport,
          corroboration,
        });
      },
    };
  }

  if (verdict.invocation !== 'gate') {
    return {
      eligible: false,
      status: 'artifact_validation_failed',
      cause: 'gate_invocation_marker_missing',
      verdict,
      writeEnvelope: (context) => {
        writeReviewGateArtifactValidationFailure(context, {
          runId: identity.runId,
          target: identity.target,
          project: identity.project,
          projectResolutionSource: identity.projectResolutionSource,
          artifactPath: snapshot.path,
          generatedAt: snapshot.generatedAt,
          message:
            'Review artifact is missing the required gate invocation marker `oat_review_invocation: gate`.',
          recovery: `Set oat_review_invocation: gate in ${snapshot.path}, then run oat-project-review-receive only after the artifact validates.`,
          gateInvocation: identity.gateInvocation,
          dispatchReport: identity.dispatchReport,
          corroboration,
        });
      },
    };
  }

  hooks.onStep?.('verdict-disposition');
  return {
    eligible: true,
    verdict,
    blocking: reviewBlocksAtThreshold(verdict, identity.threshold),
    corroboration,
    generatedAt,
  };
}

async function runReviewGate(
  prompt: string[],
  options: ReviewGateOptions,
  context: CommandContext,
  dependencies: GateCommandDependencies,
): Promise<void> {
  const runId = randomUUID();
  let runMarkerPath: string | undefined;
  let runMarkerWritten = false;
  let branchLocalGateCli: BranchLocalGateCli | undefined;
  let projectLogFinalization: ReviewGateProjectLogFinalization | undefined;
  let projectLogFinalized = false;
  let postSelectionContext:
    | {
        project: string;
        projectResolutionSource: ReviewProjectResolutionSource;
        target: string;
        gateInvocation: GateInvocationMetadata;
        dispatchReport: DispatchReportV1;
        step: PostSelectionStep;
        artifact?: ReviewGateArtifactSnapshot;
        dispositionIdentity?: ReviewArtifactDispositionIdentity;
        diversity?: GateDiversityMetadata;
        lateCompletion?: true;
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
      env: dependencies.processEnv,
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
    const rawPersisted = await readRawGateTimeoutLayers({
      repoRoot,
      userConfigDir,
      targetId: selected.id,
      reviewType: options.reviewType,
    });
    const timeout = resolveGateExecTimeout({
      cliTimeoutMs: options.timeoutMs,
      target: selected.target,
      effective,
      reviewType: options.reviewType,
      reviewScope: options.reviewScope,
      env: dependencies.processEnv,
      warn: context.logger.warn,
      rawPersisted,
    });
    const dispatchReport = buildGateDispatchReport(
      gateInvocation,
      options.reviewScope?.trim() || 'gate-review',
    );
    postSelectionContext = {
      project: projectPath,
      projectResolutionSource: reviewProject.source,
      target: selected.id,
      gateInvocation,
      dispatchReport,
      step: 'target-dispatch',
    };
    const markPostSelectionStep = (step: PostSelectionStep): void => {
      if (postSelectionContext) {
        postSelectionContext.step = step;
      }
    };
    const threshold = parseReviewGateThreshold(options.exitNonzeroOn);
    projectLogFinalization = {
      repoRoot,
      home: context.home,
      project: projectPath,
      ref: options.reviewScope?.trim() || 'gate-review',
      target: selected.id,
      threshold,
      status: 'review_failed',
      exitCode: 1,
      runId,
    };
    await warnPendingGateProjectLogReceipts({
      context,
      dependencies,
      repoRoot,
      project: projectPath,
    });
    markPostSelectionStep('artifact-scan');
    const before = await listReviewGateArtifactCandidates({
      repoRoot,
      effective,
      reviewProject,
    });
    markPostSelectionStep('target-dispatch');
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
    runMarkerPath = join(tmpdir(), 'oat-gate-runs', `${runId}.json`);
    runMarkerWritten = await dependencies.writeGateRunMarker(
      runMarkerPath,
      {
        runId,
        targetId: selected.id,
        runtime: selected.target.runtime,
        reviewType: options.reviewType?.trim() || null,
        reviewScope: options.reviewScope?.trim() || null,
        project: projectPath,
        startedAt: new Date().toISOString(),
        budgetMs: timeout.timeoutMs,
        budgetSource: timeout.source,
      },
      (message) => context.logger.warn(message),
    );
    if (runMarkerWritten) {
      if (context.json) {
        dependencies.writeDiagnostic(
          `${JSON.stringify({
            type: 'gate-run-marker',
            runId,
            path: runMarkerPath,
          })}\n`,
        );
      } else {
        context.logger.info(`Gate run marker: ${runMarkerPath}.`);
      }
    }
    branchLocalGateCli = await dependencies.createBranchLocalGateCli({
      runId,
      launch: dependencies.currentGateCliLaunch(),
    });
    const childResult = await executeTarget(
      selected,
      [reviewPrompt],
      context,
      {
        ...dependencies,
        processEnv: {
          ...reviewerChildProcessEnv(dependencies.processEnv),
          OAT_GATE_HEADLESS: '1',
          OAT_NON_INTERACTIVE: '1',
          OAT_GATE_RUN_ID: runId,
          OAT_GATE_RUNTIME: gateInvocation.runtime,
          OAT_INVOCATION_MODEL: gateInvocation.model,
          OAT_GATE_CLI_PATH: branchLocalGateCli.cliPath,
          OAT_GATE_CLI_ROOT: branchLocalGateCli.cliRoot,
          OAT_GATE_ROUTE_RECEIPT_PATH: branchLocalGateCli.routeReceiptPath,
        },
      },
      timeout,
    );
    const routeReceipt = await dependencies.readGateRouteReceipt(
      branchLocalGateCli.routeReceiptPath,
      branchLocalGateCli.cliRoot,
      selected.target.runtime,
    );
    dependencies.writeDiagnostic(
      `${JSON.stringify({
        type: 'gate-route',
        target: selected.id,
        ...routeReceipt,
      })}\n`,
    );
    const childExitCode = childResult.exitCode;
    const refusal = childResult.refusal;
    const writeRefusalFailure = (): boolean => {
      if (!refusal) {
        return false;
      }
      if (projectLogFinalization) {
        projectLogFinalization.status = 'review_failed';
        projectLogFinalization.exitCode = 1;
      }
      writeReviewGateExecutionFailure(context, {
        runId,
        target: selected.id,
        project: projectPath,
        projectResolutionSource: reviewProject.source,
        exitCode: childExitCode,
        timedOut: childResult.timedOut ?? false,
        timeoutMs: timeout.timeoutMs,
        timeoutSource: timeout.source,
        refusal,
        ...(childResult.activityEvidence
          ? { activityEvidence: childResult.activityEvidence }
          : {}),
        gateInvocation,
        dispatchReport,
      });
      process.exitCode = 1;
      return true;
    };

    markPostSelectionStep('artifact-scan');
    const after = await listReviewGateArtifactCandidates({
      repoRoot,
      effective,
      reviewProject,
    });
    markPostSelectionStep('artifact-correlation');
    const artifactResolution = resolveRunCorrelatedReviewArtifact({
      runId,
      before,
      after,
    });
    if (projectLogFinalization) {
      const correlated =
        artifactResolution.artifact ?? artifactResolution.diagnosticArtifact;
      projectLogFinalization.artifactPath = correlated?.path;
      projectLogFinalization.artifactSignature = correlated?.signature;
    }
    if (!artifactResolution.artifact && writeRefusalFailure()) {
      return;
    }
    if (
      childExitCode !== 0 &&
      !childResult.timedOut &&
      !artifactResolution.artifact
    ) {
      if (projectLogFinalization) {
        projectLogFinalization.status = 'review_failed';
        projectLogFinalization.exitCode = childExitCode;
      }
      writeReviewGateExecutionFailure(context, {
        runId,
        target: selected.id,
        project: projectPath,
        projectResolutionSource: reviewProject.source,
        exitCode: childExitCode,
        timedOut: childResult.timedOut ?? false,
        timeoutMs: timeout.timeoutMs,
        timeoutSource: timeout.source,
        ...(childResult.activityEvidence
          ? { activityEvidence: childResult.activityEvidence }
          : {}),
        gateInvocation,
        dispatchReport,
      });
      process.exitCode = childExitCode;
      return;
    }
    if (
      childResult.timedOut &&
      artifactResolution.matchingArtifactPaths.length === 0 &&
      !artifactResolution.diagnosticArtifact
    ) {
      if (projectLogFinalization) {
        projectLogFinalization.status = 'review_failed';
        projectLogFinalization.exitCode = childExitCode;
      }
      writeReviewGateExecutionFailure(context, {
        runId,
        target: selected.id,
        project: projectPath,
        projectResolutionSource: reviewProject.source,
        exitCode: childExitCode,
        timedOut: true,
        timeoutMs: timeout.timeoutMs,
        timeoutSource: timeout.source,
        noOutputProduced:
          childResult.stdoutBytes + childResult.stderrBytes === 0,
        ...(childResult.activityEvidence
          ? { activityEvidence: childResult.activityEvidence }
          : {}),
        gateInvocation,
        dispatchReport,
      });
      process.exitCode = childExitCode;
      return;
    }
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
      if (
        !diagnosticArtifact &&
        artifactResolution.matchingArtifactPaths.length === 0
      ) {
        if (projectLogFinalization) {
          projectLogFinalization.status = 'artifact_missing';
          projectLogFinalization.exitCode = 1;
        }
        writeReviewGateArtifactMissing(context, {
          runId,
          target: selected.id,
          project: projectPath,
          projectResolutionSource: reviewProject.source,
          gateInvocation,
          dispatchReport,
        });
        process.exitCode = 1;
        return;
      }
      const message =
        artifactResolution.matchingArtifactPaths.length > 1
          ? `Multiple direct review artifacts carried gate run ID ${runId}.`
          : initialTargetCorroboration.run === 'mismatched'
            ? `The changed review artifact did not carry the expected gate run ID ${runId}.`
            : `No direct active project review artifact carried gate run ID ${runId}.`;
      if (projectLogFinalization) {
        projectLogFinalization.status = 'targeting_correlation_failed';
        projectLogFinalization.exitCode = 1;
      }
      writeReviewGateTargetingFailure(context, {
        runId,
        target: selected.id,
        project: projectPath,
        projectResolutionSource: reviewProject.source,
        artifactPath: diagnosticArtifact?.path ?? null,
        generatedAt: diagnosticArtifact?.generatedAt ?? null,
        message,
        gateInvocation,
        dispatchReport,
        corroboration: initialTargetCorroboration,
      });
      process.exitCode = 1;
      return;
    }

    const artifactSnapshot: ReviewGateArtifactSnapshot = {
      path: producedArtifact.path,
      generatedAt: producedArtifact.generatedAt,
      generatedTime: producedArtifact.generatedTime,
      containingProject: producedArtifact.containingProject,
      content: producedArtifact.content,
      signature: producedArtifact.signature,
    };
    const dispositionIdentity: ReviewArtifactDispositionIdentity = {
      runId,
      repoRoot,
      target: selected.id,
      project: projectPath,
      projectResolutionSource: reviewProject.source,
      gateInvocation,
      dispatchReport,
      targetCorroboration: initialTargetCorroboration,
      threshold,
    };
    if (postSelectionContext) {
      postSelectionContext.artifact = artifactSnapshot;
      postSelectionContext.dispositionIdentity = dispositionIdentity;
      postSelectionContext.diversity = selected.diversity;
      if (childResult.timedOut) {
        postSelectionContext.lateCompletion = true;
      }
    }

    const disposition = await disposeValidatedReviewArtifact(
      artifactSnapshot,
      dispositionIdentity,
      dependencies,
      {
        onStep: markPostSelectionStep,
        onVerdict: (parsed) => {
          if (projectLogFinalization) {
            projectLogFinalization.counts = parsed.counts;
          }
        },
      },
    );
    if (!disposition.eligible) {
      if (writeRefusalFailure()) {
        return;
      }
      if (projectLogFinalization) {
        projectLogFinalization.status = disposition.status;
        projectLogFinalization.exitCode = 1;
      }
      disposition.writeEnvelope(context);
      process.exitCode = 1;
      return;
    }
    const { verdict, blocking, corroboration, generatedAt } = disposition;
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
      generatedAt,
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
      dispatchReport,
      corroboration,
      ...(childResult.timedOut ? { lateCompletion: true } : {}),
    });
    // Record the disposition only once the envelope is written, so a failed
    // emission cannot leave the log claiming a result no caller received.
    if (projectLogFinalization) {
      projectLogFinalization.status = blocking ? 'blocked' : 'ok';
      projectLogFinalization.exitCode = blocking ? 1 : 0;
      projectLogFinalization.counts = verdict.counts;
      projectLogFinalization.artifactPath = producedArtifact.path;
      projectLogFinalization.artifactSignature = producedArtifact.signature;
    }
    process.exitCode = blocking ? 1 : 0;
  } catch (error) {
    if (postSelectionContext) {
      const snapshot = postSelectionContext.artifact;
      const identity = postSelectionContext.dispositionIdentity;
      let ineligibility: PostSelectionRecoveryCause | undefined;
      if (snapshot && identity) {
        // Recovery re-validates the already-committed snapshot through the same
        // eligibility function the normal path uses, rather than re-parsing
        // whatever the artifact path now holds, and never re-dispatches the
        // reviewer. The path is still read to assert the artifact is present
        // and unchanged, so a deleted or rewritten artifact fails closed.
        let disposition: ReviewArtifactDisposition | undefined;
        try {
          disposition = await disposeValidatedReviewArtifact(
            snapshot,
            identity,
            dependencies,
          );
        } catch (revalidationError) {
          // The recovery attempt itself failed. Report that distinctly instead
          // of letting the envelope blame the transient error that triggered
          // recovery, and leave a diagnostic behind for the same reason.
          disposition = undefined;
          ineligibility = 'recovery_revalidation_failed';
          try {
            dependencies.writeDiagnostic(
              `${JSON.stringify({
                type: 'gate-recovery-failed',
                runId: identity.runId,
                target: identity.target,
                project: identity.project,
                step: postSelectionContext.step,
                message:
                  revalidationError instanceof Error
                    ? revalidationError.message
                    : String(revalidationError),
              })}\n`,
            );
          } catch {
            // Diagnostics are best effort and must never mask the terminal
            // review_failed envelope written below.
          }
        }
        if (disposition?.eligible) {
          // Emission is the last thing that can fail. Build the human-mode
          // lines into a buffer first so a mid-construction failure cannot
          // half-print a recovered result and then print `review_failed` after
          // it, and keep the project-log status at its pre-recovery
          // `review_failed` value until the envelope is actually written.
          let recoveryEmitted = false;
          try {
            const recoveredHandoff = buildReviewGateHandoff({
              artifactPath: snapshot.path,
              verdict: disposition.verdict,
              threshold: identity.threshold,
              blocking: disposition.blocking,
            });
            const buffered = createBufferedResultContext(context);
            writeReviewGateResult(buffered.context, {
              status: disposition.blocking ? 'blocked' : 'ok',
              runId: identity.runId,
              target: identity.target,
              project: identity.project,
              projectResolutionSource: identity.projectResolutionSource,
              artifactPath: snapshot.path,
              generatedAt: disposition.generatedAt,
              threshold: identity.threshold,
              blocking: disposition.blocking,
              counts: disposition.verdict.counts,
              reviewType: disposition.verdict.reviewType,
              scope: disposition.verdict.scope,
              invocation: disposition.verdict.invocation,
              normalization: disposition.verdict.normalization,
              handoff: recoveredHandoff,
              diversity: postSelectionContext.diversity,
              gateInvocation: identity.gateInvocation,
              dispatchReport: identity.dispatchReport,
              corroboration: disposition.corroboration,
              ...(postSelectionContext.lateCompletion
                ? { lateCompletion: true }
                : {}),
              postSelectionRecovery: true,
            });
            buffered.flush();
            recoveryEmitted = true;
          } catch {
            recoveryEmitted = false;
          }
          if (recoveryEmitted) {
            if (projectLogFinalization) {
              projectLogFinalization.status = disposition.blocking
                ? 'blocked'
                : 'ok';
              projectLogFinalization.exitCode = disposition.blocking ? 1 : 0;
              projectLogFinalization.counts = disposition.verdict.counts;
              projectLogFinalization.artifactPath = snapshot.path;
              projectLogFinalization.artifactSignature = snapshot.signature;
            }
            process.exitCode = disposition.blocking ? 1 : 0;
            return;
          }
        }
        if (disposition && !disposition.eligible) {
          ineligibility = disposition.cause;
        }
      }
      // The terminal envelope is review_failed, so the log must say so even if
      // an earlier disposition had already been staged.
      if (projectLogFinalization) {
        projectLogFinalization.status = 'review_failed';
        projectLogFinalization.exitCode = 1;
      }
      writeReviewGateUnexpectedFailure(context, {
        project: postSelectionContext.project,
        projectResolutionSource: postSelectionContext.projectResolutionSource,
        target: postSelectionContext.target,
        gateInvocation: postSelectionContext.gateInvocation,
        dispatchReport: postSelectionContext.dispatchReport,
        step: postSelectionContext.step,
        ...(ineligibility ? { ineligibility } : {}),
        error,
      });
      process.exitCode = 1;
    } else {
      writeError(context, error);
    }
  } finally {
    try {
      if (branchLocalGateCli) {
        await dependencies.removeBranchLocalGateCli(branchLocalGateCli);
      }
      if (runMarkerPath) {
        await dependencies.removeGateRunMarker(runMarkerPath, (message) =>
          context.logger.warn(message),
        );
      }
    } finally {
      if (projectLogFinalization && !projectLogFinalized) {
        projectLogFinalized = true;
        await finalizeReviewGateProjectLog(
          context,
          dependencies,
          projectLogFinalization,
        );
      }
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

  cmd.addCommand(
    createGateRouteCommand({
      buildCommandContext: dependencies.buildCommandContext,
      processEnv: dependencies.processEnv,
    }),
  );

  cmd
    .command('resolve')
    .description('Print the resolved gate configuration for a skill')
    .argument('<skill>', 'Gate-aware skill name')
    .option(
      '--project [path-or-name]',
      'Resolve with project gate overrides applied; defaults to the active project',
    )
    .action(
      async (
        skillName: string,
        options: ResolveGateOptions,
        command: Command,
      ) => {
        const context = dependencies.buildCommandContext(
          readGlobalOptions(command),
        );
        await runResolve(skillName, options, context, dependencies);
      },
    );

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
    .alias('exec')
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
    .option(
      '--timeout-ms <milliseconds>',
      `Gate timeout in milliseconds (${MIN_GATE_TIMEOUT_MS}-${MAX_GATE_TIMEOUT_MS})`,
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
      '--timeout-ms <milliseconds>',
      `Gate timeout in milliseconds (${MIN_GATE_TIMEOUT_MS}-${MAX_GATE_TIMEOUT_MS})`,
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
    .option(
      '--timeout-ms <milliseconds>',
      `Target gate timeout in milliseconds (${MIN_GATE_TIMEOUT_MS}-${MAX_GATE_TIMEOUT_MS})`,
    )
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
