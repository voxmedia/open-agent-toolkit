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

export interface ProviderReachabilityEvidence {
  provider: string;
  scope: ConcreteScope;
  contentKind: 'skill' | 'agent' | 'rule' | 'directory';
  assets: readonly string[];
  [key: string]: unknown;
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

export function projectPackEvidence(input: {
  canonical: PackInventory | null;
  scopes: readonly PackScopeFacts[];
  providers?: readonly ProviderReachabilityEvidence[];
}): ToolPackEvidence {
  const pack =
    input.canonical?.pack ??
    input.scopes[0]?.intent.pack ??
    (() => {
      throw new Error(
        'Pack evidence requires canonical inventory or scope facts',
      );
    })();
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
    providers: input.providers ?? [],
    diagnostics: canonicalDiagnostics(pack, input.scopes),
  };
}
