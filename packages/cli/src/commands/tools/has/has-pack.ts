import type { CommandContext } from '@app/command-context';
import {
  inventoryScopedPack,
  type InventoryScopedPackInput,
  type ScopedPackInventory,
} from '@commands/tools/shared/pack-inventory';
import type { ScanToolsOptions } from '@commands/tools/shared/scan-tools';
import type { PackName, ToolInfo } from '@commands/tools/shared/types';
import type { ConcreteScope } from '@shared/types';

export const PACK_NAMES = [
  'core',
  'ideas',
  'docs',
  'workflows',
  'utility',
  'project-management',
  'research',
  'brainstorm',
] as const satisfies readonly PackName[];

export interface PackAvailability {
  pack: PackName;
  available: boolean;
  scopes: ConcreteScope[];
  completeness: Partial<
    Record<ConcreteScope, ScopedPackInventory['completeness']>
  >;
  missing: Array<{ scope: ConcreteScope; asset: string; path: string }>;
}

export interface PackAvailabilityDependencies {
  scanTools: (options: ScanToolsOptions) => Promise<ToolInfo[]>;
  resolveScopeRoot: (
    scope: ConcreteScope,
    cwd: string,
    home: string,
  ) => Promise<string>;
  resolveAssetsRoot: () => Promise<string>;
  inventoryScopedPack?: (
    input: InventoryScopedPackInput,
  ) => Promise<ScopedPackInventory>;
}

export function isPackName(value: string): value is PackName {
  return (PACK_NAMES as readonly string[]).includes(value);
}

export async function resolvePackAvailability(
  pack: PackName,
  scopes: ConcreteScope[],
  context: CommandContext,
  dependencies: PackAvailabilityDependencies,
): Promise<PackAvailability> {
  const assetsRoot = await dependencies.resolveAssetsRoot();
  const matchingScopes: ConcreteScope[] = [];
  const completeness: PackAvailability['completeness'] = {};
  const missing: PackAvailability['missing'] = [];

  for (const scope of scopes) {
    const scopeRoot = await dependencies.resolveScopeRoot(
      scope,
      context.cwd,
      context.home,
    );
    const inventory = await (
      dependencies.inventoryScopedPack ?? inventoryScopedPack
    )({ pack, scope, scopeRoot, assetsRoot });
    completeness[scope] = inventory.completeness;
    missing.push(
      ...inventory.assets
        .filter(
          ({ definition, status }) =>
            definition.ownership[scope] === 'managed' && status === 'missing',
        )
        .map(({ definition, path }) => ({ scope, asset: definition.id, path })),
    );
    if (inventory.completeness === 'complete') {
      matchingScopes.push(scope);
    }
  }

  return {
    pack,
    available: matchingScopes.length > 0,
    scopes: matchingScopes,
    completeness,
    missing,
  };
}
