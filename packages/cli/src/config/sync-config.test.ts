import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { CliError } from '@errors/index';
import { afterEach, describe, expect, it } from 'vitest';

import {
  appendKnownStray,
  DEFAULT_SYNC_CONFIG,
  loadSyncConfig,
  mergeKnownStrays,
  saveSyncConfig,
  setProviderEnabled,
} from './sync-config';

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

  it('loads and normalizes known strays from disk', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-config-'));
    tempDirs.push(root);
    const configPath = join(root, '.oat', 'sync', 'config.json');
    await mkdir(join(root, '.oat', 'sync'), { recursive: true });
    await writeFile(
      configPath,
      JSON.stringify({
        version: 1,
        defaultStrategy: 'copy',
        knownStrays: [
          ' .cursor\\skills\\cloud-environment-setup ',
          './.cursor/skills/cloud-environment-setup',
          '.cursor/skills/local-only',
        ],
      }),
      'utf8',
    );

    const config = await loadSyncConfig(configPath);

    expect(config.knownStrays).toEqual([
      '.cursor/skills/cloud-environment-setup',
      '.cursor/skills/local-only',
    ]);
  });

  it('merges known strays into a normalized sorted union', () => {
    expect(
      mergeKnownStrays(
        ['.cursor/skills/project-only', './.cursor/skills/shared'],
        [' .cursor\\skills\\user-only ', '.cursor/skills/shared/'],
      ),
    ).toEqual([
      '.cursor/skills/project-only',
      '.cursor/skills/shared',
      '.cursor/skills/user-only',
    ]);
  });

  it('appends a normalized known stray without duplicating existing paths', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-config-'));
    tempDirs.push(root);
    const configPath = join(root, '.oat', 'sync', 'config.json');

    await appendKnownStray(
      configPath,
      ' .cursor\\skills\\cloud-environment-setup/ ',
    );
    await appendKnownStray(
      configPath,
      './.cursor/skills/cloud-environment-setup',
    );

    await expect(loadSyncConfig(configPath)).resolves.toMatchObject({
      knownStrays: ['.cursor/skills/cloud-environment-setup'],
    });
  });

  it('loads config with trailing commas', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-config-'));
    tempDirs.push(root);
    const configPath = join(root, '.oat', 'sync', 'config.json');
    await mkdir(join(root, '.oat', 'sync'), { recursive: true });
    await writeFile(
      configPath,
      `{
  "version": 1,
  "defaultStrategy": "copy",
  "providers": {
    "cursor": { "enabled": true, },
  },
}
`,
      'utf8',
    );

    const config = await loadSyncConfig(configPath);

    expect(config.defaultStrategy).toBe('copy');
    expect(config.providers.cursor).toEqual({ enabled: true });
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

  it('rejects non-string known stray entries', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-config-'));
    tempDirs.push(root);
    const configPath = join(root, '.oat', 'sync', 'config.json');
    await mkdir(join(root, '.oat', 'sync'), { recursive: true });
    await writeFile(
      configPath,
      JSON.stringify({
        version: 1,
        defaultStrategy: 'copy',
        knownStrays: ['.cursor/skills/local-only', 42],
      }),
      'utf8',
    );

    await expect(loadSyncConfig(configPath)).rejects.toBeInstanceOf(CliError);
  });

  it('saveSyncConfig creates parent directory and writes valid json', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-config-'));
    tempDirs.push(root);
    const configPath = join(root, '.oat', 'sync', 'config.json');

    await saveSyncConfig(configPath, {
      version: 1,
      defaultStrategy: 'copy',
      knownStrays: [],
      providers: {
        claude: { enabled: true },
      },
    });

    const raw = await readFile(configPath, 'utf8');
    expect(JSON.parse(raw)).toEqual({
      version: 1,
      defaultStrategy: 'copy',
      knownStrays: [],
      providers: {
        claude: { enabled: true },
      },
    });
  });

  it('setProviderEnabled updates enabled while preserving existing provider strategy', async () => {
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
          claude: { strategy: 'copy', enabled: true },
        },
      }),
      'utf8',
    );

    const updated = await setProviderEnabled(configPath, 'claude', false);

    expect(updated.defaultStrategy).toBe('symlink');
    expect(updated.providers.claude).toEqual({
      strategy: 'copy',
      enabled: false,
    });
  });

  it('setProviderEnabled creates provider entry and preserves defaultStrategy', async () => {
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
          cursor: { strategy: 'symlink' },
        },
      }),
      'utf8',
    );

    const updated = await setProviderEnabled(configPath, 'codex', true);

    expect(updated.defaultStrategy).toBe('copy');
    expect(updated.providers.cursor).toEqual({ strategy: 'symlink' });
    expect(updated.providers.codex).toEqual({ enabled: true });
  });
});
