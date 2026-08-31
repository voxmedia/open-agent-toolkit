import type { Scope } from '@shared/types';

import type { CanonicalEntry } from './scanner';

export type EngineScope = Exclude<Scope, 'all'>;

export const SYNC_OPERATION_TYPES = [
  'create_symlink',
  'create_copy',
  'update_symlink',
  'update_copy',
  'remove',
  'detach',
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

export type RemovalSyncPlanEntry = SyncPlanEntry & {
  operation: 'remove' | 'detach';
};

export interface SyncPlan {
  scope: EngineScope;
  entries: SyncPlanEntry[];
  removals: RemovalSyncPlanEntry[];
}

export type SyncOperationStatus =
  | 'planned'
  | 'changed'
  | 'current'
  | 'missing'
  | 'failed'
  | 'unsupported'
  | 'unknown';

export interface SyncOperationResult {
  scope: EngineScope;
  provider: string;
  contentKind: CanonicalEntry['type'];
  asset: string;
  action: SyncOperationType;
  status: SyncOperationStatus;
  failure?: string;
}

export interface SyncResult {
  applied: number;
  failed: number;
  skipped: number;
  /** Additive per-operation evidence; optional for legacy execution adapters. */
  operations?: SyncOperationResult[];
}
