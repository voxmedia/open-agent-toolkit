import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { atomicWriteJson } from '@fs/io';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  getUserSyncConfigPath,
  resolveUserSyncConfig,
} from './user-sync-config';

describe('resolveUserSyncConfig', () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(
      tempDirs.map(async (dir) => rm(dir, { recursive: true, force: true })),
    );
    tempDirs.length = 0;
  });

  async function createUserConfigDir(): Promise<string> {
    const dir = await mkdtemp(join(tmpdir(), 'oat-user-sync-config-'));
    tempDirs.push(dir);
    return dir;
  }

  it('loads canonical user sync config when no legacy value exists', async () => {
    const userConfigDir = await createUserConfigDir();
    const syncConfigPath = getUserSyncConfigPath(userConfigDir);
    await mkdir(join(userConfigDir, 'sync'), { recursive: true });
    await writeFile(
      syncConfigPath,
      JSON.stringify({
        version: 1,
        defaultStrategy: 'copy',
        knownStrays: ['.cursor/skills/local-only'],
      }),
      'utf8',
    );

    await expect(resolveUserSyncConfig(userConfigDir)).resolves.toMatchObject({
      defaultStrategy: 'copy',
      knownStrays: ['.cursor/skills/local-only'],
    });
    await expect(
      readFile(join(userConfigDir, 'config.json'), 'utf8'),
    ).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('writes a normalized union first, then removes only the legacy key', async () => {
    const userConfigDir = await createUserConfigDir();
    const syncConfigPath = getUserSyncConfigPath(userConfigDir);
    await mkdir(join(userConfigDir, 'sync'), { recursive: true });
    await writeFile(
      syncConfigPath,
      JSON.stringify({
        version: 1,
        defaultStrategy: 'auto',
        knownStrays: ['.cursor/skills/canonical-only'],
        providers: { cursor: { enabled: true } },
      }),
      'utf8',
    );
    await writeFile(
      join(userConfigDir, 'config.json'),
      JSON.stringify({
        version: 1,
        activeIdea: '.oat/ideas/example',
        knownStrays: [
          ' .cursor\\skills\\legacy-only ',
          './.cursor/skills/canonical-only',
        ],
        futureField: { preserved: true },
      }),
      'utf8',
    );

    const result = await resolveUserSyncConfig(userConfigDir);

    expect(result.knownStrays).toEqual([
      '.cursor/skills/canonical-only',
      '.cursor/skills/legacy-only',
    ]);
    expect(JSON.parse(await readFile(syncConfigPath, 'utf8'))).toMatchObject({
      knownStrays: [
        '.cursor/skills/canonical-only',
        '.cursor/skills/legacy-only',
      ],
      providers: { cursor: { enabled: true } },
    });
    expect(
      JSON.parse(await readFile(join(userConfigDir, 'config.json'), 'utf8')),
    ).toEqual({
      version: 1,
      activeIdea: '.oat/ideas/example',
      futureField: { preserved: true },
    });
  });

  it('retries idempotently after canonical write succeeds and legacy cleanup fails', async () => {
    const userConfigDir = await createUserConfigDir();
    const legacyConfigPath = join(userConfigDir, 'config.json');
    await writeFile(
      legacyConfigPath,
      JSON.stringify({
        version: 1,
        knownStrays: [
          '.cursor/skills/legacy-only',
          './.cursor/skills/legacy-only',
        ],
        unknown: 'preserved',
      }),
      'utf8',
    );
    const interruptedWrite = vi
      .fn<typeof atomicWriteJson>()
      .mockRejectedValueOnce(new Error('simulated interruption'));

    await expect(
      resolveUserSyncConfig(userConfigDir, {
        atomicWriteJson: interruptedWrite,
      }),
    ).rejects.toThrow('simulated interruption');
    expect(
      JSON.parse(await readFile(getUserSyncConfigPath(userConfigDir), 'utf8'))
        .knownStrays,
    ).toEqual(['.cursor/skills/legacy-only']);
    expect(JSON.parse(await readFile(legacyConfigPath, 'utf8'))).toHaveProperty(
      'knownStrays',
    );

    await resolveUserSyncConfig(userConfigDir);

    expect(
      JSON.parse(await readFile(getUserSyncConfigPath(userConfigDir), 'utf8'))
        .knownStrays,
    ).toEqual(['.cursor/skills/legacy-only']);
    expect(JSON.parse(await readFile(legacyConfigPath, 'utf8'))).toEqual({
      version: 1,
      unknown: 'preserved',
    });
  });

  it('retains the legacy key when the canonical write fails', async () => {
    const userConfigDir = await createUserConfigDir();
    const legacyConfigPath = join(userConfigDir, 'config.json');
    const legacyConfig = {
      version: 1,
      knownStrays: ['.cursor/skills/legacy-only'],
      unknown: 'preserved',
    };
    await writeFile(legacyConfigPath, JSON.stringify(legacyConfig), 'utf8');

    await expect(
      resolveUserSyncConfig(userConfigDir, {
        saveSyncConfig: vi
          .fn()
          .mockRejectedValue(new Error('simulated canonical write failure')),
      }),
    ).rejects.toThrow('simulated canonical write failure');

    expect(JSON.parse(await readFile(legacyConfigPath, 'utf8'))).toEqual(
      legacyConfig,
    );
    await expect(
      readFile(getUserSyncConfigPath(userConfigDir), 'utf8'),
    ).rejects.toMatchObject({ code: 'ENOENT' });
  });
});
