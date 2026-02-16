import type { ContentType, Scope, SyncStrategy } from '@shared/types';

export interface PathMapping {
  contentType: ContentType;
  canonicalDir: string;
  providerDir: string;
  nativeRead: boolean;
}

export interface ProviderAdapter {
  name: string;
  displayName: string;
  defaultStrategy: SyncStrategy;
  projectMappings: PathMapping[];
  userMappings: PathMapping[];
  detect(scopeRoot: string): Promise<boolean>;
  detectVersion?: () => Promise<string | null>;
}

export type AdapterScope = Scope;
