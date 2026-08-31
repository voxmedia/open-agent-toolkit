import type { ToolPackEvidence } from '@commands/tools/shared/pack-evidence';
import type { PackInventory } from '@commands/tools/shared/pack-inventory';
import type { PackName, ToolInfo } from '@commands/tools/shared/types';

export type PackInstallLocation = 'not-installed' | 'project' | 'user' | 'both';

export interface PackInstallState {
  project: boolean;
  user: boolean;
  location: PackInstallLocation;
}

export function resolvePackInstallLocation(
  project: boolean,
  user: boolean,
): PackInstallLocation {
  if (project && user) {
    return 'both';
  }

  if (project) {
    return 'project';
  }

  if (user) {
    return 'user';
  }

  return 'not-installed';
}

export function buildPackInstallStateMap<TPack extends PackName>(
  packs: readonly TPack[],
  tools: ToolInfo[],
): Record<TPack, PackInstallState> {
  const state = Object.fromEntries(
    packs.map((pack) => [
      pack,
      {
        project: false,
        user: false,
        location: 'not-installed' as PackInstallLocation,
      },
    ]),
  ) as Record<TPack, PackInstallState>;

  for (const tool of tools) {
    if (tool.pack === 'custom' || !(tool.pack in state)) {
      continue;
    }

    const packState = state[tool.pack as TPack];
    if (tool.scope === 'project') {
      packState.project = true;
    } else {
      packState.user = true;
    }
    packState.location = resolvePackInstallLocation(
      packState.project,
      packState.user,
    );
  }

  return state;
}

export function buildPackInstallStateMapFromInventory<TPack extends PackName>(
  packs: readonly TPack[],
  inventories: readonly PackInventory[],
): Record<TPack, PackInstallState> {
  return Object.fromEntries(
    packs.map((pack) => {
      const inventory = inventories.find(
        (candidate) => candidate.pack === pack,
      );
      const project =
        inventory?.placement === 'project' || inventory?.placement === 'both';
      const user =
        inventory?.placement === 'user' || inventory?.placement === 'both';
      return [
        pack,
        { project, user, location: resolvePackInstallLocation(project, user) },
      ];
    }),
  ) as Record<TPack, PackInstallState>;
}

export function buildPackInstallStateMapFromEvidence<TPack extends PackName>(
  packs: readonly TPack[],
  evidence: readonly ToolPackEvidence[],
): Record<TPack, PackInstallState> {
  return Object.fromEntries(
    packs.map((pack) => {
      const packEvidence = evidence.find(
        (candidate) => candidate.pack === pack,
      );
      const project =
        packEvidence?.knownRealizedScopes.includes('project') ?? false;
      const user = packEvidence?.knownRealizedScopes.includes('user') ?? false;
      return [
        pack,
        { project, user, location: resolvePackInstallLocation(project, user) },
      ];
    }),
  ) as Record<TPack, PackInstallState>;
}
