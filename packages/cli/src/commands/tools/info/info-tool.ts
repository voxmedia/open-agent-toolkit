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
import { applyUserAgentCoverage } from '@commands/tools/shared/pack-provider-evidence';
import {
  resolvePackProviderSurface,
  type ProviderContextDependencies,
} from '@commands/tools/shared/provider-context';
import type { ScanToolsOptions } from '@commands/tools/shared/scan-tools';
import type { ToolInfo } from '@commands/tools/shared/types';
import type { SkillViewDiagnosis } from '@drift/index';

import {
  collectSkillViewDiagnoses,
  formatSkillViewLines,
  type SkillViewDependencies,
} from './skill-views';

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
  providerContext?: ProviderContextDependencies;
  /**
   * Read-only manifest, drift, and expected-projection access for the
   * provider-view diagnostic. Omitted in unit harnesses that only exercise the
   * inventory surface; the command wiring always supplies it.
   */
  skillViews?: SkillViewDependencies;
}

export interface InfoToolResult {
  found: boolean;
  tool: ToolDetail | null;
  pack: PackInventory | null;
  packEvidence?: PackEvidenceBlockV1;
  /** Per-scope provider-view diagnosis; additive, skills only. */
  providerViews?: SkillViewDiagnosis[];
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
      // `info` resolves the same config-aware provider surface as `status` and
      // `doctor`; omitting it made `info` report user agents as unmaterialized
      // that an active Codex or Cursor adapter supplies.
      const providerSurface = await resolvePackProviderSurface({
        scopeRoots: roots,
        ...(dependencies.providerContext
          ? { dependencies: dependencies.providerContext }
          : {}),
      });
      pack = applyUserAgentCoverage(
        await (dependencies.inventoryPack ?? inventoryPack)({
          pack: packName,
          assetsRoot,
          projectRoot: roots.project,
          userRoot: roots.user,
          ...(roots.user
            ? {
                userManagedRoleMaterialization:
                  providerSurface.userAgentCoverage !== 'none',
              }
            : {}),
        }),
        providerSurface.userAgentCoverage,
      );
      evidence = projectRenderablePackEvidence(
        pack,
        packRoots,
        providerSurface.contexts,
      );
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
    // Resolution time is the only place a name is already bound to canonical
    // content, so it is where "installed but not distributed" can be answered.
    const providerViews =
      toolDetail.type === 'skill' && dependencies.skillViews
        ? await collectSkillViewDiagnoses({
            skillName: toolDetail.name,
            scopes,
            roots,
            resolvedScope: scope,
            resolvedVersion: toolDetail.version,
            dependencies: dependencies.skillViews,
            ...(dependencies.providerContext
              ? { providerContext: dependencies.providerContext }
              : {}),
          })
        : undefined;

    if (context.json) {
      logger.json({
        tool: toolDetail,
        ...(providerViews ? { providerViews } : {}),
      });
      return {
        found: true,
        tool: toolDetail,
        pack: null,
        ...(providerViews ? { providerViews } : {}),
      };
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
    for (const line of formatSkillViewLines(providerViews ?? [])) {
      logger.info(line);
    }

    return {
      found: true,
      tool: toolDetail,
      pack: null,
      ...(providerViews ? { providerViews } : {}),
    };
  }

  if (context.json) {
    logger.json({ tool: null, error: `Tool '${name}' not found` });
  } else {
    logger.error(`Tool '${name}' not found.`);
  }

  return { found: false, tool: null, pack: null };
}
