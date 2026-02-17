import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { CommandContext, GlobalOptions } from '@app/command-context';
import {
  createLoggerCapture,
  type LoggerCapture,
} from '@commands/__tests__/helpers';
import {
  loadSyncConfig as defaultLoadSyncConfig,
  saveSyncConfig as defaultSaveSyncConfig,
} from '@config/index';
import type { ProviderAdapter } from '@providers/shared';
import type { Scope } from '@shared/types';
import { Command } from 'commander';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createProvidersSetCommand } from './index';

interface HarnessOptions {
  scope?: Scope;
  cwd?: string;
  home?: string;
  adapters?: ProviderAdapter[];
}

interface RunArgs {
  globalArgs?: string[];
  commandArgs?: string[];
}

function createAdapter(name: string): ProviderAdapter {
  return {
    name,
    displayName: name,
    defaultStrategy: 'symlink',
    projectMappings: [],
    userMappings: [],
    detect: async () => true,
  };
}

function createHarness(options: HarnessOptions = {}): {
  capture: LoggerCapture;
  command: Command;
  resolveScopeRoot: ReturnType<typeof vi.fn>;
} {
  const capture = createLoggerCapture();
  const resolveScopeRoot = vi.fn(async () => options.cwd ?? '/tmp/workspace');

  const command = createProvidersSetCommand({
    buildCommandContext: (globalOptions: GlobalOptions): CommandContext => ({
      scope: (globalOptions.scope ?? options.scope ?? 'project') as Scope,
      apply: false,
      verbose: globalOptions.verbose ?? false,
      json: globalOptions.json ?? false,
      cwd: globalOptions.cwd ?? options.cwd ?? '/tmp/workspace',
      home: options.home ?? '/tmp/home',
      interactive: !(globalOptions.json ?? false),
      logger: capture.logger,
    }),
    resolveScopeRoot,
    getAdapters: () =>
      options.adapters ?? [
        createAdapter('claude'),
        createAdapter('cursor'),
        createAdapter('codex'),
      ],
    loadSyncConfig: defaultLoadSyncConfig,
    saveSyncConfig: defaultSaveSyncConfig,
  });

  return {
    capture,
    command,
    resolveScopeRoot,
  };
}

async function runCommand(
  command: Command,
  { globalArgs = [], commandArgs = [] }: RunArgs = {},
): Promise<void> {
  const program = new Command()
    .name('oat')
    .option('--json')
    .option('--verbose')
    .option('--scope <scope>')
    .option('--cwd <path>')
    .exitOverride();

  const providers = new Command('providers');
  providers.addCommand(command);
  program.addCommand(providers);

  await program.parseAsync(
    [...globalArgs, 'providers', 'set', ...commandArgs],
    {
      from: 'user',
    },
  );
}

describe('oat providers set', () => {
  const tempDirs: string[] = [];
  let originalExitCode: number | undefined;

  beforeEach(() => {
    originalExitCode = process.exitCode;
    process.exitCode = undefined;
  });

  afterEach(async () => {
    process.exitCode = originalExitCode;
    await Promise.all(
      tempDirs.map(async (dir) => {
        await rm(dir, { recursive: true, force: true });
      }),
    );
    tempDirs.length = 0;
  });

  it('writes enabled and disabled providers to project config', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-providers-set-'));
    tempDirs.push(root);

    const { command } = createHarness({ cwd: root });

    await runCommand(command, {
      globalArgs: ['--scope', 'project'],
      commandArgs: ['--enabled', 'claude,cursor', '--disabled', 'codex'],
    });

    const configPath = join(root, '.oat', 'sync', 'config.json');
    const raw = await readFile(configPath, 'utf8');
    const parsed = JSON.parse(raw);

    expect(parsed.providers.claude.enabled).toBe(true);
    expect(parsed.providers.cursor.enabled).toBe(true);
    expect(parsed.providers.codex.enabled).toBe(false);
    expect(process.exitCode).toBe(0);
  });

  it('rejects unknown provider names', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-providers-set-'));
    tempDirs.push(root);

    const { command, capture } = createHarness({ cwd: root });

    await runCommand(command, {
      globalArgs: ['--scope', 'project'],
      commandArgs: ['--enabled', 'claude,unknown'],
    });

    expect(process.exitCode).toBe(1);
    expect(capture.error[0]).toContain('Unknown providers');
  });

  it('rejects providers present in both enabled and disabled lists', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-providers-set-'));
    tempDirs.push(root);

    const { command, capture } = createHarness({ cwd: root });

    await runCommand(command, {
      globalArgs: ['--scope', 'project'],
      commandArgs: ['--enabled', 'claude', '--disabled', 'claude'],
    });

    expect(process.exitCode).toBe(1);
    expect(capture.error[0]).toContain('both enabled and disabled');
  });

  it('rejects missing enabled/disabled options', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-providers-set-'));
    tempDirs.push(root);

    const { command, capture } = createHarness({ cwd: root });

    await runCommand(command, {
      globalArgs: ['--scope', 'project'],
      commandArgs: [],
    });

    expect(process.exitCode).toBe(1);
    expect(capture.error[0]).toContain('No provider updates requested');
  });

  it('rejects non-project scope', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-providers-set-'));
    tempDirs.push(root);

    const { command, capture } = createHarness({ cwd: root });

    await runCommand(command, {
      globalArgs: ['--scope', 'all'],
      commandArgs: ['--enabled', 'claude'],
    });

    expect(process.exitCode).toBe(1);
    expect(capture.error[0]).toContain('only --scope project');
  });

  it('rejects user scope', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-providers-set-'));
    tempDirs.push(root);

    const { command, capture } = createHarness({ cwd: root });

    await runCommand(command, {
      globalArgs: ['--scope', 'user'],
      commandArgs: ['--enabled', 'claude'],
    });

    expect(process.exitCode).toBe(1);
    expect(capture.error[0]).toContain('only --scope project');
  });

  it('preserves existing provider strategy when updating enabled', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-providers-set-'));
    tempDirs.push(root);
    await mkdir(join(root, '.oat', 'sync'), { recursive: true });
    await defaultSaveSyncConfig(join(root, '.oat', 'sync', 'config.json'), {
      version: 1,
      defaultStrategy: 'copy',
      providers: {
        claude: { strategy: 'symlink', enabled: false },
      },
    });

    const { command } = createHarness({ cwd: root });

    await runCommand(command, {
      globalArgs: ['--scope', 'project'],
      commandArgs: ['--enabled', 'claude'],
    });

    const config = await defaultLoadSyncConfig(
      join(root, '.oat', 'sync', 'config.json'),
    );

    expect(config.defaultStrategy).toBe('copy');
    expect(config.providers.claude).toEqual({
      strategy: 'symlink',
      enabled: true,
    });
  });
});
