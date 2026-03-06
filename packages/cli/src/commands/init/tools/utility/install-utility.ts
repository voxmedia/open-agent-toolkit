import { join } from 'node:path';
import { copyDirWithVersionCheck } from '@commands/init/tools/shared/copy-helpers';

export const UTILITY_SKILLS = [
  'oat-review-provide',
  'oat-review-receive',
  'oat-review-receive-remote',
  'oat-agent-instructions-analyze',
  'oat-agent-instructions-apply',
  'oat-repo-maintainability-review',
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
  outdatedSkills: Array<{
    name: string;
    installed: string | null;
    bundled: string | null;
  }>;
}

export async function installUtility(
  options: InstallUtilityOptions,
): Promise<InstallUtilityResult> {
  const force = options.force ?? false;
  const result: InstallUtilityResult = {
    copiedSkills: [],
    updatedSkills: [],
    skippedSkills: [],
    outdatedSkills: [],
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

  return result;
}
