import { readdir, readFile, stat } from 'node:fs/promises';
import { extname, join } from 'node:path';

import type { DoctorCheck } from '@ui/output';

interface KnownStaleInvocation {
  id: string;
  pattern: RegExp;
  replacement: string;
}

interface StaleInvocationMatch {
  relativePath: string;
  line: number;
  invocation: string;
  replacement: string;
}

const KNOWN_STALE_INVOCATIONS: readonly KnownStaleInvocation[] = [
  {
    id: 'global-scope-sync',
    pattern: /\boat\s+--scope(?:\s+|=)all\s+sync\b/g,
    replacement: 'oat sync --scope all',
  },
];

const SCANNED_EXTENSIONS = new Set([
  '.bash',
  '.cjs',
  '.fish',
  '.js',
  '.json',
  '.jsonc',
  '.md',
  '.mdc',
  '.mdx',
  '.mjs',
  '.mts',
  '.sh',
  '.toml',
  '.ts',
  '.yaml',
  '.yml',
  '.zsh',
]);
const EXCLUDED_DIRECTORY_NAMES = new Set([
  '.git',
  '.next',
  '.turbo',
  'archived',
  'build',
  'coverage',
  'dist',
  'node_modules',
  'out',
]);
const GENERATED_PROVIDER_ROOTS = new Set([
  '.claude',
  '.codex',
  '.cursor',
  '.gemini',
]);
const GENERATED_GITHUB_DIRECTORIES = new Set([
  'agents',
  'instructions',
  'prompts',
  'skills',
]);
const ALLOW_MARKER = 'oat-doctor: allow-stale-invocation';
const MAX_FILE_BYTES = 1024 * 1024;
const MAX_SCANNED_FILES = 10_000;
const MAX_REPORTED_MATCHES = 50;

function isExcludedDirectory(parts: readonly string[]): boolean {
  const name = parts.at(-1);
  if (!name || EXCLUDED_DIRECTORY_NAMES.has(name)) {
    return true;
  }
  if (parts.length === 1 && name === '.worktrees') {
    return true;
  }
  if (GENERATED_PROVIDER_ROOTS.has(name)) {
    return true;
  }
  const parent = parts.at(-2);
  if (parent === '.oat' && (name === 'projects' || name === 'sync')) {
    return true;
  }
  return parent === '.github' && GENERATED_GITHUB_DIRECTORIES.has(name);
}

function isScannableFile(relativePath: string): boolean {
  const parts = relativePath.split('/');
  const fileName = parts.at(-1) ?? '';
  if (/\.(?:test|spec)\.[^.]+$/.test(fileName)) {
    return false;
  }
  if (fileName === 'copilot-instructions.md' && parts.at(-2) === '.github') {
    return false;
  }
  return SCANNED_EXTENSIONS.has(extname(fileName).toLowerCase());
}

async function listScannableFiles(repoRoot: string): Promise<string[]> {
  const files: string[] = [];

  async function walk(parts: string[]): Promise<void> {
    if (files.length >= MAX_SCANNED_FILES) {
      return;
    }
    const entries = await readdir(join(repoRoot, ...parts), {
      withFileTypes: true,
    });
    entries.sort((left, right) => left.name.localeCompare(right.name));

    for (const entry of entries) {
      if (files.length >= MAX_SCANNED_FILES) {
        break;
      }
      if (entry.isSymbolicLink()) {
        continue;
      }
      const childParts = [...parts, entry.name];
      if (entry.isDirectory()) {
        if (!isExcludedDirectory(childParts)) {
          await walk(childParts);
        }
        continue;
      }
      const relativePath = childParts.join('/');
      if (entry.isFile() && isScannableFile(relativePath)) {
        files.push(relativePath);
      }
    }
  }

  await walk([]);
  return files;
}

function findMatches(
  relativePath: string,
  content: string,
): StaleInvocationMatch[] {
  const matches: StaleInvocationMatch[] = [];
  const lines = content.split(/\r?\n/);

  for (const [lineIndex, line] of lines.entries()) {
    if (line.includes(ALLOW_MARKER)) {
      continue;
    }
    for (const stale of KNOWN_STALE_INVOCATIONS) {
      stale.pattern.lastIndex = 0;
      for (const match of line.matchAll(stale.pattern)) {
        matches.push({
          relativePath,
          line: lineIndex + 1,
          invocation: match[0],
          replacement: stale.replacement,
        });
      }
    }
  }

  return matches;
}

export async function checkStaleInvocations(
  repoRoot: string,
): Promise<DoctorCheck> {
  const matches: StaleInvocationMatch[] = [];

  for (const relativePath of await listScannableFiles(repoRoot)) {
    const absolutePath = join(repoRoot, relativePath);
    const metadata = await stat(absolutePath);
    if (metadata.size > MAX_FILE_BYTES) {
      continue;
    }
    matches.push(
      ...findMatches(relativePath, await readFile(absolutePath, 'utf8')),
    );
    if (matches.length >= MAX_REPORTED_MATCHES) {
      break;
    }
  }

  if (matches.length === 0) {
    return {
      name: 'project:stale_invocations',
      description: 'Known-stale CLI invocation grammar',
      status: 'pass',
      message:
        'No known-stale CLI invocations found in repository scripts or documentation.',
    };
  }

  const evidence = matches
    .slice(0, MAX_REPORTED_MATCHES)
    .map(
      (match) =>
        `${match.relativePath}:${match.line} (\`${match.invocation}\` → \`${match.replacement}\`)`,
    )
    .join(', ');
  const replacements = [...new Set(matches.map((match) => match.replacement))];

  return {
    name: 'project:stale_invocations',
    description: 'Known-stale CLI invocation grammar',
    status: 'warn',
    message: `Known-stale CLI invocations found: ${evidence}.`,
    fix: `Update each invocation to the current command grammar: ${replacements
      .map((replacement) => `\`${replacement}\``)
      .join(', ')}.`,
  };
}
