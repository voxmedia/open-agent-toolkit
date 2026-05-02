import type { CommandContext, GlobalOptions } from '@app/command-context';
import {
  createLoggerCapture,
  type LoggerCapture,
} from '@commands/__tests__/helpers';
import { getInstalledCanonicalPaths } from '@commands/tools/shared/install-sync-context';
import type { ToolInfo } from '@commands/tools/shared/types';
import type { OatConfig } from '@config/oat-config';
import type { Scope } from '@shared/types';
import { Command } from 'commander';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createInitToolsBrainstormCommand } from './index';

interface HarnessOptions {
  scope?: Scope;
  interactive?: boolean;
  confirmResponses?: boolean[];
  result?: {
    copiedSkills: string[];
    updatedSkills: string[];
    skippedSkills: string[];
    outdatedSkills: Array<{
      name: string;
      installed: string | null;
      bundled: string | null;
    }>;
  };
  scanToolsResults?: ToolInfo[];
  oatConfig?: OatConfig;
}

function createHarness(options: HarnessOptions = {}): {
  capture: LoggerCapture;
  command: Command;
  resolveProjectRoot: ReturnType<typeof vi.fn>;
  resolveScopeRoot: ReturnType<typeof vi.fn>;
  resolveAssetsRoot: ReturnType<typeof vi.fn>;
  installBrainstorm: ReturnType<typeof vi.fn>;
  confirmAction: ReturnType<typeof vi.fn>;
  scanTools: ReturnType<typeof vi.fn>;
  readOatConfig: ReturnType<typeof vi.fn>;
  writeOatConfig: ReturnType<typeof vi.fn>;
  configWrites: OatConfig[];
} {
  const capture = createLoggerCapture();
  const confirmResponses = [...(options.confirmResponses ?? [])];
  const configWrites: OatConfig[] = [];

  const resolveProjectRoot = vi.fn(async () => '/tmp/workspace');
  const resolveScopeRoot = vi.fn(
    (_scope: 'project' | 'user', _cwd, home) => home,
  );
  const resolveAssetsRoot = vi.fn(async () => '/tmp/assets');
  const installBrainstorm = vi.fn(async () => {
    return (
      options.result ?? {
        copiedSkills: ['oat-brainstorm'],
        updatedSkills: [],
        skippedSkills: [],
        outdatedSkills: [],
      }
    );
  });
  const confirmAction = vi.fn(async () => confirmResponses.shift() ?? true);
  const scanTools = vi.fn(
    async (scanOptions: { scope: 'project' | 'user' }) => {
      const all = options.scanToolsResults ?? [];
      return all.filter((tool) => tool.scope === scanOptions.scope);
    },
  );
  const readOatConfig = vi.fn(
    async () => options.oatConfig ?? ({ version: 1 } satisfies OatConfig),
  );
  const writeOatConfig = vi.fn(async (_repoRoot: string, config: OatConfig) => {
    configWrites.push(config);
  });

  const command = createInitToolsBrainstormCommand({
    buildCommandContext: (globalOptions: GlobalOptions): CommandContext => ({
      scope: (globalOptions.scope ?? options.scope ?? 'all') as Scope,
      dryRun: false,
      verbose: globalOptions.verbose ?? false,
      json: globalOptions.json ?? false,
      cwd: globalOptions.cwd ?? '/tmp/workspace',
      home: '/tmp/home',
      interactive: options.interactive ?? !(globalOptions.json ?? false),
      logger: capture.logger,
    }),
    resolveProjectRoot,
    resolveScopeRoot,
    resolveAssetsRoot,
    installBrainstorm,
    confirmAction,
    scanTools,
    readOatConfig,
    writeOatConfig,
  });

  return {
    capture,
    command,
    resolveProjectRoot,
    resolveScopeRoot,
    resolveAssetsRoot,
    installBrainstorm,
    confirmAction,
    scanTools,
    readOatConfig,
    writeOatConfig,
    configWrites,
  };
}

async function runCommand(
  command: Command,
  args: string[] = [],
  globalArgs: string[] = [],
): Promise<void> {
  const program = new Command()
    .name('oat')
    .option('--json')
    .option('--verbose')
    .option('--scope <scope>')
    .option('--cwd <path>')
    .exitOverride();

  const init = new Command('init');
  const tools = new Command('tools');
  tools.addCommand(command);
  init.addCommand(tools);
  program.addCommand(init);

  await program.parseAsync(
    [...globalArgs, 'init', 'tools', 'brainstorm', ...args],
    { from: 'user' },
  );
}

describe('createInitToolsBrainstormCommand', () => {
  let originalExitCode: number | undefined;

  beforeEach(() => {
    originalExitCode = process.exitCode;
    process.exitCode = undefined;
  });

  afterEach(() => {
    process.exitCode = originalExitCode;
  });

  it('forwards correct args to installBrainstorm', async () => {
    const { command, installBrainstorm } = createHarness();

    await runCommand(command, ['--force'], ['--scope', 'project']);

    expect(installBrainstorm).toHaveBeenCalledWith({
      assetsRoot: '/tmp/assets',
      targetRoot: '/tmp/workspace',
      force: true,
    });
  });

  it('default scope (all) resolves to user via PACK_METADATA defaultScope', async () => {
    const { command, resolveScopeRoot, installBrainstorm } = createHarness({
      scope: 'all',
    });

    await runCommand(command);

    expect(resolveScopeRoot).toHaveBeenCalledWith(
      'user',
      '/tmp/workspace',
      '/tmp/home',
    );
    expect(installBrainstorm).toHaveBeenCalledWith(
      expect.objectContaining({ targetRoot: '/tmp/home' }),
    );
  });

  it('--scope user installs to home directory', async () => {
    const { command, resolveScopeRoot, installBrainstorm } = createHarness();

    await runCommand(command, [], ['--scope', 'user']);

    expect(resolveScopeRoot).toHaveBeenCalledWith(
      'user',
      '/tmp/workspace',
      '/tmp/home',
    );
    expect(installBrainstorm).toHaveBeenCalledWith(
      expect.objectContaining({ targetRoot: '/tmp/home' }),
    );
  });

  it('--scope project installs to project root', async () => {
    const { command, resolveProjectRoot, installBrainstorm } = createHarness();

    await runCommand(command, [], ['--scope', 'project']);

    expect(resolveProjectRoot).toHaveBeenCalledWith('/tmp/workspace');
    expect(installBrainstorm).toHaveBeenCalledWith(
      expect.objectContaining({ targetRoot: '/tmp/workspace' }),
    );
  });

  it('--force with interactive confirms before overwriting', async () => {
    const { command, confirmAction, installBrainstorm, capture } =
      createHarness({
        interactive: true,
        confirmResponses: [false],
      });

    await runCommand(command, ['--force'], ['--scope', 'project']);

    expect(confirmAction).toHaveBeenCalledTimes(1);
    expect(installBrainstorm).not.toHaveBeenCalled();
    expect(capture.info.at(-1)).toContain('Cancelled');
    expect(process.exitCode).toBe(0);
    expect(getInstalledCanonicalPaths(command)).toEqual([]);
  });

  it('records installed canonical paths only after a successful install', async () => {
    const { command } = createHarness();

    await runCommand(command, [], ['--scope', 'project']);

    expect(getInstalledCanonicalPaths(command)).not.toEqual([]);
  });

  it('text output shows counts and sync reminder', async () => {
    const { command, capture } = createHarness();

    await runCommand(command, [], ['--scope', 'project']);

    expect(capture.info[0]).toContain('Installed brainstorm tool pack');
    expect(capture.info.some((line) => line.includes('Skills: copied=1'))).toBe(
      true,
    );
    expect(capture.info.at(-1)).toContain('oat sync --scope project');
    expect(process.exitCode).toBe(0);
  });

  it('json output emits full result', async () => {
    const { command, capture } = createHarness();

    await runCommand(command, [], ['--scope', 'project', '--json']);

    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'ok',
      scope: 'project',
      targetRoot: '/tmp/workspace',
      assetsRoot: '/tmp/assets',
      result: {
        copiedSkills: ['oat-brainstorm'],
      },
    });
    expect(process.exitCode).toBe(0);
  });

  it('writes tools.brainstorm: true to config on successful install', async () => {
    const { command, configWrites, writeOatConfig } = createHarness();

    await runCommand(command, [], ['--scope', 'user']);

    expect(writeOatConfig).toHaveBeenCalledTimes(1);
    expect(configWrites[0]).toMatchObject({
      version: 1,
      tools: { brainstorm: true },
    });
    expect(process.exitCode).toBe(0);
  });

  it('preserves existing tools config keys when writing brainstorm flag', async () => {
    const { command, configWrites } = createHarness({
      oatConfig: {
        version: 1,
        tools: { ideas: true, workflows: true },
      },
    });

    await runCommand(command, [], ['--scope', 'user']);

    expect(configWrites[0]?.tools).toEqual({
      ideas: true,
      workflows: true,
      brainstorm: true,
    });
  });

  it('does not write config when install is cancelled', async () => {
    const { command, writeOatConfig } = createHarness({
      interactive: true,
      confirmResponses: [false],
    });

    await runCommand(command, ['--force'], ['--scope', 'project']);

    expect(writeOatConfig).not.toHaveBeenCalled();
  });

  it('migration safety: prefers existing project install over user defaultScope', async () => {
    // Brainstorm is currently installed at project scope; re-running the
    // subcommand without an explicit --scope must keep it at project
    // scope rather than silently migrating to user (PACK_METADATA default).
    const { command, scanTools, installBrainstorm, resolveProjectRoot } =
      createHarness({
        scope: 'all',
        scanToolsResults: [
          {
            name: 'oat-brainstorm',
            type: 'skill',
            scope: 'project',
            pack: 'brainstorm',
            version: '0.1.0',
            bundledVersion: '0.1.0',
            status: 'current',
          } as ToolInfo,
        ],
      });

    await runCommand(command);

    expect(scanTools).toHaveBeenCalled();
    expect(resolveProjectRoot).toHaveBeenCalled();
    expect(installBrainstorm).toHaveBeenCalledWith(
      expect.objectContaining({ targetRoot: '/tmp/workspace' }),
    );
  });

  it('migration safety: prefers existing user install over defaultScope when both metadata and existing match', async () => {
    const { command, scanTools, installBrainstorm } = createHarness({
      scope: 'all',
      scanToolsResults: [
        {
          name: 'oat-brainstorm',
          type: 'skill',
          scope: 'user',
          pack: 'brainstorm',
          version: '0.1.0',
          bundledVersion: '0.1.0',
          status: 'current',
        } as ToolInfo,
      ],
    });

    await runCommand(command);

    expect(scanTools).toHaveBeenCalled();
    expect(installBrainstorm).toHaveBeenCalledWith(
      expect.objectContaining({ targetRoot: '/tmp/home' }),
    );
  });

  it('explicit --scope overrides existing-install detection', async () => {
    const { command, installBrainstorm } = createHarness({
      scanToolsResults: [
        {
          name: 'oat-brainstorm',
          type: 'skill',
          scope: 'user',
          pack: 'brainstorm',
          version: '0.1.0',
          bundledVersion: '0.1.0',
          status: 'current',
        } as ToolInfo,
      ],
    });

    await runCommand(command, [], ['--scope', 'project']);

    expect(installBrainstorm).toHaveBeenCalledWith(
      expect.objectContaining({ targetRoot: '/tmp/workspace' }),
    );
  });
});
