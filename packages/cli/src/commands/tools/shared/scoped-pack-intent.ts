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
export type PackIntentState =
  | 'direct'
  | 'transitive'
  | 'legacy-inferred'
  | 'absent';

export interface ScopedPackIntent {
  pack: PackName;
  scope: ConcreteScope;
  enabled: boolean;
  direct: boolean;
  requiredBy: PackName[];
  state: PackIntentState;
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

export interface LeaseWriteInput extends IntentWriteInput {
  requiredBy: PackName;
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
        asset.sharedOwner === undefined &&
        asset.scopes.includes(input.scope) &&
        asset.ownership[input.scope] === 'managed',
    )
    .map(({ destination }) => join(input.scopeRoot, destination));
  const observed = await Promise.all(
    paths.map(async (path) => ((await pathExists(path)) ? path : null)),
  );
  return observed.filter((path): path is string => path !== null);
}

/**
 * Returns ownership evidence that is safe to use when deciding whether a
 * shared managed asset must be retained. A shared asset cannot prove that any
 * one of its possible owners is installed, so only declared intent or a
 * non-shared managed asset is considered.
 */
export async function hasScopedPackOwnershipEvidence(
  input: IntentReadInput,
): Promise<boolean> {
  const config = await readConcreteConfig(input);
  if (
    config.tools?.[input.pack] === true ||
    (config.tools?.requiredBy?.[input.pack]?.length ?? 0) > 0
  ) {
    return true;
  }

  const paths = getPackDefinition(input.pack)
    .assets.filter(
      (asset) =>
        asset.sharedOwner === undefined &&
        asset.scopes.includes(input.scope) &&
        asset.ownership[input.scope] === 'managed',
    )
    .map(({ destination }) => join(input.scopeRoot, destination));

  return (await Promise.all(paths.map(pathExists))).some(Boolean);
}

export async function readScopedPackIntent(
  input: IntentReadInput,
): Promise<ScopedPackIntent> {
  const config = await readConcreteConfig(input);
  const declared = config.tools?.[input.pack] === true;
  const requiredBy = [...(config.tools?.requiredBy?.[input.pack] ?? [])].sort();
  const legacyFalse = config.tools?.[input.pack] === false;
  const physicalAssets =
    declared || requiredBy.length > 0
      ? []
      : await findPhysicalManagedAssets(input);
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
    enabled: declared || requiredBy.length > 0 || inferred,
    direct: declared,
    requiredBy,
    state: declared
      ? 'direct'
      : requiredBy.length > 0
        ? 'transitive'
        : inferred
          ? 'legacy-inferred'
          : 'absent',
    source:
      declared || requiredBy.length > 0
        ? 'declared'
        : inferred
          ? 'inferred-legacy'
          : 'none',
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

function updateRequiredBy(
  tools: OatToolsConfig | undefined,
  pack: PackName,
  requiredBy: PackName,
  enabled: boolean,
): OatToolsConfig | undefined {
  const next: OatToolsConfig = { ...tools };
  const leases = new Set(next.requiredBy?.[pack] ?? []);
  if (enabled) {
    leases.add(requiredBy);
  } else {
    leases.delete(requiredBy);
  }

  const requiredByConfig = { ...next.requiredBy };
  if (leases.size > 0) {
    requiredByConfig[pack] = [...leases].sort();
  } else {
    delete requiredByConfig[pack];
  }
  if (Object.keys(requiredByConfig).length > 0) {
    next.requiredBy = requiredByConfig;
  } else {
    delete next.requiredBy;
  }
  return Object.keys(next).length > 0 ? next : undefined;
}

async function writeToolsConfig(
  input: IntentReadInput,
  update: (tools: OatToolsConfig | undefined) => OatToolsConfig | undefined,
): Promise<void> {
  if (input.scope === 'project') {
    const config = await readOatConfig(input.scopeRoot);
    const tools = update(config.tools);
    const next: OatConfig = { ...config };
    if (tools) next.tools = tools;
    else delete next.tools;
    await writeOatConfig(input.scopeRoot, next);
    return;
  }

  const configDir = userConfigDir(input.scopeRoot);
  const config = await readUserConfig(configDir);
  const tools = update(config.tools);
  const next: UserConfig = { ...config };
  if (tools) next.tools = tools;
  else delete next.tools;
  await writeUserConfig(configDir, next);
}

export async function writeScopedPackIntent(
  input: IntentWriteInput,
): Promise<void> {
  await writeToolsConfig(input, (tools) =>
    updateTools(tools, input.pack, input.enabled),
  );
}

export async function writeScopedPackLease(
  input: LeaseWriteInput,
): Promise<void> {
  if (input.pack === input.requiredBy) {
    throw new Error(`Pack ${input.pack} cannot require itself`);
  }
  await writeToolsConfig(input, (tools) =>
    updateRequiredBy(tools, input.pack, input.requiredBy, input.enabled),
  );
}
