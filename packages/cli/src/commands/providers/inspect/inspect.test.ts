import type { CommandContext, GlobalOptions } from '@app/command-context';
import {
  createLoggerCapture,
  type LoggerCapture,
} from '@commands/__tests__/helpers';
import type { Manifest, ManifestEntry } from '@manifest/index';
import type { ProviderAdapter } from '@providers/shared';
import type { Scope } from '@shared/types';
import { Command } from 'commander';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createProvidersInspectCommand } from './inspect';

interface HarnessOptions {
  adapters?: ProviderAdapter[];
  driftStateByProviderPath?: Record<string, 'in_sync' | 'drifted' | 'missing'>;
}

interface RunInspectArgs {
  provider: string;
  globalArgs?: string[];
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
    oatVersion: '0.0.18',
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
  resolveScopeRoot: ReturnType<typeof vi.fn>;
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
  const resolveScopeRoot = vi.fn(async (scope: 'project' | 'user') => {
    return scope === 'project' ? '/tmp/workspace' : '/tmp/home';
  });
  const command = createProvidersInspectCommand({
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

  return { capture, command, resolveScopeRoot };
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
    expect(capture.info[0]).not.toContain('Project mappings: none');
    expect(capture.info[0]).not.toContain('User mappings: none');
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

  it('supports --scope flag', async () => {
    const { command, resolveScopeRoot } = createHarness();

    await runInspectCommand(command, {
      provider: 'claude',
      globalArgs: ['--scope', 'user'],
    });

    expect(resolveScopeRoot).toHaveBeenCalledTimes(1);
    expect(resolveScopeRoot).toHaveBeenCalledWith(
      'user',
      expect.objectContaining({ scope: 'user' }),
    );
  });
});
