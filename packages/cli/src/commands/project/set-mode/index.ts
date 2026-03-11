import {
  readFile as defaultReadFile,
  writeFile as defaultWriteFile,
} from 'node:fs/promises';
import { join } from 'node:path';

import { buildCommandContext, type CommandContext } from '@app/command-context';
import {
  getFrontmatterBlock,
  getFrontmatterField,
} from '@commands/shared/frontmatter';
import {
  replaceFrontmatter,
  upsertFrontmatterField,
} from '@commands/shared/frontmatter-write';
import { readGlobalOptions } from '@commands/shared/shared.utils';
import { readOatLocalConfig } from '@config/oat-config';
import { resolveProjectRoot } from '@fs/paths';
import { Command } from 'commander';

export type ExecutionMode = 'single-thread' | 'subagent-driven';

interface SetModeDependencies {
  buildCommandContext: (
    options: Parameters<typeof buildCommandContext>[0],
  ) => CommandContext;
  resolveProjectRoot: (cwd: string) => Promise<string>;
  readFile: typeof defaultReadFile;
  writeFile: typeof defaultWriteFile;
  now: () => Date;
}

const ORCHESTRATION_DEFAULTS = [
  { field: 'oat_orchestration_merge_strategy', value: 'merge' },
  { field: 'oat_orchestration_retry_limit', value: '2' },
  { field: 'oat_orchestration_baseline_policy', value: 'strict' },
  { field: 'oat_orchestration_unit_granularity', value: 'phase' },
] as const;

const DEFAULT_DEPENDENCIES: SetModeDependencies = {
  buildCommandContext,
  resolveProjectRoot,
  readFile: defaultReadFile,
  writeFile: defaultWriteFile,
  now: () => new Date(),
};

function isExecutionMode(value: string): value is ExecutionMode {
  return value === 'single-thread' || value === 'subagent-driven';
}

async function runSetMode(
  modeArg: string,
  context: CommandContext,
  dependencies: SetModeDependencies,
): Promise<void> {
  try {
    if (!isExecutionMode(modeArg)) {
      throw new Error(
        `Invalid mode: ${modeArg}. Expected one of: single-thread, subagent-driven.`,
      );
    }

    const repoRoot = await dependencies.resolveProjectRoot(context.cwd);
    const localConfig = await readOatLocalConfig(repoRoot);
    const activeProject = localConfig.activeProject?.trim();

    if (!activeProject) {
      throw new Error(
        'No active project found (.oat/config.local.json has no activeProject).',
      );
    }

    const activeProjectPath = join(repoRoot, activeProject);
    const statePath = join(activeProjectPath, 'state.md');

    let stateContent: string;
    try {
      stateContent = await dependencies.readFile(statePath, 'utf8');
    } catch {
      throw new Error(`Active project state.md not found: ${statePath}`);
    }

    const frontmatterBlock = getFrontmatterBlock(stateContent);
    if (!frontmatterBlock) {
      throw new Error(`state.md is missing frontmatter: ${statePath}`);
    }

    const previousMode = getFrontmatterField(
      frontmatterBlock,
      'oat_execution_mode',
    );

    let currentBlock = frontmatterBlock;
    const modeUpdate = upsertFrontmatterField(
      currentBlock,
      'oat_execution_mode',
      modeArg,
      true,
    );
    currentBlock = modeUpdate.nextBlock;

    const defaultsAdded: string[] = [];
    if (modeArg === 'subagent-driven') {
      for (const entry of ORCHESTRATION_DEFAULTS) {
        const update = upsertFrontmatterField(
          currentBlock,
          entry.field,
          entry.value,
          false,
        );
        currentBlock = update.nextBlock;
        if (update.added) {
          defaultsAdded.push(entry.field);
        }
      }
    }

    currentBlock = upsertFrontmatterField(
      currentBlock,
      'oat_project_state_updated',
      dependencies.now().toISOString(),
      true,
    ).nextBlock;

    const updatedState = replaceFrontmatter(stateContent, currentBlock);
    await dependencies.writeFile(statePath, updatedState, 'utf8');

    if (context.json) {
      context.logger.json({
        status: 'ok',
        mode: modeArg,
        previousMode: previousMode || null,
        statePath,
        projectPath: activeProjectPath,
        defaultsAdded,
      });
    } else {
      context.logger.info(`Set execution mode to ${modeArg}`);
      context.logger.info(`Project: ${activeProjectPath}`);
      context.logger.info(`State: ${statePath}`);
      if (modeArg === 'subagent-driven') {
        if (defaultsAdded.length > 0) {
          context.logger.info(
            `Added orchestration defaults: ${defaultsAdded.join(', ')}`,
          );
        } else {
          context.logger.info(
            'Orchestration defaults already present; no defaults added.',
          );
        }
      }
    }

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

export function createProjectSetModeCommand(
  overrides: Partial<SetModeDependencies> = {},
): Command {
  const dependencies: SetModeDependencies = {
    ...DEFAULT_DEPENDENCIES,
    ...overrides,
  };

  return new Command('set-mode')
    .description('Set project implementation execution mode')
    .argument('<mode>', 'Execution mode: single-thread or subagent-driven')
    .action(async (mode: string, _options: unknown, command: Command) => {
      const context = dependencies.buildCommandContext(
        readGlobalOptions(command),
      );
      await runSetMode(mode, context, dependencies);
    });
}
