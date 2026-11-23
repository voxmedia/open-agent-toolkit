import {
  buildCommandContext,
  type CommandContext,
  type GlobalOptions,
} from '@app/command-context';
import { defaultGitRunner, type GitRunner } from '@commands/project/sync/git';
import { readGlobalOptions } from '@commands/shared/shared.utils';
import { CliError } from '@errors/cli-error';
import { resolveProjectRoot } from '@fs/paths';
import { Command } from 'commander';

import { ackLinkedProject, addLinkedProject } from './link';

interface LinkedDependencies {
  buildCommandContext: (options: GlobalOptions) => CommandContext;
  resolveProjectRoot: (cwd: string) => Promise<string>;
  gitRunner: GitRunner;
  now: () => Date;
}

const DEFAULT_DEPENDENCIES: LinkedDependencies = {
  buildCommandContext,
  resolveProjectRoot,
  gitRunner: defaultGitRunner,
  now: () => new Date(),
};

const SAVE_HINT =
  "Nothing was committed or pushed: save it as the parent's shape.md agrees, by the records rule for its scope in its AGENTS.md.";

function reportError(context: CommandContext, error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  if (context.json) {
    context.logger.json({ status: 'error', message });
  } else {
    context.logger.error(message);
  }
  process.exitCode = error instanceof CliError ? error.exitCode : 2;
}

function today(dependencies: LinkedDependencies): string {
  return dependencies.now().toISOString().slice(0, 10);
}

function createAddCommand(dependencies: LinkedDependencies): Command {
  return new Command('add')
    .description(
      "Link an existing freestyle project: open a row in the parent's linked-projects.md",
    )
    .argument('<child>', 'Linked project name or path')
    .requiredOption('--purpose <text>', 'One-line purpose of the link')
    .option(
      '--project <name-or-path>',
      'Parent project; defaults to the active project',
    )
    .action(
      async (
        child: string,
        options: { purpose: string; project?: string },
        command: Command,
      ) => {
        const context = dependencies.buildCommandContext(
          readGlobalOptions(command),
        );
        try {
          const repoRoot = await dependencies.resolveProjectRoot(context.cwd);
          const result = await addLinkedProject({
            repoRoot,
            parent: options.project,
            child,
            purpose: options.purpose,
            today: today(dependencies),
            git: dependencies.gitRunner,
          });
          if (context.json) {
            context.logger.json({
              status: 'ok',
              parent: result.parent.name,
              ledgerPath: result.ledgerPath,
              row: result.row,
            });
          } else {
            context.logger.info(
              `Linked ${result.row.name} (${result.row.scope}, ${result.row.path}) to ${result.parent.name}: open row in ${result.ledgerPath}`,
            );
            context.logger.info(SAVE_HINT);
          }
          process.exitCode = 0;
        } catch (error) {
          reportError(context, error);
        }
      },
    );
}

function createAckCommand(dependencies: LinkedDependencies): Command {
  return new Command('ack')
    .description(
      'Acknowledge a linked project: close its row and attempt a structural log entry',
    )
    .argument('<child>', 'Linked project name or path')
    .option(
      '--project <name-or-path>',
      'Parent project; defaults to the active project',
    )
    .action(
      async (
        child: string,
        options: { project?: string },
        command: Command,
      ) => {
        const context = dependencies.buildCommandContext(
          readGlobalOptions(command),
        );
        try {
          const repoRoot = await dependencies.resolveProjectRoot(context.cwd);
          const result = await ackLinkedProject({
            repoRoot,
            home: context.home,
            parent: options.project,
            child,
            today: today(dependencies),
            git: dependencies.gitRunner,
          });
          if (context.json) {
            context.logger.json({
              status: 'ok',
              parent: result.parent.name,
              ledgerPath: result.ledgerPath,
              row: result.row,
              log: result.log,
            });
          } else {
            context.logger.info(
              `Acknowledged ${result.row.name}: closed its row in ${result.ledgerPath}`,
            );
            if (result.log.status === 'failed') {
              context.logger.warn(
                `Warning: the row is closed, but the project-log entry failed: ${result.log.message}`,
              );
            } else if (result.log.status === 'skipped') {
              context.logger.info(
                'Project log: skipped (the project log is disabled)',
              );
            } else {
              context.logger.info(
                `Project log: ${result.log.status} (${result.log.heading})`,
              );
            }
            context.logger.info(SAVE_HINT);
          }
          process.exitCode = 0;
        } catch (error) {
          reportError(context, error);
        }
      },
    );
}

export function createProjectLinkedCommand(
  overrides: Partial<LinkedDependencies> = {},
): Command {
  const dependencies = { ...DEFAULT_DEPENDENCIES, ...overrides };
  return new Command('linked')
    .description(
      "Manage a freestyle project's linked projects (not reviewer links; see `oat project links`)",
    )
    .addCommand(createAddCommand(dependencies))
    .addCommand(createAckCommand(dependencies));
}
