import type { CommandContext, GlobalOptions } from '@app/command-context';
import {
  createLoggerCapture,
  type LoggerCapture,
} from '@commands/__tests__/helpers';
import type { Manifest } from '@manifest/index';
import type { Scope } from '@shared/types';
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
}

interface RunDoctorArgs {
  globalArgs?: string[];
}

function defaultManifest(): Manifest {
  return {
    version: 1,
    oatVersion: '0.0.1',
    entries: [],
    lastUpdated: '2026-02-14T00:00:00.000Z',
  };
}

function createHarness(options: HarnessOptions = {}): {
  capture: LoggerCapture;
  command: Command;
  checkSkillVersions: ReturnType<typeof vi.fn>;
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
    resolveAssetsRoot: vi.fn(async () => {
      if (options.resolveAssetsRootThrows) {
        throw new Error('assets unavailable');
      }
      return '/tmp/assets';
    }),
    checkSkillVersions,
  });

  return { capture, command, checkSkillVersions };
}

async function runDoctor(
  command: Command,
  { globalArgs = [] }: RunDoctorArgs = {},
): Promise<void> {
  const program = new Command()
    .name('oat')
    .option('--json')
    .option('--verbose')
    .option('--scope <scope>')
    .option('--cwd <path>')
    .exitOverride();

  program.addCommand(command);
  await program.parseAsync([...globalArgs, 'doctor'], {
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
      },
    });

    await runDoctor(command);

    expect(capture.info[0]).toContain('codex_multi_agent');
    expect(capture.info[0]).toContain('is not true');
    expect(process.exitCode).toBe(1);
  });

  it('warns when codex role config_file points to a missing file', async () => {
    const codexConfigPath = '/tmp/workspace/.codex/config.toml';
    const { command, capture } = createHarness({
      pathExists: {
        [codexConfigPath]: true,
        '/tmp/workspace/.codex/agents/reviewer.toml': false,
      },
      fileContents: {
        [codexConfigPath]: `[features]
multi_agent = true

[agents.reviewer]
config_file = "agents/reviewer.toml"
`,
      },
    });

    await runDoctor(command);

    expect(capture.info[0]).toContain('codex_role_file_refs');
    expect(capture.info[0]).toContain(
      'Missing codex role files: agents/reviewer.toml',
    );
    expect(process.exitCode).toBe(1);
  });
});
