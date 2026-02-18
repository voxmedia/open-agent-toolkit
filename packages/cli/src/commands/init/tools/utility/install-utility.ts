import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import { copyDirectory, dirExists, fileExists } from '@fs/io';

export const UTILITY_SKILLS = ['oat-review-provide'] as const;

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

async function pathExists(path: string): Promise<boolean> {
  return (await fileExists(path)) || (await dirExists(path));
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
    const exists = await pathExists(destination);

    if (exists && !force) {
      result.skippedSkills.push(skill);
      continue;
    }

    if (exists && force) {
      await rm(destination, { recursive: true, force: true });
      await copyDirectory(source, destination);
      result.updatedSkills.push(skill);
      continue;
    }

    await copyDirectory(source, destination);
    result.copiedSkills.push(skill);
  }

  return result;
}
