import { mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { parseAsyncMock, createProgramMock, registerCommandsMock } = vi.hoisted(
  () => ({
    parseAsyncMock: vi.fn<(...args: unknown[]) => Promise<void>>(),
    createProgramMock: vi.fn(),
    registerCommandsMock: vi.fn(),
  }),
);

vi.mock('./app/create-program', () => ({
  createProgram: createProgramMock,
}));

vi.mock('./commands', () => ({
  registerCommands: registerCommandsMock,
}));

import { isEntrypoint, main, normalizeArgv } from './index';

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
    parseAsyncMock.mockReset();
    createProgramMock.mockReset();
    registerCommandsMock.mockReset();
    parseAsyncMock.mockResolvedValue(undefined);
    createProgramMock.mockReturnValue({ parseAsync: parseAsyncMock });
  });

  it('parses normalized argv so --dry-run is not dropped', async () => {
    await main(['node', 'cli.js', '--', 'sync', '--scope', 'all', '--dry-run']);

    expect(createProgramMock).toHaveBeenCalledTimes(1);
    expect(registerCommandsMock).toHaveBeenCalledTimes(1);
    expect(parseAsyncMock).toHaveBeenCalledWith([
      'node',
      'cli.js',
      'sync',
      '--scope',
      'all',
      '--dry-run',
    ]);
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
