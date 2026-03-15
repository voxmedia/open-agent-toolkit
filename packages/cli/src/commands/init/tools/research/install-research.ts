import { join } from 'node:path';

import {
  copyDirWithVersionCheck,
  copyFileWithStatus,
} from '@commands/init/tools/shared/copy-helpers';
import {
  RESEARCH_AGENTS,
  RESEARCH_SKILLS,
} from '@commands/init/tools/shared/skill-manifest';

export { RESEARCH_AGENTS, RESEARCH_SKILLS };

export interface InstallResearchOptions {
  assetsRoot: string;
  targetRoot: string;
  skills: string[];
  force?: boolean;
}

export interface InstallResearchResult {
  copiedSkills: string[];
  updatedSkills: string[];
  skippedSkills: string[];
  outdatedSkills: Array<{
    name: string;
    installed: string | null;
    bundled: string | null;
  }>;
  copiedAgents: string[];
  updatedAgents: string[];
  skippedAgents: string[];
}

export async function installResearch(
  options: InstallResearchOptions,
): Promise<InstallResearchResult> {
  const force = options.force ?? false;
  const result: InstallResearchResult = {
    copiedSkills: [],
    updatedSkills: [],
    skippedSkills: [],
    outdatedSkills: [],
    copiedAgents: [],
    updatedAgents: [],
    skippedAgents: [],
  };

  for (const skill of options.skills) {
    const source = join(options.assetsRoot, 'skills', skill);
    const destination = join(options.targetRoot, '.agents', 'skills', skill);
    const resultWithVersion = await copyDirWithVersionCheck(
      source,
      destination,
      force,
    );

    if (resultWithVersion.status === 'copied') {
      result.copiedSkills.push(skill);
    } else if (resultWithVersion.status === 'updated') {
      result.updatedSkills.push(skill);
    } else if (resultWithVersion.status === 'outdated') {
      result.outdatedSkills.push({
        name: skill,
        installed: resultWithVersion.installedVersion ?? null,
        bundled: resultWithVersion.bundledVersion ?? null,
      });
    } else {
      result.skippedSkills.push(skill);
    }
  }

  for (const agent of RESEARCH_AGENTS) {
    const source = join(options.assetsRoot, 'agents', agent);
    const destination = join(options.targetRoot, '.agents', 'agents', agent);
    const copyStatus = await copyFileWithStatus(source, destination, force);

    if (copyStatus === 'copied') {
      result.copiedAgents.push(agent);
    } else if (copyStatus === 'updated') {
      result.updatedAgents.push(agent);
    } else {
      result.skippedAgents.push(agent);
    }
  }

  return result;
}
