import type { CommandContext, GlobalOptions } from '@app/command-context';
import type {
  MultiSelectChoice,
  PromptContext,
} from '@commands/shared/shared.prompts';
import type { SyncConfig } from '@config/index';
import type { CanonicalEntry, SyncPlan, SyncResult } from '@engine/index';
import type { Manifest } from '@manifest/index';
import type {
  ConfigAwareAdaptersResult,
  MaterializationApplyResult,
  MaterializationExtension,
  MaterializationOperation,
  MaterializationPlan,
  ProviderAdapter,
} from '@providers/shared';
import type { ConcreteScope, Scope } from '@shared/types';

export interface SyncProviderMismatches {
  detectedUnset: string[];
  detectedDisabled: string[];
}

export interface ScopeSyncPlan {
  scope: ConcreteScope;
  scopeRoot: string;
  manifestPath: string;
  manifest: Manifest;
  plan: SyncPlan;
  canonical?: CanonicalEntry[];
  activeAdapterNames?: string[];
  providerMismatches?: SyncProviderMismatches;
  materializationExtensionPlans: MaterializationPlan[];
  materializationExtensions: MaterializationExtensionSummary[];
}

export interface SyncSummary {
  plannedOperations: number;
  applied: number;
  failed: number;
  skipped: number;
}

export interface SyncJsonPayload {
  scope: Scope;
  dryRun: boolean;
  plans: SyncPlan[];
  summary: SyncSummary;
  providerMismatches?: SyncProviderMismatches[];
  materializationExtensions?: MaterializationExtensionSummary[];
  /** Retained for compatibility with existing Codex JSON consumers. */
  codexExtensions?: CodexExtensionSummary[];
}

export type CodexExtensionAction = 'create' | 'update' | 'remove' | 'skip';
export type CodexExtensionTarget = 'role' | 'config';

export interface CodexExtensionOperation {
  action: CodexExtensionAction;
  target: CodexExtensionTarget;
  path: string;
  reason: string;
  roleName?: string;
}

export interface CodexExtensionSummary {
  operations: CodexExtensionOperation[];
  managedRoles: string[];
  aggregateConfigHash: string;
  applied?: number;
  failed?: number;
  skipped?: number;
}

export interface MaterializationExtensionSummary {
  provider: string;
  operations: MaterializationOperation[];
  managedEntries: string[];
  aggregateHash: string;
  applied?: number;
  failed?: number;
  skipped?: number;
}

export type SyncMaterializationExtension = MaterializationExtension<
  MaterializationPlan,
  {
    scopeRoot: string;
    canonicalEntries: CanonicalEntry[];
    allowedCanonicalPaths?: string[];
    options: {
      userConfigDir?: string;
      env?: NodeJS.ProcessEnv;
    };
  }
>;

export interface SyncCommandDependencies {
  buildCommandContext: (options: GlobalOptions) => CommandContext;
  resolveScopeRoot: (
    scope: ConcreteScope,
    context: CommandContext,
  ) => Promise<string>;
  loadManifest: (manifestPath: string) => Promise<Manifest>;
  loadSyncConfig: (configPath: string) => Promise<SyncConfig>;
  saveSyncConfig: (
    configPath: string,
    config: SyncConfig,
  ) => Promise<SyncConfig>;
  scanCanonical: (
    scopeRoot: string,
    scope: ConcreteScope,
  ) => Promise<CanonicalEntry[]>;
  scanBundledManagedAgents: () => Promise<CanonicalEntry[]>;
  getAdapters: () => ProviderAdapter[];
  getConfigAwareAdapters: (
    adapters: ProviderAdapter[],
    scopeRoot: string,
    config: SyncConfig,
  ) => Promise<ConfigAwareAdaptersResult>;
  selectProvidersWithAbort: <T extends string>(
    message: string,
    choices: MultiSelectChoice<T>[],
    ctx: PromptContext,
  ) => Promise<T[] | null>;
  computeSyncPlan: (args: {
    canonical: CanonicalEntry[];
    adapters: ProviderAdapter[];
    manifest: Manifest;
    scope: ConcreteScope;
    config: SyncConfig;
    scopeRoot: string;
    allowedCanonicalPaths?: string[];
  }) => Promise<SyncPlan>;
  executeSyncPlan: (
    plan: SyncPlan,
    manifest: Manifest,
    manifestPath: string,
  ) => Promise<SyncResult>;
  getMaterializationExtensions: () => SyncMaterializationExtension[];
  applyMaterializationExtensionPlan: (
    extension: SyncMaterializationExtension,
    scopeRoot: string,
    plan: MaterializationPlan,
  ) => Promise<MaterializationApplyResult>;
  formatSyncPlan: (plan: SyncPlan, applied: boolean) => string;
}
