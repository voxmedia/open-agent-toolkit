import { buildCommandContext, type CommandContext } from '@app/command-context';
import { readGlobalOptions } from '@commands/shared/shared.utils';
import { Command } from 'commander';

interface SetModeDependencies {
  buildCommandContext: (
    options: Parameters<typeof buildCommandContext>[0],
  ) => CommandContext;
}

const DEFAULT_DEPENDENCIES: SetModeDependencies = {
  buildCommandContext,
};

async function runSetMode(
  _modeArg: string,
  context: CommandContext,
): Promise<void> {
  context.logger.warn(
    "[deprecated] 'oat project set-mode' is a no-op.\n" +
      'Execution mode is no longer user-selectable; oat-project-implement is the single execution skill.\n' +
      '(No changes were made. This command will be removed in a future release.)',
  );
  process.exitCode = 0;
}

export function createProjectSetModeCommand(
  overrides: Partial<SetModeDependencies> = {},
): Command {
  const dependencies: SetModeDependencies = {
    ...DEFAULT_DEPENDENCIES,
    ...overrides,
  };

  return new Command('set-mode')
    .description('[deprecated] No-op. Execution mode is no longer selectable.')
    .argument('<mode>', 'Ignored. Execution mode is no longer selectable.')
    .action(async (mode: string, _options: unknown, command: Command) => {
      const context = dependencies.buildCommandContext(
        readGlobalOptions(command),
      );
      await runSetMode(mode, context);
    });
}
