import { lstat } from 'node:fs/promises';
import { join } from 'node:path';

import {
  type OatConfig,
  type OatToolsConfig,
  type UserConfig,
  readOatConfig,
  readUserConfig,
  writeOatConfig,
  writeUserConfig,
} from '@config/oat-config';
import type { ConcreteScope } from '@shared/types';

import { getPackDefinition } from './pack-manifest';
import type { PackName } from './types';

export type PackIntentSource = 'declared' | 'inferred-legacy' | 'none';

export interface ScopedPackIntent {
  pack: PackName;
  scope: ConcreteScope;
  enabled: boolean;
  source: PackIntentSource;
  configPath: string;
  diagnostics: PackIntentDiagnostic[];
}

export interface PackIntentDiagnostic {
  code: 'legacy-false-conflict';
  message: string;
  paths: string[];
}

export interface IntentReadInput {
  pack: PackName;
  scope: ConcreteScope;
  scopeRoot: string;
}

export interface IntentWriteInput extends IntentReadInput {
  enabled: boolean;
}

function configPathForScope(scopeRoot: string): string {
  return join(scopeRoot, '.oat', 'config.json');
}

function userConfigDir(scopeRoot: string): string {
  return join(scopeRoot, '.oat');
}

async function readConcreteConfig(
  input: IntentReadInput,
): Promise<OatConfig | UserConfig> {
  return input.scope === 'project'
    ? readOatConfig(input.scopeRoot)
    : readUserConfig(userConfigDir(input.scopeRoot));
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await lstat(path);
    return true;
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'ENOENT'
    ) {
      return false;
    }
    throw error;
  }
}

async function findPhysicalManagedAssets(
  input: IntentReadInput,
): Promise<string[]> {
  const paths = getPackDefinition(input.pack)
    .assets.filter(
      (asset) =>
        asset.scopes.includes(input.scope) &&
        asset.ownership[input.scope] === 'managed',
    )
    .map(({ destination }) => join(input.scopeRoot, destination));
  const observed = await Promise.all(
    paths.map(async (path) => ((await pathExists(path)) ? path : null)),
  );
  return observed.filter((path): path is string => path !== null);
}

export async function readScopedPackIntent(
  input: IntentReadInput,
): Promise<ScopedPackIntent> {
  const config = await readConcreteConfig(input);
  const declared = config.tools?.[input.pack] === true;
  const legacyFalse = config.tools?.[input.pack] === false;
  const physicalAssets = declared ? [] : await findPhysicalManagedAssets(input);
  const inferred = physicalAssets.length > 0;
  const diagnostics: PackIntentDiagnostic[] = [];
  if (legacyFalse && inferred) {
    diagnostics.push({
      code: 'legacy-false-conflict',
      message: `Pack ${input.pack} has legacy false intent but managed assets exist at ${input.scope} scope`,
      paths: physicalAssets,
    });
  }
  return {
    pack: input.pack,
    scope: input.scope,
    enabled: declared || inferred,
    source: declared ? 'declared' : inferred ? 'inferred-legacy' : 'none',
    configPath: configPathForScope(input.scopeRoot),
    diagnostics,
  };
}

function updateTools(
  tools: OatToolsConfig | undefined,
  pack: PackName,
  enabled: boolean,
): OatToolsConfig | undefined {
  const next: OatToolsConfig = { ...tools };
  if (enabled) {
    next[pack] = true;
  } else {
    delete next[pack];
  }
  return Object.keys(next).length > 0 ? next : undefined;
}

export async function writeScopedPackIntent(
  input: IntentWriteInput,
): Promise<void> {
  if (input.scope === 'project') {
    const config = await readOatConfig(input.scopeRoot);
    const tools = updateTools(config.tools, input.pack, input.enabled);
    const next: OatConfig = { ...config };
    if (tools) {
      next.tools = tools;
    } else {
      delete next.tools;
    }
    await writeOatConfig(input.scopeRoot, next);
    return;
  }

  const configDir = userConfigDir(input.scopeRoot);
  const config = await readUserConfig(configDir);
  const tools = updateTools(config.tools, input.pack, input.enabled);
  const next: UserConfig = { ...config };
  if (tools) {
    next.tools = tools;
  } else {
    delete next.tools;
  }
  await writeUserConfig(configDir, next);
}
