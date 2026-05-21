import type { ChildPlan } from './child-plan';

export interface ValidationError {
  code:
    | 'slug-collision-existing'
    | 'duplicate-child-slug'
    | 'parent-child-slug-collision'
    | 'unknown-dependency'
    | 'dependency-cycle'
    | 'unknown-foundation-child'
    | 'unknown-initial-active-child';
  message: string;
  slug?: string;
}

export type ValidationResult =
  | { ok: true }
  | { ok: false; errors: ValidationError[] };

function findDependencyCycle(plan: ChildPlan): string[] | null {
  const childSlugs = new Set(plan.children.map((child) => child.slug));
  const graph = new Map(
    plan.children.map((child) => [
      child.slug,
      child.knownDependencies.filter((dependency) =>
        childSlugs.has(dependency),
      ),
    ]),
  );
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const stack: string[] = [];

  function visit(slug: string): string[] | null {
    if (visiting.has(slug)) {
      return [...stack.slice(stack.indexOf(slug)), slug];
    }
    if (visited.has(slug)) {
      return null;
    }

    visiting.add(slug);
    stack.push(slug);
    for (const dependency of graph.get(slug) ?? []) {
      const cycle = visit(dependency);
      if (cycle) {
        return cycle;
      }
    }
    stack.pop();
    visiting.delete(slug);
    visited.add(slug);
    return null;
  }

  for (const child of plan.children) {
    const cycle = visit(child.slug);
    if (cycle) {
      return cycle;
    }
  }

  return null;
}

export function validateChildPlan(
  plan: ChildPlan,
  existingSlugs: Set<string>,
): ValidationResult {
  const errors: ValidationError[] = [];
  const seenChildSlugs = new Set<string>();
  const childSlugs = new Set(plan.children.map((child) => child.slug));

  for (const child of plan.children) {
    if (existingSlugs.has(child.slug)) {
      errors.push({
        code: 'slug-collision-existing',
        message: `Child slug already exists: ${child.slug}`,
        slug: child.slug,
      });
    }

    if (seenChildSlugs.has(child.slug)) {
      errors.push({
        code: 'duplicate-child-slug',
        message: `Duplicate child slug: ${child.slug}`,
        slug: child.slug,
      });
    }
    seenChildSlugs.add(child.slug);

    if (child.slug === plan.parentSlug) {
      errors.push({
        code: 'parent-child-slug-collision',
        message: `Parent slug collides with child slug: ${child.slug}`,
        slug: child.slug,
      });
    }

    for (const dependency of child.knownDependencies) {
      if (dependency === child.slug || !childSlugs.has(dependency)) {
        errors.push({
          code: 'unknown-dependency',
          message: `Dependency ${dependency} is not a sibling of ${child.slug}`,
          slug: child.slug,
        });
      }
    }
  }

  if (plan.foundationChild && !childSlugs.has(plan.foundationChild)) {
    errors.push({
      code: 'unknown-foundation-child',
      message: `foundationChild is not in children: ${plan.foundationChild}`,
      slug: plan.foundationChild,
    });
  }

  if (!childSlugs.has(plan.initialActiveChild)) {
    errors.push({
      code: 'unknown-initial-active-child',
      message: `initialActiveChild is not in children: ${plan.initialActiveChild}`,
      slug: plan.initialActiveChild,
    });
  }

  const cycle = findDependencyCycle(plan);
  if (cycle) {
    errors.push({
      code: 'dependency-cycle',
      message: `Child dependencies contain a cycle: ${cycle.join(' -> ')}`,
    });
  }

  return errors.length === 0 ? { ok: true } : { ok: false, errors };
}
