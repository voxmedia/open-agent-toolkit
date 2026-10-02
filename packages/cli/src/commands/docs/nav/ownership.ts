import { createHash, randomUUID } from 'node:crypto';
import {
  lstat,
  readFile,
  readdir,
  rename,
  rm,
  writeFile,
} from 'node:fs/promises';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';

interface OwnedFile {
  path: string;
  hash: string;
}
interface Manifest {
  version: 1;
  files: OwnedFile[];
}

function hash(content: string | Uint8Array): string {
  return createHash('sha256').update(content).digest('hex');
}

async function safePath(root: string, path: string): Promise<void> {
  const suffix = relative(root, path);
  if (isAbsolute(suffix) || suffix === '..' || suffix.startsWith(`..${sep}`))
    throw new Error(`Unsafe metadata path: ${path}`);
  let cursor = root;
  for (const segment of ['', ...suffix.split(sep)]) {
    cursor = join(cursor, segment);
    const stat = await lstat(cursor).catch((error: NodeJS.ErrnoException) => {
      if (error.code === 'ENOENT') return undefined;
      throw error;
    });
    if (stat?.isSymbolicLink())
      throw new Error(`Symlink metadata path refused: ${cursor}`);
  }
}

async function readOptional(path: string): Promise<Buffer | undefined> {
  return readFile(path).catch((error: NodeJS.ErrnoException) => {
    if (error.code === 'ENOENT') return undefined;
    throw error;
  });
}

async function atomicWrite(path: string, content: string): Promise<void> {
  const temporary = join(dirname(path), `.oat-nav-${randomUUID()}.tmp`);
  try {
    await writeFile(temporary, content, { flag: 'wx' });
    await rename(temporary, path);
  } finally {
    await rm(temporary, { force: true });
  }
}

export async function applyOwnedMetadata(
  appRoot: string,
  docsRoot: string,
  output: Map<string, string>,
  check: boolean,
): Promise<void> {
  const manifestPath = join(appRoot, '.oat-fumadocs-nav.json');
  await safePath(appRoot, manifestPath);
  const manifestBytes = await readOptional(manifestPath);
  const manifestSource = manifestBytes?.toString('utf8');
  if (manifestBytes && !manifestBytes.equals(Buffer.from(manifestSource!)))
    throw new Error(`Invalid ownership sidecar ${manifestPath}: invalid UTF-8`);
  const owned = new Map<string, string>();
  if (manifestSource !== undefined) {
    const manifest: unknown = JSON.parse(manifestSource);
    if (
      !manifest ||
      typeof manifest !== 'object' ||
      !('version' in manifest) ||
      manifest.version !== 1 ||
      !('files' in manifest) ||
      !Array.isArray(manifest.files)
    )
      throw new Error(`Invalid ownership sidecar ${manifestPath}`);
    for (const file of manifest.files as unknown[]) {
      if (
        !file ||
        typeof file !== 'object' ||
        !('path' in file) ||
        typeof file.path !== 'string' ||
        !('hash' in file) ||
        typeof file.hash !== 'string' ||
        !/^[a-f\d]{64}$/.test(file.hash) ||
        !/^(?:[^./\\][^/\\]*\/)*meta\.json$/.test(file.path) ||
        isAbsolute(file.path) ||
        owned.has(file.path)
      )
        throw new Error(
          `Unsafe or duplicate ownership entry in ${manifestPath}`,
        );
      const path = resolve(docsRoot, file.path);
      await safePath(docsRoot, path);
      owned.set(file.path, file.hash);
    }
  }
  const existingMetadata = new Set<string>();
  async function scan(directory: string): Promise<void> {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) await scan(path);
      else if (entry.name === 'meta.json')
        existingMetadata.add(relative(docsRoot, path).replaceAll(sep, '/'));
    }
  }
  await scan(docsRoot);
  const contents = new Map<string, Buffer | undefined>();
  for (const name of new Set([
    ...output.keys(),
    ...owned.keys(),
    ...existingMetadata,
  ])) {
    const path = resolve(docsRoot, name);
    await safePath(docsRoot, path);
    const content = await readOptional(path);
    contents.set(name, content);
    if (
      content !== undefined &&
      (!owned.has(name) || hash(content) !== owned.get(name)) &&
      (!output.has(name) || !content.equals(Buffer.from(output.get(name)!)))
    ) {
      throw new Error(
        `Refusing unowned or externally edited metadata ${path}; preserve authored changes and remove only disposable output before regenerating`,
      );
    }
  }
  const nextManifest: Manifest = {
    version: 1,
    files: [...output].map(([path, content]) => ({
      path,
      hash: hash(content),
    })),
  };
  const nextSource = `${JSON.stringify(nextManifest, null, 2)}\n`;
  if (check) {
    for (const [name, content] of output)
      if (!contents.get(name)?.equals(Buffer.from(content)))
        throw new Error(
          `Missing or different generated metadata ${name}; run oat docs nav sync --framework fumadocs`,
        );
    for (const name of owned.keys())
      if (!output.has(name))
        throw new Error(
          `Stale generated metadata ${name}; run oat docs nav sync --framework fumadocs`,
        );
    if (manifestSource !== nextSource)
      throw new Error(
        'Missing or different ownership sidecar; regenerate Fumadocs navigation',
      );
    return;
  }
  try {
    for (const [name, content] of output)
      if (!contents.get(name)?.equals(Buffer.from(content)))
        await atomicWrite(join(docsRoot, name), content);
    for (const name of owned.keys())
      if (!output.has(name) && contents.get(name) !== undefined)
        await rm(join(docsRoot, name));
    if (manifestSource !== nextSource)
      await atomicWrite(manifestPath, nextSource);
  } catch (error) {
    throw new Error(
      `Navigation write stopped; files may be partially updated. Preserve changes and inspect metadata/sidecar hashes before removing disposable output and regenerating: ${String(error)}`,
      { cause: error },
    );
  }
}
