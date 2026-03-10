import { join } from 'node:path';

import {
  copyDirWithVersionCheck,
  copyFileWithStatus,
} from '@commands/init/tools/shared/copy-helpers';
import { IDEA_SKILLS } from '@commands/init/tools/shared/skill-manifest';

export { IDEA_SKILLS };

const INFRA_FILE_MAPPINGS = [
  { src: 'ideas-backlog.md', dest: '.oat/ideas/backlog.md' },
  { src: 'ideas-scratchpad.md', dest: '.oat/ideas/scratchpad.md' },
] as const;

const RUNTIME_TEMPLATE_MAPPINGS = [
  { src: 'idea-discovery.md', dest: '.oat/templates/ideas/idea-discovery.md' },
  { src: 'idea-summary.md', dest: '.oat/templates/ideas/idea-summary.md' },
] as const;

export interface InstallIdeasOptions {
  assetsRoot: string;
  targetRoot: string;
  force?: boolean;
}

export interface InstallIdeasResult {
  copiedSkills: string[];
  updatedSkills: string[];
  skippedSkills: string[];
  outdatedSkills: Array<{
    name: string;
    installed: string | null;
    bundled: string | null;
  }>;
  copiedInfraFiles: string[];
  updatedInfraFiles: string[];
  skippedInfraFiles: string[];
  copiedTemplates: string[];
  updatedTemplates: string[];
  skippedTemplates: string[];
}

export async function installIdeas(
  options: InstallIdeasOptions,
): Promise<InstallIdeasResult> {
  const force = options.force ?? false;
  const ideasTemplatesRoot = join(options.assetsRoot, 'templates', 'ideas');

  const result: InstallIdeasResult = {
    copiedSkills: [],
    updatedSkills: [],
    skippedSkills: [],
    outdatedSkills: [],
    copiedInfraFiles: [],
    updatedInfraFiles: [],
    skippedInfraFiles: [],
    copiedTemplates: [],
    updatedTemplates: [],
    skippedTemplates: [],
  };

  for (const skill of IDEA_SKILLS) {
    const source = join(options.assetsRoot, 'skills', skill);
    const destination = join(options.targetRoot, '.agents', 'skills', skill);
    const copyResult = await copyDirWithVersionCheck(
      source,
      destination,
      force,
    );

    if (copyResult.status === 'copied') {
      result.copiedSkills.push(skill);
    } else if (copyResult.status === 'updated') {
      result.updatedSkills.push(skill);
    } else if (copyResult.status === 'outdated') {
      result.outdatedSkills.push({
        name: skill,
        installed: copyResult.installedVersion ?? null,
        bundled: copyResult.bundledVersion ?? null,
      });
    } else {
      result.skippedSkills.push(skill);
    }
  }

  for (const mapping of INFRA_FILE_MAPPINGS) {
    const source = join(ideasTemplatesRoot, mapping.src);
    const destination = join(options.targetRoot, mapping.dest);
    const copyStatus = await copyFileWithStatus(source, destination, force);

    if (copyStatus === 'copied') {
      result.copiedInfraFiles.push(mapping.dest);
    } else if (copyStatus === 'updated') {
      result.updatedInfraFiles.push(mapping.dest);
    } else {
      result.skippedInfraFiles.push(mapping.dest);
    }
  }

  for (const mapping of RUNTIME_TEMPLATE_MAPPINGS) {
    const source = join(ideasTemplatesRoot, mapping.src);
    const destination = join(options.targetRoot, mapping.dest);
    const copyStatus = await copyFileWithStatus(source, destination, force);

    if (copyStatus === 'copied') {
      result.copiedTemplates.push(mapping.dest);
    } else if (copyStatus === 'updated') {
      result.updatedTemplates.push(mapping.dest);
    } else {
      result.skippedTemplates.push(mapping.dest);
    }
  }

  return result;
}
