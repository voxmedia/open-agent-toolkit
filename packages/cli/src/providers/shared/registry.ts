import { join } from 'node:path';

import type { SyncConfig } from '@config/sync-config';
import { claudeAdapter } from '@providers/claude';
import { codexAdapter } from '@providers/codex';
import { codexMaterializationExtension } from '@providers/codex/codec/sync-extension';
import { copilotAdapter } from '@providers/copilot';
import { cursorAdapter } from '@providers/cursor';
import { cursorMaterializationExtension } from '@providers/cursor/codec/sync-extension';
import { geminiAdapter } from '@providers/gemini';
import type { ConcreteScope, ContentType } from '@shared/types';

import type { ProviderAdapter } from './adapter.types';
import type { MaterializationExtension } from './materialization-extension';

export type ProviderProjectionMode =
  | 'native-read'
  | 'entry-sync'
  | 'materialization-extension'
  | 'unsupported';
export type ManagedContentKind = ContentType | 'directory';
export type ProviderCapabilitySupport = 'supported' | 'unsupported' | 'unknown';

export type ProviderCatalogRefreshPolicy =
  | {
      state: 'live' | 'manual-refresh' | 'restart-required';
      provenance: {
        kind:
          | 'official-contract'
          | 'validated-local-behavior'
          | 'repository-decision';
        reference: string;
        verifiedAt: string;
        providerVersion?: string;
      };
    }
  | { state: 'unknown'; reason: string };

export interface ProviderContentCapability {
  scope: ConcreteScope;
  contentKind: ManagedContentKind;
  support: ProviderCapabilitySupport;
  projectionModes: readonly ProviderProjectionMode[];
  nativeRoleSurface: boolean;
  collectionAlias: 'supported' | 'unsupported';
  catalogRefresh: ProviderCatalogRefreshPolicy;
  unsupportedReason?: string;
}

export interface ProviderRegistration {
  adapter: ProviderAdapter;
  extensions: readonly MaterializationExtension[];
  capabilities: readonly ProviderContentCapability[];
}

export type ProviderActivationSource =
  | 'config-enabled'
  | 'config-disabled'
  | 'detected-unset'
  | 'undetected-unset';

export interface ProviderActivationEvidence {
  provider: string;
  state: 'active' | 'inactive';
  source: ProviderActivationSource;
  reason: string;
}

export interface ProviderScopeContext {
  scope: ConcreteScope;
  configSource: string;
  activeProviders: readonly string[];
  detectedProviders: readonly string[];
  mismatches: {
    detectedUnset: readonly string[];
    detectedDisabled: readonly string[];
  };
  activation: readonly ProviderActivationEvidence[];
  registrations: readonly ProviderRegistration[];
}

const CONTENT_KINDS: readonly ManagedContentKind[] = [
  'skill',
  'agent',
  'rule',
  'directory',
];
const SCOPES: readonly ConcreteScope[] = ['project', 'user'];
const UNKNOWN_REFRESH: ProviderCatalogRefreshPolicy = {
  state: 'unknown',
  reason: 'No sourced provider-version refresh contract is registered',
};
const CLAUDE_AGENT_REFRESH: ProviderCatalogRefreshPolicy = {
  state: 'unknown',
  reason:
    'Claude agent refresh depends on active-session directory and launch-mode facts that OAT does not observe',
};

export type UserAgentMaterializationCoverage = 'none' | 'bundled' | 'all';

export function userAgentMaterializationCoverage(input: {
  registrations: readonly ProviderRegistration[];
  activeProviders: readonly string[];
}): UserAgentMaterializationCoverage {
  const active = new Set(input.activeProviders);
  let coverage: UserAgentMaterializationCoverage = 'none';
  for (const registration of input.registrations) {
    if (!active.has(registration.adapter.name)) continue;
    const capability = registration.capabilities.find(
      ({ scope, contentKind }) => scope === 'user' && contentKind === 'agent',
    );
    if (capability?.support !== 'supported') continue;
    if (capability.projectionModes.includes('entry-sync')) return 'all';
    if (capability.projectionModes.includes('materialization-extension')) {
      coverage = 'bundled';
    } else if (capability.projectionModes.includes('native-read')) {
      return 'all';
    }
  }
  return coverage;
}

function capabilitiesFor(
  adapter: ProviderAdapter,
  extensionContentKinds: readonly ManagedContentKind[] = [],
  refreshPolicies: Partial<
    Record<ManagedContentKind, ProviderCatalogRefreshPolicy>
  > = {},
): ProviderContentCapability[] {
  return SCOPES.flatMap((scope) => {
    const mappings =
      scope === 'project' ? adapter.projectMappings : adapter.userMappings;
    return CONTENT_KINDS.map((contentKind) => {
      const mapping = mappings.find(
        ({ contentType }) => contentType === contentKind,
      );
      const hasExtension = extensionContentKinds.includes(contentKind);
      const projectionModes: ProviderProjectionMode[] = [];
      if (mapping) {
        projectionModes.push(mapping.nativeRead ? 'native-read' : 'entry-sync');
      }
      if (hasExtension) projectionModes.push('materialization-extension');
      const supported = mapping !== undefined || hasExtension;
      if (!supported) projectionModes.push('unsupported');
      return {
        scope,
        contentKind,
        support: supported ? 'supported' : 'unsupported',
        projectionModes,
        nativeRoleSurface: contentKind === 'agent' && supported,
        collectionAlias:
          contentKind === 'skill' && mapping !== undefined
            ? 'supported'
            : 'unsupported',
        catalogRefresh: refreshPolicies[contentKind] ?? UNKNOWN_REFRESH,
        ...(supported
          ? {}
          : {
              unsupportedReason: `${adapter.displayName} has no ${scope} ${contentKind} projection`,
            }),
      } satisfies ProviderContentCapability;
    });
  });
}

const REGISTRATIONS: readonly ProviderRegistration[] = [
  {
    adapter: claudeAdapter,
    extensions: [],
    capabilities: capabilitiesFor(claudeAdapter, [], {
      agent: CLAUDE_AGENT_REFRESH,
    }),
  },
  {
    adapter: cursorAdapter,
    get extensions() {
      return [cursorMaterializationExtension];
    },
    capabilities: capabilitiesFor(cursorAdapter, ['agent']),
  },
  {
    adapter: codexAdapter,
    get extensions() {
      return [codexMaterializationExtension];
    },
    capabilities: capabilitiesFor(codexAdapter, ['agent']),
  },
  {
    adapter: copilotAdapter,
    extensions: [],
    capabilities: capabilitiesFor(copilotAdapter),
  },
  {
    adapter: geminiAdapter,
    extensions: [],
    capabilities: capabilitiesFor(geminiAdapter),
  },
];

export function validateProviderRegistrations(
  registrations: readonly ProviderRegistration[],
): void {
  const names = new Set<string>();
  for (const registration of registrations) {
    const name = registration.adapter.name;
    if (names.has(name)) {
      throw new Error(`Provider ${name} is registered more than once`);
    }
    names.add(name);
    for (const extension of registration.extensions) {
      if (extension.provider !== name) {
        throw new Error(
          `Provider ${name} owns contradictory extension ${extension.provider}`,
        );
      }
    }
    for (const scope of SCOPES) {
      for (const contentKind of CONTENT_KINDS) {
        const rows = registration.capabilities.filter(
          (capability) =>
            capability.scope === scope &&
            capability.contentKind === contentKind,
        );
        if (rows.length !== 1) {
          throw new Error(
            `Provider ${name} must register exactly one ${scope} ${contentKind} capability`,
          );
        }
        const [row] = rows;
        if (
          (row!.support === 'unsupported') !==
          row!.projectionModes.includes('unsupported')
        ) {
          throw new Error(
            `Provider ${name} has contradictory ${scope} ${contentKind} support`,
          );
        }
      }
    }
  }
}

export function getProviderRegistrations(): readonly ProviderRegistration[] {
  validateProviderRegistrations(REGISTRATIONS);
  return REGISTRATIONS;
}

export async function resolveProviderScopeContext(input: {
  scope: ConcreteScope;
  scopeRoot: string;
  config: SyncConfig;
  registrations?: readonly ProviderRegistration[];
}): Promise<ProviderScopeContext> {
  const registrations = input.registrations ?? getProviderRegistrations();
  validateProviderRegistrations(registrations);
  const detection = await Promise.all(
    registrations.map(async ({ adapter }) => ({
      adapter,
      detected: await adapter.detect(input.scopeRoot),
    })),
  );
  const detectedProviders = detection
    .filter(({ detected }) => detected)
    .map(({ adapter }) => adapter.name);
  return recomputeProviderScopeContext(
    {
      scope: input.scope,
      configSource: join(
        input.scope === 'project' ? '<project>' : '~',
        '.oat',
        'sync',
        'config.json',
      ),
      detectedProviders,
      registrations,
    },
    input.config,
  );
}

export function recomputeProviderScopeContext(
  snapshot: Pick<
    ProviderScopeContext,
    'scope' | 'configSource' | 'detectedProviders' | 'registrations'
  >,
  config: SyncConfig,
): ProviderScopeContext {
  const detected = new Set(snapshot.detectedProviders);
  const active = new Set<string>();
  const detectedUnset: string[] = [];
  const detectedDisabled: string[] = [];
  const activation = snapshot.registrations.map(({ adapter }) => {
    const isDetected = detected.has(adapter.name);
    const configured = config.providers[adapter.name]?.enabled;
    const isActive =
      configured === true || (configured === undefined && isDetected);
    if (isActive) active.add(adapter.name);
    if (configured === undefined && isDetected)
      detectedUnset.push(adapter.name);
    if (configured === false && isDetected) detectedDisabled.push(adapter.name);
    const source: ProviderActivationSource =
      configured === true
        ? 'config-enabled'
        : configured === false
          ? 'config-disabled'
          : isActive
            ? 'detected-unset'
            : 'undetected-unset';
    return {
      provider: adapter.name,
      state: isActive ? 'active' : 'inactive',
      source,
      reason:
        source === 'config-enabled'
          ? 'Explicitly enabled in sync config'
          : source === 'config-disabled'
            ? 'Explicitly disabled in sync config'
            : source === 'detected-unset'
              ? 'Detected with no explicit provider setting'
              : 'Not detected and no explicit provider setting',
    } satisfies ProviderActivationEvidence;
  });
  return {
    ...snapshot,
    activeProviders: snapshot.registrations
      .map(({ adapter }) => adapter.name)
      .filter((name) => active.has(name)),
    mismatches: {
      detectedUnset,
      detectedDisabled,
    },
    activation,
  };
}
