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
  VALID_CLAUDE_DISPATCH_CEILINGS,
  VALID_CODEX_DISPATCH_CEILINGS,
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
import {
  getCeilingAdapter,
  type CeilingDispatchArgs,
  type CeilingRole,
  type EnforcementMechanism,
} from '@providers/ceiling/registry';
import { Command } from 'commander';
import YAML from 'yaml';

// Provider-neutral: accept arbitrary provider names. Codex/Claude get concrete
// enforcement; every other provider routes through the fallback advisory adapter
// (mode: unsupported) rather than erroring. Typed concrete-value validation is
// applied only for the providers that have a value enum.
type DispatchCeilingProvider = 'codex' | 'claude' | (string & {});
type DispatchCeilingValue =
  | WorkflowCodexDispatchCeiling
  | WorkflowClaudeDispatchCeiling;
type DispatchCeilingSource =
  | 'local-config'
  | 'repo-config'
  | 'user-config'
  | 'env'
  | 'project-state';

type DispatchCeilingMode = 'enforced' | 'advisory' | 'unsupported';

interface ProviderResolution {
  value: DispatchCeilingValue | null;
  mode: DispatchCeilingMode;
  mechanism: EnforcementMechanism;
  dispatchArgs: CeilingDispatchArgs;
  verifyOnDispatch: boolean;
  selection: DispatchSelection;
}

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
  role?: string;
  orchestratorTier?: string;
  preferred?: string;
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
  preset: string | null;
  unresolved: boolean;
  projectPath: string | null;
  providerDefaultEffort: string;
  providers: Record<string, ProviderResolution>;
  message?: string;
}

const CODEX_VALUES: readonly WorkflowCodexDispatchCeiling[] = [
  ...VALID_CODEX_DISPATCH_CEILINGS,
];

const CLAUDE_VALUES: readonly WorkflowClaudeDispatchCeiling[] = [
  ...VALID_CLAUDE_DISPATCH_CEILINGS,
];

interface DispatchSelection {
  role: CeilingRole;
  preferredValue: DispatchCeilingValue | null;
  selectedValue: DispatchCeilingValue | null;
  capped: boolean;
}

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
  // Provider-neutral: accept any provider name. Unknown providers do not throw;
  // they resolve through the fallback advisory adapter as `mode: unsupported`.
  const normalized = value?.trim();
  if (!normalized) {
    throw new Error('Provider is required.');
  }
  return normalized;
}

function isValidProviderValue(
  provider: DispatchCeilingProvider,
  value: unknown,
): value is DispatchCeilingValue {
  // Typed concrete-value validation only applies to providers with a value
  // enum. Unknown providers have no concrete ceiling value (always advisory).
  if (provider === 'codex') {
    return (
      typeof value === 'string' &&
      CODEX_VALUES.includes(value as WorkflowCodexDispatchCeiling)
    );
  }
  if (provider === 'claude') {
    return (
      typeof value === 'string' &&
      CLAUDE_VALUES.includes(value as WorkflowClaudeDispatchCeiling)
    );
  }
  return false;
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
  if (provider === 'codex') {
    return 'Codex';
  }
  if (provider === 'claude') {
    return 'Claude';
  }
  // Unknown providers: title-case the raw name for human-readable output.
  return provider.charAt(0).toUpperCase() + provider.slice(1);
}

function resolveTargetProjectPath(
  repoRoot: string,
  projectPath: string,
): string {
  return isAbsolute(projectPath) ? projectPath : join(repoRoot, projectPath);
}

interface ProjectStateCeiling {
  value: DispatchCeilingValue;
  preset: string | null;
}

function readProjectDispatchPolicy(
  provider: DispatchCeilingProvider,
  content: string,
): ProjectStateCeiling | null {
  const frontmatter = getFrontmatterBlock(content);
  if (!frontmatter) {
    return null;
  }

  const parsed: unknown = YAML.parse(frontmatter);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return null;
  }

  const policy = (parsed as Record<string, unknown>)['oat_dispatch_policy'];
  if (!policy || typeof policy !== 'object' || Array.isArray(policy)) {
    return null;
  }

  const policyRecord = policy as Record<string, unknown>;
  if (policyRecord['mode'] !== 'managed') {
    return null;
  }

  const providers = policyRecord['providers'];
  if (!providers || typeof providers !== 'object' || Array.isArray(providers)) {
    return null;
  }

  const value = (providers as Record<string, unknown>)[provider];
  if (!isValidProviderValue(provider, value)) {
    return null;
  }

  const policyValue = policyRecord['policy'];
  return {
    value,
    preset: typeof policyValue === 'string' ? policyValue : null,
  };
}

function readLegacyProjectDispatchCeiling(
  provider: DispatchCeilingProvider,
  parsed: Record<string, unknown>,
): ProjectStateCeiling | null {
  const ceiling = parsed['oat_dispatch_ceiling'];
  if (!ceiling || typeof ceiling !== 'object' || Array.isArray(ceiling)) {
    return null;
  }

  const ceilingRecord = ceiling as Record<string, unknown>;
  // Clean break: read concrete per-provider values only. The preset label is
  // provenance and is never used to drive dispatch.
  const providers = ceilingRecord['providers'];
  if (!providers || typeof providers !== 'object' || Array.isArray(providers)) {
    return null;
  }

  const value = (providers as Record<string, unknown>)[provider];
  if (!isValidProviderValue(provider, value)) {
    return null;
  }

  const presetValue = ceilingRecord['preset'];
  return {
    value,
    preset: typeof presetValue === 'string' ? presetValue : null,
  };
}

function readProjectDispatchCeiling(
  provider: DispatchCeilingProvider,
  content: string,
): ProjectStateCeiling | null {
  const frontmatter = getFrontmatterBlock(content);
  if (!frontmatter) {
    return null;
  }

  const parsed: unknown = YAML.parse(frontmatter);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return null;
  }

  return (
    readProjectDispatchPolicy(provider, content) ??
    readLegacyProjectDispatchCeiling(
      provider,
      parsed as Record<string, unknown>,
    )
  );
}

async function resolveProjectStateCeiling(
  provider: DispatchCeilingProvider,
  projectPath: string | null,
  dependencies: DispatchCeilingDependencies,
): Promise<ProjectStateCeiling | null> {
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
  // Read the concrete per-provider value from the nested key. The flat
  // `workflow.dispatchCeiling.<provider>` shape was removed in p01; never read
  // the preset label for dispatch.
  const entry =
    resolvedConfig.resolved[`workflow.dispatchCeiling.providers.${provider}`];
  const source = entry ? configSourceToCeilingSource(entry.source) : null;
  if (!entry || !source || !isValidProviderValue(provider, entry.value)) {
    return null;
  }

  return {
    value: entry.value,
    source,
  };
}

function normalizeRole(value: string | undefined): CeilingRole {
  return value === 'reviewer' ? 'reviewer' : 'implementer';
}

function providerValueOrder(
  provider: DispatchCeilingProvider,
): readonly DispatchCeilingValue[] | null {
  if (provider === 'codex') {
    return CODEX_VALUES;
  }
  if (provider === 'claude') {
    return CLAUDE_VALUES;
  }
  return null;
}

function normalizePreferredValue(
  provider: DispatchCeilingProvider,
  value: string | undefined,
): DispatchCeilingValue | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  const order = providerValueOrder(provider);
  if (!order) {
    return null;
  }

  if (!isValidProviderValue(provider, normalized)) {
    const validValues = order.join(', ');
    throw new Error(
      `Invalid preferred dispatch value "${normalized}" for ${provider}. Valid values: ${validValues}.`,
    );
  }

  return normalized;
}

function selectDispatchValue(
  provider: DispatchCeilingProvider,
  role: CeilingRole,
  ceilingValue: DispatchCeilingValue,
  preferredValue: DispatchCeilingValue | null,
): DispatchSelection {
  if (role === 'reviewer' || preferredValue === null) {
    return {
      role,
      preferredValue,
      selectedValue: ceilingValue,
      capped: false,
    };
  }

  const order = providerValueOrder(provider);
  const preferredIndex = order?.indexOf(preferredValue) ?? -1;
  const ceilingIndex = order?.indexOf(ceilingValue) ?? -1;
  if (!order || preferredIndex < 0 || ceilingIndex < 0) {
    return {
      role,
      preferredValue,
      selectedValue: ceilingValue,
      capped: false,
    };
  }

  const selectedIndex = Math.min(preferredIndex, ceilingIndex);
  return {
    role,
    preferredValue,
    selectedValue: order[selectedIndex]!,
    capped: preferredIndex > ceilingIndex,
  };
}

/**
 * Join a resolved ceiling value with the active provider's adapter to compute
 * the enforcement mode, mechanism, dispatch args, and verify-on-upgrade flag.
 * Mode is computed here at call time — it is never read from persisted state.
 */
function buildProviderResolution(
  provider: DispatchCeilingProvider,
  value: DispatchCeilingValue | null,
  role: CeilingRole,
  orchestratorTier: string | undefined,
  preferredValue: DispatchCeilingValue | null,
): ProviderResolution {
  const adapter = getCeilingAdapter(provider);

  if (value === null) {
    return {
      value: null,
      mode: adapter.supportsCeiling ? 'advisory' : 'unsupported',
      mechanism: adapter.mechanism,
      dispatchArgs: null,
      verifyOnDispatch: false,
      selection: {
        role,
        preferredValue,
        selectedValue: null,
        capped: false,
      },
    };
  }

  const selection = selectDispatchValue(provider, role, value, preferredValue);
  const dispatchValue = selection.selectedValue ?? value;
  const dispatchArgs = adapter.compileToDispatchArgs(dispatchValue, role, {
    orchestratorTier,
  });

  let mode: DispatchCeilingMode;
  if (!adapter.supportsCeiling) {
    mode = 'unsupported';
  } else if (dispatchArgs) {
    mode = 'enforced';
  } else {
    mode = 'advisory';
  }

  return {
    value,
    mode,
    mechanism: adapter.mechanism,
    dispatchArgs,
    verifyOnDispatch: adapter.verifyOnDispatch(dispatchValue, {
      orchestratorTier,
    }),
    selection,
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
  return `BLOCKED: ${label} dispatch ceiling is unresolved in non-interactive mode.\nSet workflow.dispatchCeiling.providers.${provider} in .oat/config.json or oat_dispatch_ceiling in project state.`;
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
  const role = normalizeRole(options.role);
  const orchestratorTier = options.orchestratorTier;
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
  const preferredValue = normalizePreferredValue(provider, options.preferred);

  const resolvedValue = await resolveCeilingValue(
    provider,
    resolvedConfig,
    projectPath,
    dependencies,
  );

  const providerResolution = buildProviderResolution(
    provider,
    resolvedValue?.value ?? null,
    role,
    orchestratorTier,
    preferredValue,
  );
  const providers: Record<string, ProviderResolution> = {
    [provider]: providerResolution,
  };

  if (resolvedValue) {
    return {
      status: 'resolved',
      provider,
      value: resolvedValue.value,
      source: resolvedValue.source,
      preset: resolvedValue.preset,
      unresolved: false,
      projectPath,
      providerDefaultEffort,
      providers,
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
    preset: null,
    unresolved: true,
    projectPath,
    providerDefaultEffort,
    providers,
    message,
  };
}

interface ResolvedCeilingValue {
  value: DispatchCeilingValue;
  source: DispatchCeilingSource;
  preset: string | null;
}

/**
 * Resolve the concrete per-provider ceiling value, applying config precedence
 * (local > shared > user, via `resolveEffectiveConfig`) before project state.
 * Never reads the preset label for dispatch — the preset is surfaced as
 * provenance only.
 */
async function resolveCeilingValue(
  provider: DispatchCeilingProvider,
  resolvedConfig: ResolvedConfig,
  projectPath: string | null,
  dependencies: DispatchCeilingDependencies,
): Promise<ResolvedCeilingValue | null> {
  const configCeiling = readResolvedConfigCeiling(provider, resolvedConfig);
  if (configCeiling) {
    return {
      value: configCeiling.value,
      source: configCeiling.source,
      preset: null,
    };
  }

  const projectCeiling = await resolveProjectStateCeiling(
    provider,
    projectPath,
    dependencies,
  );
  if (projectCeiling) {
    return {
      value: projectCeiling.value,
      source: 'project-state',
      preset: projectCeiling.preset,
    };
  }

  return null;
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

  const providerResolution = resolution.providers[resolution.provider];
  if (providerResolution) {
    context.logger.info(
      `Mode: ${providerResolution.mode} (${providerResolution.mechanism})`,
    );
  }

  if (resolution.provider === 'codex') {
    context.logger.info(
      `Codex provider default effort: ${resolution.providerDefaultEffort}`,
    );
    context.logger.info(
      `Note: OAT will use pinned subagent variants up to ${resolution.value ?? 'the resolved ceiling'}. Base/unpinned roles resolve through the provider default.`,
    );
    if (
      providerResolution?.selection.selectedValue &&
      providerResolution.selection.preferredValue
    ) {
      context.logger.info(
        `Selected Codex effort: ${providerResolution.selection.selectedValue}`,
      );
    }
  } else {
    context.logger.info('Effort axis: not-applicable');
    if (
      providerResolution?.selection.selectedValue &&
      providerResolution.selection.preferredValue
    ) {
      context.logger.info(
        `Selected dispatch value: ${providerResolution.selection.selectedValue}`,
      );
    }
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
      .requiredOption(
        '--provider <provider>',
        'Provider name: codex or claude are enforced; any other provider resolves as advisory (unsupported)',
      )
      .option(
        '--role <role>',
        'Dispatch role for variant compilation: implementer (default) or reviewer',
      )
      .option(
        '--orchestrator-tier <tier>',
        'Orchestrator tier, used to flag verify-on-upgrade for above-orchestrator requests',
      )
      .option(
        '--preferred <value>',
        'Preferred implementer/fix dispatch value before capping by the resolved ceiling',
      )
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
