import type { CommandContext, GlobalOptions } from '@app/command-context';
import {
  createLoggerCapture,
  type LoggerCapture,
} from '@commands/__tests__/helpers';
import type { OatConfig, OatLocalConfig, UserConfig } from '@config/oat-config';
import type { Manifest } from '@manifest/index';
import type {
  MatrixCellAvailability,
  MatrixCellAvailabilityResult,
  ValidateMatrixCellOptions,
} from '@providers/identity/availability';
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
  oatConfig?: OatConfig;
  oatLocalConfig?: OatLocalConfig;
  userConfig?: UserConfig;
  pjmChecks?: DoctorCheck[];
  validateMatrixCell?: (
    provider: string,
    value: string,
    options: ValidateMatrixCellOptions,
  ) => Promise<MatrixCellAvailability | MatrixCellAvailabilityResult>;
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

function createHarness(options: HarnessOptions = {}): {
  capture: LoggerCapture;
  command: Command;
  checkSkillVersions: ReturnType<typeof vi.fn>;
  runPjmDoctorChecks: ReturnType<typeof vi.fn>;
  validateMatrixCell: ReturnType<typeof vi.fn>;
} {
  const capture = createLoggerCapture();
  const scope = options.scope ?? 'project';
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
  const validateMatrixCell = vi.fn(
    options.validateMatrixCell ??
      (async () => 'valid' satisfies MatrixCellAvailability),
  );
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
      return (
        options.providers ?? [
          { name: 'claude', detected: true, version: '1.2.3' },
          { name: 'cursor', detected: false, version: null },
        ]
      );
    }),
    readFile: vi.fn(async (path: string) => {
      const content = fileContents[path];
      if (content === undefined) {
        throw new Error(`ENOENT: no such file or directory, open '${path}'`);
      }
      return content;
    }),
    readOatConfig: vi.fn(
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
    validateMatrixCell,
    processEnv: {},
  });

  return {
    capture,
    command,
    checkSkillVersions,
    runPjmDoctorChecks,
    validateMatrixCell,
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

  it('includes PJM doctor checks for project scope when repo reference root exists', async () => {
    const { command, capture } = createHarness({
      oatConfig: { version: 1, tools: { 'project-management': true } },
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

    expect(capture.info[0]).toContain('pjm:canonical_files');
    expect(process.exitCode).toBe(0);
  });

  it('reports PJM disabled without drift when repo reference root exists but pack is not enabled', async () => {
    const { command, capture, runPjmDoctorChecks } = createHarness({
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
          status: 'fail',
          message: 'Missing canonical PJM files.',
        },
      ],
    });

    await runDoctor(command);

    expect(runPjmDoctorChecks).not.toHaveBeenCalled();
    expect(capture.info[0]).toContain('pjm:disabled');
    expect(capture.info[0]).not.toContain('pjm:canonical_files');
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
      'workflow.dispatchCeiling.providers.cursor.balanced=composer-2.5 (shared config)',
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
      'workflow.dispatchCeiling.providers.codex.high[0]=gpt-5.6-terra/xhigh (shared config)',
    );
    expect(validateMatrixCell).toHaveBeenCalledTimes(1);
    expect(validateMatrixCell).toHaveBeenCalledWith(
      'codex',
      'gpt-5.6-terra/xhigh',
      {
        cwd: '/tmp/workspace',
        env: {},
        detailed: true,
        target: {
          harness: 'codex',
          model: 'gpt-5.6-terra',
          effort: 'xhigh',
        },
      },
    );
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

    expect(validateMatrixCell).toHaveBeenCalledWith('codex', 'gpt-5.5/xhigh', {
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
    expect(capture.info[0]).toContain('gpt-5.5/xhigh');
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
      'Unknown dispatch matrix cells: workflow.dispatchCeiling.providers.cursor.high[0].model=missing-model',
    );
    expect(capture.info[0]).toContain(
      'workflow.dispatchCeiling.providers.cursor.high[0].model=missing-model (shared config)',
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
      'Unvalidated dispatch matrix cells: workflow.dispatchCeiling.providers.cursor.high=composer-2.5',
    );
    expect(capture.info[0]).toContain(
      'workflow.dispatchCeiling.providers.cursor.high=composer-2.5 (shared config)',
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
      'workflow.dispatchCeiling.providers.cursor.high=composer-2.5 (local config)',
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
      'Unknown dispatch matrix cells: workflow.dispatchCeiling.providers.cursor.high=missing-model (user config)',
    );
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
    expect(capture.info[0]).toContain('oat providers codex materialize');
    expect(process.exitCode).toBe(1);
  });
});
