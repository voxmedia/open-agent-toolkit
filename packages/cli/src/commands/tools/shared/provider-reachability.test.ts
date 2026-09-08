import type {
  ProviderActivationSource,
  ProviderContentCapability,
  ProviderProjectionMode,
  ProviderRegistration,
  ProviderScopeContext,
} from '@providers/shared/registry';
import type { ConcreteScope } from '@shared/types';
import { describe, expect, it } from 'vitest';

import { packEvidenceBlock } from './format-pack-inventory';
import {
  projectPackEvidence,
  providerDiagnostics,
  type PackScopeFacts,
  type ProviderReachabilityEvidence,
} from './pack-evidence';
import { providerSyncOutcomeFromAutoSync } from './pack-lifecycle-outcome';
import {
  applySyncEvidence,
  projectProviderReachability,
} from './provider-reachability';

function capability(input: {
  scope: ConcreteScope;
  support: ProviderContentCapability['support'];
  projectionModes: ProviderProjectionMode[];
  catalogRefresh: ProviderContentCapability['catalogRefresh'];
  unsupportedReason?: string;
}): ProviderContentCapability {
  return {
    scope: input.scope,
    contentKind: 'skill',
    support: input.support,
    projectionModes: input.projectionModes,
    nativeRoleSurface: false,
    collectionAlias: 'unsupported',
    catalogRefresh: input.catalogRefresh,
    ...(input.unsupportedReason
      ? { unsupportedReason: input.unsupportedReason }
      : {}),
  };
}

const LIVE_REFRESH: ProviderContentCapability['catalogRefresh'] = {
  state: 'live',
  provenance: {
    kind: 'official-contract',
    reference: 'https://example.invalid/contract',
    verifiedAt: '2026-01-01',
  },
};

const UNKNOWN_REFRESH: ProviderContentCapability['catalogRefresh'] = {
  state: 'unknown',
  reason: 'No sourced provider-version refresh contract is registered',
};

function context(input: {
  scope?: ConcreteScope;
  provider?: string;
  active?: boolean;
  activationSource?: ProviderActivationSource;
  capabilities: ProviderContentCapability[];
}): ProviderScopeContext {
  const scope = input.scope ?? 'user';
  const provider = input.provider ?? 'codex';
  const active = input.active ?? true;
  const registration = {
    adapter: { name: provider },
    extensions: [],
    capabilities: input.capabilities,
  } as unknown as ProviderRegistration;
  return {
    scope,
    configSource: '~/.oat/sync/config.json',
    activeProviders: active ? [provider] : [],
    detectedProviders: active ? [provider] : [],
    mismatches: { detectedUnset: [], detectedDisabled: [] },
    activation: [
      {
        provider,
        state: active ? 'active' : 'inactive',
        source:
          input.activationSource ??
          (active ? 'config-enabled' : 'config-disabled'),
        reason: active
          ? 'Explicitly enabled in sync config'
          : 'Explicitly disabled in sync config',
      },
    ],
    registrations: [registration],
  };
}

const ASSETS = { skill: ['.agents/skills/analyze'] } as const;

function single(
  evidence: ProviderReachabilityEvidence[],
): ProviderReachabilityEvidence {
  expect(evidence).toHaveLength(1);
  return evidence[0]!;
}

function blockStatusFor(
  providers: ProviderReachabilityEvidence[],
  mode: 'lifecycle' | 'inventory',
): string {
  const scopes: PackScopeFacts[] = [
    {
      scope: 'user',
      intent: {
        pack: 'research',
        scope: 'user',
        enabled: true,
        source: 'declared',
        configPath: '~/.oat/config.json',
        diagnostics: [],
      } as unknown as PackScopeFacts['intent'],
      inventory: { state: 'available', source: 'pack-inventory' },
      completeness: 'complete',
      health: 'current',
      realization: 'present',
    },
  ];
  return packEvidenceBlock([
    projectPackEvidence({
      canonical: null,
      scopes,
      providers,
      providerMode: mode,
    }),
  ]).status;
}

describe('provider reachability mapper', () => {
  it('reports an active, supported, projected provider with no diagnostic', () => {
    const evidence = projectProviderReachability({
      providerScopeContext: context({
        capabilities: [
          capability({
            scope: 'user',
            support: 'supported',
            projectionModes: ['entry-sync'],
            catalogRefresh: LIVE_REFRESH,
          }),
        ],
      }),
      assets: ASSETS,
      mode: 'lifecycle',
      syncRan: true,
      syncOperationResults: [
        {
          provider: 'codex',
          scope: 'user',
          contentKind: 'skill',
          asset: '.agents/skills/analyze',
          status: 'changed',
        },
      ],
    });

    const row = single(evidence);
    expect(row.activation.state).toBe('active');
    expect(row.capability.support).toBe('supported');
    expect(row.projection.state).toBe('projected');
    expect(row.materialization.state).toBe('materialized');
    expect(row.visibility.state).toBe('live');
    expect(
      providerDiagnostics({
        pack: 'research',
        providers: evidence,
        mode: 'lifecycle',
      }),
    ).toEqual([]);
    expect(blockStatusFor(evidence, 'lifecycle')).toBe('ok');
  });

  it('emits provider-inactive at info severity for a disabled provider', () => {
    const evidence = projectProviderReachability({
      providerScopeContext: context({
        active: false,
        capabilities: [
          capability({
            scope: 'user',
            support: 'supported',
            projectionModes: ['entry-sync'],
            catalogRefresh: LIVE_REFRESH,
          }),
        ],
      }),
      assets: ASSETS,
      mode: 'inventory',
    });

    const row = single(evidence);
    expect(row.activation.state).toBe('inactive');
    expect(row.projection.state).toBe('not-applicable');
    const diagnostics = providerDiagnostics({
      pack: 'research',
      providers: evidence,
      mode: 'inventory',
    });
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]).toMatchObject({
      code: 'provider-inactive',
      severity: 'info',
      provider: 'codex',
    });
    expect(blockStatusFor(evidence, 'inventory')).toBe('ok');
  });

  it('emits provider-unsupported with the registry reason', () => {
    const evidence = projectProviderReachability({
      providerScopeContext: context({
        capabilities: [
          capability({
            scope: 'user',
            support: 'unsupported',
            projectionModes: ['unsupported'],
            catalogRefresh: UNKNOWN_REFRESH,
            unsupportedReason: 'Codex has no user skill projection',
          }),
        ],
      }),
      assets: ASSETS,
      mode: 'inventory',
    });

    const diagnostics = providerDiagnostics({
      pack: 'research',
      providers: evidence,
      mode: 'inventory',
    });
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]).toMatchObject({
      code: 'provider-unsupported',
      severity: 'info',
      detail: 'Codex has no user skill projection',
    });
    expect(blockStatusFor(evidence, 'inventory')).toBe('ok');
  });

  it('emits provider-materialization-missing as a warning naming the provider', () => {
    const evidence = projectProviderReachability({
      providerScopeContext: context({
        capabilities: [
          capability({
            scope: 'user',
            support: 'supported',
            projectionModes: ['materialization-extension'],
            catalogRefresh: LIVE_REFRESH,
          }),
        ],
      }),
      assets: ASSETS,
      mode: 'inventory',
      unmaterializedAssets: { skill: ['.agents/skills/analyze'] },
    });

    const row = single(evidence);
    expect(row.materialization.state).toBe('missing');
    expect(row.projection.state).toBe('absent');
    const diagnostics = providerDiagnostics({
      pack: 'research',
      providers: evidence,
      mode: 'inventory',
    });
    expect(diagnostics[0]).toMatchObject({
      code: 'provider-materialization-missing',
      severity: 'warning',
      provider: 'codex',
      affectedAssets: ['.agents/skills/analyze'],
    });
    expect(blockStatusFor(evidence, 'inventory')).toBe('partial');
  });

  it('emits provider-materialization-failed as an error only for a lifecycle run', () => {
    const evidence = projectProviderReachability({
      providerScopeContext: context({
        capabilities: [
          capability({
            scope: 'user',
            support: 'supported',
            projectionModes: ['entry-sync'],
            catalogRefresh: LIVE_REFRESH,
          }),
        ],
      }),
      assets: ASSETS,
      mode: 'lifecycle',
      syncRan: true,
      syncOperationResults: [
        {
          provider: 'codex',
          scope: 'user',
          contentKind: 'skill',
          asset: '.agents/skills/analyze',
          status: 'failed',
          failure: 'permission denied',
        },
      ],
    });

    expect(single(evidence).materialization.state).toBe('failed');
    const lifecycle = providerDiagnostics({
      pack: 'research',
      providers: evidence,
      mode: 'lifecycle',
    });
    expect(lifecycle[0]).toMatchObject({
      code: 'provider-materialization-failed',
      severity: 'error',
      provider: 'codex',
    });
    expect(lifecycle[0]?.detail).toContain('permission denied');
    expect(blockStatusFor(evidence, 'lifecycle')).toBe('partial');

    // Read-only inventory never observed a sync, so it can never report a
    // materialization failure.
    expect(
      providerDiagnostics({
        pack: 'research',
        providers: evidence,
        mode: 'inventory',
      }),
    ).toEqual([]);
    expect(blockStatusFor(evidence, 'inventory')).toBe('ok');
  });

  it('reports unknown visibility without claiming reachability and keeps the install at exit code 0', () => {
    const evidence = projectProviderReachability({
      providerScopeContext: context({
        capabilities: [
          capability({
            scope: 'user',
            support: 'supported',
            projectionModes: ['entry-sync'],
            catalogRefresh: UNKNOWN_REFRESH,
          }),
        ],
      }),
      assets: ASSETS,
      mode: 'lifecycle',
      syncRan: true,
      syncOperationResults: [
        {
          provider: 'codex',
          scope: 'user',
          contentKind: 'skill',
          asset: '.agents/skills/analyze',
          status: 'current',
        },
      ],
    });

    const row = single(evidence);
    expect(row.visibility.state).toBe('unknown');
    // Unknown is reported as unknown: it never claims the content is visible.
    expect(row.visibility.reason).toContain('refresh contract');
    const diagnostics = providerDiagnostics({
      pack: 'research',
      providers: evidence,
      mode: 'lifecycle',
    });
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]).toMatchObject({
      code: 'visibility-unknown',
      severity: 'info',
    });
    expect(blockStatusFor(evidence, 'lifecycle')).toBe('ok');

    // An otherwise successful install stays `complete`, which is exit code 0.
    const outcome = providerSyncOutcomeFromAutoSync(
      { synced: true, scopes: ['user'], error: null, evidence: [] },
      evidence,
    );
    expect(outcome.status).toBe('complete');
  });

  it.each([
    ['manual-refresh', 'refresh-required'],
    ['restart-required', 'restart-required'],
  ] as const)(
    'emits %s catalog state as the %s info diagnostic',
    (state, code) => {
      const evidence = projectProviderReachability({
        providerScopeContext: context({
          capabilities: [
            capability({
              scope: 'user',
              support: 'supported',
              projectionModes: ['entry-sync'],
              catalogRefresh: {
                state,
                provenance: {
                  kind: 'repository-decision',
                  reference: 'decision-record',
                  verifiedAt: '2026-01-01',
                },
              },
            }),
          ],
        }),
        assets: ASSETS,
        mode: 'lifecycle',
        syncRan: true,
        syncOperationResults: [
          {
            provider: 'codex',
            scope: 'user',
            contentKind: 'skill',
            asset: '.agents/skills/analyze',
            status: 'changed',
          },
        ],
      });

      const diagnostics = providerDiagnostics({
        pack: 'research',
        providers: evidence,
        mode: 'lifecycle',
      });
      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0]).toMatchObject({ code, severity: 'info' });
      expect(blockStatusFor(evidence, 'lifecycle')).toBe('ok');
    },
  );

  it('makes no projection claim when auto-sync did not run', () => {
    const evidence = projectProviderReachability({
      providerScopeContext: context({
        capabilities: [
          capability({
            scope: 'user',
            support: 'supported',
            projectionModes: ['entry-sync'],
            catalogRefresh: LIVE_REFRESH,
          }),
        ],
      }),
      assets: ASSETS,
      mode: 'lifecycle',
      syncRan: false,
    });

    const row = single(evidence);
    expect(row.materialization.state).toBe('not-applicable');
    expect(row.projection.state).toBe('not-applicable');
    expect(
      providerDiagnostics({
        pack: 'research',
        providers: evidence,
        mode: 'lifecycle',
      }),
    ).toEqual([]);
    expect(blockStatusFor(evidence, 'lifecycle')).toBe('ok');

    // `not-run` carries its reason and leaves the outcome complete.
    const outcome = providerSyncOutcomeFromAutoSync(
      { synced: false, scopes: [], error: null, evidence: [] },
      evidence,
    );
    expect(outcome.status).toBe('not-run');
    expect(outcome.providers).toHaveLength(1);
  });

  it('never derives reachability from provider filesystem presence', () => {
    // The mapper receives no path at all: an inactive provider stays inactive
    // however many provider directories exist on disk.
    const evidence = projectProviderReachability({
      providerScopeContext: context({
        active: false,
        activationSource: 'undetected-unset',
        capabilities: [
          capability({
            scope: 'user',
            support: 'supported',
            projectionModes: ['entry-sync'],
            catalogRefresh: LIVE_REFRESH,
          }),
        ],
      }),
      assets: ASSETS,
      mode: 'inventory',
      unmaterializedAssets: { skill: ['.agents/skills/analyze'] },
    });

    const row = single(evidence);
    expect(row.activation.state).toBe('inactive');
    expect(row.materialization.state).toBe('not-applicable');
    // An undetected, unconfigured provider is not a per-pack finding.
    expect(
      providerDiagnostics({
        pack: 'research',
        providers: evidence,
        mode: 'inventory',
      }),
    ).toEqual([]);
  });

  it('refines existing rows with observed sync results and leaves activation alone', () => {
    const before = projectProviderReachability({
      providerScopeContext: context({
        capabilities: [
          capability({
            scope: 'user',
            support: 'supported',
            projectionModes: ['entry-sync'],
            catalogRefresh: LIVE_REFRESH,
          }),
        ],
      }),
      assets: ASSETS,
      mode: 'lifecycle',
      syncRan: false,
    });

    const after = applySyncEvidence(before, {
      syncRan: true,
      syncOperationResults: [
        {
          provider: 'codex',
          scope: 'user',
          contentKind: 'skill',
          asset: '.agents/skills/analyze',
          status: 'changed',
        },
      ],
    });

    expect(after[0]?.activation).toEqual(before[0]?.activation);
    expect(after[0]?.capability).toEqual(before[0]?.capability);
    expect(after[0]?.materialization.state).toBe('materialized');
    expect(after[0]?.projection.state).toBe('projected');
  });
});

describe('provider reachability attribution and non-claims', () => {
  const supportedContext = () =>
    context({
      capabilities: [
        capability({
          scope: 'user',
          support: 'supported',
          projectionModes: ['entry-sync'],
          catalogRefresh: LIVE_REFRESH,
        }),
      ],
    });

  it('makes no materialization claim on a read-only surface that saw no sync', () => {
    const evidence = projectProviderReachability({
      providerScopeContext: supportedContext(),
      assets: ASSETS,
      mode: 'inventory',
    });

    const row = single(evidence);
    // Absence of an unmaterialized-asset diagnostic is not evidence that the
    // provider view exists (DR-260831).
    expect(row.materialization.state).toBe('not-applicable');
    expect(row.projection.state).toBe('not-applicable');
    // A non-claim must not produce refresh or restart advice either.
    expect(
      providerDiagnostics({
        pack: 'research',
        providers: evidence,
        mode: 'inventory',
      }),
    ).toEqual([]);
  });

  it("does not attribute another pack's operation to this pack", () => {
    const evidence = projectProviderReachability({
      providerScopeContext: supportedContext(),
      assets: ASSETS,
      mode: 'lifecycle',
      syncRan: true,
      syncOperationResults: [
        {
          provider: 'codex',
          scope: 'user',
          contentKind: 'skill',
          // Same provider, scope, and content kind, different pack's asset.
          asset: 'some-other-pack-skill',
          status: 'failed',
          failure: 'permission denied',
        },
      ],
    });

    const row = single(evidence);
    expect(row.materialization.state).toBe('not-applicable');
    expect(
      providerDiagnostics({
        pack: 'research',
        providers: evidence,
        mode: 'lifecycle',
      }),
    ).toEqual([]);
  });

  it("attributes an operation that matches this row's asset", () => {
    const evidence = projectProviderReachability({
      providerScopeContext: supportedContext(),
      assets: ASSETS,
      mode: 'lifecycle',
      syncRan: true,
      syncOperationResults: [
        {
          provider: 'codex',
          scope: 'user',
          contentKind: 'skill',
          asset: 'analyze',
          status: 'failed',
          failure: 'permission denied',
        },
      ],
    });

    expect(single(evidence).materialization.state).toBe('failed');
  });

  it.each([
    ['missing', 'missing'],
    ['unsupported', 'not-applicable'],
    ['planned', 'not-applicable'],
    ['unknown', 'not-applicable'],
  ] as const)(
    'classifies a %s operation status as %s rather than materialized',
    (status, expected) => {
      const evidence = projectProviderReachability({
        providerScopeContext: supportedContext(),
        assets: ASSETS,
        mode: 'lifecycle',
        syncRan: true,
        syncOperationResults: [
          {
            provider: 'codex',
            scope: 'user',
            contentKind: 'skill',
            asset: 'analyze',
            status,
          },
        ],
      });

      expect(single(evidence).materialization.state).toBe(expected);
      expect(single(evidence).projection.state).not.toBe('projected');
    },
  );
});

describe('extension operation attribution', () => {
  const agentContext = () =>
    context({
      capabilities: [
        {
          ...capability({
            scope: 'user',
            support: 'supported',
            projectionModes: ['materialization-extension'],
            catalogRefresh: LIVE_REFRESH,
          }),
          contentKind: 'agent',
        },
      ],
    });

  it('attributes a shared provider config failure to every managed role of that provider', () => {
    const evidence = projectProviderReachability({
      providerScopeContext: agentContext(),
      assets: { agent: ['~/.agents/agents/reviewer'] },
      mode: 'lifecycle',
      syncRan: true,
      extensionResults: [
        {
          provider: 'codex',
          scope: 'user',
          contentKind: 'agent',
          // The aggregate config belongs to no single pack, but every managed
          // role for this provider depends on it.
          target: 'config',
          path: '.codex/config.toml',
          status: 'failed',
          failure: 'permission denied',
        },
      ],
    });

    expect(single(evidence).materialization.state).toBe('failed');
  });

  it("does not attribute another pack's role operation to this pack", () => {
    const evidence = projectProviderReachability({
      providerScopeContext: agentContext(),
      assets: { agent: ['~/.agents/agents/reviewer'] },
      mode: 'lifecycle',
      syncRan: true,
      extensionResults: [
        {
          provider: 'codex',
          scope: 'user',
          contentKind: 'agent',
          target: 'role',
          path: '~/.agents/agents/some-other-agent.md',
          status: 'failed',
          failure: 'permission denied',
        },
      ],
    });

    expect(single(evidence).materialization.state).toBe('not-applicable');
  });

  it("attributes a role operation that matches this row's own asset", () => {
    const evidence = projectProviderReachability({
      providerScopeContext: agentContext(),
      assets: { agent: ['~/.agents/agents/reviewer'] },
      mode: 'lifecycle',
      syncRan: true,
      extensionResults: [
        {
          provider: 'codex',
          scope: 'user',
          contentKind: 'agent',
          target: 'role',
          path: '~/.agents/agents/reviewer.md',
          status: 'failed',
          failure: 'permission denied',
        },
      ],
    });

    expect(single(evidence).materialization.state).toBe('failed');
  });
});
