import type { ChildPlan, SplitOrigin, SplitPlanDocument } from './child-plan';

export interface DocumentValidationError {
  code: string;
  message: string;
}

const SPLIT_ORIGINS: readonly SplitOrigin[] = [
  'declared',
  'detected-mid-stream',
  'detected-convergence',
  'brainstorm-picker',
];

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

export function normalizePlanForValidation(plan: ChildPlan): ChildPlan {
  return {
    ...plan,
    children: plan.children.map((child) => ({
      ...child,
      knownDependencies: child.knownDependencies ?? [],
    })),
  };
}

export function validateSplitPlanDocumentShape(value: unknown):
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
    } else {
      value.plan.children.forEach((child, index) => {
        if (!isObject(child)) {
          errors.push({
            code: 'invalid-child',
            message: `ChildPlan child ${index + 1} must be an object`,
          });
          return;
        }
        if (typeof child.slug !== 'string') {
          errors.push({
            code: 'invalid-child-slug',
            message: `ChildPlan child ${index + 1} slug is required`,
          });
        }
        if (
          child.knownDependencies !== undefined &&
          !Array.isArray(child.knownDependencies)
        ) {
          errors.push({
            code: 'invalid-known-dependencies',
            message: `ChildPlan child ${index + 1} knownDependencies must be an array`,
          });
        }
        if (typeof child.order !== 'number') {
          errors.push({
            code: 'invalid-child-order',
            message: `ChildPlan child ${index + 1} order is required`,
          });
        }
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
    document: {
      ...(value as unknown as SplitPlanDocument),
      plan: normalizePlanForValidation(
        (value as unknown as SplitPlanDocument).plan,
      ),
    },
  };
}
