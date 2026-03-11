import type { Scope } from '@shared/types';

import type { CanonicalEntry } from './scanner';

export type EngineScope = Exclude<Scope, 'all'>;

export const SYNC_OPERATION_TYPES = [
  'create_symlink',
  'create_copy',
  'update_symlink',
  'update_copy',
  'remove',
  'skip',
] as const;

export type SyncOperationType = (typeof SYNC_OPERATION_TYPES)[number];

export interface SyncPlanEntry {
  canonical: CanonicalEntry;
  provider: string;
  providerPath: string;
  operation: SyncOperationType;
  strategy: 'symlink' | 'copy';
  reason: string;
  renderedContent?: string;
}

export type RemovalSyncPlanEntry = SyncPlanEntry & { operation: 'remove' };

export interface SyncPlan {
  scope: EngineScope;
  entries: SyncPlanEntry[];
  removals: RemovalSyncPlanEntry[];
}

export interface SyncResult {
  applied: number;
  failed: number;
  skipped: number;
}
