import type { PackLifecycleRequest } from './pack-lifecycle';
import { getPackDefinition } from './pack-manifest';
import type { PackDefinition, PackName } from './types';

export interface PackDependencyLease {
  requiredBy: PackName;
  lease: 'acquire' | 'release';
}

export interface ExpandedPackLifecycleRequest extends PackLifecycleRequest {
  assetIds?: readonly string[];
  dependency?: PackDependencyLease;
}

export type PackDefinitionResolver = (pack: PackName) => PackDefinition;

function requestKey(request: ExpandedPackLifecycleRequest): string {
  return JSON.stringify({
    pack: request.pack,
    scope: request.scope,
    scopeRoot: request.scopeRoot,
    assetsRoot: request.assetsRoot,
    action: request.action,
    assetIds: [...(request.assetIds ?? [])].sort(),
    dependency: request.dependency ?? null,
  });
}

export function expandPackLifecycleRequests(
  requests: readonly PackLifecycleRequest[],
  resolveDefinition: PackDefinitionResolver = getPackDefinition,
): ExpandedPackLifecycleRequest[] {
  const expanded: ExpandedPackLifecycleRequest[] = [];
  const seen = new Set<string>();

  const append = (request: ExpandedPackLifecycleRequest): void => {
    const key = requestKey(request);
    if (seen.has(key)) return;
    seen.add(key);
    expanded.push(request);
  };

  const visit = (request: ExpandedPackLifecycleRequest): void => {
    const dependencies = resolveDefinition(request.pack).dependencies ?? [];
    const dependencyRequests = dependencies.map(
      (dependency): ExpandedPackLifecycleRequest => ({
        pack: dependency.pack,
        scope: request.scope,
        scopeRoot: request.scopeRoot,
        assetsRoot: request.assetsRoot,
        action: request.action,
        assetIds: [...dependency.assets],
        dependency: {
          requiredBy: request.pack,
          lease: request.action === 'remove' ? 'release' : 'acquire',
        },
      }),
    );

    if (request.action === 'remove') append(request);
    for (const dependency of dependencyRequests) visit(dependency);
    if (request.action !== 'remove') append(request);
  };

  for (const request of requests) visit(request);
  return expanded;
}

export function dependencyRetainedAssetIds(
  pack: PackName,
  requiredBy: readonly PackName[],
  resolveDefinition: PackDefinitionResolver = getPackDefinition,
): string[] {
  return [
    ...new Set(
      requiredBy.flatMap((consumer) =>
        (resolveDefinition(consumer).dependencies ?? [])
          .filter((dependency) => dependency.pack === pack)
          .flatMap((dependency) => dependency.assets),
      ),
    ),
  ].sort();
}
