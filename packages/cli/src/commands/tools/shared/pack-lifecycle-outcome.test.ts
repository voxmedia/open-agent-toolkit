import { describe, expect, it } from 'vitest';

import type { ToolPackEvidence } from './pack-evidence';
import {
  evaluatePackLifecycleOutcome,
  providerSyncOutcomeFromAutoSync,
  resolveAdditivePackScopeSelection,
} from './pack-lifecycle-outcome';

function evidence(scopes: Array<'project' | 'user'>): ToolPackEvidence {
  return {
    schemaVersion: 1,
    pack: 'ideas',
    canonical: null,
    scopes: [],
    knownRealizedScopes: scopes,
    unknownScopes: [],
    realizedPlacement: scopes.length === 2 ? 'both' : (scopes[0] ?? 'none'),
    providers: [],
    diagnostics: [],
  };
}

describe('pack lifecycle outcome', () => {
  it.each([
    {
      requested: 'project' as const,
      retained: [] as const,
      target: ['project'],
    },
    {
      requested: 'user' as const,
      retained: ['project'] as const,
      target: ['project', 'user'],
    },
    {
      requested: 'both' as const,
      retained: ['user'] as const,
      target: ['project', 'user'],
    },
  ])(
    'resolves additive $requested scope selection',
    ({ requested, retained, target }) => {
      expect(
        resolveAdditivePackScopeSelection({
          pack: 'ideas',
          requested,
          knownRealizedScopes: retained,
          unknownScopes: [],
        }),
      ).toMatchObject({
        requested,
        retainedRealizedScopes: retained,
        targetScopes: target,
      });
    },
  );

  it('fails selection closed when any evaluated scope is unknown', () => {
    expect(() =>
      resolveAdditivePackScopeSelection({
        pack: 'ideas',
        requested: 'user',
        knownRealizedScopes: ['project'],
        unknownScopes: ['user'],
      }),
    ).toThrow(/inventory is unknown at user/);
  });

  it('reports complete only after canonical and final placement verification', () => {
    const selection = resolveAdditivePackScopeSelection({
      pack: 'ideas',
      requested: 'user',
      knownRealizedScopes: [],
      unknownScopes: [],
    });
    expect(
      evaluatePackLifecycleOutcome({
        selection,
        lifecycle: [],
        sync: { scopes: ['user'], status: 'complete', providers: [] },
        finalEvidence: evidence(['user']),
      }),
    ).toMatchObject({
      status: 'complete',
      canonical: { status: 'unchanged' },
      recovery: [],
    });
  });

  it('preserves canonical success as partial when provider sync fails', () => {
    const selection = resolveAdditivePackScopeSelection({
      pack: 'ideas',
      requested: 'user',
      knownRealizedScopes: ['user'],
      unknownScopes: [],
    });
    expect(
      evaluatePackLifecycleOutcome({
        selection,
        lifecycle: [],
        sync: {
          scopes: ['user'],
          status: 'failed',
          providers: [],
          error: 'cursor write failed',
        },
        finalEvidence: evidence(['user']),
      }),
    ).toMatchObject({
      status: 'partial',
      canonical: { status: 'unchanged' },
      recovery: [expect.objectContaining({ code: 'provider-sync-incomplete' })],
    });
  });

  it.each([
    {
      label: 'canonical failure',
      canonicalFailure: 'copy failed',
      finalEvidence: evidence(['user']),
      code: 'canonical-apply-failed',
    },
    {
      label: 'verification failure',
      canonicalFailure: undefined,
      finalEvidence: null,
      code: 'final-inventory-unverified',
    },
  ])(
    'reports failed for $label',
    ({ canonicalFailure, finalEvidence, code }) => {
      const selection = resolveAdditivePackScopeSelection({
        pack: 'ideas',
        requested: 'user',
        knownRealizedScopes: [],
        unknownScopes: [],
      });
      expect(
        evaluatePackLifecycleOutcome({
          selection,
          lifecycle: [],
          sync: { scopes: [], status: 'not-run', providers: [] },
          finalEvidence,
          canonicalFailure,
        }),
      ).toMatchObject({
        status: 'failed',
        recovery: expect.arrayContaining([expect.objectContaining({ code })]),
      });
    },
  );

  it('normalizes auto-sync results without losing failure detail', () => {
    expect(
      providerSyncOutcomeFromAutoSync({
        synced: false,
        scopes: ['project'],
        error: 'provider failed',
      }),
    ).toEqual({
      scopes: ['project'],
      status: 'failed',
      providers: [],
      error: 'provider failed',
    });
  });
});
