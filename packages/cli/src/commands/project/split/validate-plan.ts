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

import type {
  ChildPlan,
  SplitOrigin,
  SplitPlanDocument,
} from '../../../projects/split/child-plan';
import { validateChildPlan } from '../../../projects/split/validation';

const SPLIT_ORIGINS: readonly SplitOrigin[] = [
  'declared',
  'detected-mid-stream',
  'detected-convergence',
  'brainstorm-picker',
];

interface ValidatePlanOptions {
  planFile: string;
}

interface DocumentValidationError {
  code: string;
  message: string;
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

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function validateDocumentShape(value: unknown):
  | { ok: true; document: SplitPlanDocument }
  | {
      ok: false;
      errors: DocumentValidationError[];
    } {
  const errors: DocumentValidationError[] = [];
  if (!isObject(value)) {
    return {
      ok: false,
      errors: [{ code: 'invalid-document', message: 'Expected JSON object' }],
    };
  }

  if (
    typeof value.origin !== 'string' ||
    !SPLIT_ORIGINS.includes(value.origin as SplitOrigin)
  ) {
    errors.push({
      code: 'invalid-origin',
      message: 'SplitPlanDocument origin is required',
    });
  }

  if (typeof value.interactive !== 'boolean') {
    errors.push({
      code: 'invalid-interactive',
      message: 'SplitPlanDocument interactive boolean is required',
    });
  }

  if (!isObject(value.plan)) {
    errors.push({
      code: 'invalid-plan',
      message: 'SplitPlanDocument plan object is required',
    });
  } else {
    if (typeof value.plan.parentSlug !== 'string') {
      errors.push({
        code: 'invalid-parent-slug',
        message: 'ChildPlan parentSlug is required',
      });
    }
    if (!Array.isArray(value.plan.children)) {
      errors.push({
        code: 'invalid-children',
        message: 'ChildPlan children array is required',
      });
    }
    if (typeof value.plan.initialActiveChild !== 'string') {
      errors.push({
        code: 'invalid-initial-active-child',
        message: 'ChildPlan initialActiveChild is required',
      });
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    document: value as unknown as SplitPlanDocument,
  };
}

function normalizePlanForValidation(plan: ChildPlan): ChildPlan {
  return {
    ...plan,
    children: plan.children.map((child) => ({
      ...child,
      knownDependencies: child.knownDependencies ?? [],
    })),
  };
}

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
        const shape = validateDocumentShape(parsed);
        if (!shape.ok) {
          context.logger.json({ ok: false, errors: shape.errors });
          process.exitCode = 1;
          return;
        }

        const existingSlugs = await readExistingProjectSlugs(
          context,
          dependencies,
        );
        const result = validateChildPlan(
          normalizePlanForValidation(shape.document.plan),
          existingSlugs,
        );
        context.logger.json(result);
        process.exitCode = result.ok ? 0 : 1;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        context.logger.json({
          ok: false,
          errors: [{ code: 'read-or-parse-failed', message }],
        });
        process.exitCode = 1;
      }
    });
}
