import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { atomicWriteJson } from '@fs/io';

import { parseJsonConfig } from './json';
import {
  DEFAULT_SYNC_CONFIG,
  loadSyncConfig,
  mergeKnownStrays,
  saveSyncConfig,
  type SyncConfig,
} from './sync-config';

interface UserSyncConfigDependencies {
  readFile: (path: string, encoding: 'utf8') => Promise<string>;
  atomicWriteJson: (path: string, data: unknown) => Promise<void>;
  loadSyncConfig: (path: string) => Promise<SyncConfig>;
  saveSyncConfig: (path: string, config: SyncConfig) => Promise<SyncConfig>;
}

const DEFAULT_DEPENDENCIES: UserSyncConfigDependencies = {
  readFile,
  atomicWriteJson,
  loadSyncConfig: (path) => loadSyncConfig(path, DEFAULT_SYNC_CONFIG),
  saveSyncConfig,
};

export function getUserSyncConfigPath(userConfigDir: string): string {
  return join(userConfigDir, 'sync', 'config.json');
}

export async function resolveUserSyncConfig(
  userConfigDir: string,
  overrides: Partial<UserSyncConfigDependencies> = {},
): Promise<SyncConfig> {
  const dependencies: UserSyncConfigDependencies = {
    ...DEFAULT_DEPENDENCIES,
    ...overrides,
  };
  const legacyConfigPath = join(userConfigDir, 'config.json');
  const syncConfigPath = getUserSyncConfigPath(userConfigDir);
  const syncConfig = await dependencies.loadSyncConfig(syncConfigPath);
  const legacyConfig = await readLegacyConfig(
    legacyConfigPath,
    dependencies.readFile,
  );

  if (!legacyConfig || !hasOwn(legacyConfig, 'knownStrays')) {
    return syncConfig;
  }

  const legacyKnownStrays = Array.isArray(legacyConfig.knownStrays)
    ? legacyConfig.knownStrays.filter(
        (value): value is string => typeof value === 'string',
      )
    : [];
  const migratedSyncConfig = await dependencies.saveSyncConfig(syncConfigPath, {
    ...syncConfig,
    knownStrays: mergeKnownStrays(syncConfig.knownStrays, legacyKnownStrays),
  });

  const { knownStrays: _legacyKnownStrays, ...preservedLegacyConfig } =
    legacyConfig;
  await dependencies.atomicWriteJson(legacyConfigPath, preservedLegacyConfig);

  return migratedSyncConfig;
}

async function readLegacyConfig(
  configPath: string,
  read: UserSyncConfigDependencies['readFile'],
): Promise<Record<string, unknown> | null> {
  try {
    const parsed = parseJsonConfig(await read(configPath, 'utf8'), configPath);
    return isRecord(parsed) ? parsed : null;
  } catch (error) {
    if (isMissingFileError(error)) {
      return null;
    }
    throw error;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasOwn(value: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function isMissingFileError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'ENOENT'
  );
}
