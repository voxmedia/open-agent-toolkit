import { Command } from 'commander';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CommandContext, GlobalOptions } from '../../app/command-context';
import type { DriftReport } from '../../drift';
import type { CanonicalEntry } from '../../engine';
import type { Manifest, ManifestEntry } from '../../manifest';
import type { ProviderAdapter } from '../../providers/shared';
import type { Scope } from '../../shared/types';
import { createLoggerCapture, type LoggerCapture } from '../__tests__/helpers';
import { createStatusCommand } from './index';

interface TestHarnessOptions {
  manifestEntries?: ManifestEntry[];
  driftReports?: DriftReport[];
  strayReports?: DriftReport[];
  canonicalEntries?: CanonicalEntry[];
  interactive?: boolean;
  selectManyResponses?: Array<string[] | null>;
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

function createCanonicalEntry(name = 'skill-one'): CanonicalEntry {
  return {
    name,
    type: 'skill',
    canonicalPath: `/tmp/workspace/.agents/skills/${name}`,
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
  selectManyWithAbort: ReturnType<typeof vi.fn>;
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
  const canonicalEntries = options.canonicalEntries ?? [];
  const interactive = options.interactive ?? true;
  const selectManyResponses = [...(options.selectManyResponses ?? [])];
  const selectManyWithAbort = vi.fn(
    async () => selectManyResponses.shift() ?? [],
  );
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
    scanCanonical: vi.fn(async () => canonicalEntries),
    getAdapters: () => [adapter],
    getActiveAdapters: vi.fn(async (adapters: ProviderAdapter[]) => adapters),
    getSyncMappings: vi.fn(() => adapter.projectMappings),
    detectDrift: vi.fn(async () => {
      const report = driftReports[driftIndex] ?? driftReports.at(-1);
      driftIndex += 1;
      return report ?? driftReports[0]!;
    }),
    detectStrays: vi.fn(async () => strayReports),
    selectManyWithAbort,
    adoptStray,
    formatStatusTable: formatReports,
  });

  return { capture, command, selectManyWithAbort, adoptStray, saveManifest };
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

  it('reports missing entries for canonical content not yet synced', async () => {
    const { capture, command } = createHarness({
      manifestEntries: [],
      driftReports: [],
      canonicalEntries: [createCanonicalEntry('unsynced-skill')],
    });

    await runStatusCommand(command, ['--scope', 'project']);

    expect(capture.info[0]).toContain('missing');
    expect(process.exitCode).toBe(1);
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

  it('prompts with one checklist and adopts only selected entries', async () => {
    const { command, selectManyWithAbort, adoptStray, saveManifest } =
      createHarness({
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
        selectManyResponses: [['0']],
      });

    await runStatusCommand(command, ['--scope', 'project']);

    expect(selectManyWithAbort).toHaveBeenCalledTimes(1);
    expect(selectManyWithAbort.mock.calls[0]?.[0]).toContain(
      'Select stray entries to adopt [project]',
    );
    const choices = selectManyWithAbort.mock.calls[0]?.[1] as Array<{
      label: string;
      value: string;
      description?: string;
    }>;
    expect(choices[0]?.label).toContain('[project] stray-one (claude)');
    expect(choices[0]?.description).toContain('.claude/skills/stray-one');
    expect(choices[1]?.label).toContain('[project] stray-two (claude)');
    expect(choices[1]?.description).toContain('.claude/skills/stray-two');
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
    const { command, selectManyWithAbort } = createHarness({
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

    expect(selectManyWithAbort).not.toHaveBeenCalled();
  });

  it('renders user-scope stray labels as [user] ~/.<provider path>', async () => {
    const { command, selectManyWithAbort } = createHarness({
      interactive: true,
      driftReports: [],
      strayReports: [
        {
          canonical: null,
          provider: 'claude',
          providerPath: '.claude/skills/user-stray',
          state: { status: 'stray' },
        },
      ],
      selectManyResponses: [[]],
    });

    await runStatusCommand(command, ['--scope', 'user']);

    const choices = selectManyWithAbort.mock.calls[0]?.[1] as Array<{
      label: string;
      value: string;
      description?: string;
    }>;
    expect(choices[0]?.label).toContain('[user] user-stray (claude)');
    expect(choices[0]?.description).toContain('~/.claude/skills/user-stray');
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
