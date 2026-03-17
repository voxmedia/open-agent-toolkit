import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { getFrontmatterBlock } from '@commands/shared/frontmatter';
import YAML from 'yaml';

function buildBacklogHashInput(
  filename: string,
  createdAt: string,
  nonce: number,
): string {
  return nonce === 0 ? filename : `${filename}#${nonce}`;
}

export function generateBacklogId(
  filename: string,
  createdAt: string,
  nonce = 0,
): string {
  const hash = createHash('sha256')
    .update(buildBacklogHashInput(filename, createdAt, nonce))
    .update('\0')
    .update(createdAt)
    .digest('hex');

  return `bl-${hash.slice(0, 4)}`;
}

export function generateUniqueBacklogId(
  filename: string,
  createdAt: string,
  existingIds: Iterable<string>,
): string {
  const ids = new Set(existingIds);

  for (let nonce = 0; nonce < Number.MAX_SAFE_INTEGER; nonce += 1) {
    const candidate = generateBacklogId(filename, createdAt, nonce);
    if (!ids.has(candidate)) {
      return candidate;
    }
  }

  throw new Error('Unable to generate a unique backlog ID.');
}

export async function readExistingBacklogIds(
  backlogRoot: string,
): Promise<Set<string>> {
  const ids = new Set<string>();
  const sourceDirs = ['items', 'archived'];

  for (const dirName of sourceDirs) {
    const sourceDir = join(backlogRoot, dirName);

    try {
      const entries = await readdir(sourceDir, { withFileTypes: true });

      for (const entry of entries) {
        if (!entry.isFile() || !entry.name.endsWith('.md')) {
          continue;
        }

        const content = await readFile(join(sourceDir, entry.name), 'utf8');
        const rawFrontmatter = getFrontmatterBlock(content);
        if (!rawFrontmatter) {
          continue;
        }

        const parsed = YAML.parse(rawFrontmatter);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
          continue;
        }

        const id = parsed.id;
        if (typeof id === 'string' && id.length > 0) {
          ids.add(id);
        }
      }

      continue;
    } catch (error) {
      const code =
        error && typeof error === 'object' && 'code' in error
          ? String(error.code)
          : null;

      if (code === 'ENOENT') {
        continue;
      }

      throw error;
    }
  }

  return ids;
}
