import type { ContentType, Scope, SyncStrategy } from '@shared/types';

export interface PathMapping {
  contentType: ContentType;
  canonicalDir: string;
  providerDir: string;
  nativeRead: boolean;
  adoptionSourceDirs?: string[];
  providerExtension?: string;
  transformCanonical?: (
    canonicalContent: string,
    canonicalPath?: string,
  ) => string;
  parseToCanonical?: (providerContent: string, providerPath?: string) => string;
}

export interface AdoptionSource {
  contentType: ContentType;
  directory: string;
  mapping: PathMapping;
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
