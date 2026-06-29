import { spawn } from 'node:child_process';
import { readdir } from 'node:fs/promises';
import { basename, isAbsolute, join, relative } from 'node:path';

import {
  buildCommandContext,
  type CommandContext,
  type GlobalOptions,
} from '@app/command-context';
import { findLatestReview, type LatestReview } from '@commands/review/latest';
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
  resolveExecTargets,
  resolveGate,
  type ResolvedConfig,
} from '@config/resolve';
import { dirExists, fileExists } from '@fs/io';
import { normalizeToPosixPath, resolveProjectRoot } from '@fs/paths';
import { Command } from 'commander';

import {
  parseReviewGateVerdict,
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
}

interface ProcessRunResult {
  exitCode: number;
}

type CrossProviderAvoid = 'same-runtime' | 'none';
type GateWriteLayer = 'shared' | 'local' | 'user';
type ReviewGateThreshold = 'critical' | 'important' | 'medium' | 'minor';
type GateConfigContainer = OatConfig | OatLocalConfig | UserConfig;
type GateConfigMutation = (config: GateConfigContainer) => GateConfigContainer;

export interface SelectedExecTarget {
  id: string;
  target: ExecTarget;
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
  processEnv: process.env,
};

const VALID_ON_FAILURE: readonly GateOnFailure[] = ['block', 'prompt', 'warn'];
const VALID_WRITE_LAYERS: readonly GateWriteLayer[] = [
  'shared',
  'local',
  'user',
];
const VALID_CROSS_PROVIDER_AVOIDS: readonly CrossProviderAvoid[] = [
  'same-runtime',
  'none',
];
const VALID_REVIEW_GATE_THRESHOLDS: readonly ReviewGateThreshold[] = [
  'critical',
  'important',
  'medium',
  'minor',
];
const REVIEW_GATE_CONTEXT_NOTE =
  'This review is gate-originated. If you run `oat-project-review-provide`, set `oat_review_invocation: gate` in the review artifact.';

async function runChildProcess(
  command: string,
  args: string[],
  options: ProcessRunOptions,
): Promise<ProcessRunResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env,
      stdio: options.stdio,
    });

    child.on('error', reject);
    child.on('close', (code) => {
      resolve({ exitCode: code ?? 1 });
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
  const avoid = value?.trim() || 'same-runtime';
  if (!(VALID_CROSS_PROVIDER_AVOIDS as readonly string[]).includes(avoid)) {
    throw new Error('--avoid must be one of same-runtime | none.');
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
    priority: parseNumericFlag(options.priority, '--priority', 0),
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
  return updateWorkflowGates(config, (gates) => ({
    ...gates,
    execTargets: {
      ...gates.execTargets,
      [targetId]: target,
    },
  }));
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
): SelectedExecTarget[] {
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
    ...(target.hostDetectionCommand
      ? { hostDetectionCommand: [...target.hostDetectionCommand] }
      : {}),
    ...(target.availabilityCommand
      ? { availabilityCommand: [...target.availabilityCommand] }
      : {}),
  };
}

function argvHead(argv: string[]): [string, string[]] {
  return [argv[0] ?? '', argv.slice(1)];
}

function listExecTargetCandidates(
  registry: Readonly<Record<string, ExecTarget>>,
  currentRuntime: string,
  avoid: CrossProviderAvoid,
): SelectedExecTarget[] {
  const shouldAvoidSameRuntime =
    avoid === 'same-runtime' && currentRuntime !== 'unknown';

  return sortedExecTargetEntries(registry)
    .filter(
      ({ target }) =>
        !shouldAvoidSameRuntime || target.runtime !== currentRuntime,
    )
    .map(({ id, target }) => ({ id, target: cloneExecTarget(target) }));
}

export function selectExecTarget(
  registry: Readonly<Record<string, ExecTarget>>,
  currentRuntime: string,
  avoid: CrossProviderAvoid,
): SelectedExecTarget | null {
  return listExecTargetCandidates(registry, currentRuntime, avoid)[0] ?? null;
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
  context: CommandContext,
  dependencies: GateCommandDependencies,
): Promise<SelectedExecTarget | null> {
  for (const candidate of listExecTargetCandidates(
    registry,
    currentRuntime,
    avoid,
  )) {
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

async function resolveSelectedExecTarget(
  targets: Readonly<Record<string, ExecTarget>>,
  options: CrossProviderExecOptions,
  context: CommandContext,
  dependencies: GateCommandDependencies,
): Promise<SelectedExecTarget> {
  const explicitTarget = options.target?.trim();

  if (explicitTarget) {
    const target = targets[explicitTarget];
    if (!target) {
      throw new Error(`Unknown exec target "${explicitTarget}".`);
    }

    return { id: explicitTarget, target: cloneExecTarget(target) };
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
    context,
    dependencies,
  );

  if (!selected) {
    throw new Error(noEligibleTargetMessage(currentRuntime, avoid));
  }

  return selected;
}

async function executeTarget(
  selected: SelectedExecTarget,
  prompt: string[],
  context: CommandContext,
  dependencies: GateCommandDependencies,
): Promise<number> {
  const [command, baseArgs] = argvHead(selected.target.baseCommand);
  if (!command) {
    throw new Error(`Exec target "${selected.id}" has an empty base command.`);
  }

  try {
    const result = await dependencies.runProcess(
      command,
      [...baseArgs, ...prompt],
      {
        cwd: context.cwd,
        env: dependencies.processEnv,
        purpose: 'execute',
        stdio: 'inherit',
      },
    );
    return result.exitCode;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to launch exec target "${selected.id}" (${command}): ${message}`,
      { cause: error },
    );
  }
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

async function resolveReviewProject(options: {
  repoRoot: string;
  effective: ResolvedConfig;
  project?: string;
}): Promise<string> {
  const projectsRoot = String(
    options.effective.resolved['projects.root']?.value ??
      options.effective.shared.projects?.root ??
      '.oat/projects/shared',
  );

  if (options.project !== undefined) {
    return resolveExplicitReviewProject(
      options.repoRoot,
      projectsRoot,
      options.project,
    );
  }

  const activeProject = options.effective.local.activeProject?.trim();
  if (activeProject) {
    return assertProjectPath(options.repoRoot, activeProject, 'Active');
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

  return candidates[0]!;
}

function reviewArtifactChanged(
  before: LatestReview | null,
  after: LatestReview | null,
): after is LatestReview {
  if (!after) {
    return false;
  }
  return (
    !before ||
    before.path !== after.path ||
    before.generatedAt !== after.generatedAt
  );
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

function writeReviewGateResult(
  context: CommandContext,
  payload: {
    status: 'ok' | 'blocked';
    target: string;
    project: string;
    artifactPath: string;
    threshold: ReviewGateThreshold;
    blocking: boolean;
    counts: ReviewGateVerdict['counts'];
    reviewType: ReviewGateVerdict['reviewType'];
    scope: string | null;
    invocation: string | null;
    handoff: string;
  },
): void {
  if (context.json) {
    context.logger.json(payload);
    return;
  }

  context.logger.info(`Review artifact: ${payload.artifactPath}`);
  context.logger.info(
    `Verdict: ${payload.status} (critical=${payload.counts.critical}, important=${payload.counts.important}, medium=${payload.counts.medium}, minor=${payload.counts.minor})`,
  );
  context.logger.info(payload.handoff);
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

async function runCrossProviderExec(
  prompt: string[],
  options: CrossProviderExecOptions,
  context: CommandContext,
  dependencies: GateCommandDependencies,
): Promise<void> {
  try {
    const effective = await readEffectiveConfig(context, dependencies);
    const targets = resolveExecTargets(effective);
    const selected = await resolveSelectedExecTarget(
      targets,
      options,
      context,
      dependencies,
    );

    process.exitCode = await executeTarget(
      selected,
      prompt,
      context,
      dependencies,
    );
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
  try {
    const repoRoot = await dependencies.resolveProjectRoot(context.cwd);
    const userConfigDir = join(context.home, '.oat');
    const effective = await dependencies.resolveEffectiveConfig(
      repoRoot,
      userConfigDir,
      dependencies.processEnv,
    );
    const projectPath = await resolveReviewProject({
      repoRoot,
      effective,
      project: options.project,
    });
    const targets = resolveExecTargets(effective);
    const selected = await resolveSelectedExecTarget(
      targets,
      options,
      context,
      dependencies,
    );
    const threshold = parseReviewGateThreshold(options.exitNonzeroOn);
    const before = await findLatestReview({ repoRoot, projectPath });
    const reviewPrompt = [
      REVIEW_GATE_CONTEXT_NOTE,
      ...(options.reviewType?.trim()
        ? [`Review type: ${options.reviewType.trim()}.`]
        : []),
      ...(options.reviewScope?.trim()
        ? [`Review scope: ${options.reviewScope.trim()}.`]
        : []),
      ...prompt,
    ];
    const childExitCode = await executeTarget(
      selected,
      reviewPrompt,
      context,
      dependencies,
    );

    if (childExitCode !== 0) {
      process.exitCode = childExitCode;
      return;
    }

    const after = await findLatestReview({ repoRoot, projectPath });
    if (!reviewArtifactChanged(before, after)) {
      throw new Error(
        `No new review artifact was detected for project ${projectPath}. Ensure the review provider wrote a project review artifact before the gate exits.`,
      );
    }

    const verdict = await parseReviewGateVerdict(join(repoRoot, after.path));
    const blocking = reviewBlocksAtThreshold(verdict, threshold);
    const handoff = `Run oat-project-review-receive for ${after.path} before treating this gate review as consumed.`;

    writeReviewGateResult(context, {
      status: blocking ? 'blocked' : 'ok',
      target: selected.id,
      project: projectPath,
      artifactPath: after.path,
      threshold,
      blocking,
      counts: verdict.counts,
      reviewType: verdict.reviewType,
      scope: verdict.scope,
      invocation: verdict.invocation,
      handoff,
    });
    process.exitCode = blocking ? 1 : 0;
  } catch (error) {
    writeError(context, error);
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
    .option('--avoid <mode>', 'Avoidance mode: same-runtime or none')
    .option(
      '--current-runtime <runtime>',
      'Override detected runtime for testing or manual routing',
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
    .option('--avoid <mode>', 'Avoidance mode: same-runtime or none')
    .option(
      '--current-runtime <runtime>',
      'Override detected runtime for testing or manual routing',
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
