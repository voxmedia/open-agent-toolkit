import type { CommandContext } from '@app/command-context';
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
}

export interface PackAvailabilityDependencies {
  scanTools: (options: ScanToolsOptions) => Promise<ToolInfo[]>;
  resolveScopeRoot: (
    scope: ConcreteScope,
    cwd: string,
    home: string,
  ) => Promise<string>;
  resolveAssetsRoot: () => Promise<string>;
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
    if (tools.some((tool) => tool.pack === pack)) {
      matchingScopes.push(scope);
    }
  }

  return {
    pack,
    available: matchingScopes.length > 0,
    scopes: matchingScopes,
  };
}
