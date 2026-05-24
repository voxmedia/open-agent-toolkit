import { access, readFile } from 'node:fs/promises';
import { isAbsolute, join } from 'node:path';

import {
  buildCommandContext,
  type CommandContext,
  type GlobalOptions,
} from '@app/command-context';
import { getFrontmatterBlock } from '@commands/shared/frontmatter';
import { readGlobalOptions } from '@commands/shared/shared.utils';
import {
  resolveActiveProject,
  type ActiveProjectResolution,
  type WorkflowCodexDispatchCeiling,
  type WorkflowClaudeDispatchCeiling,
} from '@config/oat-config';
import {
  resolveEffectiveConfig,
  type ResolvedConfig,
  type ResolvedConfigSource,
} from '@config/resolve';
import { resolveProjectRoot } from '@fs/paths';
import TOML from '@iarna/toml';
import { Command } from 'commander';
import YAML from 'yaml';

type DispatchCeilingProvider = 'codex' | 'claude';
type DispatchCeilingValue =
  | WorkflowCodexDispatchCeiling
  | WorkflowClaudeDispatchCeiling;
type DispatchCeilingSource =
  | 'local-config'
  | 'repo-config'
  | 'user-config'
  | 'env'
  | 'project-state';

interface DispatchCeilingDependencies {
  buildCommandContext: (options: GlobalOptions) => CommandContext;
  resolveProjectRoot: (cwd: string) => Promise<string>;
  resolveEffectiveConfig: (
    repoRoot: string,
    userConfigDir: string,
    env: NodeJS.ProcessEnv,
  ) => Promise<ResolvedConfig>;
  resolveActiveProject: (repoRoot: string) => Promise<ActiveProjectResolution>;
  readFile: (path: string) => Promise<string>;
  pathExists: (path: string) => Promise<boolean>;
  processEnv: NodeJS.ProcessEnv;
}

interface DispatchCeilingResolveOptions {
  provider?: string;
  projectPath?: string;
  preflight?: boolean;
  nonInteractive?: boolean;
  json?: boolean;
}

interface DispatchCeilingResolution {
  status: 'resolved' | 'unresolved' | 'blocked';
  provider: DispatchCeilingProvider;
  value: DispatchCeilingValue | null;
  source: DispatchCeilingSource | null;
  unresolved: boolean;
  projectPath: string | null;
  providerDefaultEffort: string;
  message?: string;
}

const CODEX_VALUES: readonly WorkflowCodexDispatchCeiling[] = [
  'low',
  'medium',
  'high',
  'xhigh',
];

const CLAUDE_VALUES: readonly WorkflowClaudeDispatchCeiling[] = [
  'haiku',
  'sonnet',
  'opus',
];

const DEFAULT_DEPENDENCIES: DispatchCeilingDependencies = {
  buildCommandContext,
  resolveProjectRoot,
  resolveEffectiveConfig,
  resolveActiveProject,
  readFile: async (path: string) => readFile(path, 'utf8'),
  pathExists: async (path: string) => {
    try {
      await access(path);
      return true;
    } catch {
      return false;
    }
  },
  processEnv: process.env,
};

function normalizeProvider(value: string | undefined): DispatchCeilingProvider {
  if (value === 'codex' || value === 'claude') {
    return value;
  }
  throw new Error('Invalid provider. Expected one of: codex, claude.');
}

function isValidProviderValue(
  provider: DispatchCeilingProvider,
  value: unknown,
): value is DispatchCeilingValue {
  if (provider === 'codex') {
    return (
      typeof value === 'string' &&
      CODEX_VALUES.includes(value as WorkflowCodexDispatchCeiling)
    );
  }
  return (
    typeof value === 'string' &&
    CLAUDE_VALUES.includes(value as WorkflowClaudeDispatchCeiling)
  );
}

function configSourceToCeilingSource(
  source: ResolvedConfigSource,
): DispatchCeilingSource | null {
  if (source === 'local') {
    return 'local-config';
  }
  if (source === 'shared') {
    return 'repo-config';
  }
  if (source === 'user') {
    return 'user-config';
  }
  if (source === 'env') {
    return 'env';
  }
  return null;
}

function sourceLabel(source: DispatchCeilingSource | null): string {
  switch (source) {
    case 'local-config':
      return 'local config';
    case 'repo-config':
      return 'repo config';
    case 'user-config':
      return 'user config';
    case 'env':
      return 'environment';
    case 'project-state':
      return 'project state';
    default:
      return 'none';
  }
}

function providerLabel(provider: DispatchCeilingProvider): string {
  return provider === 'codex' ? 'Codex' : 'Claude';
}

function resolveTargetProjectPath(
  repoRoot: string,
  projectPath: string,
): string {
  return isAbsolute(projectPath) ? projectPath : join(repoRoot, projectPath);
}

function readProjectDispatchCeiling(
  provider: DispatchCeilingProvider,
  content: string,
): DispatchCeilingValue | null {
  const frontmatter = getFrontmatterBlock(content);
  if (!frontmatter) {
    return null;
  }

  const parsed: unknown = YAML.parse(frontmatter);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return null;
  }

  const ceiling = (parsed as Record<string, unknown>)['oat_dispatch_ceiling'];
  if (!ceiling || typeof ceiling !== 'object' || Array.isArray(ceiling)) {
    return null;
  }

  const ceilingRecord = ceiling as Record<string, unknown>;
  if (ceilingRecord['provider'] !== provider) {
    return null;
  }

  const value = ceilingRecord['value'];
  return isValidProviderValue(provider, value) ? value : null;
}

async function resolveProjectStateCeiling(
  provider: DispatchCeilingProvider,
  projectPath: string | null,
  dependencies: DispatchCeilingDependencies,
): Promise<DispatchCeilingValue | null> {
  if (!projectPath) {
    return null;
  }

  try {
    const content = await dependencies.readFile(join(projectPath, 'state.md'));
    return readProjectDispatchCeiling(provider, content);
  } catch {
    return null;
  }
}

async function resolveProjectPath(
  repoRoot: string,
  dependencies: DispatchCeilingDependencies,
  options: DispatchCeilingResolveOptions,
): Promise<string | null> {
  if (options.projectPath) {
    return resolveTargetProjectPath(repoRoot, options.projectPath);
  }

  const activeProject = await dependencies.resolveActiveProject(repoRoot);
  if (activeProject.status !== 'active' || !activeProject.path) {
    return null;
  }
  return join(repoRoot, activeProject.path);
}

function readResolvedConfigCeiling(
  provider: DispatchCeilingProvider,
  resolvedConfig: ResolvedConfig,
): { value: DispatchCeilingValue; source: DispatchCeilingSource } | null {
  const entry = resolvedConfig.resolved[`workflow.dispatchCeiling.${provider}`];
  const source = entry ? configSourceToCeilingSource(entry.source) : null;
  if (!entry || !source || !isValidProviderValue(provider, entry.value)) {
    return null;
  }

  return {
    value: entry.value,
    source,
  };
}

function readCodexDefaultFromToml(content: string): string | null {
  let parsed: Record<string, unknown>;
  try {
    parsed = TOML.parse(content) as Record<string, unknown>;
  } catch {
    return null;
  }

  const value = parsed['model_reasoning_effort'];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

async function resolveCodexProviderDefaultEffort(
  repoRoot: string,
  context: CommandContext,
  dependencies: DispatchCeilingDependencies,
): Promise<string> {
  const candidates = [
    join(repoRoot, '.codex', 'config.toml'),
    join(context.home, '.codex', 'config.toml'),
  ];

  for (const candidate of candidates) {
    if (!(await dependencies.pathExists(candidate))) {
      continue;
    }
    const value = readCodexDefaultFromToml(
      await dependencies.readFile(candidate),
    );
    if (value) {
      return value;
    }
  }

  return 'unknown';
}

function blockMessage(provider: DispatchCeilingProvider): string {
  const label = providerLabel(provider);
  return `BLOCKED: ${label} dispatch ceiling is unresolved in non-interactive mode.\nSet workflow.dispatchCeiling.${provider} in .oat/config.json or oat_dispatch_ceiling in project state.`;
}

function isNonInteractiveEnv(env: NodeJS.ProcessEnv): boolean {
  return env['OAT_NON_INTERACTIVE'] === '1';
}

async function resolveDispatchCeiling(
  context: CommandContext,
  dependencies: DispatchCeilingDependencies,
  options: DispatchCeilingResolveOptions,
): Promise<DispatchCeilingResolution> {
  const provider = normalizeProvider(options.provider);
  const repoRoot = await dependencies.resolveProjectRoot(context.cwd);
  const userConfigDir = join(context.home, '.oat');
  const [resolvedConfig, projectPath] = await Promise.all([
    dependencies.resolveEffectiveConfig(
      repoRoot,
      userConfigDir,
      dependencies.processEnv,
    ),
    resolveProjectPath(repoRoot, dependencies, options),
  ]);

  const providerDefaultEffort =
    provider === 'codex'
      ? await resolveCodexProviderDefaultEffort(repoRoot, context, dependencies)
      : 'not-applicable';

  const configCeiling = readResolvedConfigCeiling(provider, resolvedConfig);
  if (configCeiling) {
    return {
      status: 'resolved',
      provider,
      value: configCeiling.value,
      source: configCeiling.source,
      unresolved: false,
      projectPath,
      providerDefaultEffort,
    };
  }

  const projectCeiling = await resolveProjectStateCeiling(
    provider,
    projectPath,
    dependencies,
  );
  if (projectCeiling) {
    return {
      status: 'resolved',
      provider,
      value: projectCeiling,
      source: 'project-state',
      unresolved: false,
      projectPath,
      providerDefaultEffort,
    };
  }

  const shouldBlock =
    options.nonInteractive === true ||
    isNonInteractiveEnv(dependencies.processEnv) ||
    (options.preflight === true && !context.interactive && !context.json);
  const message = shouldBlock ? blockMessage(provider) : undefined;
  return {
    status: shouldBlock ? 'blocked' : 'unresolved',
    provider,
    value: null,
    source: null,
    unresolved: true,
    projectPath,
    providerDefaultEffort,
    message,
  };
}

function writeHumanResolution(
  context: CommandContext,
  resolution: DispatchCeilingResolution,
): void {
  const label = providerLabel(resolution.provider);
  if (resolution.status === 'blocked' && resolution.message) {
    context.logger.error(resolution.message);
    return;
  }

  context.logger.info(
    `${label} dispatch ceiling: ${resolution.value ?? 'unresolved'}`,
  );
  context.logger.info(`Source: ${sourceLabel(resolution.source)}`);

  if (resolution.provider === 'codex') {
    context.logger.info(
      `Codex provider default effort: ${resolution.providerDefaultEffort}`,
    );
    context.logger.info(
      `Note: OAT will use pinned subagent variants up to ${resolution.value ?? 'the resolved ceiling'}. Base/unpinned roles resolve through the provider default.`,
    );
  } else {
    context.logger.info('Effort axis: not-applicable');
  }
}

async function runDispatchCeilingResolve(
  context: CommandContext,
  dependencies: DispatchCeilingDependencies,
  options: DispatchCeilingResolveOptions,
): Promise<void> {
  try {
    const resolution = await resolveDispatchCeiling(
      context,
      dependencies,
      options,
    );

    if (context.json) {
      context.logger.json(resolution);
    } else {
      writeHumanResolution(context, resolution);
    }

    process.exitCode = resolution.status === 'blocked' ? 1 : 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (context.json) {
      context.logger.json({ status: 'error', message });
    } else {
      context.logger.error(message);
    }
    process.exitCode = 1;
  }
}

export function createProjectDispatchCeilingCommand(
  overrides: Partial<DispatchCeilingDependencies> = {},
): Command {
  const dependencies: DispatchCeilingDependencies = {
    ...DEFAULT_DEPENDENCIES,
    ...overrides,
  };

  const command = new Command('dispatch-ceiling').description(
    'Resolve OAT project dispatch ceiling metadata',
  );

  command.addCommand(
    new Command('resolve')
      .description('Resolve dispatch ceiling for a provider')
      .requiredOption('--provider <provider>', 'Provider: codex or claude')
      .option(
        '--project-path <path>',
        'Read project-state ceiling from an explicit project path',
      )
      .option(
        '--preflight',
        'Treat unresolved non-interactive resolution as an implementation block',
      )
      .option(
        '--non-interactive',
        'Force non-interactive block behavior when the ceiling is unresolved',
      )
      .option('--json', 'Output machine-readable JSON')
      .action(async (options: DispatchCeilingResolveOptions, cmd: Command) => {
        const globalOptions = readGlobalOptions(cmd);
        const context = dependencies.buildCommandContext({
          ...globalOptions,
          json: globalOptions.json === true || options.json === true,
        });
        await runDispatchCeilingResolve(context, dependencies, options);
      }),
  );

  return command;
}
