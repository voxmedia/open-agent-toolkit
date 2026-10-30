import { CliError } from '@errors/index';
import TOML from '@iarna/toml';

import {
  removeTomlTable,
  renderTomlString,
  setTomlValue,
} from './config-toml-edit';

export interface CodexManagedRoleConfig {
  roleName: string;
  description: string;
  configFile: string;
}

export interface CodexConfigMergeArgs {
  existingContent: string | null;
  desiredRoles: CodexManagedRoleConfig[];
  staleManagedRoles?: string[];
  inheritedMaxDepth?: number;
}

export interface CodexSingleRoleConfigMergeArgs {
  existingContent: string | null;
  role: CodexManagedRoleConfig;
  staleManagedRoles?: string[];
  inheritedMaxDepth?: number;
}

export interface CodexConfigMergeResult {
  mergedContent: string;
  changed: boolean;
  removedRoles: string[];
}

type TomlObject = Record<string, unknown>;

function parseConfig(content: string | null): TomlObject {
  if (!content || content.trim() === '') {
    return {};
  }

  try {
    const parsed = TOML.parse(content);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new CliError('Codex config TOML must parse to an object.');
    }
    return parsed as TomlObject;
  } catch (error) {
    if (error instanceof CliError) {
      throw error;
    }
    throw new CliError(
      `Failed to parse .codex/config.toml: ${error instanceof Error ? error.message : 'unknown parse error'}`,
    );
  }
}

function isTable(value: unknown): value is TomlObject {
  return (
    !!value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    !(value instanceof Date)
  );
}

function getObject(value: unknown): TomlObject {
  return isTable(value) ? { ...value } : {};
}

function requireTableOrAbsent(value: unknown, label: string): TomlObject {
  if (value === undefined) {
    return {};
  }
  if (!isTable(value)) {
    throw new CliError(
      `Refusing to rewrite .codex/config.toml: ${label} must be a table. Fix it by hand and rerun sync.`,
    );
  }
  return value;
}

function requireNotTable(value: unknown, label: string): void {
  if (isTable(value)) {
    throw new CliError(
      `Refusing to rewrite .codex/config.toml: ${label} must not be a table. Fix it by hand and rerun sync.`,
    );
  }
}

function getFiniteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function canonicalTomlValue(value: unknown): unknown {
  if (value instanceof Date) {
    return { $date: value.toISOString() };
  }
  if (Array.isArray(value)) {
    return value.map(canonicalTomlValue);
  }
  if (typeof value === 'bigint') {
    return { $bigint: value.toString() };
  }
  if (typeof value === 'number' && !Number.isFinite(value)) {
    return { $number: String(value) };
  }
  if (isTable(value)) {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonicalTomlValue(value[key])]),
    );
  }
  return value;
}

/** Reads a valid numeric agents.max_depth value from Codex TOML content. */
export function readCodexMaxDepth(content: string | null): number | null {
  const parsed = parseConfig(content);
  const agents = getObject(parsed.agents);
  return getFiniteNumber(agents.max_depth);
}

/**
 * Merges managed Codex roles and required shared agent configuration in place:
 * other tools keep ownership markers in this file's comments, so unmanaged
 * content must survive byte for byte.
 */
export function mergeCodexConfig({
  existingContent,
  desiredRoles,
  staleManagedRoles = [],
  inheritedMaxDepth,
}: CodexConfigMergeArgs): CodexConfigMergeResult {
  const parsed = parseConfig(existingContent);
  const features = requireTableOrAbsent(parsed.features, 'features');
  const agents = requireTableOrAbsent(parsed.agents, 'agents');
  const roles = new Map(desiredRoles.map((role) => [role.roleName, role]));
  const stale = new Set(staleManagedRoles);
  requireNotTable(features.multi_agent, 'features.multi_agent');
  if (!stale.has('max_depth')) {
    requireNotTable(agents.max_depth, 'agents.max_depth');
  }
  for (const roleName of roles.keys()) {
    if (stale.has(roleName)) {
      continue;
    }
    const role = requireTableOrAbsent(agents[roleName], `agents.${roleName}`);
    requireNotTable(role.description, `agents.${roleName}.description`);
    requireNotTable(role.config_file, `agents.${roleName}.config_file`);
  }

  const maxDepth = Math.max(
    2,
    getFiniteNumber(agents.max_depth) ?? 2,
    getFiniteNumber(inheritedMaxDepth) ?? 2,
  );

  const expectedAgents: TomlObject = { ...agents, max_depth: maxDepth };
  for (const role of roles.values()) {
    expectedAgents[role.roleName] = {
      ...getObject(agents[role.roleName]),
      description: role.description,
      config_file: role.configFile,
    };
  }
  const removedRoles: string[] = [];
  for (const staleRole of staleManagedRoles) {
    if (Object.hasOwn(expectedAgents, staleRole)) {
      delete expectedAgents[staleRole];
      removedRoles.push(staleRole);
    }
  }
  const removed = new Set(removedRoles);

  const original =
    existingContent !== null && existingContent.trim() !== ''
      ? existingContent
      : '';
  let mergedContent = original;

  if (features.multi_agent !== true) {
    mergedContent = setTomlValue(
      mergedContent,
      ['features', 'multi_agent'],
      'true',
    );
  }
  if (agents.max_depth !== maxDepth && !removed.has('max_depth')) {
    mergedContent = setTomlValue(
      mergedContent,
      ['agents', 'max_depth'],
      String(maxDepth),
    );
  }

  for (const staleRole of removedRoles) {
    mergedContent = removeTomlTable(mergedContent, ['agents', staleRole]);
  }

  for (const role of roles.values()) {
    if (removed.has(role.roleName)) {
      continue;
    }
    const current = getObject(agents[role.roleName]);
    if (current.description !== role.description) {
      mergedContent = setTomlValue(
        mergedContent,
        ['agents', role.roleName, 'description'],
        renderTomlString(role.description),
      );
    }
    if (current.config_file !== role.configFile) {
      mergedContent = setTomlValue(
        mergedContent,
        ['agents', role.roleName, 'config_file'],
        renderTomlString(role.configFile),
      );
    }
  }

  const expected: TomlObject = {
    ...parsed,
    features: { ...features, multi_agent: true },
    agents: expectedAgents,
  };
  let actual: TomlObject | null;
  try {
    actual = parseConfig(mergedContent);
  } catch {
    actual = null;
  }
  if (
    actual === null ||
    JSON.stringify(canonicalTomlValue(actual)) !==
      JSON.stringify(canonicalTomlValue(expected))
  ) {
    throw new CliError(
      'Refusing to write .codex/config.toml: the in-place edit did not produce the expected managed configuration. Edit the file by hand and rerun sync.',
    );
  }

  return {
    mergedContent,
    changed: mergedContent !== (existingContent ?? ''),
    removedRoles,
  };
}

/** Merges one managed Codex role using the shared configuration contract. */
export function mergeCodexConfigForRole({
  existingContent,
  role,
  staleManagedRoles = [],
  inheritedMaxDepth,
}: CodexSingleRoleConfigMergeArgs): CodexConfigMergeResult {
  return mergeCodexConfig({
    existingContent,
    desiredRoles: [role],
    staleManagedRoles,
    inheritedMaxDepth,
  });
}
