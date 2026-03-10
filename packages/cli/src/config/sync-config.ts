import { readFile } from 'node:fs/promises';

import { CliError } from '@errors/index';
import { atomicWriteJson } from '@fs/io';
import { SyncStrategySchema } from '@shared/types';
import { z } from 'zod';

const ProviderConfigSchema = z.object({
  strategy: SyncStrategySchema.optional(),
  enabled: z.boolean().optional(),
});

export const SyncConfigSchema = z.object({
  version: z.literal(1),
  defaultStrategy: SyncStrategySchema,
  providers: z.record(ProviderConfigSchema).optional(),
});

export type ProviderSyncConfig = z.infer<typeof ProviderConfigSchema>;
// `providers` is optional in persisted JSON but always populated after normalization.
export type SyncConfig = z.infer<typeof SyncConfigSchema> & {
  providers: Record<string, ProviderSyncConfig>;
};

export const DEFAULT_SYNC_CONFIG: SyncConfig = {
  version: 1,
  defaultStrategy: 'auto',
  providers: {},
};

function mergeProviderConfigs(
  base: Record<string, ProviderSyncConfig>,
  override: Record<string, ProviderSyncConfig>,
): Record<string, ProviderSyncConfig> {
  const merged: Record<string, ProviderSyncConfig> = { ...base };

  for (const [name, config] of Object.entries(override)) {
    merged[name] = {
      ...(merged[name] ?? {}),
      ...config,
    };
  }

  return merged;
}

function normalizeConfig(
  config: z.infer<typeof SyncConfigSchema>,
  defaults: SyncConfig,
): SyncConfig {
  return {
    version: 1,
    defaultStrategy: config.defaultStrategy ?? defaults.defaultStrategy,
    providers: mergeProviderConfigs(defaults.providers, config.providers ?? {}),
  };
}

function parseSyncConfig(
  raw: string,
  configPath: string,
): z.infer<typeof SyncConfigSchema> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new CliError(
      `Sync config at ${configPath} is not valid JSON. Fix the file and retry.`,
    );
  }

  const result = SyncConfigSchema.safeParse(parsed);
  if (!result.success) {
    throw new CliError(
      `Sync config at ${configPath} failed validation. Fix the file and retry.`,
    );
  }

  return result.data;
}

export async function loadSyncConfig(
  configPath: string,
  defaults: SyncConfig = DEFAULT_SYNC_CONFIG,
): Promise<SyncConfig> {
  try {
    const raw = await readFile(configPath, 'utf8');
    return normalizeConfig(parseSyncConfig(raw, configPath), defaults);
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'ENOENT'
    ) {
      return {
        ...defaults,
        providers: { ...defaults.providers },
      };
    }

    if (error instanceof CliError) {
      throw error;
    }

    throw new CliError(
      `Unable to load sync config from ${configPath}: ${
        error instanceof Error ? error.message : 'unknown error'
      }`,
      2,
    );
  }
}

export async function saveSyncConfig(
  configPath: string,
  config: SyncConfig,
): Promise<SyncConfig> {
  const result = SyncConfigSchema.safeParse(config);
  if (!result.success) {
    throw new CliError(
      `Sync config at ${configPath} failed validation. Fix the config object and retry.`,
    );
  }

  const normalized = normalizeConfig(result.data, DEFAULT_SYNC_CONFIG);
  await atomicWriteJson(configPath, normalized);
  return normalized;
}

export async function setProviderEnabled(
  configPath: string,
  providerName: string,
  enabled: boolean,
): Promise<SyncConfig> {
  const current = await loadSyncConfig(configPath, DEFAULT_SYNC_CONFIG);
  const next: SyncConfig = {
    ...current,
    providers: {
      ...current.providers,
      [providerName]: {
        ...(current.providers[providerName] ?? {}),
        enabled,
      },
    },
  };

  return saveSyncConfig(configPath, next);
}
