import type { CommandContext, GlobalOptions } from '@app/command-context';
import {
  createLoggerCapture,
  type LoggerCapture,
} from '@commands/__tests__/helpers';
import type { PjmAdoption } from '@commands/pjm/adoption';
import type {
  PackAssetInventory,
  PackInventory,
  ScopedPackInventory,
} from '@commands/tools/shared/pack-inventory';
import { PACK_NAMES } from '@commands/tools/shared/pack-manifest';
import type {
  PackAssetDefinition,
  PackAssetStatus,
  PackCompleteness,
  PackName,
} from '@commands/tools/shared/types';
import { DEFAULT_SYNC_CONFIG, type SyncConfig } from '@config/index';
import type { OatConfig, OatLocalConfig, UserConfig } from '@config/oat-config';
import type { Manifest } from '@manifest/index';
import type {
  AvailabilityOracleDependencies,
  CursorMaterializedModelDiagnostic,
  MatrixCellAvailability,
  MatrixCellAvailabilityResult,
  ValidateMatrixCellOptions,
} from '@providers/identity/availability';
import {
  createDispatchValidationPassContext,
  type DispatchValidationPassOptions,
} from '@providers/identity/dispatch-validation';
import {
  getConfigAwareAdapters,
  type ProviderAdapter,
} from '@providers/shared';
import { OAT_VERSION } from '@shared/oat-version';
import type { Scope } from '@shared/types';
import type { DoctorCheck } from '@ui/output';
import { Command } from 'commander';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createDoctorCommand } from './index';

interface HarnessOptions {
  scope?: Scope;
  pathExists?: Record<string, boolean>;
  fileContents?: Record<string, string>;
  staleInvocationCheck?: DoctorCheck;
  loadManifestThrows?: boolean;
  symlinkSupported?: boolean;
  resolveAssetsRootThrows?: boolean;
  skillVersions?: {
    installedSkillCount: number;
    skippedMissingBundledCount: number;
    outdatedSkills: Array<{
      skill: string;
      installedVersion: string | null;
      bundledVersion: string | null;
    }>;
  };
  checkSkillVersionsOverride?: (
    scopeRoot: string,
    assetsRoot: string,
    pathExists: (path: string) => Promise<boolean>,
  ) => Promise<{
    installedSkillCount: number;
    skippedMissingBundledCount: number;
    outdatedSkills: Array<{
      skill: string;
      installedVersion: string;
      bundledVersion: string;
    }>;
  }>;
  providers?: Array<{
    name: string;
    detected: boolean;
    version: string | null;
  }>;
  adapters?: ProviderAdapter[];
  userSyncConfigProviders?: SyncConfig['providers'];
  oatConfig?: OatConfig;
  oatConfigError?: Error;
  oatLocalConfig?: OatLocalConfig;
  userConfig?: UserConfig;
  pjmChecks?: DoctorCheck[];
  validateMatrixCell?: (
    provider: string,
    value: string,
    options: ValidateMatrixCellOptions,
  ) => Promise<MatrixCellAvailability | MatrixCellAvailabilityResult>;
  availabilityDependencies?: Partial<AvailabilityOracleDependencies>;
  cursorMaterializedDiagnostics?: CursorMaterializedModelDiagnostic[];
  packInventories?: PackInventory[];
  pjmAdoption?: PjmAdoption;
  projectScopeUnavailable?: boolean;
}

interface RunDoctorArgs {
  globalArgs?: string[];
  scope?: string;
}

function defaultManifest(): Manifest {
  return {
    version: 1,
    oatVersion: OAT_VERSION,
    entries: [],
    lastUpdated: '2026-02-14T00:00:00.000Z',
  };
}

function packAsset(
  destination: string,
  status: PackAssetStatus,
  scope: 'project' | 'user',
  ownership: 'managed' | 'seed-if-missing' = 'managed',
): PackAssetInventory {
  const definition: PackAssetDefinition = {
    id: `skill:${destination}`,
    kind: 'skill',
    source: destination,
    destination,
    scopes: [scope],
    ownership: { [scope]: ownership },
  };
  return {
    definition,
    path: `${scope === 'project' ? '/tmp/workspace' : '/tmp/home'}/${destination}`,
    status,
    installedVersion: null,
    bundledVersion: null,
  };
}

function sharedPackAsset(
  destination: string,
  status: PackAssetStatus,
  scope: 'project' | 'user',
): PackAssetInventory {
  const asset = packAsset(destination, status, scope);
  asset.definition.sharedOwner = 'resolve-tracking';
  return asset;
}

function scopedInventory(
  pack: PackName,
  scope: 'project' | 'user',
  completeness: PackCompleteness,
  assets: PackAssetInventory[],
  overrides: Partial<ScopedPackInventory> = {},
): ScopedPackInventory {
  return {
    pack,
    scope,
    intent: {
      pack,
      scope,
      enabled: true,
      source: 'declared',
      configPath: `${scope === 'project' ? '/tmp/workspace' : '/tmp/home'}/.oat/config.json`,
      diagnostics: [],
    },
    completeness,
    assets,
    diagnostics: [],
    ...overrides,
  };
}

function packInventory(
  pack: PackName,
  scopes: ScopedPackInventory[],
  overrides: Partial<PackInventory> = {},
): PackInventory {
  const placement =
    scopes.length === 2 ? 'both' : (scopes[0]?.scope ?? 'unavailable');
  return {
    pack,
    placement: placement as PackInventory['placement'],
    scopes,
    diagnostics: [],
    ...overrides,
  };
}

function emptyInventory(pack: PackName): PackInventory {
  return packInventory(pack, []);
}

function detectedAdapter(name: string, detected: boolean): ProviderAdapter {
  return {
    name,
    displayName: name,
    defaultStrategy: 'auto',
    projectMappings: [],
    userMappings: [],
    detect: async () => detected,
  };
}

function createHarness(options: HarnessOptions = {}): {
  capture: LoggerCapture;
  command: Command;
  checkSkillVersions: ReturnType<typeof vi.fn>;
  checkStaleInvocations: ReturnType<typeof vi.fn>;
  runPjmDoctorChecks: ReturnType<typeof vi.fn>;
  validateMatrixCell: ReturnType<typeof vi.fn>;
  inventoryPack: ReturnType<typeof vi.fn>;
  resolvePjmAdoption: ReturnType<typeof vi.fn>;
} {
  const capture = createLoggerCapture();
  const scope = options.scope ?? 'project';
  const providers = options.providers ?? [
    { name: 'claude', detected: true, version: '1.2.3' },
    { name: 'cursor', detected: false, version: null },
  ];
  const adapters =
    options.adapters ??
    providers.map(
      ({ name, detected }): ProviderAdapter => ({
        name,
        displayName: name,
        defaultStrategy: 'auto',
        projectMappings: [],
        userMappings: [],
        detect: async () => detected,
      }),
    );
  const defaultPathExists = {
    '/tmp/workspace/.agents/skills': true,
    '/tmp/workspace/.agents/agents': true,
    '/tmp/workspace/.oat/sync/manifest.json': true,
  };
  const pathExists = {
    ...defaultPathExists,
    ...(options.pathExists ?? {}),
  };
  const fileContents = {
    ...(options.fileContents ?? {}),
  };
  const checkSkillVersions = vi.fn(
    async (
      scopeRoot: string,
      assetsRoot: string,
      pathExistsFn: (path: string) => Promise<boolean>,
    ) => {
      if (options.checkSkillVersionsOverride) {
        return options.checkSkillVersionsOverride(
          scopeRoot,
          assetsRoot,
          pathExistsFn,
        );
      }
      return (
        options.skillVersions ?? {
          installedSkillCount: 0,
          skippedMissingBundledCount: 0,
          outdatedSkills: [],
        }
      );
    },
  );
  const runPjmDoctorChecks = vi.fn(async () => options.pjmChecks ?? []);
  const inventoriesByPack = new Map<PackName, PackInventory>(
    (options.packInventories ?? []).map((inventory) => [
      inventory.pack,
      inventory,
    ]),
  );
  const inventoryPack = vi.fn(async ({ pack }: { pack: PackName }) => {
    return inventoriesByPack.get(pack) ?? emptyInventory(pack);
  });
  const resolvePjmAdoption = vi.fn(
    async ({ repoRoot }: { repoRoot: string }): Promise<PjmAdoption> => {
      return (
        options.pjmAdoption ?? {
          state: 'none',
          repoRoot,
          recovery: 'oat pjm init',
        }
      );
    },
  );
  const checkStaleInvocations = vi.fn(async () => {
    return (
      options.staleInvocationCheck ?? {
        name: 'project:stale_invocations',
        description: 'Known-stale CLI invocation grammar',
        status: 'pass',
        message: 'No known-stale CLI invocations found.',
      }
    );
  });
  const validateMatrixCell = vi.fn(
    options.validateMatrixCell ??
      (async () => 'valid' satisfies MatrixCellAvailability),
  );
  const validationOverrides: Parameters<typeof createDoctorCommand>[0] = {
    createDispatchValidationPassContext: (
      passOptions: DispatchValidationPassOptions,
    ) =>
      createDispatchValidationPassContext({
        ...passOptions,
        ...(options.availabilityDependencies
          ? { dependencies: options.availabilityDependencies }
          : {
              probeCursorSubagentModel: async (value, probeOptions) => {
                let availability:
                  | MatrixCellAvailability
                  | MatrixCellAvailabilityResult;
                try {
                  availability = await validateMatrixCell('cursor', value, {
                    cwd: probeOptions.cwd,
                    env: probeOptions.env,
                    detailed: true,
                  });
                } catch {
                  availability = 'unvalidated';
                }
                const result =
                  typeof availability === 'string'
                    ? { availability }
                    : availability;
                return {
                  ...result,
                  decisive: true,
                  evidence: 'none',
                };
              },
            }),
      }),
  };
  const command = createDoctorCommand({
    buildCommandContext: (globalOptions: GlobalOptions): CommandContext => ({
      scope: (globalOptions.scope ?? scope) as Scope,
      dryRun: false,
      verbose: globalOptions.verbose ?? false,
      json: globalOptions.json ?? false,
      cwd: '/tmp/workspace',
      home: '/tmp/home',
      interactive: !(globalOptions.json ?? false),
      logger: capture.logger,
    }),
    resolveScopeRoot: vi.fn(async (resolvedScope: 'project' | 'user') => {
      if (resolvedScope === 'project' && options.projectScopeUnavailable) {
        throw new Error('Not inside a Git repository');
      }
      return resolvedScope === 'project' ? '/tmp/workspace' : '/tmp/home';
    }),
    pathExists: vi.fn(async (path: string) => pathExists[path] ?? false),
    loadManifest: vi.fn(async () => {
      if (options.loadManifestThrows) {
        throw new Error('invalid manifest');
      }
      return defaultManifest();
    }),
    checkSymlinkSupport: vi.fn(async () => options.symlinkSupported ?? true),
    checkProviders: vi.fn(async () => {
      return providers;
    }),
    readFile: vi.fn(async (path: string) => {
      const content = fileContents[path];
      if (content === undefined) {
        throw new Error(`ENOENT: no such file or directory, open '${path}'`);
      }
      return content;
    }),
    resolveUserSyncConfig: vi.fn(async () => ({
      ...DEFAULT_SYNC_CONFIG,
      providers: options.userSyncConfigProviders ?? {},
    })),
    getAdapters: () => adapters,
    getConfigAwareAdapters: vi.fn(getConfigAwareAdapters),
    readOatConfig: vi.fn(async () => {
      if (options.oatConfigError) {
        throw options.oatConfigError;
      }
      return options.oatConfig ?? ({ version: 1 } satisfies OatConfig);
    }),
    readOatConfigForDefaultScopeRepair: vi.fn(
      async () => options.oatConfig ?? ({ version: 1 } satisfies OatConfig),
    ),
    readOatLocalConfig: vi.fn(
      async () =>
        options.oatLocalConfig ?? ({ version: 1 } satisfies OatLocalConfig),
    ),
    readUserConfig: vi.fn(
      async () => options.userConfig ?? ({ version: 1 } satisfies UserConfig),
    ),
    resolveAssetsRoot: vi.fn(async () => {
      if (options.resolveAssetsRootThrows) {
        throw new Error('assets unavailable');
      }
      return '/tmp/assets';
    }),
    checkSkillVersions,
    runPjmDoctorChecks,
    checkStaleInvocations,
    checkSyncedProjects: vi.fn(async () => [] as DoctorCheck[]),
    inventoryPack,
    resolvePjmAdoption,
    validateMatrixCell,
    diagnoseCursorMaterializedModels: vi.fn(async (ladderModelIds) => {
      return (
        options.cursorMaterializedDiagnostics ??
        ladderModelIds.map((ladderModelId) => ({
          ladderModelId,
          availability: 'available' as const,
          evidence: 'broad-cli-catalog' as const,
          message:
            'Broad catalog entry only; definition pin and runtime identity not tested.',
        }))
      );
    }),
    processEnv: {},
    ...validationOverrides,
  });

  return {
    capture,
    command,
    checkSkillVersions,
    checkStaleInvocations,
    runPjmDoctorChecks,
    validateMatrixCell,
    inventoryPack,
    resolvePjmAdoption,
  };
}

async function runDoctor(
  command: Command,
  { globalArgs = [], scope = 'project' }: RunDoctorArgs = {},
): Promise<void> {
  // --scope is now a per-command option on the doctor command itself;
  // it is no longer registered on the root program.
  const program = new Command()
    .name('oat')
    .option('--json')
    .option('--verbose')
    .option('--cwd <path>')
    .exitOverride();

  program.addCommand(command);
  await program.parseAsync([...globalArgs, 'doctor', '--scope', scope], {
    from: 'user',
  });
}

describe('createDoctorCommand', () => {
  let originalExitCode: number | undefined;

  beforeEach(() => {
    originalExitCode = process.exitCode;
    process.exitCode = undefined;
  });

  afterEach(() => {
    process.exitCode = originalExitCode;
  });

  it('checks canonical directory existence', async () => {
    const { command, capture } = createHarness({
      pathExists: {
        '/tmp/workspace/.agents/skills': false,
        '/tmp/workspace/.agents/agents': true,
        '/tmp/workspace/.oat/sync/manifest.json': true,
      },
    });

    await runDoctor(command);

    expect(capture.info[0]).toContain('canonical_directories');
    expect(capture.info[0]).toContain('Canonical directories are missing');
  });

  it('checks manifest existence and validity', async () => {
    const { command, capture } = createHarness({
      loadManifestThrows: true,
    });

    await runDoctor(command);

    expect(capture.info[0]).toContain('manifest');
    expect(capture.info[0]).toContain('Manifest validation failed');
  });

  it('checks symlink creation capability', async () => {
    const { command, capture } = createHarness({
      symlinkSupported: false,
    });

    await runDoctor(command);

    expect(capture.info[0]).toContain('symlink_support');
    expect(capture.info[0]).toContain('copy fallback');
  });

  it('checks provider detection and version', async () => {
    const { command, capture } = createHarness({
      providers: [{ name: 'claude', detected: true, version: '2.0.0' }],
    });

    await runDoctor(command);

    expect(capture.info[0]).toContain('providers');
    expect(capture.info[0]).toContain('claude@2.0.0');
  });

  it('reports an invalid projects.defaultScope as a failing check', async () => {
    const { command, capture } = createHarness({
      oatConfigError: new Error(
        'Invalid projects.defaultScope in /tmp/workspace/.oat/config.json: "remote". Expected one of: shared, local, synced.',
      ),
    });

    await runDoctor(command, { globalArgs: ['--json'] });

    expect(capture.jsonPayloads[0]).toMatchObject({
      scope: 'project',
      checks: expect.arrayContaining([
        expect.objectContaining({
          name: 'project:projects_default_scope',
          status: 'fail',
          fix: 'Run `oat config set projects.defaultScope <shared|local|synced>`.',
        }),
      ]),
    });
    expect(process.exitCode).toBe(2);
  });

  it('warns with file and line evidence for stale project invocations', async () => {
    const { command, capture } = createHarness({
      staleInvocationCheck: {
        name: 'project:stale_invocations',
        description: 'Known-stale CLI invocation grammar',
        status: 'warn',
        message:
          'Known-stale CLI invocation found at scripts/bootstrap.sh:7: oat --scope all sync',
        fix: 'Replace it with `oat sync --scope all`.',
      },
    });

    await runDoctor(command);

    expect(capture.info[0]).toContain('project:stale_invocations');
    expect(capture.info[0]).toContain('scripts/bootstrap.sh:7');
    expect(capture.info[0]).toContain('oat sync --scope all');
    expect(process.exitCode).toBe(1);
  });

  it('does not run the project stale-invocation scan for user scope', async () => {
    const { command, checkStaleInvocations } = createHarness({ scope: 'user' });

    await runDoctor(command, { scope: 'user' });

    expect(checkStaleInvocations).not.toHaveBeenCalled();
  });

  it('warns when outdated installed skills are detected', async () => {
    const { command, capture } = createHarness({
      skillVersions: {
        installedSkillCount: 2,
        skippedMissingBundledCount: 0,
        outdatedSkills: [
          {
            skill: 'oat-project-implement',
            installedVersion: '1.0.0',
            bundledVersion: '1.2.0',
          },
        ],
      },
    });

    await runDoctor(command);

    expect(capture.info[0]).toContain('skill_versions');
    expect(capture.info[0]).toContain('oat-project-implement');
    expect(capture.info[0]).toContain('oat init tools');
  });

  it('renders unversioned outdated doctor entries clearly', async () => {
    const { command, capture } = createHarness({
      skillVersions: {
        installedSkillCount: 1,
        skippedMissingBundledCount: 0,
        outdatedSkills: [
          {
            skill: 'oat-project-implement',
            installedVersion: null,
            bundledVersion: '1.2.0',
          },
        ],
      },
    });

    await runDoctor(command);

    expect(capture.info[0]).toContain('(unversioned) < 1.2.0');
  });

  it('passes skill version check when no installed oat skills exist', async () => {
    const { command, capture } = createHarness({
      skillVersions: {
        installedSkillCount: 0,
        skippedMissingBundledCount: 0,
        outdatedSkills: [],
      },
    });

    await runDoctor(command);

    expect(capture.info[0]).toContain('No installed oat-* skills found');
  });

  it('passes skill version check when bundled counterpart is missing', async () => {
    const { command, capture } = createHarness({
      skillVersions: {
        installedSkillCount: 1,
        skippedMissingBundledCount: 1,
        outdatedSkills: [],
      },
    });

    await runDoctor(command);

    expect(capture.info[0]).toContain('Skipped 1 skill(s)');
  });

  it('threads dependency pathExists into skill version checks', async () => {
    const { command, capture, checkSkillVersions } = createHarness({
      pathExists: {
        '/tmp/workspace/.agents/skills': true,
        '/tmp/workspace/.agents/agents': true,
        '/tmp/workspace/.oat/sync/manifest.json': true,
        '/tmp/assets/skills/oat-demo': true,
      },
      checkSkillVersionsOverride: async (
        _scopeRoot,
        _assetsRoot,
        pathExists,
      ) => {
        const exists = await pathExists('/tmp/assets/skills/oat-demo');
        return {
          installedSkillCount: exists ? 1 : 0,
          skippedMissingBundledCount: 0,
          outdatedSkills: [],
        };
      },
    });

    await runDoctor(command);

    expect(checkSkillVersions).toHaveBeenCalled();
    expect(capture.info[0]).toContain(
      'All installed skill versions are current',
    );
  });

  it('reports pass/warn/fail with fix suggestions', async () => {
    const { command, capture } = createHarness({
      pathExists: {
        '/tmp/workspace/.agents/skills': false,
        '/tmp/workspace/.agents/agents': false,
        '/tmp/workspace/.oat/sync/manifest.json': false,
      },
      loadManifestThrows: true,
      symlinkSupported: false,
      providers: [{ name: 'claude', detected: false, version: null }],
    });

    await runDoctor(command);

    expect(capture.info[0]).toContain('Fix:');
    expect(capture.info[0]).toContain('canonical_directories');
  });

  it('includes PJM doctor checks for a declared repository without project pack intent', async () => {
    const { command, capture, runPjmDoctorChecks, resolvePjmAdoption } =
      createHarness({
        // User-scope PJM is the default, so no `tools.project-management`
        // key exists in repository config. Adoption is authoritative.
        oatConfig: { version: 1 },
        pjmAdoption: {
          state: 'declared',
          repoRoot: '/tmp/workspace/.oat/repo',
          recovery: null,
        },
        pathExists: {
          '/tmp/workspace/.agents/skills': true,
          '/tmp/workspace/.agents/agents': true,
          '/tmp/workspace/.oat/sync/manifest.json': true,
          '/tmp/workspace/.oat/repo': true,
        },
        pjmChecks: [
          {
            name: 'pjm:canonical_files',
            description: 'PJM canonical files',
            status: 'pass',
            message: 'Canonical PJM files are present.',
          },
        ],
      });

    await runDoctor(command);

    expect(resolvePjmAdoption).toHaveBeenCalledWith({
      projectRoot: '/tmp/workspace',
      repoRoot: '/tmp/workspace/.oat/repo',
      config: { version: 1 },
    });
    expect(runPjmDoctorChecks).toHaveBeenCalledWith(
      '/tmp/workspace/.oat/repo',
      {
        projectRoot: '/tmp/workspace',
        adoption: {
          state: 'declared',
          repoRoot: '/tmp/workspace/.oat/repo',
          recovery: null,
        },
      },
    );
    expect(capture.info[0]).toContain('pjm:canonical_files');
    expect(capture.info[0]).not.toContain('pjm:disabled');
    expect(process.exitCode).toBe(0);
  });

  it('runs PJM adoption checks when a partial scaffold exists without an explicit marker', async () => {
    const { command, capture, runPjmDoctorChecks } = createHarness({
      pjmAdoption: {
        state: 'partial-initialization',
        repoRoot: '/tmp/workspace/.oat/repo',
        recovery: 'oat pjm init',
      },
      pathExists: {
        '/tmp/workspace/.agents/skills': true,
        '/tmp/workspace/.agents/agents': true,
        '/tmp/workspace/.oat/sync/manifest.json': true,
        '/tmp/workspace/.oat/repo': true,
      },
      pjmChecks: [
        {
          name: 'pjm:adoption',
          description: 'Repository PJM adoption',
          status: 'fail',
          message: 'Repository has a partial PJM scaffold and is not adopted.',
          fix: 'Run `oat pjm init` to initialize this repository.',
        },
      ],
    });

    await runDoctor(command);

    expect(runPjmDoctorChecks).toHaveBeenCalled();
    expect(capture.info[0]).toContain('pjm:adoption');
    expect(capture.info[0]).toContain('oat pjm init');
    expect(capture.info[0]).not.toContain('pjm:disabled');
    expect(process.exitCode).toBe(2);
  });

  it('skips PJM checks entirely when the repository has no adoption and no repo reference root', async () => {
    const { command, capture, runPjmDoctorChecks } = createHarness({
      pjmAdoption: {
        state: 'none',
        repoRoot: '/tmp/workspace/.oat/repo',
        recovery: 'oat pjm init',
      },
      pathExists: {
        '/tmp/workspace/.agents/skills': true,
        '/tmp/workspace/.agents/agents': true,
        '/tmp/workspace/.oat/sync/manifest.json': true,
        '/tmp/workspace/.oat/repo': false,
      },
    });

    await runDoctor(command);

    expect(runPjmDoctorChecks).not.toHaveBeenCalled();
    expect(capture.info[0]).not.toContain('pjm:');
  });

  it('skips PJM checks for an unadopted repository that uses .oat/repo for non-PJM content', async () => {
    const { command, capture, runPjmDoctorChecks } = createHarness({
      pjmAdoption: {
        state: 'none',
        repoRoot: '/tmp/workspace/.oat/repo',
        recovery: 'oat pjm init',
      },
      pathExists: {
        '/tmp/workspace/.agents/skills': true,
        '/tmp/workspace/.agents/agents': true,
        '/tmp/workspace/.oat/sync/manifest.json': true,
        // Written by `oat index`, not by PJM. Adoption is still `none`, so the
        // repository declined PJM and must not be warned about it.
        '/tmp/workspace/.oat/repo': true,
      },
    });

    await runDoctor(command);

    expect(runPjmDoctorChecks).not.toHaveBeenCalled();
    expect(capture.info[0]).not.toContain('pjm:');
    expect(process.exitCode).toBe(0);
  });

  it('passes dispatch matrix availability when all configured cells validate', async () => {
    const { command, capture, validateMatrixCell } = createHarness({
      oatConfig: {
        version: 1,
        workflow: {
          dispatchCeiling: {
            providers: {
              cursor: {
                balanced: 'composer-2.5',
                high: [{ model: 'gpt-5.5-high' }],
              },
              codex: 'high',
            },
          },
        },
      },
    });

    await runDoctor(command);

    expect(capture.info[0]).toContain('dispatch_matrix');
    expect(capture.info[0]).toContain(
      'All configured dispatch matrix cells are available',
    );
    expect(capture.info[0]).toContain(
      'workflow.dispatchCeiling.providers.cursor.balanced.candidates[0]=composer-2.5 (shared config)',
    );
    expect(validateMatrixCell).toHaveBeenCalledWith('cursor', 'composer-2.5', {
      cwd: '/tmp/workspace',
      env: {},
      detailed: true,
    });
    expect(validateMatrixCell).toHaveBeenCalledWith('cursor', 'gpt-5.5-high', {
      cwd: '/tmp/workspace',
      env: {},
      detailed: true,
    });
    expect(validateMatrixCell).toHaveBeenCalledWith('codex', 'high', {
      cwd: '/tmp/workspace',
      env: {},
      detailed: true,
    });
    expect(process.exitCode).toBe(0);
  });

  it('validates materialized Codex targets as model and effort pairs', async () => {
    const { command, capture, validateMatrixCell } = createHarness({
      oatConfig: {
        version: 1,
        workflow: {
          dispatchCeiling: {
            providers: {
              codex: {
                high: [
                  {
                    harness: 'codex',
                    model: 'gpt-5.6-terra',
                    effort: 'xhigh',
                  },
                ],
              },
            },
          },
        },
      },
    });

    await runDoctor(command);

    expect(capture.info[0]).toContain('dispatch_matrix');
    expect(capture.info[0]).toContain(
      'workflow.dispatchCeiling.providers.codex.high.candidates[0].route[0]=gpt-5.6-terra (shared config)',
    );
    expect(validateMatrixCell).toHaveBeenCalledTimes(1);
    expect(validateMatrixCell).toHaveBeenCalledWith('codex', 'gpt-5.6-terra', {
      cwd: '/tmp/workspace',
      env: {},
      detailed: true,
      target: {
        harness: 'codex',
        model: 'gpt-5.6-terra',
        effort: 'xhigh',
      },
    });
    expect(process.exitCode).toBe(0);
  });

  it('walks modern candidate ladders and nested fallback routes with canonical paths', async () => {
    const { command, capture, validateMatrixCell } = createHarness({
      oatConfig: {
        version: 1,
        workflow: {
          dispatchCeiling: {
            providers: {
              cursor: {
                high: {
                  candidates: [
                    'modern-primary',
                    {
                      route: [
                        'nested-fallback',
                        { harness: 'claude', model: 'sonnet' },
                      ],
                    },
                  ],
                },
              },
            },
          },
        },
      },
    });

    await runDoctor(command);

    expect(capture.info[0]).toContain(
      'workflow.dispatchCeiling.providers.cursor.high.candidates[0]=modern-primary (shared config)',
    );
    expect(capture.info[0]).toContain(
      'workflow.dispatchCeiling.providers.cursor.high.candidates[1].route[0]=nested-fallback (shared config)',
    );
    expect(capture.info[0]).toContain(
      'workflow.dispatchCeiling.providers.cursor.high.candidates[1].route[1]=sonnet (shared config)',
    );
    expect(validateMatrixCell).toHaveBeenCalledWith('claude', 'sonnet', {
      cwd: '/tmp/workspace',
      env: {},
      detailed: true,
      target: { harness: 'claude', model: 'sonnet' },
    });
    expect(process.exitCode).toBe(0);
  });

  it('reports Codex model catalog details for unknown route target cells', async () => {
    const { command, capture, validateMatrixCell } = createHarness({
      oatConfig: {
        version: 1,
        workflow: {
          dispatchCeiling: {
            providers: {
              codex: {
                high: [
                  {
                    harness: 'codex',
                    model: 'gpt-5.5',
                    effort: 'xhigh',
                  },
                ],
              },
            },
          },
        },
      },
      validateMatrixCell: async () => ({
        availability: 'unknown-value',
        message:
          "Codex debug models lists 'gpt-5.5', but effort 'xhigh' is not supported. Supported Codex efforts: medium, high.",
      }),
    });

    await runDoctor(command);

    expect(validateMatrixCell).toHaveBeenCalledWith('codex', 'gpt-5.5', {
      cwd: '/tmp/workspace',
      env: {},
      detailed: true,
      target: {
        harness: 'codex',
        model: 'gpt-5.5',
        effort: 'xhigh',
      },
    });
    expect(capture.info[0]).toContain('dispatch_matrix');
    expect(capture.info[0]).toContain('gpt-5.5');
    expect(capture.info[0]).toContain('Supported Codex efforts');
    expect(capture.info[0]).toContain('medium, high');
    expect(process.exitCode).toBe(1);
  });

  it('warns for legacy Codex effort-only dispatch cells', async () => {
    const { command, capture } = createHarness({
      oatConfig: {
        version: 1,
        workflow: {
          dispatchCeiling: {
            providers: {
              codex: 'high',
            },
          },
        },
      },
      validateMatrixCell: async () => 'unknown-value',
    });

    await runDoctor(command);

    expect(capture.info[0]).toContain('dispatch_matrix');
    expect(capture.info[0]).toContain(
      'Unknown dispatch matrix cells: workflow.dispatchCeiling.providers.codex=high (shared config)',
    );
    expect(process.exitCode).toBe(1);
  });

  it('warns on unknown or unvalidated configured dispatch matrix cells', async () => {
    const { command, capture } = createHarness({
      oatConfig: {
        version: 1,
        workflow: {
          dispatchCeiling: {
            providers: {
              cursor: {
                high: [{ model: 'missing-model' }, { model: 'composer-2.5' }],
              },
              codex: 'xhigh',
            },
          },
        },
      },
      validateMatrixCell: async (_provider, value) => {
        if (value === 'missing-model') {
          return 'unknown-value';
        }
        if (value === 'xhigh') {
          return 'unvalidated';
        }
        return 'valid';
      },
    });

    await runDoctor(command);

    expect(capture.info[0]).toContain('dispatch_matrix');
    expect(capture.info[0]).toContain(
      'Unknown dispatch matrix cells: workflow.dispatchCeiling.providers.cursor.high.candidates[0].route[0]=missing-model',
    );
    expect(capture.info[0]).toContain(
      'workflow.dispatchCeiling.providers.cursor.high.candidates[0].route[0]=missing-model (shared config)',
    );
    expect(capture.info[0]).toContain(
      'Unvalidated dispatch matrix cells: workflow.dispatchCeiling.providers.codex=xhigh',
    );
    expect(capture.info[0]).toContain('oat config set');
    expect(process.exitCode).toBe(1);
  });

  it('reports Cursor subagent allowed-list details for unknown model cells', async () => {
    const { command, capture, validateMatrixCell } = createHarness({
      oatConfig: {
        version: 1,
        workflow: {
          dispatchCeiling: {
            providers: {
              cursor: { high: 'gpt-5.3-codex-low' },
            },
          },
        },
      },
      validateMatrixCell: async () => ({
        availability: 'unknown-value',
        allowedValues: ['gpt-5.3-codex', 'composer-2.5'],
        message:
          'Cursor rejected this model for subagent Task dispatch. Allowed subagent models: gpt-5.3-codex, composer-2.5.',
      }),
    });

    await runDoctor(command);

    expect(validateMatrixCell).toHaveBeenCalledWith(
      'cursor',
      'gpt-5.3-codex-low',
      {
        cwd: '/tmp/workspace',
        env: {},
        detailed: true,
      },
    );
    expect(capture.info[0]).toContain('dispatch_matrix');
    expect(capture.info[0]).toContain('gpt-5.3-codex-low');
    expect(capture.info[0]).toContain('Allowed subagent models');
    expect(capture.info[0]).toContain('gpt-5.3-codex');
    expect(process.exitCode).toBe(1);
  });

  it('warns when a mapped Cursor flat ID disappears without claiming pin verification', async () => {
    const { command, capture } = createHarness({
      providers: [{ name: 'cursor', detected: true, version: '3.12.10' }],
      cursorMaterializedDiagnostics: [
        {
          ladderModelId: 'retired-model-high',
          availability: 'missing',
          evidence: 'broad-cli-catalog',
          message:
            'Cursor broad CLI catalog no longer lists the model; definition pin and runtime identity were not tested.',
        },
      ],
    });

    await runDoctor(command);

    expect(capture.info[0]).toContain('cursor_materialized_models');
    expect(capture.info[0]).toContain('retired-model-high');
    expect(capture.info[0]).toContain(
      'does not verify definition pins or runtime identity',
    );
    expect(process.exitCode).toBe(1);
  });

  it('warns on unvalidated dispatch matrix cells', async () => {
    const { command, capture } = createHarness({
      oatConfig: {
        version: 1,
        workflow: {
          dispatchCeiling: {
            providers: {
              cursor: { high: 'composer-2.5' },
            },
          },
        },
      },
      validateMatrixCell: async () => 'unvalidated',
    });

    await runDoctor(command);

    expect(capture.info[0]).toContain('dispatch_matrix');
    expect(capture.info[0]).toContain(
      'Unvalidated dispatch matrix cells: workflow.dispatchCeiling.providers.cursor.high.candidates[0]=composer-2.5',
    );
    expect(capture.info[0]).toContain(
      'workflow.dispatchCeiling.providers.cursor.high.candidates[0]=composer-2.5 (shared config)',
    );
    expect(process.exitCode).toBe(1);
  });

  it('validates default local dispatch matrix adoption', async () => {
    const { command, capture, validateMatrixCell } = createHarness({
      oatLocalConfig: {
        version: 1,
        workflow: {
          dispatchCeiling: {
            providers: {
              cursor: { high: 'composer-2.5' },
            },
          },
        },
      },
    });

    await runDoctor(command);

    expect(capture.info[0]).toContain('dispatch_matrix');
    expect(capture.info[0]).toContain(
      'workflow.dispatchCeiling.providers.cursor.high.candidates[0]=composer-2.5 (local config)',
    );
    expect(validateMatrixCell).toHaveBeenCalledWith('cursor', 'composer-2.5', {
      cwd: '/tmp/workspace',
      env: {},
      detailed: true,
    });
    expect(process.exitCode).toBe(0);
  });

  it('warns on user dispatch matrix drift and reports the config layer', async () => {
    const { command, capture } = createHarness({
      userConfig: {
        version: 1,
        workflow: {
          dispatchCeiling: {
            providers: {
              cursor: { high: 'missing-model' },
            },
          },
        },
      },
      validateMatrixCell: async () => 'unknown-value',
    });

    await runDoctor(command);

    expect(capture.info[0]).toContain('dispatch_matrix');
    expect(capture.info[0]).toContain(
      'Unknown dispatch matrix cells: workflow.dispatchCeiling.providers.cursor.high.candidates[0]=missing-model (user config)',
    );
    expect(process.exitCode).toBe(1);
  });

  it('shares Cursor validation work across config layers while retaining exact paths and provenance', async () => {
    const duplicate = 'gpt-5.6-terra-xhigh';
    const distinct = 'gpt-5.6-sol-high';
    const runCursorAgent = vi.fn(async (args: string[]) => {
      if (args.includes('models')) {
        return {
          ok: true,
          stdout: `${duplicate} - Terra XHigh\n${distinct} - Sol High\n`,
          stderr: '',
        };
      }
      return {
        ok: false,
        stdout: '',
        stderr: 'Task probe was inconclusive',
      };
    });
    const cursorHigh = (candidates: string[]) => ({
      version: 1 as const,
      workflow: {
        dispatchCeiling: {
          providers: { cursor: { high: { candidates } } },
        },
      },
    });
    const { command, capture } = createHarness({
      userConfig: cursorHigh([duplicate]),
      oatConfig: cursorHigh([duplicate]),
      oatLocalConfig: cursorHigh([duplicate, distinct]),
      availabilityDependencies: {
        pathExists: vi.fn(async () => false),
        runCursorAgent,
        runCodex: vi.fn(async () => ({
          ok: false,
          stdout: '',
          stderr: 'not used',
        })),
        env: {},
      },
    });

    await runDoctor(command);

    const calls = runCursorAgent.mock.calls.map(([args]) => args);
    expect(calls.filter((args) => args.includes('-p'))).toHaveLength(2);
    expect(calls.filter((args) => args.includes('models'))).toHaveLength(1);
    expect(calls.filter((args) => args.includes('--list-models'))).toHaveLength(
      0,
    );

    const output = capture.info[0] ?? '';
    const duplicatePath =
      'workflow.dispatchCeiling.providers.cursor.high.candidates[0]';
    expect(output).toContain(`${duplicatePath}=${duplicate} (user config)`);
    expect(output).toContain(`${duplicatePath}=${duplicate} (shared config)`);
    expect(output).toContain(`${duplicatePath}=${duplicate} (local config)`);
    expect(output).toContain(
      `workflow.dispatchCeiling.providers.cursor.high.candidates[1]=${distinct} (local config)`,
    );
    expect(output).toContain('Unvalidated dispatch matrix cells');
    expect(process.exitCode).toBe(1);
  });

  it('outputs JSON when --json set', async () => {
    const { command, capture } = createHarness();

    await runDoctor(command, { globalArgs: ['--json'] });

    expect(capture.info).toHaveLength(0);
    expect(capture.jsonPayloads).toHaveLength(1);
    expect(capture.jsonPayloads[0]).toMatchObject({
      scope: 'project',
      checks: expect.any(Array),
    });
  });

  it('exits 0 for all pass, 1 for warnings, 2 for failures', async () => {
    const allPassHarness = createHarness({
      providers: [{ name: 'claude', detected: true, version: '1.2.3' }],
      pathExists: {
        '/tmp/workspace/.agents/skills': true,
        '/tmp/workspace/.agents/agents': true,
        '/tmp/workspace/.oat/sync/manifest.json': true,
      },
      symlinkSupported: true,
    });
    await runDoctor(allPassHarness.command);
    expect(process.exitCode).toBe(0);

    const warnHarness = createHarness({
      providers: [{ name: 'claude', detected: false, version: null }],
      pathExists: {
        '/tmp/workspace/.agents/skills': true,
        '/tmp/workspace/.agents/agents': true,
        '/tmp/workspace/.oat/sync/manifest.json': false,
      },
      symlinkSupported: true,
    });
    await runDoctor(warnHarness.command);
    expect(process.exitCode).toBe(1);

    const failHarness = createHarness({
      loadManifestThrows: true,
      pathExists: {
        '/tmp/workspace/.agents/skills': true,
        '/tmp/workspace/.agents/agents': true,
        '/tmp/workspace/.oat/sync/manifest.json': true,
      },
      providers: [{ name: 'claude', detected: true, version: '1.2.3' }],
      symlinkSupported: true,
    });
    await runDoctor(failHarness.command);
    expect(process.exitCode).toBe(2);
  });

  it('passes codex TOML parse + multi_agent + role-file checks', async () => {
    const codexConfigPath = '/tmp/workspace/.codex/config.toml';
    const reviewerRolePath = '/tmp/workspace/.codex/agents/reviewer.toml';
    const { command, capture } = createHarness({
      pathExists: {
        '/tmp/workspace/.agents/skills': true,
        '/tmp/workspace/.agents/agents': true,
        '/tmp/workspace/.oat/sync/manifest.json': true,
        [codexConfigPath]: true,
        [reviewerRolePath]: true,
      },
      fileContents: {
        [codexConfigPath]: `[features]
multi_agent = true

[agents]
max_depth = 2

[agents.reviewer]
config_file = "agents/reviewer.toml"
`,
        [reviewerRolePath]: [
          '# oat-managed: true',
          '# oat-role: reviewer',
          'developer_instructions = "review"',
        ].join('\n'),
      },
    });

    await runDoctor(command);

    expect(capture.info[0]).toContain('codex_config_toml');
    expect(capture.info[0]).toContain('parsed successfully');
    expect(capture.info[0]).toContain('codex_multi_agent');
    expect(capture.info[0]).toContain('enabled for codex managed roles');
    expect(capture.info[0]).toContain('codex_role_file_refs');
    expect(capture.info[0]).toContain('references exist');
  });

  it.each([1, 2, 3])(
    'passes project codex max depth %i for managed roles',
    async (maxDepth) => {
      const codexConfigPath = '/tmp/workspace/.codex/config.toml';
      const reviewerRolePath = '/tmp/workspace/.codex/agents/reviewer.toml';
      const { command, capture } = createHarness({
        pathExists: {
          [codexConfigPath]: true,
          [reviewerRolePath]: true,
        },
        fileContents: {
          [codexConfigPath]: `[features]\nmulti_agent = true\n\n[agents]\nmax_depth = ${maxDepth}\n\n[agents.reviewer]\nconfig_file = "agents/reviewer.toml"\n`,
          [reviewerRolePath]: [
            '# oat-managed: true',
            '# oat-role: reviewer',
          ].join('\n'),
        },
      });

      await runDoctor(command);

      expect(capture.info[0]).toContain('project:codex_max_depth');
      expect(capture.info[0]).toContain(`agents.max_depth is ${maxDepth}`);
      expect(capture.info[0]).toContain('root (0) → phase implementer (1)');
      if (maxDepth === 1) {
        expect(capture.info[0]).toContain(
          'Depth 2 enables optional nested child (2)',
        );
      }
      expect(process.exitCode).toBe(0);
    },
  );

  it.each([
    ['invalid', 'max_depth = "invalid"'],
    ['below the required floor', 'max_depth = 0'],
  ])('warns when project codex max depth is %s', async (_label, depthLine) => {
    const codexConfigPath = '/tmp/workspace/.codex/config.toml';
    const rolePath = '/tmp/workspace/.codex/agents/worker.toml';
    const { command, capture } = createHarness({
      pathExists: {
        [codexConfigPath]: true,
        [rolePath]: true,
      },
      fileContents: {
        [codexConfigPath]: `[features]\nmulti_agent = true\n\n[agents]\n${depthLine}\n\n[agents.worker]\nconfig_file = "agents/worker.toml"\n`,
        [rolePath]: '# oat-managed: true\n# oat-role: worker\n',
      },
    });

    await runDoctor(command);

    expect(capture.info[0]).toContain('project:codex_max_depth');
    expect(capture.info[0]).toContain('root (0) → phase implementer (1)');
    expect(capture.info[0]).toContain('oat sync --scope project');
    expect(capture.info[0]).toContain(
      'oat providers codex materialize <agent-name> --model <model> --effort <effort> --scope project',
    );
    expect(process.exitCode).toBe(1);
  });

  it('does not emit a codex max depth check without managed roles', async () => {
    const codexConfigPath = '/tmp/workspace/.codex/config.toml';
    const { command, capture } = createHarness({
      pathExists: { [codexConfigPath]: true },
      fileContents: {
        [codexConfigPath]:
          '[agents]\nmax_depth = 1\n\n[agents.custom]\nconfig_file = "agents/custom.toml"\n',
      },
    });

    await runDoctor(command);

    expect(capture.info[0]).not.toContain('codex_max_depth');
  });

  it('inherits user codex max depth only when project depth is absent', async () => {
    const projectConfigPath = '/tmp/workspace/.codex/config.toml';
    const userConfigPath = '/tmp/home/.codex/config.toml';
    const rolePath = '/tmp/workspace/.codex/agents/worker.toml';
    const { command, capture } = createHarness({
      pathExists: {
        [projectConfigPath]: true,
        [userConfigPath]: true,
        [rolePath]: true,
      },
      fileContents: {
        [projectConfigPath]:
          '[features]\nmulti_agent = true\n\n[agents.worker]\nconfig_file = "agents/worker.toml"\n',
        [userConfigPath]: '[agents]\nmax_depth = 3\n',
        [rolePath]: '# oat-managed: true\n# oat-role: worker\n',
      },
    });

    await runDoctor(command);

    expect(capture.info[0]).toContain('project:codex_max_depth');
    expect(capture.info[0]).toContain('agents.max_depth is 3');
    expect(process.exitCode).toBe(0);
  });

  it('does not inherit user codex max depth over an invalid project value', async () => {
    const projectConfigPath = '/tmp/workspace/.codex/config.toml';
    const userConfigPath = '/tmp/home/.codex/config.toml';
    const rolePath = '/tmp/workspace/.codex/agents/worker.toml';
    const { command, capture } = createHarness({
      pathExists: {
        [projectConfigPath]: true,
        [userConfigPath]: true,
        [rolePath]: true,
      },
      fileContents: {
        [projectConfigPath]:
          '[features]\nmulti_agent = true\n\n[agents]\nmax_depth = "invalid"\n\n[agents.worker]\nconfig_file = "agents/worker.toml"\n',
        [userConfigPath]: '[agents]\nmax_depth = 4\n',
        [rolePath]: '# oat-managed: true\n# oat-role: worker\n',
      },
    });

    await runDoctor(command);

    expect(capture.info[0]).toContain('project:codex_max_depth');
    expect(capture.info[0]).toContain('not a valid number');
    expect(process.exitCode).toBe(1);
  });

  it('accepts user codex max depth one for default phase execution', async () => {
    const codexConfigPath = '/tmp/home/.codex/config.toml';
    const rolePath = '/tmp/home/.codex/agents/worker.toml';
    const { command, capture } = createHarness({
      scope: 'user',
      pathExists: {
        '/tmp/home/.agents/skills': true,
        '/tmp/home/.oat/sync/manifest.json': true,
        [codexConfigPath]: true,
        [rolePath]: true,
      },
      fileContents: {
        [codexConfigPath]:
          '[features]\nmulti_agent = true\n\n[agents]\nmax_depth = 1\n\n[agents.worker]\nconfig_file = "agents/worker.toml"\n',
        [rolePath]: '# oat-managed: true\n# oat-role: worker\n',
      },
    });

    await runDoctor(command, { scope: 'user' });

    expect(capture.info[0]).toContain('user:codex_max_depth');
    expect(capture.info[0]).toContain(
      'Depth 2 enables optional nested child (2)',
    );
    expect(process.exitCode).toBe(0);
  });

  it('passes user codex max depth at the managed-role floor', async () => {
    const codexConfigPath = '/tmp/home/.codex/config.toml';
    const rolePath = '/tmp/home/.codex/agents/worker.toml';
    const { command, capture } = createHarness({
      scope: 'user',
      pathExists: {
        '/tmp/home/.agents/skills': true,
        '/tmp/home/.oat/sync/manifest.json': true,
        [codexConfigPath]: true,
        [rolePath]: true,
      },
      fileContents: {
        [codexConfigPath]:
          '[features]\nmulti_agent = true\n\n[agents]\nmax_depth = 2\n\n[agents.worker]\nconfig_file = "agents/worker.toml"\n',
        [rolePath]: '# oat-managed: true\n# oat-role: worker\n',
      },
    });

    await runDoctor(command, { scope: 'user' });

    expect(capture.info[0]).toContain('user:codex_max_depth');
    expect(capture.info[0]).toContain('agents.max_depth is 2');
    expect(process.exitCode).toBe(0);
  });

  it('fails when codex config.toml cannot be parsed', async () => {
    const codexConfigPath = '/tmp/workspace/.codex/config.toml';
    const { command, capture } = createHarness({
      pathExists: {
        [codexConfigPath]: true,
      },
      fileContents: {
        [codexConfigPath]: 'not = [valid',
      },
    });

    await runDoctor(command);

    expect(capture.info[0]).toContain('codex_config_toml');
    expect(capture.info[0]).toContain('Failed to parse .codex/config.toml');
    expect(process.exitCode).toBe(2);
  });

  it('warns when codex managed roles exist but multi_agent is not true', async () => {
    const codexConfigPath = '/tmp/workspace/.codex/config.toml';
    const reviewerRolePath = '/tmp/workspace/.codex/agents/reviewer.toml';
    const { command, capture } = createHarness({
      pathExists: {
        [codexConfigPath]: true,
        [reviewerRolePath]: true,
      },
      fileContents: {
        [codexConfigPath]: `[features]
multi_agent = false

[agents.reviewer]
config_file = "agents/reviewer.toml"
`,
        [reviewerRolePath]: [
          '# oat-managed: true',
          '# oat-role: reviewer',
          'developer_instructions = "review"',
        ].join('\n'),
      },
    });

    await runDoctor(command);

    expect(capture.info[0]).toContain('codex_multi_agent');
    expect(capture.info[0]).toContain('is not true');
    expect(process.exitCode).toBe(1);
  });

  it('recognizes codex managed roles from generated role-file headers', async () => {
    const codexConfigPath = '/tmp/workspace/.codex/config.toml';
    const rolePath =
      '/tmp/workspace/.codex/agents/custom-gpt-5-6-sol-high.toml';
    const { command, capture } = createHarness({
      pathExists: {
        [codexConfigPath]: true,
        [rolePath]: true,
      },
      fileContents: {
        [codexConfigPath]: `[features]
multi_agent = false

[agents.custom-gpt-5-6-sol-high]
config_file = "agents/custom-gpt-5-6-sol-high.toml"
`,
        [rolePath]: [
          '# oat-managed: true',
          '# oat-role: custom-gpt-5-6-sol-high',
          'model = "gpt-5.6-sol"',
          'model_reasoning_effort = "high"',
        ].join('\n'),
      },
    });

    await runDoctor(command);

    expect(capture.info[0]).toContain('codex_multi_agent');
    expect(capture.info[0]).toContain('is not true');
    expect(capture.info[0]).toContain('codex_role_file_refs');
    expect(capture.info[0]).toContain('references exist');
    expect(process.exitCode).toBe(1);
  });

  it('warns when codex role config_file points to a missing file', async () => {
    const codexConfigPath = '/tmp/workspace/.codex/config.toml';
    const roleName = 'oat-reviewer-gpt-5-6-terra-xhigh';
    const { command, capture } = createHarness({
      pathExists: {
        [codexConfigPath]: true,
        [`/tmp/workspace/.codex/agents/${roleName}.toml`]: false,
      },
      fileContents: {
        [codexConfigPath]: `[features]
multi_agent = true

[agents.${roleName}]
config_file = "agents/${roleName}.toml"
`,
      },
    });

    await runDoctor(command);

    expect(capture.info[0]).toContain('codex_role_file_refs');
    expect(capture.info[0]).toContain(
      `Missing codex role files: agents/${roleName}.toml`,
    );
    expect(capture.info[0]).toContain('oat sync --scope project');
    expect(capture.info[0]).toContain(
      'oat providers codex materialize <agent-name> --model <model> --effort <effort> --scope project',
    );
    expect(process.exitCode).toBe(1);
  });

  it('warns about partial and stale packs with scoped recovery commands', async () => {
    const { command, capture } = createHarness({
      packInventories: [
        packInventory('docs', [
          scopedInventory('docs', 'project', 'partial', [
            packAsset('.agents/skills/oat-docs-analyze', 'current', 'project'),
            packAsset('.agents/skills/oat-docs-apply', 'missing', 'project'),
          ]),
        ]),
        packInventory('utility', [
          scopedInventory('utility', 'project', 'complete', [
            packAsset('.agents/skills/oat-brainstorm', 'outdated', 'project'),
          ]),
        ]),
      ],
    });

    await runDoctor(command);

    expect(capture.info[0]).toContain('project:pack_state');
    expect(capture.info[0]).toContain('docs [partial]');
    expect(capture.info[0]).toContain('.agents/skills/oat-docs-apply');
    expect(capture.info[0]).toContain('utility [stale]');
    expect(capture.info[0]).toContain(
      'oat tools update --pack docs --scope project',
    );
    expect(capture.info[0]).toContain(
      'oat tools update --pack utility --scope project',
    );
    expect(process.exitCode).toBe(1);
  });

  it('reports newer and retained override pack assets without an actionable fix', async () => {
    const { command, capture } = createHarness({
      packInventories: [
        packInventory('workflows', [
          scopedInventory('workflows', 'project', 'complete', [
            packAsset('.agents/skills/oat-project-new', 'newer', 'project'),
            packAsset(
              '.oat/ideas/backlog.md',
              'current',
              'project',
              'seed-if-missing',
            ),
            packAsset(
              '.oat/templates/state.md',
              'present',
              'project',
              'seed-if-missing',
            ),
          ]),
        ]),
      ],
    });

    await runDoctor(command);

    expect(capture.info[0]).toContain('workflows [newer]');
    expect(capture.info[0]).toContain('workflows [retained-override]');
    expect(capture.info[0]).toContain('1 owner-owned override(s) retained');
    expect(capture.info[0]).not.toContain(
      'oat tools update --pack workflows --scope project',
    );
    expect(process.exitCode).toBe(0);
  });

  it('renders findings and recovery commands as distinct non-colliding lines', async () => {
    const { command, capture } = createHarness({
      packInventories: [
        packInventory('docs', [
          scopedInventory('docs', 'project', 'partial', [
            packAsset('.agents/skills/oat-docs-apply', 'missing', 'project'),
            packAsset(
              '.oat/templates/docs-app-fuma',
              'present',
              'project',
              'seed-if-missing',
            ),
          ]),
        ]),
        packInventory('utility', [
          scopedInventory('utility', 'project', 'complete', [
            packAsset('.agents/skills/analyze', 'outdated', 'project'),
          ]),
        ]),
      ],
    });

    await runDoctor(command);

    const output = capture.info[0]!;
    expect(output).toContain(
      '\n  - docs [retained-override]: 1 owner-owned override(s) retained; managed defaults are not applied here',
    );
    expect(output).toContain(
      '\n  Fix: oat tools update --pack docs --scope project\n  Fix: oat tools update --pack utility --scope project',
    );
  });

  it('attributes a retained shared asset only to the applicable pack owner', async () => {
    const sharedPath = '.oat/scripts/resolve-tracking.sh';
    const { command, capture } = createHarness({
      scope: 'user',
      packInventories: [
        packInventory('docs', [
          scopedInventory(
            'docs',
            'user',
            'absent',
            [sharedPackAsset(sharedPath, 'current', 'user')],
            {
              intent: {
                pack: 'docs',
                scope: 'user',
                enabled: false,
                source: 'none',
                configPath: '/tmp/home/.oat/config.json',
                diagnostics: [],
              },
            },
          ),
        ]),
        packInventory('workflows', [
          scopedInventory('workflows', 'user', 'complete', [
            packAsset('.agents/skills/oat-project-new', 'current', 'user'),
            sharedPackAsset(sharedPath, 'current', 'user'),
          ]),
        ]),
      ],
    });

    await runDoctor(command, { scope: 'user' });

    expect(capture.info[0]).toContain('workflows [shared-owner-observation]');
    expect(capture.info[0]).toContain(
      'installed or intended pack owner(s): workflows',
    );
    expect(capture.info[0]?.match(/shared-owner-observation/g)).toHaveLength(1);
    expect(capture.info[0]).not.toContain('docs [shared-owner-observation]');
  });

  it('warns about legacy false pack intent that still has managed assets', async () => {
    const { command, capture } = createHarness({
      packInventories: [
        packInventory('research', [
          scopedInventory(
            'research',
            'project',
            'complete',
            [packAsset('.agents/skills/oat-research', 'current', 'project')],
            {
              intent: {
                pack: 'research',
                scope: 'project',
                enabled: true,
                source: 'inferred-legacy',
                configPath: '/tmp/workspace/.oat/config.json',
                diagnostics: [],
              },
              diagnostics: [
                {
                  code: 'legacy-false-conflict',
                  message:
                    'Pack research has legacy false intent but managed assets exist at project scope',
                  paths: ['/tmp/workspace/.agents/skills/oat-research'],
                },
              ],
            },
          ),
        ]),
      ],
    });

    await runDoctor(command);

    expect(capture.info[0]).toContain('research [legacy-false-conflict]');
    expect(capture.info[0]).toContain(
      'oat tools update --pack research --scope project',
    );
    expect(process.exitCode).toBe(1);
  });

  it('names user-scope agents lacking native materialization without demanding a repair', async () => {
    const { command, capture } = createHarness({
      scope: 'user',
      packInventories: [
        packInventory('research', [
          scopedInventory(
            'research',
            'user',
            'complete',
            [packAsset('.agents/skills/analyze', 'current', 'user')],
            {
              diagnostics: [
                {
                  code: 'user-agent-unmaterialized',
                  message:
                    'Pack research installs user-scope canonical agents that no provider view materializes',
                  paths: ['/tmp/home/.agents/agents/skeptical-evaluator.md'],
                },
              ],
            },
          ),
        ]),
      ],
    });

    await runDoctor(command, { scope: 'user', globalArgs: ['--json'] });

    const payload = capture.jsonPayloads[0] as {
      checks: DoctorCheck[];
      packEvidence: {
        status: string;
        items: Array<{
          pack: string;
          realizedPlacement: string;
          diagnostics: Array<{
            code: string;
            affectedAssets: string[];
            recovery: Array<{ command?: string }>;
          }>;
        }>;
      };
    };
    const packCheck = payload.checks.find(
      (check) => check.name === 'user:pack_state',
    );
    expect(packCheck?.message).toContain(
      'research [user-agent-unmaterialized]',
    );
    // The affected agent is named, and the user-scope root is redacted.
    expect(packCheck?.message).toContain(
      '~/.agents/agents/skeptical-evaluator.md',
    );
    expect(packCheck?.message).not.toContain('/tmp/home/.agents');
    expect(packCheck?.message).toContain(
      'canonical instruction reads are unaffected',
    );
    // `oat tools update` cannot repair a scope limitation, so no recovery
    // command is offered and the check itself does not warn.
    expect(packCheck?.fix).toBeUndefined();
    expect(packCheck?.status).toBe('pass');
    const evidence = payload.packEvidence.items.find(
      ({ pack }) => pack === 'research',
    );
    expect(payload.packEvidence.status).toBe('partial');
    expect(evidence).toMatchObject({
      realizedPlacement: 'user',
      diagnostics: [
        expect.objectContaining({
          code: 'provider-materialization-missing',
          affectedAssets: ['~/.agents/agents/skeptical-evaluator.md'],
          recovery: [
            expect.objectContaining({
              command: 'oat tools install research --scope project',
            }),
          ],
        }),
      ],
    });
  });

  it('warns about duplicate cross-scope packs and offers migration', async () => {
    const { command, capture } = createHarness({
      scope: 'all',
      packInventories: [
        packInventory(
          'ideas',
          [
            scopedInventory('ideas', 'project', 'complete', [
              packAsset('.agents/skills/oat-idea', 'current', 'project'),
            ]),
            scopedInventory('ideas', 'user', 'complete', [
              packAsset('.agents/skills/oat-idea', 'current', 'user'),
            ]),
          ],
          {
            diagnostics: [
              {
                code: 'duplicate-scope',
                message:
                  'Pack ideas has canonical assets at project and user scope; provider precedence is not inferred',
                paths: [
                  '/tmp/workspace/.agents/skills/oat-idea',
                  '/tmp/home/.agents/skills/oat-idea',
                ],
                versions: [null, null],
              },
            ],
          },
        ),
      ],
    });

    await runDoctor(command, { scope: 'all' });

    expect(capture.info[0]).toContain('packs:scope_duplication');
    expect(capture.info[0]).toContain('ideas');
    expect(capture.info[0]).toContain(
      'oat tools migrate --pack ideas --from project --to user',
    );
    expect(process.exitCode).toBe(1);
  });

  it('renders user-scope pack paths as home-relative without exposing home content', async () => {
    const { command, capture } = createHarness({
      scope: 'user',
      packInventories: [
        packInventory('brainstorm', [
          scopedInventory('brainstorm', 'user', 'partial', [
            packAsset('.agents/skills/oat-brainstorm', 'missing', 'user'),
          ]),
        ]),
      ],
    });

    await runDoctor(command, { scope: 'user' });

    expect(capture.info[0]).toContain('user:pack_state');
    expect(capture.info[0]).toContain('~/.agents/skills/oat-brainstorm');
    expect(capture.info[0]).not.toContain('/tmp/home/.agents');
  });

  it('passes pack state when every installed pack is complete and current', async () => {
    const { command, capture } = createHarness({
      packInventories: [
        packInventory('core', [
          scopedInventory('core', 'project', 'complete', [
            packAsset('.agents/skills/oat-sync', 'current', 'project'),
          ]),
        ]),
      ],
    });

    await runDoctor(command);

    expect(capture.info[0]).toContain('project:pack_state');
    expect(capture.info[0]).toContain(
      'All installed managed packs are complete and current.',
    );
    expect(process.exitCode).toBe(0);
  });

  it.each([
    {
      label: 'Claude only',
      adapters: [detectedAdapter('claude', true)],
      providers: {},
      expected: false,
    },
    {
      label: 'Codex configured enabled but undetected',
      adapters: [detectedAdapter('codex', false)],
      providers: { codex: { enabled: true } },
      expected: true,
    },
    {
      label: 'Codex configured disabled but detected',
      adapters: [detectedAdapter('codex', true)],
      providers: { codex: { enabled: false } },
      expected: false,
    },
    {
      label: 'Cursor detected with unset config',
      adapters: [detectedAdapter('cursor', true)],
      providers: {},
      expected: true,
    },
    {
      label: 'no provider',
      adapters: [],
      providers: {},
      expected: false,
    },
  ])(
    'passes config-aware managed-role capability to inventory for $label',
    async ({ adapters, providers, expected }) => {
      const { command, inventoryPack } = createHarness({
        scope: 'user',
        adapters,
        userSyncConfigProviders: providers,
      });

      await runDoctor(command, { scope: 'user' });

      expect(inventoryPack).toHaveBeenCalledWith(
        expect.objectContaining({
          pack: 'core',
          userManagedRoleMaterialization: expected,
        }),
      );
    },
  );

  it('inventories every manifest pack for the resolved scopes', async () => {
    const { command, inventoryPack } = createHarness({ scope: 'all' });

    await runDoctor(command, { scope: 'all' });

    expect(inventoryPack).toHaveBeenCalledTimes(PACK_NAMES.length);
    for (const pack of PACK_NAMES) {
      expect(inventoryPack).toHaveBeenCalledWith({
        pack,
        assetsRoot: '/tmp/assets',
        projectRoot: '/tmp/workspace',
        userRoot: '/tmp/home',
        userManagedRoleMaterialization: false,
      });
    }
  });

  it('reports project scope as unavailable and still runs user checks for --scope all', async () => {
    const { command, capture, inventoryPack } = createHarness({
      scope: 'all',
      projectScopeUnavailable: true,
    });

    await runDoctor(command, { scope: 'all' });

    expect(capture.info[0]).toContain('project:scope_availability');
    expect(capture.info[0]).toContain('Project scope is unavailable');
    expect(capture.info[0]).toContain('user:canonical_directories');
    expect(inventoryPack).toHaveBeenCalledWith({
      pack: 'core',
      assetsRoot: '/tmp/assets',
      userRoot: '/tmp/home',
      userManagedRoleMaterialization: false,
    });
    expect(process.exitCode).toBe(1);
  });

  it('fails when an explicitly requested project scope is unavailable', async () => {
    const { command } = createHarness({ projectScopeUnavailable: true });

    await expect(runDoctor(command)).rejects.toThrow(
      'Not inside a Git repository',
    );
  });

  it('emits pack state checks in JSON mode', async () => {
    const { command, capture } = createHarness({
      packInventories: [
        packInventory('docs', [
          scopedInventory('docs', 'project', 'partial', [
            packAsset('.agents/skills/oat-docs-apply', 'missing', 'project'),
          ]),
        ]),
      ],
    });

    await runDoctor(command, { globalArgs: ['--json'] });

    const payload = capture.jsonPayloads[0] as {
      checks: DoctorCheck[];
      packEvidence: {
        items: Array<{
          pack: string;
          realizedPlacement: string;
          diagnostics: Array<{ code: string }>;
        }>;
      };
    };
    const packCheck = payload.checks.find(
      (check) => check.name === 'project:pack_state',
    );
    expect(packCheck?.status).toBe('warn');
    expect(packCheck?.message).toContain('docs [partial]');
    expect(packCheck?.fix).toContain(
      'oat tools update --pack docs --scope project',
    );
    expect(
      payload.packEvidence.items.find(({ pack }) => pack === 'docs'),
    ).toMatchObject({
      realizedPlacement: 'none',
      diagnostics: expect.arrayContaining([
        expect.objectContaining({ code: 'declared-only' }),
        expect.objectContaining({ code: 'partial-placement' }),
      ]),
    });
  });

  it('warns when managed pack inventory cannot be computed', async () => {
    const { command, capture } = createHarness({
      resolveAssetsRootThrows: true,
    });

    await runDoctor(command);

    expect(capture.info[0]).toContain('packs:inventory');
    expect(capture.info[0]).toContain('assets unavailable');
  });
});
