import {
  readdir as defaultReaddir,
  readFile as defaultReadFile,
} from 'node:fs/promises';
import { isAbsolute, join } from 'node:path';

import {
  buildCommandContext,
  type CommandContext,
  type GlobalOptions,
} from '@app/command-context';
import { resolveProjectsRoot } from '@commands/shared/oat-paths';
import { readGlobalOptions } from '@commands/shared/shared.utils';
import { resolveProjectRoot } from '@fs/paths';
import { Command } from 'commander';

import { validateSplitPlanDocumentShape } from '../../../projects/split/document-validation';
import { validateChildPlan } from '../../../projects/split/validation';

interface ValidatePlanOptions {
  planFile: string;
}

interface ValidatePlanDependencies {
  buildCommandContext: (options: GlobalOptions) => CommandContext;
  resolveProjectRoot: (cwd: string) => Promise<string>;
  resolveProjectsRoot: (
    repoRoot: string,
    env: NodeJS.ProcessEnv,
  ) => Promise<string>;
  readFile: typeof defaultReadFile;
  readdir: typeof defaultReaddir;
  processEnv: NodeJS.ProcessEnv;
}

const DEFAULT_DEPENDENCIES: ValidatePlanDependencies = {
  buildCommandContext,
  resolveProjectRoot,
  resolveProjectsRoot,
  readFile: defaultReadFile,
  readdir: defaultReaddir,
  processEnv: process.env,
};

async function readExistingProjectSlugs(
  context: CommandContext,
  dependencies: ValidatePlanDependencies,
): Promise<Set<string>> {
  const repoRoot = await dependencies.resolveProjectRoot(context.cwd);
  const projectsRoot = await dependencies.resolveProjectsRoot(
    repoRoot,
    dependencies.processEnv,
  );
  const absoluteProjectsRoot = isAbsolute(projectsRoot)
    ? projectsRoot
    : join(repoRoot, projectsRoot);
  const entries = await dependencies.readdir(absoluteProjectsRoot, {
    withFileTypes: true,
  });

  return new Set(
    entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name),
  );
}

export function createValidateSplitPlanCommand(
  overrides: Partial<ValidatePlanDependencies> = {},
): Command {
  const dependencies = {
    ...DEFAULT_DEPENDENCIES,
    ...overrides,
  };

  return new Command('validate-plan')
    .description('Validate a persisted oat-project-split SplitPlanDocument')
    .requiredOption('--plan-file <path>', 'Path to split-plan.json')
    .action(async (options: ValidatePlanOptions, command: Command) => {
      const context = dependencies.buildCommandContext(
        readGlobalOptions(command),
      );

      try {
        const raw = await dependencies.readFile(options.planFile, 'utf8');
        const parsed: unknown = JSON.parse(raw);
        const shape = validateSplitPlanDocumentShape(parsed);
        if (!shape.ok) {
          if (context.json) {
            context.logger.json({ ok: false, errors: shape.errors });
          } else {
            context.logger.error(
              'Split plan document shape validation failed:',
            );
            for (const err of shape.errors) {
              context.logger.error(`  - [${err.code}] ${err.message}`);
            }
          }
          process.exitCode = 1;
          return;
        }

        const existingSlugs = await readExistingProjectSlugs(
          context,
          dependencies,
        );
        const result = validateChildPlan(shape.document.plan, existingSlugs);
        if (context.json) {
          context.logger.json(result);
        } else if (result.ok) {
          context.logger.success('Split plan validation passed.');
        } else {
          context.logger.error('Split plan validation failed:');
          for (const err of result.errors) {
            context.logger.error(`  - [${err.code}] ${err.message}`);
          }
        }
        process.exitCode = result.ok ? 0 : 1;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (context.json) {
          context.logger.json({
            ok: false,
            errors: [{ code: 'read-or-parse-failed', message }],
          });
        } else {
          context.logger.error(`Failed to read or parse plan file: ${message}`);
        }
        process.exitCode = 1;
      }
    });
}
