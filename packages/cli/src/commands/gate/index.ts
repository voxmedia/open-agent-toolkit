import { join } from 'node:path';

import {
  buildCommandContext,
  type CommandContext,
  type GlobalOptions,
} from '@app/command-context';
import { readGlobalOptions } from '@commands/shared/shared.utils';
import {
  readOatConfig,
  readOatLocalConfig,
  readUserConfig,
  writeOatConfig,
  writeOatLocalConfig,
  writeUserConfig,
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

type GateWriteLayer = 'shared' | 'local' | 'user';
type GateConfigContainer = OatConfig | OatLocalConfig | UserConfig;
type GateConfigMutation = (config: GateConfigContainer) => GateConfigContainer;

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
  processEnv: process.env,
};

const VALID_ON_FAILURE: readonly GateOnFailure[] = ['block', 'prompt', 'warn'];
const VALID_WRITE_LAYERS: readonly GateWriteLayer[] = [
  'shared',
  'local',
  'user',
];

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
