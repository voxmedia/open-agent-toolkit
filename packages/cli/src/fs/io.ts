import {
  mkdir,
  readdir,
  readFile,
  rename,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { dirname, join } from 'node:path';

export async function ensureDir(dirPath: string): Promise<void> {
  await mkdir(dirPath, { recursive: true });
}

export async function copyDirectory(src: string, dest: string): Promise<void> {
  await ensureDir(dest);
  const entries = await readdir(src, { withFileTypes: true });

  for (const entry of entries) {
    const sourcePath = join(src, entry.name);
    const destPath = join(dest, entry.name);

    if (entry.isDirectory()) {
      await copyDirectory(sourcePath, destPath);
      continue;
    }

    if (entry.isFile()) {
      const content = await readFile(sourcePath);
      await writeFile(destPath, content);
    }
  }
}

export async function createSymlink(
  target: string,
  linkPath: string,
): Promise<void> {
  await ensureDir(dirname(linkPath));

  try {
    await symlink(target, linkPath, 'dir');
  } catch {
    await rm(linkPath, { recursive: true, force: true });
    await copyDirectory(target, linkPath);
  }
}

export async function atomicWriteJson(
  filePath: string,
  data: unknown,
): Promise<void> {
  const tempPath = `${filePath}.tmp`;
  await ensureDir(dirname(filePath));
  await writeFile(tempPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  await rename(tempPath, filePath);
}
