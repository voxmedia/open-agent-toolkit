import type { CommandContext, GlobalOptions } from '@app/command-context';
import {
  createLoggerCapture,
  type LoggerCapture,
} from '@commands/__tests__/helpers';
import { createProvidersCommand } from '@commands/providers/index';
import { createProvidersListCommand } from '@commands/providers/list/list';
import type { Manifest, ManifestEntry } from '@manifest/index';
import type { ProviderAdapter } from '@providers/shared';
import { OAT_VERSION } from '@shared/oat-version';
import type { Scope } from '@shared/types';
import { Command } from 'commander';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

interface HarnessOptions {
  adapters?: ProviderAdapter[];
  driftStateByProvider?: Record<string, 'in_sync' | 'drifted' | 'missing'>;
  manifest?: Manifest;
}

interface RunProvidersArgs {
  globalArgs?: string[];
}

function createAdapter(
  name: string,
  displayName: string,
  detected: boolean,
): ProviderAdapter {
  return {
    name,
    displayName,
    defaultStrategy: 'symlink',
    projectMappings: [
      {
        contentType: 'skill',
        canonicalDir: '.agents/skills',
        providerDir: `.${name}/skills`,
        nativeRead: false,
      },
    ],
    userMappings: [
      {
        contentType: 'skill',
        canonicalDir: '.agents/skills',
        providerDir: `.${name}/skills`,
        nativeRead: false,
      },
    ],
    detect: async () => detected,
  };
}

function createManifest(entries: ManifestEntry[]): Manifest {
  return {
    version: 1,
    oatVersion: OAT_VERSION,
    entries,
    lastUpdated: '2026-02-14T00:00:00.000Z',
  };
}

function createEntry(provider: string, name: string): ManifestEntry {
  return {
    canonicalPath: `.agents/skills/${name}`,
    providerPath: `.${provider}/skills/${name}`,
    provider,
    contentType: 'skill',
    strategy: 'symlink',
    contentHash: null,
    lastSynced: '2026-02-14T00:00:00.000Z',
  };
}

function createCollectionManifest(): Manifest {
  return {
    version: 2,
    oatVersion: OAT_VERSION,
    entries: [
      {
        canonicalPath: '.agents/skills/skill-one',
        providerPath: '.claude/skills/skill-one',
        provider: 'claude',
        contentType: 'skill',
        strategy: 'collection',
        collectionId: 'claude-skills',
        contentHash: null,
        isFile: false,
        lastSynced: '2026-02-14T00:00:00.000Z',
      },
    ] as unknown as ManifestEntry[],
    collections: [
      {
        id: 'claude-skills',
        provider: 'claude',
        contentType: 'skill',
        canonicalDir: '.agents/skills',
        providerDir: '.claude/skills',
        linkTarget: '.agents/skills',
        ownership: 'adopted-exact',
        lastVerified: '2026-02-14T00:00:00.000Z',
      },
    ],
    lastUpdated: '2026-02-14T00:00:00.000Z',
  };
}

function createHarness(options: HarnessOptions = {}): {
  capture: LoggerCapture;
  command: Command;
  resolveScopeRoot: ReturnType<typeof vi.fn>;
} {
  const capture = createLoggerCapture();
  const adapters = options.adapters ?? [
    createAdapter('claude', 'Claude Code', true),
    createAdapter('cursor', 'Cursor', false),
  ];
  const driftStateByProvider = options.driftStateByProvider ?? {
    claude: 'in_sync',
    cursor: 'missing',
  };
  const resolveScopeRoot = vi.fn(async (scope: 'project' | 'user') => {
    return scope === 'project' ? '/tmp/workspace' : '/tmp/home';
  });
  const command = createProvidersCommand({
    buildCommandContext: (globalOptions: GlobalOptions): CommandContext => ({
      scope: (globalOptions.scope ?? 'project') as Scope,
      dryRun: false,
      verbose: globalOptions.verbose ?? false,
      json: globalOptions.json ?? false,
      cwd: '/tmp/workspace',
      home: '/tmp/home',
      interactive: !(globalOptions.json ?? false),
      logger: capture.logger,
    }),
    resolveScopeRoot,
    getAdapters: () => adapters,
    getSyncMappings: vi.fn((adapter: ProviderAdapter, scope: Scope) =>
      scope === 'user' ? adapter.userMappings : adapter.projectMappings,
    ),
    loadManifest: vi.fn(async (manifestPath: string) => {
      if (manifestPath.startsWith('/tmp/home')) {
        return createManifest([]);
      }
      if (options.manifest) {
        return options.manifest;
      }
      return createManifest([
        createEntry('claude', 'skill-one'),
        createEntry('cursor', 'skill-two'),
      ]);
    }),
    detectDrift: vi.fn(async (entry: ManifestEntry) => {
      const status = driftStateByProvider[entry.provider] ?? 'in_sync';
      if (status === 'drifted') {
        return {
          canonical: entry.canonicalPath,
          provider: entry.provider,
          providerPath: entry.providerPath,
          state: { status: 'drifted', reason: 'modified' as const },
        };
      }
      return {
        canonical: entry.canonicalPath,
        provider: entry.provider,
        providerPath: entry.providerPath,
        state: { status },
      };
    }),
  });

  return { capture, command, resolveScopeRoot };
}

async function runProvidersList(
  command: Command,
  { globalArgs = [] }: RunProvidersArgs = {},
): Promise<void> {
  const program = new Command()
    .name('oat')
    .option('--json')
    .option('--verbose')
    .option('--scope <scope>')
    .option('--cwd <path>')
    .exitOverride();

  program.addCommand(command);
  await program.parseAsync([...globalArgs, 'providers', 'list'], {
    from: 'user',
  });
}

describe('oat providers list', () => {
  let originalExitCode: number | undefined;

  beforeEach(() => {
    originalExitCode = process.exitCode;
    process.exitCode = undefined;
  });

  afterEach(() => {
    process.exitCode = originalExitCode;
  });

  it('lists all registered adapters with detection status', async () => {
    const { command, capture } = createHarness();

    await runProvidersList(command, { globalArgs: ['--scope', 'project'] });

    expect(capture.info[0]).toContain('claude');
    expect(capture.info[0]).toContain('cursor');
    expect(capture.info[0]).toContain('detected');
    expect(capture.info[0]).toContain('not detected');
  });

  it('uses an injected registry-only provider without command-local registration edits', async () => {
    const capture = createLoggerCapture();
    const registryOnly = createAdapter('registry-only', 'Registry Only', true);
    const listCommand = createProvidersListCommand({
      buildCommandContext: (globalOptions: GlobalOptions): CommandContext => ({
        scope: (globalOptions.scope ?? 'project') as Scope,
        dryRun: false,
        verbose: false,
        json: true,
        cwd: '/tmp/workspace',
        home: '/tmp/home',
        interactive: false,
        logger: capture.logger,
      }),
      resolveScopeRoot: vi.fn(async () => '/tmp/workspace'),
      loadSyncConfig: vi.fn(async () => ({
        version: 1,
        defaultStrategy: 'auto',
        knownStrays: [],
        providers: {},
      })),
      resolveProviderScopeContext: vi.fn(async () => ({
        scope: 'project',
        configSource: '<project>/.oat/sync/config.json',
        activeProviders: ['registry-only'],
        detectedProviders: ['registry-only'],
        mismatches: { detectedUnset: [], detectedDisabled: [] },
        activation: [
          {
            provider: 'registry-only',
            state: 'active',
            source: 'detected-unset',
            reason: 'test registry',
          },
        ],
        registrations: [
          {
            adapter: registryOnly,
            extensions: [],
            capabilities: [
              {
                scope: 'project',
                contentKind: 'skill',
                support: 'supported',
                projectionModes: ['entry-sync'],
                nativeRoleSurface: false,
                collectionAlias: 'supported',
                catalogRefresh: { state: 'unknown', reason: 'not sourced' },
              },
            ],
          },
        ],
      })),
      getSyncMappings: vi.fn(
        (adapter: ProviderAdapter) => adapter.projectMappings,
      ),
      loadManifest: vi.fn(async () => createManifest([])),
      detectDrift: vi.fn(),
    });
    const command = new Command('providers').addCommand(listCommand);

    await runProvidersList(command, {
      globalArgs: ['--json', '--scope', 'project'],
    });

    expect(capture.jsonPayloads[0]).toEqual([
      expect.objectContaining({
        name: 'registry-only',
        detected: true,
        scopes: [
          expect.objectContaining({
            scope: 'project',
            activation: expect.objectContaining({ state: 'active' }),
            content: [
              expect.objectContaining({
                contentKind: 'skill',
                capability: 'supported',
                projectionModes: ['entry-sync'],
                materialization: 'unknown',
                visibility: 'not-reported',
                nativeRead: false,
              }),
            ],
          }),
        ],
      }),
    ]);
  });

  it('shows sync status summary per provider', async () => {
    const { command, capture } = createHarness({
      driftStateByProvider: {
        claude: 'drifted',
        cursor: 'missing',
      },
    });

    await runProvidersList(command, { globalArgs: ['--scope', 'project'] });

    expect(capture.info[0]).toContain('managed=1');
    expect(capture.info[0]).toContain('drifted=1');
    expect(capture.info[0]).toContain('missing=1');
  });

  it('shows default strategy and content types per provider', async () => {
    const { command, capture } = createHarness();

    await runProvidersList(command, { globalArgs: ['--scope', 'project'] });

    expect(capture.info[0]).toContain('strategy=symlink');
    expect(capture.info[0]).toContain('content_types=skill');
  });

  it('summarizes collection ownership consistently in human and JSON output', async () => {
    const humanHarness = createHarness({
      manifest: createCollectionManifest(),
    });
    await runProvidersList(humanHarness.command, {
      globalArgs: ['--scope', 'project'],
    });

    expect(humanHarness.capture.info[0]).toContain('collections=1');
    expect(humanHarness.capture.info[0]).toContain(
      'collection_ownership=oat-created:0|adopted-exact:1',
    );

    const jsonHarness = createHarness({ manifest: createCollectionManifest() });
    await runProvidersList(jsonHarness.command, {
      globalArgs: ['--scope', 'project', '--json'],
    });
    expect(jsonHarness.capture.jsonPayloads[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'claude',
          collectionAliases: {
            managed: 1,
            oatCreated: 0,
            adoptedExact: 1,
          },
        }),
      ]),
    );
  });

  it('outputs JSON array when --json flag set', async () => {
    const { command, capture } = createHarness();

    await runProvidersList(command, {
      globalArgs: ['--scope', 'project', '--json'],
    });

    expect(capture.jsonPayloads).toHaveLength(1);
    expect(capture.info).toHaveLength(0);
    expect(capture.jsonPayloads[0]).toMatchObject([
      {
        name: 'claude',
        detected: true,
        defaultStrategy: 'symlink',
        contentTypes: ['skill'],
      },
      {
        name: 'cursor',
        detected: false,
        defaultStrategy: 'symlink',
        contentTypes: ['skill'],
      },
    ]);
  });

  it('supports --scope flag', async () => {
    const { command, resolveScopeRoot } = createHarness();

    await runProvidersList(command, { globalArgs: ['--scope', 'user'] });

    expect(resolveScopeRoot).toHaveBeenCalledTimes(1);
    expect(resolveScopeRoot).toHaveBeenCalledWith(
      'user',
      expect.objectContaining({ scope: 'user' }),
    );
  });
});
