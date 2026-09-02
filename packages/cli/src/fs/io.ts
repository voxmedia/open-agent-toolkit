import { randomUUID } from 'node:crypto';
import {
  chmod,
  lstat,
  link,
  mkdir,
  readdir,
  readFile,
  readlink,
  realpath,
  rename,
  rm,
  stat,
  symlink,
  writeFile,
} from 'node:fs/promises';
import {
  basename,
  dirname,
  isAbsolute,
  join,
  relative,
  resolve,
  sep,
} from 'node:path';

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
export interface CreatedCollectionSymlink {
  linkText: string;
  device: string;
  inode: string;
}
export interface CollectionSymlinkCreationGuard {
  scopeRoot: string;
  expectedParent: {
    device: string;
    inode: string;
  };
}

const COLLECTION_LINK_UNSAFE_CODE = 'E_COLLECTION_LINK_UNSAFE';
export type CopyDirectoryFilter = (
  sourcePath: string,
  relativePath: string,
) => boolean | Promise<boolean>;

export async function ensureDir(dirPath: string): Promise<void> {
  await mkdir(dirPath, { recursive: true });
}

export async function copyDirectory(
  src: string,
  dest: string,
  filter?: CopyDirectoryFilter,
  sourceRoot = src,
): Promise<void> {
  await ensureDir(dest);
  const entries = await readdir(src, { withFileTypes: true });

  for (const entry of entries) {
    const sourcePath = join(src, entry.name);
    const destPath = join(dest, entry.name);
    const relativePath = relative(sourceRoot, sourcePath);
    if (filter && !(await filter(sourcePath, relativePath))) continue;

    if (entry.isDirectory()) {
      await copyDirectory(sourcePath, destPath, filter, sourceRoot);
      continue;
    }

    if (entry.isFile()) {
      const sourceStat = await stat(sourcePath);
      const content = await readFile(sourcePath);
      await writeFile(destPath, content, { mode: sourceStat.mode });
      // writeFile's mode applies only on creation; chmod covers
      // pre-existing destination files so modes stay in sync.
      await chmod(destPath, sourceStat.mode);
    }
  }
}

export async function copySingleFile(src: string, dest: string): Promise<void> {
  await ensureDir(dirname(dest));
  const content = await readFile(src);
  await writeFile(dest, content);
}

export async function copySingleFileNoClobber(
  src: string,
  dest: string,
): Promise<void> {
  await ensureDir(dirname(dest));
  const content = await readFile(src);
  await writeFile(dest, content, { flag: 'wx' });
}

export async function writeFileNoClobber(
  dest: string,
  content: string,
): Promise<void> {
  await ensureDir(dirname(dest));
  await writeFile(dest, content, { encoding: 'utf8', flag: 'wx' });
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

export async function createSymlinkNoClobber(
  target: string,
  linkPath: string,
  isFile?: boolean,
): Promise<'symlink'> {
  await ensureDir(dirname(linkPath));
  const symlinkTarget = isAbsolute(target)
    ? relative(dirname(linkPath), target)
    : target;
  await symlink(symlinkTarget, linkPath, isFile ? 'file' : 'dir');
  return 'symlink';
}

export async function createCollectionSymlinkNoClobber(
  _target: string,
  linkPath: string,
  guard: CollectionSymlinkCreationGuard,
): Promise<CreatedCollectionSymlink> {
  const scopeRoot = resolve(guard.scopeRoot);
  const parent = resolve(dirname(linkPath));
  const relativeParent = relative(scopeRoot, parent);
  if (
    relativeParent === '..' ||
    relativeParent.startsWith(`..${sep}`) ||
    isAbsolute(relativeParent)
  ) {
    throw new Error('Collection destination parent is outside the sync scope.');
  }

  const parentSegments = relativeParent === '' ? [] : relativeParent.split(sep);
  const ancestors = [scopeRoot];
  let current = scopeRoot;
  for (const segment of parentSegments) {
    current = resolve(current, segment);
    ancestors.push(current);
  }

  let nearestExisting: Awaited<ReturnType<typeof lstat>> | undefined;
  for (const ancestor of [...ancestors].reverse()) {
    try {
      nearestExisting = await lstat(ancestor);
      break;
    } catch (error) {
      if (
        typeof error !== 'object' ||
        error === null ||
        !('code' in error) ||
        error.code !== 'ENOENT'
      ) {
        throw error;
      }
    }
  }
  if (
    nearestExisting === undefined ||
    nearestExisting.isSymbolicLink() ||
    !nearestExisting.isDirectory() ||
    String(nearestExisting.dev) !== guard.expectedParent.device ||
    String(nearestExisting.ino) !== guard.expectedParent.inode
  ) {
    throw new Error('Collection destination ancestry changed before creation.');
  }

  for (const ancestor of ancestors) {
    let ancestorStat: Awaited<ReturnType<typeof lstat>>;
    try {
      ancestorStat = await lstat(ancestor);
    } catch (error) {
      if (
        typeof error !== 'object' ||
        error === null ||
        !('code' in error) ||
        error.code !== 'ENOENT'
      ) {
        throw error;
      }
      continue;
    }
    if (ancestorStat.isSymbolicLink() || !ancestorStat.isDirectory()) {
      throw new Error(
        'Collection destination ancestry must contain only real directories.',
      );
    }
  }

  try {
    await lstat(linkPath);
    throw Object.assign(new Error('Collection destination already exists.'), {
      code: 'EEXIST',
    });
  } catch (error) {
    if (
      typeof error !== 'object' ||
      error === null ||
      !('code' in error) ||
      error.code !== 'ENOENT'
    ) {
      throw error;
    }
  }

  throw Object.assign(
    new Error(
      'Collection link creation is disabled because this runtime has no securely guarded parent-relative symlink primitive.',
    ),
    { code: COLLECTION_LINK_UNSAFE_CODE },
  );
}

export async function removeCollectionSymlinkIfUnchanged(
  linkPath: string,
  created: CreatedCollectionSymlink,
): Promise<boolean> {
  try {
    const current = await lstat(linkPath);
    if (
      !current.isSymbolicLink() ||
      String(current.dev) !== created.device ||
      String(current.ino) !== created.inode
    ) {
      return false;
    }

    if ((await readlink(linkPath)) !== created.linkText) {
      return false;
    }

    // Node's path-based unlink cannot bind the final removal to the identity
    // proven above. Preserve the alias until a guarded parent-relative
    // no-follow removal primitive is available.
    return false;
  } catch {
    return false;
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

export async function atomicWriteJsonContained(
  filePath: string,
  data: unknown,
  scopeRoot: string,
  options: { createOnly?: boolean } = {},
): Promise<void> {
  const resolvedScope = resolve(scopeRoot);
  const resolvedFile = resolve(filePath);
  const relativeFile = relative(resolvedScope, resolvedFile);
  if (
    relativeFile === '..' ||
    relativeFile.startsWith(`..${sep}`) ||
    isAbsolute(relativeFile)
  ) {
    throw new Error('JSON journal destination is outside its allowed scope.');
  }

  const scopeStat = await lstat(resolvedScope);
  if (scopeStat.isSymbolicLink() || !scopeStat.isDirectory()) {
    throw new Error('JSON journal scope must be a real directory.');
  }
  const realScope = await realpath(resolvedScope);
  const parentRelative = relative(resolvedScope, dirname(resolvedFile));
  const segments = parentRelative === '' ? [] : parentRelative.split(sep);
  let current = resolvedScope;
  for (const segment of segments) {
    current = join(current, segment);
    try {
      const currentStat = await lstat(current);
      if (currentStat.isSymbolicLink() || !currentStat.isDirectory()) {
        throw new Error(
          'JSON journal ancestry must not contain symlinks and must contain only real directories.',
        );
      }
    } catch (error) {
      if (
        typeof error !== 'object' ||
        error === null ||
        !('code' in error) ||
        error.code !== 'ENOENT'
      ) {
        throw error;
      }
      await mkdir(current);
    }
  }

  const realParent = await realpath(dirname(resolvedFile));
  const relativeParent = relative(realScope, realParent);
  if (
    relativeParent === '..' ||
    relativeParent.startsWith(`..${sep}`) ||
    isAbsolute(relativeParent)
  ) {
    throw new Error(
      'JSON journal ancestry resolves outside its allowed scope.',
    );
  }

  try {
    const targetStat = await lstat(resolvedFile);
    if (targetStat.isSymbolicLink() || !targetStat.isFile()) {
      throw new Error('JSON journal target must be a regular file.');
    }
  } catch (error) {
    if (
      typeof error !== 'object' ||
      error === null ||
      !('code' in error) ||
      error.code !== 'ENOENT'
    ) {
      throw error;
    }
  }

  const tempPath = join(
    dirname(resolvedFile),
    `.${basename(resolvedFile)}.${randomUUID()}.tmp`,
  );
  let tempCreated = false;
  try {
    await writeFile(tempPath, `${JSON.stringify(data, null, 2)}\n`, {
      encoding: 'utf8',
      flag: 'wx',
    });
    tempCreated = true;
    if ((await realpath(dirname(resolvedFile))) !== realParent) {
      throw new Error('JSON journal ancestry changed before publication.');
    }
    if (options.createOnly) {
      await link(tempPath, resolvedFile);
      await rm(tempPath);
      tempCreated = false;
    } else {
      await rename(tempPath, resolvedFile);
      tempCreated = false;
    }
  } finally {
    if (tempCreated) {
      await rm(tempPath, { force: true });
    }
  }
}
