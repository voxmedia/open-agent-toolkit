import type { Scope } from '../../shared/types';
import type { PathMapping, ProviderAdapter } from './adapter.types';

export async function getActiveAdapters(
  adapters: ProviderAdapter[],
  scopeRoot: string,
): Promise<ProviderAdapter[]> {
  const detected = await Promise.all(
    adapters.map(async (adapter) => ({
      adapter,
      isDetected: await adapter.detect(scopeRoot),
    })),
  );

  return detected
    .filter((result) => result.isDetected)
    .map((result) => result.adapter);
}

export function getSyncMappings(
  adapter: ProviderAdapter,
  scope: Scope,
): PathMapping[] {
  const scopeMappings =
    scope === 'project'
      ? adapter.projectMappings
      : scope === 'user'
        ? adapter.userMappings
        : [...adapter.projectMappings, ...adapter.userMappings];

  const syncMappings = scopeMappings.filter((mapping) => !mapping.nativeRead);
  const seen = new Set<string>();

  return syncMappings.filter((mapping) => {
    const key = `${mapping.contentType}::${mapping.canonicalDir}::${mapping.providerDir}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}
