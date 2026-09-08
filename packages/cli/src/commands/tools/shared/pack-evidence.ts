import type {
  ManagedContentKind,
  ProviderActivationSource,
  ProviderCapabilitySupport,
  ProviderProjectionMode,
} from '@providers/shared/registry';
import type { ConcreteScope } from '@shared/types';

import type { PackInventory, ScopedPackInventory } from './pack-inventory';
import type { PackAssetStatus, PackCompleteness, PackName } from './types';

export type ScopeRealization = 'present' | 'absent' | 'unknown';
export type RealizedPackPlacement =
  | 'project'
  | 'user'
  | 'both'
  | 'none'
  | 'unknown';
export type PackHealth =
  | 'absent'
  | 'current'
  | 'drifted'
  | 'newer'
  | 'mixed'
  | 'unknown';

export interface PackScopeFacts {
  scope: ConcreteScope;
  intent: ScopedPackInventory['intent'];
  inventory: {
    state: 'available' | 'unavailable';
    source: 'pack-inventory';
    reason?: string;
  };
  completeness: PackCompleteness | 'unknown';
  health: PackHealth;
  realization: ScopeRealization;
}

export interface RecoveryAction {
  code: string;
  command?: string;
  message: string;
}

export interface PackEvidenceDiagnostic {
  code:
    | 'inventory-unavailable'
    | 'declared-only'
    | 'partial-placement'
    | 'duplicate-placement'
    | 'provider-inactive'
    | 'provider-unsupported'
    | 'provider-materialization-missing'
    | 'provider-materialization-failed'
    | 'visibility-unknown'
    | 'refresh-required'
    | 'restart-required';
  severity: 'info' | 'warning' | 'error';
  pack: PackName;
  scope?: ConcreteScope;
  provider?: string;
  contentKind?: 'skill' | 'agent' | 'rule' | 'directory';
  affectedAssets: readonly string[];
  source: string;
  detail: string;
  recovery: readonly RecoveryAction[];
}

/**
 * Provider diagnostic codes and their pinned severities.
 *
 * `packEvidenceBlock` and the lifecycle-outcome status derive from the
 * severity, never from the code name, so adding a code later cannot silently
 * change a pack evidence block status or an install exit code.
 */
export const PROVIDER_DIAGNOSTIC_SEVERITY = {
  'provider-inactive': 'info',
  'provider-unsupported': 'info',
  'provider-materialization-missing': 'warning',
  'provider-materialization-failed': 'error',
  'visibility-unknown': 'info',
  'refresh-required': 'info',
  'restart-required': 'info',
} as const satisfies Record<string, PackEvidenceDiagnostic['severity']>;

export type ProviderDiagnosticCode = keyof typeof PROVIDER_DIAGNOSTIC_SEVERITY;

/**
 * Marks a diagnostic as projected from provider reachability evidence.
 *
 * Consumers that re-project an evidence item use this to replace the previous
 * provider rows without disturbing canonical or inventory-derived diagnostics.
 */
export const PROVIDER_DIAGNOSTIC_SOURCE = 'provider-registry';

export type ProviderProjectionState = 'projected' | 'absent' | 'not-applicable';

export type ProviderMaterializationState =
  | 'materialized'
  | 'missing'
  | 'failed'
  | 'not-applicable';

export type ProviderVisibilityState =
  | 'live'
  | 'manual-refresh'
  | 'restart-required'
  | 'unknown';

/**
 * Per provider, scope, and content kind reachability, derived from the
 * config-aware provider registry the sync engine uses. Every field is
 * required: a permissive interface is what let every production path emit
 * `providers: []` while still type-checking.
 */
export interface ProviderReachabilityEvidence {
  provider: string;
  scope: ConcreteScope;
  contentKind: ManagedContentKind;
  assets: readonly string[];
  activation: {
    state: 'active' | 'inactive';
    source: ProviderActivationSource;
    reason: string;
  };
  capability: {
    support: ProviderCapabilitySupport;
    projectionModes: readonly ProviderProjectionMode[];
    reason: string;
  };
  projection: {
    state: ProviderProjectionState;
    mode: ProviderProjectionMode | null;
  };
  materialization: {
    state: ProviderMaterializationState;
    detail: string;
  };
  visibility: {
    state: ProviderVisibilityState;
    reason: string;
  };
  recovery: readonly RecoveryAction[];
}

export interface ToolPackEvidence {
  schemaVersion: 1;
  pack: PackName;
  canonical: PackInventory | null;
  scopes: readonly PackScopeFacts[];
  knownRealizedScopes: readonly ConcreteScope[];
  unknownScopes: readonly ConcreteScope[];
  realizedPlacement: RealizedPackPlacement;
  providers: readonly ProviderReachabilityEvidence[];
  diagnostics: readonly PackEvidenceDiagnostic[];
}

function healthForStatuses(statuses: readonly PackAssetStatus[]): PackHealth {
  const present = statuses.filter((status) => status !== 'missing');
  if (present.length === 0) return 'absent';
  const states = new Set(present);
  if (states.size === 1 && states.has('current')) return 'current';
  if (states.size === 1 && states.has('newer')) return 'newer';
  if (states.has('outdated')) return states.size === 1 ? 'drifted' : 'mixed';
  return states.size === 1 ? 'current' : 'mixed';
}

export function packScopeFactsFromInventory(
  inventory: ScopedPackInventory,
): PackScopeFacts {
  return {
    scope: inventory.scope,
    intent: inventory.intent,
    inventory: { state: 'available', source: 'pack-inventory' },
    completeness: inventory.completeness,
    health: healthForStatuses(
      inventory.assets
        .filter(
          ({ definition }) =>
            definition.ownership[inventory.scope] === 'managed',
        )
        .map(({ status }) => status),
    ),
    realization: hasScopedPackRealizationEvidence(inventory)
      ? 'present'
      : 'absent',
  };
}

export function unavailablePackScopeFacts(input: {
  scope: ConcreteScope;
  intent: ScopedPackInventory['intent'];
  reason: string;
}): PackScopeFacts {
  return {
    scope: input.scope,
    intent: input.intent,
    inventory: {
      state: 'unavailable',
      source: 'pack-inventory',
      reason: input.reason,
    },
    completeness: 'unknown',
    health: 'unknown',
    realization: 'unknown',
  };
}

export function hasScopedPackRealizationEvidence(
  inventory: ScopedPackInventory,
): boolean {
  return inventory.assets.some(
    ({ definition, status }) =>
      definition.sharedOwner === undefined &&
      definition.ownership[inventory.scope] === 'managed' &&
      status !== 'missing',
  );
}

function placementForScopes(
  scopes: readonly PackScopeFacts[],
): RealizedPackPlacement {
  if (scopes.some(({ realization }) => realization === 'unknown')) {
    return 'unknown';
  }
  const realized = scopes
    .filter(({ realization }) => realization === 'present')
    .map(({ scope }) => scope);
  if (realized.includes('project') && realized.includes('user')) return 'both';
  return realized[0] ?? 'none';
}

function canonicalDiagnostics(
  pack: PackName,
  scopes: readonly PackScopeFacts[],
): PackEvidenceDiagnostic[] {
  const diagnostics: PackEvidenceDiagnostic[] = [];
  for (const facts of scopes) {
    if (facts.inventory.state === 'unavailable') {
      diagnostics.push({
        code: 'inventory-unavailable',
        severity: 'error',
        pack,
        scope: facts.scope,
        affectedAssets: [],
        source: facts.inventory.source,
        detail:
          facts.inventory.reason ?? `${facts.scope} inventory unavailable`,
        recovery: [],
      });
    } else if (facts.intent.enabled && facts.realization === 'absent') {
      diagnostics.push({
        code: 'declared-only',
        severity: 'warning',
        pack,
        scope: facts.scope,
        affectedAssets: [],
        source: 'pack-inventory',
        detail: `Pack ${pack} is declared at ${facts.scope} scope but has no realized managed assets`,
        recovery: [],
      });
    }
    if (facts.completeness === 'partial') {
      diagnostics.push({
        code: 'partial-placement',
        severity: 'warning',
        pack,
        scope: facts.scope,
        affectedAssets: [],
        source: 'pack-inventory',
        detail: `Pack ${pack} is only partially realized at ${facts.scope} scope`,
        recovery: [],
      });
    }
  }
  if (
    scopes.filter(({ realization }) => realization === 'present').length === 2
  ) {
    diagnostics.push({
      code: 'duplicate-placement',
      severity: 'warning',
      pack,
      affectedAssets: [],
      source: 'pack-inventory',
      detail: `Pack ${pack} is realized at project and user scope`,
      recovery: [],
    });
  }
  return diagnostics;
}

function providerDiagnostic(
  pack: PackName,
  evidence: ProviderReachabilityEvidence,
  code: ProviderDiagnosticCode,
  detail: string,
): PackEvidenceDiagnostic {
  return {
    code,
    severity: PROVIDER_DIAGNOSTIC_SEVERITY[code],
    pack,
    scope: evidence.scope,
    provider: evidence.provider,
    contentKind: evidence.contentKind,
    affectedAssets: evidence.assets,
    source: PROVIDER_DIAGNOSTIC_SOURCE,
    detail,
    recovery: evidence.recovery,
  };
}

/**
 * Emits the pinned severity-matrix diagnostics for provider reachability.
 *
 * `mode` is load-bearing rather than cosmetic: a read-only inventory surface
 * (`list`, `info`, `status`, `doctor`) ran no sync, so it can never have
 * observed a materialization failure. Emitting `provider-materialization-failed`
 * there would report an error severity from evidence that does not exist.
 */
export function providerDiagnostics(input: {
  pack: PackName;
  providers: readonly ProviderReachabilityEvidence[];
  mode: 'lifecycle' | 'inventory';
}): PackEvidenceDiagnostic[] {
  const diagnostics: PackEvidenceDiagnostic[] = [];
  for (const evidence of input.providers) {
    if (evidence.activation.state === 'inactive') {
      // Only an explicitly disabled provider is reportable. A provider that
      // was never detected and never configured is not a finding about this
      // pack: emitting one per registered provider, per content kind, per
      // pack would bury the actionable rows under inventory noise. The
      // inactive state itself is still carried on the evidence row.
      if (evidence.activation.source === 'config-disabled') {
        diagnostics.push(
          providerDiagnostic(
            input.pack,
            evidence,
            'provider-inactive',
            `${evidence.provider} is not active for ${evidence.scope} scope: ${evidence.activation.reason}`,
          ),
        );
      }
      continue;
    }
    if (evidence.capability.support !== 'supported') {
      diagnostics.push(
        providerDiagnostic(
          input.pack,
          evidence,
          'provider-unsupported',
          evidence.capability.reason,
        ),
      );
      continue;
    }
    if (evidence.materialization.state === 'failed') {
      if (input.mode === 'lifecycle') {
        diagnostics.push(
          providerDiagnostic(
            input.pack,
            evidence,
            'provider-materialization-failed',
            evidence.materialization.detail,
          ),
        );
      }
      continue;
    }
    if (evidence.materialization.state === 'missing') {
      diagnostics.push(
        providerDiagnostic(
          input.pack,
          evidence,
          'provider-materialization-missing',
          evidence.materialization.detail,
        ),
      );
    }
    if (evidence.projection.state !== 'projected') continue;
    if (evidence.visibility.state === 'unknown') {
      diagnostics.push(
        providerDiagnostic(
          input.pack,
          evidence,
          'visibility-unknown',
          evidence.visibility.reason,
        ),
      );
    } else if (evidence.visibility.state === 'manual-refresh') {
      diagnostics.push(
        providerDiagnostic(
          input.pack,
          evidence,
          'refresh-required',
          evidence.visibility.reason,
        ),
      );
    } else if (evidence.visibility.state === 'restart-required') {
      diagnostics.push(
        providerDiagnostic(
          input.pack,
          evidence,
          'restart-required',
          evidence.visibility.reason,
        ),
      );
    }
  }
  return diagnostics;
}

export function projectPackEvidence(input: {
  canonical: PackInventory | null;
  scopes: readonly PackScopeFacts[];
  providers?: readonly ProviderReachabilityEvidence[];
  /**
   * Defaults to the conservative read-only reading. A surface that actually
   * ran a sync opts in to `lifecycle` so an observed failure can be reported.
   */
  providerMode?: 'lifecycle' | 'inventory';
}): ToolPackEvidence {
  const pack =
    input.canonical?.pack ??
    input.scopes[0]?.intent.pack ??
    (() => {
      throw new Error(
        'Pack evidence requires canonical inventory or scope facts',
      );
    })();
  const providers = input.providers ?? [];
  return {
    schemaVersion: 1,
    pack,
    canonical: input.canonical,
    scopes: input.scopes,
    knownRealizedScopes: input.scopes
      .filter(({ realization }) => realization === 'present')
      .map(({ scope }) => scope),
    unknownScopes: input.scopes
      .filter(({ realization }) => realization === 'unknown')
      .map(({ scope }) => scope),
    realizedPlacement: placementForScopes(input.scopes),
    providers,
    diagnostics: [
      ...canonicalDiagnostics(pack, input.scopes),
      ...providerDiagnostics({
        pack,
        providers,
        mode: input.providerMode ?? 'inventory',
      }),
    ],
  };
}
