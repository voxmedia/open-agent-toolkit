import type { CommandContext } from '@app/command-context';
import { resolveConcreteScopes } from '@commands/shared/shared.utils';
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
}

export interface ListToolsResult {
  tools: ToolInfo[];
}

export async function runListTools(
  context: CommandContext,
  dependencies: ListToolsDependencies,
): Promise<ListToolsResult> {
  const { logger } = context;
  const scopes = resolveConcreteScopes(context.scope);
  const assetsRoot = await dependencies.resolveAssetsRoot();
  const allTools: ToolInfo[] = [];

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
  }

  if (context.json) {
    logger.json({ tools: allTools });
    return { tools: allTools };
  }

  if (allTools.length === 0) {
    logger.info('No tools installed.');
    return { tools: allTools };
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

  return { tools: allTools };
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
