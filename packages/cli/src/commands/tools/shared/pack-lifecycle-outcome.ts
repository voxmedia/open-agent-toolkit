import type { ConcreteScope } from '@shared/types';

import type { AutoSyncResult } from './auto-sync';
import {
  hasScopedPackRealizationEvidence,
  type ProviderReachabilityEvidence,
  type RecoveryAction,
  type ToolPackEvidence,
} from './pack-evidence';
import type { PackLifecycleResult } from './pack-lifecycle';
import type { PackName } from './types';

export interface PackScopeSelection {
  pack: PackName;
  requested: ConcreteScope | 'both';
  retainedRealizedScopes: readonly ConcreteScope[];
  targetScopes: readonly ConcreteScope[];
}

export interface ProviderSyncOutcome {
  scopes: readonly ConcreteScope[];
  status: 'not-run' | 'complete' | 'partial' | 'failed';
  providers: readonly ProviderReachabilityEvidence[];
  error?: string;
}

export interface PackLifecycleOutcome {
  schemaVersion: 1;
  selection: PackScopeSelection;
  canonical: {
    status: 'unchanged' | 'applied' | 'failed' | 'verification-failed';
    results: readonly PackLifecycleResult[];
  };
  sync: ProviderSyncOutcome;
  finalEvidence: ToolPackEvidence | null;
  status: 'complete' | 'partial' | 'failed';
  recovery: readonly RecoveryAction[];
}

const SCOPE_ORDER: readonly ConcreteScope[] = ['project', 'user'];

function orderedScopes(scopes: Iterable<ConcreteScope>): ConcreteScope[] {
  const selected = new Set(scopes);
  return SCOPE_ORDER.filter((scope) => selected.has(scope));
}

export function resolveAdditivePackScopeSelection(input: {
  pack: PackName;
  requested: ConcreteScope | 'both';
  knownRealizedScopes: readonly ConcreteScope[];
  unknownScopes: readonly ConcreteScope[];
}): PackScopeSelection {
  if (input.unknownScopes.length > 0) {
    throw new Error(
      `Cannot select scope for ${input.pack}: inventory is unknown at ${input.unknownScopes.join(', ')} scope`,
    );
  }
  const retainedRealizedScopes = orderedScopes(input.knownRealizedScopes);
  const requestedScopes: readonly ConcreteScope[] =
    input.requested === 'both' ? SCOPE_ORDER : [input.requested];
  return {
    pack: input.pack,
    requested: input.requested,
    retainedRealizedScopes,
    targetScopes: orderedScopes([
      ...retainedRealizedScopes,
      ...requestedScopes,
    ]),
  };
}

export function providerSyncOutcomeFromAutoSync(
  result: AutoSyncResult,
  providers: readonly ProviderReachabilityEvidence[] = [],
): ProviderSyncOutcome {
  return {
    scopes: result.scopes,
    status:
      result.scopes.length === 0
        ? 'not-run'
        : result.synced
          ? 'complete'
          : 'failed',
    providers,
    ...(result.error ? { error: result.error } : {}),
  };
}

export function evaluatePackLifecycleOutcome(input: {
  selection: PackScopeSelection;
  lifecycle: readonly PackLifecycleResult[];
  sync: ProviderSyncOutcome;
  finalEvidence: ToolPackEvidence | null;
  canonicalFailure?: string;
}): PackLifecycleOutcome {
  const recovery: RecoveryAction[] = [];
  let canonicalStatus: PackLifecycleOutcome['canonical']['status'];
  if (input.canonicalFailure) {
    canonicalStatus = 'failed';
    recovery.push({
      code: 'canonical-apply-failed',
      message: input.canonicalFailure,
    });
  } else if (input.lifecycle.length === 0) {
    canonicalStatus = 'unchanged';
  } else if (
    input.lifecycle.some(
      ({ apply }) =>
        apply !== null && !hasScopedPackRealizationEvidence(apply.inventory),
    )
  ) {
    canonicalStatus = 'verification-failed';
    recovery.push({
      code: 'canonical-verification-failed',
      message: `Re-run installation for ${input.selection.pack} and inspect pack status`,
    });
  } else {
    canonicalStatus = input.lifecycle.some(
      ({ apply }) => apply && apply.applied.length > 0,
    )
      ? 'applied'
      : 'unchanged';
  }

  const verified =
    input.finalEvidence !== null &&
    input.finalEvidence.unknownScopes.length === 0 &&
    input.selection.targetScopes.every((scope) =>
      input.finalEvidence!.knownRealizedScopes.includes(scope),
    );
  if (!verified && canonicalStatus !== 'failed') {
    canonicalStatus = 'verification-failed';
    recovery.push({
      code: 'final-inventory-unverified',
      message: `Re-run status for ${input.selection.pack}; final placement could not be verified`,
    });
  }

  if (input.sync.status === 'partial' || input.sync.status === 'failed') {
    recovery.push({
      code: 'provider-sync-incomplete',
      message:
        input.sync.error ??
        `Run oat sync for ${input.sync.scopes.join(', ') || 'the selected'} scope`,
    });
  }

  const status: PackLifecycleOutcome['status'] =
    canonicalStatus === 'failed' || canonicalStatus === 'verification-failed'
      ? 'failed'
      : input.sync.status === 'partial' || input.sync.status === 'failed'
        ? 'partial'
        : 'complete';

  return {
    schemaVersion: 1,
    selection: input.selection,
    canonical: { status: canonicalStatus, results: input.lifecycle },
    sync: input.sync,
    finalEvidence: input.finalEvidence,
    status,
    recovery,
  };
}
