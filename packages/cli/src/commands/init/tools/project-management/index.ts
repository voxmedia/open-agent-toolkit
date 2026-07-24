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
import { readGlobalOptions } from '@commands/shared/shared.utils';
import {
  canonicalPathsForPack,
  setInstalledCanonicalPaths,
} from '@commands/tools/shared/install-sync-context';
import { resolveAssetsRoot } from '@fs/assets';
import { resolveProjectRoot } from '@fs/paths';
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
  resolveAssetsRoot: () => Promise<string>;
  installProjectManagement: (
    options: InstallProjectManagementOptions,
  ) => Promise<InstallProjectManagementResult>;
}

const DEFAULT_DEPENDENCIES: InitToolsProjectManagementDependencies = {
  buildCommandContext,
  resolveProjectRoot,
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

  return new Command('project-management')
    .description('Install OAT project-management skills and templates')
    .option('--force', 'Overwrite existing files where applicable')
    .action(
      async (options: InitToolsProjectManagementOptions, command: Command) => {
        // project-management always installs at project scope. If the caller
        // explicitly passed a conflicting --scope on an ancestor (init or tools
        // install), reject it rather than silently ignoring it. A matching
        // --scope project, or no explicit --scope, proceeds unchanged.
        if (command.getOptionValueSourceWithGlobals('scope') === 'cli') {
          const opts = command.optsWithGlobals() as { scope?: string };
          if (opts.scope !== 'project') {
            const context = dependencies.buildCommandContext(
              readGlobalOptions(command),
            );
            const msg =
              'the project-management pack always installs at project scope; remove --scope or pass --scope project';
            if (context.json) {
              context.logger.json({ status: 'error', message: msg });
            } else {
              context.logger.error(msg);
            }
            process.exitCode = 1;
            return;
          }
        }

        let didInstall = false;
        try {
          const context = dependencies.buildCommandContext(
            readGlobalOptions(command),
          );
          const targetRoot = await dependencies.resolveProjectRoot(context.cwd);
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
          try {
            const projectManagementGuidanceResult = await upsertAgentsMdSection(
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

          if (context.json) {
            context.logger.json({
              status: 'ok',
              scope: 'project',
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
            context.logger.info('Run: oat sync --scope project');
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
