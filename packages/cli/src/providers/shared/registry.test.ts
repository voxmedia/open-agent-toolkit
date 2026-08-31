import type { SyncConfig } from '@config/sync-config';
import type { ProviderAdapter } from '@providers/shared/adapter.types';
import { describe, expect, it } from 'vitest';

import {
  getProviderRegistrations,
  resolveProviderScopeContext,
  validateProviderRegistrations,
  type ProviderRegistration,
} from './registry';

function createAdapter(name: string, detected: boolean): ProviderAdapter {
  return {
    name,
    displayName: name,
    defaultStrategy: 'auto',
    projectMappings: [],
    userMappings: [],
    detect: async () => detected,
  };
}

function registration(name: string, detected = false): ProviderRegistration {
  return {
    adapter: createAdapter(name, detected),
    extensions: [],
    capabilities: (['project', 'user'] as const).flatMap((scope) =>
      (['skill', 'agent', 'rule', 'directory'] as const).map((contentKind) => ({
        scope,
        contentKind,
        support: 'unsupported' as const,
        projectionModes: ['unsupported'] as const,
        nativeRoleSurface: false,
        collectionAlias: 'unsupported' as const,
        catalogRefresh: { state: 'unknown' as const, reason: 'test' },
        unsupportedReason: 'test',
      })),
    ),
  };
}

const config = (providers: SyncConfig['providers']): SyncConfig => ({
  version: 1,
  defaultStrategy: 'auto',
  knownStrays: [],
  providers,
});

describe('provider registry', () => {
  it('registers every adapter once in canonical provider order', () => {
    const registrations = getProviderRegistrations();
    expect(registrations.map(({ adapter }) => adapter.name)).toEqual([
      'claude',
      'cursor',
      'codex',
      'copilot',
      'gemini',
    ]);
    expect(
      registrations.every(({ capabilities }) => capabilities.length === 8),
    ).toBe(true);
  });

  it('records explicit scope/content support, projections, extensions, collections, and refresh policy', () => {
    const registrations = getProviderRegistrations();
    const codex = registrations.find(
      ({ adapter }) => adapter.name === 'codex',
    )!;
    expect(codex.extensions.map(({ provider }) => provider)).toEqual(['codex']);
    expect(
      codex.capabilities.find(
        ({ scope, contentKind }) => scope === 'user' && contentKind === 'agent',
      ),
    ).toMatchObject({
      support: 'supported',
      projectionModes: ['native-read', 'materialization-extension'],
      nativeRoleSurface: true,
      catalogRefresh: { state: 'unknown' },
    });
    expect(
      registrations[0]!.capabilities.find(
        ({ scope, contentKind }) => scope === 'user' && contentKind === 'rule',
      ),
    ).toMatchObject({
      support: 'unsupported',
      projectionModes: ['unsupported'],
    });
  });

  it('uses focused adapter mappings as Copilot and Gemini managed-role proof', () => {
    for (const name of ['copilot', 'gemini']) {
      const row = getProviderRegistrations()
        .find(({ adapter }) => adapter.name === name)!
        .capabilities.find(
          ({ scope, contentKind }) =>
            scope === 'user' && contentKind === 'agent',
        );
      expect(row).toMatchObject({
        support: 'supported',
        nativeRoleSurface: true,
      });
      expect(row?.projectionModes).not.toContain('unsupported');
    }
  });

  it('rejects duplicate, missing, and contradictory registration rows', () => {
    const complete = registration('test');
    expect(() => validateProviderRegistrations([complete, complete])).toThrow(
      /more than once/,
    );
    expect(() =>
      validateProviderRegistrations([
        { ...complete, capabilities: complete.capabilities.slice(1) },
      ]),
    ).toThrow(/exactly one project skill/);
    expect(() =>
      validateProviderRegistrations([
        {
          ...complete,
          capabilities: complete.capabilities.map((row, index) =>
            index === 0 ? { ...row, support: 'supported' as const } : row,
          ),
        },
      ]),
    ).toThrow(/contradictory/);
  });

  it.each([
    {
      label: 'enabled without detection',
      detected: false,
      providers: { test: { enabled: true } },
      state: 'active',
      source: 'config-enabled',
    },
    {
      label: 'disabled with detection',
      detected: true,
      providers: { test: { enabled: false } },
      state: 'inactive',
      source: 'config-disabled',
    },
    {
      label: 'detected with unset config',
      detected: true,
      providers: {},
      state: 'active',
      source: 'detected-unset',
    },
    {
      label: 'undetected with unset config',
      detected: false,
      providers: {},
      state: 'inactive',
      source: 'undetected-unset',
    },
  ])(
    'preserves activation precedence for $label',
    async ({ detected, providers, state, source }) => {
      const context = await resolveProviderScopeContext({
        scope: 'user',
        scopeRoot: '/tmp/user',
        config: config(providers),
        registrations: [registration('test', detected)],
      });
      expect(context.activation).toEqual([
        expect.objectContaining({ provider: 'test', state, source }),
      ]);
      expect(context.activeProviders).toEqual(
        state === 'active' ? ['test'] : [],
      );
      expect(context.configSource).not.toContain('/tmp/user');
    },
  );
});
