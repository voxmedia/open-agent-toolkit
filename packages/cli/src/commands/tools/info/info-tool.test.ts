import type { CommandContext } from '@app/command-context';
import { createLoggerCapture } from '@commands/__tests__/helpers';
import type { ProviderContextDependencies } from '@commands/tools/shared/provider-context';
import type { ToolInfo } from '@commands/tools/shared/types';
import type { DriftReport } from '@drift/index';
import { resolveExpectedSkillProjections } from '@drift/index';
import type { Manifest, ManifestEntryV2 } from '@manifest/manifest.types';
import type { PathMapping } from '@providers/shared/adapter.types';
import type {
  ProviderProjectionMode,
  ProviderRegistration,
} from '@providers/shared/registry';
import type { ConcreteScope } from '@shared/types';
import { describe, expect, it } from 'vitest';

import {
  type InfoToolDependencies,
  runInfoTool,
  type ToolDetail,
} from './info-tool';
import { probeProviderPath, type SkillViewDependencies } from './skill-views';

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
      // `restart-required` rather than `live`: a `live` policy emits no
      // visibility diagnostic at all, which would make the read-only
      // suppression guard below vacuous.
      catalogRefresh: {
        state: 'restart-required' as const,
        provenance: {
          kind: 'repository-decision' as const,
          reference: 'DR-260831-provider-aware-reachability',
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

describe('runInfoTool read-only diagnostic suppression', () => {
  const VISIBILITY_CODES = [
    'visibility-unknown',
    'refresh-required',
    'restart-required',
  ];

  it('never emits visibility or failure codes on a read-only surface', async () => {
    const capture = createLoggerCapture();
    const result = await runInfoTool(
      createContext({ json: true, logger: capture.logger, scope: 'user' }),
      'research',
      {
        ...createDeps(),
        inventoryPack: async ({ pack }) => unmaterializedUserPack(pack),
        providerContext: providerContextDependencies({
          activeProviders: ['codex'],
        }),
      },
    );

    const codes = (result.packEvidence?.diagnostics ?? []).map(
      ({ code }) => code,
    );
    // Matrix row 8: a read-only surface ran no sync, so it can neither observe
    // a materialization failure nor establish the projection the visibility
    // codes presuppose.
    expect(codes).not.toContain('provider-materialization-failed');
    for (const code of VISIBILITY_CODES) expect(codes).not.toContain(code);

    // The registered catalog state is still readable on the row itself, and
    // the reachable row's policy really is one that WOULD emit a diagnostic
    // in a lifecycle run — otherwise the assertions above are vacuous.
    const rows = result.packEvidence?.items[0]?.providers ?? [];
    expect(rows.length).toBeGreaterThan(0);
    expect(
      rows.some(({ visibility }) => visibility.state === 'restart-required'),
    ).toBe(true);
    expect(
      rows.every(
        ({ materialization }) => materialization.state !== 'materialized',
      ),
    ).toBe(true);
  });

  it('reports an inactive provider without catalog visibility advice', async () => {
    const capture = createLoggerCapture();
    const result = await runInfoTool(
      createContext({ json: true, logger: capture.logger, scope: 'user' }),
      'research',
      {
        ...createDeps(),
        inventoryPack: async ({ pack }) => unmaterializedUserPack(pack),
        providerContext: providerContextDependencies({ activeProviders: [] }),
      },
    );

    const inactiveRows = result.packEvidence?.items[0]?.providers ?? [];
    const inactive = inactiveRows.find(
      ({ activation }) => activation.state === 'inactive',
    );
    expect(inactive).toBeDefined();
    // Refresh or restart advice about a provider that is not active reads as
    // guidance the user should act on.
    expect(inactive?.visibility.state).toBe('not-applicable');
    expect(inactive?.projection.state).toBe('not-applicable');
  });

  it('reports a bundled-coverage absence as missing, never as failed', async () => {
    // The read-only path that DOES reach the absence branch: an active
    // provider whose user-agent projection is extension-only supplies managed
    // roles for bundled agents only, so the unmaterialized diagnostic
    // survives and is attributed to that provider.
    const capture = createLoggerCapture();
    const result = await runInfoTool(
      createContext({ json: true, logger: capture.logger, scope: 'user' }),
      'research',
      {
        ...createDeps(),
        inventoryPack: async ({ pack }) => unmaterializedUserPack(pack),
        providerContext: providerContextDependencies({
          activeProviders: ['codex'],
          userAgentProjectionMode: 'materialization-extension',
        }),
      },
    );

    const rows = result.packEvidence?.items[0]?.providers ?? [];
    const codes = (result.packEvidence?.diagnostics ?? []).map(
      ({ code }) => code,
    );

    expect(
      rows.some(({ materialization }) => materialization.state === 'missing'),
    ).toBe(true);
    expect(codes).toContain('provider-materialization-missing');
    // Matrix row 8: even with a real absence, a read-only surface reports it
    // as a warning, never as the error-severity failure code.
    expect(
      rows.every(({ materialization }) => materialization.state !== 'failed'),
    ).toBe(true);
    expect(codes).not.toContain('provider-materialization-failed');
  });
});

/**
 * Provider-view diagnostic doubles. Only the filesystem, manifest, and drift
 * facts are faked: the expected-projection resolver under test is the real one,
 * so the concrete provider path in these assertions is derived from the adapter
 * mappings exactly as the command derives it.
 */
function skillProviderContext(input: {
  activeByScope: Partial<Record<ConcreteScope, string[]>>;
}): ProviderContextDependencies {
  const skillMapping = (
    providerDir: string,
    nativeRead: boolean,
  ): PathMapping => ({
    contentType: 'skill',
    canonicalDir: '.agents/skills',
    providerDir,
    nativeRead,
  });
  const registrations = [
    { name: 'claude', providerDir: '.claude/skills', nativeRead: false },
    { name: 'codex', providerDir: '.agents/skills', nativeRead: true },
  ].map(
    ({ name, providerDir, nativeRead }) =>
      ({
        adapter: {
          name,
          displayName: name,
          defaultStrategy: 'symlink',
          projectMappings: [skillMapping(providerDir, nativeRead)],
          userMappings: [skillMapping(providerDir, nativeRead)],
          detect: async () => true,
        },
        extensions: [],
        capabilities: [],
      }) as unknown as ProviderRegistration,
  );
  return {
    loadSyncConfig: async () => ({ providers: {} }) as never,
    resolveProviderScopeContext: async ({ scope }) => {
      const activeProviders = input.activeByScope[scope] ?? [];
      return {
        scope,
        configSource: '<project>/.oat/sync/config.json',
        activeProviders,
        detectedProviders: activeProviders,
        mismatches: { detectedUnset: [], detectedDisabled: [] },
        activation: registrations.map(({ adapter }) => ({
          provider: adapter.name,
          state: activeProviders.includes(adapter.name)
            ? ('active' as const)
            : ('inactive' as const),
          source: 'config-enabled' as const,
          reason: 'test activation',
        })),
        registrations,
      };
    },
  };
}

function skillViewDependencies(input: {
  existingPaths: string[];
  manifestEntries?: Record<string, ManifestEntryV2[]>;
  driftStates?: Record<string, DriftReport['state']>;
  versions?: Record<string, string | null>;
  detectDriftCalls?: string[];
}): SkillViewDependencies {
  const existing = new Set(input.existingPaths);
  return {
    loadManifest: async (manifestPath) =>
      ({
        version: 2,
        oatVersion: '0.0.0-test',
        entries: input.manifestEntries?.[manifestPath] ?? [],
        collections: [],
        lastUpdated: '2026-09-01T00:00:00.000Z',
      }) as unknown as Manifest,
    detectDrift: async (entry, scopeRoot) => {
      input.detectDriftCalls?.push(`${scopeRoot}:${entry.providerPath}`);
      return {
        canonical: entry.canonicalPath,
        provider: entry.provider,
        providerPath: entry.providerPath,
        state: input.driftStates?.[entry.providerPath] ?? { status: 'in_sync' },
      };
    },
    resolveExpectedProjections: resolveExpectedSkillProjections,
    pathExists: async (path) => existing.has(path),
    getSkillVersion: async (skillDir) => input.versions?.[skillDir] ?? null,
  };
}

const PROJECT_CANONICAL = '/project/.agents/skills/oat-idea-new';
const USER_CANONICAL = '/home/user/.agents/skills/oat-idea-new';

describe('runInfoTool provider-view diagnostic', () => {
  it('reports a never-synced skill as missing-additive with the concrete path and a concrete-scope repair', async () => {
    const detectDriftCalls: string[] = [];
    const capture = createLoggerCapture();
    const result = await runInfoTool(
      createContext({ scope: 'project', logger: capture.logger }),
      'oat-idea-new',
      {
        ...createDeps({ project: [sampleSkill] }),
        providerContext: skillProviderContext({
          activeByScope: { project: ['claude', 'codex'] },
        }),
        skillViews: skillViewDependencies({
          existingPaths: [PROJECT_CANONICAL],
          detectDriftCalls,
        }),
      },
    );

    const claude = result.providerViews?.[0]?.views.find(
      ({ provider }) => provider === 'claude',
    );
    expect(claude).toMatchObject({
      viewClass: 'missing-additive',
      providerPath: '.claude/skills/oat-idea-new',
      tracked: false,
      driftState: null,
      suggestion: 'oat sync --scope project',
    });
    // A native-read provider sees the canonical skill itself; reporting it as
    // missing would send the user to a sync that creates nothing.
    expect(
      result.providerViews?.[0]?.views.find(
        ({ provider }) => provider === 'codex',
      ),
    ).toMatchObject({
      viewClass: 'in-sync',
      nativeRead: true,
      suggestion: null,
    });
    const output = capture.info.join('\n');
    expect(output).toContain('Provider views (project):');
    expect(output).toContain('.claude/skills/oat-idea-new');
    expect(output).toContain('Repair: oat sync --scope project');
    // `detectDrift` needs a manifest entry; the never-synced case must not
    // pretend to have one.
    expect(detectDriftCalls).toEqual([]);
  });

  it('reports an inactive provider as inactive, never as missing, and suggests nothing', async () => {
    const capture = createLoggerCapture();
    const result = await runInfoTool(
      createContext({ scope: 'user', logger: capture.logger }),
      'oat-idea-new',
      {
        ...createDeps({ user: [{ ...sampleSkill, scope: 'user' }] }),
        providerContext: skillProviderContext({ activeByScope: { user: [] } }),
        skillViews: skillViewDependencies({ existingPaths: [USER_CANONICAL] }),
      },
    );

    expect(
      result.providerViews?.[0]?.views.map(({ viewClass, suggestion }) => ({
        viewClass,
        suggestion,
      })),
    ).toEqual([
      { viewClass: 'inactive', suggestion: null },
      { viewClass: 'inactive', suggestion: null },
    ]);
    expect(capture.info.join('\n')).not.toContain('oat sync');
  });

  it('reports a stale user-scope copy view as modified with both versions', async () => {
    const capture = createLoggerCapture();
    const entry: ManifestEntryV2 = {
      canonicalPath: '.agents/skills/oat-idea-new',
      providerPath: '.claude/skills/oat-idea-new',
      provider: 'claude',
      contentType: 'skill',
      contentHash: 'sha256:stale',
      isFile: false,
      lastSynced: '2026-09-01T00:00:00.000Z',
      strategy: 'copy',
    };
    const result = await runInfoTool(
      createContext({ scope: 'user', logger: capture.logger }),
      'oat-idea-new',
      {
        ...createDeps({
          user: [{ ...sampleSkill, scope: 'user', version: '1.2.1' }],
        }),
        providerContext: skillProviderContext({
          activeByScope: { user: ['claude'] },
        }),
        skillViews: skillViewDependencies({
          existingPaths: [
            USER_CANONICAL,
            '/home/user/.claude/skills/oat-idea-new',
          ],
          manifestEntries: {
            '/home/user/.oat/sync/manifest.json': [entry],
          },
          driftStates: {
            '.claude/skills/oat-idea-new': {
              status: 'drifted',
              reason: 'modified',
            },
          },
          versions: {
            '/home/user/.claude/skills/oat-idea-new': '1.0.0',
          },
        }),
      },
    );

    expect(result.providerViews?.[0]?.views[0]).toMatchObject({
      viewClass: 'modified',
      driftState: { status: 'drifted', reason: 'modified' },
      canonicalVersion: '1.2.1',
      viewVersion: '1.0.0',
      versionComparable: true,
      suggestion: 'oat sync --scope user',
    });
    expect(capture.info.join('\n')).toContain('Repair: oat sync --scope user');
    expect(capture.info.join('\n')).toContain(
      'versions: canonical 1.2.1, view 1.0.0',
    );
  });

  it('emits one concrete-scope repair per affected scope and never --scope all', async () => {
    const capture = createLoggerCapture();
    const result = await runInfoTool(
      createContext({ scope: 'all', logger: capture.logger }),
      'oat-idea-new',
      {
        ...createDeps({
          project: [sampleSkill],
          user: [{ ...sampleSkill, scope: 'user' }],
        }),
        providerContext: skillProviderContext({
          activeByScope: { project: ['claude'], user: ['claude'] },
        }),
        skillViews: skillViewDependencies({
          existingPaths: [PROJECT_CANONICAL, USER_CANONICAL],
        }),
      },
    );

    expect(result.providerViews?.map(({ scope }) => scope)).toEqual([
      'project',
      'user',
    ]);
    const suggestions = (result.providerViews ?? []).flatMap(({ views }) =>
      views.map(({ suggestion }) => suggestion).filter(Boolean),
    );
    expect(suggestions).toEqual([
      'oat sync --scope project',
      'oat sync --scope user',
    ]);
    const repairs = capture.info.filter((line) => line.includes('Repair:'));
    expect(repairs).toEqual([
      '    Repair: oat sync --scope project',
      '    Repair: oat sync --scope user',
    ]);
    expect(capture.info.join('\n')).not.toContain('--scope all');
  });

  it('keeps every current JSON field and adds the diagnostic additively', async () => {
    const capture = createLoggerCapture();
    await runInfoTool(
      createContext({ scope: 'project', json: true, logger: capture.logger }),
      'oat-idea-new',
      {
        ...createDeps({ project: [sampleSkill] }),
        providerContext: skillProviderContext({
          activeByScope: { project: ['claude'] },
        }),
        skillViews: skillViewDependencies({
          existingPaths: [PROJECT_CANONICAL],
        }),
      },
    );

    const payload = capture.jsonPayloads[0] as {
      tool: ToolDetail;
      providerViews: Array<{ scope: string; result: string }>;
    };
    expect(Object.keys(payload.tool).sort()).toEqual(
      [
        'allowedTools',
        'argumentHint',
        'bundledVersion',
        'description',
        'name',
        'pack',
        'scope',
        'status',
        'type',
        'userInvocable',
        'version',
      ].sort(),
    );
    expect(payload.providerViews[0]).toMatchObject({
      scope: 'project',
      result: 'diagnosed',
    });
  });

  it('keeps the not-found wording and emits no provider-view block for an unknown name', async () => {
    const capture = createLoggerCapture();
    const result = await runInfoTool(
      createContext({ scope: 'project', logger: capture.logger }),
      'nonexistent',
      {
        ...createDeps({}),
        providerContext: skillProviderContext({
          activeByScope: { project: ['claude'] },
        }),
        skillViews: skillViewDependencies({
          existingPaths: [PROJECT_CANONICAL],
        }),
      },
    );

    // Missing distribution and an unknown name must never read alike.
    expect(result.found).toBe(false);
    expect(result.providerViews).toBeUndefined();
    expect(capture.error).toEqual(["Tool 'nonexistent' not found."]);
    expect(capture.info.join('\n')).not.toContain('Provider views');
  });

  it('runs no diagnostic for an agent and never mutates on the read-only path', async () => {
    const detectDriftCalls: string[] = [];
    const capture = createLoggerCapture();
    const result = await runInfoTool(
      createContext({ scope: 'project', logger: capture.logger }),
      'oat-reviewer',
      {
        ...createDeps(
          { project: [sampleAgent] },
          {
            description: 'A review agent',
            argumentHint: null,
            allowedTools: null,
            userInvocable: false,
          },
        ),
        providerContext: skillProviderContext({
          activeByScope: { project: ['claude'] },
        }),
        skillViews: skillViewDependencies({
          existingPaths: [PROJECT_CANONICAL],
          detectDriftCalls,
        }),
      },
    );

    expect(result.providerViews).toBeUndefined();
    expect(detectDriftCalls).toEqual([]);
    expect(capture.info.join('\n')).not.toContain('Provider views');
  });
});

describe('probeProviderPath', () => {
  function failWith(code: string) {
    return async () => {
      const error = new Error(code) as Error & { code: string };
      error.code = code;
      throw error;
    };
  }

  it('reports an existing path as present', async () => {
    await expect(
      probeProviderPath('/anything', async () => ({})),
    ).resolves.toBe(true);
  });

  it('reports only a genuinely absent path as absent', async () => {
    await expect(
      probeProviderPath('/missing', failWith('ENOENT')),
    ).resolves.toBe(false);
    await expect(
      probeProviderPath('/missing', failWith('ENOTDIR')),
    ).resolves.toBe(false);
  });

  it('never reports an unreadable path as absent', async () => {
    // An EACCES probe reported as absent would classify a path we cannot read
    // as `missing-additive` and tell the user to run a sync that cannot help.
    await expect(
      probeProviderPath('/denied', failWith('EACCES')),
    ).resolves.toBe(true);
    await expect(probeProviderPath('/loop', failWith('ELOOP'))).resolves.toBe(
      true,
    );
  });
});
