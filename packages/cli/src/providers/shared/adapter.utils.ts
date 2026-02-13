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

  return scopeMappings.filter((mapping) => !mapping.nativeRead);
}

export const getAdapterMappings = getSyncMappings;
