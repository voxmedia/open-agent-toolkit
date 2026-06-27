import {
  buildCommandContext,
  type CommandContext,
  type GlobalOptions,
} from '@app/command-context';
import { resolvePackDefaultScope } from '@commands/init/tools/shared/skill-manifest';
import { withScopeOption } from '@commands/shared/scope-option';
import {
  confirmAction,
  type PromptContext,
} from '@commands/shared/shared.prompts';
import { readGlobalOptions } from '@commands/shared/shared.utils';
import {
  canonicalPathsForPack,
  setInstalledCanonicalPaths,
} from '@commands/tools/shared/install-sync-context';
import {
  scanTools as defaultScanTools,
  type ScanToolsOptions,
} from '@commands/tools/shared/scan-tools';
import type { ToolInfo } from '@commands/tools/shared/types';
import {
  type OatConfig,
  readOatConfig as defaultReadOatConfig,
  writeOatConfig as defaultWriteOatConfig,
} from '@config/oat-config';
import { resolveAssetsRoot } from '@fs/assets';
import { resolveProjectRoot, resolveScopeRoot } from '@fs/paths';
import { Command } from 'commander';

import {
  installBrainstorm as defaultInstallBrainstorm,
  type InstallBrainstormOptions,
  type InstallBrainstormResult,
} from './install-brainstorm';

interface InitToolsBrainstormOptions {
  force?: boolean;
}

type InstallScope = 'project' | 'user';

interface InitToolsBrainstormDependencies {
  buildCommandContext: (options: GlobalOptions) => CommandContext;
  resolveProjectRoot: (cwd: string) => Promise<string>;
  resolveScopeRoot: (scope: InstallScope, cwd: string, home: string) => string;
  resolveAssetsRoot: () => Promise<string>;
  installBrainstorm: (
    options: InstallBrainstormOptions,
  ) => Promise<InstallBrainstormResult>;
  confirmAction: (message: string, ctx: PromptContext) => Promise<boolean>;
  scanTools: (options: ScanToolsOptions) => Promise<ToolInfo[]>;
  readOatConfig: (repoRoot: string) => Promise<OatConfig>;
  writeOatConfig: (repoRoot: string, config: OatConfig) => Promise<void>;
}

const DEFAULT_DEPENDENCIES: InitToolsBrainstormDependencies = {
  buildCommandContext,
  resolveProjectRoot,
  resolveScopeRoot,
  resolveAssetsRoot,
  installBrainstorm: defaultInstallBrainstorm,
  confirmAction,
  scanTools: defaultScanTools,
  readOatConfig: defaultReadOatConfig,
  writeOatConfig: defaultWriteOatConfig,
};

interface ResolvedScope {
  scope: InstallScope;
  source: 'explicit' | 'existing-install' | 'pack-default';
}

async function resolveInstallScope(
  context: CommandContext,
  projectRoot: string,
  userRoot: string,
  assetsRoot: string,
  dependencies: InitToolsBrainstormDependencies,
): Promise<ResolvedScope> {
  // Honor explicit --scope before any existing-install or default
  // resolution so callers can always override.
  if (context.scope === 'project') {
    return { scope: 'project', source: 'explicit' };
  }
  if (context.scope === 'user') {
    return { scope: 'user', source: 'explicit' };
  }

  // Existing-install detection MUST short-circuit before PACK_METADATA
  // defaultScope is consulted, so re-installing a pack already placed at
  // a particular scope never silently migrates the user across scopes.
  const [projectTools, userTools] = await Promise.all([
    dependencies.scanTools({
      scope: 'project',
      scopeRoot: projectRoot,
      assetsRoot,
    }),
    dependencies.scanTools({
      scope: 'user',
      scopeRoot: userRoot,
      assetsRoot,
    }),
  ]);

  const installedAtProject = projectTools.some(
    (tool) => tool.pack === 'brainstorm',
  );
  const installedAtUser = userTools.some((tool) => tool.pack === 'brainstorm');

  if (installedAtProject) {
    return { scope: 'project', source: 'existing-install' };
  }
  if (installedAtUser) {
    return { scope: 'user', source: 'existing-install' };
  }

  return {
    scope: resolvePackDefaultScope('brainstorm'),
    source: 'pack-default',
  };
}

function getCountSummary(result: InstallBrainstormResult): {
  skills: string;
} {
  return {
    skills: `copied=${result.copiedSkills.length}, updated=${result.updatedSkills.length}, skipped=${result.skippedSkills.length}`,
  };
}

function reportSuccess(
  context: CommandContext,
  scope: InstallScope,
  targetRoot: string,
  assetsRoot: string,
  result: InstallBrainstormResult,
): void {
  if (context.json) {
    context.logger.json({
      status: 'ok',
      scope,
      targetRoot,
      assetsRoot,
      result,
    });
    return;
  }

  const counts = getCountSummary(result);
  context.logger.info('Installed brainstorm tool pack.');
  context.logger.info(`Scope: ${scope}`);
  context.logger.info(`Target root: ${targetRoot}`);
  context.logger.info(`Skills: ${counts.skills}`);
  context.logger.info(`Run: oat sync --scope ${scope}`);
}

async function persistConfigAfterInstall(
  projectRoot: string,
  dependencies: InitToolsBrainstormDependencies,
): Promise<void> {
  const config = await dependencies.readOatConfig(projectRoot);
  const tools = { ...(config.tools ?? {}), brainstorm: true };
  await dependencies.writeOatConfig(projectRoot, { ...config, tools });
}

async function runInitToolsBrainstorm(
  context: CommandContext,
  options: InitToolsBrainstormOptions,
  dependencies: InitToolsBrainstormDependencies,
): Promise<boolean> {
  try {
    const projectRoot = await dependencies.resolveProjectRoot(context.cwd);
    const userRoot = dependencies.resolveScopeRoot(
      'user',
      context.cwd,
      context.home,
    );
    const assetsRoot = await dependencies.resolveAssetsRoot();

    const { scope } = await resolveInstallScope(
      context,
      projectRoot,
      userRoot,
      assetsRoot,
      dependencies,
    );
    const targetRoot = scope === 'project' ? projectRoot : userRoot;

    if (options.force && context.interactive) {
      const confirmed = await dependencies.confirmAction(
        `Force overwrite existing brainstorm assets in ${scope} scope?`,
        { interactive: context.interactive },
      );
      if (!confirmed) {
        if (!context.json) {
          context.logger.info('Cancelled: no files were overwritten.');
        }
        process.exitCode = 0;
        return false;
      }
    }

    const result = await dependencies.installBrainstorm({
      assetsRoot,
      targetRoot,
      force: options.force,
    });

    // Persist tools.brainstorm: true to .oat/config.json after a
    // successful install so config-write semantics match the main
    // installer flow used by `oat init tools`.
    await persistConfigAfterInstall(projectRoot, dependencies);

    reportSuccess(context, scope, targetRoot, assetsRoot, result);
    process.exitCode = 0;
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (context.json) {
      context.logger.json({ status: 'error', message });
    } else {
      context.logger.error(message);
    }
    process.exitCode = 1;
    return false;
  }
}

export function createInitToolsBrainstormCommand(
  overrides: Partial<InitToolsBrainstormDependencies> = {},
): Command {
  const dependencies: InitToolsBrainstormDependencies = {
    ...DEFAULT_DEPENDENCIES,
    ...overrides,
  };

  return withScopeOption(new Command('brainstorm'))
    .description(
      'Install OAT brainstorm skill (always-on entry point with visual companion)',
    )
    .option('--force', 'Overwrite existing files where applicable')
    .action(async (options: InitToolsBrainstormOptions, command: Command) => {
      const context = dependencies.buildCommandContext(
        readGlobalOptions(command),
      );
      const didInstall = await runInitToolsBrainstorm(
        context,
        options,
        dependencies,
      );
      if (didInstall) {
        setInstalledCanonicalPaths(
          command,
          canonicalPathsForPack('brainstorm'),
        );
      }
    });
}
