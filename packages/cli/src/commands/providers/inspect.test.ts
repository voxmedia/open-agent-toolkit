import { Command } from 'commander';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CommandContext, GlobalOptions } from '../../app/command-context';
import type { Manifest, ManifestEntry } from '../../manifest';
import type { ProviderAdapter } from '../../providers/shared';
import type { Scope } from '../../shared/types';
import type { CliLogger } from '../../ui/logger';
import { createProvidersInspectCommand } from './inspect';

interface LoggerCapture {
  info: string[];
  warn: string[];
  error: string[];
  success: string[];
  debug: string[];
  jsonPayloads: unknown[];
  logger: CliLogger;
}

interface HarnessOptions {
  adapters?: ProviderAdapter[];
  driftStateByProviderPath?: Record<string, 'in_sync' | 'drifted' | 'missing'>;
}

interface RunInspectArgs {
  provider: string;
  globalArgs?: string[];
}

function createLoggerCapture(): LoggerCapture {
  const info: string[] = [];
  const warn: string[] = [];
  const error: string[] = [];
  const success: string[] = [];
  const debug: string[] = [];
  const jsonPayloads: unknown[] = [];

  return {
    info,
    warn,
    error,
    success,
    debug,
    jsonPayloads,
    logger: {
      debug(message) {
        debug.push(message);
      },
      info(message) {
        info.push(message);
      },
      warn(message) {
        warn.push(message);
      },
      error(message) {
        error.push(message);
      },
      success(message) {
        success.push(message);
      },
      json(payload) {
        jsonPayloads.push(payload);
      },
    },
  };
}

function createAdapter(
  name: string,
  detected: boolean,
  version: string | null,
): ProviderAdapter {
  return {
    name,
    displayName: name === 'claude' ? 'Claude Code' : name,
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
    detectVersion: async () => version,
  };
}

function createManifest(entries: ManifestEntry[]): Manifest {
  return {
    version: 1,
    oatVersion: '0.0.1',
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

function createHarness(options: HarnessOptions = {}): {
  capture: LoggerCapture;
  command: Command;
} {
  const capture = createLoggerCapture();
  const adapters = options.adapters ?? [
    createAdapter('claude', true, '1.2.3'),
    createAdapter('cursor', false, null),
  ];
  const driftStateByProviderPath = options.driftStateByProviderPath ?? {
    '.claude/skills/skill-one': 'in_sync',
    '.claude/skills/skill-two': 'drifted',
  };
  const command = createProvidersInspectCommand({
    buildCommandContext: (globalOptions: GlobalOptions): CommandContext => ({
      scope: (globalOptions.scope ?? 'project') as Scope,
      apply: false,
      verbose: globalOptions.verbose ?? false,
      json: globalOptions.json ?? false,
      cwd: '/tmp/workspace',
      home: '/tmp/home',
      interactive: !(globalOptions.json ?? false),
      logger: capture.logger,
    }),
    resolveScopeRoot: vi.fn(async (scope: 'project' | 'user') => {
      return scope === 'project' ? '/tmp/workspace' : '/tmp/home';
    }),
    getAdapters: () => adapters,
    getSyncMappings: vi.fn((adapter: ProviderAdapter, scope: Scope) => {
      return scope === 'project'
        ? adapter.projectMappings
        : adapter.userMappings;
    }),
    loadManifest: vi.fn(async (manifestPath: string) => {
      if (manifestPath.startsWith('/tmp/home')) {
        return createManifest([]);
      }
      return createManifest([
        createEntry('claude', 'skill-one'),
        createEntry('claude', 'skill-two'),
      ]);
    }),
    detectDrift: vi.fn(async (entry: ManifestEntry) => {
      const state = driftStateByProviderPath[entry.providerPath] ?? 'in_sync';
      if (state === 'drifted') {
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
        state: { status: state },
      };
    }),
  });

  return { capture, command };
}

async function runInspectCommand(
  command: Command,
  { provider, globalArgs = [] }: RunInspectArgs,
): Promise<void> {
  const program = new Command()
    .name('oat')
    .option('--json')
    .option('--verbose')
    .option('--scope <scope>')
    .option('--cwd <path>')
    .exitOverride();

  program.addCommand(command);
  await program.parseAsync([...globalArgs, 'inspect', provider], {
    from: 'user',
  });
}

describe('oat providers inspect', () => {
  let originalExitCode: number | undefined;

  beforeEach(() => {
    originalExitCode = process.exitCode;
    process.exitCode = undefined;
  });

  afterEach(() => {
    process.exitCode = originalExitCode;
  });

  it('shows detailed provider info with path mappings', async () => {
    const { command, capture } = createHarness();

    await runInspectCommand(command, { provider: 'claude' });

    expect(capture.info[0]).toContain('Claude Code');
    expect(capture.info[0]).toContain('.claude/skills');
  });

  it('shows per-mapping sync state', async () => {
    const { command, capture } = createHarness({
      driftStateByProviderPath: {
        '.claude/skills/skill-one': 'missing',
        '.claude/skills/skill-two': 'drifted',
      },
    });

    await runInspectCommand(command, { provider: 'claude' });

    expect(capture.info[0]).toContain('managed=2');
    expect(capture.info[0]).toContain('drifted=1');
    expect(capture.info[0]).toContain('missing=1');
  });

  it('shows CLI version when available', async () => {
    const { command, capture } = createHarness();

    await runInspectCommand(command, { provider: 'claude' });

    expect(capture.info[0]).toContain('Version: 1.2.3');
  });

  it('exits 1 when provider name not found', async () => {
    const { command, capture } = createHarness();

    await runInspectCommand(command, { provider: 'unknown-provider' });

    expect(process.exitCode).toBe(1);
    expect(capture.error[0]).toContain('not found');
  });

  it('resolves provider name case-insensitively', async () => {
    const { command, capture } = createHarness();

    await runInspectCommand(command, { provider: 'ClAuDe' });

    expect(process.exitCode).toBe(0);
    expect(capture.info[0]).toContain('Claude Code');
  });

  it('outputs JSON when --json set', async () => {
    const { command, capture } = createHarness();

    await runInspectCommand(command, {
      provider: 'claude',
      globalArgs: ['--json'],
    });

    expect(capture.info).toHaveLength(0);
    expect(capture.jsonPayloads).toHaveLength(1);
    expect(capture.jsonPayloads[0]).toMatchObject({
      name: 'claude',
      version: '1.2.3',
    });
  });
});
