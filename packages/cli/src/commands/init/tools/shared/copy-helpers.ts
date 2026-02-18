import { rm } from 'node:fs/promises';
import { copyDirectory, copySingleFile, dirExists, fileExists } from '@fs/io';

export type CopyStatus = 'copied' | 'updated' | 'skipped';

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
