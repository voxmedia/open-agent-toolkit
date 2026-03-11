import { buildCommandContext } from '@app/command-context';
import { readGlobalOptions } from '@commands/shared/shared.utils';
import { Command } from 'commander';

import {
  type CollectDependencies,
  defaultCollectDependencies,
  runCollectComments,
} from './collect-comments';
import type { CollectOptions } from './pr-comments.types';

export function createPrCommentsCollectCommand(
  deps: CollectDependencies = defaultCollectDependencies,
): Command {
  return new Command('collect')
    .description(
      'Collect PR review comments from merged pull requests via GitHub GraphQL API',
    )
    .requiredOption('--since <date>', 'Start date for merged PRs (YYYY-MM-DD)')
    .option(
      '--until <date>',
      'End date for merged PRs (YYYY-MM-DD, defaults to today)',
    )
    .option(
      '--out-dir <path>',
      'Output directory for collected comments',
      '.oat/review-comments',
    )
    .option(
      '--repo <owner/name>',
      'GitHub repository (defaults to current repo)',
    )
    .option('--no-ignore-bots', 'Include bot comments')
    .action(async (opts, command) => {
      const globalOptions = readGlobalOptions(command);
      const context = buildCommandContext(globalOptions);

      const options: CollectOptions = {
        since: opts.since,
        until: opts.until,
        outDir: opts.outDir,
        repo: opts.repo,
        ignoreBots: opts.ignoreBots,
      };

      await runCollectComments(context, options, deps);
    });
}
