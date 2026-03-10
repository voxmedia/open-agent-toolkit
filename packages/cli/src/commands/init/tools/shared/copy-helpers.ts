import { rm } from 'node:fs/promises';

import { compareVersions } from '@commands/init/tools/shared/version';
import { getSkillVersion } from '@commands/shared/frontmatter';
import { copyDirectory, copySingleFile, dirExists, fileExists } from '@fs/io';

export type CopyStatus = 'copied' | 'updated' | 'skipped';
export type CopyStatusExtended = CopyStatus | 'outdated';

export interface CopyResult {
  status: CopyStatusExtended;
  installedVersion?: string | null;
  bundledVersion?: string | null;
}

export async function pathExists(path: string): Promise<boolean> {
  return (await fileExists(path)) || (await dirExists(path));
}

export async function copyDirWithStatus(
  source: string,
  destination: string,
  force: boolean,
): Promise<CopyStatus> {
  const exists = await pathExists(destination);

  if (exists && !force) {
    return 'skipped';
  }

  if (exists && force) {
    await rm(destination, { recursive: true, force: true });
    await copyDirectory(source, destination);
    return 'updated';
  }

  await copyDirectory(source, destination);
  return 'copied';
}

export async function copyFileWithStatus(
  source: string,
  destination: string,
  force: boolean,
): Promise<CopyStatus> {
  const exists = await pathExists(destination);

  if (exists && !force) {
    return 'skipped';
  }

  if (exists && force) {
    await rm(destination, { recursive: true, force: true });
    await copySingleFile(source, destination);
    return 'updated';
  }

  await copySingleFile(source, destination);
  return 'copied';
}

export async function copyDirWithVersionCheck(
  source: string,
  destination: string,
  force: boolean,
): Promise<CopyResult> {
  const exists = await pathExists(destination);

  if (!exists) {
    await copyDirectory(source, destination);
    return { status: 'copied' };
  }

  if (force) {
    await rm(destination, { recursive: true, force: true });
    await copyDirectory(source, destination);
    return { status: 'updated' };
  }

  const bundledVersion = await getSkillVersion(source);
  const installedVersion = await getSkillVersion(destination);
  const versionState = compareVersions(installedVersion, bundledVersion);

  if (versionState === 'outdated') {
    return { status: 'outdated', installedVersion, bundledVersion };
  }

  return { status: 'skipped' };
}
