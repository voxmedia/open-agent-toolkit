import {
  readOatConfig,
  resolveLocalPaths,
  writeOatConfig,
} from '@config/oat-config';

export interface RejectedPath {
  path: string;
  reason: string;
}

export interface AddResult {
  added: string[];
  alreadyPresent: string[];
  rejected: RejectedPath[];
  all: string[];
}

export interface RemoveResult {
  removed: string[];
  notFound: string[];
  all: string[];
}

function validatePath(p: string): RejectedPath | null {
  const trimmed = p.trim();
  if (trimmed === '') {
    return { path: p, reason: 'empty path' };
  }
  if (trimmed.startsWith('/')) {
    return { path: p, reason: 'absolute path' };
  }
  // Check for parent-relative segments (../ at start, /../ in middle, /.. at end)
  const segments = trimmed.split('/');
  if (segments.some((s) => s === '..')) {
    return { path: p, reason: 'parent-relative path' };
  }
  return null;
}

export async function addLocalPaths(
  repoRoot: string,
  paths: string[],
): Promise<AddResult> {
  const config = await readOatConfig(repoRoot);
  const existing = new Set(resolveLocalPaths(config));

  const added: string[] = [];
  const alreadyPresent: string[] = [];
  const rejected: RejectedPath[] = [];

  for (const p of paths) {
    const rejection = validatePath(p);
    if (rejection) {
      rejected.push(rejection);
      continue;
    }

    const normalized = p.trim().replace(/\/+$/, '');
    if (existing.has(normalized)) {
      alreadyPresent.push(normalized);
    } else {
      existing.add(normalized);
      added.push(normalized);
    }
  }

  const sorted = [...existing].sort();
  await writeOatConfig(repoRoot, { ...config, localPaths: sorted });

  return { added, alreadyPresent, rejected, all: sorted };
}

export async function removeLocalPaths(
  repoRoot: string,
  paths: string[],
): Promise<RemoveResult> {
  const config = await readOatConfig(repoRoot);
  const existing = resolveLocalPaths(config);
  const toRemove = new Set(paths.map((p) => p.replace(/\/+$/, '')));

  const removed: string[] = [];
  const notFound: string[] = [];

  for (const p of toRemove) {
    if (existing.includes(p)) {
      removed.push(p);
    } else {
      notFound.push(p);
    }
  }

  const remaining = existing.filter((p) => !toRemove.has(p));
  const updated = { ...config };

  if (remaining.length > 0) {
    updated.localPaths = remaining;
  } else {
    delete updated.localPaths;
  }

  await writeOatConfig(repoRoot, updated);

  return { removed, notFound, all: remaining };
}
