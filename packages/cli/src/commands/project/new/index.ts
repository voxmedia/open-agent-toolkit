import { join } from 'node:path';

import {
  buildCommandContext,
  type CommandContext,
  type GlobalOptions,
} from '@app/command-context';
import { validatePurpose } from '@commands/project/linked/ledger';
import {
  assertLinkable,
  recordLink,
  resolveLinkParent,
} from '@commands/project/linked/link';
import { ORCHESTRATOR_SET_COMMAND } from '@commands/project/orchestrator/branch';
import type { NamedProject } from '@commands/project/resolve-named-project';
import { resolveProjectsRoot } from '@commands/shared/oat-paths';
import {
  PROJECT_SCOPES,
  resolveDefaultScope,
  resolveScopeRoot,
  type ProjectScope,
} from '@commands/shared/project-scope';
import { readGlobalOptions } from '@commands/shared/shared.utils';
import { shellQuote } from '@commands/shared/shell-quote';
import { CliError } from '@errors/cli-error';
import { fileExists } from '@fs/io';
import {
  WORKFLOW_MODES,
  type WorkflowMode,
} from '@open-agent-toolkit/control-plane';
import { Command, Option } from 'commander';

import {
  scaffoldProject as defaultScaffoldProject,
  type ScaffoldProjectResult,
} from './scaffold';

const COMMIT_STATUS_MESSAGES = {
  skipped_disabled: 'Scaffold commit: skipped (--no-commit)',
  skipped_local_scope:
    'Scaffold commit: skipped (local-scope projects are gitignored and never committed)',
  skipped_no_worktree: 'Scaffold commit: skipped (not a git work tree)',
  skipped_nothing: 'Scaffold commit: skipped (nothing to commit)',
} as const;

interface ProjectNewCommandOptions {
  mode: WorkflowMode;
  force: boolean;
  setActive: boolean;
  dashboard: boolean;
  commit: boolean;
  withProjectLog?: boolean;
  projectLog?: boolean;
  scope?: ProjectScope;
  linkTo?: string;
  purpose?: string;
}

/** The parent a `--link-to` child is linked to, and the row it records. */
interface LinkedCreation {
  parent: NamedProject;
  purpose: string;
  ledgerPath?: string;
}

interface ProjectNewDependencies {
  buildCommandContext: (options: GlobalOptions) => CommandContext;
  scaffoldProject: (options: {
    repoRoot: string;
    projectName: string;
    mode: WorkflowMode;
    force: boolean;
    setActive: boolean;
    refreshDashboard: boolean;
    commit: boolean;
    projectLog?: boolean;
    scope?: ProjectScope;
    linkedFrom?: string;
  }) => Promise<ScaffoldProjectResult>;
}

const DEFAULT_DEPENDENCIES: ProjectNewDependencies = {
  buildCommandContext,
  scaffoldProject: defaultScaffoldProject,
};

/** The skill that creates, shapes and reshapes a freestyle project. */
const FREESTYLE_SKILL = 'oat-project-freestyle';

/**
 * Freestyle's two scaffolded guidance files, named in creation output because
 * they sit in the project folder rather than above the code.
 */
function freestyleProjectFiles(projectPath: string): {
  agents: string;
  shape: string;
} {
  return {
    agents: `${projectPath}/AGENTS.md`,
    shape: `${projectPath}/shape.md`,
  };
}

function reportSuccess(
  context: CommandContext,
  projectName: string,
  result: ScaffoldProjectResult,
  link?: LinkedCreation,
): void {
  const freestyle =
    result.mode === 'freestyle'
      ? {
          projectFiles: freestyleProjectFiles(result.projectPath),
          nextSkill: FREESTYLE_SKILL,
          ...(result.orchestratorBranch !== undefined
            ? { orchestratorBranch: result.orchestratorBranch }
            : {}),
        }
      : undefined;
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
      ...freestyle,
      ...(link
        ? {
            linkedTo: {
              project: link.parent.name,
              projectPath: link.parent.projectPath,
              ledgerPath: link.ledgerPath,
            },
          }
        : {}),
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
  if (freestyle) {
    context.logger.info(
      `Project rules: ${freestyle.projectFiles.agents} (OAT-owned; read shape.md first)`,
    );
    context.logger.info(
      `Project shape: ${freestyle.projectFiles.shape} (not yet shaped)`,
    );
    // The parent stays the active project, so a bare claim would name it; the
    // path, unlike the name, is unambiguous across scopes.
    const claimCommand = `${ORCHESTRATOR_SET_COMMAND} --project ${shellQuote(result.projectPath)}`;
    if (freestyle.orchestratorBranch !== undefined) {
      context.logger.info(
        freestyle.orchestratorBranch === null
          ? `Orchestrator branch: unclaimed (the orchestrator claims it with \`${claimCommand}\`)`
          : `Orchestrator branch: ${freestyle.orchestratorBranch}`,
      );
    }
    if (link) {
      context.logger.info(
        `Linked to ${link.parent.name}: open row in ${link.ledgerPath} (not committed or pushed; the parent's orchestrator saves it as the parent's shape.md agrees)`,
      );
      context.logger.info(
        `Next: hand ${projectName} to its own orchestrator session, which claims it with \`${claimCommand}\` and then shapes it through the ${FREESTYLE_SKILL} skill.`,
      );
    } else {
      context.logger.info(
        `Next: shape the project with the user through the ${FREESTYLE_SKILL} skill.`,
      );
    }
  }
}

/**
 * Before any write, check a `--link-to` request: the child is freestyle, the
 * purpose is one line, the parent is a freestyle project this checkout
 * orchestrates, the parent has no open link of that name, and the child is
 * new (an existing project is linked with `linked add`).
 */
async function prepareLinkedCreation(
  projectName: string,
  options: ProjectNewCommandOptions,
  repoRoot: string,
): Promise<LinkedCreation | undefined> {
  if (options.linkTo === undefined) {
    if (options.purpose !== undefined) {
      throw new CliError('--purpose is only used with --link-to.', 1);
    }
    return undefined;
  }
  if (options.mode !== 'freestyle') {
    throw new CliError(
      '--link-to creates a freestyle child of a freestyle parent; pass --mode freestyle.',
      1,
    );
  }
  const purpose = validatePurpose(options.purpose);
  const parent = await resolveLinkParent({
    repoRoot,
    parent: options.linkTo,
    action: `link ${projectName} to ${options.linkTo}`,
  });
  await assertLinkable(parent, projectName);
  const scope =
    options.scope ?? (await resolveDefaultScope(repoRoot, process.env));
  const scopeRoot = resolveScopeRoot(
    repoRoot,
    await resolveProjectsRoot(repoRoot, process.env),
    scope,
  );
  // `state.md` marks a project, as the link resolver reads it; a folder of
  // preparatory notes is not one.
  if (await fileExists(join(scopeRoot, projectName, 'state.md'))) {
    throw new CliError(
      `Project ${projectName} already exists in ${scope} scope; --link-to creates a new child. Link the existing project with: oat project linked add ${projectName} --project ${shellQuote(parent.projectPath)} --purpose <text>`,
      1,
    );
  }
  return { parent, purpose };
}

async function runProjectNew(
  projectName: string,
  options: ProjectNewCommandOptions,
  context: CommandContext,
  dependencies: ProjectNewDependencies,
): Promise<void> {
  try {
    const link = await prepareLinkedCreation(projectName, options, context.cwd);
    const result = await dependencies.scaffoldProject({
      repoRoot: context.cwd,
      projectName,
      mode: options.mode,
      force: options.force,
      // The parent's orchestrator creates a linked child but does not run it,
      // so its active project stays the parent.
      setActive: link ? false : options.setActive,
      refreshDashboard: options.dashboard,
      commit: options.commit,
      projectLog:
        options.withProjectLog === true
          ? true
          : options.projectLog === false
            ? false
            : undefined,
      scope: options.scope,
      ...(link ? { linkedFrom: link.parent.name } : {}),
    });

    if (link) {
      try {
        link.ledgerPath = (
          await recordLink({
            parent: link.parent,
            child: {
              name: projectName,
              path: result.projectPath,
              scope: result.scope,
            },
            purpose: link.purpose,
            today: new Date().toISOString().slice(0, 10),
          })
        ).ledgerPath;
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        throw new CliError(
          `Created ${projectName} at ${result.projectPath}, but the parent's link row was not written: ${detail}. Record it with: oat project linked add ${projectName} --project ${link.parent.projectPath} --purpose <text>`,
          error instanceof CliError ? error.exitCode : 2,
        );
      }
    }

    reportSuccess(context, projectName, result, link);
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
        .choices([...WORKFLOW_MODES])
        .default('spec-driven'),
    )
    .addOption(
      new Option('--scope <scope>', 'Project scope').choices(PROJECT_SCOPES),
    )
    .option(
      '--force',
      'Allow a duplicate slug in another scope; scaffold remains non-destructive',
    )
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
    .option(
      '--link-to <parent>',
      'Freestyle only: create a linked child of this parent (name or path); the child starts unclaimed and the parent gets an open row in its linked-projects.md',
    )
    .option(
      '--purpose <text>',
      'With --link-to: the one-line purpose recorded in the parent row',
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
