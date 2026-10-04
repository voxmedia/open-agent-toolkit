#!/usr/bin/env node
import {
  lstat,
  mkdir,
  readdir,
  readFile,
  realpath,
  unlink,
} from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const GENERATED_OUTPUTS = Object.freeze([
  'project-index.md',
  'stack.md',
  'architecture.md',
  'structure.md',
  'integrations.md',
  'testing.md',
  'conventions.md',
  'concerns.md',
]);

function generated(content) {
  const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/u.exec(content);
  const markers = frontmatter?.[1].match(/^oat_generated:.*$/gmu) ?? [];
  return (
    markers.length === 1 &&
    /^oat_generated:[ \t]*true[ \t]*(?:#[^\r\n]*)?\r?$/u.test(markers[0])
  );
}

async function knowledgeDirectory(repoRoot, create) {
  const root = await realpath(repoRoot);
  let path = root;
  // Only this repo's known knowledge directory is owned. Never follow a
  // symlink in the .oat/repo/knowledge directory chain.
  for (const component of ['.oat', 'repo', 'knowledge']) {
    path = join(path, component);
    if (create) {
      await mkdir(path).catch((error) => {
        if (error.code !== 'EEXIST') throw error;
      });
    }
    const identity = await lstat(path);
    if (!identity.isDirectory() || identity.isSymbolicLink()) {
      throw new Error(`Knowledge path is not an owned directory: ${path}`);
    }
  }
  return path;
}

/** Validate every collision before deleting only explicitly generated files. */
export async function prepareOwnedRefresh(repoRoot) {
  const directory = await knowledgeDirectory(repoRoot, true);
  const entries = await readdir(directory, { withFileTypes: true });
  const owned = [];
  for (const entry of entries) {
    const expected = GENERATED_OUTPUTS.includes(entry.name);
    if (!expected && (!entry.isFile() || !entry.name.endsWith('.md'))) continue;
    const path = join(directory, entry.name);
    const marked = entry.isFile() && generated(await readFile(path, 'utf8'));
    if (expected && !marked) {
      throw new Error(
        `Unmarked knowledge output collision: ${path}; preserve or relocate the authored file before refreshing.`,
      );
    }
    if (marked) owned.push(path);
  }
  // Preflight above is all-or-nothing: collisions leave every old file intact.
  for (const path of owned.sort()) await unlink(path);
  const outputPaths = GENERATED_OUTPUTS.map((name) => join(directory, name));
  return {
    removedPaths: owned,
    outputPaths,
    affectedPaths: [...new Set([...owned, ...outputPaths])].sort(),
  };
}

/** Run after generation and before formatting/committing the retained list. */
export async function verifyOwnedOutputs(repoRoot) {
  const directory = await knowledgeDirectory(repoRoot, false);
  const outputPaths = GENERATED_OUTPUTS.map((name) => join(directory, name));
  for (const path of outputPaths) {
    const identity = await lstat(path);
    if (
      !identity.isFile() ||
      identity.isSymbolicLink() ||
      !generated(await readFile(path, 'utf8'))
    ) {
      throw new Error(`Expected marked generated knowledge output: ${path}`);
    }
  }
  return { outputPaths };
}

if (
  process.argv[1] &&
  (await realpath(process.argv[1]).catch(() => resolve(process.argv[1]))) ===
    fileURLToPath(import.meta.url)
) {
  try {
    const [mode, root, ...extra] = process.argv.slice(2);
    if (!root || extra.length || !['--prepare', '--verify'].includes(mode)) {
      throw new Error(
        'Usage: refresh-owned.mjs <--prepare|--verify> <repo-root>',
      );
    }
    const result =
      mode === '--prepare'
        ? await prepareOwnedRefresh(root)
        : await verifyOwnedOutputs(root);
    process.stdout.write(`${JSON.stringify(result)}\n`);
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}
