import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { CliError } from '../errors';
import { DEFAULT_SYNC_CONFIG, loadSyncConfig } from './sync-config';

describe('loadSyncConfig', () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(
      tempDirs.map(async (dir) => {
        await rm(dir, { recursive: true, force: true });
      }),
    );
    tempDirs.length = 0;
  });

  it('returns defaults when no config file exists', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-config-'));
    tempDirs.push(root);
    const configPath = join(root, '.oat', 'sync', 'config.json');

    const config = await loadSyncConfig(configPath);

    expect(config).toEqual(DEFAULT_SYNC_CONFIG);
  });

  it('loads and validates config from disk', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-config-'));
    tempDirs.push(root);
    const configPath = join(root, '.oat', 'sync', 'config.json');
    await mkdir(join(root, '.oat', 'sync'), { recursive: true });
    await writeFile(
      configPath,
      JSON.stringify({
        version: 1,
        defaultStrategy: 'symlink',
        providers: {
          cursor: { enabled: true, strategy: 'copy' },
        },
      }),
      'utf8',
    );

    const config = await loadSyncConfig(configPath);

    expect(config.defaultStrategy).toBe('symlink');
    expect(config.providers.cursor).toEqual({
      enabled: true,
      strategy: 'copy',
    });
  });

  it('merges per-provider overrides', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-config-'));
    tempDirs.push(root);
    const configPath = join(root, '.oat', 'sync', 'config.json');
    await mkdir(join(root, '.oat', 'sync'), { recursive: true });
    await writeFile(
      configPath,
      JSON.stringify({
        version: 1,
        defaultStrategy: 'copy',
        providers: {
          claude: { enabled: false },
          cursor: { strategy: 'symlink' },
        },
      }),
      'utf8',
    );

    const config = await loadSyncConfig(configPath, {
      ...DEFAULT_SYNC_CONFIG,
      providers: {
        claude: { strategy: 'auto', enabled: true },
        codex: { enabled: true },
      },
    });

    expect(config.providers.claude).toEqual({
      strategy: 'auto',
      enabled: false,
    });
    expect(config.providers.cursor).toEqual({ strategy: 'symlink' });
    expect(config.providers.codex).toEqual({ enabled: true });
  });

  it('rejects invalid config with CliError', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-config-'));
    tempDirs.push(root);
    const configPath = join(root, '.oat', 'sync', 'config.json');
    await mkdir(join(root, '.oat', 'sync'), { recursive: true });
    await writeFile(
      configPath,
      JSON.stringify({
        version: 2,
        defaultStrategy: 'unknown',
      }),
      'utf8',
    );

    await expect(loadSyncConfig(configPath)).rejects.toBeInstanceOf(CliError);
  });
});
