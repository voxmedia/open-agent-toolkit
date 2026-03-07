import type { CommandContext } from '@app/command-context';
import { resolveConcreteScopes } from '@commands/shared/shared.utils';
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
}

export interface OutdatedToolsResult {
  tools: ToolInfo[];
}

export async function runOutdatedTools(
  context: CommandContext,
  dependencies: OutdatedToolsDependencies,
): Promise<OutdatedToolsResult> {
  const { logger } = context;
  const scopes = resolveConcreteScopes(context.scope);
  const assetsRoot = await dependencies.resolveAssetsRoot();
  const outdated: ToolInfo[] = [];

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
  }

  if (context.json) {
    logger.json({ tools: outdated });
    return { tools: outdated };
  }

  if (outdated.length === 0) {
    logger.info('All tools are up to date.');
    return { tools: outdated };
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

  return { tools: outdated };
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
