import {
  buildCommandContext,
  type CommandContext,
  type GlobalOptions,
} from '@app/command-context';
import { readGlobalOptions } from '@commands/shared/shared.utils';
import { Command } from 'commander';

import { evaluateSignals, type Signal } from '../../../projects/split/signals';

const SIGNALS: readonly Signal[] = [
  'independently-shippable',
  'no-shared-design-surface',
  'expect-separate-prs',
  'distinct-subsystems',
];

interface EvaluateSignalsOptions {
  fired: string;
}

interface EvaluateSignalsDependencies {
  buildCommandContext: (options: GlobalOptions) => CommandContext;
}

const DEFAULT_DEPENDENCIES: EvaluateSignalsDependencies = {
  buildCommandContext,
};

function parseFiredSignals(value: string): Signal[] {
  if (value.trim().length === 0) {
    return [];
  }

  const validSignals = new Set<string>(SIGNALS);
  return value.split(',').map((raw) => {
    const signal = raw.trim();
    if (!validSignals.has(signal)) {
      throw new Error(`Invalid signal: ${signal}`);
    }
    return signal as Signal;
  });
}

export function createEvaluateSignalsCommand(
  overrides: Partial<EvaluateSignalsDependencies> = {},
): Command {
  const dependencies = {
    ...DEFAULT_DEPENDENCIES,
    ...overrides,
  };

  return new Command('evaluate-signals')
    .description('Evaluate oat-project-split trigger signals')
    .requiredOption('--fired <comma-list>', 'Comma-separated fired signals')
    .action((options: EvaluateSignalsOptions, command: Command) => {
      const context = dependencies.buildCommandContext(
        readGlobalOptions(command),
      );

      try {
        const result = evaluateSignals({
          fired: parseFiredSignals(options.fired),
        });
        if (context.json) {
          context.logger.json(result);
        } else {
          const status = result.triggered ? 'triggered' : 'below threshold';
          context.logger.info(
            `Signal evaluation: ${status} (confidence: ${result.confidence})`,
          );
          context.logger.info(
            `Fired signals: ${result.fired.length > 0 ? result.fired.join(', ') : 'none'}`,
          );
        }
        process.exitCode = 0;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        context.logger.error(message);
        process.exitCode = 1;
      }
    });
}
