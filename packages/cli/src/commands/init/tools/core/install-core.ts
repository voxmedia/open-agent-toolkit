import { join } from 'node:path';

import {
  copyDirWithStatus as defaultCopyDirWithStatus,
  copyDirWithVersionCheck as defaultCopyDirWithVersionCheck,
} from '@commands/init/tools/shared/copy-helpers';
import { CORE_SKILLS } from '@commands/init/tools/shared/skill-manifest';
import { dirExists as defaultDirExists } from '@fs/io';

export { CORE_SKILLS };

export interface InstallCoreDependencies {
  copyDirWithVersionCheck: (
    source: string,
    destination: string,
    force: boolean,
  ) => Promise<{
    status: string;
    installedVersion?: string | null;
    bundledVersion?: string | null;
  }>;
  copyDirWithStatus: (
    source: string,
    destination: string,
    force: boolean,
  ) => Promise<'copied' | 'updated' | 'skipped'>;
  dirExists: (path: string) => Promise<boolean>;
}

const defaultDependencies: InstallCoreDependencies = {
  copyDirWithVersionCheck: defaultCopyDirWithVersionCheck,
  copyDirWithStatus: defaultCopyDirWithStatus,
  dirExists: defaultDirExists,
};

export interface InstallCoreOptions {
  assetsRoot: string;
  targetRoot: string;
  force?: boolean;
  dependencies?: InstallCoreDependencies;
}

export interface InstallCoreResult {
  copiedSkills: string[];
  updatedSkills: string[];
  skippedSkills: string[];
  outdatedSkills: Array<{
    name: string;
    installed: string | null;
    bundled: string | null;
  }>;
  docsStatus: 'copied' | 'updated' | 'skipped';
}

export async function installCore(
  options: InstallCoreOptions,
): Promise<InstallCoreResult> {
  const force = options.force ?? false;
  const deps = options.dependencies ?? defaultDependencies;

  const result: InstallCoreResult = {
    copiedSkills: [],
    updatedSkills: [],
    skippedSkills: [],
    outdatedSkills: [],
    docsStatus: 'skipped',
  };

  for (const skill of CORE_SKILLS) {
    const source = join(options.assetsRoot, 'skills', skill);
    const destination = join(options.targetRoot, '.agents', 'skills', skill);
    const copyResult = await deps.copyDirWithVersionCheck(
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

  // Copy docs to ~/.oat/docs/
  const docsSource = join(options.assetsRoot, 'docs');
  const docsDestination = join(options.targetRoot, '.oat', 'docs');
  const docsExist = await deps.dirExists(docsSource);

  if (docsExist) {
    result.docsStatus = await deps.copyDirWithStatus(
      docsSource,
      docsDestination,
      force,
    );
  }

  return result;
}
