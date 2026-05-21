export type SplitOrigin =
  | 'declared'
  | 'detected-mid-stream'
  | 'detected-convergence'
  | 'brainstorm-picker';

export interface SplitChildInput {
  slug: string;
  description?: string;
  inheritedContext?: string;
  knownDependencies?: string[];
  foundation?: boolean;
}

export interface SplitPayload {
  origin: SplitOrigin;
  parentSlug?: string;
  declaredChildren?: SplitChildInput[];
  inferredChildren?: SplitChildInput[];
  priorDiscovery?: {
    path: string;
    brainstormSessionId?: string;
    parentSlug?: string;
    children?: SplitChildInput[];
    inheritedContext?: string;
    integrationSketch?: string;
  };
  interactive: boolean;
  foundationChild?: string;
  integrationSketch?: string;
  initialActiveChild?: string;
}

export interface ChildPlan {
  parentSlug: string;
  children: Array<{
    slug: string;
    description?: string;
    inheritedContext: string;
    knownDependencies: string[];
    order: number;
  }>;
  foundationChild?: string;
  integrationSketch?: string;
  initialActiveChild: string;
}

export interface SplitPlanDocument {
  origin: SplitOrigin;
  interactive: boolean;
  plan: ChildPlan;
}

function deriveSlugFromPath(path: string): string {
  const normalized = path.trim().replace(/\/+$/, '');
  const slug = normalized.split('/').at(-1);
  if (!slug) {
    throw new Error('Unable to derive parent slug from priorDiscovery.path');
  }
  return slug;
}

function resolveParentSlug(payload: SplitPayload): string {
  if (payload.parentSlug) {
    return payload.parentSlug;
  }
  if (payload.priorDiscovery?.parentSlug) {
    return payload.priorDiscovery.parentSlug;
  }
  if (payload.priorDiscovery?.path) {
    return deriveSlugFromPath(payload.priorDiscovery.path);
  }
  throw new Error('SplitPayload requires parentSlug or priorDiscovery.path');
}

function resolveChildren(payload: SplitPayload): SplitChildInput[] {
  const children =
    payload.declaredChildren ??
    payload.inferredChildren ??
    payload.priorDiscovery?.children;

  if (!children || children.length === 0) {
    throw new Error('SplitPayload requires at least one child');
  }

  return children;
}

function resolveFoundationChild(
  payload: SplitPayload,
  children: SplitChildInput[],
): string | undefined {
  return (
    payload.foundationChild ?? children.find((child) => child.foundation)?.slug
  );
}

function orderChildren(
  children: SplitChildInput[],
  foundationChild?: string,
): SplitChildInput[] {
  const childSlugs = new Set(children.map((child) => child.slug));
  const bySlug = new Map(children.map((child) => [child.slug, child]));
  const inputOrder = new Map(
    children.map((child, index) => [child.slug, index] as const),
  );
  const indegree = new Map(children.map((child) => [child.slug, 0]));
  const dependents = new Map<string, string[]>();

  for (const child of children) {
    for (const dependency of child.knownDependencies ?? []) {
      if (!childSlugs.has(dependency)) {
        continue;
      }
      indegree.set(child.slug, (indegree.get(child.slug) ?? 0) + 1);
      const existing = dependents.get(dependency) ?? [];
      existing.push(child.slug);
      dependents.set(dependency, existing);
    }
  }

  const priority = (slug: string): number =>
    slug === foundationChild ? -1 : (inputOrder.get(slug) ?? 0);
  const ready = children
    .filter((child) => indegree.get(child.slug) === 0)
    .map((child) => child.slug)
    .sort((left, right) => priority(left) - priority(right));
  const ordered: SplitChildInput[] = [];

  while (ready.length > 0) {
    const slug = ready.shift()!;
    const child = bySlug.get(slug);
    if (child) {
      ordered.push(child);
    }

    for (const dependent of dependents.get(slug) ?? []) {
      indegree.set(dependent, (indegree.get(dependent) ?? 0) - 1);
      if (indegree.get(dependent) === 0) {
        ready.push(dependent);
        ready.sort((left, right) => priority(left) - priority(right));
      }
    }
  }

  if (ordered.length !== children.length) {
    const orderedSlugs = new Set(ordered.map((child) => child.slug));
    ordered.push(
      ...children
        .filter((child) => !orderedSlugs.has(child.slug))
        .sort((left, right) => priority(left.slug) - priority(right.slug)),
    );
  }

  return ordered;
}

export function buildSplitPlanDocument(
  payload: SplitPayload,
): SplitPlanDocument {
  const parentSlug = resolveParentSlug(payload);
  const children = resolveChildren(payload);
  const foundationChild = resolveFoundationChild(payload, children);
  const orderedChildren = orderChildren(children, foundationChild);
  const firstChild = orderedChildren[0]?.slug;
  if (!firstChild) {
    throw new Error('SplitPayload requires at least one child');
  }

  return {
    origin: payload.origin,
    interactive: payload.interactive,
    plan: {
      parentSlug,
      children: orderedChildren.map((child, index) => ({
        slug: child.slug,
        description: child.description,
        inheritedContext:
          child.inheritedContext ??
          payload.priorDiscovery?.inheritedContext ??
          child.description ??
          '',
        knownDependencies: [...(child.knownDependencies ?? [])],
        order: index + 1,
      })),
      foundationChild,
      integrationSketch:
        payload.integrationSketch ?? payload.priorDiscovery?.integrationSketch,
      initialActiveChild:
        payload.initialActiveChild ?? foundationChild ?? firstChild,
    },
  };
}
