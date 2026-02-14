import type { CommandContext, GlobalOptions } from '../../app/command-context';
import type { DriftReport } from '../../drift';
import type { Manifest } from '../../manifest';
import type { PathMapping, ProviderAdapter } from '../../providers/shared';
import type {
  ConcreteScope,
  ContentType,
  Scope,
  SyncStrategy,
} from '../../shared/types';

export type { ConcreteScope } from '../../shared/types';

export interface ProviderListSummary {
  managed: number;
  inSync: number;
  drifted: number;
  missing: number;
}

export interface ProviderListItem {
  name: string;
  displayName: string;
  detected: boolean;
  defaultStrategy: SyncStrategy;
  contentTypes: ContentType[];
  summary: ProviderListSummary;
}

export interface ProvidersListDependencies {
  buildCommandContext: (options: GlobalOptions) => CommandContext;
  resolveScopeRoot: (
    scope: ConcreteScope,
    context: CommandContext,
  ) => Promise<string>;
  getAdapters: () => ProviderAdapter[];
  getSyncMappings: (adapter: ProviderAdapter, scope: Scope) => PathMapping[];
  loadManifest: (manifestPath: string) => Promise<Manifest>;
  detectDrift: (
    entry: Manifest['entries'][number],
    scopeRoot: string,
  ) => Promise<DriftReport>;
}

export interface ProviderInspectMappingState {
  scope: ConcreteScope;
  contentType: string;
  providerDir: string;
  managed: number;
  inSync: number;
  drifted: number;
  missing: number;
}

export interface ProviderInspectResult {
  name: string;
  displayName: string;
  detected: boolean;
  version: string | null;
  mappings: ProviderInspectMappingState[];
}

export interface ProvidersInspectDependencies {
  buildCommandContext: (options: GlobalOptions) => CommandContext;
  resolveScopeRoot: (
    scope: ConcreteScope,
    context: CommandContext,
  ) => Promise<string>;
  getAdapters: () => ProviderAdapter[];
  getSyncMappings: (adapter: ProviderAdapter, scope: Scope) => PathMapping[];
  loadManifest: (manifestPath: string) => Promise<Manifest>;
  detectDrift: (
    entry: Manifest['entries'][number],
    scopeRoot: string,
  ) => Promise<DriftReport>;
}
