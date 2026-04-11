import { buildCommandContext } from '@app/command-context';
import {
  INSTRUCTION_SYNC_STRATEGIES,
  type InstructionSyncStrategy,
  type InstructionsValidateCommandDependencies,
} from '@commands/instructions/instructions.types';
import {
  buildInstructionsPayload,
  DEFAULT_INSTRUCTION_SYNC_STRATEGY,
  formatInstructionsReport,
  resolveInstructionSyncStrategy,
  scanInstructionFiles,
} from '@commands/instructions/instructions.utils';
import { readGlobalOptions } from '@commands/shared/shared.utils';
import { CliError } from '@errors/cli-error';
import { resolveProjectRoot } from '@fs/paths';
import { Command, Option } from 'commander';

function defaultDependencies(): InstructionsValidateCommandDependencies {
  return {
    buildCommandContext,
    resolveProjectRoot,
    scanInstructionFiles,
  };
}

export function createInstructionsValidateCommand(
  overrides: Partial<InstructionsValidateCommandDependencies> = {},
): Command {
  const dependencies = {
    ...defaultDependencies(),
    ...overrides,
  };

  return new Command('validate')
    .description('Validate AGENTS.md to CLAUDE.md pointer integrity')
    .addOption(
      new Option('--strategy <strategy>', 'Sync strategy')
        .choices([...INSTRUCTION_SYNC_STRATEGIES])
        .default(DEFAULT_INSTRUCTION_SYNC_STRATEGY),
    )
    .action(
      async (options: { strategy?: InstructionSyncStrategy }, command) => {
        const context = dependencies.buildCommandContext(
          readGlobalOptions(command),
        );

        try {
          const repoRoot = await dependencies.resolveProjectRoot(context.cwd);
          const entries = await dependencies.scanInstructionFiles(repoRoot, {
            strategy: resolveInstructionSyncStrategy(options.strategy),
          });
          const payload = buildInstructionsPayload({
            mode: 'validate',
            entries,
            actions: [],
          });

          if (context.json) {
            context.logger.json(payload);
          } else {
            context.logger.info(formatInstructionsReport(payload, repoRoot));
            if (payload.status === 'drift') {
              context.logger.info('Fix with: oat instructions sync');
            }
          }

          process.exitCode = payload.status === 'ok' ? 0 : 1;
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);
          if (context.json) {
            context.logger.json({ status: 'error', message });
          } else {
            context.logger.error(message);
          }
          process.exitCode = error instanceof CliError ? error.exitCode : 2;
        }
      },
    );
}
