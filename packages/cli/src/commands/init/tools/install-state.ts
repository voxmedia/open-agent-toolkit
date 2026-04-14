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
