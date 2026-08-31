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

export interface ToolDetail extends ToolInfo {
  description: string | null;
  argumentHint: string | null;
  allowedTools: string | null;
  userInvocable: boolean;
}

export interface InfoToolDependencies {
  scanTools: (options: ScanToolsOptions) => Promise<ToolInfo[]>;
  resolveScopeRoot: (
    scope: 'project' | 'user',
    cwd: string,
    home: string,
  ) => Promise<string>;
  resolveAssetsRoot: () => Promise<string>;
  getToolDetail: (
    tool: ToolInfo,
    scopeRoot: string,
  ) => Promise<Omit<ToolDetail, keyof ToolInfo>>;
  inventoryPack?: (input: InventoryPackInput) => Promise<PackInventory>;
}

export interface InfoToolResult {
  found: boolean;
  tool: ToolDetail | null;
  pack: PackInventory | null;
  packEvidence?: PackEvidenceBlockV1;
}

export async function runInfoTool(
  context: CommandContext,
  name: string,
  dependencies: InfoToolDependencies,
): Promise<InfoToolResult> {
  const { logger } = context;
  const scopes = resolveConcreteScopes(context.scope);
  const assetsRoot = await dependencies.resolveAssetsRoot();
  const roots: Partial<Record<'project' | 'user', string>> = {};
  for (const scope of scopes) {
    roots[scope] = await dependencies.resolveScopeRoot(
      scope,
      context.cwd,
      context.home,
    );
  }
  const packRoots = {
    projectRoot: roots.project,
    userRoot: roots.user,
  };
  const packName = PACK_MANIFEST.find(
    ({ name: candidate }) => candidate === name,
  )?.name;
  if (packName) {
    let pack: PackInventory | null = null;
    let evidence;
    try {
      pack = await (dependencies.inventoryPack ?? inventoryPack)({
        pack: packName,
        assetsRoot,
        projectRoot: roots.project,
        userRoot: roots.user,
      });
      evidence = projectRenderablePackEvidence(pack, packRoots);
    } catch (error) {
      evidence = unavailablePackEvidence({
        pack: packName,
        scopes,
        reason: error instanceof Error ? error.message : String(error),
        roots: packRoots,
      });
    }
    const packEvidence = packEvidenceBlock([evidence]);
    if (context.json) logger.json({ tool: null, pack, packEvidence });
    else {
      logger.info(packName);
      if (pack) {
        logger.info(`  Placement:   ${pack.placement}`);
        for (const line of formatPackInventoryDetails(pack)) logger.info(line);
      }
      for (const line of formatPackEvidenceDetails(evidence)) logger.info(line);
    }
    return { found: true, tool: null, pack, packEvidence };
  }

  for (const scope of scopes) {
    const scopeRoot = roots[scope]!;
    const tools = await dependencies.scanTools({
      scope,
      scopeRoot,
      assetsRoot,
    });
    const match = tools.find((t) => t.name === name);
    if (!match) continue;

    const detail = await dependencies.getToolDetail(match, scopeRoot);
    const toolDetail: ToolDetail = { ...match, ...detail };

    if (context.json) {
      logger.json({ tool: toolDetail });
      return { found: true, tool: toolDetail, pack: null };
    }

    logger.info(`${toolDetail.name}`);
    logger.info(`  Type:        ${toolDetail.type}`);
    logger.info(`  Version:     ${toolDetail.version ?? '-'}`);
    logger.info(`  Pack:        ${toolDetail.pack}`);
    logger.info(`  Scope:       ${toolDetail.scope}`);
    logger.info(`  Status:      ${toolDetail.status}`);
    if (toolDetail.description) {
      logger.info(`  Description: ${toolDetail.description}`);
    }
    if (toolDetail.type === 'skill') {
      logger.info(`  Invocable:   ${toolDetail.userInvocable ? 'yes' : 'no'}`);
      if (toolDetail.argumentHint) {
        logger.info(`  Args:        ${toolDetail.argumentHint}`);
      }
      if (toolDetail.allowedTools) {
        logger.info(`  Tools:       ${toolDetail.allowedTools}`);
      }
    }
    if (toolDetail.status === 'outdated') {
      logger.warn(
        `  Update available: ${toolDetail.version ?? '?'} -> ${toolDetail.bundledVersion ?? '?'}`,
      );
    }

    return { found: true, tool: toolDetail, pack: null };
  }

  if (context.json) {
    logger.json({ tool: null, error: `Tool '${name}' not found` });
  } else {
    logger.error(`Tool '${name}' not found.`);
  }

  return { found: false, tool: null, pack: null };
}
