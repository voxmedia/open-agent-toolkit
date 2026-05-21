import { describe, expect, it } from 'vitest';

import type { ChildPlan } from '../child-plan';
import { validateChildPlan } from '../validation';

function validPlan(overrides: Partial<ChildPlan> = {}): ChildPlan {
  return {
    parentSlug: 'umbrella',
    children: [
      {
        slug: 'foundation',
        inheritedContext: 'Shared context',
        knownDependencies: [],
        order: 1,
      },
      {
        slug: 'feature',
        inheritedContext: 'Feature context',
        knownDependencies: ['foundation'],
        order: 2,
      },
    ],
    foundationChild: 'foundation',
    initialActiveChild: 'foundation',
    ...overrides,
  };
}

describe('validateChildPlan', () => {
  it('detects slug collisions against existing projects', () => {
    const result = validateChildPlan(validPlan(), new Set(['feature']));

    expect(result.ok).toBe(false);
    expect(result.errors).toEqual([
      expect.objectContaining({ code: 'slug-collision-existing' }),
    ]);
  });

  it('detects parent slug collisions against existing projects', () => {
    const result = validateChildPlan(validPlan(), new Set(['umbrella']));

    expect(result.ok).toBe(false);
    expect(result.errors).toEqual([
      expect.objectContaining({
        code: 'slug-collision-existing',
        slug: 'umbrella',
      }),
    ]);
  });

  it('detects parent-slug collision with a child slug', () => {
    const result = validateChildPlan(
      validPlan({
        parentSlug: 'feature',
      }),
      new Set(),
    );

    expect(result.ok).toBe(false);
    expect(result.errors).toEqual([
      expect.objectContaining({ code: 'parent-child-slug-collision' }),
    ]);
  });

  it('detects cycles in cross-child depends_on (direct, transitive, longer)', () => {
    const direct = validateChildPlan(
      validPlan({
        children: [
          {
            slug: 'a',
            inheritedContext: '',
            knownDependencies: ['b'],
            order: 1,
          },
          {
            slug: 'b',
            inheritedContext: '',
            knownDependencies: ['a'],
            order: 2,
          },
        ],
        foundationChild: undefined,
        initialActiveChild: 'a',
      }),
      new Set(),
    );
    const longer = validateChildPlan(
      validPlan({
        children: [
          {
            slug: 'a',
            inheritedContext: '',
            knownDependencies: ['c'],
            order: 1,
          },
          {
            slug: 'b',
            inheritedContext: '',
            knownDependencies: ['a'],
            order: 2,
          },
          {
            slug: 'c',
            inheritedContext: '',
            knownDependencies: ['b'],
            order: 3,
          },
        ],
        foundationChild: undefined,
        initialActiveChild: 'a',
      }),
      new Set(),
    );

    expect(direct.errors).toEqual([
      expect.objectContaining({ code: 'dependency-cycle' }),
    ]);
    expect(longer.errors).toEqual([
      expect.objectContaining({ code: 'dependency-cycle' }),
    ]);
  });

  it('rejects depends_on edges to non-sibling slugs', () => {
    const result = validateChildPlan(
      validPlan({
        children: [
          {
            slug: 'feature',
            inheritedContext: '',
            knownDependencies: ['missing'],
            order: 1,
          },
        ],
        foundationChild: undefined,
        initialActiveChild: 'feature',
      }),
      new Set(),
    );

    expect(result.ok).toBe(false);
    expect(result.errors).toEqual([
      expect.objectContaining({ code: 'unknown-dependency' }),
    ]);
  });

  it('rejects foundationChild / initialActiveChild not in children', () => {
    const result = validateChildPlan(
      validPlan({
        foundationChild: 'missing-foundation',
        initialActiveChild: 'missing-active',
      }),
      new Set(),
    );

    expect(result.ok).toBe(false);
    expect(result.errors).toEqual([
      expect.objectContaining({ code: 'unknown-foundation-child' }),
      expect.objectContaining({ code: 'unknown-initial-active-child' }),
    ]);
  });

  it('accepts a well-formed ChildPlan', () => {
    expect(validateChildPlan(validPlan(), new Set())).toEqual({ ok: true });
  });
});
