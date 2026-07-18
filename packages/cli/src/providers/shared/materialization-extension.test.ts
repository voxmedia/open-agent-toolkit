import { describe, expect, expectTypeOf, it } from 'vitest';

import {
  hasMaterializationChanges,
  summarizeMaterializationPlan,
  toMaterializationOperations,
  type MaterializationContext,
  type MaterializationExtension,
  type MaterializationPlan,
  type MaterializationWriteOperation,
} from './materialization-extension';

type TestMetadata = {
  configPath: string;
};

type TestOptions = {
  enabled: boolean;
};

function plan(
  operations: MaterializationWriteOperation<'test-provider', 'role'>[],
): MaterializationPlan<'test-provider', 'role', TestMetadata> {
  return {
    provider: 'test-provider',
    operations,
    managedEntries: ['example-role'],
    aggregateHash: 'abc123',
    metadata: {
      configPath: '.test/config.json',
    },
  };
}

describe('materialization extension contract', () => {
  it('provides typed provider-neutral compute and apply hooks', async () => {
    type TestPlan = MaterializationPlan<'test-provider', 'role', TestMetadata>;
    type TestContext = MaterializationContext<TestOptions>;
    const extension: MaterializationExtension<TestPlan, TestContext> = {
      provider: 'test-provider',
      async computePlan(context) {
        expect(context.options.enabled).toBe(true);
        return plan([]);
      },
      async applyPlan(scopeRoot, materializationPlan) {
        expect(scopeRoot).toBe('/scope');
        expect(materializationPlan.provider).toBe('test-provider');
        return { applied: 0, failed: 0, skipped: 0 };
      },
    };
    const context: TestContext = {
      scopeRoot: '/scope',
      canonicalEntries: [],
      options: { enabled: true },
    };
    const computed = await extension.computePlan(context);

    expectTypeOf(extension.provider).toEqualTypeOf<'test-provider'>();
    await expect(extension.applyPlan('/scope', computed)).resolves.toEqual({
      applied: 0,
      failed: 0,
      skipped: 0,
    });
  });

  it('preserves provider-tagged lifecycle operations and private metadata', () => {
    const materializationPlan = plan([
      {
        provider: 'test-provider',
        action: 'create',
        target: 'role',
        path: '.test/roles/example-role.md',
        reason: 'managed role missing',
        entryName: 'example-role',
        content: 'role',
      },
      {
        provider: 'test-provider',
        action: 'skip',
        target: 'role',
        path: '.test/roles/current-role.md',
        reason: 'already in sync',
        entryName: 'current-role',
      },
    ]);

    expect(materializationPlan).toMatchObject({
      provider: 'test-provider',
      managedEntries: ['example-role'],
      aggregateHash: 'abc123',
      metadata: { configPath: '.test/config.json' },
    });
    expectTypeOf(materializationPlan.metadata).toEqualTypeOf<TestMetadata>();
    expect(hasMaterializationChanges(materializationPlan)).toBe(true);
    expect(summarizeMaterializationPlan(materializationPlan)).toEqual({
      plannedOperations: 1,
      skipped: 1,
    });
    expect(toMaterializationOperations(materializationPlan)).toEqual([
      {
        provider: 'test-provider',
        action: 'create',
        target: 'role',
        path: '.test/roles/example-role.md',
        reason: 'managed role missing',
        entryName: 'example-role',
      },
      {
        provider: 'test-provider',
        action: 'skip',
        target: 'role',
        path: '.test/roles/current-role.md',
        reason: 'already in sync',
        entryName: 'current-role',
      },
    ]);
  });

  it('reports an all-skip plan as unchanged', () => {
    const materializationPlan = plan([
      {
        provider: 'test-provider',
        action: 'skip',
        target: 'role',
        path: '.test/roles/current-role.md',
        reason: 'already in sync',
      },
    ]);

    expect(hasMaterializationChanges(materializationPlan)).toBe(false);
    expect(summarizeMaterializationPlan(materializationPlan)).toEqual({
      plannedOperations: 0,
      skipped: 1,
    });
  });
});
