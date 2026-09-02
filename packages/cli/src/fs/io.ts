import { randomUUID } from 'node:crypto';
import {
  chmod,
  lstat,
  link,
  mkdir,
  open,
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

interface FileIdentity {
  device: string;
  inode: string;
}

const DISPATCH_LOCK_RETRY_MS = 10;
const DISPATCH_LOCK_TIMEOUT_MS = 5000;

/**
 * Exclusive contained writer lock. `mkdir` without `recursive` is the atomic
 * primitive: exactly one caller can create the directory, and every other
 * caller observes `EEXIST`. The lock is validated as a real directory so a
 * planted symlink fails closed instead of redirecting the guarded section.
 */
export async function withContainedWriterLock<T>(
  lockPath: string,
  scopeRoot: string,
  run: () => Promise<T>,
): Promise<T> {
  const resolvedScope = resolve(scopeRoot);
  const resolvedLock = resolve(lockPath);
  if (dirname(resolvedLock) !== resolvedScope) {
    throw new Error('Writer lock must live directly inside its scope root.');
  }
  const scopeStat = await lstat(resolvedScope);
  if (scopeStat.isSymbolicLink() || !scopeStat.isDirectory()) {
    throw new Error('Writer lock scope must be a real directory.');
  }

  const deadline = Date.now() + DISPATCH_LOCK_TIMEOUT_MS;
  for (;;) {
    try {
      await mkdir(resolvedLock);
      break;
    } catch (error) {
      if (
        typeof error !== 'object' ||
        error === null ||
        !('code' in error) ||
        error.code !== 'EEXIST'
      ) {
        throw error;
      }
      if (Date.now() >= deadline) {
        throw new Error(
          `Another writer holds ${resolvedLock}. Remove it once no writer is running, then retry.`,
          { cause: error },
        );
      }
      await new Promise((resolveDelay) =>
        setTimeout(resolveDelay, DISPATCH_LOCK_RETRY_MS),
      );
    }
  }

  try {
    const held = await lstat(resolvedLock);
    if (held.isSymbolicLink() || !held.isDirectory()) {
      throw new Error('Writer lock is not a real directory.');
    }
    return await run();
  } finally {
    await rm(resolvedLock, { recursive: true, force: true });
  }
}

function identityOf(entry: {
  dev: bigint | number;
  ino: bigint | number;
}): FileIdentity {
  return { device: String(entry.dev), inode: String(entry.ino) };
}

function sameIdentity(left: FileIdentity, right: FileIdentity): boolean {
  return left.device === right.device && left.inode === right.inode;
}

async function assertUnchangedIdentity(
  path: string,
  expected: FileIdentity,
  message: string,
): Promise<void> {
  if (!sameIdentity(identityOf(await lstat(path)), expected)) {
    throw new Error(message);
  }
}

/**
 * Scope-relative rendering for any path this module reports. NFR1 requires that
 * home paths and user-specific absolute paths stay out of durable output, so no
 * error raised below may carry an absolute path.
 */
function scopeRelative(resolvedScope: string, target: string): string {
  const rendered = relative(resolvedScope, resolve(target));
  return rendered === '' ? '.' : rendered.split(sep).join('/');
}

function errorCode(error: unknown): string | null {
  return typeof error === 'object' && error !== null && 'code' in error
    ? String((error as { code: unknown }).code)
    : null;
}

/**
 * Re-raise a filesystem error without Node's absolute-path message text while
 * preserving its `code` so callers can still branch on `EEXIST`/`ENOENT`.
 */
function redactedFsError(
  error: unknown,
  operation: string,
  relativeTarget: string,
): Error {
  const code = errorCode(error);
  const raised = new Error(
    `Journal ${operation} failed for ${relativeTarget}${code === null ? '' : ` (${code})`}.`,
    { cause: error },
  );
  return code === null ? raised : Object.assign(raised, { code });
}

/**
 * Node exposes no `openat`/`renameat`/`linkat`, so a path-based final operation
 * cannot be bound to a directory file descriptor. Publication is therefore
 * append-only and create-only: the destination must not already exist, the only
 * publishing syscall is `link`, and this module never issues `rename`, `rm`, or
 * `unlink` against a publication destination. A pathname swapped after the last
 * check can therefore cause at most an unreferenced create, never a replacement
 * or a deletion of content this call did not create.
 */
async function publicationIsMisplaced(
  resolvedFile: string,
  tempIdentity: FileIdentity,
  parentIdentity: FileIdentity,
  realScope: string,
): Promise<string | null> {
  let published;
  try {
    published = await lstat(resolvedFile);
  } catch {
    return 'the published name disappeared';
  }
  if (published.isSymbolicLink() || !published.isFile()) {
    return 'the published name is not a regular file';
  }
  if (!sameIdentity(identityOf(published), tempIdentity)) {
    return 'the published name is not the staged file';
  }
  try {
    if (
      !sameIdentity(
        identityOf(await lstat(dirname(resolvedFile))),
        parentIdentity,
      )
    ) {
      return 'the parent directory identity changed';
    }
    const currentRealParent = await realpath(dirname(resolvedFile));
    const currentRelative = relative(realScope, currentRealParent);
    if (
      currentRelative === '..' ||
      currentRelative.startsWith(`..${sep}`) ||
      isAbsolute(currentRelative)
    ) {
      return 'the parent directory resolves outside the allowed scope';
    }
  } catch {
    return 'the parent directory could not be re-validated';
  }
  return null;
}

/**
 * Remove the staging file only when the name still resolves to the exact inode
 * this call created. A swapped directory pathname therefore strands the staged
 * file rather than deleting an unrelated one. Returns whether the staged data
 * was provably removed, so callers can report the outcome accurately.
 */
async function removeStagedFile(
  tempPath: string,
  tempIdentity: FileIdentity | null,
): Promise<'removed' | 'stranded'> {
  try {
    if (tempIdentity === null) {
      await rm(tempPath, { force: true });
      return 'removed';
    }
    const current = await lstat(tempPath);
    if (!sameIdentity(identityOf(current), tempIdentity)) {
      return 'stranded';
    }
    await rm(tempPath, { force: true });
    return 'removed';
  } catch {
    return 'stranded';
  }
}

/**
 * Publish one immutable JSON journal revision.
 *
 * Guarantees, stated as what the code does:
 * - The destination is created with `link` only. An occupied destination raises
 *   `EEXIST`; the destination is never renamed onto, removed, or truncated.
 * - After publication the destination is proven to be the exact staged inode,
 *   inside the same directory inode validated before staging, still resolving
 *   inside `scopeRoot`. Failure raises and removes nothing.
 * - Staging cleanup removes only the inode this call created.
 * - No raised message contains an absolute path.
 *
 * Residual, unchanged by this design: a privileged concurrent process that
 * swaps the validated directory pathname can cause the `link` to create an
 * unreferenced file under a directory it controls, and can strand the staged
 * file. Neither outcome replaces or deletes pre-existing content.
 */
export async function publishContainedJsonRevision(
  filePath: string,
  data: unknown,
  scopeRoot: string,
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
  const reportedFile = scopeRelative(resolvedScope, resolvedFile);

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
      if (errorCode(error) !== 'ENOENT') {
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

  // Publication is create-only, so an already-published revision is a lost
  // compare-and-swap rather than something to overwrite.
  try {
    await lstat(resolvedFile);
    throw Object.assign(
      new Error(`Journal revision ${reportedFile} already exists.`),
      { code: 'EEXIST' },
    );
  } catch (error) {
    if (errorCode(error) !== 'ENOENT') {
      throw error;
    }
  }

  const parentIdentity = identityOf(await lstat(dirname(resolvedFile)));
  const content = `${JSON.stringify(data, null, 2)}\n`;
  const tempPath = join(
    dirname(resolvedFile),
    `.${basename(resolvedFile)}.${randomUUID()}.tmp`,
  );
  const reportedTemp = scopeRelative(resolvedScope, tempPath);
  let tempCreated = false;
  let stagedIdentity: FileIdentity | null = null;
  try {
    let handle;
    try {
      handle = await open(tempPath, 'wx');
    } catch (error) {
      throw redactedFsError(error, 'staging', reportedTemp);
    }
    let tempIdentity: FileIdentity;
    try {
      tempCreated = true;
      await handle.writeFile(content, 'utf8');
      tempIdentity = identityOf(await handle.stat());
      stagedIdentity = tempIdentity;
    } finally {
      await handle.close();
    }

    // Last ancestry check, then the identity binding that narrows the window
    // between that check and the path-based publication below.
    if ((await realpath(dirname(resolvedFile))) !== realParent) {
      throw new Error('JSON journal ancestry changed before publication.');
    }
    await assertUnchangedIdentity(
      dirname(resolvedFile),
      parentIdentity,
      'JSON journal directory identity changed before publication.',
    );
    await assertUnchangedIdentity(
      tempPath,
      tempIdentity,
      'JSON journal staging file identity changed before publication.',
    );

    try {
      await link(tempPath, resolvedFile);
    } catch (error) {
      throw redactedFsError(error, 'publication', reportedFile);
    }

    const misplaced = await publicationIsMisplaced(
      resolvedFile,
      tempIdentity,
      parentIdentity,
      realScope,
    );
    if (misplaced) {
      // Never remove the destination: under a swapped pathname it may name
      // content this call did not create.
      const staged = await removeStagedFile(tempPath, tempIdentity);
      tempCreated = false;
      throw new Error(
        `Journal revision ${reportedFile} could not be verified inside the validated directory (${misplaced}). It was not published to the project journal, and this call removed and replaced nothing. ${
          staged === 'removed'
            ? 'Staged data was removed.'
            : 'A staged copy may remain outside the validated directory.'
        }`,
      );
    }

    await removeStagedFile(tempPath, tempIdentity);
    tempCreated = false;
  } finally {
    if (tempCreated) {
      await removeStagedFile(tempPath, stagedIdentity);
    }
  }
}
