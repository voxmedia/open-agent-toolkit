import type { CommandContext, GlobalOptions } from '../../app/command-context';
import type { DriftReport } from '../../drift';
import type { Manifest } from '../../manifest';
import type { ProviderAdapter } from '../../providers/shared';
import type { Scope } from '../../shared/types';

export type ConcreteScope = Exclude<Scope, 'all'>;

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
  summary: ProviderListSummary;
}

export interface ProvidersListDependencies {
  buildCommandContext: (options: GlobalOptions) => CommandContext;
  resolveScopeRoot: (
    scope: ConcreteScope,
    context: CommandContext,
  ) => Promise<string>;
  getAdapters: () => ProviderAdapter[];
  loadManifest: (manifestPath: string) => Promise<Manifest>;
  detectDrift: (
    entry: Manifest['entries'][number],
    scopeRoot: string,
  ) => Promise<DriftReport>;
}
