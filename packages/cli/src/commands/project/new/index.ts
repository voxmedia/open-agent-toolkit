import {
  buildCommandContext,
  type CommandContext,
  type GlobalOptions,
} from '@app/command-context';
import { readGlobalOptions } from '@commands/shared/shared.utils';
import { Command, Option } from 'commander';
import {
  scaffoldProject as defaultScaffoldProject,
  type ProjectScaffoldMode,
  type ScaffoldProjectResult,
} from './scaffold';

interface ProjectNewCommandOptions {
  mode: ProjectScaffoldMode;
  force: boolean;
  setActive: boolean;
  dashboard: boolean;
}

interface ProjectNewDependencies {
  buildCommandContext: (options: GlobalOptions) => CommandContext;
  scaffoldProject: (options: {
    repoRoot: string;
    projectName: string;
    mode: ProjectScaffoldMode;
    force: boolean;
    setActive: boolean;
    refreshDashboard: boolean;
  }) => Promise<ScaffoldProjectResult>;
}

const DEFAULT_DEPENDENCIES: ProjectNewDependencies = {
  buildCommandContext,
  scaffoldProject: defaultScaffoldProject,
};

function reportSuccess(
  context: CommandContext,
  projectName: string,
  result: ScaffoldProjectResult,
): void {
  if (context.json) {
    context.logger.json({
      status: 'ok',
      projectName,
      mode: result.mode,
      projectPath: result.projectPath,
      projectsRoot: result.projectsRoot,
      createdFiles: result.createdFiles,
      skippedFiles: result.skippedFiles,
      activePointerUpdated: result.activePointerUpdated,
      dashboardRefreshed: result.dashboardRefreshed,
    });
    return;
  }

  context.logger.info(`Created/updated OAT project: ${projectName}`);
  context.logger.info(`Project path: ${result.projectPath}`);
  if (result.activePointerUpdated) {
    context.logger.info('Active project pointer updated: .oat/active-project');
  }
}

async function runProjectNew(
  projectName: string,
  options: ProjectNewCommandOptions,
  context: CommandContext,
  dependencies: ProjectNewDependencies,
): Promise<void> {
  try {
    const result = await dependencies.scaffoldProject({
      repoRoot: context.cwd,
      projectName,
      mode: options.mode,
      force: options.force,
      setActive: options.setActive,
      refreshDashboard: options.dashboard,
    });

    reportSuccess(context, projectName, result);
    process.exitCode = 0;
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

export function createProjectNewCommand(
  overrides: Partial<ProjectNewDependencies> = {},
): Command {
  const dependencies: ProjectNewDependencies = {
    ...DEFAULT_DEPENDENCIES,
    ...overrides,
  };

  return new Command('new')
    .description('Create or update an OAT project scaffold')
    .argument('<name>', 'Project name (letters, numbers, dash, underscore)')
    .addOption(
      new Option('--mode <mode>', 'Scaffold mode')
        .choices(['full', 'quick', 'import'])
        .default('full'),
    )
    .option('--force', 'Non-destructive scaffold; create missing files only')
    .option('--no-set-active', 'Do not update .oat/active-project')
    .option('--no-dashboard', 'Do not refresh .oat/state.md after scaffold')
    .action(
      async (
        name: string,
        options: ProjectNewCommandOptions,
        command: Command,
      ) => {
        if (name.startsWith('-')) {
          command.help();
          return;
        }
        const context = dependencies.buildCommandContext(
          readGlobalOptions(command),
        );
        await runProjectNew(name, options, context, dependencies);
      },
    );
}
