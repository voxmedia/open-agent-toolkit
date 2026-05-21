import { describe, expect, it } from 'vitest';

import {
  buildSplitPlanDocument,
  type SplitOrigin,
  type SplitPayload,
} from '../child-plan';

const children = [
  {
    slug: 'api-foundation',
    description: 'Shared API foundation',
    inheritedContext: 'API context',
    foundation: true,
  },
  {
    slug: 'docs-rollout',
    description: 'Docs rollout',
    inheritedContext: 'Docs context',
    knownDependencies: ['api-foundation'],
  },
];

function payloadFor(origin: SplitOrigin): SplitPayload {
  return {
    origin,
    parentSlug: 'umbrella',
    interactive: true,
    declaredChildren:
      origin === 'declared' || origin === 'brainstorm-picker'
        ? children
        : undefined,
    inferredChildren: origin.startsWith('detected-') ? children : undefined,
    integrationSketch: 'Coordinate API release before docs.',
  };
}

describe('buildSplitPlanDocument', () => {
  it('normalizes declared SplitPayload into a SplitPlanDocument with foundationChild slug', () => {
    const document = buildSplitPlanDocument(payloadFor('declared'));

    expect(document).toMatchObject({
      origin: 'declared',
      interactive: true,
      plan: {
        parentSlug: 'umbrella',
        foundationChild: 'api-foundation',
        initialActiveChild: 'api-foundation',
      },
    });
    expect(document.plan.children.map((child) => child.slug)).toEqual([
      'api-foundation',
      'docs-rollout',
    ]);
  });

  it('normalizes detected-convergence SplitPayload (no declaredChildren) using priorDiscovery', () => {
    const document = buildSplitPlanDocument({
      origin: 'detected-convergence',
      interactive: true,
      priorDiscovery: {
        path: '.oat/projects/shared/umbrella',
        children,
        integrationSketch: 'Discovery-level integration notes.',
      },
    });

    expect(document.plan.parentSlug).toBe('umbrella');
    expect(document.plan.integrationSketch).toBe(
      'Discovery-level integration notes.',
    );
    expect(document.plan.children).toHaveLength(2);
  });

  it('produces equivalent ChildPlan payloads for all four origins given equivalent inputs', () => {
    const plans = (
      [
        'declared',
        'detected-mid-stream',
        'detected-convergence',
        'brainstorm-picker',
      ] as const
    ).map((origin) => buildSplitPlanDocument(payloadFor(origin)).plan);

    expect(plans).toEqual([plans[0], plans[0], plans[0], plans[0]]);
  });

  it('preserves origin and interactive metadata for command-level non-interactive handling', () => {
    const document = buildSplitPlanDocument({
      ...payloadFor('detected-mid-stream'),
      interactive: false,
    });

    expect(document.origin).toBe('detected-mid-stream');
    expect(document.interactive).toBe(false);
  });

  it('resolves initialActiveChild to foundationChild when present', () => {
    const document = buildSplitPlanDocument(payloadFor('declared'));

    expect(document.plan.initialActiveChild).toBe('api-foundation');
  });

  it('orders children by oat_depends_on DAG, foundation first', () => {
    const document = buildSplitPlanDocument({
      origin: 'declared',
      parentSlug: 'umbrella',
      interactive: true,
      declaredChildren: [
        {
          slug: 'ui',
          knownDependencies: ['api-foundation'],
        },
        {
          slug: 'api-foundation',
          foundation: true,
        },
        {
          slug: 'migration',
          knownDependencies: ['api-foundation'],
        },
      ],
    });

    expect(document.plan.children.map((child) => child.slug)).toEqual([
      'api-foundation',
      'ui',
      'migration',
    ]);
    expect(document.plan.children.map((child) => child.order)).toEqual([
      1, 2, 3,
    ]);
  });
});
