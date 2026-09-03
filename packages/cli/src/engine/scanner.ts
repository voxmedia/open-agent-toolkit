import { readdir } from 'node:fs/promises';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';

import { CliError } from '@errors/index';
import { resolveAssetsRoot } from '@fs/assets';
import {
  SCOPE_CONTENT_TYPES,
  USER_SCOPE_MANAGED_AGENT_FILES,
  type CanonicalScanTarget,
  type Scope,
} from '@shared/types';

type ConcreteScope = Exclude<Scope, 'all'>;

export interface CanonicalEntry {
  name: string;
  type: 'skill' | 'agent' | 'rule';
  canonicalPath: string;
  isFile: boolean;
}

function canonicalDirectoryName(
  contentType: CanonicalEntry['type'],
): 'skills' | 'agents' | 'rules' {
  if (contentType === 'skill') {
    return 'skills';
  }
  if (contentType === 'agent') {
    return 'agents';
  }
  return 'rules';
}

interface ScannedEntry {
  name: string;
  isFile: boolean;
}

async function readEntries(dirPath: string): Promise<ScannedEntry[]> {
  try {
    const entries = await readdir(dirPath, { withFileTypes: true });
    const results: ScannedEntry[] = [];

    for (const entry of entries) {
      if (entry.isDirectory()) {
        results.push({ name: entry.name, isFile: false });
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        results.push({ name: entry.name, isFile: true });
      }
    }

    results.sort((left, right) => left.name.localeCompare(right.name));
    return results;
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'ENOENT'
    ) {
      return [];
    }

    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error.code === 'EACCES' || error.code === 'EPERM')
    ) {
      throw new CliError(
        `Permission denied reading canonical directory ${dirPath}. Adjust permissions and retry.`,
      );
    }
    throw error;
  }
}

export async function scanBundledManagedAgents(): Promise<CanonicalEntry[]> {
  const agentsDir = join(await resolveAssetsRoot(), 'agents');
  const entries = await readEntries(agentsDir);
  const available = new Set(
    entries.filter((entry) => entry.isFile).map((entry) => entry.name),
  );
  const missing = USER_SCOPE_MANAGED_AGENT_FILES.filter(
    (name) => !available.has(name),
  );

  if (missing.length > 0) {
    throw new CliError(
      `Bundled managed role definitions are unavailable: ${missing.join(', ')}. Reinstall or rebuild OAT before running user sync.`,
    );
  }

  return USER_SCOPE_MANAGED_AGENT_FILES.map((name) => ({
    name,
    type: 'agent',
    canonicalPath: join(agentsDir, name),
    isFile: true,
  }));
}

/**
 * User-scope Codex/Cursor materialization reads the bundled managed role files,
 * not the installed copies under `~/.agents/agents/`. Concatenating both lists
 * produces the same Cursor/Codex role name twice and aborts the whole sync.
 */
export function mergeUserScopeMaterializationEntries(
  canonicalEntries: CanonicalEntry[],
  bundledManagedAgents: CanonicalEntry[],
): CanonicalEntry[] {
  const bundledNames = new Set(bundledManagedAgents.map((entry) => entry.name));
  const merged: CanonicalEntry[] = [];
  const seenBundledNames = new Set<string>();

  for (const entry of bundledManagedAgents) {
    if (seenBundledNames.has(entry.name)) {
      continue;
    }
    seenBundledNames.add(entry.name);
    merged.push(entry);
  }

  for (const entry of canonicalEntries) {
    if (entry.type === 'agent' && bundledNames.has(entry.name)) {
      continue;
    }
    merged.push(entry);
  }

  return merged;
}

export function materializationCanonicalPathAllowed(
  scopeRoot: string,
  canonicalEntry: CanonicalEntry,
  allowedCanonicalPaths?: string[],
): boolean {
  if (!allowedCanonicalPaths?.length) {
    return true;
  }

  const allowed = new Set(allowedCanonicalPaths);
  const relativePath = relative(
    scopeRoot,
    canonicalEntry.canonicalPath,
  ).replaceAll('\\', '/');
  if (allowed.has(relativePath)) {
    return true;
  }

  return (
    canonicalEntry.type === 'agent' &&
    canonicalEntry.isFile &&
    allowed.has(
      join('.agents', 'agents', canonicalEntry.name).replaceAll('\\', '/'),
    )
  );
}

/** @deprecated Use scanBundledManagedAgents for provider-neutral materialization. */
export const scanBundledManagedCodexAgents = scanBundledManagedAgents;

export async function scanCanonical(
  basePath: string,
  scope: ConcreteScope,
  targets?: readonly CanonicalScanTarget[],
): Promise<CanonicalEntry[]> {
  const scopeRoot = resolve(basePath);
  const entries: CanonicalEntry[] = [];
  const scanTargets =
    targets ??
    SCOPE_CONTENT_TYPES[scope].map((contentType) => ({
      contentType,
      canonicalDir: join('.agents', canonicalDirectoryName(contentType)),
    }));
  const seenTargets = new Set<string>();

  for (const { contentType, canonicalDir } of scanTargets) {
    const contentDir = resolve(scopeRoot, canonicalDir);
    const relativeContentDir = relative(scopeRoot, contentDir);
    if (
      isAbsolute(canonicalDir) ||
      relativeContentDir === '..' ||
      relativeContentDir.startsWith(`..${sep}`)
    ) {
      throw new CliError(
        `Canonical scan target must stay within the scope root: ${canonicalDir}`,
      );
    }
    const targetKey = `${contentType}::${contentDir}`;
    if (seenTargets.has(targetKey)) {
      continue;
    }
    seenTargets.add(targetKey);
    const includeFiles = contentType === 'agent' || contentType === 'rule';
    const scanned = await readEntries(contentDir);

    for (const scannedEntry of scanned) {
      if (scannedEntry.isFile && !includeFiles) {
        continue;
      }
      entries.push({
        name: scannedEntry.name,
        type: contentType,
        canonicalPath: join(contentDir, scannedEntry.name),
        isFile: scannedEntry.isFile,
      });
    }
  }

  return entries;
}
