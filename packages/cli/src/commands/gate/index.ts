import { spawn } from 'node:child_process';
import { join } from 'node:path';

import {
  buildCommandContext,
  type CommandContext,
  type GlobalOptions,
} from '@app/command-context';
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
import { resolveProjectRoot } from '@fs/paths';
import { Command } from 'commander';

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
    await updateConfigLayer(context, layer, dependencies, (config) =>
      setSkillGate(config, normalizedSkill, gate),
    );
    writeSuccess(context, { layer, skill: normalizedSkill, gate });
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
    const explicitTarget = options.target?.trim();

    if (explicitTarget) {
      const target = targets[explicitTarget];
      if (!target) {
        throw new Error(`Unknown exec target "${explicitTarget}".`);
      }

      process.exitCode = await executeTarget(
        { id: explicitTarget, target: cloneExecTarget(target) },
        prompt,
        context,
        dependencies,
      );
      return;
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
