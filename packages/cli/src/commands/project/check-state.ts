import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

import { buildCommandContext } from '@app/command-context';
import { readGlobalOptions } from '@commands/shared/shared.utils';
import { parseProjectStateFrontmatter } from '@validation/project-state';
import { Command } from 'commander';
import { YAMLParseError } from 'yaml';

export function createProjectCheckStateCommand(
  overrides: Partial<{ buildCommandContext: typeof buildCommandContext }> = {},
): Command {
  const dependencies = { buildCommandContext, ...overrides };

  return new Command('check-state')
    .description(
      'Read-only strict YAML frontmatter mapping check for state.md (no lifecycle validation)',
    )
    .argument('<project-path>', 'project directory containing state.md')
    .action(async (projectPath: string, _options, command: Command) => {
      const context = dependencies.buildCommandContext(
        readGlobalOptions(command),
      );
      const statePath = join(resolve(context.cwd, projectPath), 'state.md');
      let content: string;
      try {
        content = await readFile(statePath, 'utf8');
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (context.json) {
          context.logger.json({
            valid: false,
            statePath,
            code: 'read-failed',
            errors: [message],
          });
        } else {
          context.logger.error(`Cannot read ${statePath}: ${message}`);
        }
        process.exitCode = 2;
        return;
      }

      try {
        parseProjectStateFrontmatter(content, statePath);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const code =
          error instanceof YAMLParseError ? error.code : 'invalid-frontmatter';
        if (context.json) {
          context.logger.json({
            valid: false,
            statePath,
            code,
            errors: [message],
          });
        } else {
          context.logger.error(`${statePath}: ${code}: ${message}`);
          context.logger.info(
            'Repair state.md frontmatter and rerun this check before committing or continuing.',
          );
        }
        process.exitCode = 1;
        return;
      }

      if (context.json) {
        context.logger.json({ valid: true, statePath });
      } else {
        context.logger.success(`Valid YAML frontmatter mapping: ${statePath}`);
      }
      process.exitCode = 0;
    });
}
