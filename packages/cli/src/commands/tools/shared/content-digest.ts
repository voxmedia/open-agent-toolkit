import { createHash } from 'node:crypto';
import { lstat, readFile, readdir, readlink } from 'node:fs/promises';
import { join } from 'node:path';

function executableMode(mode: number): string {
  return (mode & 0o111).toString(8);
}

function updateField(hash: ReturnType<typeof createHash>, value: string): void {
  hash.update(`${Buffer.byteLength(value)}:`);
  hash.update(value);
}

export async function digestFile(path: string): Promise<string> {
  const [content, metadata] = await Promise.all([readFile(path), lstat(path)]);
  const hash = createHash('sha256');
  updateField(hash, 'file');
  updateField(hash, executableMode(metadata.mode));
  hash.update(`${content.length}:`);
  hash.update(content);
  return hash.digest('hex');
}

export async function digestDirectory(root: string): Promise<string> {
  const hash = createHash('sha256');

  async function visit(directory: string, relativeRoot: string): Promise<void> {
    const entries = await readdir(directory, { withFileTypes: true });
    entries.sort((left, right) => left.name.localeCompare(right.name));

    for (const entry of entries) {
      const path = join(directory, entry.name);
      const relativePath = relativeRoot
        ? `${relativeRoot}/${entry.name}`
        : entry.name;
      const metadata = await lstat(path);

      if (entry.isDirectory()) {
        updateField(hash, 'directory');
        updateField(hash, relativePath);
        await visit(path, relativePath);
        continue;
      }

      if (entry.isFile()) {
        const content = await readFile(path);
        updateField(hash, 'file');
        updateField(hash, relativePath);
        updateField(hash, executableMode(metadata.mode));
        hash.update(`${content.length}:`);
        hash.update(content);
        continue;
      }

      if (entry.isSymbolicLink()) {
        updateField(hash, 'symlink');
        updateField(hash, relativePath);
        updateField(hash, await readlink(path));
        continue;
      }

      throw new Error(`Unsupported filesystem entry in pack asset: ${path}`);
    }
  }

  await visit(root, '');
  return hash.digest('hex');
}
