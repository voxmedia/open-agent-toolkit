import {
  buildCommandContext,
  type CommandContext,
  type GlobalOptions,
} from '@app/command-context';
import {
  PROJECT_SCOPES,
  type ProjectScope,
} from '@commands/shared/project-scope';
import { readGlobalOptions } from '@commands/shared/shared.utils';
import { CliError } from '@errors/cli-error';
import { Command, Option } from 'commander';

import {
  scaffoldProject as defaultScaffoldProject,
  type ProjectScaffoldMode,
  type ScaffoldProjectResult,
} from './scaffold';

const COMMIT_STATUS_MESSAGES = {
  skipped_disabled: 'Scaffold commit: skipped (--no-commit)',
  skipped_no_worktree: 'Scaffold commit: skipped (not a git work tree)',
  skipped_nothing: 'Scaffold commit: skipped (nothing to commit)',
} as const;

interface ProjectNewCommandOptions {
  mode: ProjectScaffoldMode;
  force: boolean;
  setActive: boolean;
  dashboard: boolean;
  commit: boolean;
  withProjectLog?: boolean;
  projectLog?: boolean;
  scope?: ProjectScope;
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
    commit: boolean;
    projectLog?: boolean;
    scope?: ProjectScope;
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
      scope: result.scope,
      ref: result.ref,
      sha: result.sha,
      projectPath: result.projectPath,
      projectsRoot: result.projectsRoot,
      createdFiles: result.createdFiles,
      skippedFiles: result.skippedFiles,
      activePointerUpdated: result.activePointerUpdated,
      dashboardRefreshed: result.dashboardRefreshed,
      committed: result.committed,
      scaffoldCommit: result.commitSha,
      commitSha: result.commitSha,
      commitStatus: result.commitStatus,
      commitError: result.commitError,
    });
    return;
  }

  context.logger.info(`Created/updated OAT project: ${projectName}`);
  context.logger.info(`Project path: ${result.projectPath}`);
  context.logger.info(`Scope: ${result.scope}`);
  if (result.ref) {
    context.logger.info(`Ref: ${result.ref}`);
  }
  if (result.activePointerUpdated) {
    context.logger.info(
      'Active project updated in local config: .oat/config.local.json',
    );
  }
  if (result.commitStatus === 'committed') {
    context.logger.info(
      `Scaffold commit: ${result.commitSha?.slice(0, 7) ?? 'committed'}`,
    );
  } else if (result.commitStatus === 'failed') {
    // The scaffold itself succeeded, so this is a warning, not an error: do not
    // change the process exit code. Make clear the baseline was NOT committed.
    const detail = result.commitError ? `: ${result.commitError}` : '';
    context.logger.warn(
      `Warning: scaffold commit failed${detail}. The scaffolded files were written but NOT committed.`,
    );
  } else {
    context.logger.info(COMMIT_STATUS_MESSAGES[result.commitStatus]);
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
      commit: options.commit,
      projectLog:
        options.withProjectLog === true
          ? true
          : options.projectLog === false
            ? false
            : undefined,
      scope: options.scope,
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
    process.exitCode = error instanceof CliError ? error.exitCode : 2;
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
        .choices(['spec-driven', 'quick', 'import'])
        .default('spec-driven'),
    )
    .addOption(
      new Option('--scope <scope>', 'Project scope').choices(PROJECT_SCOPES),
    )
    .option('--force', 'Non-destructive scaffold; create missing files only')
    .option('--no-set-active', 'Do not update active project in local config')
    .option('--no-dashboard', 'Do not refresh .oat/state.md after scaffold')
    .option('--no-commit', 'Do not git-commit the scaffolded project directory')
    .option(
      '--with-project-log',
      'Create project-log.md regardless of workflow.projectLog config',
    )
    .option(
      '--no-project-log',
      'Do not create project-log.md during scaffolding',
    )
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
