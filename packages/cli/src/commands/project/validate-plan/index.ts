import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import {
  buildCommandContext,
  type CommandContext,
  type GlobalOptions,
} from '@app/command-context';
import { readGlobalOptions } from '@commands/shared/shared.utils';
import {
  WORKFLOW_MODES,
  type WorkflowMode,
} from '@open-agent-toolkit/control-plane';
import { Command } from 'commander';

import {
  extractPhaseIds,
  parseFrontmatterFromContent,
  resolvePlanProfile,
  validateParallelGroups,
  validatePlanForProfile,
} from './validate-plan';

function toWorkflowMode(value: unknown): WorkflowMode | null {
  return typeof value === 'string' &&
    (WORKFLOW_MODES as readonly string[]).includes(value)
    ? (value as WorkflowMode)
    : null;
}

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
      const projectPath = resolve(context.cwd, options.projectPath);
      const planPath = join(projectPath, 'plan.md');

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
      let stateFrontmatter: Record<string, unknown> | null = null;
      try {
        const stateContent = readFileSync(
          join(projectPath, 'state.md'),
          'utf-8',
        );
        const parsedState = parseFrontmatterFromContent(stateContent);
        stateFrontmatter =
          parsedState.kind === 'invalid' ? null : parsedState.data;
      } catch {
        stateFrontmatter = null;
      }
      const workflowMode = toWorkflowMode(
        stateFrontmatter?.['oat_workflow_mode'],
      );
      const profile = resolvePlanProfile(workflowMode);
      const phaseIds = extractPhaseIds(content, profile);

      let implementationContent: string | null = null;
      if (profile === 'goal') {
        try {
          implementationContent = readFileSync(
            join(options.projectPath, 'implementation.md'),
            'utf-8',
          );
        } catch {
          implementationContent = null;
        }
      }

      const issues = validatePlanForProfile(content, {
        profile,
        workflowMode,
        stateFrontmatter,
        implementationContent,
      });
      const profileErrors = issues
        .filter((issue) => issue.severity === 'error')
        .map((issue) => issue.message);
      const warnings = issues
        .filter((issue) => issue.severity === 'warning')
        .map((issue) => issue.message);
      const warningPayload = warnings.length > 0 ? { warnings } : {};
      if (!context.json) {
        for (const warning of warnings) {
          context.logger.warn(warning);
        }
      }

      if (profileErrors.length > 0) {
        if (context.json) {
          context.logger.json({
            valid: false,
            errors: profileErrors,
            ...warningPayload,
          });
        } else {
          context.logger.error('Plan validation failed:');
          for (const err of profileErrors) {
            context.logger.error(`  - ${err}`);
          }
        }
        process.exitCode = 1;
        return;
      }

      const result = validateParallelGroups(groups, phaseIds);

      if (result.valid) {
        if (context.json) {
          context.logger.json({ valid: true, ...warningPayload });
        } else {
          context.logger.success('Plan validation passed.');
        }
        process.exitCode = 0;
        return;
      }

      if (context.json) {
        context.logger.json({
          valid: false,
          errors: result.errors,
          ...warningPayload,
        });
      } else {
        context.logger.error('Plan validation failed:');
        for (const err of result.errors) {
          context.logger.error(`  - ${err}`);
        }
      }
      process.exitCode = 1;
    });
}
