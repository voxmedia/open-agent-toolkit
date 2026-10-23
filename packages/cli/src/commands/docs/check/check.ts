import { buildCommandContext } from '@app/command-context';
import { readGlobalOptions } from '@commands/shared/shared.utils';
import { Command } from 'commander';

import type { DocsCheckResult } from './check.types';
import { checkDocs } from './checker';

export function createDocsCheckCommand(): Command {
  return new Command('check')
    .description(
      'Read-only portable reader, navigation, command and diagram validation',
    )
    .option(
      '--target-dir <dir>',
      'Docs app root or literal Markdown content root',
    )
    .option(
      '--rule <id...>',
      'Run only these stable rule IDs (repeatable)',
      (values: string, previous: string[]) => previous.concat(values),
      [],
    )
    .action(
      async (
        options: { targetDir?: string; rule: string[] },
        command: Command,
      ) => {
        const context = buildCommandContext(readGlobalOptions(command));
        let result: DocsCheckResult;
        try {
          result = await checkDocs({
            cwd: context.cwd,
            targetDir: options.targetDir,
            rules: options.rule,
          });
          process.exitCode = result.summary.errors ? 1 : 0;
        } catch (error) {
          const message = (error as Error).message;
          result = {
            summary: { errors: 1, warnings: 0 },
            findings: [
              {
                ruleId: 'configuration',
                severity: 'error',
                path: '.oat/config.json',
                message,
              },
            ],
          };
          // Invalid input/config is actionable. Unexpected filesystem/runtime
          // failures retain the CLI's separate runtime-error exit convention.
          process.exitCode = (error as NodeJS.ErrnoException).code ? 2 : 1;
        }
        if (context.json) context.logger.json(result);
        else {
          for (const f of result.findings) {
            const location = `${f.path}${f.line === undefined ? '' : `:${f.line}`}`;
            context.logger[f.severity === 'error' ? 'error' : 'warn'](
              `${location} [${f.ruleId}] ${f.message}`,
            );
          }
          context.logger.info(
            `Docs check: ${result.summary.errors} error(s), ${result.summary.warnings} warning(s).`,
          );
        }
      },
    );
}
