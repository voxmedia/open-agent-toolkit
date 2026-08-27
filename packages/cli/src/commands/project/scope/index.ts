import { basename, isAbsolute, join, relative, resolve, sep } from 'node:path';

import {
  buildCommandContext,
  type CommandContext,
  type GlobalOptions,
} from '@app/command-context';
import { readSyncedRecord } from '@commands/project/sync/record';
import { resolveProjectsRoot } from '@commands/shared/oat-paths';
import {
  isSyncedCheckout,
  resolveProjectScope,
  resolveProjectsParent,
  resolveScopeRoot,
  syncedRecordPath,
} from '@commands/shared/project-scope';
import { readGlobalOptions } from '@commands/shared/shared.utils';
import { readOatLocalConfig, type OatLocalConfig } from '@config/oat-config';
import { CliError } from '@errors/cli-error';
import { resolveProjectRoot } from '@fs/paths';
import { Command, Option } from 'commander';

interface ProjectScopeOptions {
  format?: 'json' | 'value';
}

interface ProjectScopeDependencies {
  buildCommandContext: (options: GlobalOptions) => CommandContext;
  resolveProjectRoot: (cwd: string) => Promise<string>;
  resolveProjectsRoot: (
    repoRoot: string,
    env: NodeJS.ProcessEnv,
  ) => Promise<string>;
  readOatLocalConfig: (repoRoot: string) => Promise<OatLocalConfig>;
  readSyncedRecord: typeof readSyncedRecord;
  isSyncedCheckout: typeof isSyncedCheckout;
  processEnv: NodeJS.ProcessEnv;
}

const DEFAULT_DEPENDENCIES: ProjectScopeDependencies = {
  buildCommandContext,
  resolveProjectRoot,
  resolveProjectsRoot,
  readOatLocalConfig,
  readSyncedRecord,
  isSyncedCheckout,
  processEnv: process.env,
};

function isWithin(root: string, candidate: string): boolean {
  const child = relative(root, candidate);
  return (
    child === '' ||
    (child !== '..' && !child.startsWith(`..${sep}`) && !isAbsolute(child))
  );
}

async function runProjectScope(
  context: CommandContext,
  pathArg: string | undefined,
  options: ProjectScopeOptions,
  dependencies: ProjectScopeDependencies,
): Promise<void> {
  try {
    const repoRoot = await dependencies.resolveProjectRoot(context.cwd);
    const projectsRoot = await dependencies.resolveProjectsRoot(
      repoRoot,
      dependencies.processEnv,
    );
    const configuredRoot = isAbsolute(projectsRoot)
      ? resolve(projectsRoot)
      : resolve(repoRoot, projectsRoot);
    const configuredParent = resolveProjectsParent(repoRoot, projectsRoot);
    const archivedRoot = join(configuredParent, 'archived');

    let target = pathArg;
    if (!target) {
      target =
        (await dependencies.readOatLocalConfig(repoRoot)).activeProject ??
        undefined;
      if (!target) {
        throw new CliError('No active project is configured.', 1);
      }
    }
    const absoluteProjectPath = isAbsolute(target)
      ? resolve(target)
      : resolve(repoRoot, target);
    if (isWithin(archivedRoot, absoluteProjectPath)) {
      throw new CliError(
        'Archived projects have no active project scope. Restore or open a live project instead.',
        1,
      );
    }

    const scope = resolveProjectScope(absoluteProjectPath, configuredRoot);
    if (!scope) {
      throw new CliError(
        `Project path is outside the shared, local, and synced scope roots: ${target}`,
        1,
      );
    }

    const projectPath = relative(repoRoot, absoluteProjectPath)
      .split(sep)
      .join('/');
    const payload: Record<string, unknown> = {
      status: 'ok',
      projectPath,
      scope,
      checkout: 'n/a',
    };
    if (scope === 'synced') {
      const slug = basename(absoluteProjectPath);
      const scopeRoot = resolveScopeRoot(repoRoot, projectsRoot, 'synced');
      const record = await dependencies.readSyncedRecord(
        syncedRecordPath(scopeRoot, slug),
      );
      payload['ref'] = record?.ref;
      payload['record'] = record ?? undefined;
      payload['checkout'] = (await dependencies.isSyncedCheckout(
        absoluteProjectPath,
      ))
        ? 'present'
        : 'absent';
    }

    if (options.format === 'value') {
      context.logger.info(scope);
    } else if (context.json || options.format === 'json') {
      context.logger.json(payload);
    } else {
      context.logger.info(`Project: ${projectPath}`);
      context.logger.info(`Scope: ${scope}`);
    }
    process.exitCode = 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (context.json || options.format === 'json') {
      context.logger.json({ status: 'error', message });
    } else {
      context.logger.error(message);
    }
    process.exitCode = error instanceof CliError ? error.exitCode : 2;
  }
}

export function createProjectScopeCommand(
  overrides: Partial<ProjectScopeDependencies> = {},
): Command {
  const dependencies = { ...DEFAULT_DEPENDENCIES, ...overrides };
  return new Command('scope')
    .description('Report the scope of an OAT project')
    .argument('[project-path]', 'Project path; defaults to activeProject')
    .addOption(
      new Option('--format <format>', 'Output format').choices([
        'json',
        'value',
      ]),
    )
    .action(
      async (
        projectPath: string | undefined,
        options: ProjectScopeOptions,
        command: Command,
      ) => {
        const context = dependencies.buildCommandContext(
          readGlobalOptions(command),
        );
        await runProjectScope(context, projectPath, options, dependencies);
      },
    );
}
