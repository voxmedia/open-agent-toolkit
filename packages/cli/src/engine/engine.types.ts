import type { Scope } from '@shared/types';

import type { CanonicalEntry } from './scanner';

export interface CollectionPathIdentity {
  device: string;
  inode: string;
  type: 'directory' | 'symlink';
  modifiedAtNanoseconds: string;
}

export type CollectionIdentityProof =
  | {
      status: 'absent';
      canonicalDirectory: CollectionPathIdentity;
      providerParent: CollectionPathIdentity;
      checkedAt: string;
    }
  | {
      status: 'exact-link';
      providerLink: CollectionPathIdentity;
      canonicalDirectory: CollectionPathIdentity;
      linkTextKind: 'relative' | 'absolute';
      resolvedTarget: string;
      entrySetDigest: string;
      checkedAt: string;
    }
  | {
      status: 'ineligible';
      reason:
        | 'real-directory'
        | 'broken-link'
        | 'foreign-target'
        | 'divergent-entries'
        | 'unsafe-ancestry'
        | 'identity-unavailable';
      observedIdentity?: CollectionPathIdentity;
      checkedAt: string;
    };

export type CollectionSyncAction =
  | 'create-collection-link'
  | 'adopt-collection-link'
  | 'inherit-collection'
  | 'fallback-per-entry'
  | 'detach-collection'
  | 'reject-collection';

export interface CollectionProjectionPlan {
  provider: string;
  scope: EngineScope;
  contentType: CanonicalEntry['type'];
  canonicalDir: string;
  providerDir: string;
  action: CollectionSyncAction;
  ownership: 'oat-created' | 'adopted-exact' | 'none';
  configuredStrategy: 'auto';
  proof: CollectionIdentityProof;
  inheritedEntries: readonly string[];
  reason: string;
}

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
  collections?: CollectionProjectionPlan[];
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
