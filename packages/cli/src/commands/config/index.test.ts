import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { CommandContext, GlobalOptions } from '@app/command-context';
import {
  createLoggerCapture,
  type LoggerCapture,
} from '@commands/__tests__/helpers';
import type {
  AvailabilityOracleDependencies,
  MatrixCellAvailability,
  MatrixCellAvailabilityResult,
  ValidateMatrixCellOptions,
} from '@providers/identity/availability';
import {
  createDispatchValidationPassContext,
  type DispatchValidationPassOptions,
} from '@providers/identity/dispatch-validation';
import { Command } from 'commander';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createConfigCommand } from './index';

interface HarnessOptions {
  cwd: string;
  env?: NodeJS.ProcessEnv;
  home?: string;
  validateMatrixCell?: (
    provider: string,
    value: string,
    options: ValidateMatrixCellOptions,
  ) => Promise<MatrixCellAvailability | MatrixCellAvailabilityResult>;
  availabilityDependencies?: Partial<AvailabilityOracleDependencies>;
  assetFiles?: Record<string, string>;
  confirmResponses?: boolean[];
}

function createHarness(options: HarnessOptions): {
  capture: LoggerCapture;
  command: Command;
} {
  const capture = createLoggerCapture();
  const home = options.home ?? '/tmp/home';
  const assetFiles = options.assetFiles ?? {};
  const confirmResponses = [...(options.confirmResponses ?? [])];

  const overrides: Parameters<typeof createConfigCommand>[0] = {
    buildCommandContext: (globalOptions: GlobalOptions): CommandContext => ({
      scope: (globalOptions.scope ?? 'project') as 'project' | 'user' | 'all',
      dryRun: false,
      verbose: globalOptions.verbose ?? false,
      json: globalOptions.json ?? false,
      cwd: globalOptions.cwd ?? options.cwd,
      home,
      interactive: !(globalOptions.json ?? false),
      logger: capture.logger,
    }),
    resolveProjectRoot: vi.fn(async () => options.cwd),
    resolveAssetsRoot: vi.fn(async () => '/tmp/assets'),
    readFile: vi.fn(async (path: string) => {
      const content = assetFiles[path];
      if (content === undefined) {
        throw new Error(`ENOENT: no such file or directory, open '${path}'`);
      }
      return content;
    }),
    confirmAction: vi.fn(async () => confirmResponses.shift() ?? false),
    processEnv: options.env ?? {},
  };
  if (options.validateMatrixCell) {
    overrides.validateMatrixCell = options.validateMatrixCell;
  }
  if (options.availabilityDependencies) {
    overrides.createDispatchValidationPassContext = (
      passOptions: DispatchValidationPassOptions,
    ) =>
      createDispatchValidationPassContext({
        ...passOptions,
        dependencies: options.availabilityDependencies,
      });
  } else if (options.validateMatrixCell) {
    overrides.createDispatchValidationPassContext = (
      passOptions: DispatchValidationPassOptions,
    ) =>
      createDispatchValidationPassContext({
        ...passOptions,
        probeCursorSubagentModel: async (value, probeOptions) => {
          let availability:
            | MatrixCellAvailability
            | MatrixCellAvailabilityResult;
          try {
            availability = await options.validateMatrixCell!('cursor', value, {
              cwd: probeOptions.cwd,
              env: probeOptions.env,
              detailed: true,
            });
          } catch {
            availability = 'unvalidated';
          }
          const result =
            typeof availability === 'string' ? { availability } : availability;
          return {
            ...result,
            decisive: true,
            evidence: 'none',
          };
        },
      });
  }

  const command = createConfigCommand(overrides);

  return { capture, command };
}

async function runCommand(
  command: Command,
  commandArgs: string[],
  globalArgs: string[] = [],
): Promise<void> {
  const program = new Command()
    .name('oat')
    .option('--json')
    .option('--verbose')
    .option('--scope <scope>')
    .option('--cwd <path>')
    .exitOverride();

  program.addCommand(command);
  await program.parseAsync([...globalArgs, 'config', ...commandArgs], {
    from: 'user',
  });
}

describe('oat config', () => {
  const tempDirs: string[] = [];
  let originalExitCode: number | undefined;

  beforeEach(() => {
    originalExitCode = process.exitCode;
    process.exitCode = undefined;
  });

  afterEach(async () => {
    process.exitCode = originalExitCode;
    await Promise.all(
      tempDirs.map(async (dir) => rm(dir, { recursive: true, force: true })),
    );
    tempDirs.length = 0;
  });

  async function createRepoRoot(): Promise<string> {
    const root = await mkdtemp(join(tmpdir(), 'oat-config-command-'));
    tempDirs.push(root);
    await mkdir(join(root, '.oat'), { recursive: true });
    return root;
  }

  it('gets existing local config key values', async () => {
    const root = await createRepoRoot();
    await writeFile(
      join(root, '.oat', 'config.local.json'),
      `${JSON.stringify({ version: 1, activeProject: '.oat/projects/shared/demo' })}\n`,
      'utf8',
    );

    const { command, capture } = createHarness({ cwd: root });
    await runCommand(command, ['get', 'activeProject']);

    expect(capture.info[0]).toBe('.oat/projects/shared/demo');
    expect(process.exitCode).toBe(0);
  });

  it('gets empty string for missing local config values', async () => {
    const root = await createRepoRoot();
    const { command, capture } = createHarness({ cwd: root });

    await runCommand(command, ['get', 'activeProject']);

    expect(capture.info[0]).toBe('');
    expect(process.exitCode).toBe(0);
  });

  it('returns exit code 1 for unknown get keys', async () => {
    const root = await createRepoRoot();
    const { command, capture } = createHarness({ cwd: root });

    await runCommand(command, ['get', 'unknown.key']);

    expect(capture.error[0]).toContain('Unknown config key: unknown.key');
    expect(process.exitCode).toBe(1);
  });

  it('gets projects.root with env override precedence', async () => {
    const root = await createRepoRoot();
    await writeFile(
      join(root, '.oat', 'config.json'),
      `${JSON.stringify({ version: 1, projects: { root: '.oat/projects/from-config' } })}\n`,
      'utf8',
    );

    const { command, capture } = createHarness({
      cwd: root,
      env: { OAT_PROJECTS_ROOT: '.oat/projects/from-env' },
    });
    await runCommand(command, ['get', 'projects.root']);

    expect(capture.info[0]).toBe('.oat/projects/from-env');
    expect(process.exitCode).toBe(0);
  });

  it('sets local config keys in config.local.json', async () => {
    const root = await createRepoRoot();
    const { command } = createHarness({ cwd: root });

    await runCommand(command, [
      'set',
      'activeProject',
      '.oat/projects/shared/demo',
    ]);

    const raw = await readFile(join(root, '.oat', 'config.local.json'), 'utf8');
    expect(JSON.parse(raw)).toEqual({
      version: 1,
      activeProject: '.oat/projects/shared/demo',
    });
    expect(process.exitCode).toBe(0);
  });

  it('sets shared config keys in config.json', async () => {
    const root = await createRepoRoot();
    const { command } = createHarness({ cwd: root });

    await runCommand(command, ['set', 'projects.root', '.oat/projects/custom']);

    const raw = await readFile(join(root, '.oat', 'config.json'), 'utf8');
    expect(JSON.parse(raw)).toEqual({
      version: 1,
      projects: { root: '.oat/projects/custom' },
    });
    expect(process.exitCode).toBe(0);
  });

  it('sets, gets, lists, and describes the user update notification preference', async () => {
    const root = await createRepoRoot();
    const home = await mkdtemp(join(tmpdir(), 'oat-config-home-'));
    tempDirs.push(home);

    const setHarness = createHarness({ cwd: root, home });
    await runCommand(setHarness.command, [
      'set',
      'updateNotifications',
      'false',
      '--user',
    ]);

    const raw = await readFile(join(home, '.oat', 'config.json'), 'utf8');
    expect(JSON.parse(raw)).toEqual({
      version: 1,
      updateNotifications: false,
    });

    const getHarness = createHarness({ cwd: root, home });
    await runCommand(
      getHarness.command,
      ['get', 'updateNotifications'],
      ['--json'],
    );
    expect(getHarness.capture.jsonPayloads[0]).toMatchObject({
      status: 'ok',
      key: 'updateNotifications',
      value: 'false',
      source: 'user',
    });

    const listHarness = createHarness({ cwd: root, home });
    await runCommand(listHarness.command, ['list']);
    expect(listHarness.capture.info[0]).toContain('updateNotifications');
    expect(listHarness.capture.info[0]).toContain('false');
    expect(listHarness.capture.info[0]).toContain('user');

    const describeHarness = createHarness({ cwd: root, home });
    await runCommand(describeHarness.command, [
      'describe',
      'updateNotifications',
    ]);
    expect(describeHarness.capture.info[0]).toContain(
      'Key: updateNotifications',
    );
    expect(describeHarness.capture.info[0]).toContain('Scope: user');
    expect(describeHarness.capture.info[0]).toContain('Type: boolean');
    expect(describeHarness.capture.info[0]).toContain('Default: true');
    expect(describeHarness.capture.info[0]).toContain(
      'Owning command: oat config set updateNotifications false --user',
    );
    expect(process.exitCode).toBe(0);
  });

  it('rejects non-user surfaces for updateNotifications', async () => {
    const root = await createRepoRoot();
    const { command, capture } = createHarness({ cwd: root });

    await runCommand(command, [
      'set',
      'updateNotifications',
      'false',
      '--shared',
    ]);

    expect(capture.error[0]).toContain('updateNotifications');
    expect(capture.error[0]).toContain('user');
    expect(process.exitCode).toBe(1);
  });

  it('gets git.defaultBranch from shared config', async () => {
    const root = await createRepoRoot();
    await writeFile(
      join(root, '.oat', 'config.json'),
      `${JSON.stringify({ version: 1, git: { defaultBranch: 'main' } })}\n`,
      'utf8',
    );

    const { command, capture } = createHarness({ cwd: root });
    await runCommand(command, ['get', 'git.defaultBranch']);

    expect(capture.info[0]).toBe('main');
    expect(process.exitCode).toBe(0);
  });

  it('sets archive.s3Uri in config.json', async () => {
    const root = await createRepoRoot();
    const { command } = createHarness({ cwd: root });

    await runCommand(command, [
      'set',
      'archive.s3Uri',
      's3://example-bucket/oat-archive',
    ]);

    const raw = await readFile(join(root, '.oat', 'config.json'), 'utf8');
    expect(JSON.parse(raw)).toEqual({
      version: 1,
      archive: { s3Uri: 's3://example-bucket/oat-archive' },
    });
    expect(process.exitCode).toBe(0);
  });

  it('sets archive.s3SyncOnComplete to true in config.json', async () => {
    const root = await createRepoRoot();
    const { command } = createHarness({ cwd: root });

    await runCommand(command, ['set', 'archive.s3SyncOnComplete', 'true']);

    const raw = await readFile(join(root, '.oat', 'config.json'), 'utf8');
    expect(JSON.parse(raw)).toEqual({
      version: 1,
      archive: { s3SyncOnComplete: true },
    });
    expect(process.exitCode).toBe(0);
  });

  it('sets archive.summaryExportPath in config.json', async () => {
    const root = await createRepoRoot();
    const { command } = createHarness({ cwd: root });

    await runCommand(command, [
      'set',
      'archive.summaryExportPath',
      '.oat/repo/reference/project-summaries',
    ]);

    const raw = await readFile(join(root, '.oat', 'config.json'), 'utf8');
    expect(JSON.parse(raw)).toEqual({
      version: 1,
      archive: {
        summaryExportPath: '.oat/repo/reference/project-summaries',
      },
    });
    expect(process.exitCode).toBe(0);
  });

  it('gets tools.project-management default false when not set', async () => {
    const root = await createRepoRoot();
    const { command, capture } = createHarness({ cwd: root });

    await runCommand(command, ['get', 'tools.project-management']);

    expect(capture.info[0]).toBe('false');
    expect(process.exitCode).toBe(0);
  });

  it('sets tools.project-management to true in config.json', async () => {
    const root = await createRepoRoot();
    const { command } = createHarness({ cwd: root });

    await runCommand(command, ['set', 'tools.project-management', 'true']);

    const raw = await readFile(join(root, '.oat', 'config.json'), 'utf8');
    expect(JSON.parse(raw)).toEqual({
      version: 1,
      tools: { 'project-management': true },
    });
    expect(process.exitCode).toBe(0);
  });

  it('gets tools.project-management true after setting it', async () => {
    const root = await createRepoRoot();
    await writeFile(
      join(root, '.oat', 'config.json'),
      `${JSON.stringify({ version: 1, tools: { 'project-management': true } })}\n`,
      'utf8',
    );
    const { command, capture } = createHarness({ cwd: root });

    await runCommand(command, ['get', 'tools.project-management']);

    expect(capture.info[0]).toBe('true');
    expect(process.exitCode).toBe(0);
  });

  it('sets tools.project-management to false in config.json', async () => {
    const root = await createRepoRoot();
    await writeFile(
      join(root, '.oat', 'config.json'),
      `${JSON.stringify({ version: 1, tools: { 'project-management': true } })}\n`,
      'utf8',
    );
    const { command } = createHarness({ cwd: root });

    await runCommand(command, ['set', 'tools.project-management', 'false']);

    const raw = await readFile(join(root, '.oat', 'config.json'), 'utf8');
    expect(JSON.parse(raw)).toEqual({
      version: 1,
      tools: { 'project-management': false },
    });
    expect(process.exitCode).toBe(0);
  });

  it('gets tools.brainstorm default false when not set', async () => {
    const root = await createRepoRoot();
    const { command, capture } = createHarness({ cwd: root });

    await runCommand(command, ['get', 'tools.brainstorm']);

    expect(capture.info[0]).toBe('false');
    expect(process.exitCode).toBe(0);
  });

  it('sets tools.brainstorm to true in config.json', async () => {
    const root = await createRepoRoot();
    const { command } = createHarness({ cwd: root });

    await runCommand(command, ['set', 'tools.brainstorm', 'true']);

    const raw = await readFile(join(root, '.oat', 'config.json'), 'utf8');
    expect(JSON.parse(raw)).toEqual({
      version: 1,
      tools: { brainstorm: true },
    });
    expect(process.exitCode).toBe(0);
  });

  it('gets tools.brainstorm true after setting it', async () => {
    const root = await createRepoRoot();
    await writeFile(
      join(root, '.oat', 'config.json'),
      `${JSON.stringify({ version: 1, tools: { brainstorm: true } })}\n`,
      'utf8',
    );
    const { command, capture } = createHarness({ cwd: root });

    await runCommand(command, ['get', 'tools.brainstorm']);

    expect(capture.info[0]).toBe('true');
    expect(process.exitCode).toBe(0);
  });

  it('set creates config.json when missing', async () => {
    const root = await createRepoRoot();
    const { command } = createHarness({ cwd: root });

    await runCommand(command, ['set', 'worktrees.root', '.worktrees/custom']);

    const raw = await readFile(join(root, '.oat', 'config.json'), 'utf8');
    expect(JSON.parse(raw)).toEqual({
      version: 1,
      worktrees: { root: '.worktrees/custom' },
    });
    expect(process.exitCode).toBe(0);
  });

  it('coerces empty string to null for nullable keys', async () => {
    const root = await createRepoRoot();
    await writeFile(
      join(root, '.oat', 'config.local.json'),
      `${JSON.stringify({ version: 1, activeProject: '.oat/projects/shared/demo' })}\n`,
      'utf8',
    );
    const { command } = createHarness({ cwd: root });

    await runCommand(command, ['set', 'activeProject', '']);

    const raw = await readFile(join(root, '.oat', 'config.local.json'), 'utf8');
    expect(JSON.parse(raw)).toEqual({
      version: 1,
      activeProject: null,
    });
    expect(process.exitCode).toBe(0);
  });

  it('list shows merged values with sources', async () => {
    const root = await createRepoRoot();
    await writeFile(
      join(root, '.oat', 'config.json'),
      `${JSON.stringify({ version: 1, worktrees: { root: '.worktrees/from-config' } })}\n`,
      'utf8',
    );
    await writeFile(
      join(root, '.oat', 'config.local.json'),
      `${JSON.stringify({ version: 1, activeProject: '.oat/projects/shared/demo' })}\n`,
      'utf8',
    );
    const { command, capture } = createHarness({ cwd: root });
    await runCommand(command, ['list']);

    expect(capture.info[0]).toContain('activeProject');
    expect(capture.info[0]).toContain('local');
    expect(capture.info[0]).toContain('projects.root');
    expect(capture.info[0]).toContain('.oat/projects/shared');
    expect(capture.info[0]).toContain('worktrees.root');
    expect(capture.info[0]).toContain('shared');
    expect(process.exitCode).toBe(0);
  });

  it('list includes dynamic dispatch matrix provider keys', async () => {
    const root = await createRepoRoot();
    await writeFile(
      join(root, '.oat', 'config.json'),
      `${JSON.stringify({
        version: 1,
        workflow: {
          dispatchCeiling: {
            providers: { cursor: { high: 'composer-2.5' } },
          },
        },
      })}\n`,
      'utf8',
    );

    const { command, capture } = createHarness({ cwd: root });
    await runCommand(command, ['list'], ['--json']);

    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'ok',
      values: expect.arrayContaining([
        {
          key: 'workflow.dispatchCeiling.providers.cursor.high',
          value: '{"candidates":["composer-2.5"]}',
          source: 'shared',
        },
      ]),
    });
    expect(process.exitCode).toBe(0);
  });

  it('supports json mode for get, set, and list', async () => {
    const root = await createRepoRoot();

    const getHarness = createHarness({ cwd: root });
    await runCommand(getHarness.command, ['get', 'activeProject'], ['--json']);
    expect(getHarness.capture.jsonPayloads[0]).toMatchObject({
      status: 'ok',
      key: 'activeProject',
      value: null,
    });
    expect(process.exitCode).toBe(0);

    const setHarness = createHarness({ cwd: root });
    await runCommand(
      setHarness.command,
      ['set', 'projects.root', '.oat/projects/custom'],
      ['--json'],
    );
    expect(setHarness.capture.jsonPayloads[0]).toMatchObject({
      status: 'ok',
      key: 'projects.root',
      value: '.oat/projects/custom',
      source: 'shared',
    });
    expect(process.exitCode).toBe(0);

    const listHarness = createHarness({ cwd: root });
    await runCommand(listHarness.command, ['list'], ['--json']);
    expect(listHarness.capture.jsonPayloads[0]).toMatchObject({
      status: 'ok',
      values: expect.any(Array),
    });
    expect(process.exitCode).toBe(0);
  });

  it('describe without a key prints the grouped config catalog', async () => {
    const root = await createRepoRoot();
    const { command, capture } = createHarness({ cwd: root });

    await runCommand(command, ['describe']);

    expect(capture.info[0]).toContain('Shared Repo (.oat/config.json)');
    expect(capture.info[0]).toContain('archive.s3Uri');
    expect(capture.info[0]).toContain('Repo Local (.oat/config.local.json)');
    expect(capture.info[0]).toContain('User (~/.oat/config.json)');
    expect(capture.info[0]).toContain('Sync/Provider (.oat/sync/config.json)');
    expect(capture.info[0]).toContain('User Sync (~/.oat/sync/config.json)');
    expect(capture.info[0]).toContain('sync.knownStrays');
    expect(capture.info[0]).toContain('sync.providers.<name>.enabled');
    expect(process.exitCode).toBe(0);
  });

  it('describe with a key prints detailed metadata', async () => {
    const root = await createRepoRoot();
    const { command, capture } = createHarness({ cwd: root });

    await runCommand(command, ['describe', 'archive.s3Uri']);

    expect(capture.info[0]).toContain('Key: archive.s3Uri');
    expect(capture.info[0]).toContain('Scope: shared repo');
    expect(capture.info[0]).toContain('File: .oat/config.json');
    expect(capture.info[0]).toContain('Type: string');
    expect(capture.info[0]).toContain('Default: unset');
    expect(capture.info[0]).toContain(
      'Owning command: oat config set archive.s3Uri <value>',
    );
    expect(process.exitCode).toBe(0);
  });

  it('describe supports json mode', async () => {
    const root = await createRepoRoot();
    const { command, capture } = createHarness({ cwd: root });

    await runCommand(command, ['describe', 'archive.s3Uri'], ['--json']);

    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'ok',
      key: 'archive.s3Uri',
      entries: [
        expect.objectContaining({
          key: 'archive.s3Uri',
          file: '.oat/config.json',
          scope: 'shared repo',
        }),
      ],
    });
    expect(process.exitCode).toBe(0);
  });

  it('lists and describes all twelve explainer configuration keys', async () => {
    const root = await createRepoRoot();
    const expectedKeys = [
      'explainers.defaults.style',
      'explainers.defaults.palette',
      'explainers.defaults.visualProfile',
      'explainers.defaults.themeBundlePath',
      'explainers.publish.provider',
      'explainers.publish.s3Uri',
      'explainers.publish.publicBaseUrl',
      'explainers.publish.awsRegion',
      'explainers.publish.publicAccess',
      'explainers.publish.awsProfile',
      'workflow.explainers.projectExplainer',
      'workflow.explainers.projectRecap',
    ];

    const listHarness = createHarness({ cwd: root });
    await runCommand(listHarness.command, ['list']);
    for (const key of expectedKeys) {
      expect(listHarness.capture.info[0], key).toContain(key);
    }

    for (const key of expectedKeys) {
      const describeHarness = createHarness({ cwd: root });
      await runCommand(describeHarness.command, ['describe', key], ['--json']);
      expect(describeHarness.capture.jsonPayloads[0]).toMatchObject({
        status: 'ok',
        key,
        entries: [expect.objectContaining({ key })],
      });
    }
  });

  it('sets typed explainer values on their allowed surfaces', async () => {
    const root = await createRepoRoot();
    const home = await mkdtemp(join(tmpdir(), 'oat-config-home-'));
    tempDirs.push(home);
    const cases = [
      ['explainers.defaults.style', 'clean-neutral', '--local'],
      ['explainers.defaults.palette', 'ocean', '--user'],
      ['explainers.defaults.visualProfile', 'technical', '--local'],
      ['explainers.defaults.themeBundlePath', 'themes/shared.json', '--shared'],
      ['explainers.publish.provider', 's3-static', '--shared'],
      ['explainers.publish.s3Uri', 's3://bucket/explainers/', '--shared'],
      [
        'explainers.publish.publicBaseUrl',
        'https://docs.example.com/explainers/',
        '--shared',
      ],
      ['explainers.publish.awsRegion', 'us-east-1', '--shared'],
      ['explainers.publish.publicAccess', 'protected', '--shared'],
      ['explainers.publish.awsProfile', 'work-sso', '--user'],
      ['workflow.explainers.projectExplainer', 'always', '--local'],
      ['workflow.explainers.projectRecap', 'never', '--shared'],
    ] as const;

    for (const [key, value, scope] of cases) {
      const harness = createHarness({ cwd: root, home });
      await runCommand(harness.command, ['set', key, value, scope]);
      expect(harness.capture.error, key).toEqual([]);
      expect(process.exitCode, key).toBe(0);
    }

    const shared = JSON.parse(
      await readFile(join(root, '.oat', 'config.json'), 'utf8'),
    );
    expect(shared).toMatchObject({
      explainers: {
        defaults: { themeBundlePath: 'themes/shared.json' },
        publish: {
          provider: 's3-static',
          s3Uri: 's3://bucket/explainers',
          publicBaseUrl: 'https://docs.example.com/explainers',
          awsRegion: 'us-east-1',
          publicAccess: 'protected',
        },
      },
      workflow: { explainers: { projectRecap: 'never' } },
    });
  });

  it.each([
    'clean-neutral',
    'business-corporate',
    'navy-ocean',
    'dark-edgy',
  ] as const)('accepts curated explainer style %s', async (style) => {
    const root = await createRepoRoot();
    const { command, capture } = createHarness({ cwd: root });

    await runCommand(command, [
      'set',
      'explainers.defaults.style',
      style,
      '--local',
    ]);

    expect(capture.error).toEqual([]);
    expect(process.exitCode).toBe(0);
    expect(
      JSON.parse(
        await readFile(join(root, '.oat', 'config.local.json'), 'utf8'),
      ),
    ).toMatchObject({ explainers: { defaults: { style } } });
  });

  it('sets and gets curated explainer styles at local, shared, and user scopes', async () => {
    const root = await createRepoRoot();
    const home = await mkdtemp(join(tmpdir(), 'oat-config-home-'));
    tempDirs.push(home);

    for (const [style, scope] of [
      ['business-corporate', '--user'],
      ['navy-ocean', '--shared'],
      ['dark-edgy', '--local'],
    ] as const) {
      const setHarness = createHarness({ cwd: root, home });
      await runCommand(setHarness.command, [
        'set',
        'explainers.defaults.style',
        style,
        scope,
      ]);
      expect(setHarness.capture.error, scope).toEqual([]);
      expect(process.exitCode, scope).toBe(0);
    }

    const getHarness = createHarness({ cwd: root, home });
    await runCommand(
      getHarness.command,
      ['get', 'explainers.defaults.style'],
      ['--json'],
    );
    expect(getHarness.capture.jsonPayloads[0]).toMatchObject({
      status: 'ok',
      key: 'explainers.defaults.style',
      value: 'dark-edgy',
      source: 'local',
    });
  });

  it('describes curated style as the default front door and legacy selections as nullable deprecated compatibility', async () => {
    const root = await createRepoRoot();

    const styleHarness = createHarness({ cwd: root });
    await runCommand(
      styleHarness.command,
      ['describe', 'explainers.defaults.style'],
      ['--json'],
    );
    expect(styleHarness.capture.jsonPayloads[0]).toMatchObject({
      status: 'ok',
      entries: [
        expect.objectContaining({
          key: 'explainers.defaults.style',
          defaultValue: 'clean-neutral',
          type: 'clean-neutral | business-corporate | navy-ocean | dark-edgy',
        }),
      ],
    });

    for (const key of [
      'explainers.defaults.palette',
      'explainers.defaults.visualProfile',
    ] as const) {
      const legacyHarness = createHarness({ cwd: root });
      await runCommand(legacyHarness.command, ['describe', key], ['--json']);
      expect(legacyHarness.capture.jsonPayloads[0]).toMatchObject({
        status: 'ok',
        entries: [
          expect.objectContaining({
            key,
            defaultValue: 'null',
            description: expect.stringMatching(/deprecated/i),
          }),
        ],
      });
    }
  });

  it.each([
    ['explainers.defaults.style', 'not-curated', '--local'],
    ['explainers.defaults.themeBundlePath', '/absolute/theme.json', '--shared'],
    ['explainers.defaults.themeBundlePath', 'themes/user.json', '--user'],
    ['explainers.publish.provider', 's3-static', '--local'],
    ['explainers.publish.s3Uri', 'https://not-s3.example.com', '--shared'],
    [
      'explainers.publish.publicBaseUrl',
      'http://insecure.example.com',
      '--shared',
    ],
    ['explainers.publish.publicAccess', 'private', '--shared'],
    ['explainers.publish.awsProfile', 'shared-profile', '--shared'],
    ['workflow.explainers.projectExplainer', 'sometimes', '--local'],
  ] as const)(
    'rejects invalid explainer key value or surface: %s %s %s',
    async (key, value, scope) => {
      const root = await createRepoRoot();
      const { command, capture } = createHarness({ cwd: root });
      await runCommand(command, ['set', key, value, scope]);
      expect(capture.error[0]).toBeDefined();
      expect(process.exitCode).toBe(1);
    },
  );

  it('describe resolves wildcard provider keys from concrete names', async () => {
    const root = await createRepoRoot();
    const { command, capture } = createHarness({ cwd: root });

    await runCommand(command, ['describe', 'sync.providers.github.enabled']);

    expect(capture.info[0]).toContain('Key: sync.providers.<name>.enabled');
    expect(capture.info[0]).toContain('File: .oat/sync/config.json');
    expect(capture.info[0]).toContain('Owning command: oat providers set');
    expect(process.exitCode).toBe(0);
  });

  it('describe shows project and user ownership for sync known strays', async () => {
    const root = await createRepoRoot();
    const { command, capture } = createHarness({ cwd: root });

    await runCommand(command, ['describe', 'sync.knownStrays']);

    expect(capture.info[0]).toContain('File: .oat/sync/config.json');
    expect(capture.info[0]).toContain('Scope: project sync');
    expect(capture.info[0]).toContain('File: ~/.oat/sync/config.json');
    expect(capture.info[0]).toContain('Scope: user sync');
    expect(process.exitCode).toBe(0);
  });

  it('describe returns exit code 1 for unknown keys', async () => {
    const root = await createRepoRoot();
    const { command, capture } = createHarness({ cwd: root });

    await runCommand(command, ['describe', 'missing.key']);

    expect(capture.error[0]).toContain('Unknown config key: missing.key');
    expect(process.exitCode).toBe(1);
  });

  it('gets autoReviewAtCheckpoints default false when not set', async () => {
    const root = await createRepoRoot();
    const { command, capture } = createHarness({ cwd: root });

    await runCommand(command, ['get', 'autoReviewAtCheckpoints']);

    expect(capture.info[0]).toBe('false');
    expect(process.exitCode).toBe(0);
  });

  it('sets autoReviewAtCheckpoints to true in config.json', async () => {
    const root = await createRepoRoot();
    const { command } = createHarness({ cwd: root });

    await runCommand(command, ['set', 'autoReviewAtCheckpoints', 'true']);

    const raw = await readFile(join(root, '.oat', 'config.json'), 'utf8');
    const config = JSON.parse(raw);
    expect(config.autoReviewAtCheckpoints).toBe(true);
    expect(process.exitCode).toBe(0);
  });

  describe('workflow preference surface flags', () => {
    async function createHome(): Promise<string> {
      const home = await mkdtemp(join(tmpdir(), 'oat-config-home-'));
      tempDirs.push(home);
      return home;
    }

    it('set workflow.archiveOnComplete without flag writes to config.local.json', async () => {
      const root = await createRepoRoot();
      const home = await createHome();
      const { command } = createHarness({ cwd: root, home });

      await runCommand(command, ['set', 'workflow.archiveOnComplete', 'true']);

      const raw = await readFile(
        join(root, '.oat', 'config.local.json'),
        'utf8',
      );
      expect(JSON.parse(raw)).toMatchObject({
        version: 1,
        workflow: { archiveOnComplete: true },
      });
      expect(process.exitCode).toBe(0);
    });

    it('set workflow.archiveOnComplete --shared writes to config.json', async () => {
      const root = await createRepoRoot();
      const home = await createHome();
      const { command } = createHarness({ cwd: root, home });

      await runCommand(command, [
        'set',
        'workflow.archiveOnComplete',
        'true',
        '--shared',
      ]);

      const raw = await readFile(join(root, '.oat', 'config.json'), 'utf8');
      expect(JSON.parse(raw)).toMatchObject({
        version: 1,
        workflow: { archiveOnComplete: true },
      });
      // Should NOT write to local
      await expect(
        readFile(join(root, '.oat', 'config.local.json'), 'utf8'),
      ).rejects.toThrow();
      expect(process.exitCode).toBe(0);
    });

    it('set workflow.archiveOnComplete --user writes to ~/.oat/config.json', async () => {
      const root = await createRepoRoot();
      const home = await createHome();
      const { command } = createHarness({ cwd: root, home });

      await runCommand(command, [
        'set',
        'workflow.archiveOnComplete',
        'true',
        '--user',
      ]);

      const raw = await readFile(join(home, '.oat', 'config.json'), 'utf8');
      expect(JSON.parse(raw)).toMatchObject({
        version: 1,
        workflow: { archiveOnComplete: true },
      });
      expect(process.exitCode).toBe(0);
    });

    it('set workflow.hillCheckpointDefault validates enum', async () => {
      const root = await createRepoRoot();
      const home = await createHome();
      const { command } = createHarness({ cwd: root, home });

      await runCommand(command, [
        'set',
        'workflow.hillCheckpointDefault',
        'final',
      ]);
      expect(process.exitCode).toBe(0);

      const raw = await readFile(
        join(root, '.oat', 'config.local.json'),
        'utf8',
      );
      expect(JSON.parse(raw)).toMatchObject({
        workflow: { hillCheckpointDefault: 'final' },
      });
    });

    it('set workflow.hillCheckpointDefault rejects invalid enum value', async () => {
      const root = await createRepoRoot();
      const home = await createHome();
      const { command, capture } = createHarness({ cwd: root, home });

      await runCommand(command, [
        'set',
        'workflow.hillCheckpointDefault',
        'invalid-value',
      ]);

      expect(process.exitCode).toBe(1);
      expect(capture.error[0]).toContain('workflow.hillCheckpointDefault');
    });

    it('set projects.root --user is rejected as invalid surface', async () => {
      const root = await createRepoRoot();
      const home = await createHome();
      const { command, capture } = createHarness({ cwd: root, home });

      await runCommand(command, [
        'set',
        'projects.root',
        '.oat/custom',
        '--user',
      ]);

      expect(process.exitCode).toBe(1);
      expect(capture.error[0]).toContain('projects.root');
      expect(capture.error[0]).toContain('user');
    });

    it('set activeProject --shared is rejected as invalid surface', async () => {
      const root = await createRepoRoot();
      const home = await createHome();
      const { command, capture } = createHarness({ cwd: root, home });

      await runCommand(command, [
        'set',
        'activeProject',
        '.oat/projects/shared/demo',
        '--shared',
      ]);

      expect(process.exitCode).toBe(1);
      expect(capture.error[0]).toContain('activeProject');
      expect(capture.error[0]).toContain('shared');
    });

    it('set workflow.archiveOnComplete --shared --user rejects mutually exclusive flags', async () => {
      const root = await createRepoRoot();
      const home = await createHome();
      const { command, capture } = createHarness({ cwd: root, home });

      await runCommand(command, [
        'set',
        'workflow.archiveOnComplete',
        'true',
        '--shared',
        '--user',
      ]);

      expect(process.exitCode).toBe(1);
      expect(capture.error[0]).toContain('mutually exclusive');
    });

    it('set activeIdea --user writes to ~/.oat/config.json', async () => {
      const root = await createRepoRoot();
      const home = await createHome();
      const { command } = createHarness({ cwd: root, home });

      await runCommand(command, [
        'set',
        'activeIdea',
        '.oat/ideas/my-idea',
        '--user',
      ]);

      expect(process.exitCode).toBe(0);
      const raw = await readFile(join(home, '.oat', 'config.json'), 'utf8');
      expect(JSON.parse(raw)).toMatchObject({
        version: 1,
        activeIdea: '.oat/ideas/my-idea',
      });
      // Should NOT write to local
      await expect(
        readFile(join(root, '.oat', 'config.local.json'), 'utf8'),
      ).rejects.toThrow();
    });

    it('set activeIdea --local writes to .oat/config.local.json', async () => {
      const root = await createRepoRoot();
      const home = await createHome();
      const { command } = createHarness({ cwd: root, home });

      await runCommand(command, [
        'set',
        'activeIdea',
        '.oat/ideas/repo-idea',
        '--local',
      ]);

      expect(process.exitCode).toBe(0);
      const raw = await readFile(
        join(root, '.oat', 'config.local.json'),
        'utf8',
      );
      expect(JSON.parse(raw)).toMatchObject({
        version: 1,
        activeIdea: '.oat/ideas/repo-idea',
      });
    });

    it('set activeIdea --shared is rejected (no shared surface for activeIdea)', async () => {
      const root = await createRepoRoot();
      const home = await createHome();
      const { command, capture } = createHarness({ cwd: root, home });

      await runCommand(command, [
        'set',
        'activeIdea',
        '.oat/ideas/some-idea',
        '--shared',
      ]);

      expect(process.exitCode).toBe(1);
      expect(capture.error[0]).toContain('activeIdea');
      expect(capture.error[0]).toContain('shared');
    });

    it('set activeProject --user is still rejected (no user surface for activeProject)', async () => {
      const root = await createRepoRoot();
      const home = await createHome();
      const { command, capture } = createHarness({ cwd: root, home });

      await runCommand(command, [
        'set',
        'activeProject',
        '.oat/projects/shared/demo',
        '--user',
      ]);

      expect(process.exitCode).toBe(1);
      expect(capture.error[0]).toContain('activeProject');
      expect(capture.error[0]).toContain('user');
    });

    it('get activeIdea resolves from user when only set there', async () => {
      const root = await createRepoRoot();
      const home = await createHome();
      const { command } = createHarness({ cwd: root, home });

      await runCommand(command, [
        'set',
        'activeIdea',
        '.oat/ideas/user-idea',
        '--user',
      ]);

      const { command: getCmd, capture: getCap } = createHarness({
        cwd: root,
        home,
      });
      await runCommand(getCmd, ['get', 'activeIdea'], ['--json']);
      expect(getCap.jsonPayloads[0]).toMatchObject({
        status: 'ok',
        key: 'activeIdea',
        value: '.oat/ideas/user-idea',
        source: 'user',
      });
    });

    it('set workflow.postImplementSequence validates enum', async () => {
      const root = await createRepoRoot();
      const home = await createHome();
      const { command, capture } = createHarness({ cwd: root, home });

      await runCommand(command, [
        'set',
        'workflow.postImplementSequence',
        'not-a-value',
      ]);

      expect(process.exitCode).toBe(1);
      expect(capture.error[0]).toContain('workflow.postImplementSequence');

      // Valid value succeeds
      const { command: command2 } = createHarness({ cwd: root, home });
      await runCommand(command2, [
        'set',
        'workflow.postImplementSequence',
        'docs-pr',
      ]);
      expect(process.exitCode).toBe(0);
    });

    it('sets and gets a structured workflow.postImplementSequence', async () => {
      const root = await createRepoRoot();
      const sequence = {
        preApproval: ['summary'],
        postApproval: ['document', 'pr'],
      };
      const { command } = createHarness({ cwd: root });

      await runCommand(command, [
        'set',
        'workflow.postImplementSequence',
        JSON.stringify(sequence),
      ]);

      const raw = await readFile(
        join(root, '.oat', 'config.local.json'),
        'utf8',
      );
      expect(JSON.parse(raw).workflow.postImplementSequence).toEqual(sequence);

      const plainHarness = createHarness({ cwd: root });
      await runCommand(plainHarness.command, [
        'get',
        'workflow.postImplementSequence',
      ]);
      expect(plainHarness.capture.info[0]).toBe(JSON.stringify(sequence));

      const jsonHarness = createHarness({ cwd: root });
      await runCommand(
        jsonHarness.command,
        ['get', 'workflow.postImplementSequence'],
        ['--json'],
      );
      expect(jsonHarness.capture.jsonPayloads[0]).toMatchObject({
        status: 'ok',
        key: 'workflow.postImplementSequence',
        value: sequence,
        source: 'local',
      });
    });

    it.each([
      '{not-json',
      JSON.stringify({ preApproval: ['summary'], postApproval: ['summary'] }),
      JSON.stringify({ preApproval: ['unknown'], postApproval: [] }),
    ])(
      'does not write invalid structured workflow.postImplementSequence input: %s',
      async (value) => {
        const root = await createRepoRoot();
        const { command, capture } = createHarness({ cwd: root });

        await runCommand(command, [
          'set',
          'workflow.postImplementSequence',
          value,
        ]);

        expect(process.exitCode).toBe(1);
        expect(capture.error[0]).toContain('workflow.postImplementSequence');
        await expect(
          readFile(join(root, '.oat', 'config.local.json'), 'utf8'),
        ).rejects.toThrow();
      },
    );

    it('get workflow.archiveOnComplete resolves from user when only set at user level', async () => {
      const root = await createRepoRoot();
      const home = await createHome();
      const { command } = createHarness({ cwd: root, home });

      // Set at user level
      await runCommand(command, [
        'set',
        'workflow.archiveOnComplete',
        'true',
        '--user',
      ]);

      // Get resolves from user
      const { command: getCmd, capture: getCap } = createHarness({
        cwd: root,
        home,
      });
      await runCommand(
        getCmd,
        ['get', 'workflow.archiveOnComplete'],
        ['--json'],
      );
      expect(getCap.jsonPayloads[0]).toMatchObject({
        status: 'ok',
        key: 'workflow.archiveOnComplete',
        value: 'true',
        source: 'user',
      });
    });

    it('sets workflow.autoReviewAtHillCheckpoints at user level', async () => {
      const root = await createRepoRoot();
      const home = await createHome();
      const { command } = createHarness({ cwd: root, home });

      await runCommand(command, [
        'set',
        'workflow.autoReviewAtHillCheckpoints',
        'true',
        '--user',
      ]);

      const raw = await readFile(join(home, '.oat', 'config.json'), 'utf8');
      expect(JSON.parse(raw)).toMatchObject({
        version: 1,
        workflow: { autoReviewAtHillCheckpoints: true },
      });

      const { command: getCmd, capture: getCap } = createHarness({
        cwd: root,
        home,
      });
      await runCommand(
        getCmd,
        ['get', 'workflow.autoReviewAtHillCheckpoints'],
        ['--json'],
      );
      expect(getCap.jsonPayloads[0]).toMatchObject({
        status: 'ok',
        key: 'workflow.autoReviewAtHillCheckpoints',
        value: 'true',
        source: 'user',
      });
    });

    it('sets workflow.autoArtifactReview.plan and resolves it via get', async () => {
      const root = await createRepoRoot();
      const home = await createHome();
      const { command } = createHarness({ cwd: root, home });

      await runCommand(command, [
        'set',
        'workflow.autoArtifactReview.plan',
        'false',
        '--shared',
      ]);

      const raw = await readFile(join(root, '.oat', 'config.json'), 'utf8');
      expect(JSON.parse(raw)).toMatchObject({
        version: 1,
        workflow: { autoArtifactReview: { plan: false } },
      });

      const { command: getCmd, capture: getCap } = createHarness({
        cwd: root,
        home,
      });
      await runCommand(
        getCmd,
        ['get', 'workflow.autoArtifactReview.plan'],
        ['--json'],
      );
      expect(getCap.jsonPayloads[0]).toMatchObject({
        status: 'ok',
        key: 'workflow.autoArtifactReview.plan',
        value: 'false',
        source: 'shared',
      });
    });

    it('sets, gets, and lists project-log workflow keys', async () => {
      const root = await createRepoRoot();
      const projectLogHarness = createHarness({ cwd: root });
      await runCommand(projectLogHarness.command, [
        'set',
        'workflow.projectLog',
        'true',
        '--shared',
      ]);
      expect(process.exitCode).toBe(0);

      const ledgerHarness = createHarness({ cwd: root });
      await runCommand(ledgerHarness.command, [
        'set',
        'workflow.projectLogLedgerPath',
        '.oat/custom/observations.md',
        '--shared',
      ]);
      expect(process.exitCode).toBe(0);

      const raw = JSON.parse(
        await readFile(join(root, '.oat', 'config.json'), 'utf8'),
      );
      expect(raw.workflow).toMatchObject({
        projectLog: true,
        projectLogLedgerPath: '.oat/custom/observations.md',
      });

      const getHarness = createHarness({ cwd: root });
      await runCommand(
        getHarness.command,
        ['get', 'workflow.projectLog'],
        ['--json'],
      );
      expect(getHarness.capture.jsonPayloads[0]).toMatchObject({
        status: 'ok',
        key: 'workflow.projectLog',
        value: 'true',
        source: 'shared',
      });

      const listHarness = createHarness({ cwd: root });
      await runCommand(listHarness.command, ['list']);
      expect(listHarness.capture.info[0]).toContain('workflow.projectLog');
      expect(listHarness.capture.info[0]).toContain(
        'workflow.projectLogLedgerPath',
      );
    });

    it('sets, gets, lists, and describes every workflow.retro key', async () => {
      const root = await createRepoRoot();
      const home = await createHome();
      const entries = [
        ['workflow.retro.filing.repo', 'backlog'],
        ['workflow.retro.filing.upstream', 'issues'],
        ['workflow.retro.apply', 'auto'],
        ['workflow.retro.upstreamRepo', 'voxmedia/open-agent-toolkit'],
      ] as const;

      for (const [key, value] of entries) {
        const setHarness = createHarness({ cwd: root, home });
        await runCommand(setHarness.command, ['set', key, value]);
        expect(process.exitCode).toBe(0);

        const getHarness = createHarness({ cwd: root, home });
        await runCommand(getHarness.command, ['get', key], ['--json']);
        expect(getHarness.capture.jsonPayloads[0]).toMatchObject({
          status: 'ok',
          key,
          value,
          source: 'local',
        });

        const describeHarness = createHarness({ cwd: root, home });
        await runCommand(describeHarness.command, ['describe', key]);
        expect(describeHarness.capture.info[0]).toContain(`Key: ${key}`);
      }

      const listHarness = createHarness({ cwd: root, home });
      await runCommand(listHarness.command, ['list']);
      for (const [key] of entries) {
        expect(listHarness.capture.info[0]).toContain(key);
      }

      const config = JSON.parse(
        await readFile(join(root, '.oat', 'config.local.json'), 'utf8'),
      );
      expect(config.workflow.retro).toEqual({
        filing: { repo: 'backlog', upstream: 'issues' },
        apply: 'auto',
        upstreamRepo: 'voxmedia/open-agent-toolkit',
      });
    });

    it.each([
      ['local', '--local', '.oat/config.local.json'],
      ['shared', '--shared', '.oat/config.json'],
      ['user', '--user', '.oat-user/config.json'],
    ] as const)(
      'preserves workflow.retro siblings when writing at %s scope',
      async (scope, flag, relativePath) => {
        const root = await createRepoRoot();
        const home = await createHome();
        const base =
          scope === 'user'
            ? join(home, '.oat')
            : scope === 'shared'
              ? join(root, '.oat')
              : join(root, '.oat');
        const path =
          scope === 'user'
            ? join(base, 'config.json')
            : join(base, relativePath.split('/').at(-1)!);
        await mkdir(base, { recursive: true });
        await writeFile(
          path,
          `${JSON.stringify({
            version: 1,
            workflow: {
              retro: {
                filing: { upstream: 'issues' },
                upstreamRepo: 'existing/toolkit',
              },
            },
          })}\n`,
          'utf8',
        );

        const harness = createHarness({ cwd: root, home });
        await runCommand(harness.command, [
          'set',
          'workflow.retro.filing.repo',
          'backlog',
          flag,
        ]);

        expect(process.exitCode).toBe(0);
        expect(JSON.parse(await readFile(path, 'utf8')).workflow.retro).toEqual(
          {
            filing: { repo: 'backlog', upstream: 'issues' },
            upstreamRepo: 'existing/toolkit',
          },
        );
      },
    );

    it.each([
      ['workflow.retro.filing.repo', 'project', 'issues | backlog | none'],
      ['workflow.retro.filing.upstream', 'backlog', 'issues | none'],
      ['workflow.retro.apply', 'always', 'auto | ask'],
      ['workflow.retro.upstreamRepo', 'not-a-repo', 'owner/name'],
    ] as const)(
      'rejects invalid %s value with an actionable error',
      async (key, value, expected) => {
        const root = await createRepoRoot();
        const harness = createHarness({ cwd: root });
        await runCommand(harness.command, ['set', key, value]);

        expect(process.exitCode).toBe(1);
        expect(harness.capture.error[0]).toContain(key);
        expect(harness.capture.error[0]).toContain(expected);
      },
    );

    it('rejects invalid workflow.projectLog values', async () => {
      const root = await createRepoRoot();
      const { command, capture } = createHarness({ cwd: root });

      await runCommand(command, ['set', 'workflow.projectLog', 'sometimes']);

      expect(process.exitCode).toBe(1);
      expect(capture.error[0]).toContain('true | false | auto');
    });

    it('gets default-on workflow.autoArtifactReview.analysis when unset', async () => {
      const root = await createRepoRoot();
      const home = await createHome();
      const { command, capture } = createHarness({ cwd: root, home });

      await runCommand(
        command,
        ['get', 'workflow.autoArtifactReview.analysis'],
        ['--json'],
      );

      expect(capture.jsonPayloads[0]).toMatchObject({
        status: 'ok',
        key: 'workflow.autoArtifactReview.analysis',
        value: 'true',
        source: 'default',
      });
    });

    it('sets and gets bounded workflow gate timeout keys', async () => {
      const root = await createRepoRoot();
      const home = await createHome();
      const setHarness = createHarness({ cwd: root, home });
      await runCommand(setHarness.command, [
        'set',
        'workflow.gateTimeouts.code',
        '1800000',
        '--shared',
      ]);

      const getHarness = createHarness({ cwd: root, home });
      await runCommand(
        getHarness.command,
        ['get', 'workflow.gateTimeouts.code'],
        ['--json'],
      );
      expect(getHarness.capture.jsonPayloads[0]).toMatchObject({
        status: 'ok',
        value: '1800000',
        source: 'shared',
      });

      const invalidHarness = createHarness({ cwd: root, home });
      await runCommand(invalidHarness.command, [
        'set',
        'workflow.gateTimeouts.artifact',
        '999',
      ]);
      expect(invalidHarness.capture.error[0]).toContain(
        'integer between 1000 and 14400000',
      );
    });

    it('sets workflow.dispatchCeiling.providers.codex at shared level (legacy key updated)', async () => {
      const root = await createRepoRoot();
      const home = await createHome();
      const { command } = createHarness({ cwd: root, home });

      await runCommand(command, [
        'set',
        'workflow.dispatchCeiling.providers.codex',
        'high',
        '--shared',
      ]);

      const raw = await readFile(join(root, '.oat', 'config.json'), 'utf8');
      expect(JSON.parse(raw)).toMatchObject({
        version: 1,
        workflow: { dispatchCeiling: { providers: { codex: 'high' } } },
      });

      const { command: getCmd, capture: getCap } = createHarness({
        cwd: root,
        home,
      });
      await runCommand(
        getCmd,
        ['get', 'workflow.dispatchCeiling.providers.codex'],
        ['--json'],
      );
      expect(getCap.jsonPayloads[0]).toMatchObject({
        status: 'ok',
        key: 'workflow.dispatchCeiling.providers.codex',
        value: 'high',
        source: 'shared',
      });
    });

    it('gets effective dispatch ladder aggregates and reports absent ladders clearly', async () => {
      const root = await createRepoRoot();
      const home = await createHome();
      await writeFile(
        join(root, '.oat', 'config.json'),
        `${JSON.stringify({
          version: 1,
          workflow: {
            dispatchCeiling: {
              providers: {
                cursor: {
                  high: { candidates: ['shared-high'] },
                  frontier: { candidates: ['shared-frontier'] },
                },
              },
            },
          },
        })}\n`,
        'utf8',
      );
      await writeFile(
        join(root, '.oat', 'config.local.json'),
        `${JSON.stringify({
          version: 1,
          workflow: {
            dispatchCeiling: {
              providers: {
                cursor: { high: { candidates: ['local-high'] } },
              },
            },
          },
        })}\n`,
        'utf8',
      );

      const providersHarness = createHarness({ cwd: root, home });
      await runCommand(
        providersHarness.command,
        ['get', 'workflow.dispatchCeiling.providers'],
        ['--json'],
      );
      expect(providersHarness.capture.jsonPayloads[0]).toMatchObject({
        status: 'ok',
        key: 'workflow.dispatchCeiling.providers',
        value: {
          cursor: {
            high: { candidates: ['local-high'] },
            frontier: { candidates: ['shared-frontier'] },
          },
        },
        source: 'local',
      });

      const providerHarness = createHarness({ cwd: root, home });
      await runCommand(
        providerHarness.command,
        ['get', 'workflow.dispatchCeiling.providers.cursor'],
        ['--json'],
      );
      expect(providerHarness.capture.jsonPayloads[0]).toMatchObject({
        status: 'ok',
        value: {
          high: { candidates: ['local-high'] },
          frontier: { candidates: ['shared-frontier'] },
        },
        source: 'local',
      });

      const absentHarness = createHarness({ cwd: root, home });
      await runCommand(
        absentHarness.command,
        ['get', 'workflow.dispatchCeiling.providers.claude'],
        ['--json'],
      );
      expect(absentHarness.capture.jsonPayloads[0]).toMatchObject({
        status: 'ok',
        value: null,
        source: 'default',
      });
    });

    it('sets workflow.dispatchCeiling.providers.claude at local level by default (legacy key updated)', async () => {
      const root = await createRepoRoot();
      const { command } = createHarness({ cwd: root });

      await runCommand(command, [
        'set',
        'workflow.dispatchCeiling.providers.claude',
        'sonnet',
      ]);

      const raw = await readFile(
        join(root, '.oat', 'config.local.json'),
        'utf8',
      );
      expect(JSON.parse(raw)).toMatchObject({
        version: 1,
        workflow: { dispatchCeiling: { providers: { claude: 'sonnet' } } },
      });
    });

    it('sets workflow.dispatchCeiling.providers.claude to fable for frontier compatibility', async () => {
      const root = await createRepoRoot();
      const { command } = createHarness({ cwd: root });

      await runCommand(command, [
        'set',
        'workflow.dispatchCeiling.providers.claude',
        'fable',
      ]);

      const raw = await readFile(
        join(root, '.oat', 'config.local.json'),
        'utf8',
      );
      expect(JSON.parse(raw)).toMatchObject({
        version: 1,
        workflow: { dispatchCeiling: { providers: { claude: 'fable' } } },
      });
    });

    it('sets dynamic workflow.dispatchCeiling.providers cursor values after successful availability validation', async () => {
      const root = await createRepoRoot();
      const validateMatrixCell = vi.fn(async () => 'valid' as const);
      const { command, capture } = createHarness({
        cwd: root,
        validateMatrixCell,
      });

      await runCommand(command, [
        'set',
        'workflow.dispatchCeiling.providers.cursor',
        'composer-2.5',
        '--shared',
      ]);

      const raw = await readFile(join(root, '.oat', 'config.json'), 'utf8');
      expect(JSON.parse(raw)).toMatchObject({
        version: 1,
        workflow: {
          dispatchCeiling: { providers: { cursor: 'composer-2.5' } },
        },
      });
      expect(validateMatrixCell).toHaveBeenCalledWith(
        'cursor',
        'composer-2.5',
        {
          cwd: root,
          env: {},
          detailed: true,
        },
      );
      expect(capture.warn).toHaveLength(0);
      expect(process.exitCode).toBe(0);
    });

    it('sets dynamic workflow.dispatchCeiling.providers cursor tier values', async () => {
      const root = await createRepoRoot();
      const validateMatrixCell = vi.fn(async () => 'valid' as const);
      const { command, capture } = createHarness({
        cwd: root,
        validateMatrixCell,
      });

      await runCommand(command, [
        'set',
        'workflow.dispatchCeiling.providers.cursor.high',
        'composer-2.5',
        '--shared',
      ]);

      const raw = await readFile(join(root, '.oat', 'config.json'), 'utf8');
      const parsed = JSON.parse(raw);
      expect(parsed).toMatchObject({
        version: 1,
        workflow: {
          dispatchCeiling: {
            providers: {
              cursor: { high: { candidates: ['composer-2.5'] } },
            },
          },
        },
      });
      expect(
        Object.prototype.hasOwnProperty.call(
          parsed.workflow.dispatchCeiling.providers,
          'cursor.high',
        ),
      ).toBe(false);
      expect(validateMatrixCell).toHaveBeenCalledWith(
        'cursor',
        'composer-2.5',
        {
          cwd: root,
          env: {},
          detailed: true,
        },
      );
      expect(capture.warn).toHaveLength(0);
      expect(process.exitCode).toBe(0);
    });

    it('rejects nested workflow.dispatchCeiling.providers keys with unknown tiers', async () => {
      const root = await createRepoRoot();
      const { command, capture } = createHarness({ cwd: root });

      await runCommand(command, [
        'set',
        'workflow.dispatchCeiling.providers.cursor.ultra',
        'composer-2.5',
        '--shared',
      ]);

      expect(capture.error[0]).toContain(
        'workflow.dispatchCeiling.providers.<provider>.<tier>',
      );
      expect(capture.error[0]).toContain(
        'economy | balanced | high | frontier',
      );
      expect(process.exitCode).toBe(1);
    });

    it('warns but saves dynamic workflow.dispatchCeiling.providers values when the oracle reports unknown-value', async () => {
      const root = await createRepoRoot();
      const validateMatrixCell = vi.fn(async () => 'unknown-value' as const);
      const { command, capture } = createHarness({
        cwd: root,
        validateMatrixCell,
      });

      await runCommand(command, [
        'set',
        'workflow.dispatchCeiling.providers.cursor',
        'missing-model',
        '--shared',
      ]);

      const raw = await readFile(join(root, '.oat', 'config.json'), 'utf8');
      expect(JSON.parse(raw)).toMatchObject({
        version: 1,
        workflow: {
          dispatchCeiling: { providers: { cursor: 'missing-model' } },
        },
      });
      expect(capture.warn[0]).toContain(
        'workflow.dispatchCeiling.providers.cursor',
      );
      expect(capture.warn[0]).toContain('missing-model');
      expect(capture.warn[0]).toContain('not recognized');
      expect(process.exitCode).toBe(0);
    });

    it('includes Cursor subagent allowed-list details in availability warnings', async () => {
      const root = await createRepoRoot();
      const validateMatrixCell = vi.fn(async () => ({
        availability: 'unknown-value' as const,
        allowedValues: ['gpt-5.3-codex', 'composer-2.5'],
        message:
          'Cursor rejected this model for subagent Task dispatch. Allowed subagent models: gpt-5.3-codex, composer-2.5.',
      }));
      const { command, capture } = createHarness({
        cwd: root,
        validateMatrixCell,
      });

      await runCommand(command, [
        'set',
        'workflow.dispatchCeiling.providers.cursor.high',
        'gpt-5.3-codex-low',
        '--shared',
      ]);

      expect(capture.warn[0]).toContain(
        'workflow.dispatchCeiling.providers.cursor.high',
      );
      expect(capture.warn[0]).toContain('gpt-5.3-codex-low');
      expect(capture.warn[0]).toContain('Allowed subagent models');
      expect(capture.warn[0]).toContain('gpt-5.3-codex');
      expect(validateMatrixCell).toHaveBeenCalledWith(
        'cursor',
        'gpt-5.3-codex-low',
        {
          cwd: root,
          env: {},
          detailed: true,
        },
      );
    });

    it('warns but saves provider values when the availability oracle is unavailable', async () => {
      const root = await createRepoRoot();
      const validateMatrixCell = vi.fn(async () => 'unvalidated' as const);
      const { command, capture } = createHarness({
        cwd: root,
        validateMatrixCell,
      });

      await runCommand(command, [
        'set',
        'workflow.dispatchCeiling.providers.cursor',
        'composer-2.5',
        '--shared',
      ]);

      const raw = await readFile(join(root, '.oat', 'config.json'), 'utf8');
      expect(JSON.parse(raw)).toMatchObject({
        version: 1,
        workflow: {
          dispatchCeiling: { providers: { cursor: 'composer-2.5' } },
        },
      });
      expect(capture.warn[0]).toContain(
        'workflow.dispatchCeiling.providers.cursor',
      );
      expect(capture.warn[0]).toContain('could not be validated');
      expect(process.exitCode).toBe(0);
    });

    it('set workflow.dispatchCeiling.providers.codex validates provider-specific enums (legacy key updated)', async () => {
      const root = await createRepoRoot();
      const { command, capture } = createHarness({ cwd: root });

      await runCommand(command, [
        'set',
        'workflow.dispatchCeiling.providers.codex',
        'opus',
      ]);

      expect(process.exitCode).toBe(1);
      expect(capture.error[0]).toContain(
        'workflow.dispatchCeiling.providers.codex',
      );
      expect(capture.error[0]).toContain('low | medium | high | xhigh | max');
    });

    it('rejects invalid closed-provider tier values before validation or save', async () => {
      const root = await createRepoRoot();
      const validateMatrixCell = vi.fn(async () => 'unknown-value' as const);
      const { command, capture } = createHarness({
        cwd: root,
        validateMatrixCell,
      });

      await runCommand(command, [
        'set',
        'workflow.dispatchCeiling.providers.claude.high',
        'opus-4.8',
        '--shared',
      ]);

      expect(process.exitCode).toBe(1);
      expect(capture.error[0]).toContain(
        'workflow.dispatchCeiling.providers.claude.high',
      );
      expect(capture.error[0]).toContain('haiku | sonnet | opus | fable');
      expect(validateMatrixCell).not.toHaveBeenCalled();

      await expect(
        readFile(join(root, '.oat', 'config.json'), 'utf8'),
      ).rejects.toMatchObject({ code: 'ENOENT' });
    });

    it('adopts the bundled dispatch matrix recommendation into the shared config with a version stamp', async () => {
      const root = await createRepoRoot();
      const home = await createHome();
      const validateMatrixCell = vi.fn(async () => 'valid' as const);
      const { command, capture } = createHarness({
        cwd: root,
        home,
        validateMatrixCell,
        assetFiles: {
          '/tmp/assets/config/dispatch-matrix-recommendation.json':
            JSON.stringify({
              version: '2026-07-07.1',
              providers: {
                cursor: {
                  economy: 'composer-2.5',
                  balanced: 'composer-2.5-fast',
                },
                codex: { high: 'high' },
                claude: { frontier: 'fable' },
              },
            }),
        },
      });

      await runCommand(command, ['adopt', 'dispatch-matrix', '--shared']);

      const raw = await readFile(join(root, '.oat', 'config.json'), 'utf8');
      expect(JSON.parse(raw)).toMatchObject({
        version: 1,
        workflow: {
          dispatchCeiling: {
            recommendationVersion: '2026-07-07.1',
            providers: {
              cursor: {
                economy: { candidates: ['composer-2.5'] },
                balanced: { candidates: ['composer-2.5-fast'] },
              },
              codex: { high: { candidates: ['high'] } },
              claude: { frontier: { candidates: ['fable'] } },
            },
          },
        },
      });
      expect(validateMatrixCell).toHaveBeenCalledWith(
        'cursor',
        'composer-2.5',
        {
          cwd: root,
          env: {},
          detailed: true,
        },
      );
      expect(validateMatrixCell).toHaveBeenCalledWith(
        'cursor',
        'composer-2.5-fast',
        { cwd: root, env: {}, detailed: true },
      );
      expect(validateMatrixCell).toHaveBeenCalledWith('codex', 'high', {
        cwd: root,
        env: {},
        detailed: true,
      });
      expect(validateMatrixCell).toHaveBeenCalledWith('claude', 'fable', {
        cwd: root,
        env: {},
        detailed: true,
      });
      expect(capture.info[0]).toContain('2026-07-07.1');
      expect(capture.info.join('\n')).toContain(
        '[advisory] terminal-reviewer-eligibility',
      );
      expect(capture.info.join('\n')).toContain('fable');
      expect(capture.warn).toHaveLength(0);
      expect(process.exitCode).toBe(0);
    });

    it('returns structured effective post-adoption terminal reviewer notices in JSON', async () => {
      const root = await createRepoRoot();
      const { command, capture } = createHarness({
        cwd: root,
        validateMatrixCell: vi.fn(async () => 'valid' as const),
        assetFiles: {
          '/tmp/assets/config/dispatch-matrix-recommendation.json':
            JSON.stringify({
              version: 'new',
              providers: {
                claude: { frontier: { candidates: ['fable'] } },
              },
            }),
        },
      });

      await runCommand(
        command,
        ['adopt', 'dispatch-matrix', '--shared'],
        ['--json'],
      );

      expect(capture.jsonPayloads[0]).toMatchObject({
        status: 'ok',
        notices: [
          {
            code: 'terminal-reviewer-eligibility',
            level: 'advisory',
            message: expect.stringContaining('fable'),
          },
        ],
      });
      expect(process.exitCode).toBe(0);
    });

    it('uses a higher-precedence shared non-Fable override after user adoption in human output', async () => {
      const root = await createRepoRoot();
      const home = await createHome();
      await writeFile(
        join(root, '.oat', 'config.json'),
        `${JSON.stringify({
          version: 1,
          workflow: {
            dispatchCeiling: {
              providers: {
                cursor: {
                  frontier: {
                    candidates: ['claude-opus-5-thinking-xhigh'],
                  },
                },
              },
            },
          },
        })}\n`,
        'utf8',
      );
      const { command, capture } = createHarness({
        cwd: root,
        home,
        validateMatrixCell: vi.fn(async () => 'valid' as const),
        assetFiles: {
          '/tmp/assets/config/dispatch-matrix-recommendation.json':
            JSON.stringify({
              version: 'new',
              providers: {
                cursor: {
                  frontier: {
                    candidates: ['claude-fable-5-thinking-high'],
                  },
                },
              },
            }),
        },
      });

      await runCommand(command, ['adopt', 'dispatch-matrix', '--user']);

      expect(capture.info.join('\n')).not.toContain(
        'terminal-reviewer-eligibility',
      );
      expect(process.exitCode).toBe(0);
    });

    it('uses a higher-precedence local Fable override after shared adoption in JSON output', async () => {
      const root = await createRepoRoot();
      const home = await createHome();
      await writeFile(
        join(root, '.oat', 'config.local.json'),
        `${JSON.stringify({
          version: 1,
          workflow: {
            dispatchCeiling: {
              providers: {
                cursor: {
                  frontier: {
                    candidates: ['claude-fable-5-thinking-high'],
                  },
                },
              },
            },
          },
        })}\n`,
        'utf8',
      );
      const { command, capture } = createHarness({
        cwd: root,
        home,
        validateMatrixCell: vi.fn(async () => 'valid' as const),
        assetFiles: {
          '/tmp/assets/config/dispatch-matrix-recommendation.json':
            JSON.stringify({
              version: 'new',
              providers: {
                cursor: {
                  frontier: {
                    candidates: ['claude-opus-5-thinking-xhigh'],
                  },
                },
              },
            }),
        },
      });

      await runCommand(
        command,
        ['adopt', 'dispatch-matrix', '--shared'],
        ['--json'],
      );

      expect(capture.jsonPayloads[0]).toMatchObject({
        status: 'ok',
        notices: [
          {
            code: 'terminal-reviewer-eligibility',
            level: 'advisory',
            message: expect.stringContaining('claude-fable-5-thinking-high'),
          },
        ],
      });
      expect(process.exitCode).toBe(0);
    });

    it.each([
      ['claude-fable-5-thinking-high', 'human', false, true],
      ['gpt-5.6-sol-high', 'human', false, false],
      ['claude-fable-5-thinking-high', 'JSON', true, true],
      ['gpt-5.6-sol-high', 'JSON', true, false],
    ] as const)(
      'uses a higher-precedence bare-provider %s target in %s post-adoption output',
      async (effectiveTarget, _label, json, expectedNotice) => {
        const root = await createRepoRoot();
        const home = await createHome();
        const overridePath = json
          ? join(root, '.oat', 'config.local.json')
          : join(root, '.oat', 'config.json');
        await writeFile(
          overridePath,
          `${JSON.stringify({
            version: 1,
            workflow: {
              dispatchCeiling: {
                providers: { cursor: effectiveTarget },
              },
            },
          })}\n`,
          'utf8',
        );
        const recommendationTarget = expectedNotice
          ? 'gpt-5.6-sol-high'
          : 'claude-fable-5-thinking-high';
        const { command, capture } = createHarness({
          cwd: root,
          home,
          validateMatrixCell: vi.fn(async () => 'valid' as const),
          assetFiles: {
            '/tmp/assets/config/dispatch-matrix-recommendation.json':
              JSON.stringify({
                version: 'new',
                providers: {
                  cursor: {
                    frontier: {
                      candidates: [recommendationTarget],
                    },
                  },
                },
              }),
          },
        });

        await runCommand(
          command,
          ['adopt', 'dispatch-matrix', json ? '--shared' : '--user'],
          json ? ['--json'] : [],
        );

        const output = json
          ? JSON.stringify(capture.jsonPayloads[0])
          : capture.info.join('\n');
        expect(output.includes('terminal-reviewer-eligibility')).toBe(
          expectedNotice,
        );
        if (expectedNotice) {
          expect(output).toContain(effectiveTarget);
        }
        expect(process.exitCode).toBe(0);
      },
    );

    it('does not infer Fable from recommendation version when an explicit Frontier cell is preserved', async () => {
      const root = await createRepoRoot();
      await writeFile(
        join(root, '.oat', 'config.json'),
        `${JSON.stringify({
          version: 1,
          workflow: {
            dispatchCeiling: {
              recommendationVersion: 'old',
              providers: {
                claude: {
                  frontier: { candidates: ['opus'] },
                },
              },
            },
          },
        })}\n`,
        'utf8',
      );
      const { command, capture } = createHarness({
        cwd: root,
        validateMatrixCell: vi.fn(async () => 'valid' as const),
        assetFiles: {
          '/tmp/assets/config/dispatch-matrix-recommendation.json':
            JSON.stringify({
              version: 'new',
              providers: {
                claude: {
                  frontier: { candidates: ['fable'] },
                },
              },
            }),
        },
      });

      await runCommand(command, ['adopt', 'dispatch-matrix', '--shared']);

      expect(capture.info.join('\n')).not.toContain(
        'terminal-reviewer-eligibility',
      );
      expect(capture.info.join('\n')).not.toContain('fable');
      expect(process.exitCode).toBe(0);
    });

    it('ships the confirmed Codex, Claude, and Cursor recommendation ladder', async () => {
      const recommendation = JSON.parse(
        await readFile(
          join(process.cwd(), 'config', 'dispatch-matrix-recommendation.json'),
          'utf8',
        ),
      ) as Record<string, unknown>;

      expect(recommendation.version).toBe('2026-07-27.1');
      expect(recommendation.providers).toMatchObject({
        codex: {
          economy: {
            candidates: [
              { model: 'gpt-5.6-luna', effort: 'low' },
              { model: 'gpt-5.6-luna', effort: 'medium' },
              { model: 'gpt-5.6-luna', effort: 'high' },
            ],
          },
          balanced: {
            candidates: [
              { model: 'gpt-5.6-luna', effort: 'xhigh' },
              { model: 'gpt-5.6-terra', effort: 'low' },
              { model: 'gpt-5.6-terra', effort: 'medium' },
              { model: 'gpt-5.6-terra', effort: 'high' },
              { model: 'gpt-5.6-terra', effort: 'xhigh' },
            ],
          },
          high: {
            candidates: [
              { model: 'gpt-5.6-sol', effort: 'low' },
              { model: 'gpt-5.6-sol', effort: 'medium' },
              { model: 'gpt-5.6-sol', effort: 'high' },
            ],
          },
          frontier: {
            candidates: [
              { model: 'gpt-5.6-sol', effort: 'xhigh' },
              { model: 'gpt-5.6-sol', effort: 'max' },
            ],
          },
        },
        claude: {
          economy: { candidates: ['haiku', 'sonnet'] },
          balanced: { candidates: ['sonnet'] },
          high: { candidates: ['opus'] },
          frontier: { candidates: ['fable'] },
        },
        cursor: {
          economy: {
            candidates: [
              'composer-2.5',
              'gpt-5.6-luna-high',
              'gpt-5.6-luna-xhigh',
            ],
          },
          balanced: {
            candidates: [
              'cursor-grok-4.5-high',
              'gpt-5.6-terra-high',
              'claude-opus-5-thinking-low',
            ],
          },
          high: {
            candidates: [
              'claude-opus-5-thinking-medium',
              'gpt-5.6-sol-medium',
              'claude-opus-5-thinking-high',
              'gpt-5.6-sol-high',
            ],
          },
          frontier: {
            candidates: [
              'gpt-5.6-sol-xhigh',
              'claude-opus-5-thinking-xhigh',
              'gpt-5.6-sol-max',
              'claude-fable-5-thinking-high',
            ],
          },
        },
      });
    });

    it('rejects invalid closed-provider values during dispatch matrix recommendation adoption', async () => {
      const root = await createRepoRoot();
      const validateMatrixCell = vi.fn(async () => 'unknown-value' as const);
      const { command, capture } = createHarness({
        cwd: root,
        validateMatrixCell,
        assetFiles: {
          '/tmp/assets/config/dispatch-matrix-recommendation.json':
            JSON.stringify({
              version: '2026-07-07.1',
              providers: {
                claude: { frontier: 'opus-4.9' },
              },
            }),
        },
      });

      await runCommand(command, ['adopt', 'dispatch-matrix', '--shared']);

      expect(process.exitCode).toBe(1);
      expect(capture.error[0]).toContain(
        'workflow.dispatchCeiling.providers.claude.frontier',
      );
      expect(capture.error[0]).toContain('haiku | sonnet | opus | fable');
      expect(validateMatrixCell).not.toHaveBeenCalled();
      await expect(
        readFile(join(root, '.oat', 'config.json'), 'utf8'),
      ).rejects.toMatchObject({ code: 'ENOENT' });
    });

    it('rejects codex candidate targets missing model or effort during dispatch matrix adoption', async () => {
      const root = await createRepoRoot();
      const validateMatrixCell = vi.fn(async () => 'valid' as const);
      const { command, capture } = createHarness({
        cwd: root,
        validateMatrixCell,
        assetFiles: {
          '/tmp/assets/config/dispatch-matrix-recommendation.json':
            JSON.stringify({
              version: '2026-07-07.1',
              providers: {
                codex: {
                  high: {
                    candidates: [{ harness: 'codex', effort: 'xhigh' }],
                  },
                },
              },
            }),
        },
      });

      await runCommand(command, ['adopt', 'dispatch-matrix', '--shared']);

      expect(process.exitCode).toBe(1);
      expect(capture.error[0]).toContain(
        'workflow.dispatchCeiling.providers.codex.high.candidates[0]',
      );
      expect(capture.error[0]).toContain('model and effort');
      expect(validateMatrixCell).not.toHaveBeenCalled();
      await expect(
        readFile(join(root, '.oat', 'config.json'), 'utf8'),
      ).rejects.toMatchObject({ code: 'ENOENT' });
    });

    it('validates codex route targets as model and effort pairs during dispatch matrix adoption', async () => {
      const root = await createRepoRoot();
      const validateMatrixCell = vi.fn(async () => 'valid' as const);
      const { command, capture } = createHarness({
        cwd: root,
        validateMatrixCell,
        assetFiles: {
          '/tmp/assets/config/dispatch-matrix-recommendation.json':
            JSON.stringify({
              version: '2026-07-07.1',
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
            }),
        },
      });

      await runCommand(command, ['adopt', 'dispatch-matrix', '--shared']);

      const raw = await readFile(join(root, '.oat', 'config.json'), 'utf8');
      expect(JSON.parse(raw)).toMatchObject({
        version: 1,
        workflow: {
          dispatchCeiling: {
            recommendationVersion: '2026-07-07.1',
            providers: {
              codex: {
                high: {
                  candidates: [
                    {
                      route: [
                        {
                          harness: 'codex',
                          model: 'gpt-5.5',
                          effort: 'xhigh',
                        },
                      ],
                    },
                  ],
                },
              },
            },
          },
        },
      });
      expect(validateMatrixCell).toHaveBeenCalledTimes(1);
      expect(validateMatrixCell).toHaveBeenCalledWith('codex', 'gpt-5.5', {
        cwd: root,
        env: {},
        detailed: true,
        target: {
          harness: 'codex',
          model: 'gpt-5.5',
          effort: 'xhigh',
        },
      });
      expect(capture.warn).toHaveLength(0);
      expect(process.exitCode).toBe(0);
    });

    it('warns per cell during dispatch matrix recommendation adoption without blocking', async () => {
      const root = await createRepoRoot();
      const validateMatrixCell = vi.fn(
        async (_provider: string, value: string) =>
          value === 'missing-model' ? 'unknown-value' : 'unvalidated',
      );
      const { command, capture } = createHarness({
        cwd: root,
        validateMatrixCell,
        assetFiles: {
          '/tmp/assets/config/dispatch-matrix-recommendation.json':
            JSON.stringify({
              version: '2026-07-07.1',
              providers: {
                cursor: {
                  high: [{ model: 'missing-model' }],
                  frontier: 'composer-2.5',
                },
              },
            }),
        },
      });

      await runCommand(command, ['adopt', 'dispatch-matrix', '--shared']);

      expect(capture.warn.join('\n')).toContain(
        'workflow.dispatchCeiling.providers.cursor.high.candidates[0].route[0]',
      );
      expect(capture.warn.join('\n')).toContain('missing-model');
      expect(capture.warn.join('\n')).toContain('not recognized');
      expect(capture.warn.join('\n')).toContain(
        'workflow.dispatchCeiling.providers.cursor.frontier',
      );
      expect(capture.warn.join('\n')).toContain('could not be validated');
      expect(process.exitCode).toBe(0);
    });

    it('shares Cursor Task probes and catalog work while fanning warnings back to exact paths', async () => {
      const root = await createRepoRoot();
      const runCursorAgent = vi.fn(async (args: string[]) => {
        if (args.includes('models')) {
          return {
            ok: true,
            stdout:
              'gpt-5.6-terra-xhigh - Terra XHigh\ngpt-5.6-sol-high - Sol High\n',
            stderr: '',
          };
        }
        return {
          ok: false,
          stdout: '',
          stderr: 'Task probe was inconclusive',
        };
      });
      const { command, capture } = createHarness({
        cwd: root,
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
        assetFiles: {
          '/tmp/assets/config/dispatch-matrix-recommendation.json':
            JSON.stringify({
              version: '2026-07-07.1',
              providers: {
                cursor: {
                  balanced: {
                    candidates: ['gpt-5.6-terra-xhigh', 'gpt-5.6-terra-xhigh'],
                  },
                  high: { candidates: ['gpt-5.6-sol-high'] },
                },
              },
            }),
        },
      });

      await runCommand(command, ['adopt', 'dispatch-matrix', '--shared']);

      const calls = runCursorAgent.mock.calls.map(([args]) => args);
      expect(calls.filter((args) => args.includes('-p'))).toHaveLength(2);
      expect(calls.filter((args) => args.includes('models'))).toHaveLength(1);
      expect(
        calls.filter((args) => args.includes('--list-models')),
      ).toHaveLength(0);

      const warnings = capture.warn.join('\n');
      expect(warnings).toContain(
        'workflow.dispatchCeiling.providers.cursor.balanced.candidates[0] value',
      );
      expect(warnings).toContain(
        'workflow.dispatchCeiling.providers.cursor.balanced.candidates[1] value',
      );
      expect(warnings).toContain(
        'workflow.dispatchCeiling.providers.cursor.high.candidates[0] value',
      );
      expect(
        capture.warn.filter((warning) =>
          warning.includes('gpt-5.6-terra-xhigh'),
        ),
      ).toHaveLength(2);
      expect(capture.warn).toHaveLength(3);

      const raw = await readFile(join(root, '.oat', 'config.json'), 'utf8');
      expect(JSON.parse(raw)).toMatchObject({
        workflow: {
          dispatchCeiling: {
            providers: {
              cursor: {
                balanced: {
                  candidates: ['gpt-5.6-terra-xhigh', 'gpt-5.6-terra-xhigh'],
                },
                high: { candidates: ['gpt-5.6-sol-high'] },
              },
            },
          },
        },
      });
      expect(process.exitCode).toBe(0);
    });

    it('reports canonical scalar, candidate, and nested fallback availability paths', async () => {
      const root = await createRepoRoot();
      const validateMatrixCell = vi.fn(async () => 'unvalidated' as const);
      const { command, capture } = createHarness({
        cwd: root,
        validateMatrixCell,
        assetFiles: {
          '/tmp/assets/config/dispatch-matrix-recommendation.json':
            JSON.stringify({
              version: '2026-07-07.1',
              providers: {
                cursor: 'scalar-model',
                claude: { high: { candidates: ['opus'] } },
                custom: {
                  frontier: {
                    candidates: [{ route: ['fallback-model'] }],
                  },
                },
              },
            }),
        },
      });

      await runCommand(command, ['adopt', 'dispatch-matrix', '--shared']);

      expect(capture.warn.join('\n')).toContain(
        'workflow.dispatchCeiling.providers.cursor value',
      );
      expect(capture.warn.join('\n')).toContain(
        'workflow.dispatchCeiling.providers.claude.high.candidates[0] value',
      );
      expect(capture.warn.join('\n')).toContain(
        'workflow.dispatchCeiling.providers.custom.frontier.candidates[0].route[0] value',
      );
      expect(validateMatrixCell).toHaveBeenCalledTimes(3);
      expect(process.exitCode).toBe(0);
    });

    it('fills missing dispatch matrix cells while preserving explicit values', async () => {
      const root = await createRepoRoot();
      await writeFile(
        join(root, '.oat', 'config.json'),
        `${JSON.stringify({
          version: 1,
          workflow: {
            dispatchCeiling: {
              recommendationVersion: 'old',
              providers: { cursor: { high: 'existing-model' } },
            },
          },
        })}\n`,
        'utf8',
      );
      const { command, capture } = createHarness({
        cwd: root,
        confirmResponses: [false],
        validateMatrixCell: vi.fn(async () => 'valid' as const),
        assetFiles: {
          '/tmp/assets/config/dispatch-matrix-recommendation.json':
            JSON.stringify({
              version: 'new',
              providers: {
                cursor: {
                  economy: 'recommended-economy',
                  high: 'replacement-model',
                },
                claude: { high: 'opus' },
              },
            }),
        },
      });

      await runCommand(command, ['adopt', 'dispatch-matrix', '--shared']);

      const raw = await readFile(join(root, '.oat', 'config.json'), 'utf8');
      expect(JSON.parse(raw)).toMatchObject({
        workflow: {
          dispatchCeiling: {
            recommendationVersion: 'new',
            providers: {
              cursor: {
                economy: { candidates: ['recommended-economy'] },
                high: { candidates: ['existing-model'] },
              },
              claude: { high: { candidates: ['opus'] } },
            },
          },
        },
      });
      expect(capture.error).toHaveLength(0);
      expect(process.exitCode).toBe(0);
    });

    it('preserves explicit values even when --yes is supplied', async () => {
      const root = await createRepoRoot();
      await writeFile(
        join(root, '.oat', 'config.json'),
        `${JSON.stringify({
          version: 1,
          workflow: {
            dispatchCeiling: {
              recommendationVersion: 'old',
              providers: { cursor: { high: 'existing-model' } },
            },
          },
        })}\n`,
        'utf8',
      );
      const { command } = createHarness({
        cwd: root,
        confirmResponses: [true],
        validateMatrixCell: vi.fn(async () => 'valid' as const),
        assetFiles: {
          '/tmp/assets/config/dispatch-matrix-recommendation.json':
            JSON.stringify({
              version: 'new',
              providers: { cursor: { high: 'replacement-model' } },
            }),
        },
      });

      await runCommand(command, [
        'adopt',
        'dispatch-matrix',
        '--shared',
        '--yes',
      ]);

      const raw = await readFile(join(root, '.oat', 'config.json'), 'utf8');
      expect(JSON.parse(raw)).toMatchObject({
        workflow: {
          dispatchCeiling: {
            recommendationVersion: 'new',
            providers: {
              cursor: { high: { candidates: ['existing-model'] } },
            },
          },
        },
      });
      expect(process.exitCode).toBe(0);
    });

    it('set workflow.dispatchCeiling.preset balanced compiles to concrete providers', async () => {
      const root = await createRepoRoot();
      const home = await createHome();
      const { command } = createHarness({ cwd: root, home });

      await runCommand(command, [
        'set',
        'workflow.dispatchCeiling.preset',
        'balanced',
        '--shared',
      ]);

      const raw = await readFile(join(root, '.oat', 'config.json'), 'utf8');
      expect(JSON.parse(raw)).toMatchObject({
        version: 1,
        workflow: {
          dispatchCeiling: {
            preset: 'balanced',
            providers: { codex: 'high', claude: 'sonnet' },
          },
        },
      });

      const { command: getCodex, capture: codexCap } = createHarness({
        cwd: root,
        home,
      });
      await runCommand(
        getCodex,
        ['get', 'workflow.dispatchCeiling.providers.codex'],
        ['--json'],
      );
      expect(codexCap.jsonPayloads[0]).toMatchObject({
        status: 'ok',
        key: 'workflow.dispatchCeiling.providers.codex',
        value: 'high',
        source: 'shared',
      });

      const { command: getClaude, capture: claudeCap } = createHarness({
        cwd: root,
        home,
      });
      await runCommand(
        getClaude,
        ['get', 'workflow.dispatchCeiling.providers.claude'],
        ['--json'],
      );
      expect(claudeCap.jsonPayloads[0]).toMatchObject({
        status: 'ok',
        key: 'workflow.dispatchCeiling.providers.claude',
        value: 'sonnet',
        source: 'shared',
      });
    });

    it('set workflow.dispatchCeiling.preset cost-conscious compiles to medium/sonnet', async () => {
      const root = await createRepoRoot();
      const { command } = createHarness({ cwd: root });

      await runCommand(command, [
        'set',
        'workflow.dispatchCeiling.preset',
        'cost-conscious',
        '--shared',
      ]);

      const raw = await readFile(join(root, '.oat', 'config.json'), 'utf8');
      expect(JSON.parse(raw)).toMatchObject({
        version: 1,
        workflow: {
          dispatchCeiling: {
            preset: 'cost-conscious',
            providers: { codex: 'medium', claude: 'sonnet' },
          },
        },
      });
    });

    it('set workflow.dispatchCeiling.preset maximum compiles to xhigh/opus', async () => {
      const root = await createRepoRoot();
      const { command } = createHarness({ cwd: root });

      await runCommand(command, [
        'set',
        'workflow.dispatchCeiling.preset',
        'maximum',
        '--shared',
      ]);

      const raw = await readFile(join(root, '.oat', 'config.json'), 'utf8');
      expect(JSON.parse(raw)).toMatchObject({
        version: 1,
        workflow: {
          dispatchCeiling: {
            preset: 'maximum',
            providers: { codex: 'xhigh', claude: 'opus' },
          },
        },
      });
    });

    it('set workflow.dispatchPolicy.policy writes managed policy state', async () => {
      const root = await createRepoRoot();
      const home = await createHome();
      const { command } = createHarness({ cwd: root, home });

      await runCommand(command, [
        'set',
        'workflow.dispatchPolicy.policy',
        'frontier',
        '--shared',
      ]);

      const raw = await readFile(join(root, '.oat', 'config.json'), 'utf8');
      expect(JSON.parse(raw)).toMatchObject({
        version: 1,
        workflow: {
          dispatchPolicy: {
            mode: 'managed',
            policy: 'frontier',
          },
        },
      });

      const { command: getCmd, capture: getCap } = createHarness({
        cwd: root,
        home,
      });
      await runCommand(
        getCmd,
        ['get', 'workflow.dispatchPolicy.policy'],
        ['--json'],
      );
      expect(getCap.jsonPayloads[0]).toMatchObject({
        status: 'ok',
        key: 'workflow.dispatchPolicy.policy',
        value: 'frontier',
        source: 'shared',
      });
    });

    it('set workflow.dispatchPolicy.mode inherit clears managed policy state', async () => {
      const root = await createRepoRoot();
      const { command } = createHarness({ cwd: root });

      await runCommand(command, [
        'set',
        'workflow.dispatchPolicy.policy',
        'uncapped',
      ]);
      await runCommand(command, [
        'set',
        'workflow.dispatchPolicy.mode',
        'inherit',
      ]);

      const raw = await readFile(
        join(root, '.oat', 'config.local.json'),
        'utf8',
      );
      expect(JSON.parse(raw)).toMatchObject({
        version: 1,
        workflow: {
          dispatchPolicy: {
            mode: 'inherit',
          },
        },
      });
    });

    it('set workflow.dispatchPolicy.mode managed requires an existing policy', async () => {
      const root = await createRepoRoot();
      const { command, capture } = createHarness({ cwd: root });

      await runCommand(command, [
        'set',
        'workflow.dispatchPolicy.mode',
        'managed',
      ]);

      expect(process.exitCode).toBe(1);
      expect(capture.error[0]).toContain('workflow.dispatchPolicy.policy');
    });

    it('set workflow.dispatchPolicy.policy rejects legacy ceiling preset names', async () => {
      const root = await createRepoRoot();
      const { command, capture } = createHarness({ cwd: root });

      await runCommand(command, [
        'set',
        'workflow.dispatchPolicy.policy',
        'maximum',
      ]);

      expect(process.exitCode).toBe(1);
      expect(capture.error[0]).toContain(
        'economy | balanced | high | frontier | uncapped',
      );
    });

    it('describe workflow.dispatchPolicy.policy uses canonical policy option wording', async () => {
      const root = await createRepoRoot();
      const { command, capture } = createHarness({ cwd: root });

      await runCommand(command, ['describe', 'workflow.dispatchPolicy.policy']);

      expect(capture.info[0]).toContain(
        'economy | balanced | high | frontier | uncapped',
      );
      expect(capture.info[0]).toContain(
        'uncapped keeps OAT-managed preferred selection without provider caps',
      );
      expect(capture.info[0]).toContain(
        'inherit leaves dispatch controls to host/provider defaults',
      );
    });

    it('workflow.autoReviewAtHillCheckpoints overrides legacy autoReviewAtCheckpoints', async () => {
      const root = await createRepoRoot();
      const home = await createHome();
      const h1 = createHarness({ cwd: root, home });

      await runCommand(h1.command, [
        'set',
        'autoReviewAtCheckpoints',
        'true',
        '--shared',
      ]);

      const h2 = createHarness({ cwd: root, home });
      await runCommand(h2.command, [
        'set',
        'workflow.autoReviewAtHillCheckpoints',
        'false',
        '--shared',
      ]);

      const h3 = createHarness({ cwd: root, home });
      await runCommand(
        h3.command,
        ['get', 'workflow.autoReviewAtHillCheckpoints'],
        ['--json'],
      );
      expect(h3.capture.jsonPayloads[0]).toMatchObject({
        value: 'false',
        source: 'shared',
      });
    });

    it('local overrides shared overrides user for workflow keys (full chain)', async () => {
      const root = await createRepoRoot();
      const home = await createHome();

      // Set user first
      const h1 = createHarness({ cwd: root, home });
      await runCommand(h1.command, [
        'set',
        'workflow.hillCheckpointDefault',
        'every',
        '--user',
      ]);

      // Then shared
      const h2 = createHarness({ cwd: root, home });
      await runCommand(h2.command, [
        'set',
        'workflow.hillCheckpointDefault',
        'final',
        '--shared',
      ]);

      // Get: shared wins over user
      const h3 = createHarness({ cwd: root, home });
      await runCommand(
        h3.command,
        ['get', 'workflow.hillCheckpointDefault'],
        ['--json'],
      );
      expect(h3.capture.jsonPayloads[0]).toMatchObject({
        value: 'final',
        source: 'shared',
      });

      // Then local
      const h4 = createHarness({ cwd: root, home });
      await runCommand(h4.command, [
        'set',
        'workflow.hillCheckpointDefault',
        'every',
      ]);

      // Get: local wins over everything
      const h5 = createHarness({ cwd: root, home });
      await runCommand(
        h5.command,
        ['get', 'workflow.hillCheckpointDefault'],
        ['--json'],
      );
      expect(h5.capture.jsonPayloads[0]).toMatchObject({
        value: 'every',
        source: 'local',
      });
    });
  });

  describe('workflow preference catalog', () => {
    it('describe lists all workflow preference keys under Workflow Preferences group', async () => {
      const root = await createRepoRoot();
      const { command, capture } = createHarness({ cwd: root });

      await runCommand(command, ['describe']);

      expect(capture.info[0]).toContain('Workflow Preferences');
      expect(capture.info[0]).toContain('workflow.hillCheckpointDefault');
      expect(capture.info[0]).toContain('workflow.archiveOnComplete');
      expect(capture.info[0]).toContain('workflow.createPrOnComplete');
      expect(capture.info[0]).toContain('workflow.postImplementSequence');
      expect(capture.info[0]).toContain('workflow.reviewExecutionModel');
      expect(capture.info[0]).toContain('workflow.autoReviewAtHillCheckpoints');
      expect(capture.info[0]).toContain('workflow.autoNarrowReReviewScope');
      expect(capture.info[0]).toContain('workflow.autoArtifactReview.plan');
      expect(capture.info[0]).toContain('workflow.autoArtifactReview.analysis');
      expect(capture.info[0]).toContain('workflow.designMode');
      expect(capture.info[0]).toContain('workflow.dispatchPolicy.mode');
      expect(capture.info[0]).toContain('workflow.dispatchPolicy.policy');
      expect(capture.info[0]).toContain('workflow.dispatchCeiling.preset');
      expect(capture.info[0]).toContain(
        'workflow.dispatchCeiling.providers.codex',
      );
      expect(capture.info[0]).toContain(
        'workflow.dispatchCeiling.providers.claude',
      );
      expect(process.exitCode).toBe(0);
    });

    it.each([
      [
        'workflow.hillCheckpointDefault',
        'Resolution: local > shared > user > default.',
      ],
      [
        'workflow.archiveOnComplete',
        'Resolution: local > shared > user > default.',
      ],
      [
        'workflow.createPrOnComplete',
        'Resolution: local > shared > user > default.',
      ],
      [
        'workflow.postImplementSequence',
        'Resolution: local > shared > user > default.',
      ],
      [
        'workflow.reviewExecutionModel',
        'Resolution: local > shared > user > default.',
      ],
      [
        'workflow.autoReviewAtHillCheckpoints',
        'Resolution: local > shared > user > legacy autoReviewAtCheckpoints > default.',
      ],
      [
        'workflow.autoNarrowReReviewScope',
        'Resolution: local > shared > user > default.',
      ],
    ] as const)(
      'describe %s reports actual workflow precedence without an env layer',
      async (key, expectedResolution) => {
        const root = await createRepoRoot();
        const { command, capture } = createHarness({ cwd: root });

        await runCommand(command, ['describe', key]);

        expect(capture.info[0]).toContain(expectedResolution);
        expect(capture.info[0]).not.toContain('Resolution: env >');
        expect(process.exitCode).toBe(0);
      },
    );

    it('describe workflow.hillCheckpointDefault shows enum metadata', async () => {
      const root = await createRepoRoot();
      const { command, capture } = createHarness({ cwd: root });

      await runCommand(command, ['describe', 'workflow.hillCheckpointDefault']);

      expect(capture.info[0]).toContain('Key: workflow.hillCheckpointDefault');
      expect(capture.info[0]).toContain('every | final');
      expect(capture.info[0]).toContain('Default: unset');
      expect(capture.info[0]).toContain(
        'Owning command: oat config set workflow.hillCheckpointDefault',
      );
      expect(process.exitCode).toBe(0);
    });

    it('describe workflow.archiveOnComplete shows boolean metadata', async () => {
      const root = await createRepoRoot();
      const { command, capture } = createHarness({ cwd: root });

      await runCommand(command, ['describe', 'workflow.archiveOnComplete']);

      expect(capture.info[0]).toContain('Key: workflow.archiveOnComplete');
      expect(capture.info[0]).toContain('Type: boolean');
      expect(capture.info[0]).toContain('Default: unset');
      expect(process.exitCode).toBe(0);
    });

    it('describe workflow.autoNarrowReReviewScope shows enabled-by-default metadata', async () => {
      const root = await createRepoRoot();
      const { command, capture } = createHarness({ cwd: root });

      await runCommand(command, [
        'describe',
        'workflow.autoNarrowReReviewScope',
      ]);

      expect(capture.info[0]).toContain(
        'Key: workflow.autoNarrowReReviewScope',
      );
      expect(capture.info[0]).toContain('Type: boolean');
      expect(capture.info[0]).toContain('Default: true');
      expect(capture.info[0]).toContain('Narrowing is enabled by default');
      expect(capture.info[0]).toContain('false opts out');
      expect(capture.info[0]).not.toContain('When unset, the skill prompts');
      expect(process.exitCode).toBe(0);
    });

    it('describe workflow.postImplementSequence shows full enum', async () => {
      const root = await createRepoRoot();
      const { command, capture } = createHarness({ cwd: root });

      await runCommand(command, ['describe', 'workflow.postImplementSequence']);

      expect(capture.info[0]).toContain('Key: workflow.postImplementSequence');
      expect(capture.info[0]).toContain(
        'legacy string (wait | summary | pr | docs-pr) | structured JSON object',
      );
      expect(capture.info[0]).toContain('preApproval');
      expect(capture.info[0]).toContain('get --json preserves the object');
      expect(process.exitCode).toBe(0);
    });

    it('describe workflow.dispatchCeiling.providers.codex shows effort enum metadata', async () => {
      const root = await createRepoRoot();
      const { command, capture } = createHarness({ cwd: root });

      await runCommand(command, [
        'describe',
        'workflow.dispatchCeiling.providers.codex',
      ]);

      expect(capture.info[0]).toContain(
        'Key: workflow.dispatchCeiling.providers.codex',
      );
      expect(capture.info[0]).toContain('low | medium | high | xhigh | max');
      expect(capture.info[0]).toContain('Default: unset');
      expect(process.exitCode).toBe(0);
    });

    it('describe workflow.dispatchCeiling.providers.claude shows fable enum metadata', async () => {
      const root = await createRepoRoot();
      const { command, capture } = createHarness({ cwd: root });

      await runCommand(command, [
        'describe',
        'workflow.dispatchCeiling.providers.claude',
      ]);

      expect(capture.info[0]).toContain(
        'Key: workflow.dispatchCeiling.providers.claude',
      );
      expect(capture.info[0]).toContain('haiku | sonnet | opus | fable');
      expect(capture.info[0]).toContain('Default: unset');
      expect(process.exitCode).toBe(0);
    });

    it('describe lists new dispatchCeiling keys under Workflow Preferences group', async () => {
      const root = await createRepoRoot();
      const { command, capture } = createHarness({ cwd: root });

      await runCommand(command, ['describe']);

      expect(capture.info[0]).toContain('workflow.dispatchCeiling.preset');
      expect(capture.info[0]).toContain(
        'workflow.dispatchCeiling.providers.codex',
      );
      expect(capture.info[0]).toContain(
        'workflow.dispatchCeiling.providers.claude',
      );
      expect(process.exitCode).toBe(0);
    });

    it('describe workflow.reviewExecutionModel shows three-tier enum', async () => {
      const root = await createRepoRoot();
      const { command, capture } = createHarness({ cwd: root });

      await runCommand(command, ['describe', 'workflow.reviewExecutionModel']);

      expect(capture.info[0]).toContain('Key: workflow.reviewExecutionModel');
      expect(capture.info[0]).toContain('subagent | inline | fresh-session');
      expect(process.exitCode).toBe(0);
    });

    it('describe workflow.autoArtifactReview keys omit env precedence', async () => {
      const root = await createRepoRoot();
      const planHarness = createHarness({ cwd: root });
      await runCommand(planHarness.command, [
        'describe',
        'workflow.autoArtifactReview.plan',
      ]);

      expect(planHarness.capture.info[0]).toContain(
        'Resolution: local > shared > user > default.',
      );
      expect(planHarness.capture.info[0]).not.toContain('Resolution: env >');
      expect(process.exitCode).toBe(0);

      process.exitCode = undefined;

      const analysisHarness = createHarness({ cwd: root });
      await runCommand(analysisHarness.command, [
        'describe',
        'workflow.autoArtifactReview.analysis',
      ]);

      expect(analysisHarness.capture.info[0]).toContain(
        'Resolution: local > shared > user > default.',
      );
      expect(analysisHarness.capture.info[0]).not.toContain(
        'Resolution: env >',
      );
      expect(process.exitCode).toBe(0);
    });

    it('describe supports workflow keys via json mode', async () => {
      const root = await createRepoRoot();
      const { command, capture } = createHarness({ cwd: root });

      await runCommand(
        command,
        ['describe', 'workflow.archiveOnComplete'],
        ['--json'],
      );

      expect(capture.jsonPayloads[0]).toMatchObject({
        status: 'ok',
        key: 'workflow.archiveOnComplete',
        entries: [
          expect.objectContaining({
            key: 'workflow.archiveOnComplete',
            scope: 'workflow',
            type: 'boolean',
          }),
        ],
      });
      expect(process.exitCode).toBe(0);
    });
  });

  it('sets archive.wrapUpExportPath in config.json', async () => {
    const root = await createRepoRoot();
    const { command } = createHarness({ cwd: root });

    await runCommand(command, [
      'set',
      'archive.wrapUpExportPath',
      '.oat/repo/reference/wrap-ups/',
    ]);

    const raw = await readFile(join(root, '.oat', 'config.json'), 'utf8');
    expect(JSON.parse(raw)).toEqual({
      version: 1,
      archive: {
        wrapUpExportPath: '.oat/repo/reference/wrap-ups',
      },
    });
    expect(process.exitCode).toBe(0);
  });

  it('gets archive.wrapUpExportPath after setting it', async () => {
    const root = await createRepoRoot();
    await writeFile(
      join(root, '.oat', 'config.json'),
      `${JSON.stringify({ version: 1, archive: { wrapUpExportPath: 'custom/wrap-ups' } })}\n`,
      'utf8',
    );
    const { command, capture } = createHarness({ cwd: root });

    await runCommand(command, ['get', 'archive.wrapUpExportPath']);

    expect(capture.info[0]).toBe('custom/wrap-ups');
    expect(process.exitCode).toBe(0);
  });

  it('gets empty string for archive.wrapUpExportPath when unset', async () => {
    const root = await createRepoRoot();
    const { command, capture } = createHarness({ cwd: root });

    await runCommand(command, ['get', 'archive.wrapUpExportPath']);

    expect(capture.info[0]).toBe('');
    expect(process.exitCode).toBe(0);
  });

  it('rejects empty string for archive.wrapUpExportPath', async () => {
    const root = await createRepoRoot();
    const { command, capture } = createHarness({ cwd: root });

    await runCommand(command, ['set', 'archive.wrapUpExportPath', '']);

    expect(capture.error[0]).toContain('Shared config values cannot be empty');
    expect(process.exitCode).toBe(1);
  });

  it('list includes archive.wrapUpExportPath', async () => {
    const root = await createRepoRoot();
    await writeFile(
      join(root, '.oat', 'config.json'),
      `${JSON.stringify({
        version: 1,
        archive: { wrapUpExportPath: '.oat/repo/reference/wrap-ups' },
      })}\n`,
      'utf8',
    );
    const { command, capture } = createHarness({ cwd: root });

    await runCommand(command, ['list']);

    expect(capture.info[0]).toContain('archive.wrapUpExportPath');
    expect(capture.info[0]).toContain('.oat/repo/reference/wrap-ups');
    expect(process.exitCode).toBe(0);
  });

  it('describe surfaces archive.wrapUpExportPath catalog entry', async () => {
    const root = await createRepoRoot();
    const { command, capture } = createHarness({ cwd: root });

    await runCommand(command, ['describe', 'archive.wrapUpExportPath']);

    expect(capture.info[0]).toContain('Key: archive.wrapUpExportPath');
    expect(capture.info[0]).toContain('Scope: shared repo');
    expect(capture.info[0]).toContain('File: .oat/config.json');
    expect(capture.info[0]).toContain(
      'Owning command: oat config set archive.wrapUpExportPath <value>',
    );
    expect(process.exitCode).toBe(0);
  });

  describe('archive.awsProfile + archive.awsRegion', () => {
    const archiveAwsPrecedenceDescription =
      'Precedence: per-invocation flag > this config value > existing shell env.';

    it('sets archive.awsProfile in config.json', async () => {
      const root = await createRepoRoot();
      const { command } = createHarness({ cwd: root });

      await runCommand(command, ['set', 'archive.awsProfile', 'work-sso']);

      const raw = await readFile(join(root, '.oat', 'config.json'), 'utf8');
      expect(JSON.parse(raw)).toEqual({
        version: 1,
        archive: { awsProfile: 'work-sso' },
      });
      expect(process.exitCode).toBe(0);
    });

    it('sets archive.awsRegion in config.json', async () => {
      const root = await createRepoRoot();
      const { command } = createHarness({ cwd: root });

      await runCommand(command, ['set', 'archive.awsRegion', 'us-east-1']);

      const raw = await readFile(join(root, '.oat', 'config.json'), 'utf8');
      expect(JSON.parse(raw)).toEqual({
        version: 1,
        archive: { awsRegion: 'us-east-1' },
      });
      expect(process.exitCode).toBe(0);
    });

    it('trims surrounding whitespace from archive.awsProfile', async () => {
      const root = await createRepoRoot();
      const { command } = createHarness({ cwd: root });

      await runCommand(command, ['set', 'archive.awsProfile', '  work-sso  ']);

      const raw = await readFile(join(root, '.oat', 'config.json'), 'utf8');
      expect(JSON.parse(raw)).toEqual({
        version: 1,
        archive: { awsProfile: 'work-sso' },
      });
      expect(process.exitCode).toBe(0);
    });

    it('removes archive.awsProfile when set to empty string', async () => {
      const root = await createRepoRoot();
      await writeFile(
        join(root, '.oat', 'config.json'),
        `${JSON.stringify({
          version: 1,
          archive: { awsProfile: 'work-sso', s3Uri: 's3://bucket/prefix' },
        })}\n`,
        'utf8',
      );
      const { command } = createHarness({ cwd: root });

      await runCommand(command, ['set', 'archive.awsProfile', '']);

      const raw = await readFile(join(root, '.oat', 'config.json'), 'utf8');
      const parsed = JSON.parse(raw);
      expect(parsed.archive.awsProfile).toBeUndefined();
      // sibling archive keys should remain
      expect(parsed.archive.s3Uri).toBe('s3://bucket/prefix');
      expect(process.exitCode).toBe(0);
    });

    it('removes archive.awsRegion when set to empty string', async () => {
      const root = await createRepoRoot();
      await writeFile(
        join(root, '.oat', 'config.json'),
        `${JSON.stringify({
          version: 1,
          archive: { awsRegion: 'us-east-1', s3Uri: 's3://bucket/prefix' },
        })}\n`,
        'utf8',
      );
      const { command } = createHarness({ cwd: root });

      await runCommand(command, ['set', 'archive.awsRegion', '']);

      const raw = await readFile(join(root, '.oat', 'config.json'), 'utf8');
      const parsed = JSON.parse(raw);
      expect(parsed.archive.awsRegion).toBeUndefined();
      expect(parsed.archive.s3Uri).toBe('s3://bucket/prefix');
      expect(process.exitCode).toBe(0);
    });

    it('describe archive.awsProfile prints catalog entry with owning command', async () => {
      const root = await createRepoRoot();
      const { command, capture } = createHarness({ cwd: root });

      await runCommand(command, ['describe', 'archive.awsProfile']);

      expect(capture.info[0]).toContain('Key: archive.awsProfile');
      expect(capture.info[0]).toContain('Scope: shared repo');
      expect(capture.info[0]).toContain('File: .oat/config.json');
      expect(capture.info[0]).toContain(
        'Owning command: oat config set archive.awsProfile <value>',
      );
      expect(capture.info[0]).toContain(archiveAwsPrecedenceDescription);
      expect(capture.info[0]).toContain('Description:');
      expect(process.exitCode).toBe(0);
    });

    it('describe archive.awsProfile in json mode returns structured entry', async () => {
      const root = await createRepoRoot();
      const { command, capture } = createHarness({ cwd: root });

      await runCommand(command, ['describe', 'archive.awsProfile'], ['--json']);

      expect(capture.jsonPayloads[0]).toMatchObject({
        status: 'ok',
        key: 'archive.awsProfile',
        entries: [
          expect.objectContaining({
            key: 'archive.awsProfile',
            file: '.oat/config.json',
            scope: 'shared repo',
            description: expect.stringContaining(
              archiveAwsPrecedenceDescription,
            ),
          }),
        ],
      });
      expect(process.exitCode).toBe(0);
    });

    it('describe archive.awsRegion prints catalog entry with owning command', async () => {
      const root = await createRepoRoot();
      const { command, capture } = createHarness({ cwd: root });

      await runCommand(command, ['describe', 'archive.awsRegion']);

      expect(capture.info[0]).toContain('Key: archive.awsRegion');
      expect(capture.info[0]).toContain('Scope: shared repo');
      expect(capture.info[0]).toContain('File: .oat/config.json');
      expect(capture.info[0]).toContain(
        'Owning command: oat config set archive.awsRegion <value>',
      );
      expect(capture.info[0]).toContain(archiveAwsPrecedenceDescription);
      expect(process.exitCode).toBe(0);
    });

    it('list includes archive.awsProfile and archive.awsRegion in whitelisted keys', async () => {
      const root = await createRepoRoot();
      await writeFile(
        join(root, '.oat', 'config.json'),
        `${JSON.stringify({
          version: 1,
          archive: { awsProfile: 'work-sso', awsRegion: 'us-east-1' },
        })}\n`,
        'utf8',
      );
      const { command, capture } = createHarness({ cwd: root });

      await runCommand(command, ['list']);

      expect(capture.info[0]).toContain('archive.awsProfile');
      expect(capture.info[0]).toContain('work-sso');
      expect(capture.info[0]).toContain('archive.awsRegion');
      expect(capture.info[0]).toContain('us-east-1');
      expect(process.exitCode).toBe(0);
    });

    it('gets archive.awsProfile from shared config via get', async () => {
      const root = await createRepoRoot();
      await writeFile(
        join(root, '.oat', 'config.json'),
        `${JSON.stringify({
          version: 1,
          archive: { awsProfile: 'work-sso' },
        })}\n`,
        'utf8',
      );
      const { command, capture } = createHarness({ cwd: root });

      await runCommand(command, ['get', 'archive.awsProfile']);

      expect(capture.info[0]).toBe('work-sso');
      expect(process.exitCode).toBe(0);
    });

    it('gets archive.awsRegion from shared config via get', async () => {
      const root = await createRepoRoot();
      await writeFile(
        join(root, '.oat', 'config.json'),
        `${JSON.stringify({
          version: 1,
          archive: { awsRegion: 'us-east-1' },
        })}\n`,
        'utf8',
      );
      const { command, capture } = createHarness({ cwd: root });

      await runCommand(command, ['get', 'archive.awsRegion']);

      expect(capture.info[0]).toBe('us-east-1');
      expect(process.exitCode).toBe(0);
    });
  });
});
