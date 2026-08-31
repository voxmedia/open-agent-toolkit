import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
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
import type { ProviderAdapter, ProviderScopeContext } from '@providers/shared';
import type { Scope } from '@shared/types';
import { Command } from 'commander';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createProvidersSetCommand } from './index';

interface HarnessOptions {
  scope?: Scope;
  cwd?: string;
  home?: string;
  adapters?: ProviderAdapter[];
  providerContext?: ProviderScopeContext;
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
      dryRun: false,
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
    ...(options.providerContext
      ? {
          resolveProviderScopeContext: vi.fn(
            async () => options.providerContext!,
          ),
        }
      : {}),
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
  // --scope is now a per-command option on the set command (via withScopeOption);
  // it is no longer registered on the root program. Pass scope in commandArgs.
  const program = new Command()
    .name('oat')
    .option('--json')
    .option('--verbose')
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

  it('documents project default and project or user sync config scopes', () => {
    const help = createProvidersSetCommand().helpInformation();
    const normalizedHelp = help.replace(/\s+/g, ' ');

    expect(normalizedHelp).toContain(
      "Enable or disable providers in the selected scope's sync config",
    );
    expect(normalizedHelp).toContain('(project by default)');
    expect(normalizedHelp).toContain('--scope <scope>');
    expect(normalizedHelp).toContain('Sync config scope: project or user');
    expect(normalizedHelp).toContain('default: "project"');
  });

  it('succeeds without --scope (defaults to project scope)', async () => {
    // p01-t03: bare invocation should not require --scope project
    const root = await mkdtemp(join(tmpdir(), 'oat-providers-set-'));
    tempDirs.push(root);

    const { command } = createHarness({ cwd: root });

    await runCommand(command, {
      commandArgs: ['--enabled', 'claude'],
    });

    // Command should succeed without explicit --scope
    expect(process.exitCode).toBe(0);

    const configPath = join(root, '.oat', 'sync', 'config.json');
    const raw = await readFile(configPath, 'utf8');
    const parsed = JSON.parse(raw);
    expect(parsed.providers.claude.enabled).toBe(true);
  });

  it('writes enabled and disabled providers to project config', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-providers-set-'));
    tempDirs.push(root);

    const { command } = createHarness({ cwd: root });

    await runCommand(command, {
      commandArgs: [
        '--scope',
        'project',
        '--enabled',
        'claude,cursor',
        '--disabled',
        'codex',
      ],
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
      commandArgs: ['--scope', 'project', '--enabled', 'claude,unknown'],
    });

    expect(process.exitCode).toBe(1);
    expect(capture.error[0]).toContain('Unknown providers');
  });

  it('accepts a provider registered only through the scope context', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-providers-set-'));
    tempDirs.push(root);
    const adapter = createAdapter('registry-only');
    const { command } = createHarness({
      cwd: root,
      adapters: [],
      providerContext: {
        scope: 'project',
        configSource: '<project>/.oat/sync/config.json',
        activeProviders: [],
        detectedProviders: [],
        mismatches: { detectedUnset: [], detectedDisabled: [] },
        activation: [],
        registrations: [{ adapter, extensions: [], capabilities: [] }],
      },
    });

    await runCommand(command, {
      commandArgs: ['--scope', 'project', '--enabled', 'registry-only'],
    });

    const config = JSON.parse(
      await readFile(join(root, '.oat', 'sync', 'config.json'), 'utf8'),
    );
    expect(config.providers['registry-only'].enabled).toBe(true);
    expect(process.exitCode).toBe(0);
  });

  it('rejects providers present in both enabled and disabled lists', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-providers-set-'));
    tempDirs.push(root);

    const { command, capture } = createHarness({ cwd: root });

    await runCommand(command, {
      commandArgs: [
        '--scope',
        'project',
        '--enabled',
        'claude',
        '--disabled',
        'claude',
      ],
    });

    expect(process.exitCode).toBe(1);
    expect(capture.error[0]).toContain('both enabled and disabled');
  });

  it('rejects missing enabled/disabled options', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-providers-set-'));
    tempDirs.push(root);

    const { command, capture } = createHarness({ cwd: root });

    await runCommand(command, {
      commandArgs: ['--scope', 'project'],
    });

    expect(process.exitCode).toBe(1);
    expect(capture.error[0]).toContain('No provider updates requested');
  });

  it('rejects aggregate scope', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-providers-set-'));
    tempDirs.push(root);

    const { command, capture } = createHarness({ cwd: root });

    await runCommand(command, {
      commandArgs: ['--scope', 'all', '--enabled', 'claude'],
    });

    expect(process.exitCode).toBe(1);
    expect(capture.error[0]).toContain('requires one concrete scope');
  });

  it('writes provider enablement at user scope', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-providers-set-'));
    tempDirs.push(root);

    const { command, resolveScopeRoot } = createHarness({ cwd: root });

    await runCommand(command, {
      commandArgs: ['--scope', 'user', '--enabled', 'claude'],
    });

    expect(process.exitCode).toBe(0);
    expect(resolveScopeRoot).toHaveBeenCalledWith(
      'user',
      expect.objectContaining({ scope: 'user' }),
    );
    const config = await defaultLoadSyncConfig(
      join(root, '.oat', 'sync', 'config.json'),
    );
    expect(config.providers.claude?.enabled).toBe(true);
  });

  it('uses the canonical user config schema and preserves legacy siblings', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-providers-set-'));
    tempDirs.push(root);
    await mkdir(join(root, '.oat'), { recursive: true });
    await writeFile(
      join(root, '.oat', 'config.json'),
      JSON.stringify({
        version: 1,
        tools: { workflows: true },
        futureField: { preserved: true },
        knownStrays: ['.cursor/skills/user-only'],
      }),
      'utf8',
    );

    const { command } = createHarness({ cwd: root });
    await runCommand(command, {
      commandArgs: ['--scope', 'user', '--enabled', 'claude'],
    });

    expect(
      JSON.parse(
        await readFile(join(root, '.oat', 'sync', 'config.json'), 'utf8'),
      ),
    ).toMatchObject({
      providers: { claude: { enabled: true } },
      knownStrays: ['.cursor/skills/user-only'],
    });
    expect(
      JSON.parse(await readFile(join(root, '.oat', 'config.json'), 'utf8')),
    ).toEqual({
      version: 1,
      tools: { workflows: true },
      futureField: { preserved: true },
    });
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
      commandArgs: ['--scope', 'project', '--enabled', 'claude'],
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
