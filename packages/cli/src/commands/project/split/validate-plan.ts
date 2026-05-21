import { readFile as defaultReadFile } from 'node:fs/promises';

import {
  buildCommandContext,
  type CommandContext,
  type GlobalOptions,
} from '@app/command-context';
import { readGlobalOptions } from '@commands/shared/shared.utils';
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
  readFile: typeof defaultReadFile;
}

const DEFAULT_DEPENDENCIES: ValidatePlanDependencies = {
  buildCommandContext,
  readFile: defaultReadFile,
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

        const result = validateChildPlan(
          normalizePlanForValidation(shape.document.plan),
          new Set(),
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
