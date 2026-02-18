import { beforeEach, describe, expect, it, vi } from 'vitest';

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

import { main, normalizeArgv } from './index';

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

  it('parses normalized argv so --apply is not dropped', async () => {
    await main(['node', 'cli.js', '--', 'sync', '--scope', 'all', '--apply']);

    expect(createProgramMock).toHaveBeenCalledTimes(1);
    expect(registerCommandsMock).toHaveBeenCalledTimes(1);
    expect(parseAsyncMock).toHaveBeenCalledWith([
      'node',
      'cli.js',
      'sync',
      '--scope',
      'all',
      '--apply',
    ]);
  });
});
