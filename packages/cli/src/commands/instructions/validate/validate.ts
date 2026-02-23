import { buildCommandContext } from '@app/command-context';
import type { InstructionsValidateCommandDependencies } from '@commands/instructions/instructions.types';
import {
  buildInstructionsPayload,
  formatInstructionsReport,
  scanInstructionFiles,
} from '@commands/instructions/instructions.utils';
import { readGlobalOptions } from '@commands/shared/shared.utils';
import { CliError } from '@errors/cli-error';
import { resolveProjectRoot } from '@fs/paths';
import { Command } from 'commander';

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
    .action(async (_options, command) => {
      const context = dependencies.buildCommandContext(
        readGlobalOptions(command),
      );

      try {
        const repoRoot = await dependencies.resolveProjectRoot(context.cwd);
        const entries = await dependencies.scanInstructionFiles(repoRoot);
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
            context.logger.info('Fix with: oat instructions sync --apply');
          }
        }

        process.exitCode = payload.status === 'ok' ? 0 : 1;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (context.json) {
          context.logger.json({ status: 'error', message });
        } else {
          context.logger.error(message);
        }
        process.exitCode = error instanceof CliError ? error.exitCode : 2;
      }
    });
}
