import type { parseCanonicalAgentFile } from '@agents/canonical';
import type { CommandContext, GlobalOptions } from '@app/command-context';
import type { SyncConfig } from '@config/index';
import type { CopyTransform, DriftReport } from '@drift/index';
import type { Manifest } from '@manifest/index';
import type { CodexRoleExport } from '@providers/codex/codec/export-to-codex';
import type { CodexMaterializeRoleOptions } from '@providers/codex/codec/materialize';
import type {
  ManagedContentKind,
  PathMapping,
  ProviderActivationSource,
  ProviderAdapter,
  ProviderCapabilitySupport,
  ProviderProjectionMode,
} from '@providers/shared';
import type {
  ConcreteScope,
  ContentType,
  Scope,
  SyncStrategy,
} from '@shared/types';

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
  scopes: ProviderScopeInspection[];
}

export type ProviderInspectionMaterialization =
  | 'not-required'
  | 'current'
  | 'missing'
  | 'failed'
  | 'unsupported'
  | 'unknown';

export interface ProviderContentInspection {
  contentKind: ManagedContentKind;
  capability: ProviderCapabilitySupport;
  projectionModes: readonly ProviderProjectionMode[];
  nativeRead: boolean;
  materialization: ProviderInspectionMaterialization;
  visibility: 'not-reported' | 'unsupported' | 'unknown';
}

export interface ProviderScopeInspection {
  scope: ConcreteScope;
  activation: {
    state: 'active' | 'inactive' | 'unknown';
    source: ProviderActivationSource | 'detection-fallback' | 'not-resolved';
    reason: string;
  };
  content: ProviderContentInspection[];
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
    copyTransform?: CopyTransform,
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
  nativeRead: boolean;
  projectionModes: readonly ProviderProjectionMode[];
  materialization: ProviderInspectionMaterialization;
  visibility: 'not-reported' | 'unsupported' | 'unknown';
}

export interface ProviderInspectResult {
  name: string;
  displayName: string;
  detected: boolean;
  defaultStrategy: SyncStrategy;
  projectMappings: PathMapping[];
  userMappings: PathMapping[];
  version: string | null;
  mappings: ProviderInspectMappingState[];
  scopes: ProviderScopeInspection[];
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
    copyTransform?: CopyTransform,
  ) => Promise<DriftReport>;
}

export interface ProvidersSetDependencies {
  buildCommandContext: (options: GlobalOptions) => CommandContext;
  resolveScopeRoot: (
    scope: ConcreteScope,
    context: CommandContext,
  ) => Promise<string>;
  getAdapters: () => ProviderAdapter[];
  loadSyncConfig: (configPath: string) => Promise<SyncConfig>;
  saveSyncConfig: (
    configPath: string,
    config: SyncConfig,
  ) => Promise<SyncConfig>;
}

export interface CodexMaterializeResult {
  status: 'preview' | 'written';
  dryRun: boolean;
  scope: ConcreteScope;
  agentPath: string;
  roleName: string;
  rolePath: string;
  configPath: string;
  configFile: string;
  tomlPreview: string;
}

export interface ProvidersCodexMaterializeDependencies {
  buildCommandContext: (options: GlobalOptions) => CommandContext;
  resolveScopeRoot: (
    scope: ConcreteScope,
    context: CommandContext,
  ) => Promise<string>;
  parseCanonicalAgentFile: typeof parseCanonicalAgentFile;
  materializeCodexRole: (
    options: CodexMaterializeRoleOptions,
  ) => CodexRoleExport;
}

export interface ProvidersCodexDependencies {
  materialize?: Partial<ProvidersCodexMaterializeDependencies>;
}
