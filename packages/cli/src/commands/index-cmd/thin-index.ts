import { execSync } from 'node:child_process';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';

import { fileExists } from '@fs/io';

export interface GitOperations {
  resolveHead(root: string): string;
  resolveMergeBase(root: string): string;
}

export interface GenerateThinIndexOptions {
  repoRoot: string;
  headSha?: string;
  mergeBaseSha?: string;
  today?: string;
  git?: GitOperations;
}

export interface GenerateThinIndexResult {
  outputPath: string;
  repoName: string;
  packageManager: string;
  entryPointCount: number;
}

const TREE_EXCLUDE = new Set([
  '.git',
  'node_modules',
  'dist',
  'build',
  '.next',
  '.turbo',
  'coverage',
]);

const TREE_MAX = 200;

const ENTRY_POINT_NAMES = new Set(['index', 'main', 'app', 'server', 'cli']);

const ENTRY_MAX = 50;

const CONFIG_FILES = [
  'package.json',
  'pnpm-lock.yaml',
  'yarn.lock',
  'package-lock.json',
  'tsconfig.json',
  '.oxlintrc.json',
  '.oxfmtrc.jsonc',
  'eslint.config.js',
  'eslint.config.mjs',
  '.eslintrc.js',
  '.eslintrc.json',
  'vitest.config.ts',
  'vitest.config.js',
  'jest.config.ts',
  'jest.config.js',
  'pytest.ini',
  'pyproject.toml',
  'go.mod',
  'Cargo.toml',
  'Makefile',
];

const LOCKFILE_MAP: [string, string][] = [
  ['pnpm-lock.yaml', 'pnpm'],
  ['yarn.lock', 'yarn'],
  ['package-lock.json', 'npm'],
  ['Pipfile.lock', 'pipenv'],
  ['poetry.lock', 'poetry'],
  ['Cargo.lock', 'cargo'],
  ['go.mod', 'go'],
];

function defaultGitOps(): GitOperations {
  return {
    resolveHead(root: string): string {
      try {
        return execSync('git rev-parse HEAD', {
          cwd: root,
          encoding: 'utf8',
          stdio: ['pipe', 'pipe', 'pipe'],
        }).trim();
      } catch {
        return 'unknown';
      }
    },
    resolveMergeBase(root: string): string {
      try {
        return execSync('git merge-base HEAD origin/main', {
          cwd: root,
          encoding: 'utf8',
          stdio: ['pipe', 'pipe', 'pipe'],
        }).trim();
      } catch {
        try {
          return execSync('git rev-parse HEAD', {
            cwd: root,
            encoding: 'utf8',
            stdio: ['pipe', 'pipe', 'pipe'],
          }).trim();
        } catch {
          return 'unknown';
        }
      }
    },
  };
}

async function readRepoName(repoRoot: string): Promise<string> {
  try {
    const pkg = JSON.parse(
      await readFile(join(repoRoot, 'package.json'), 'utf8'),
    ) as { name?: string };
    if (pkg.name) return pkg.name;
  } catch {
    // fall through
  }
  return basename(repoRoot);
}

async function getDirectoryTree(repoRoot: string): Promise<string[]> {
  const results: string[] = [];

  async function walk(dir: string, depth: number): Promise<void> {
    if (depth > 2 || results.length >= TREE_MAX) return;
    let entries: import('node:fs').Dirent[];
    try {
      entries = await readdir(dir, { withFileTypes: true, encoding: 'utf8' });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (results.length >= TREE_MAX) break;
      if (TREE_EXCLUDE.has(entry.name)) continue;
      const rel = join(dir, entry.name).slice(repoRoot.length + 1);
      results.push(rel);
      if (entry.isDirectory()) {
        await walk(join(dir, entry.name), depth + 1);
      }
    }
  }

  await walk(repoRoot, 0);
  return results.sort();
}

async function detectPackageManager(repoRoot: string): Promise<string> {
  for (const [lockfile, manager] of LOCKFILE_MAP) {
    if (await fileExists(join(repoRoot, lockfile))) {
      return manager;
    }
  }
  return 'unknown';
}

async function extractScripts(repoRoot: string): Promise<string> {
  try {
    const pkg = JSON.parse(
      await readFile(join(repoRoot, 'package.json'), 'utf8'),
    ) as { scripts?: Record<string, string> };
    if (pkg.scripts) {
      return Object.keys(pkg.scripts).join(', ');
    }
  } catch {
    // fall through
  }
  return '';
}

async function findEntryPoints(repoRoot: string): Promise<string[]> {
  const results: string[] = [];

  async function walk(dir: string, depth: number): Promise<void> {
    if (depth > 4 || results.length >= ENTRY_MAX) return;
    let entries: import('node:fs').Dirent[];
    try {
      entries = await readdir(dir, { withFileTypes: true, encoding: 'utf8' });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (results.length >= ENTRY_MAX) break;
      const name = entry.name;
      if (
        name === 'node_modules' ||
        name === '.git' ||
        name === 'dist' ||
        name === 'build'
      ) {
        continue;
      }
      if (entry.isDirectory()) {
        await walk(join(dir, entry.name), depth + 1);
      } else if (entry.isFile()) {
        const stem = name.split('.')[0]!;
        if (ENTRY_POINT_NAMES.has(stem)) {
          results.push(join(dir, name).slice(repoRoot.length + 1));
        }
      }
    }
  }

  await walk(repoRoot, 0);
  return results.sort();
}

async function detectConfigFiles(repoRoot: string): Promise<string[]> {
  const found: string[] = [];
  for (const cfg of CONFIG_FILES) {
    if (await fileExists(join(repoRoot, cfg))) {
      found.push(cfg);
    }
  }
  return found;
}

async function extractTestCommand(repoRoot: string): Promise<string> {
  try {
    const pkg = JSON.parse(
      await readFile(join(repoRoot, 'package.json'), 'utf8'),
    ) as { scripts?: Record<string, string> };
    if (pkg.scripts?.test) {
      return pkg.scripts.test;
    }
  } catch {
    // fall through
  }
  try {
    const makefile = await readFile(join(repoRoot, 'Makefile'), 'utf8');
    if (/^test:/m.test(makefile)) {
      return 'make test';
    }
  } catch {
    // fall through
  }
  return '';
}

function buildThinIndexMarkdown(data: {
  repoName: string;
  date: string;
  headSha: string;
  mergeBaseSha: string;
  packageManager: string;
  scripts: string;
  entryPoints: string[];
  tree: string[];
  configs: string[];
  testCmd: string;
}): string {
  const entryList =
    data.entryPoints.length > 0
      ? data.entryPoints.map((ep) => `- \`${ep}\``).join('\n')
      : '- None detected';

  const treeFormatted = data.tree.map((t) => `  ${t}`).join('\n');

  const configsList =
    data.configs.length > 0
      ? data.configs.map((c) => `- \`${c}\``).join('\n')
      : '- None detected';

  const testingSection = data.testCmd
    ? `**Test Command:** \`${data.testCmd}\``
    : '*Test command will be documented after analysis.*';

  return `---
oat_generated: true
oat_generated_at: ${data.date}
oat_source_head_sha: ${data.headSha}
oat_source_main_merge_base_sha: ${data.mergeBaseSha}
oat_index_type: thin
oat_warning: "GENERATED FILE - Thin index, will be enriched after mapper completion"
---

# ${data.repoName}

## Overview

*Overview will be enriched after codebase analysis completes.*

## Quick Orientation

**Package Manager:** ${data.packageManager}

**Key Scripts:** ${data.scripts || 'None detected'}

**Entry Points:**
${entryList}

## Project Structure (Top-Level)

\`\`\`
${treeFormatted}
\`\`\`

## Configuration Files

${configsList}

## Testing

${testingSection}

## Next Steps

This is a thin index generated for quick orientation. Full details will be available after codebase analysis completes in:

- [stack.md](stack.md) - Technologies and dependencies (pending)
- [architecture.md](architecture.md) - System design and patterns (pending)
- [structure.md](structure.md) - Directory layout (pending)
- [integrations.md](integrations.md) - External services (pending)
- [testing.md](testing.md) - Test structure and practices (pending)
- [conventions.md](conventions.md) - Code style and patterns (pending)
- [concerns.md](concerns.md) - Technical debt and issues (pending)
`;
}

export async function generateThinIndex(
  options: GenerateThinIndexOptions,
): Promise<GenerateThinIndexResult> {
  const { repoRoot } = options;
  const git = options.git ?? defaultGitOps();
  const today = options.today ?? new Date().toISOString().slice(0, 10);

  let headSha: string;
  if (options.headSha) {
    headSha = options.headSha;
  } else {
    try {
      headSha = git.resolveHead(repoRoot);
    } catch {
      headSha = 'unknown';
    }
  }

  let mergeBaseSha: string;
  if (options.mergeBaseSha) {
    mergeBaseSha = options.mergeBaseSha;
  } else {
    try {
      mergeBaseSha = git.resolveMergeBase(repoRoot);
    } catch {
      mergeBaseSha = 'unknown';
    }
  }

  const [
    repoName,
    tree,
    packageManager,
    scripts,
    entryPoints,
    configs,
    testCmd,
  ] = await Promise.all([
    readRepoName(repoRoot),
    getDirectoryTree(repoRoot),
    detectPackageManager(repoRoot),
    extractScripts(repoRoot),
    findEntryPoints(repoRoot),
    detectConfigFiles(repoRoot),
    extractTestCommand(repoRoot),
  ]);

  const markdown = buildThinIndexMarkdown({
    repoName,
    date: today,
    headSha,
    mergeBaseSha,
    packageManager,
    scripts,
    entryPoints,
    tree,
    configs,
    testCmd,
  });

  const outputDir = join(repoRoot, '.oat', 'repo', 'knowledge');
  await mkdir(outputDir, { recursive: true });
  const outputPath = join(outputDir, 'project-index.md');
  await writeFile(outputPath, markdown, 'utf8');

  return {
    outputPath,
    repoName,
    packageManager,
    entryPointCount: entryPoints.length,
  };
}
