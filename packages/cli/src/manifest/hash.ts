import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { relative, resolve } from 'node:path';

import { CliError } from '@errors/index';

export function computeStringHash(content: string): string {
  const hash = createHash('sha256');
  hash.update(content);
  return hash.digest('hex');
}

async function collectFiles(
  root: string,
  current: string,
  acc: string[],
): Promise<void> {
  const entries = await readdir(current, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = resolve(current, entry.name);
    if (entry.isDirectory()) {
      await collectFiles(root, fullPath, acc);
      continue;
    }
    if (entry.isFile()) {
      acc.push(fullPath);
    }
  }
}

export async function computeFileHash(filePath: string): Promise<string> {
  try {
    const content = await readFile(filePath);
    const hash = createHash('sha256');
    hash.update(content);
    return hash.digest('hex');
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'ENOENT'
    ) {
      throw new CliError(`File does not exist: ${filePath}`);
    }

    throw new CliError(
      `Failed to compute hash for ${filePath}: ${
        error instanceof Error ? error.message : 'unknown error'
      }`,
      2,
    );
  }
}

export async function computeContentHash(
  contentPath: string,
  isFile: boolean,
): Promise<string> {
  return isFile
    ? computeFileHash(contentPath)
    : computeDirectoryHash(contentPath);
}

export async function computeDirectoryHash(dirPath: string): Promise<string> {
  const root = resolve(dirPath);
  const files: string[] = [];

  try {
    await collectFiles(root, root, files);
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'ENOENT'
    ) {
      throw new CliError(`Directory does not exist: ${dirPath}`);
    }

    throw new CliError(
      `Failed to compute hash for ${dirPath}: ${
        error instanceof Error ? error.message : 'unknown error'
      }`,
      2,
    );
  }

  files.sort((left, right) => {
    const leftRelative = relative(root, left);
    const rightRelative = relative(root, right);
    return leftRelative.localeCompare(rightRelative);
  });

  const hash = createHash('sha256');
  for (const file of files) {
    const relativePath = relative(root, file);
    const content = await readFile(file);
    hash.update(relativePath);
    hash.update('\0');
    hash.update(content);
    hash.update('\0');
  }

  return hash.digest('hex');
}
