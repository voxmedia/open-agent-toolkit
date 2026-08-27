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

import type { PackName } from './types';

export type PackIntentSource = 'declared' | 'inferred-legacy' | 'none';

export interface ScopedPackIntent {
  pack: PackName;
  scope: ConcreteScope;
  enabled: boolean;
  source: PackIntentSource;
  configPath: string;
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

export async function readScopedPackIntent(
  input: IntentReadInput,
): Promise<ScopedPackIntent> {
  const config = await readConcreteConfig(input);
  const declared = config.tools?.[input.pack] === true;
  return {
    pack: input.pack,
    scope: input.scope,
    enabled: declared,
    source: declared ? 'declared' : 'none',
    configPath: configPathForScope(input.scopeRoot),
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
