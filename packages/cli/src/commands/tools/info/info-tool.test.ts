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
import {
  formatSkillViewLines,
  probeProviderPath,
  type SkillViewDependencies,
} from './skill-views';

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
/**
 * The failure shapes `loadSyncConfig` really produces for a sync config that is
 * present but unreadable. Copied from `config/sync-config.ts`'s own wording so
 * the redaction under test operates on the message a user would actually see;
 * `ENOENT` is absent on purpose, because that path returns the defaults instead
 * of throwing.
 */
const SYNC_CONFIG_FAILURES = {
  'invalid-json': (configPath: string) =>
    new Error(
      `Sync config at ${configPath} is not valid JSON. Fix the file and retry.`,
    ),
  eacces: (configPath: string) =>
    new Error(
      `Unable to load sync config from ${configPath}: EACCES: permission denied, open '${configPath}'`,
    ),
  eisdir: (configPath: string) =>
    new Error(
      `Unable to load sync config from ${configPath}: EISDIR: illegal operation on a directory, read`,
    ),
} as const;

function skillProviderContext(input: {
  activeByScope: Partial<Record<ConcreteScope, string[]>>;
  /** Scope root whose sync config fails to load, and how it fails. */
  syncConfigFailure?: {
    scopeRoot: string;
    shape: keyof typeof SYNC_CONFIG_FAILURES;
  };
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
    loadSyncConfig: async (configPath) => {
      const failure = input.syncConfigFailure;
      if (failure && configPath.startsWith(`${failure.scopeRoot}/`)) {
        throw SYNC_CONFIG_FAILURES[failure.shape](configPath);
      }
      return { providers: {} } as never;
    },
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
    readProjectedVersion: async (skillDir) => {
      const version = input.versions?.[skillDir] ?? null;
      return version === null
        ? { version: null, state: 'absent' }
        : { version, state: 'resolved' };
    },
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

  it('names the manifest path, not the expected one, when a tracked entry diverges', async () => {
    // Final review M4: the manifest lookup keys on (canonicalPath, provider)
    // only, so an entry pointing elsewhere used to render the drift verdict for
    // its own path under the expected path's label -- "the provider file is
    // gone from disk" about a file that exists.
    const LEGACY = '.claude/skills-legacy/oat-idea-new';
    const capture = createLoggerCapture();
    const result = await runInfoTool(
      createContext({ scope: 'project', logger: capture.logger }),
      'oat-idea-new',
      {
        ...createDeps({ project: [sampleSkill] }),
        providerContext: skillProviderContext({
          activeByScope: { project: ['claude'] },
        }),
        skillViews: skillViewDependencies({
          // A healthy file sits at the expected path; the manifest points away.
          existingPaths: [
            PROJECT_CANONICAL,
            '/project/.claude/skills/oat-idea-new',
          ],
          manifestEntries: {
            '/project/.oat/sync/manifest.json': [
              {
                canonicalPath: '.agents/skills/oat-idea-new',
                providerPath: LEGACY,
                provider: 'claude',
                contentType: 'skill',
                contentHash: null,
                isFile: false,
                lastSynced: '2026-09-01T00:00:00.000Z',
                strategy: 'symlink',
              } as ManifestEntryV2,
            ],
          },
          driftStates: { [LEGACY]: { status: 'missing' } },
        }),
      },
    );

    const claude = result.providerViews?.[0]?.views.find(
      ({ provider }) => provider === 'claude',
    );
    expect(claude).toMatchObject({
      viewClass: 'removed',
      providerPath: LEGACY,
      expectedProviderPath: '.claude/skills/oat-idea-new',
    });
    const output = capture.info.join('\n');
    expect(output).toContain(LEGACY);
    // The detail is printed, so the unexpected path is never left unexplained.
    expect(output).toContain('The manifest tracks this view at');
    expect(output).toContain('Something does exist at the expected path');
  });

  it('reads the projected version from the tracked path when the entry diverges', async () => {
    // The other half of the same mix: a version read from the expected path
    // would be reported beside a state computed for the tracked path.
    const LEGACY = '.claude/skills-legacy/oat-idea-new';
    const result = await runInfoTool(
      createContext({ scope: 'project' }),
      'oat-idea-new',
      {
        ...createDeps({ project: [sampleSkill] }),
        providerContext: skillProviderContext({
          activeByScope: { project: ['claude'] },
        }),
        skillViews: skillViewDependencies({
          existingPaths: [
            PROJECT_CANONICAL,
            `/project/${LEGACY}`,
            '/project/.claude/skills/oat-idea-new',
          ],
          manifestEntries: {
            '/project/.oat/sync/manifest.json': [
              {
                canonicalPath: '.agents/skills/oat-idea-new',
                providerPath: LEGACY,
                provider: 'claude',
                contentType: 'skill',
                contentHash: null,
                isFile: false,
                lastSynced: '2026-09-01T00:00:00.000Z',
                strategy: 'copy',
              } as ManifestEntryV2,
            ],
          },
          driftStates: { [LEGACY]: { status: 'in_sync' } },
          versions: {
            [`/project/${LEGACY}`]: '2.0.0',
            '/project/.claude/skills/oat-idea-new': '9.9.9',
          },
        }),
      },
    );

    expect(
      result.providerViews?.[0]?.views.find(
        ({ provider }) => provider === 'claude',
      ),
    ).toMatchObject({
      providerPath: LEGACY,
      viewVersion: '2.0.0',
      versionComparable: true,
    });
  });

  it('degrades to an unavailable section when the manifest cannot be read', async () => {
    const capture = createLoggerCapture();
    const deps = skillViewDependencies({
      existingPaths: [PROJECT_CANONICAL, USER_CANONICAL],
    });
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
        skillViews: {
          ...deps,
          loadManifest: async (manifestPath) => {
            if (manifestPath.startsWith('/project')) {
              throw new Error(
                `Manifest at ${manifestPath} is not valid JSON. Delete or repair the file and re-run oat sync.`,
              );
            }
            return deps.loadManifest(manifestPath);
          },
        },
      },
    );

    // The tool detail is the answer the user asked for; unreadable diagnostic
    // inputs may not remove it or change the exit path.
    expect(result.found).toBe(true);
    expect(result.tool?.name).toBe('oat-idea-new');
    expect(result.providerViews?.[0]).toMatchObject({
      scope: 'project',
      result: 'unavailable',
      views: [],
    });
    expect(result.providerViews?.[0]?.reason).toContain('not valid JSON');
    // The healthy scope is still diagnosed.
    expect(result.providerViews?.[1]).toMatchObject({
      scope: 'user',
      result: 'diagnosed',
    });
    const output = capture.info.join('\n');
    expect(output).toContain('Provider views (project): unavailable');
    expect(output).toContain('Version:');
    expect(capture.error).toEqual([]);
  });

  for (const [shape, scope, scopeRoot, placeholder] of [
    ['invalid-json', 'project', '/project', '<project>'],
    ['eacces', 'project', '/project', '<project>'],
    ['eisdir', 'project', '/project', '<project>'],
    ['invalid-json', 'user', '/home/user', '~'],
    ['eacces', 'user', '/home/user', '~'],
    ['eisdir', 'user', '/home/user', '~'],
  ] as const) {
    it(`degrades the ${scope} scope to unavailable when its sync config is unreadable (${shape})`, async () => {
      // A broken sync config is one of the likeliest reasons a provider view is
      // missing, which is exactly what this command is run to explain.
      // Dropping the scope silently prints no row and no reason at all, which
      // reads as "no providers configured" — the opposite of the truth.
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
            syncConfigFailure: { scopeRoot, shape },
          }),
          skillViews: skillViewDependencies({
            existingPaths: [PROJECT_CANONICAL, USER_CANONICAL],
          }),
        },
      );

      // The tool detail is still the answer the user asked for.
      expect(result.found).toBe(true);
      expect(result.tool?.name).toBe('oat-idea-new');

      const broken = result.providerViews?.find(
        (diagnosis) => diagnosis.scope === scope,
      );
      expect(broken).toMatchObject({ result: 'unavailable', views: [] });
      expect(broken?.reason).toContain(`${placeholder}/.oat/sync/config.json`);
      // The scope root never survives into the reason.
      expect(broken?.reason).not.toContain(scopeRoot);

      // The healthy scope keeps its rows.
      expect(
        result.providerViews?.find((diagnosis) => diagnosis.scope !== scope),
      ).toMatchObject({ result: 'diagnosed' });

      const output = capture.info.join('\n');
      expect(output).toContain(`Provider views (${scope}): unavailable`);
      expect(output).toContain('Version:');
      expect(capture.error).toEqual([]);
    });
  }

  it('still diagnoses a scope whose sync config is simply absent', async () => {
    // The accepted control for the six cases above. `loadSyncConfig` answers
    // ENOENT with the defaults, so "no sync config" is a legitimately empty
    // result and must stay silent rather than degrading to `unavailable`.
    const result = await runInfoTool(
      createContext({ scope: 'project' }),
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

    expect(result.providerViews?.[0]).toMatchObject({
      scope: 'project',
      result: 'diagnosed',
    });
    expect(result.providerViews?.[0]?.views.length).toBeGreaterThan(0);
  });

  it('redacts the scope root from an unavailable reason', async () => {
    const capture = createLoggerCapture();
    const result = await runInfoTool(
      createContext({ scope: 'user', json: true, logger: capture.logger }),
      'oat-idea-new',
      {
        ...createDeps({ user: [{ ...sampleSkill, scope: 'user' }] }),
        providerContext: skillProviderContext({
          activeByScope: { user: ['claude'] },
        }),
        skillViews: {
          ...skillViewDependencies({ existingPaths: [USER_CANONICAL] }),
          loadManifest: async (manifestPath) => {
            throw new Error(
              `EACCES: permission denied, open '${manifestPath}'`,
            );
          },
        },
      },
    );

    expect(result.providerViews?.[0]?.reason).toBe(
      "EACCES: permission denied, open '~/.oat/sync/manifest.json'",
    );
    expect(JSON.stringify(capture.jsonPayloads[0])).not.toContain('/home/user');
  });

  it('redacts an absolute path that lies outside the scope root', async () => {
    const capture = createLoggerCapture();
    const result = await runInfoTool(
      createContext({ scope: 'project', json: true, logger: capture.logger }),
      'oat-idea-new',
      {
        ...createDeps({ project: [sampleSkill] }),
        providerContext: skillProviderContext({
          activeByScope: { project: ['claude'] },
        }),
        skillViews: {
          ...skillViewDependencies({ existingPaths: [PROJECT_CANONICAL] }),
          // A manifest `providerPath` that escapes the scope root makes the
          // real detector name a path the scope-root replacement cannot reach.
          detectDrift: async () => {
            throw new Error(
              "ENOTDIR: not a directory, lstat '/dev/null/probe'",
            );
          },
          loadManifest: async () =>
            ({
              version: 2,
              oatVersion: '0.0.0-test',
              entries: [
                {
                  canonicalPath: '.agents/skills/oat-idea-new',
                  providerPath: '../../dev/null/probe',
                  provider: 'claude',
                  contentType: 'skill',
                  contentHash: null,
                  isFile: false,
                  lastSynced: '2026-09-01T00:00:00.000Z',
                  strategy: 'symlink',
                },
              ],
              collections: [],
              lastUpdated: '2026-09-01T00:00:00.000Z',
            }) as unknown as Manifest,
        },
      },
    );

    // The scope is still diagnosed: one unreadable provider path degrades one
    // row, not the section (m13). The redaction is asserted on that row.
    expect(result.providerViews?.[0]).toMatchObject({ result: 'diagnosed' });
    const claude = result.providerViews?.[0]?.views.find(
      ({ provider }) => provider === 'claude',
    );
    expect(claude).toMatchObject({ viewClass: 'unverified' });
    expect(claude?.detail).toContain(
      "The diagnostic could not read this view, so its state is unverified: ENOTDIR: not a directory, lstat '<path>'",
    );
    expect(JSON.stringify(capture.jsonPayloads[0])).not.toContain('/dev/null');
  });

  it('degrades only the failing provider, leaving the other rows intact', async () => {
    // Final review m13: `detectDrift` throws before `readProjectedVersion`'s own
    // catch can classify, so the scope-level catch used to fire and the
    // uninvolved providers lost their rows too.
    const capture = createLoggerCapture();
    const result = await runInfoTool(
      createContext({ scope: 'project', logger: capture.logger }),
      'oat-idea-new',
      {
        ...createDeps({ project: [sampleSkill] }),
        providerContext: skillProviderContext({
          activeByScope: { project: ['claude', 'codex'] },
        }),
        skillViews: {
          ...skillViewDependencies({
            existingPaths: [PROJECT_CANONICAL],
            manifestEntries: {
              '/project/.oat/sync/manifest.json': [
                {
                  canonicalPath: '.agents/skills/oat-idea-new',
                  providerPath: '.claude/skills/oat-idea-new',
                  provider: 'claude',
                  contentType: 'skill',
                  contentHash: null,
                  isFile: false,
                  lastSynced: '2026-09-01T00:00:00.000Z',
                  strategy: 'symlink',
                } as ManifestEntryV2,
              ],
            },
          }),
          detectDrift: async () => {
            throw new Error(
              "EACCES: permission denied, lstat '/project/.claude/skills/oat-idea-new'",
            );
          },
        },
      },
    );

    const views = result.providerViews?.[0];
    expect(views).toMatchObject({ result: 'diagnosed' });
    expect(views?.views.map(({ provider }) => provider)).toEqual([
      'claude',
      'codex',
    ]);
    expect(
      views?.views.find(({ provider }) => provider === 'claude'),
    ).toMatchObject({ viewClass: 'unverified', suggestion: null });
    // The uninvolved provider keeps its real row.
    expect(
      views?.views.find(({ provider }) => provider === 'codex'),
    ).toMatchObject({ viewClass: 'in-sync', nativeRead: true });

    const output = capture.info.join('\n');
    expect(output).not.toContain('Provider views (project): unavailable');
    expect(output).toContain('codex');
    // The reason still reaches the user, still redacted.
    expect(output).toContain(
      "EACCES: permission denied, lstat '<project>/.claude/skills/oat-idea-new'",
    );
    expect(capture.error).toEqual([]);
  });

  it('suppresses the projection qualifier and path for a provider that projects nothing', async () => {
    // Final review m14: `qualifier()` ran before the class was considered, so an
    // `inactive` row still advertised `(native read)` and an expected path for a
    // view that is never produced.
    const capture = createLoggerCapture();
    await runInfoTool(
      createContext({ scope: 'project', logger: capture.logger }),
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

    const rows = capture.info.filter((line) => line.includes('codex:'));
    expect(rows).toEqual(['    codex:  inactive']);
    // The active provider keeps both.
    expect(
      capture.info.some((line) =>
        line.includes('claude: missing-additive  .claude/skills/oat-idea-new'),
      ),
    ).toBe(true);
  });

  describe('reason redaction', () => {
    // Final review m11: the second pass only fired after start-of-string,
    // whitespace, a quote, or `(`, so a path after `=`, `:`, `[`, a backtick, or
    // `<` was forwarded verbatim, a path containing a space was redacted only up
    // to that space, and `/project-private/...` was rewritten to
    // `<project>-private/...` -- a partly redacted path that was never inside
    // the scope root.
    async function reasonFor(
      message: string,
      scope: ConcreteScope = 'project',
    ): Promise<string | undefined> {
      const result = await runInfoTool(
        createContext({ scope, json: true }),
        'oat-idea-new',
        {
          ...createDeps(
            scope === 'project'
              ? { project: [sampleSkill] }
              : { user: [{ ...sampleSkill, scope: 'user' }] },
          ),
          providerContext: skillProviderContext({
            activeByScope: { [scope]: ['claude'] },
          }),
          skillViews: {
            ...skillViewDependencies({
              existingPaths: [PROJECT_CANONICAL, USER_CANONICAL],
            }),
            loadManifest: async () => {
              throw new Error(message);
            },
          },
        },
      );
      return result.providerViews?.[0]?.reason;
    }

    for (const [label, message, expected] of [
      [
        'after an equals sign',
        'EACCES: permission denied, path=/Users/jdoe/secret/x',
        'EACCES: permission denied, path=<path>',
      ],
      [
        // Adjacent to the colon, with no space: a space alone was already a
        // delimiter the old pass recognised, so this is the real colon case.
        'after a colon',
        'ENOENT: no such file:/Users/jdoe/secret/x',
        'ENOENT: no such file:<path>',
      ],
      [
        // The closing bracket is swallowed with the path: a `]` is legal in a
        // filename, so treating it as a terminator would end the match inside
        // a real path and forward its tail.
        'inside brackets',
        'EACCES: denied at [/Users/jdoe/secret/x]',
        'EACCES: denied at [<path>',
      ],
      [
        'inside backticks',
        'EACCES: denied `/Users/jdoe/secret/x`',
        'EACCES: denied `<path>`',
      ],
      [
        'inside angle brackets',
        'ENOENT: open </Users/jdoe/secret/x>',
        'ENOENT: open <<path>',
      ],
      [
        'containing a space',
        "ENOTDIR: not a directory, lstat '/dev/null/Private Client/secret'",
        "ENOTDIR: not a directory, lstat '<path>'",
      ],
    ] as const) {
      it(`redacts an absolute path ${label}`, async () => {
        expect(await reasonFor(message)).toBe(expected);
      });
    }

    it('does not rewrite a sibling directory that merely shares the scope-root prefix', async () => {
      // `/project-private` was never inside `/project`. Replacing the prefix
      // anywhere produced `<project>-private/secret`, which both lies about the
      // location and forwards the rest of an outside path.
      expect(
        await reasonFor(
          "ENOENT: no such file or directory, open '/project-private/secret'",
        ),
      ).toBe("ENOENT: no such file or directory, open '<path>'");
    });

    it('still redacts the scope root itself to its placeholder', async () => {
      // The accepted control: an inside-the-scope path keeps its readable
      // shape, in both scopes.
      expect(
        await reasonFor(
          "EACCES: permission denied, open '/project/.oat/sync/manifest.json'",
        ),
      ).toBe(
        "EACCES: permission denied, open '<project>/.oat/sync/manifest.json'",
      );
      expect(
        await reasonFor(
          "EACCES: permission denied, open '/home/user/.oat/sync/manifest.json'",
          'user',
        ),
      ).toBe("EACCES: permission denied, open '~/.oat/sync/manifest.json'");
    });

    it('leaves a relative path alone', async () => {
      expect(
        await reasonFor('Manifest at .oat/sync/manifest.json is invalid'),
      ).toBe('Manifest at .oat/sync/manifest.json is invalid');
    });
  });

  it('redacts a path whose tail contains characters that are legal in a filename', async () => {
    // A comma, a bracket, and a brace are all legal in a filename, so a
    // terminator set that treats one as the end of the path ends the match
    // inside a real path and forwards its tail. `manifest/hash.ts` emits this
    // exact unquoted shape.
    const result = await runInfoTool(
      createContext({ scope: 'project', json: true }),
      'oat-idea-new',
      {
        ...createDeps({ project: [sampleSkill] }),
        providerContext: skillProviderContext({
          activeByScope: { project: ['claude'] },
        }),
        skillViews: {
          ...skillViewDependencies({ existingPaths: [PROJECT_CANONICAL] }),
          loadManifest: async () => {
            throw new Error(
              'File does not exist: /outside/public,PrivateSecret',
            );
          },
        },
      },
    );

    expect(result.providerViews?.[0]?.reason).toBe(
      'File does not exist: <path>',
    );
  });

  it('redacts a quoted path that contains a space or a stray quote', async () => {
    const result = await runInfoTool(
      createContext({ scope: 'project', json: true }),
      'oat-idea-new',
      {
        ...createDeps({ project: [sampleSkill] }),
        providerContext: skillProviderContext({
          activeByScope: { project: ['claude'] },
        }),
        skillViews: {
          ...skillViewDependencies({ existingPaths: [PROJECT_CANONICAL] }),
          loadManifest: async () => {
            throw new Error(
              "ENOTDIR: not a directory, lstat '/dev/null/a,PrivateSecret\"x'",
            );
          },
        },
      },
    );

    expect(result.providerViews?.[0]?.reason).toBe(
      "ENOTDIR: not a directory, lstat '<path>'",
    );
  });

  it('does not treat a sibling that merely starts with the scope root as contained', async () => {
    // `/project private` is not inside `/project`. Replacing the root here
    // produced `<project> private/secret`, which reads as an in-scope path and
    // forwards the rest of one that never was.
    const result = await runInfoTool(
      createContext({ scope: 'project', json: true }),
      'oat-idea-new',
      {
        ...createDeps({ project: [sampleSkill] }),
        providerContext: skillProviderContext({
          activeByScope: { project: ['claude'] },
        }),
        skillViews: {
          ...skillViewDependencies({ existingPaths: [PROJECT_CANONICAL] }),
          loadManifest: async () => {
            throw new Error("EACCES: open '/project private/secret'");
          },
        },
      },
    );

    expect(result.providerViews?.[0]?.reason).toBe("EACCES: open '<path>'");
  });

  it('never reads a version from a tracked copy that escapes the scope root', async () => {
    // The row already redacts an escaping path; reading its `SKILL.md` would
    // put content from outside the scope into `viewVersion` and the detail, and
    // compare the canonical skill against a file that is not a view of it.
    const result = await runInfoTool(
      createContext({ scope: 'project', json: true }),
      'oat-idea-new',
      {
        ...createDeps({ project: [sampleSkill] }),
        providerContext: skillProviderContext({
          activeByScope: { project: ['claude'] },
        }),
        skillViews: skillViewDependencies({
          // `join('/project', '../../outside/probe')` normalizes to
          // `/outside/probe`, which is the path the probe and the version read
          // actually use.
          existingPaths: [PROJECT_CANONICAL, '/outside/probe'],
          manifestEntries: {
            '/project/.oat/sync/manifest.json': [
              {
                canonicalPath: '.agents/skills/oat-idea-new',
                providerPath: '../../outside/probe',
                provider: 'claude',
                contentType: 'skill',
                contentHash: null,
                isFile: false,
                lastSynced: '2026-09-01T00:00:00.000Z',
                strategy: 'copy',
              } as ManifestEntryV2,
            ],
          },
          driftStates: { '../../outside/probe': { status: 'in_sync' } },
          versions: { '/outside/probe': 'SECRET-CLIENT-9.9.9' },
        }),
      },
    );

    const claude = result.providerViews?.[0]?.views.find(
      ({ provider }) => provider === 'claude',
    );
    expect(claude).toMatchObject({
      providerPath: '<path>',
      viewVersion: null,
      versionComparable: false,
    });
    expect(JSON.stringify(result.providerViews)).not.toContain('SECRET-CLIENT');
  });

  it('never claims the expected path is empty when the view could not be read', async () => {
    // A failed observation leaves `viewPresent` at its default. Reporting that
    // default as absence replaces one false claim about the expected path with
    // another.
    const result = await runInfoTool(
      createContext({ scope: 'project', json: true }),
      'oat-idea-new',
      {
        ...createDeps({ project: [sampleSkill] }),
        providerContext: skillProviderContext({
          activeByScope: { project: ['claude'] },
        }),
        skillViews: {
          ...skillViewDependencies({
            existingPaths: [
              PROJECT_CANONICAL,
              '/project/.claude/skills/oat-idea-new',
            ],
            manifestEntries: {
              '/project/.oat/sync/manifest.json': [
                {
                  canonicalPath: '.agents/skills/oat-idea-new',
                  providerPath: '.claude/skills-legacy/oat-idea-new',
                  provider: 'claude',
                  contentType: 'skill',
                  contentHash: null,
                  isFile: false,
                  lastSynced: '2026-09-01T00:00:00.000Z',
                  strategy: 'symlink',
                } as ManifestEntryV2,
              ],
            },
          }),
          detectDrift: async () => {
            throw new Error('EACCES: permission denied');
          },
        },
      },
    );

    const claude = result.providerViews?.[0]?.views.find(
      ({ provider }) => provider === 'claude',
    );
    expect(claude?.viewClass).toBe('unverified');
    expect(claude?.detail).toContain(
      'Whether anything exists at the expected path was not established',
    );
    expect(claude?.detail).not.toContain('Nothing exists at the expected path');
  });

  it('never renders a manifest path that escapes the scope root', async () => {
    // A tracked row names the manifest's own path (M4), so a manifest entry
    // pointing outside the scope must not turn that row into a disclosure.
    const result = await runInfoTool(
      createContext({ scope: 'project', json: true }),
      'oat-idea-new',
      {
        ...createDeps({ project: [sampleSkill] }),
        providerContext: skillProviderContext({
          activeByScope: { project: ['claude'] },
        }),
        skillViews: skillViewDependencies({
          existingPaths: [PROJECT_CANONICAL],
          manifestEntries: {
            '/project/.oat/sync/manifest.json': [
              {
                canonicalPath: '.agents/skills/oat-idea-new',
                providerPath: '../../dev/null/probe',
                provider: 'claude',
                contentType: 'skill',
                contentHash: null,
                isFile: false,
                lastSynced: '2026-09-01T00:00:00.000Z',
                strategy: 'symlink',
              } as ManifestEntryV2,
            ],
          },
          driftStates: { '../../dev/null/probe': { status: 'missing' } },
        }),
      },
    );

    const claude = result.providerViews?.[0]?.views.find(
      ({ provider }) => provider === 'claude',
    );
    expect(claude?.providerPath).toBe('<path>');
    expect(JSON.stringify(result.providerViews)).not.toContain('/dev/null');
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

describe('formatSkillViewLines', () => {
  const view = (overrides: Record<string, unknown> = {}) => ({
    skill: 'oat-idea-new',
    scope: 'project' as const,
    provider: 'claude',
    viewClass: 'in-sync' as const,
    driftState: { status: 'in_sync' as const },
    providerPath: '.claude/skills/oat-idea-new',
    tracked: true,
    strategy: 'copy' as const,
    nativeRead: false,
    canonicalVersion: '3.0.0',
    viewVersion: null,
    versionComparable: false,
    suggestion: null,
    detail: 'Detail sentence about the withheld comparison.',
    ...overrides,
  });

  it('shows the detail for a non-actionable class whose version evidence is not clean', () => {
    // `in-sync` alone would hide the sentence explaining that the version
    // comparison was skipped, which is the one thing the class word cannot
    // convey.
    const withheld = formatSkillViewLines([
      {
        skill: 'oat-idea-new',
        scope: 'project',
        result: 'diagnosed',
        views: [view({ versionEvidence: 'conflict' })],
      },
    ]);
    const clean = formatSkillViewLines([
      {
        skill: 'oat-idea-new',
        scope: 'project',
        result: 'diagnosed',
        views: [view({ versionEvidence: 'resolved', viewVersion: '3.0.0' })],
      },
    ]);

    expect(withheld.join('\n')).toContain(
      'Detail sentence about the withheld comparison.',
    );
    // A clean reading stays quiet: the class line already says everything.
    expect(clean.join('\n')).not.toContain('Detail sentence');
  });
});
