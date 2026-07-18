import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  buildCommandContext,
  type CommandContext,
  type GlobalOptions,
} from '@app/command-context';
import { readGlobalOptions } from '@commands/shared/shared.utils';
import { Command } from 'commander';

import {
  extractPhaseIdsFromPlan,
  parseFrontmatterFromContent,
  validateParallelGroups,
} from './validate-plan';

interface ValidatePlanCommandDependencies {
  buildCommandContext: (options: GlobalOptions) => CommandContext;
}

const DEFAULT_DEPENDENCIES: ValidatePlanCommandDependencies = {
  buildCommandContext,
};

export function createProjectValidatePlanCommand(
  overrides: Partial<ValidatePlanCommandDependencies> = {},
): Command {
  const dependencies = { ...DEFAULT_DEPENDENCIES, ...overrides };

  return new Command('validate-plan')
    .description(
      'Validate plan.md parallelism metadata against the plan phase list; singleton groups are not allowed — run a solo lane as an ungrouped phase (ungrouped phases execute sequentially in plan order)',
    )
    .summary(
      'Validate plan.md parallelism metadata against the plan phase list',
    )
    .option(
      '--project-path <path>',
      'project directory containing plan.md',
      process.cwd(),
    )
    .action((options: { projectPath: string }, command: Command) => {
      const context = dependencies.buildCommandContext(
        readGlobalOptions(command),
      );
      const planPath = join(options.projectPath, 'plan.md');

      let content: string;
      try {
        content = readFileSync(planPath, 'utf-8');
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (context.json) {
          context.logger.json({ valid: false, errors: [message] });
        } else {
          context.logger.error(`Failed to read plan.md: ${message}`);
        }
        process.exitCode = 2;
        return;
      }

      const frontmatterResult = parseFrontmatterFromContent(content);

      if (frontmatterResult.kind === 'invalid') {
        if (context.json) {
          context.logger.json({
            valid: false,
            errors: [frontmatterResult.message],
          });
        } else {
          context.logger.error(frontmatterResult.message);
        }
        process.exitCode = 1;
        return;
      }

      const groups = frontmatterResult.data['oat_plan_parallel_groups'];
      const phaseIds = extractPhaseIdsFromPlan(content);
      const result = validateParallelGroups(groups, phaseIds);

      if (result.valid) {
        if (context.json) {
          context.logger.json({ valid: true });
        } else {
          context.logger.success('Plan validation passed.');
        }
        process.exitCode = 0;
        return;
      }

      if (context.json) {
        context.logger.json({ valid: false, errors: result.errors });
      } else {
        context.logger.error('Plan validation failed:');
        for (const err of result.errors) {
          context.logger.error(`  - ${err}`);
        }
      }
      process.exitCode = 1;
    });
}
