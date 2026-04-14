import {
  CORE_SKILLS,
  DOCS_SKILLS,
  IDEA_SKILLS,
  PROJECT_MANAGEMENT_SKILLS,
  RESEARCH_AGENTS,
  RESEARCH_SKILLS,
  UTILITY_SKILLS,
  WORKFLOW_AGENTS,
  WORKFLOW_SKILLS,
} from '@commands/init/tools/shared/skill-manifest';
import type { PackName } from '@commands/tools/shared/types';
import type { Command } from 'commander';

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
  switch (pack) {
    case 'core':
      return canonicalSkillPaths(CORE_SKILLS);
    case 'ideas':
      return canonicalSkillPaths(IDEA_SKILLS);
    case 'docs':
      return canonicalSkillPaths(DOCS_SKILLS);
    case 'workflows':
      return uniqueCanonicalPaths([
        ...canonicalSkillPaths(WORKFLOW_SKILLS),
        ...canonicalAgentPaths(WORKFLOW_AGENTS),
      ]);
    case 'utility':
      return canonicalSkillPaths(UTILITY_SKILLS);
    case 'project-management':
      return canonicalSkillPaths(PROJECT_MANAGEMENT_SKILLS);
    case 'research':
      return uniqueCanonicalPaths([
        ...canonicalSkillPaths(RESEARCH_SKILLS),
        ...canonicalAgentPaths(RESEARCH_AGENTS),
      ]);
  }
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
