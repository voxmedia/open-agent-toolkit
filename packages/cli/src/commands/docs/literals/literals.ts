import { buildCommandContext } from '@app/command-context';
import { readGlobalOptions } from '@commands/shared/shared.utils';
import { Command } from 'commander';

import {
  collectLiteralEvidence,
  LiteralInputError,
  type LiteralOptions,
} from './evidence';

export function createDocsLiteralsCommand(): Command {
  const append = (value: string, previous: string[] = []) =>
    previous.concat(value);
  return new Command('literals')
    .allowExcessArguments(false)
    .description(
      'Read-only triad inline-code occurrence candidates; found does not prove runtime behavior',
    )
    .option(
      '--target-dir <dir>',
      'Docs app root or literal Markdown content root',
    )
    .requiredOption(
      '--page <path>',
      'Content-relative Product/QA reader Markdown (repeat one value per flag)',
      append,
    )
    .requiredOption(
      '--source-root <dir>',
      'Narrow repo-relative implementation directory, never repo root (repeatable)',
      append,
    )
    .option(
      '--source-exclude <pattern>',
      'Repo-relative bounded POSIX exclusion: segment *, whole-segment **, trailing / directories (repeatable)',
      append,
      [],
    )
    .addHelpText(
      'after',
      '\nMatching: one strict HTML entity decode per inline-code value and physical source line; case-sensitive substring. CommonMark may normalize multiline code spans. No whitespace/Unicode folding, JS escapes, interpolation or runtime evaluation. Sources are searched only within explicit roots; inspect searched/skipped evidence. Exit 0: completed (including not-found/not-applicable); 1: input/config; 2: runtime failure.',
    )
    .action(async (options: Omit<LiteralOptions, 'cwd'>, command: Command) => {
      const context = buildCommandContext(readGlobalOptions(command));
      try {
        const result = await collectLiteralEvidence({
          ...options,
          cwd: context.cwd,
        });
        process.exitCode = 0;
        if (context.json) context.logger.json(result);
        else {
          context.logger.info(
            result.status === 'not-applicable'
              ? `Not applicable: ${result.reason}`
              : `Literal occurrence candidates: ${result.literals.filter((c) => c.status === 'found').length} found, ${result.literals.filter((c) => c.status === 'not-found').length} not-found. These require canonical-source judgment.`,
          );
          context.logger.info(
            JSON.stringify({
              scope: result.scope,
              searched: result.searched,
              skipped: result.skipped,
              literals: result.literals,
            }),
          );
        }
      } catch (error) {
        const input = error instanceof LiteralInputError;
        process.exitCode = input ? 1 : 2;
        // Resolver/config diagnostics can carry local absolute paths; keep evidence relative.
        const message = (error as Error).message
          .replaceAll(`${context.cwd}/`, '')
          .replaceAll(context.cwd, '.');
        if (context.json) context.logger.json({ status: 'error', message });
        else context.logger.error(message);
      }
    });
}
