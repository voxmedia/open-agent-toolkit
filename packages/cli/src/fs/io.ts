import {
  mkdir,
  readdir,
  readFile,
  rename,
  rm,
  stat,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { dirname, isAbsolute, join, relative } from 'node:path';

export async function fileExists(path: string): Promise<boolean> {
  try {
    const s = await stat(path);
    return s.isFile();
  } catch {
    return false;
  }
}

export async function dirExists(path: string): Promise<boolean> {
  try {
    const s = await stat(path);
    return s.isDirectory();
  } catch {
    return false;
  }
}

export type LinkStrategy = 'symlink' | 'copy';

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

export async function copySingleFile(src: string, dest: string): Promise<void> {
  await ensureDir(dirname(dest));
  const content = await readFile(src);
  await writeFile(dest, content);
}

export async function createSymlink(
  target: string,
  linkPath: string,
  onFallback?: (error: unknown) => void,
  isFile?: boolean,
): Promise<LinkStrategy> {
  await ensureDir(dirname(linkPath));

  // Use relative symlink targets so links stay valid when the source tree
  // moves (e.g., git worktrees that are later deleted). The original absolute
  // path is preserved for the copy fallback below.
  const symlinkTarget = isAbsolute(target)
    ? relative(dirname(linkPath), target)
    : target;

  try {
    await symlink(symlinkTarget, linkPath, isFile ? 'file' : 'dir');
    return 'symlink';
  } catch (error) {
    onFallback?.(error);
    await rm(linkPath, { recursive: true, force: true });
    if (isFile) {
      await copySingleFile(target, linkPath);
    } else {
      await copyDirectory(target, linkPath);
    }
    return 'copy';
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
