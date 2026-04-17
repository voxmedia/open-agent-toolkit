import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { buildCommandContext } from '@app/command-context';
import { readGlobalOptions } from '@commands/shared/shared.utils';
import { Command } from 'commander';
import YAML from 'yaml';

import {
  extractPhaseIdsFromPlan,
  validateParallelGroups,
} from './validate-plan';

const FRONTMATTER_PATTERN = /^---\s*\n([\s\S]*?)\n---\s*(?:\n|$)/;

function parseFrontmatterFromContent(content: string): Record<string, unknown> {
  const match = content.match(FRONTMATTER_PATTERN);
  if (!match?.[1]) {
    return {};
  }
  try {
    const parsed: unknown = YAML.parse(match[1]);
    if (
      parsed !== null &&
      typeof parsed === 'object' &&
      !Array.isArray(parsed)
    ) {
      return parsed as Record<string, unknown>;
    }
    return {};
  } catch {
    return {};
  }
}

export function createProjectValidatePlanCommand(): Command {
  return new Command('validate-plan')
    .description(
      'Validate plan.md parallelism metadata against the plan phase list',
    )
    .option(
      '--project-path <path>',
      'project directory containing plan.md',
      process.cwd(),
    )
    .action((options: { projectPath: string }, command: Command) => {
      const context = buildCommandContext(readGlobalOptions(command));
      const planPath = join(options.projectPath, 'plan.md');

      let content: string;
      try {
        content = readFileSync(planPath, 'utf-8');
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        context.logger.error(`Failed to read plan.md: ${message}`);
        process.exitCode = 2;
        return;
      }

      const frontmatter = parseFrontmatterFromContent(content);
      const groups = frontmatter['oat_plan_parallel_groups'];
      const phaseIds = extractPhaseIdsFromPlan(content);
      const result = validateParallelGroups(groups, phaseIds);

      if (result.valid) {
        context.logger.success('Plan validation passed.');
        process.exitCode = 0;
        return;
      }

      context.logger.error('Plan validation failed:');
      for (const err of result.errors) {
        context.logger.error(`  - ${err}`);
      }
      process.exitCode = 1;
    });
}
