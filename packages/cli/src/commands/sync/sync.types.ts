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
  providerMismatches?: SyncProviderMismatches;
}

export interface SyncSummary {
  plannedOperations: number;
  applied: number;
  failed: number;
  skipped: number;
}

export interface SyncJsonPayload {
  scope: Scope;
  apply: boolean;
  plans: SyncPlan[];
  summary: SyncSummary;
  providerMismatches?: SyncProviderMismatches[];
}

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
  }) => Promise<SyncPlan>;
  executeSyncPlan: (
    plan: SyncPlan,
    manifest: Manifest,
    manifestPath: string,
  ) => Promise<SyncResult>;
  formatSyncPlan: (plan: SyncPlan, applied: boolean) => string;
}
