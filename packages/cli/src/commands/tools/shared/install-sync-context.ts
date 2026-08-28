import type { PackName } from '@commands/tools/shared/types';
import type { Command } from 'commander';

import { getCanonicalProviderPaths } from './pack-manifest';

const INSTALL_SYNC_CANONICAL_PATHS = Symbol('oat.installSyncCanonicalPaths');

function uniqueCanonicalPaths(paths: readonly string[]): string[] {
  return [...new Set(paths)];
}

export function canonicalSkillPaths(skillNames: readonly string[]): string[] {
  return uniqueCanonicalPaths(
    skillNames.map((skillName) => `.agents/skills/${skillName}`),
  );
}

export function canonicalAgentPaths(agentNames: readonly string[]): string[] {
  return uniqueCanonicalPaths(
    agentNames.map((agentName) => `.agents/agents/${agentName}`),
  );
}

export function canonicalPathsForPack(pack: PackName): string[] {
  return getCanonicalProviderPaths(pack);
}

export function canonicalPathsForPacks(packs: readonly PackName[]): string[] {
  return uniqueCanonicalPaths(
    packs.flatMap((pack) => canonicalPathsForPack(pack)),
  );
}

export function setInstalledCanonicalPaths(
  command: Command,
  canonicalPaths: readonly string[],
): void {
  Reflect.set(
    command,
    INSTALL_SYNC_CANONICAL_PATHS,
    uniqueCanonicalPaths(canonicalPaths),
  );
}

export function getInstalledCanonicalPaths(command: Command): string[] {
  const value = Reflect.get(command, INSTALL_SYNC_CANONICAL_PATHS);
  return Array.isArray(value) ? uniqueCanonicalPaths(value) : [];
}
