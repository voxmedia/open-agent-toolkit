import {
  buildCommandContext,
  type CommandContext,
  type GlobalOptions,
} from '@app/command-context';
import {
  buildDecisionAgentsSectionBody,
  DECISION_AGENTS_SECTION_KEY,
} from '@commands/decision/agents-guidance';
import {
  type UpsertSectionResult,
  upsertAgentsMdSection,
} from '@commands/shared/agents-md';
import { withScopeOption } from '@commands/shared/scope-option';
import { readGlobalOptions } from '@commands/shared/shared.utils';
import {
  canonicalPathsForPack,
  setInstalledCanonicalPaths,
} from '@commands/tools/shared/install-sync-context';
import { resolveAssetsRoot } from '@fs/assets';
import { resolveProjectRoot, resolveScopeRoot } from '@fs/paths';
import { Command } from 'commander';

import {
  buildProjectManagementAgentsSectionBody,
  PROJECT_MANAGEMENT_AGENTS_SECTION_KEY,
} from './agents-guidance';
import {
  installProjectManagement as defaultInstallProjectManagement,
  type InstallProjectManagementOptions,
  type InstallProjectManagementResult,
} from './install-project-management';

interface InitToolsProjectManagementOptions {
  force?: boolean;
}

interface InitToolsProjectManagementDependencies {
  buildCommandContext: (options: GlobalOptions) => CommandContext;
  resolveProjectRoot: (cwd: string) => Promise<string>;
  resolveScopeRoot: (
    scope: 'project' | 'user',
    cwd: string,
    home: string,
  ) => string;
  resolveAssetsRoot: () => Promise<string>;
  installProjectManagement: (
    options: InstallProjectManagementOptions,
  ) => Promise<InstallProjectManagementResult>;
}

const DEFAULT_DEPENDENCIES: InitToolsProjectManagementDependencies = {
  buildCommandContext,
  resolveProjectRoot,
  resolveScopeRoot,
  resolveAssetsRoot,
  installProjectManagement: defaultInstallProjectManagement,
};

export function createInitToolsProjectManagementCommand(
  overrides: Partial<InitToolsProjectManagementDependencies> = {},
): Command {
  const dependencies: InitToolsProjectManagementDependencies = {
    ...DEFAULT_DEPENDENCIES,
    ...overrides,
  };

  return withScopeOption(new Command('project-management'))
    .description('Install OAT project-management skills and templates')
    .option('--force', 'Overwrite existing files where applicable')
    .action(
      async (options: InitToolsProjectManagementOptions, command: Command) => {
        let didInstall = false;
        try {
          const context = dependencies.buildCommandContext(
            readGlobalOptions(command),
          );
          const optionScope = (command.optsWithGlobals() as { scope?: string })
            .scope;
          const scope =
            command.getOptionValueSourceWithGlobals('scope') === 'cli' &&
            (optionScope === 'project' || optionScope === 'user')
              ? optionScope
              : context.scope === 'project' || context.scope === 'user'
                ? context.scope
                : 'user';
          const targetRoot =
            scope === 'project'
              ? await dependencies.resolveProjectRoot(context.cwd)
              : dependencies.resolveScopeRoot(
                  'user',
                  context.cwd,
                  context.home,
                );
          const assetsRoot = await dependencies.resolveAssetsRoot();
          const result = await dependencies.installProjectManagement({
            assetsRoot,
            targetRoot,
            force: options.force,
          });
          didInstall = true;

          let projectManagementGuidanceAction:
            | UpsertSectionResult['action']
            | undefined;
          let decisionGuidanceAction: UpsertSectionResult['action'] | undefined;
          let agentsGuidanceWarning: string | undefined;
          if (scope === 'project') {
            try {
              const projectManagementGuidanceResult =
                await upsertAgentsMdSection(
                  targetRoot,
                  PROJECT_MANAGEMENT_AGENTS_SECTION_KEY,
                  buildProjectManagementAgentsSectionBody(),
                );
              projectManagementGuidanceAction =
                projectManagementGuidanceResult.action;
              const decisionGuidanceResult = await upsertAgentsMdSection(
                targetRoot,
                DECISION_AGENTS_SECTION_KEY,
                buildDecisionAgentsSectionBody(),
              );
              decisionGuidanceAction = decisionGuidanceResult.action;
            } catch (error) {
              const message =
                error instanceof Error ? error.message : String(error);
              agentsGuidanceWarning = `Could not update AGENTS.md project-management guidance: ${message}`;
            }
          }

          if (context.json) {
            context.logger.json({
              status: 'ok',
              scope,
              targetRoot,
              assetsRoot,
              result,
              ...(agentsGuidanceWarning === undefined
                ? {}
                : { warnings: [agentsGuidanceWarning] }),
            });
          } else {
            context.logger.info('Installed project-management tool pack.');
            context.logger.info(`Target root: ${targetRoot}`);
            context.logger.info(
              `Skills: copied=${result.copiedSkills.length}, updated=${result.updatedSkills.length}, skipped=${result.skippedSkills.length}`,
            );
            context.logger.info(
              `Templates: copied=${result.copiedTemplates.length}, updated=${result.updatedTemplates.length}, skipped=${result.skippedTemplates.length}`,
            );
            if (
              projectManagementGuidanceAction !== undefined &&
              projectManagementGuidanceAction !== 'no-change'
            ) {
              context.logger.info(
                `AGENTS.md project-management section ${projectManagementGuidanceAction}.`,
              );
            }
            if (
              decisionGuidanceAction !== undefined &&
              decisionGuidanceAction !== 'no-change'
            ) {
              context.logger.info(
                `AGENTS.md decisions section ${decisionGuidanceAction}.`,
              );
            }
            if (agentsGuidanceWarning !== undefined) {
              context.logger.warn(agentsGuidanceWarning);
            }
            context.logger.info(`Run: oat sync --scope ${scope}`);
          }
          process.exitCode = 0;
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);
          const context = dependencies.buildCommandContext(
            readGlobalOptions(command),
          );
          if (context.json) {
            context.logger.json({ status: 'error', message });
          } else {
            context.logger.error(message);
          }
          process.exitCode = 1;
        }

        if (didInstall) {
          setInstalledCanonicalPaths(
            command,
            canonicalPathsForPack('project-management'),
          );
        }
      },
    );
}
