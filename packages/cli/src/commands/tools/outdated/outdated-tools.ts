import type { CommandContext } from '@app/command-context';
import { resolveConcreteScopes } from '@commands/shared/shared.utils';
import {
  inventoryScopedPack,
  type InventoryScopedPackInput,
  type ScopedPackInventory,
} from '@commands/tools/shared/pack-inventory';
import { PACK_MANIFEST } from '@commands/tools/shared/pack-manifest';
import type { ScanToolsOptions } from '@commands/tools/shared/scan-tools';
import type { ToolInfo } from '@commands/tools/shared/types';

export interface OutdatedToolsDependencies {
  scanTools: (options: ScanToolsOptions) => Promise<ToolInfo[]>;
  resolveScopeRoot: (
    scope: 'project' | 'user',
    cwd: string,
    home: string,
  ) => Promise<string>;
  resolveAssetsRoot: () => Promise<string>;
  inventoryScopedPack?: (
    input: InventoryScopedPackInput,
  ) => Promise<ScopedPackInventory>;
}

export interface RepairablePack {
  pack: ScopedPackInventory['pack'];
  scope: ScopedPackInventory['scope'];
  completeness: ScopedPackInventory['completeness'];
  missing: string[];
  drifted: string[];
  intended: boolean;
}

export interface OutdatedToolsResult {
  tools: ToolInfo[];
  packs: RepairablePack[];
}

export async function runOutdatedTools(
  context: CommandContext,
  dependencies: OutdatedToolsDependencies,
): Promise<OutdatedToolsResult> {
  const { logger } = context;
  const scopes = resolveConcreteScopes(context.scope);
  const assetsRoot = await dependencies.resolveAssetsRoot();
  const outdated: ToolInfo[] = [];
  const packs: RepairablePack[] = [];

  for (const scope of scopes) {
    const scopeRoot = await dependencies.resolveScopeRoot(
      scope,
      context.cwd,
      context.home,
    );
    const tools = await dependencies.scanTools({
      scope,
      scopeRoot,
      assetsRoot,
    });
    outdated.push(...tools.filter((t) => t.status === 'outdated'));
    for (const { name: pack, allowedScopes } of PACK_MANIFEST) {
      if (!allowedScopes.includes(scope)) continue;
      const inventory = await (
        dependencies.inventoryScopedPack ?? inventoryScopedPack
      )({ pack, scope, scopeRoot, assetsRoot });
      const missing = inventory.assets
        .filter(
          ({ definition, status }) =>
            definition.ownership[scope] === 'managed' && status === 'missing',
        )
        .map(({ definition }) => definition.id);
      const drifted = inventory.assets
        .filter(({ status }) => status === 'outdated' || status === 'newer')
        .map(({ definition }) => definition.id);
      if (
        drifted.length > 0 ||
        (inventory.intent.enabled && inventory.completeness !== 'complete')
      ) {
        packs.push({
          pack,
          scope,
          completeness: inventory.completeness,
          missing,
          drifted,
          intended: inventory.intent.enabled,
        });
      }
    }
  }

  if (context.json) {
    logger.json({ tools: outdated, packs });
    return { tools: outdated, packs };
  }

  if (outdated.length === 0 && packs.length === 0) {
    logger.info('All tools are up to date.');
    return { tools: outdated, packs };
  }

  logger.info('Outdated tools:\n');

  const header = formatRow(
    'NAME',
    'TYPE',
    'INSTALLED',
    'AVAILABLE',
    'PACK',
    'SCOPE',
  );
  const separator = formatRow(
    '----',
    '----',
    '---------',
    '---------',
    '----',
    '-----',
  );
  logger.info(header);
  logger.info(separator);

  for (const tool of outdated) {
    logger.info(
      formatRow(
        tool.name,
        tool.type,
        tool.version ?? '-',
        tool.bundledVersion ?? '-',
        tool.pack,
        tool.scope,
      ),
    );
  }

  for (const pack of packs) {
    logger.info(
      `Pack ${pack.pack}@${pack.scope} is repairable (${pack.completeness}; missing=${pack.missing.length}; drifted=${pack.drifted.length}).`,
    );
  }

  return { tools: outdated, packs };
}

function formatRow(
  name: string,
  type: string,
  installed: string,
  available: string,
  pack: string,
  scope: string,
): string {
  return [
    name.padEnd(40),
    type.padEnd(7),
    installed.padEnd(10),
    available.padEnd(10),
    pack.padEnd(12),
    scope,
  ].join('  ');
}
