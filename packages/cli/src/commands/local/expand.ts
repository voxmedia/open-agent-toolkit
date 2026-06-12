import { readdir } from 'node:fs/promises';
import { join } from 'node:path';

const GLOB_CHARS = /[*?[]/;
const PRUNED_CANDIDATE_DIRECTORIES = new Set([
  '.cache',
  '.git',
  '.gradle',
  '.next',
  '.nuxt',
  '.output',
  '.parcel-cache',
  '.pnpm-store',
  '.pytest_cache',
  '.ruff_cache',
  '.turbo',
  '.venv',
  '.vite',
  '.worktrees',
  '.yarn',
  '__pycache__',
  'build',
  'coverage',
  'dist',
  'node_modules',
  'out',
  'target',
  'tmp',
]);

function normalizePattern(path: string): string {
  return path.replaceAll('\\', '/').replace(/^\.\//, '').replace(/\/+$/, '');
}

function globToRegExp(pattern: string): RegExp {
  let regex = '^';

  for (let i = 0; i < pattern.length; i += 1) {
    const char = pattern[i]!;

    if (char === '*') {
      if (pattern[i + 1] === '*') {
        regex += '.*';
        i += 1;
      } else {
        regex += '[^/]*';
      }
      continue;
    }

    if (char === '?') {
      regex += '[^/]';
      continue;
    }

    if (char === '[') {
      const end = pattern.indexOf(']', i + 1);
      if (end !== -1) {
        regex += pattern.slice(i, end + 1);
        i = end;
        continue;
      }
    }

    if (/[$()*+./?[\\\]^{|}]/.test(char)) {
      regex += `\\${char}`;
    } else {
      regex += char;
    }
  }

  regex += '$';
  return new RegExp(regex);
}

function isOatStatePath(path: string): boolean {
  return path === '.oat' || path.startsWith('.oat/');
}

function shouldPruneCandidateDirectory(path: string, name: string): boolean {
  return !isOatStatePath(path) && PRUNED_CANDIDATE_DIRECTORIES.has(name);
}

async function collectRelativePaths(
  root: string,
  current = '',
): Promise<string[]> {
  const paths: string[] = [];
  const pendingDirectories = [current];

  while (pendingDirectories.length > 0) {
    const directory = pendingDirectories.pop()!;
    const dirPath = directory === '' ? root : join(root, directory);
    const entries = await readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const relativePath =
        directory === '' ? entry.name : `${directory}/${entry.name}`;
      const shouldPrune =
        entry.isDirectory() &&
        shouldPruneCandidateDirectory(relativePath, entry.name);

      if (shouldPrune) {
        continue;
      }

      paths.push(relativePath);

      if (entry.isDirectory()) {
        pendingDirectories.push(relativePath);
      }
    }
  }

  return paths;
}

export function isGlobPattern(path: string): boolean {
  return GLOB_CHARS.test(path);
}

export function matchesPathPattern(path: string, pattern: string): boolean {
  return globToRegExp(normalizePattern(pattern)).test(normalizePattern(path));
}

export interface ExpandResult {
  resolved: string[];
  missingGlobs: string[];
}

export async function expandLocalPaths(
  root: string,
  localPaths: string[],
): Promise<ExpandResult> {
  const resolved: string[] = [];
  const missingGlobs: string[] = [];
  let candidatePaths: string[] | null = null;

  for (const localPath of localPaths) {
    if (!isGlobPattern(localPath)) {
      resolved.push(localPath);
      continue;
    }

    // `fs/promises.glob` is Node 22+. Keep local path expansion working on
    // Node 20.19+ with a tiny in-repo matcher instead of pulling in a package.
    candidatePaths ??= await collectRelativePaths(root);
    const matches = candidatePaths.filter((path) =>
      matchesPathPattern(path, localPath),
    );

    if (matches.length === 0) {
      missingGlobs.push(localPath);
    } else {
      for (const match of matches.sort()) {
        resolved.push(match);
      }
    }
  }

  return { resolved, missingGlobs };
}
