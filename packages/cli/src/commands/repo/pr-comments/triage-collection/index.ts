import { buildCommandContext } from '@app/command-context';
import { readGlobalOptions } from '@commands/shared/shared.utils';
import { Command } from 'commander';

import {
  type TriageDependencies,
  defaultTriageDependencies,
  runTriageComments,
} from './triage-comments';
import type { TriageOptions } from './triage-comments';

export function createPrCommentsTriageCommand(
  deps: TriageDependencies = defaultTriageDependencies,
): Command {
  return new Command('triage-collection')
    .description(
      'Interactively triage collected PR review comments (keep/discard)',
    )
    .requiredOption('--month <YYYY-MM>', 'Month chunk to triage')
    .option(
      '--input-dir <path>',
      'Directory containing collected JSON',
      '.oat/review-comments',
    )
    .option(
      '--output-dir <path>',
      'Output directory for triaged results',
      '.oat/review-comments',
    )
    .action(async (opts, command) => {
      const globalOptions = readGlobalOptions(command);
      const context = buildCommandContext(globalOptions);

      const options: TriageOptions = {
        inputDir: opts.inputDir,
        outputDir: opts.outputDir,
        month: opts.month,
      };

      await runTriageComments(context, options, deps);
    });
}
