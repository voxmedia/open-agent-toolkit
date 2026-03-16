import { join } from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import { installCore } from './install-core';

function makeCopyDirWithVersionCheck(
  statusBySkill: Record<string, string> = {},
) {
  return vi.fn(
    async (source: string, _destination: string, _force: boolean) => {
      const name = source.split('/').pop()!;
      const status = statusBySkill[name] ?? 'copied';
      return {
        status,
        installedVersion: status === 'outdated' ? '1.0.0' : null,
        bundledVersion: status === 'outdated' ? '1.1.0' : '1.0.0',
      };
    },
  );
}

function makeCopyDirWithStatus(
  returnValue: 'copied' | 'updated' | 'skipped' = 'copied',
) {
  return vi.fn(async () => returnValue);
}

function makeDirExists(exists: boolean = true) {
  return vi.fn(async () => exists);
}

describe('installCore', () => {
  it('copies all core skills to target root', async () => {
    const copyDirWithVersionCheck = makeCopyDirWithVersionCheck();
    const copyDirWithStatus = makeCopyDirWithStatus();

    const result = await installCore({
      assetsRoot: '/assets',
      targetRoot: '/home/user',
      dependencies: {
        copyDirWithVersionCheck,
        copyDirWithStatus,
        dirExists: makeDirExists(),
      },
    });

    expect(result.copiedSkills).toContain('oat-docs');
    expect(result.copiedSkills).toContain('oat-doctor');
    expect(copyDirWithVersionCheck).toHaveBeenCalledWith(
      join('/assets', 'skills', 'oat-docs'),
      join('/home/user', '.agents', 'skills', 'oat-docs'),
      false,
    );
    expect(copyDirWithVersionCheck).toHaveBeenCalledWith(
      join('/assets', 'skills', 'oat-doctor'),
      join('/home/user', '.agents', 'skills', 'oat-doctor'),
      false,
    );
  });

  it('copies docs from assets to ~/.oat/docs/', async () => {
    const copyDirWithStatus = makeCopyDirWithStatus('copied');

    const result = await installCore({
      assetsRoot: '/assets',
      targetRoot: '/home/user',
      dependencies: {
        copyDirWithVersionCheck: makeCopyDirWithVersionCheck(),
        copyDirWithStatus,
        dirExists: makeDirExists(true),
      },
    });

    expect(copyDirWithStatus).toHaveBeenCalledWith(
      join('/assets', 'docs'),
      join('/home/user', '.oat', 'docs'),
      false,
    );
    expect(result.docsStatus).toBe('copied');
  });

  it('skips docs copy when docs assets do not exist', async () => {
    const copyDirWithStatus = makeCopyDirWithStatus();

    const result = await installCore({
      assetsRoot: '/assets',
      targetRoot: '/home/user',
      dependencies: {
        copyDirWithVersionCheck: makeCopyDirWithVersionCheck(),
        copyDirWithStatus,
        dirExists: makeDirExists(false),
      },
    });

    expect(copyDirWithStatus).not.toHaveBeenCalled();
    expect(result.docsStatus).toBe('skipped');
  });

  it('tracks outdated skills', async () => {
    const copyDirWithVersionCheck = makeCopyDirWithVersionCheck({
      'oat-doctor': 'outdated',
    });

    const result = await installCore({
      assetsRoot: '/assets',
      targetRoot: '/home/user',
      dependencies: {
        copyDirWithVersionCheck,
        copyDirWithStatus: makeCopyDirWithStatus(),
        dirExists: makeDirExists(),
      },
    });

    expect(result.outdatedSkills).toEqual([
      { name: 'oat-doctor', installed: '1.0.0', bundled: '1.1.0' },
    ]);
  });

  it('respects force flag', async () => {
    const copyDirWithVersionCheck = makeCopyDirWithVersionCheck();
    const copyDirWithStatus = makeCopyDirWithStatus();

    await installCore({
      assetsRoot: '/assets',
      targetRoot: '/home/user',
      force: true,
      dependencies: {
        copyDirWithVersionCheck,
        copyDirWithStatus,
        dirExists: makeDirExists(),
      },
    });

    expect(copyDirWithVersionCheck).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      true,
    );
    expect(copyDirWithStatus).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      true,
    );
  });
});
