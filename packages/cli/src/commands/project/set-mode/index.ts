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

const DEPRECATION_MESSAGE =
  'Execution mode is no longer user-selectable; oat-project-implement is the single execution skill. No changes were made. This command will be removed in a future release.';

async function runSetMode(
  _modeArg: string,
  context: CommandContext,
): Promise<void> {
  if (context.json) {
    context.logger.json({
      status: 'deprecated',
      command: 'oat project set-mode',
      message: DEPRECATION_MESSAGE,
      noop: true,
    });
    process.exitCode = 0;
    return;
  }

  context.logger.warn(
    "[deprecated] 'oat project set-mode' is a no-op.\n" +
      `${DEPRECATION_MESSAGE}`,
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
