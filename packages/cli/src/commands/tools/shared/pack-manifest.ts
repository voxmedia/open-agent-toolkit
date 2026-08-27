import { isAbsolute, posix } from 'node:path';

import type { ConcreteScope } from '@shared/types';

import type {
  PackAssetDefinition,
  PackAssetKind,
  PackAssetOwnership,
  PackDefinition,
  PackName,
} from './types';

export type {
  PackAssetDefinition,
  PackAssetKind,
  PackAssetOwnership,
  PackDefinition,
};

const ALL_PACK_NAMES = [
  'core',
  'ideas',
  'docs',
  'workflows',
  'utility',
  'project-management',
  'research',
  'brainstorm',
] as const satisfies readonly PackName[];

const reusablePack = (name: Exclude<PackName, 'core'>): PackDefinition => ({
  name,
  allowedScopes: ['project', 'user'],
  defaultScope: 'user',
  assets: [],
});

export const PACK_MANIFEST = [
  {
    name: 'core',
    allowedScopes: ['user'],
    defaultScope: 'user',
    assets: [],
  },
  reusablePack('ideas'),
  reusablePack('docs'),
  reusablePack('workflows'),
  reusablePack('utility'),
  reusablePack('project-management'),
  reusablePack('research'),
  reusablePack('brainstorm'),
] as const satisfies readonly PackDefinition[];

function validateRelativePath(
  pack: PackName,
  asset: PackAssetDefinition,
  field: 'source' | 'destination',
): void {
  const value = asset[field];
  const segments = value.replaceAll('\\', '/').split('/');
  if (
    value.length === 0 ||
    isAbsolute(value) ||
    /^[A-Za-z]:[\\/]/.test(value) ||
    segments.includes('..') ||
    posix.normalize(value).startsWith('../')
  ) {
    throw new Error(
      `Pack ${pack} asset ${asset.id} ${field} must be relative to its scope and contain no parent traversal: ${value}`,
    );
  }
}

function validateAsset(pack: PackDefinition, asset: PackAssetDefinition): void {
  validateRelativePath(pack.name, asset, 'source');
  validateRelativePath(pack.name, asset, 'destination');

  if (asset.scopes.length === 0) {
    throw new Error(`Pack ${pack.name} asset ${asset.id} has no scopes`);
  }

  for (const scope of asset.scopes) {
    if (!pack.allowedScopes.includes(scope)) {
      throw new Error(
        `Pack ${pack.name} asset ${asset.id} uses disallowed scope ${scope}`,
      );
    }
    if (!asset.ownership[scope]) {
      throw new Error(
        `Pack ${pack.name} asset ${asset.id} has no ownership for ${scope}`,
      );
    }
  }

  for (const scope of Object.keys(asset.ownership) as ConcreteScope[]) {
    if (!asset.scopes.includes(scope)) {
      throw new Error(
        `Pack ${pack.name} asset ${asset.id} declares ownership outside scope ${scope}`,
      );
    }
  }
}

export function validatePackManifest(
  manifest: readonly PackDefinition[] = PACK_MANIFEST,
): void {
  const packNames = new Set<PackName>();

  for (const pack of manifest) {
    if (packNames.has(pack.name)) {
      throw new Error(`Duplicate pack name: ${pack.name}`);
    }
    packNames.add(pack.name);

    if (!pack.allowedScopes.includes(pack.defaultScope)) {
      throw new Error(
        `Pack ${pack.name} default scope ${pack.defaultScope} is not allowed`,
      );
    }

    const assetIds = new Set<string>();
    for (const asset of pack.assets) {
      if (assetIds.has(asset.id)) {
        throw new Error(`Duplicate asset ID in pack ${pack.name}: ${asset.id}`);
      }
      assetIds.add(asset.id);
      validateAsset(pack, asset);
    }
  }

  if (manifest === PACK_MANIFEST) {
    const missing = ALL_PACK_NAMES.filter((name) => !packNames.has(name));
    if (missing.length > 0 || packNames.size !== ALL_PACK_NAMES.length) {
      throw new Error(
        `Pack manifest must cover every PackName exactly once; missing: ${missing.join(', ') || 'none'}`,
      );
    }
  }
}

validatePackManifest();
