import { readdir } from 'node:fs/promises';
import { join } from 'node:path';

import { CORE_SKILLS } from '@commands/init/tools/core/install-core';
import { IDEA_SKILLS } from '@commands/init/tools/ideas/install-ideas';
import {
  RESEARCH_AGENTS,
  RESEARCH_SKILLS,
} from '@commands/init/tools/research/install-research';
import { compareVersions } from '@commands/init/tools/shared/version';
import { UTILITY_SKILLS } from '@commands/init/tools/utility/install-utility';
import {
  WORKFLOW_AGENTS,
  WORKFLOW_SKILLS,
} from '@commands/init/tools/workflows/install-workflows';
import { getAgentVersion, getSkillVersion } from '@commands/shared/frontmatter';
import { dirExists, fileExists } from '@fs/io';
import type { ConcreteScope } from '@shared/types';

import type { PackName, ToolInfo } from './types';

export interface ScanToolsDependencies {
  getSkillVersion: (skillDir: string) => Promise<string | null>;
  getAgentVersion: (agentPath: string) => Promise<string | null>;
  readdir: (path: string) => Promise<string[]>;
  readdirFiles: (path: string, extension: string) => Promise<string[]>;
  dirExists: (path: string) => Promise<boolean>;
  fileExists: (path: string) => Promise<boolean>;
}

const defaultDependencies: ScanToolsDependencies = {
  getSkillVersion,
  getAgentVersion,
  readdir: async (path: string) => {
    try {
      const entries = await readdir(path, { withFileTypes: true });
      return entries
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name);
    } catch {
      return [];
    }
  },
  readdirFiles: async (path: string, extension: string) => {
    try {
      const entries = await readdir(path, { withFileTypes: true });
      return entries
        .filter((entry) => entry.isFile() && entry.name.endsWith(extension))
        .map((entry) => entry.name);
    } catch {
      return [];
    }
  },
  dirExists,
  fileExists,
};

function resolveSkillPack(name: string): PackName | 'custom' {
  if ((CORE_SKILLS as readonly string[]).includes(name)) return 'core';
  if ((IDEA_SKILLS as readonly string[]).includes(name)) return 'ideas';
  if ((WORKFLOW_SKILLS as readonly string[]).includes(name)) return 'workflows';
  if ((UTILITY_SKILLS as readonly string[]).includes(name)) return 'utility';
  if ((RESEARCH_SKILLS as readonly string[]).includes(name)) return 'research';
  return 'custom';
}

function resolveAgentPack(filename: string): PackName | 'custom' {
  if ((WORKFLOW_AGENTS as readonly string[]).includes(filename))
    return 'workflows';
  if ((RESEARCH_AGENTS as readonly string[]).includes(filename))
    return 'research';
  return 'custom';
}

function resolveStatus(
  installedVersion: string | null,
  bundledVersion: string | null,
): ToolInfo['status'] {
  if (bundledVersion === null) return 'not-bundled';
  return compareVersions(installedVersion, bundledVersion);
}

export interface ScanToolsOptions {
  scope: ConcreteScope;
  scopeRoot: string;
  assetsRoot: string;
  dependencies?: ScanToolsDependencies;
}

export async function scanTools(
  options: ScanToolsOptions,
): Promise<ToolInfo[]> {
  const deps = options.dependencies ?? defaultDependencies;
  const tools: ToolInfo[] = [];

  // Scan skills
  const skillsDir = join(options.scopeRoot, '.agents', 'skills');
  const skillDirs = await deps.readdir(skillsDir);

  for (const skillName of skillDirs) {
    const installedPath = join(skillsDir, skillName);
    const bundledPath = join(options.assetsRoot, 'skills', skillName);
    const pack = resolveSkillPack(skillName);

    const installedVersion = await deps.getSkillVersion(installedPath);
    const hasBundled = await deps.dirExists(bundledPath);
    const bundledVersion = hasBundled
      ? await deps.getSkillVersion(bundledPath)
      : null;

    tools.push({
      name: skillName,
      type: 'skill',
      scope: options.scope,
      version: installedVersion,
      bundledVersion,
      pack,
      status: hasBundled
        ? resolveStatus(installedVersion, bundledVersion)
        : 'not-bundled',
    });
  }

  // Scan agents (project scope only)
  if (options.scope === 'project') {
    const agentsDir = join(options.scopeRoot, '.agents', 'agents');
    const agentsDirExists = await deps.dirExists(agentsDir);

    if (agentsDirExists) {
      const agentFiles = await deps.readdirFiles(agentsDir, '.md');

      for (const agentFile of agentFiles) {
        const installedPath = join(agentsDir, agentFile);
        const bundledPath = join(options.assetsRoot, 'agents', agentFile);
        const pack = resolveAgentPack(agentFile);

        const installedVersion = await deps.getAgentVersion(installedPath);
        const hasBundled = await deps.fileExists(bundledPath);
        const bundledVersion = hasBundled
          ? await deps.getAgentVersion(bundledPath)
          : null;

        const name = agentFile.replace(/\.md$/, '');
        tools.push({
          name,
          type: 'agent',
          scope: options.scope,
          version: installedVersion,
          bundledVersion,
          pack,
          status: hasBundled
            ? resolveStatus(installedVersion, bundledVersion)
            : 'not-bundled',
        });
      }
    }
  }

  return tools;
}
