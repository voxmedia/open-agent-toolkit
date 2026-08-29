import { basename, dirname, isAbsolute, resolve } from 'node:path';

import {
  buildCommandContext,
  type CommandContext,
  type GlobalOptions,
} from '@app/command-context';
import { defaultGitRunner, type GitRunner } from '@commands/project/sync/git';
import {
  assertConfinedMigrationSource,
  buildSyncTarget,
  migrateSharedToSynced,
  type MigrateResult,
  type SyncTarget,
} from '@commands/project/sync/ref-sync';
import { resolveProjectsRoot } from '@commands/shared/oat-paths';
import {
  resolveProjectScope,
  resolveScopeRoot,
} from '@commands/shared/project-scope';
import { readGlobalOptions } from '@commands/shared/shared.utils';
import { CliError } from '@errors/cli-error';
import { resolveProjectRoot } from '@fs/paths';
import { Command } from 'commander';

interface ProjectMigrateOptions {
  to: string;
  commit: boolean;
}

interface ProjectMigrateDependencies {
  buildCommandContext: (options: GlobalOptions) => CommandContext;
  resolveProjectRoot: (cwd: string) => Promise<string>;
  resolveProjectsRoot: typeof resolveProjectsRoot;
  assertConfinedMigrationSource: typeof assertConfinedMigrationSource;
  migrateSharedToSynced: (
    target: SyncTarget,
    git: GitRunner,
    options: { sourcePath: string; commit: boolean; now: Date },
  ) => Promise<MigrateResult>;
  gitRunner: GitRunner;
  processEnv: NodeJS.ProcessEnv;
  now: () => Date;
}

const DEFAULT_DEPENDENCIES: ProjectMigrateDependencies = {
  buildCommandContext,
  resolveProjectRoot,
  resolveProjectsRoot,
  assertConfinedMigrationSource,
  migrateSharedToSynced,
  gitRunner: defaultGitRunner,
  processEnv: process.env,
  now: () => new Date(),
};

async function runMigrate(
  context: CommandContext,
  projectPath: string,
  options: ProjectMigrateOptions,
  dependencies: ProjectMigrateDependencies,
): Promise<void> {
  try {
    if (options.to !== 'synced') {
      throw new CliError(
        `Migration to ${options.to} is not supported in v1; only --to synced is available.`,
        1,
      );
    }
    const repoRoot = await dependencies.resolveProjectRoot(context.cwd);
    const projectsRoot = await dependencies.resolveProjectsRoot(
      repoRoot,
      dependencies.processEnv,
    );
    const sourcePath = isAbsolute(projectPath)
      ? resolve(projectPath)
      : resolve(repoRoot, projectPath);
    const sharedRoot = resolveScopeRoot(repoRoot, projectsRoot, 'shared');
    if (
      resolveProjectScope(sourcePath, sharedRoot) !== 'shared' ||
      dirname(sourcePath) !== sharedRoot
    ) {
      throw new CliError(
        `Project ${projectPath} must be a direct child in shared scope.`,
        1,
      );
    }
    const slug = basename(sourcePath);
    const target = buildSyncTarget(repoRoot, projectsRoot, slug);
    await dependencies.assertConfinedMigrationSource(target, sourcePath);
    const result = await dependencies.migrateSharedToSynced(
      target,
      dependencies.gitRunner,
      {
        sourcePath,
        commit: options.commit,
        now: dependencies.now(),
      },
    );
    const payload = {
      ...result,
      sourcePath,
      projectPath: target.projectPath,
      ref: target.ref,
    };
    if (context.json) context.logger.json(payload);
    else context.logger.info(`Migrated ${slug} to synced scope.`);
    process.exitCode = 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (context.json) context.logger.json({ status: 'error', message });
    else context.logger.error(message);
    process.exitCode = error instanceof CliError ? error.exitCode : 2;
  }
}

export function createProjectMigrateCommand(
  overrides: Partial<ProjectMigrateDependencies> = {},
): Command {
  const dependencies = { ...DEFAULT_DEPENDENCIES, ...overrides };
  return new Command('migrate')
    .description('Migrate a shared OAT project to synced scope')
    .argument('<project-path>', 'Shared project path')
    .requiredOption('--to <scope>', 'Destination scope')
    .option('--no-commit', 'Do not commit parent-branch changes')
    .action(
      async (
        projectPath: string,
        options: ProjectMigrateOptions,
        command: Command,
      ) => {
        const context = dependencies.buildCommandContext(
          readGlobalOptions(command),
        );
        await runMigrate(context, projectPath, options, dependencies);
      },
    );
}
