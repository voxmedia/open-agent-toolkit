import { join } from 'node:path';

import { copyDirWithVersionCheck } from '@commands/init/tools/shared/copy-helpers';
import { BRAINSTORM_SKILLS } from '@commands/init/tools/shared/skill-manifest';

export { BRAINSTORM_SKILLS };

export interface InstallBrainstormOptions {
  assetsRoot: string;
  targetRoot: string;
  force?: boolean;
}

export interface InstallBrainstormResult {
  copiedSkills: string[];
  updatedSkills: string[];
  skippedSkills: string[];
  outdatedSkills: Array<{
    name: string;
    installed: string | null;
    bundled: string | null;
  }>;
}

export async function installBrainstorm(
  options: InstallBrainstormOptions,
): Promise<InstallBrainstormResult> {
  const force = options.force ?? false;

  const result: InstallBrainstormResult = {
    copiedSkills: [],
    updatedSkills: [],
    skippedSkills: [],
    outdatedSkills: [],
  };

  for (const skill of BRAINSTORM_SKILLS) {
    const source = join(options.assetsRoot, 'skills', skill);
    const destination = join(options.targetRoot, '.agents', 'skills', skill);
    // The visual-companion bundle (scripts/, references/) ships under the
    // skill directory and copies along with it via copyDirWithVersionCheck.
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

  return result;
}
