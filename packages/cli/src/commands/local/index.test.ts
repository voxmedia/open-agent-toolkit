import type { CommandContext, GlobalOptions } from '@app/command-context';
import { createLoggerCapture } from '@commands/__tests__/helpers';
import { Command } from 'commander';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createLocalCommand } from './index';

const mocks = vi.hoisted(() => ({
  buildCommandContext: vi.fn(),
  readOatConfig: vi.fn(),
  resolveLocalPaths: vi.fn(),
  resolveProjectRoot: vi.fn(),
  syncLocalPaths: vi.fn(),
}));

vi.mock('@app/command-context', () => ({
  buildCommandContext: mocks.buildCommandContext,
}));
vi.mock('@config/oat-config', () => ({
  readOatConfig: mocks.readOatConfig,
  resolveLocalPaths: mocks.resolveLocalPaths,
}));
vi.mock('@fs/paths', () => ({
  resolveProjectRoot: mocks.resolveProjectRoot,
}));
vi.mock('./sync', () => ({ syncLocalPaths: mocks.syncLocalPaths }));

async function runSync(globals: string[] = []): Promise<void> {
  const program = new Command().name('oat').option('--json').exitOverride();
  program.addCommand(createLocalCommand());
  await program.parseAsync([...globals, 'local', 'sync', '/worktree'], {
    from: 'user',
  });
}

describe('createLocalCommand sync output', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.exitCode = undefined;
    mocks.resolveProjectRoot.mockResolvedValue('/repo');
    mocks.readOatConfig.mockResolvedValue({});
    mocks.resolveLocalPaths.mockReturnValue(['existing', 'nested', 'missing']);
    mocks.syncLocalPaths.mockResolvedValue({
      entries: [
        { path: 'existing', status: 'skipped' },
        { path: 'nested', status: 'skipped', reason: 'nested-worktree' },
        { path: 'missing', status: 'missing' },
      ],
      copied: 0,
      skipped: 2,
      missing: 1,
    });
  });

  it('shows a stable reason only for skipped entries that provide one', async () => {
    const capture = createLoggerCapture();
    mocks.buildCommandContext.mockImplementation(
      (options: GlobalOptions): CommandContext => ({
        scope: 'project',
        dryRun: false,
        verbose: false,
        json: options.json ?? false,
        cwd: '/repo',
        home: '/home',
        interactive: false,
        logger: capture.logger,
      }),
    );

    await runSync();

    expect(capture.info[0]).toContain('skipped  existing');
    expect(capture.info[0]).not.toContain('existing (');
    expect(capture.info[1]).toContain('skipped  nested (nested-worktree)');
    expect(process.exitCode).toBe(0);
  });

  it('keeps the JSON sync result unchanged', async () => {
    const capture = createLoggerCapture();
    mocks.buildCommandContext.mockImplementation(
      (options: GlobalOptions): CommandContext => ({
        scope: 'project',
        dryRun: false,
        verbose: false,
        json: options.json ?? false,
        cwd: '/repo',
        home: '/home',
        interactive: false,
        logger: capture.logger,
      }),
    );

    await runSync(['--json']);

    expect(capture.jsonPayloads).toEqual([
      {
        status: 'ok',
        entries: [
          { path: 'existing', status: 'skipped' },
          { path: 'nested', status: 'skipped', reason: 'nested-worktree' },
          { path: 'missing', status: 'missing' },
        ],
        copied: 0,
        skipped: 2,
        missing: 1,
      },
    ]);
    expect(process.exitCode).toBe(0);
  });
});
