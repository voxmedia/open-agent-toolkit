import { join } from 'node:path';

import {
  copyDirWithVersionCheck,
  copyFileWithStatus,
} from '@commands/init/tools/shared/copy-helpers';
import {
  PROJECT_MANAGEMENT_SCRIPTS,
  PROJECT_MANAGEMENT_SKILLS,
  PROJECT_MANAGEMENT_TEMPLATES,
} from '@commands/init/tools/shared/skill-manifest';

export {
  PROJECT_MANAGEMENT_SCRIPTS,
  PROJECT_MANAGEMENT_SKILLS,
  PROJECT_MANAGEMENT_TEMPLATES,
};

export interface InstallProjectManagementOptions {
  assetsRoot: string;
  targetRoot: string;
  force?: boolean;
}

export interface InstallProjectManagementResult {
  copiedSkills: string[];
  updatedSkills: string[];
  skippedSkills: string[];
  outdatedSkills: Array<{
    name: string;
    installed: string | null;
    bundled: string | null;
  }>;
  copiedTemplates: string[];
  updatedTemplates: string[];
  skippedTemplates: string[];
}

export async function installProjectManagement(
  options: InstallProjectManagementOptions,
): Promise<InstallProjectManagementResult> {
  const force = options.force ?? false;

  const result: InstallProjectManagementResult = {
    copiedSkills: [],
    updatedSkills: [],
    skippedSkills: [],
    outdatedSkills: [],
    copiedTemplates: [],
    updatedTemplates: [],
    skippedTemplates: [],
  };

  for (const skill of PROJECT_MANAGEMENT_SKILLS) {
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

  for (const template of PROJECT_MANAGEMENT_TEMPLATES) {
    const source = join(options.assetsRoot, 'templates', template);
    const destination = join(options.targetRoot, '.oat', 'templates', template);
    const copyStatus = await copyFileWithStatus(source, destination, force);

    if (copyStatus === 'copied') {
      result.copiedTemplates.push(template);
    } else if (copyStatus === 'updated') {
      result.updatedTemplates.push(template);
    } else {
      result.skippedTemplates.push(template);
    }
  }

  return result;
}
