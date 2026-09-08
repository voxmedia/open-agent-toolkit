import type { CommandContext } from '@app/command-context';
import { createLoggerCapture } from '@commands/__tests__/helpers';
import type { ProviderContextDependencies } from '@commands/tools/shared/provider-context';
import type { ToolInfo } from '@commands/tools/shared/types';
import type {
  ProviderProjectionMode,
  ProviderRegistration,
} from '@providers/shared/registry';
import { describe, expect, it } from 'vitest';

import {
  type InfoToolDependencies,
  runInfoTool,
  type ToolDetail,
} from './info-tool';

function createContext(
  overrides: Partial<CommandContext> = {},
): CommandContext {
  const capture = createLoggerCapture();
  return {
    scope: 'all',
    dryRun: false,
    verbose: false,
    json: false,
    cwd: '/project',
    home: '/home/user',
    interactive: false,
    logger: capture.logger,
    ...overrides,
  };
}

const sampleSkill: ToolInfo = {
  name: 'oat-idea-new',
  type: 'skill',
  scope: 'project',
  version: '1.0.0',
  bundledVersion: '1.0.0',
  pack: 'ideas',
  status: 'current',
};

const sampleAgent: ToolInfo = {
  name: 'oat-reviewer',
  type: 'agent',
  scope: 'project',
  version: '1.0.0',
  bundledVersion: '1.0.0',
  pack: 'workflows',
  status: 'current',
};

const defaultDetail: Omit<ToolDetail, keyof ToolInfo> = {
  description: 'A test skill',
  argumentHint: 'some-arg',
  allowedTools: 'Read, Write',
  userInvocable: true,
};

function createDeps(
  toolsByScope: Record<string, ToolInfo[]> = {},
  detail: Omit<ToolDetail, keyof ToolInfo> = defaultDetail,
): InfoToolDependencies {
  return {
    scanTools: async (options) => toolsByScope[options.scope] ?? [],
    resolveScopeRoot: async (scope) =>
      scope === 'project' ? '/project' : '/home/user',
    resolveAssetsRoot: async () => '/assets',
    getToolDetail: async () => detail,
    inventoryPack: async ({ pack, projectRoot, userRoot }) => ({
      pack,
      placement: projectRoot ? 'project' : userRoot ? 'user' : 'unavailable',
      scopes: [],
      diagnostics: [],
    }),
  };
}

describe('runInfoTool', () => {
  it('displays full details for an installed skill', async () => {
    const deps = createDeps({ project: [sampleSkill] });
    const capture = createLoggerCapture();
    const context = createContext({ logger: capture.logger });

    const result = await runInfoTool(context, 'oat-idea-new', deps);

    expect(result.found).toBe(true);
    expect(result.tool!.name).toBe('oat-idea-new');
    expect(capture.info.some((l) => l.includes('oat-idea-new'))).toBe(true);
    expect(capture.info.some((l) => l.includes('A test skill'))).toBe(true);
    expect(capture.info.some((l) => l.includes('Invocable'))).toBe(true);
  });

  it('displays full details for an installed agent', async () => {
    const agentDetail = {
      description: 'A review agent',
      argumentHint: null,
      allowedTools: null,
      userInvocable: false,
    };
    const deps = createDeps({ project: [sampleAgent] }, agentDetail);
    const capture = createLoggerCapture();
    const context = createContext({ logger: capture.logger });

    const result = await runInfoTool(context, 'oat-reviewer', deps);

    expect(result.found).toBe(true);
    expect(result.tool!.type).toBe('agent');
    expect(capture.info.some((l) => l.includes('A review agent'))).toBe(true);
    // Agents should not show Invocable line
    expect(capture.info.some((l) => l.includes('Invocable'))).toBe(false);
  });

  it('shows update available when outdated', async () => {
    const outdatedSkill: ToolInfo = {
      ...sampleSkill,
      version: '1.0.0',
      bundledVersion: '2.0.0',
      status: 'outdated',
    };
    const deps = createDeps({ project: [outdatedSkill] });
    const capture = createLoggerCapture();
    const context = createContext({ logger: capture.logger });

    const result = await runInfoTool(context, 'oat-idea-new', deps);

    expect(result.found).toBe(true);
    expect(capture.warn.some((l) => l.includes('Update available'))).toBe(true);
  });

  it('reports error when tool not found', async () => {
    const deps = createDeps({});
    const capture = createLoggerCapture();
    const context = createContext({ logger: capture.logger });

    const result = await runInfoTool(context, 'nonexistent', deps);

    expect(result.found).toBe(false);
    expect(result.tool).toBeNull();
    expect(capture.error.some((l) => l.includes('not found'))).toBe(true);
  });

  it('outputs JSON when --json is set', async () => {
    const deps = createDeps({ project: [sampleSkill] });
    const capture = createLoggerCapture();
    const context = createContext({
      json: true,
      logger: capture.logger,
    });

    await runInfoTool(context, 'oat-idea-new', deps);

    expect(capture.jsonPayloads).toHaveLength(1);
    const payload = capture.jsonPayloads[0] as { tool: ToolDetail };
    expect(payload.tool.name).toBe('oat-idea-new');
    expect(payload.tool.description).toBe('A test skill');
  });

  it('searches across scopes when --scope is all', async () => {
    const deps = createDeps({
      project: [],
      user: [{ ...sampleSkill, scope: 'user' }],
    });
    const capture = createLoggerCapture();
    const context = createContext({ scope: 'all', logger: capture.logger });

    const result = await runInfoTool(context, 'oat-idea-new', deps);

    expect(result.found).toBe(true);
    expect(result.tool!.scope).toBe('user');
  });

  it('reports pack completeness, missing members, and intent provenance', async () => {
    const deps = createDeps({});
    deps.inventoryPack = async ({ pack }) => ({
      pack,
      placement: 'user',
      diagnostics: [],
      scopes: [
        {
          pack,
          scope: 'user',
          intent: {
            pack,
            scope: 'user',
            enabled: true,
            source: 'declared',
            configPath: '/home/.oat/config.json',
            diagnostics: [],
          },
          completeness: 'partial',
          diagnostics: [],
          assets: [
            {
              definition: {
                id: 'template:ideas/idea-summary.md',
                kind: 'template',
                source: 'templates/ideas/idea-summary.md',
                destination: '.oat/templates/ideas/idea-summary.md',
                scopes: ['project', 'user'],
                ownership: {
                  project: 'seed-if-missing',
                  user: 'managed',
                },
              },
              path: '/home/.oat/templates/ideas/idea-summary.md',
              status: 'missing',
              installedVersion: null,
              bundledVersion: null,
            },
          ],
        },
      ],
    });
    const capture = createLoggerCapture();
    const result = await runInfoTool(
      createContext({ logger: capture.logger }),
      'ideas',
      deps,
    );
    expect(result.pack?.scopes[0]).toMatchObject({
      completeness: 'partial',
      intent: { source: 'declared' },
    });
    expect(capture.info.join('\n')).toContain(
      'template:ideas/idea-summary.md [template] missing',
    );
    expect(capture.info.join('\n')).toContain(
      'path=/home/.oat/templates/ideas/idea-summary.md',
    );
    expect(result.packEvidence).toMatchObject({
      schemaVersion: 1,
      status: 'partial',
      items: [
        expect.objectContaining({
          realizedPlacement: 'none',
          diagnostics: expect.arrayContaining([
            expect.objectContaining({ code: 'declared-only' }),
            expect.objectContaining({ code: 'partial-placement' }),
          ]),
        }),
      ],
    });
    expect(capture.info.join('\n')).toContain('Realized placement: none');
  });

  it('returns unavailable pack evidence without changing the pack lookup contract', async () => {
    const deps = createDeps({});
    deps.inventoryPack = async () => {
      throw new Error('cannot read /home/user/private/pack');
    };
    const capture = createLoggerCapture();

    const result = await runInfoTool(
      createContext({ scope: 'user', json: true, logger: capture.logger }),
      'ideas',
      deps,
    );

    expect(result).toMatchObject({ found: true, tool: null, pack: null });
    expect(result.packEvidence).toMatchObject({
      status: 'partial',
      items: [
        expect.objectContaining({
          realizedPlacement: 'unknown',
          diagnostics: [
            expect.objectContaining({
              code: 'inventory-unavailable',
              detail: 'cannot read ~/private/pack',
            }),
          ],
        }),
      ],
    });
    expect(JSON.stringify(capture.jsonPayloads[0])).not.toContain('/home/user');
  });
});

/**
 * Provider surface doubles: `list` and `info` must agree with `status` and
 * `doctor` on whether an active provider materializes managed user-scope
 * roles. These build the same config-aware context those commands resolve.
 */
function providerContextDependencies(input: {
  activeProviders: string[];
  userAgentProjectionMode?: ProviderProjectionMode;
}): ProviderContextDependencies {
  const capabilities = (['project', 'user'] as const).flatMap((scope) =>
    (['skill', 'agent', 'rule', 'directory'] as const).map((contentKind) => ({
      scope,
      contentKind,
      support: 'supported' as const,
      projectionModes:
        contentKind === 'agent' && scope === 'user'
          ? [input.userAgentProjectionMode ?? 'entry-sync']
          : ['entry-sync' as const],
      nativeRoleSurface: contentKind === 'agent',
      collectionAlias: 'unsupported' as const,
      catalogRefresh: {
        state: 'live' as const,
        provenance: {
          kind: 'official-contract' as const,
          reference: 'https://example.invalid/contract',
          verifiedAt: '2026-01-01',
        },
      },
    })),
  );
  const registration = {
    adapter: { name: 'codex' },
    extensions: [],
    capabilities,
  } as unknown as ProviderRegistration;
  return {
    loadSyncConfig: async () => ({ providers: {} }) as never,
    resolveProviderScopeContext: async ({ scope }) => ({
      scope,
      configSource: '~/.oat/sync/config.json',
      activeProviders: input.activeProviders,
      detectedProviders: input.activeProviders,
      mismatches: { detectedUnset: [], detectedDisabled: [] },
      activation: [
        {
          provider: 'codex',
          state: input.activeProviders.includes('codex')
            ? ('active' as const)
            : ('inactive' as const),
          source: input.activeProviders.includes('codex')
            ? ('config-enabled' as const)
            : ('config-disabled' as const),
          reason: 'test activation',
        },
      ],
      registrations: [registration],
    }),
  };
}

function unmaterializedUserPack(pack: string) {
  return {
    pack,
    placement: 'user' as const,
    scopes: [
      {
        pack,
        scope: 'user' as const,
        intent: {
          pack,
          scope: 'user' as const,
          enabled: true,
          source: 'declared',
          configPath: '/home/user/.oat/config.json',
          diagnostics: [],
        },
        completeness: 'complete' as const,
        assets: [
          {
            definition: {
              id: 'skeptical-evaluator',
              kind: 'agent' as const,
              destination: '.agents/agents/skeptical-evaluator.md',
              scopes: ['user' as const],
              ownership: { user: 'managed' as const },
            },
            path: '/home/user/.agents/agents/skeptical-evaluator.md',
            status: 'current' as const,
            installedVersion: null,
            bundledVersion: null,
          },
        ],
        diagnostics: [
          {
            code: 'user-agent-unmaterialized' as const,
            message: 'Pack installs user-scope canonical agents',
            paths: ['/home/user/.agents/agents/skeptical-evaluator.md'],
          },
        ],
      },
    ],
    diagnostics: [
      {
        code: 'user-agent-unmaterialized' as const,
        message: 'Pack installs user-scope canonical agents',
        paths: ['/home/user/.agents/agents/skeptical-evaluator.md'],
      },
    ],
  } as never;
}

describe('runInfoTool provider agreement', () => {
  it('does not report unmaterialized user agents when an active provider supplies managed roles', async () => {
    const received: Array<boolean | undefined> = [];
    const capture = createLoggerCapture();
    const result = await runInfoTool(
      createContext({ json: true, logger: capture.logger, scope: 'user' }),
      'research',
      {
        ...createDeps(),
        inventoryPack: async ({ pack, userManagedRoleMaterialization }) => {
          received.push(userManagedRoleMaterialization);
          return unmaterializedUserPack(pack);
        },
        providerContext: providerContextDependencies({
          activeProviders: ['codex'],
        }),
      },
    );

    // `status` and `doctor` already passed this argument; `info` did not.
    expect(received).toEqual([true]);
    expect(
      result.packEvidence?.diagnostics.map(({ code }) => code),
    ).not.toContain('provider-materialization-missing');
    expect(result.packEvidence?.status).toBe('ok');
  });

  it('still reports unmaterialized user agents when no active provider supplies managed roles', async () => {
    const received: Array<boolean | undefined> = [];
    const capture = createLoggerCapture();
    const result = await runInfoTool(
      createContext({ json: true, logger: capture.logger, scope: 'user' }),
      'research',
      {
        ...createDeps(),
        inventoryPack: async ({ pack, userManagedRoleMaterialization }) => {
          received.push(userManagedRoleMaterialization);
          return unmaterializedUserPack(pack);
        },
        providerContext: providerContextDependencies({ activeProviders: [] }),
      },
    );

    expect(received).toEqual([false]);
    expect(result.packEvidence?.diagnostics.map(({ code }) => code)).toContain(
      'provider-materialization-missing',
    );
    expect(result.packEvidence?.status).toBe('partial');
  });
});
