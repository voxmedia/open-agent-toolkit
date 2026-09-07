import type { PackName } from '@commands/tools/shared/types';
import type { Command } from 'commander';

import { getPackDefinition } from './pack-manifest';
import type { PackDefinition } from './types';

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

export function canonicalPathsForPack(
  pack: PackName,
  resolveDefinition: (pack: PackName) => PackDefinition = getPackDefinition,
): string[] {
  const definition = resolveDefinition(pack);
  const direct = definition.assets
    .filter(({ kind }) => kind === 'skill' || kind === 'agent')
    .map(({ destination }) => destination);
  const dependencies = (definition.dependencies ?? []).flatMap((dependency) => {
    const owner = resolveDefinition(dependency.pack);
    const selected = new Set(dependency.assets);
    return owner.assets
      .filter(
        ({ id, kind }) =>
          selected.has(id) && (kind === 'skill' || kind === 'agent'),
      )
      .map(({ destination }) => destination);
  });
  return uniqueCanonicalPaths([...direct, ...dependencies]);
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
