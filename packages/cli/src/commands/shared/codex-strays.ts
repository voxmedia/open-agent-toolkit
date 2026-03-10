import { readdir, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';

import type { CanonicalEntry } from '@engine/index';
import TOML from '@iarna/toml';
import type { CodexExtensionPlan } from '@providers/codex/codec/sync-extension';

export interface CodexRoleStray {
  roleName: string;
  providerPath: string;
  description?: string;
}

export interface CodexRegenerationDependencies {
  scopeRoot: string;
  scanCanonical: () => Promise<CanonicalEntry[]>;
  computeExtensionPlan: (
    scopeRoot: string,
    canonicalEntries: CanonicalEntry[],
  ) => Promise<CodexExtensionPlan>;
  applyExtensionPlan: (
    scopeRoot: string,
    plan: CodexExtensionPlan,
  ) => Promise<unknown>;
}

function canonicalRoleNames(canonicalEntries: CanonicalEntry[]): Set<string> {
  return new Set(
    canonicalEntries
      .filter((entry) => entry.type === 'agent' && entry.isFile)
      .map((entry) => entry.name.replace(/\.md$/i, '')),
  );
}

function toRoleNameFromTomlPath(path: string): string | null {
  if (!path.startsWith('agents/') || !path.endsWith('.toml')) {
    return null;
  }

  return path.replace(/^agents\//, '').replace(/\.toml$/i, '');
}

async function fileExists(path: string): Promise<boolean> {
  try {
    const s = await stat(path);
    return s.isFile();
  } catch {
    return false;
  }
}

async function detectFromConfig(
  scopeRoot: string,
  existingCanonicalRoles: Set<string>,
): Promise<CodexRoleStray[]> {
  const configPath = join(scopeRoot, '.codex', 'config.toml');
  if (!(await fileExists(configPath))) {
    return [];
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = TOML.parse(await readFile(configPath, 'utf8')) as Record<
      string,
      unknown
    >;
  } catch {
    return [];
  }

  const agents = parsed.agents;
  if (!agents || typeof agents !== 'object' || Array.isArray(agents)) {
    return [];
  }

  const strays: CodexRoleStray[] = [];
  for (const [roleName, value] of Object.entries(agents)) {
    if (existingCanonicalRoles.has(roleName)) {
      continue;
    }

    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      continue;
    }

    const roleConfig = value as Record<string, unknown>;
    const configFile = roleConfig.config_file;
    if (typeof configFile !== 'string') {
      continue;
    }

    const roleFromFile = toRoleNameFromTomlPath(configFile);
    if (!roleFromFile) {
      continue;
    }

    const providerPath = `.codex/${configFile}`;
    const absoluteRolePath = join(scopeRoot, providerPath);
    if (!(await fileExists(absoluteRolePath))) {
      continue;
    }

    strays.push({
      roleName,
      providerPath,
      description:
        typeof roleConfig.description === 'string'
          ? roleConfig.description
          : undefined,
    });
  }

  return strays;
}

async function detectFromAgentsDirectory(
  scopeRoot: string,
  existingCanonicalRoles: Set<string>,
): Promise<CodexRoleStray[]> {
  const agentsDir = join(scopeRoot, '.codex', 'agents');

  let entries: Array<{ name: string; isFile: () => boolean }>;
  try {
    entries = await readdir(agentsDir, {
      withFileTypes: true,
      encoding: 'utf8',
    });
  } catch {
    return [];
  }

  const strays: CodexRoleStray[] = [];
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.toml')) {
      continue;
    }

    const roleName = entry.name.replace(/\.toml$/i, '');
    if (existingCanonicalRoles.has(roleName)) {
      continue;
    }

    strays.push({
      roleName,
      providerPath: `.codex/agents/${entry.name}`,
    });
  }

  return strays;
}

export async function detectCodexRoleStrays(
  scopeRoot: string,
  canonicalEntries: CanonicalEntry[],
): Promise<CodexRoleStray[]> {
  const roleNames = canonicalRoleNames(canonicalEntries);
  const configStrays = await detectFromConfig(scopeRoot, roleNames);
  const dirStrays = await detectFromAgentsDirectory(scopeRoot, roleNames);

  const merged = new Map<string, CodexRoleStray>();
  for (const stray of [...configStrays, ...dirStrays]) {
    if (!merged.has(stray.providerPath)) {
      merged.set(stray.providerPath, stray);
    }
  }

  return Array.from(merged.values()).sort((left, right) =>
    left.providerPath.localeCompare(right.providerPath),
  );
}

export async function regenerateCodexAfterAdoption({
  scopeRoot,
  scanCanonical,
  computeExtensionPlan,
  applyExtensionPlan,
}: CodexRegenerationDependencies): Promise<void> {
  const canonicalEntries = await scanCanonical();
  const extensionPlan = await computeExtensionPlan(scopeRoot, canonicalEntries);
  await applyExtensionPlan(scopeRoot, extensionPlan);
}
