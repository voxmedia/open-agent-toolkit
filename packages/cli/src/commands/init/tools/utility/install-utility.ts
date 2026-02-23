import { join } from 'node:path';
import { copyDirWithStatus } from '@commands/init/tools/shared/copy-helpers';

export const UTILITY_SKILLS = [
  'oat-review-provide',
  'oat-review-receive',
  'oat-review-receive-remote',
  'oat-agent-instructions-analyze',
  'oat-agent-instructions-apply',
] as const;

export interface InstallUtilityOptions {
  assetsRoot: string;
  targetRoot: string;
  skills: string[];
  force?: boolean;
}

export interface InstallUtilityResult {
  copiedSkills: string[];
  updatedSkills: string[];
  skippedSkills: string[];
}

export async function installUtility(
  options: InstallUtilityOptions,
): Promise<InstallUtilityResult> {
  const force = options.force ?? false;
  const result: InstallUtilityResult = {
    copiedSkills: [],
    updatedSkills: [],
    skippedSkills: [],
  };

  for (const skill of options.skills) {
    const source = join(options.assetsRoot, 'skills', skill);
    const destination = join(options.targetRoot, '.agents', 'skills', skill);
    const status = await copyDirWithStatus(source, destination, force);

    if (status === 'copied') {
      result.copiedSkills.push(skill);
    } else if (status === 'updated') {
      result.updatedSkills.push(skill);
    } else {
      result.skippedSkills.push(skill);
    }
  }

  return result;
}
