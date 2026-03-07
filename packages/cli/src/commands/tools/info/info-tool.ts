import type { CommandContext } from '@app/command-context';
import { resolveConcreteScopes } from '@commands/shared/shared.utils';
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
}

export interface InfoToolResult {
  found: boolean;
  tool: ToolDetail | null;
}

export async function runInfoTool(
  context: CommandContext,
  name: string,
  dependencies: InfoToolDependencies,
): Promise<InfoToolResult> {
  const { logger } = context;
  const scopes = resolveConcreteScopes(context.scope);
  const assetsRoot = await dependencies.resolveAssetsRoot();

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
    const match = tools.find((t) => t.name === name);
    if (!match) continue;

    const detail = await dependencies.getToolDetail(match, scopeRoot);
    const toolDetail: ToolDetail = { ...match, ...detail };

    if (context.json) {
      logger.json({ tool: toolDetail });
      return { found: true, tool: toolDetail };
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

    return { found: true, tool: toolDetail };
  }

  if (context.json) {
    logger.json({ tool: null, error: `Tool '${name}' not found` });
  } else {
    logger.error(`Tool '${name}' not found.`);
  }

  return { found: false, tool: null };
}
