import { readFile as defaultReadFile } from 'node:fs/promises';
import { isAbsolute, join } from 'node:path';

import { buildCommandContext, type CommandContext } from '@app/command-context';
import { readGlobalOptions } from '@commands/shared/shared.utils';
import { resolveEffectiveConfig } from '@config/resolve';
import { CliError } from '@errors/cli-error';
import { dirExists, fileExists } from '@fs/io';
import { resolveProjectRoot } from '@fs/paths';
import { Command } from 'commander';

import {
  evaluateCloseout,
  formatCloseoutRefusal,
  type CloseoutResult,
} from './closeout-invariant';

export {
  evaluateCloseout,
  formatCloseoutRefusal,
  type CloseoutResult,
} from './closeout-invariant';

export interface CloseoutCheckDependencies {
  buildCommandContext: (
    options: Parameters<typeof buildCommandContext>[0],
  ) => CommandContext;
  resolveProjectRoot: (cwd: string) => Promise<string>;
  resolveEffectiveConfig: typeof resolveEffectiveConfig;
  readFile: typeof defaultReadFile;
  dirExists: typeof dirExists;
  fileExists: typeof fileExists;
  /**
   * Environment read for `OAT_AUTONOMOUS`. Injectable so a caller that forgets
   * `--autonomous` under `OAT_AUTONOMOUS=1` still cannot fail open.
   */
  env: NodeJS.ProcessEnv;
}

export const DEFAULT_CLOSEOUT_CHECK_DEPENDENCIES: CloseoutCheckDependencies = {
  buildCommandContext,
  resolveProjectRoot,
  resolveEffectiveConfig,
  readFile: defaultReadFile,
  dirExists,
  fileExists,
  env: process.env,
};

export interface ProjectCloseoutCheck {
  repoRoot: string;
  targetProjectPath: string;
  statePath: string;
  stateContent: string;
  result: CloseoutResult;
}

/**
 * Resolve a project, read its `state.md` from disk, and evaluate the closeout
 * invariant. Shared by `closeout-check` and `complete-state` so both read the
 * same inputs and print the same refusal.
 */
export async function checkProjectCloseout(
  projectPath: string,
  options: { autonomous: boolean },
  context: CommandContext,
  dependencies: Pick<
    CloseoutCheckDependencies,
    | 'resolveProjectRoot'
    | 'resolveEffectiveConfig'
    | 'readFile'
    | 'dirExists'
    | 'fileExists'
    | 'env'
  >,
): Promise<ProjectCloseoutCheck> {
  const repoRoot = await dependencies.resolveProjectRoot(context.cwd);
  const targetProjectPath = isAbsolute(projectPath)
    ? projectPath
    : join(repoRoot, projectPath);

  if (!(await dependencies.dirExists(targetProjectPath))) {
    throw new CliError(`Project not found: ${projectPath}`, 1);
  }
  const statePath = join(targetProjectPath, 'state.md');
  if (!(await dependencies.fileExists(statePath))) {
    throw new CliError(`Project state.md not found: ${statePath}`, 1);
  }

  const stateContent = await dependencies.readFile(statePath, 'utf8');
  const result = await evaluateCloseout({
    stateContent,
    autonomousFlag: options.autonomous,
    env: dependencies.env,
    resolveConfigured: async () => {
      const effective = await dependencies.resolveEffectiveConfig(
        repoRoot,
        join(context.home, '.oat'),
        dependencies.env,
      );
      const value = effective.resolved['workflow.postImplementSequence']?.value;
      return value !== null && value !== undefined;
    },
  });

  return { repoRoot, targetProjectPath, statePath, stateContent, result };
}

async function runCloseoutCheck(
  projectPath: string,
  options: { autonomous?: boolean },
  context: CommandContext,
  dependencies: CloseoutCheckDependencies,
): Promise<void> {
  try {
    const { result } = await checkProjectCloseout(
      projectPath,
      { autonomous: options.autonomous ?? false },
      context,
      dependencies,
    );

    if (result.status === 'incomplete') {
      const message = formatCloseoutRefusal(projectPath, result);
      if (context.json) {
        context.logger.json({
          status: 'incomplete',
          projectPath,
          invariant: result.invariant,
          detail: result.detail,
          route: result.route,
          nextOwner: result.nextOwner,
          inputs: result.inputs,
          message,
        });
      } else {
        context.logger.info(message);
      }
      // Fail closed: a caller that ignores the JSON still stops.
      process.exitCode = 1;
      return;
    }

    if (context.json) {
      context.logger.json({
        status: result.status,
        projectPath,
        invariant: null,
        route: null,
        nextOwner: null,
        inputs: result.inputs,
      });
    } else if (result.status === 'complete') {
      context.logger.info(
        `Closeout invariant satisfied for ${projectPath}: every stored step and the approval are recorded complete.`,
      );
    } else {
      context.logger.info(
        `Closeout invariant not required for ${projectPath}: no snapshot, and the closeout is not configured, autonomous, or lite.`,
      );
    }
    process.exitCode = 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (context.json) {
      context.logger.json({ status: 'error', message });
    } else {
      context.logger.error(message);
    }
    process.exitCode = error instanceof CliError ? error.exitCode : 1;
  }
}

export function createProjectCloseoutCheckCommand(
  overrides: Partial<CloseoutCheckDependencies> = {},
): Command {
  const dependencies = {
    ...DEFAULT_CLOSEOUT_CHECK_DEPENDENCIES,
    ...overrides,
  };

  return new Command('closeout-check')
    .description(
      'Report whether a project closeout snapshot permits terminal completion (read-only)',
    )
    .argument('<project-path>', 'Project path to check')
    .option(
      '--autonomous',
      'Treat the closeout as autonomous (also implied by OAT_AUTONOMOUS=1)',
    )
    .action(
      async (
        projectPath: string,
        options: { autonomous?: boolean },
        command: Command,
      ) => {
        const context = dependencies.buildCommandContext(
          readGlobalOptions(command),
        );
        await runCloseoutCheck(projectPath, options, context, dependencies);
      },
    );
}
