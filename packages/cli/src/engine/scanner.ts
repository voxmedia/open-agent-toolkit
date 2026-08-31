import { readdir } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';

import {
  inventoryScopedPack,
  type InventoryScopedPackInput,
  type ScopedPackInventory,
} from '@commands/tools/shared/pack-inventory';
import {
  PACK_MANIFEST,
  type PackDefinition,
} from '@commands/tools/shared/pack-manifest';
import { CliError } from '@errors/index';
import { resolveAssetsRoot } from '@fs/assets';
import {
  SCOPE_CONTENT_TYPES,
  USER_SCOPE_MANAGED_AGENT_FILES,
  type Scope,
} from '@shared/types';

type ConcreteScope = Exclude<Scope, 'all'>;

export interface CanonicalEntry {
  name: string;
  type: 'skill' | 'agent' | 'rule';
  canonicalPath: string;
  isFile: boolean;
}

export interface ScanBundledManagedAgentsOptions {
  scopeRoot?: string;
  assetsRoot?: string;
  manifest?: readonly PackDefinition[];
  inventoryPack?: (
    input: InventoryScopedPackInput,
  ) => Promise<ScopedPackInventory>;
}

function canonicalDirectoryName(
  contentType: CanonicalEntry['type'],
): 'skills' | 'agents' | 'rules' {
  if (contentType === 'skill') {
    return 'skills';
  }
  if (contentType === 'agent') {
    return 'agents';
  }
  return 'rules';
}

interface ScannedEntry {
  name: string;
  isFile: boolean;
}

async function readEntries(dirPath: string): Promise<ScannedEntry[]> {
  try {
    const entries = await readdir(dirPath, { withFileTypes: true });
    const results: ScannedEntry[] = [];

    for (const entry of entries) {
      if (entry.isDirectory()) {
        results.push({ name: entry.name, isFile: false });
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        results.push({ name: entry.name, isFile: true });
      }
    }

    results.sort((left, right) => left.name.localeCompare(right.name));
    return results;
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'ENOENT'
    ) {
      return [];
    }

    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error.code === 'EACCES' || error.code === 'EPERM')
    ) {
      throw new CliError(
        `Permission denied reading canonical directory ${dirPath}. Adjust permissions and retry.`,
      );
    }
    throw error;
  }
}

export async function scanBundledManagedAgents(
  options: ScanBundledManagedAgentsOptions = {},
): Promise<CanonicalEntry[]> {
  const assetsRoot = options.assetsRoot ?? (await resolveAssetsRoot());
  const agentsDir = join(assetsRoot, 'agents');
  const entries = await readEntries(agentsDir);
  const available = new Set(
    entries.filter((entry) => entry.isFile).map((entry) => entry.name),
  );
  const missing = USER_SCOPE_MANAGED_AGENT_FILES.filter(
    (name) => !available.has(name),
  );

  if (missing.length > 0) {
    throw new CliError(
      `Bundled managed role definitions are unavailable: ${missing.join(', ')}. Reinstall or rebuild OAT before running user sync.`,
    );
  }

  const managed = USER_SCOPE_MANAGED_AGENT_FILES.map((name) => ({
    name,
    type: 'agent' as const,
    canonicalPath: join(agentsDir, name),
    isFile: true,
  }));

  if (!options.scopeRoot) return managed;

  const inventoryPack = options.inventoryPack ?? inventoryScopedPack;
  const materializable = (options.manifest ?? PACK_MANIFEST).flatMap((pack) => {
    const assets = pack.assets.filter(
      (asset) =>
        asset.kind === 'agent' &&
        asset.userMaterializable === true &&
        asset.scopes.includes('user') &&
        asset.ownership.user === 'managed',
    );
    return assets.length === 0 ? [] : [{ pack, assets }];
  });
  const inventories = await Promise.all(
    materializable.map(async ({ pack, assets }) => ({
      assets,
      inventory: await inventoryPack({
        pack: pack.name,
        scope: 'user',
        scopeRoot: options.scopeRoot!,
        assetsRoot,
      }),
    })),
  );
  const selected = new Map<string, CanonicalEntry>(
    managed.map((entry) => [entry.name, entry]),
  );

  for (const { assets, inventory } of inventories) {
    if (!inventory.intent.enabled) continue;
    for (const definition of assets) {
      const installed = inventory.assets.find(
        ({ definition: candidate }) => candidate.id === definition.id,
      );
      if (!installed || installed.status === 'missing') continue;
      if (!definition.source) {
        throw new CliError(
          `User-materializable agent ${definition.id} has no bundled source. Reinstall or rebuild OAT before running user sync.`,
        );
      }
      const name = basename(definition.destination);
      const sourceName = basename(definition.source);
      if (
        name !== sourceName ||
        definition.source !== `agents/${name}` ||
        !available.has(sourceName)
      ) {
        throw new CliError(
          `Bundled user-materializable agent definition is unavailable or mismatched: ${definition.id} (${definition.source}). Reinstall or rebuild OAT before running user sync.`,
        );
      }
      const existing = selected.get(name);
      const canonicalPath = installed.path;
      if (existing && existing.canonicalPath !== canonicalPath) {
        throw new CliError(
          `User-scope managed agent collision for ${name}: ${existing.canonicalPath} and ${canonicalPath}.`,
        );
      }
      selected.set(name, {
        name,
        type: 'agent',
        canonicalPath,
        isFile: true,
      });
    }
  }

  return [...selected.values()];
}

/** @deprecated Use scanBundledManagedAgents for provider-neutral materialization. */
export const scanBundledManagedCodexAgents = scanBundledManagedAgents;

export async function scanCanonical(
  basePath: string,
  scope: ConcreteScope,
): Promise<CanonicalEntry[]> {
  const scopeRoot = resolve(basePath);
  const entries: CanonicalEntry[] = [];

  for (const contentType of SCOPE_CONTENT_TYPES[scope]) {
    const contentDir = join(
      scopeRoot,
      '.agents',
      canonicalDirectoryName(contentType),
    );
    const includeFiles = contentType === 'agent' || contentType === 'rule';
    const scanned = await readEntries(contentDir);

    for (const scannedEntry of scanned) {
      if (scannedEntry.isFile && !includeFiles) {
        continue;
      }
      entries.push({
        name: scannedEntry.name,
        type: contentType,
        canonicalPath: join(contentDir, scannedEntry.name),
        isFile: scannedEntry.isFile,
      });
    }
  }

  return entries;
}
