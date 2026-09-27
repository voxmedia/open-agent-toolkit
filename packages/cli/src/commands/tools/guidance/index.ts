import { buildCommandContext, type CommandContext } from '@app/command-context';
import { loadRealizedGuidancePacks } from '@commands/init/tools';
import {
  type ProjectGuidancePack,
  renderToolPacksManagedBlock,
} from '@commands/init/tools/project-guidance';
import { readGlobalOptions } from '@commands/shared/shared.utils';
import { resolveProjectRoot } from '@fs/paths';
import { Command } from 'commander';

export interface ToolsGuidanceDependencies {
  buildCommandContext: typeof buildCommandContext;
  resolveProjectRoot: (cwd: string) => Promise<string>;
  loadGuidancePacks: (
    context: CommandContext,
    projectRoot: string | null,
  ) => Promise<ProjectGuidancePack[]>;
}

const defaultDependencies: ToolsGuidanceDependencies = {
  buildCommandContext,
  resolveProjectRoot,
  loadGuidancePacks: (context, projectRoot) =>
    loadRealizedGuidancePacks(context, projectRoot),
};

/**
 * `oat tools guidance` renders the managed `OAT tools` AGENTS.md block from
 * the installed pack state. It never installs, upgrades, or writes anything,
 * so it is the safe way to obtain the block for a manual edit.
 */
export function createToolsGuidanceCommand(
  overrides: Partial<ToolsGuidanceDependencies> = {},
): Command {
  const dependencies: ToolsGuidanceDependencies = {
    ...defaultDependencies,
    ...overrides,
  };
  return new Command('guidance')
    .description(
      'Print the managed OAT tools AGENTS.md guidance block without installing or writing anything',
    )
    .action(async (_options: unknown, command: Command) => {
      const context = dependencies.buildCommandContext(
        readGlobalOptions(command),
      );
      try {
        const projectRoot = await dependencies
          .resolveProjectRoot(context.cwd)
          .catch(() => null);
        const packs = await dependencies.loadGuidancePacks(
          context,
          projectRoot,
        );
        const managedBlock = renderToolPacksManagedBlock(packs);
        if (context.json) {
          context.logger.json({
            status: 'ok',
            sectionKey: 'tools',
            target: 'AGENTS.md',
            packs,
            managedBlock,
          });
        } else {
          context.logger.info(managedBlock);
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
    });
}
