import { CliError } from '@errors/index';
import TOML from '@iarna/toml';

import { stringifyToml } from './shared';

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
type MultilineStringDelimiter = '"""' | "'''";

function isEscapedBasicStringDelimiter(line: string, index: number): boolean {
  let backslashCount = 0;
  for (let cursor = index - 1; cursor >= 0 && line[cursor] === '\\'; cursor--) {
    backslashCount += 1;
  }
  return backslashCount % 2 === 1;
}

function scanMultilineStringDelimiter(
  line: string,
  initialDelimiter: MultilineStringDelimiter | null,
): MultilineStringDelimiter | null {
  let delimiter = initialDelimiter;

  for (let index = 0; index < line.length - 2; index++) {
    if (delimiter === null) {
      const candidate = line.slice(index, index + 3);
      if (
        (candidate === '"""' && !isEscapedBasicStringDelimiter(line, index)) ||
        candidate === "'''"
      ) {
        delimiter = candidate;
        index += 2;
      }
      continue;
    }

    if (
      line.startsWith(delimiter, index) &&
      (delimiter === "'''" || !isEscapedBasicStringDelimiter(line, index))
    ) {
      delimiter = null;
      index += 2;
    }
  }

  return delimiter;
}

function normalizeCodexConfigIndentation(content: string): string {
  let multilineDelimiter: MultilineStringDelimiter | null = null;

  return content
    .split('\n')
    .map((line) => {
      const normalizedLine =
        multilineDelimiter === null ? line.trimStart() : line;
      multilineDelimiter = scanMultilineStringDelimiter(
        normalizedLine,
        multilineDelimiter,
      );
      return normalizedLine;
    })
    .join('\n');
}

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

function getObject(value: unknown): TomlObject {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return { ...(value as TomlObject) };
}

function getFiniteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/** Reads a valid numeric agents.max_depth value from Codex TOML content. */
export function readCodexMaxDepth(content: string | null): number | null {
  const parsed = parseConfig(content);
  const agents = getObject(parsed.agents);
  return getFiniteNumber(agents.max_depth);
}

/** Merges managed Codex roles and required shared agent configuration. */
export function mergeCodexConfig({
  existingContent,
  desiredRoles,
  staleManagedRoles = [],
  inheritedMaxDepth,
}: CodexConfigMergeArgs): CodexConfigMergeResult {
  const parsed = parseConfig(existingContent);
  const features = getObject(parsed.features);
  const agents = getObject(parsed.agents);
  const targetMaxDepth = getFiniteNumber(agents.max_depth);
  const validInheritedMaxDepth = getFiniteNumber(inheritedMaxDepth);

  agents.max_depth = Math.max(
    2,
    targetMaxDepth ?? 2,
    validInheritedMaxDepth ?? 2,
  );

  const nextConfig: TomlObject = {
    ...parsed,
    features: {
      ...features,
      multi_agent: true,
    },
    agents,
  };

  for (const role of desiredRoles) {
    agents[role.roleName] = {
      ...getObject(agents[role.roleName]),
      description: role.description,
      config_file: role.configFile,
    };
  }

  const removedRoles: string[] = [];
  for (const staleRole of staleManagedRoles) {
    if (staleRole in agents) {
      delete agents[staleRole];
      removedRoles.push(staleRole);
    }
  }

  const mergedContent = normalizeCodexConfigIndentation(
    stringifyToml(nextConfig),
  );
  const changed = (existingContent ?? '').trimEnd() !== mergedContent.trimEnd();

  return {
    mergedContent,
    changed,
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
