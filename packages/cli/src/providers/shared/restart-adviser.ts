import type { ProviderCatalogRefreshPolicy } from './registry';

export interface ProviderRecoveryAction {
  code: string;
  command?: string;
  message: string;
}

export type ProviderMaterializationState =
  | 'not-required'
  | 'current'
  | 'planned'
  | 'changed'
  | 'missing'
  | 'failed'
  | 'unsupported'
  | 'unknown';

export type ProviderVisibilityState =
  | 'visible'
  | 'not-reported'
  | 'refresh-required'
  | 'restart-required'
  | 'unsupported'
  | 'unknown';

export type ProviderVisibilityEvidenceSource =
  | 'runtime-observation'
  | 'provider-refresh-policy'
  | 'materialization-result';

export interface ProviderCatalogObservation {
  state: 'visible' | 'not-reported';
  reference: string;
}

export interface ProviderVisibilityEvidence {
  state: ProviderVisibilityState;
  source: ProviderVisibilityEvidenceSource;
  reason: string;
  policy: ProviderCatalogRefreshPolicy;
  recovery: readonly ProviderRecoveryAction[];
}

const MATERIALIZATION_REASONS: Record<
  Exclude<ProviderMaterializationState, 'changed'>,
  string
> = {
  'not-required': 'No provider materialization is required',
  current:
    'Materialization is current, but the active provider catalog was not observed',
  planned:
    'Materialization is only planned; provider visibility cannot be observed yet',
  missing: 'Provider materialization is missing',
  failed: 'Provider materialization failed',
  unsupported: 'Provider materialization is unsupported',
  unknown: 'Provider materialization state is unknown',
};

export function adviseProviderRefresh(input: {
  policy: ProviderCatalogRefreshPolicy;
  materialization: ProviderMaterializationState;
  observation?: ProviderCatalogObservation;
}): ProviderVisibilityEvidence {
  if (input.observation?.state === 'visible') {
    return {
      state: 'visible',
      source: 'runtime-observation',
      reason: input.observation.reference,
      policy: input.policy,
      recovery: [],
    };
  }

  if (input.observation?.state === 'not-reported') {
    return {
      state: 'not-reported',
      source: 'runtime-observation',
      reason: input.observation.reference,
      policy: input.policy,
      recovery: [],
    };
  }

  if (input.materialization !== 'changed') {
    return {
      state:
        input.materialization === 'unsupported' ? 'unsupported' : 'unknown',
      source: 'materialization-result',
      reason: MATERIALIZATION_REASONS[input.materialization],
      policy: input.policy,
      recovery: [],
    };
  }

  if (input.policy.state === 'unknown') {
    return {
      state: 'unknown',
      source: 'provider-refresh-policy',
      reason: input.policy.reason,
      policy: input.policy,
      recovery: [],
    };
  }

  if (input.policy.state === 'manual-refresh') {
    return {
      state: 'refresh-required',
      source: 'provider-refresh-policy',
      reason: `Provider refresh is required after a successful materialization change (${input.policy.provenance.reference})`,
      policy: input.policy,
      recovery: [
        {
          code: 'refresh-provider-catalog',
          message:
            'Refresh the provider catalog in the active session, then inspect it for the materialized asset.',
        },
      ],
    };
  }

  if (input.policy.state === 'restart-required') {
    if (input.policy.provenance.kind === 'repository-decision') {
      return {
        state: 'restart-required',
        source: 'provider-refresh-policy',
        reason: `OAT conservatively advises starting a new provider session after a successful materialization change so the provider has an opportunity to load the changed asset; this does not prove runtime visibility (${input.policy.provenance.reference})`,
        policy: input.policy,
        recovery: [
          {
            code: 'start-new-provider-session',
            message:
              'Start a new provider session so it has an opportunity to load the changed asset, then inspect its catalog.',
          },
        ],
      };
    }

    return {
      state: 'restart-required',
      source: 'provider-refresh-policy',
      reason: `Provider restart is required after a successful materialization change (${input.policy.provenance.reference})`,
      policy: input.policy,
      recovery: [
        {
          code: 'restart-provider',
          message:
            'Restart the provider session, then inspect its catalog for the materialized asset.',
        },
      ],
    };
  }

  return {
    state: 'unknown',
    source: 'provider-refresh-policy',
    reason:
      'The provider contract says catalog changes are live, but this run did not observe the active provider catalog',
    policy: input.policy,
    recovery: [],
  };
}
