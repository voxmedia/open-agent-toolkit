import type { ToolInfo } from '@commands/tools/shared/types';
import { Command } from 'commander';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { buildCommandContext, capture } = vi.hoisted(() => {
  const loggerCapture = {
    info: [] as string[],
    warn: [] as string[],
    error: [] as string[],
    success: [] as string[],
    debug: [] as string[],
    jsonPayloads: [] as unknown[],
  };
  return {
    capture: loggerCapture,
    buildCommandContext: vi.fn((options) => ({
      scope: options.scope ?? 'all',
      dryRun: false,
      verbose: options.verbose ?? false,
      json: options.json ?? false,
      cwd: options.cwd ?? '/project',
      home: '/home/user',
      interactive: false,
      logger: {
        info: (message: string) => loggerCapture.info.push(message),
        warn: (message: string) => loggerCapture.warn.push(message),
        error: (message: string) => loggerCapture.error.push(message),
        success: (message: string) => loggerCapture.success.push(message),
        debug: (message: string) => loggerCapture.debug.push(message),
        json: (payload: unknown) => loggerCapture.jsonPayloads.push(payload),
      },
    })),
  };
});

vi.mock('@app/command-context', () => ({
  buildCommandContext,
}));

import type { PackAvailabilityDependencies } from './has-pack';
import { createToolsHasCommand } from './index';

function createTool(scope: 'project' | 'user'): ToolInfo {
  return {
    name: 'oat-project-new',
    type: 'skill',
    scope,
    version: '1.0.0',
    bundledVersion: '1.0.0',
    pack: 'workflows',
    status: 'current',
  };
}

function createDependencies(
  toolsByScope: Partial<Record<'project' | 'user', ToolInfo[]>> = {},
): PackAvailabilityDependencies & {
  scanTools: ReturnType<typeof vi.fn>;
} {
  return {
    resolveAssetsRoot: vi.fn(async () => '/assets'),
    resolveScopeRoot: vi.fn(async (scope) =>
      scope === 'project' ? '/project' : '/home/user',
    ),
    scanTools: vi.fn(async ({ scope }) => toolsByScope[scope] ?? []),
  };
}

async function runCommand(
  command: Command,
  args: string[],
  globalArgs: string[] = [],
): Promise<void> {
  const program = new Command()
    .name('oat')
    .option('--json')
    .option('--verbose')
    .option('--cwd <path>')
    .exitOverride();
  program.addCommand(new Command('tools').addCommand(command));

  await program.parseAsync([...globalArgs, 'tools', 'has', ...args], {
    from: 'user',
  });
}

describe('createToolsHasCommand', () => {
  let originalExitCode: number | undefined;

  beforeEach(() => {
    originalExitCode = process.exitCode;
    process.exitCode = undefined;
    capture.info.length = 0;
    capture.warn.length = 0;
    capture.error.length = 0;
    capture.success.length = 0;
    capture.debug.length = 0;
    capture.jsonPayloads.length = 0;
  });

  afterEach(() => {
    process.exitCode = originalExitCode;
  });

  it('defaults to effective all-scope availability and emits JSON', async () => {
    const dependencies = createDependencies({
      project: [createTool('project')],
      user: [createTool('user')],
    });

    await runCommand(
      createToolsHasCommand(dependencies),
      ['workflows'],
      ['--json'],
    );

    expect(capture.jsonPayloads).toEqual([
      {
        pack: 'workflows',
        available: true,
        scopes: ['project', 'user'],
      },
    ]);
    expect(process.exitCode).toBe(0);
  });

  it.each(['project', 'user'] as const)(
    'supports explicit %s scope and plain boolean output',
    async (scope) => {
      const dependencies = createDependencies({
        project: [createTool('project')],
        user: [createTool('user')],
      });

      await runCommand(createToolsHasCommand(dependencies), [
        'workflows',
        '--scope',
        scope,
      ]);

      expect(capture.info).toEqual(['true']);
      expect(dependencies.scanTools).toHaveBeenCalledTimes(1);
      expect(dependencies.scanTools).toHaveBeenCalledWith(
        expect.objectContaining({ scope }),
      );
      expect(process.exitCode).toBe(0);
    },
  );

  it('prints false and exits zero for a valid unavailable pack', async () => {
    await runCommand(createToolsHasCommand(createDependencies()), ['docs']);

    expect(capture.info).toEqual(['false']);
    expect(process.exitCode).toBe(0);
  });

  it('rejects invalid pack names with exit one', async () => {
    const dependencies = createDependencies();

    await runCommand(createToolsHasCommand(dependencies), ['unknown']);

    expect(capture.error[0]).toContain("Invalid pack 'unknown'");
    expect(dependencies.scanTools).not.toHaveBeenCalled();
    expect(process.exitCode).toBe(1);
  });

  it('uses the standard error envelope and exit two for runtime failures', async () => {
    const dependencies = createDependencies();
    dependencies.scanTools.mockRejectedValue(new Error('scanner exploded'));

    await runCommand(createToolsHasCommand(dependencies), ['docs'], ['--json']);

    expect(capture.jsonPayloads).toEqual([
      { status: 'error', message: 'scanner exploded' },
    ]);
    expect(process.exitCode).toBe(2);
  });
});
