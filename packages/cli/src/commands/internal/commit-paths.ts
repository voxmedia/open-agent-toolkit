import { buildCommandContext } from '@app/command-context';
import { commitExactPaths } from '@commands/shared/exact-path-commit';
import { readGlobalOptions } from '@commands/shared/shared.utils';
import { Command } from 'commander';

export function createCommitPathsCommand(): Command {
  return new Command('commit-paths')
    .description(
      'Commit only explicit owned file paths with hooks and resumable identity verification',
    )
    .requiredOption('-m, --message <message>', 'Commit message')
    .requiredOption(
      '--identity <identity>',
      'Stable unique operation/artifact identity; reuse only to resume this operation',
    )
    .argument(
      '<paths...>',
      'Exact repository-relative file paths; include both sides of a rename',
    )
    .action(
      async (
        paths: string[],
        options: { message: string; identity: string },
        command: Command,
      ) => {
        const context = buildCommandContext(readGlobalOptions(command));
        const result = await commitExactPaths({
          repoRoot: context.cwd,
          paths,
          ...options,
        });
        if (context.json) context.logger.json(result);
        else if (result.outcome === 'blocked' || result.outcome === 'failed')
          context.logger.error(
            `${result.error} ${result.receipt ? `Receipt: ${result.receipt}` : ''}`,
          );
        else
          context.logger.info(
            `${result.outcome}${result.commit ? `: ${result.commit}` : ''}`,
          );
        process.exitCode =
          result.outcome === 'blocked'
            ? 1
            : result.outcome === 'failed'
              ? 2
              : 0;
      },
    );
}
