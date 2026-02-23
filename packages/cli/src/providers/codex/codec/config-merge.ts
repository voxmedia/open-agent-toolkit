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

function getObject(value: unknown): TomlObject {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return { ...(value as TomlObject) };
}

export function mergeCodexConfig({
  existingContent,
  desiredRoles,
  staleManagedRoles = [],
}: CodexConfigMergeArgs): CodexConfigMergeResult {
  const parsed = parseConfig(existingContent);
  const features = getObject(parsed.features);
  const agents = getObject(parsed.agents);

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

  const mergedContent = stringifyToml(nextConfig);
  const changed = (existingContent ?? '').trimEnd() !== mergedContent.trimEnd();

  return {
    mergedContent,
    changed,
    removedRoles,
  };
}
