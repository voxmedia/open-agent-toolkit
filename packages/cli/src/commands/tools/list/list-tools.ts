import type { CommandContext } from '@app/command-context';
import { resolveConcreteScopes } from '@commands/shared/shared.utils';
import {
  formatPackEvidenceDetails,
  formatPackInventoryDetails,
  packEvidenceBlock,
  projectRenderablePackEvidence,
  unavailablePackEvidence,
  type PackEvidenceBlockV1,
} from '@commands/tools/shared/format-pack-inventory';
import {
  inventoryPack,
  type InventoryPackInput,
  type PackInventory,
} from '@commands/tools/shared/pack-inventory';
import { PACK_MANIFEST } from '@commands/tools/shared/pack-manifest';
import type { ScanToolsOptions } from '@commands/tools/shared/scan-tools';
import type { ToolInfo } from '@commands/tools/shared/types';

export interface ListToolsDependencies {
  scanTools: (options: ScanToolsOptions) => Promise<ToolInfo[]>;
  resolveScopeRoot: (
    scope: 'project' | 'user',
    cwd: string,
    home: string,
  ) => Promise<string>;
  resolveAssetsRoot: () => Promise<string>;
  inventoryPack?: (input: InventoryPackInput) => Promise<PackInventory>;
}

export interface ListToolsResult {
  tools: ToolInfo[];
  packs: PackInventory[];
  packEvidence: PackEvidenceBlockV1;
}

export async function runListTools(
  context: CommandContext,
  dependencies: ListToolsDependencies,
): Promise<ListToolsResult> {
  const { logger } = context;
  const scopes = resolveConcreteScopes(context.scope);
  const assetsRoot = await dependencies.resolveAssetsRoot();
  const allTools: ToolInfo[] = [];
  const roots: Partial<Record<'project' | 'user', string>> = {};

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
    allTools.push(...tools);
    roots[scope] = scopeRoot;
  }
  const packRoots = {
    projectRoot: roots.project,
    userRoot: roots.user,
  };
  const inspectPack = dependencies.inventoryPack ?? inventoryPack;
  const inspected = await Promise.all(
    PACK_MANIFEST.map(({ name }) =>
      inspectPack({
        pack: name,
        assetsRoot,
        projectRoot: roots.project,
        userRoot: roots.user,
      }).then(
        (canonical) => ({
          canonical,
          evidence: projectRenderablePackEvidence(canonical, packRoots),
        }),
        (error: unknown) => ({
          canonical: null,
          evidence: unavailablePackEvidence({
            pack: name,
            scopes,
            reason: error instanceof Error ? error.message : String(error),
            roots: packRoots,
          }),
        }),
      ),
    ),
  );
  const packs = inspected
    .map(({ canonical }) => canonical)
    .filter((pack): pack is PackInventory => pack !== null);
  const packEvidence = packEvidenceBlock(
    inspected.map(({ evidence }) => evidence),
  );

  if (context.json) {
    logger.json({ tools: allTools, packs, packEvidence });
    return { tools: allTools, packs, packEvidence };
  }

  if (allTools.length === 0) {
    logger.info('No tools installed.');
    logger.info('Pack inventory:');
    for (const pack of packs) {
      logger.info(`${pack.pack}: ${pack.placement}`);
      for (const line of formatPackInventoryDetails(pack)) logger.info(line);
    }
    for (const evidence of packEvidence.items) {
      for (const line of formatPackEvidenceDetails(evidence)) logger.info(line);
    }
    return { tools: allTools, packs, packEvidence };
  }

  logger.info('Installed tools:\n');

  const header = formatRow(
    'NAME',
    'TYPE',
    'VERSION',
    'PACK',
    'SCOPE',
    'STATUS',
  );
  const separator = formatRow(
    '----',
    '----',
    '-------',
    '----',
    '-----',
    '------',
  );
  logger.info(header);
  logger.info(separator);

  for (const tool of allTools) {
    logger.info(
      formatRow(
        tool.name,
        tool.type,
        tool.version ?? '-',
        tool.pack,
        tool.scope,
        tool.status,
      ),
    );
  }

  logger.info('\nPack inventory:');
  for (const pack of packs) {
    const states = pack.scopes
      .map(
        ({ scope, completeness, intent }) =>
          `${scope}=${completeness} (${intent.source})`,
      )
      .join(', ');
    logger.info(
      `${pack.pack.padEnd(20)} ${pack.placement.padEnd(11)} ${states || 'not inspected'}`,
    );
    for (const line of formatPackInventoryDetails(pack)) logger.info(line);
  }

  logger.info('\nNormalized pack evidence:');
  for (const evidence of packEvidence.items) {
    logger.info(`${evidence.pack}: ${evidence.realizedPlacement}`);
    for (const line of formatPackEvidenceDetails(evidence)) logger.info(line);
  }

  return { tools: allTools, packs, packEvidence };
}

function formatRow(
  name: string,
  type: string,
  version: string,
  pack: string,
  scope: string,
  status: string,
): string {
  return [
    name.padEnd(40),
    type.padEnd(7),
    version.padEnd(10),
    pack.padEnd(12),
    scope.padEnd(9),
    status,
  ].join('  ');
}
