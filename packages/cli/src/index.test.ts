import { mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { OAT_VERSION } from '@shared/oat-version';
import { Command } from 'commander';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { UpdateNotifierOptions } from './app/update-notifier';

const {
  actionMock,
  buildCommandContextMock,
  logger,
  maybeNotifyAboutUpdateMock,
  registerCommandsMock,
} = vi.hoisted(() => ({
  actionMock: vi.fn<() => Promise<void>>(),
  buildCommandContextMock: vi.fn(),
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    json: vi.fn(),
    warn: vi.fn(),
  },
  maybeNotifyAboutUpdateMock:
    vi.fn<(options: UpdateNotifierOptions) => Promise<void>>(),
  registerCommandsMock: vi.fn(),
}));

vi.mock('@app/command-context', () => ({
  buildCommandContext: buildCommandContextMock,
}));

vi.mock('./app/update-notifier', () => ({
  maybeNotifyAboutUpdate: maybeNotifyAboutUpdateMock,
}));

vi.mock('./commands', () => ({
  registerCommands: registerCommandsMock,
}));

import { isEntrypoint, main, normalizeArgv } from './index';

function commandContext(
  options: { json?: boolean; interactive?: boolean } = {},
) {
  const json = options.json ?? false;
  return {
    scope: 'all',
    dryRun: false,
    verbose: false,
    json,
    cwd: '/workspace',
    home: '/home/tester',
    interactive: options.interactive ?? !json,
    logger,
  };
}

describe('normalizeArgv', () => {
  it('strips pnpm sentinel -- after script path', () => {
    expect(
      normalizeArgv(['node', 'cli.js', '--', 'sync', '--scope', 'all']),
    ).toEqual(['node', 'cli.js', 'sync', '--scope', 'all']);
  });

  it('keeps argv unchanged when sentinel is absent', () => {
    const argv = ['node', 'cli.js', 'sync', '--scope', 'all'];
    expect(normalizeArgv(argv)).toEqual(argv);
  });
});

describe('main', () => {
  beforeEach(() => {
    actionMock.mockReset();
    actionMock.mockResolvedValue(undefined);
    buildCommandContextMock.mockReset();
    buildCommandContextMock.mockImplementation((options: { json?: boolean }) =>
      commandContext({ json: options.json }),
    );
    logger.warn.mockReset();
    maybeNotifyAboutUpdateMock.mockReset();
    maybeNotifyAboutUpdateMock.mockResolvedValue(undefined);
    registerCommandsMock.mockReset();
    registerCommandsMock.mockImplementation((program: Command) => {
      program
        .configureOutput({
          writeErr: () => undefined,
          writeOut: () => undefined,
        })
        .exitOverride();
      program.command('status').action(actionMock);
    });
  });

  it('runs the notifier once before an actionable command', async () => {
    await main(['node', 'cli.js', 'status']);

    expect(actionMock).toHaveBeenCalledOnce();
    expect(maybeNotifyAboutUpdateMock).toHaveBeenCalledOnce();
    expect(maybeNotifyAboutUpdateMock.mock.invocationCallOrder[0]).toBeLessThan(
      actionMock.mock.invocationCallOrder[0]!,
    );
    const options = maybeNotifyAboutUpdateMock.mock.calls[0]![0];
    expect(options).toMatchObject({
      currentVersion: OAT_VERSION,
      home: '/home/tester',
      interactive: true,
      json: false,
      argv: ['node', 'cli.js', 'status'],
      logger,
    });
    expect(options.env).toBe(process.env);
  });

  it.each([
    ['help', ['node', 'cli.js', '--help'], 'commander.helpDisplayed'],
    ['version', ['node', 'cli.js', '--version'], 'commander.version'],
  ])('does not run the notifier for %s output', async (_name, argv, code) => {
    await expect(main(argv)).rejects.toMatchObject({ code });

    expect(maybeNotifyAboutUpdateMock).not.toHaveBeenCalled();
    expect(actionMock).not.toHaveBeenCalled();
  });

  it('propagates JSON context without emitting an update warning', async () => {
    await main(['node', 'cli.js', '--json', 'status']);

    expect(buildCommandContextMock).toHaveBeenCalledWith(
      expect.objectContaining({ json: true }),
    );
    expect(maybeNotifyAboutUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({ json: true, interactive: false }),
    );
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('propagates non-interactive context without emitting an update warning', async () => {
    buildCommandContextMock.mockReturnValue(
      commandContext({ interactive: false }),
    );

    await main(['node', 'cli.js', 'status']);

    expect(maybeNotifyAboutUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({ json: false, interactive: false }),
    );
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('contains notifier rejection and preserves command completion', async () => {
    maybeNotifyAboutUpdateMock.mockRejectedValue(
      new Error('notifier unavailable'),
    );

    await expect(main(['node', 'cli.js', 'status'])).resolves.toBeUndefined();
    expect(actionMock).toHaveBeenCalledOnce();
  });

  it('parses normalized argv without changing command behavior', async () => {
    await main(['node', 'cli.js', '--', 'status']);

    expect(actionMock).toHaveBeenCalledOnce();
    expect(maybeNotifyAboutUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({ argv: ['node', 'cli.js', 'status'] }),
    );
  });
});

describe('isEntrypoint', () => {
  let tempDir: string | null = null;

  afterEach(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
      tempDir = null;
    }
  });

  it('returns true when argv points at a symlinked entrypoint', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'oat-entrypoint-'));
    const targetPath = join(tempDir, 'dist-index.js');
    const linkPath = join(tempDir, 'oat');

    await writeFile(targetPath, '#!/usr/bin/env node\n', 'utf8');
    await symlink(targetPath, linkPath);

    expect(
      isEntrypoint(['node', linkPath], pathToFileURL(targetPath).href),
    ).toBe(true);
  });

  it('returns false when argv points at a different file', () => {
    expect(
      isEntrypoint(
        ['node', '/tmp/not-the-entrypoint.js'],
        pathToFileURL('/tmp/actual-entrypoint.js').href,
      ),
    ).toBe(false);
  });
});
