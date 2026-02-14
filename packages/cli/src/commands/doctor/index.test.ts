import { Command } from 'commander';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CommandContext, GlobalOptions } from '../../app/command-context';
import type { Manifest } from '../../manifest';
import type { Scope } from '../../shared/types';
import type { CliLogger } from '../../ui/logger';
import { createDoctorCommand } from './index';

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
  scope?: Scope;
  pathExists?: Record<string, boolean>;
  loadManifestThrows?: boolean;
  symlinkSupported?: boolean;
  providers?: Array<{
    name: string;
    detected: boolean;
    version: string | null;
  }>;
}

interface RunDoctorArgs {
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
} {
  const capture = createLoggerCapture();
  const scope = options.scope ?? 'project';
  const pathExists = options.pathExists ?? {
    '/tmp/workspace/.agents/skills': true,
    '/tmp/workspace/.agents/agents': true,
    '/tmp/workspace/.oat/sync/manifest.json': true,
  };
  const command = createDoctorCommand({
    buildCommandContext: (globalOptions: GlobalOptions): CommandContext => ({
      scope: (globalOptions.scope ?? scope) as Scope,
      apply: false,
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
  });

  return { capture, command };
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
});
