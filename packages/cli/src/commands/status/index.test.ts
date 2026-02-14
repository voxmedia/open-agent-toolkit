import { Command } from 'commander';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CommandContext, GlobalOptions } from '../../app/command-context';
import type { DriftReport } from '../../drift';
import type { Manifest, ManifestEntry } from '../../manifest';
import type { ProviderAdapter } from '../../providers/shared';
import type { Scope } from '../../shared/types';
import type { CliLogger } from '../../ui/logger';
import { createStatusCommand } from './index';

interface LoggerCapture {
  info: string[];
  warn: string[];
  error: string[];
  success: string[];
  debug: string[];
  jsonPayloads: unknown[];
  logger: CliLogger;
}

interface TestHarnessOptions {
  manifestEntries?: ManifestEntry[];
  driftReports?: DriftReport[];
  strayReports?: DriftReport[];
  interactive?: boolean;
  confirmResponses?: boolean[];
}

const REMEDIATION_TEXT = 'Run "oat init" to adopt stray entries.';

function createManifestEntry(
  overrides: Partial<ManifestEntry> = {},
): ManifestEntry {
  return {
    canonicalPath: '.agents/skills/skill-one',
    providerPath: '.claude/skills/skill-one',
    provider: 'claude',
    contentType: 'skill',
    strategy: 'symlink',
    contentHash: null,
    lastSynced: '2026-02-14T00:00:00.000Z',
    ...overrides,
  };
}

function createAdapter(): ProviderAdapter {
  return {
    name: 'claude',
    displayName: 'Claude Code',
    defaultStrategy: 'symlink',
    projectMappings: [
      {
        contentType: 'skill',
        canonicalDir: '.agents/skills',
        providerDir: '.claude/skills',
        nativeRead: false,
      },
    ],
    userMappings: [
      {
        contentType: 'skill',
        canonicalDir: '.agents/skills',
        providerDir: '.claude/skills',
        nativeRead: false,
      },
    ],
    detect: async () => true,
  };
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

function createManifest(entries: ManifestEntry[]): Manifest {
  return {
    version: 1,
    oatVersion: '0.0.1',
    entries,
    lastUpdated: '2026-02-14T00:00:00.000Z',
  };
}

function formatReports(reports: DriftReport[]): string {
  if (reports.length === 0) {
    return 'No managed entries found.';
  }

  return reports
    .map((report) => {
      const label =
        report.state.status === 'drifted'
          ? `drifted:${report.state.reason}`
          : report.state.status;
      return `${report.provider}:${label}`;
    })
    .join('\n');
}

function createHarness(options: TestHarnessOptions = {}): {
  capture: LoggerCapture;
  command: Command;
  confirmAction: ReturnType<typeof vi.fn>;
  adoptStray: ReturnType<typeof vi.fn>;
  saveManifest: ReturnType<typeof vi.fn>;
} {
  const capture = createLoggerCapture();
  const adapter = createAdapter();
  const fallbackManifestEntries =
    options.driftReports && options.driftReports.length === 0
      ? []
      : [createManifestEntry()];
  const manifestEntries = options.manifestEntries ?? fallbackManifestEntries;
  const driftReports =
    options.driftReports ??
    (manifestEntries.length > 0
      ? [
          {
            canonical:
              manifestEntries[0]?.canonicalPath ?? '.agents/skills/skill-one',
            provider: 'claude',
            providerPath:
              manifestEntries[0]?.providerPath ?? '.claude/skills/skill-one',
            state: { status: 'in_sync' as const },
          },
        ]
      : []);
  const strayReports = options.strayReports ?? [];
  const interactive = options.interactive ?? true;
  const confirmResponses = [...(options.confirmResponses ?? [])];
  const confirmAction = vi.fn(async () => confirmResponses.shift() ?? false);
  const adoptStray = vi.fn(async (_scopeRoot, _stray, manifest: Manifest) => {
    return manifest;
  });
  const saveManifest = vi.fn(async () => undefined);
  let driftIndex = 0;

  const command = createStatusCommand({
    buildCommandContext: (globalOptions: GlobalOptions): CommandContext => ({
      scope: (globalOptions.scope ?? 'project') as Scope,
      apply: false,
      verbose: globalOptions.verbose ?? false,
      json: globalOptions.json ?? false,
      cwd: globalOptions.cwd ?? '/tmp/workspace',
      home: '/tmp/home',
      interactive: interactive && !(globalOptions.json ?? false),
      logger: capture.logger,
    }),
    resolveScopeRoot: vi.fn(async () => '/tmp/workspace'),
    loadManifest: vi.fn(async () => createManifest(manifestEntries)),
    saveManifest,
    scanCanonical: vi.fn(async () => []),
    getAdapters: () => [adapter],
    getActiveAdapters: vi.fn(async (adapters: ProviderAdapter[]) => adapters),
    getSyncMappings: vi.fn(() => adapter.projectMappings),
    detectDrift: vi.fn(async () => {
      const report = driftReports[driftIndex] ?? driftReports.at(-1);
      driftIndex += 1;
      return report ?? driftReports[0]!;
    }),
    detectStrays: vi.fn(async () => strayReports),
    confirmAction,
    adoptStray,
    formatStatusTable: formatReports,
  });

  return { capture, command, confirmAction, adoptStray, saveManifest };
}

async function runStatusCommand(
  command: Command,
  argv: string[] = [],
): Promise<void> {
  const program = new Command()
    .name('oat')
    .option('--json')
    .option('--verbose')
    .option('--scope <scope>')
    .option('--cwd <path>')
    .exitOverride();

  program.addCommand(command);

  await program.parseAsync([...argv, 'status'], {
    from: 'user',
  });
}

describe('createStatusCommand', () => {
  let originalExitCode: number | undefined;

  beforeEach(() => {
    originalExitCode = process.exitCode;
    process.exitCode = undefined;
  });

  afterEach(() => {
    process.exitCode = originalExitCode;
  });

  it('reports all in_sync when no drift', async () => {
    const { capture, command } = createHarness({
      driftReports: [
        {
          canonical: '.agents/skills/skill-one',
          provider: 'claude',
          providerPath: '.claude/skills/skill-one',
          state: { status: 'in_sync' },
        },
      ],
    });

    await runStatusCommand(command, ['--scope', 'project']);

    expect(capture.info[0]).toContain('in_sync');
  });

  it('reports drifted entries with reasons', async () => {
    const { capture, command } = createHarness({
      driftReports: [
        {
          canonical: '.agents/skills/skill-one',
          provider: 'claude',
          providerPath: '.claude/skills/skill-one',
          state: { status: 'drifted', reason: 'modified' },
        },
      ],
    });

    await runStatusCommand(command, ['--scope', 'project']);

    expect(capture.info[0]).toContain('drifted:modified');
  });

  it('reports missing entries', async () => {
    const { capture, command } = createHarness({
      driftReports: [
        {
          canonical: '.agents/skills/skill-one',
          provider: 'claude',
          providerPath: '.claude/skills/skill-one',
          state: { status: 'missing' },
        },
      ],
    });

    await runStatusCommand(command, ['--scope', 'project']);

    expect(capture.info[0]).toContain('missing');
  });

  it('reports strays with remediation text', async () => {
    const { capture, command } = createHarness({
      interactive: false,
      driftReports: [],
      strayReports: [
        {
          canonical: null,
          provider: 'claude',
          providerPath: '.claude/skills/stray-skill',
          state: { status: 'stray' },
        },
      ],
    });

    await runStatusCommand(command, ['--scope', 'project']);

    expect(capture.warn).toContain(REMEDIATION_TEXT);
  });

  it('prompts per stray and adopts only confirmed entries in interactive mode', async () => {
    const { command, confirmAction, adoptStray, saveManifest } = createHarness({
      interactive: true,
      driftReports: [],
      strayReports: [
        {
          canonical: null,
          provider: 'claude',
          providerPath: '.claude/skills/stray-one',
          state: { status: 'stray' },
        },
        {
          canonical: null,
          provider: 'claude',
          providerPath: '.claude/skills/stray-two',
          state: { status: 'stray' },
        },
      ],
      confirmResponses: [true, false],
    });

    await runStatusCommand(command, ['--scope', 'project']);

    expect(confirmAction).toHaveBeenCalledTimes(2);
    expect(confirmAction.mock.calls[0]?.[0]).toContain(
      '.claude/skills/stray-one',
    );
    expect(confirmAction.mock.calls[1]?.[0]).toContain(
      '.claude/skills/stray-two',
    );
    expect(adoptStray).toHaveBeenCalledTimes(1);
    expect(saveManifest).toHaveBeenCalledTimes(1);
  });

  it('outputs JSON when --json flag set', async () => {
    const { capture, command } = createHarness({
      interactive: false,
      driftReports: [],
      strayReports: [
        {
          canonical: null,
          provider: 'claude',
          providerPath: '.claude/skills/stray-skill',
          state: { status: 'stray' },
        },
      ],
    });

    await runStatusCommand(command, ['--scope', 'project', '--json']);

    expect(capture.jsonPayloads).toHaveLength(1);
    expect(capture.info).toHaveLength(0);
    expect(capture.warn).toHaveLength(0);
    expect(capture.jsonPayloads[0]).toMatchObject({
      scope: 'project',
      remediation: REMEDIATION_TEXT,
      summary: {
        stray: 1,
      },
    });
  });

  it('does not prompt in non-interactive mode', async () => {
    const { command, confirmAction } = createHarness({
      interactive: false,
      driftReports: [],
      strayReports: [
        {
          canonical: null,
          provider: 'claude',
          providerPath: '.claude/skills/stray-skill',
          state: { status: 'stray' },
        },
      ],
    });

    await runStatusCommand(command, ['--scope', 'project']);

    expect(confirmAction).not.toHaveBeenCalled();
  });

  it('exits 0 when all in sync', async () => {
    const { command } = createHarness({
      driftReports: [
        {
          canonical: '.agents/skills/skill-one',
          provider: 'claude',
          providerPath: '.claude/skills/skill-one',
          state: { status: 'in_sync' },
        },
      ],
      strayReports: [],
    });

    await runStatusCommand(command, ['--scope', 'project']);

    expect(process.exitCode).toBe(0);
  });

  it('exits 1 when drift or strays detected', async () => {
    const { command } = createHarness({
      driftReports: [
        {
          canonical: '.agents/skills/skill-one',
          provider: 'claude',
          providerPath: '.claude/skills/skill-one',
          state: { status: 'drifted', reason: 'replaced' },
        },
      ],
      strayReports: [],
    });

    await runStatusCommand(command, ['--scope', 'project']);

    expect(process.exitCode).toBe(1);
  });
});
