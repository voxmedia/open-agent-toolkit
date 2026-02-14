import { describe, expect, it } from 'vitest';
import {
  type RemovalSyncPlanEntry,
  SYNC_OPERATION_TYPES,
  type SyncOperationType,
  type SyncPlan,
  type SyncPlanEntry,
  type SyncResult,
} from './engine.types';

describe('engine types', () => {
  it('SyncOperationType includes all 6 operation types', () => {
    const operations: SyncOperationType[] = [...SYNC_OPERATION_TYPES];

    expect(SYNC_OPERATION_TYPES).toEqual([
      'create_symlink',
      'create_copy',
      'update_symlink',
      'update_copy',
      'remove',
      'skip',
    ]);
    expect(operations).toHaveLength(6);
  });

  it('SyncPlanEntry has all required fields', () => {
    const entry: SyncPlanEntry = {
      canonical: {
        name: 'example',
        type: 'skill',
        canonicalPath: '/tmp/.agents/skills/example',
      },
      provider: 'claude',
      providerPath: '/tmp/.claude/skills/example',
      operation: 'create_symlink',
      strategy: 'symlink',
      reason: 'provider path does not exist',
    };

    expect(entry.provider).toBe('claude');
    expect(entry.operation).toBe('create_symlink');
    expect(entry.strategy).toBe('symlink');
  });

  it('SyncPlan has scope, entries, and removals', () => {
    const entry: SyncPlanEntry = {
      canonical: {
        name: 'example',
        type: 'skill',
        canonicalPath: '/tmp/.agents/skills/example',
      },
      provider: 'cursor',
      providerPath: '/tmp/.cursor/skills/example',
      operation: 'skip',
      strategy: 'symlink',
      reason: 'already in sync',
    };

    const removal: RemovalSyncPlanEntry = {
      ...entry,
      operation: 'remove',
      reason: 'canonical entry no longer exists',
    };

    const plan: SyncPlan = {
      scope: 'project',
      entries: [entry],
      removals: [removal],
    };

    expect(plan.scope).toBe('project');
    expect(plan.entries).toHaveLength(1);
    expect(plan.removals[0]?.operation).toBe('remove');
  });

  it('SyncResult tracks applied + failed counts', () => {
    const result: SyncResult = {
      applied: 3,
      failed: 1,
      skipped: 2,
    };

    expect(result.applied).toBe(3);
    expect(result.failed).toBe(1);
    expect(result.skipped).toBe(2);
  });
});
