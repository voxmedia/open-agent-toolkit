import { lstat, readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

import type { CanonicalAgentDocument } from '@agents/canonical';
import { CliError } from '@errors/index';
import YAML from 'yaml';

import {
  buildClaudeEffortVariantName,
  normalizeClaudeRoleName,
  validateClaudeDispatchCapability,
} from '../targets';

export type ClaudeRoleOwner = 'user-config' | 'project-config';

export interface ClaudeMaterializationTarget {
  model: string;
  effort: string;
  resolvedModel?: string;
  owner: ClaudeRoleOwner;
}

export interface ClaudeMaterializedAgent {
  roleName: string;
  fileName: string;
  content: string;
  owner: ClaudeRoleOwner;
  target: ClaudeMaterializationTarget;
}

const DISCOVERY_DIRECTORIES = [
  { path: '.claude/agents', extension: '.md' },
  { path: '.cursor/agents', extension: '.md' },
  { path: '.codex/agents', extension: '.toml' },
] as const;

function managedComments(
  roleName: string,
  owner: ClaudeRoleOwner,
  resolvedModel: string,
): string[] {
  return [
    '# oat-managed: true',
    `# oat-role: ${roleName}`,
    `# oat-owner: ${owner}`,
    '# oat-provider: claude',
    `# oat-resolved-model: ${resolvedModel}`,
  ];
}

function frontmatter(
  content: string,
): { yaml: string; value: Record<string, unknown> } | null {
  const match = /^---\n([\s\S]*?)\n---(?:\n|$)/.exec(content);
  if (!match?.[1]) return null;
  try {
    const value = YAML.parse(match[1]) as unknown;
    return value && typeof value === 'object' && !Array.isArray(value)
      ? { yaml: match[1], value: value as Record<string, unknown> }
      : null;
  } catch {
    return null;
  }
}

export function readOatManagedClaudeRole(content: string): {
  roleName: string;
  owner: ClaudeRoleOwner;
  resolvedModel?: string;
} | null {
  const parsed = frontmatter(content);
  if (!parsed) return null;
  const managed = parsed.yaml.match(/^# oat-managed: true$/gm)?.length === 1;
  const provider =
    parsed.yaml.match(/^# oat-provider: claude$/gm)?.length === 1;
  const role = /^# oat-role: ([a-z0-9]+(?:-[a-z0-9]+)*)$/m.exec(
    parsed.yaml,
  )?.[1];
  const owner = /^# oat-owner: (user-config|project-config)$/m.exec(
    parsed.yaml,
  )?.[1] as ClaudeRoleOwner | undefined;
  const resolvedModel =
    /^# oat-resolved-model: ([a-z0-9]+(?:-[a-z0-9]+)*)$/m.exec(
      parsed.yaml,
    )?.[1];
  return managed && provider && role && owner
    ? { roleName: role, owner, ...(resolvedModel ? { resolvedModel } : {}) }
    : null;
}

export function materializeClaudeAgent(options: {
  agent: CanonicalAgentDocument;
  target: ClaudeMaterializationTarget;
  env?: NodeJS.ProcessEnv;
}): ClaudeMaterializedAgent {
  const validation = validateClaudeDispatchCapability(
    options.target,
    options.env,
  );
  if (!validation.valid)
    throw new CliError(validation.reason ?? 'Invalid Claude target.');
  const resolvedModel = validation.resolvedModel;
  if (!resolvedModel) {
    throw new CliError(
      'Claude effort target has no resolved model capability.',
    );
  }
  const roleName = buildClaudeEffortVariantName({
    agentName: options.agent.name,
    model: options.target.model,
    effort: options.target.effort,
  });
  const description = `${options.agent.description} Claude-native ${options.target.model}/${options.target.effort} effort variant managed by OAT.`;
  const rendered = YAML.stringify({
    name: roleName,
    description,
    model: options.target.model,
    effort: options.target.effort,
    ...(options.agent.tools !== undefined
      ? { tools: options.agent.tools }
      : {}),
  }).trimEnd();
  return {
    roleName,
    fileName: `${roleName}.md`,
    content: `---\n${managedComments(roleName, options.target.owner, resolvedModel).join('\n')}\n${rendered}\n---\n${options.agent.body}`,
    owner: options.target.owner,
    target: { ...options.target, resolvedModel },
  };
}

export function materializeClaudeAgents(options: {
  agents: CanonicalAgentDocument[];
  targets: ClaudeMaterializationTarget[];
  env?: NodeJS.ProcessEnv;
}): ClaudeMaterializedAgent[] {
  const roles = options.agents.flatMap((agent) =>
    options.targets.map((target) =>
      materializeClaudeAgent({ agent, target, env: options.env }),
    ),
  );
  const names = new Set<string>();
  for (const role of roles) {
    if (names.has(role.roleName)) {
      throw new CliError(
        `Distinct Claude targets produced the same normalized role name ${role.roleName}. Refusing ambiguous role writes.`,
      );
    }
    names.add(role.roleName);
  }
  return roles.sort((left, right) =>
    left.roleName.localeCompare(right.roleName),
  );
}

async function pathStats(path: string) {
  try {
    return await lstat(path);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
}

export async function assertNoUnmanagedClaudeAgentCollisions(
  scopeRoot: string,
  desiredNames: Iterable<string>,
): Promise<void> {
  const desired = new Set(desiredNames);
  for (const { path: directory, extension } of DISCOVERY_DIRECTORIES) {
    const absoluteDirectory = join(scopeRoot, directory);
    const stats = await pathStats(absoluteDirectory);
    if (!stats) continue;
    if (!stats.isDirectory() || stats.isSymbolicLink()) {
      throw new CliError(
        `Claude agent discovery path is unsafe: ${directory}.`,
      );
    }
    for (const fileName of await readdir(absoluteDirectory)) {
      if (!fileName.endsWith(extension)) continue;
      const path = join(absoluteDirectory, fileName);
      const fileStats = await pathStats(path);
      if (!fileStats?.isFile() || fileStats.isSymbolicLink()) {
        if (
          desired.has(
            normalizeClaudeRoleName(fileName.slice(0, -extension.length)),
          )
        ) {
          throw new CliError(
            `Claude role collision at ${directory}/${fileName}: symbolic links are not writable targets.`,
          );
        }
        continue;
      }
      const content = await readFile(path, 'utf8');
      const parsed = extension === '.md' ? frontmatter(content) : null;
      const declared =
        typeof parsed?.value.name === 'string'
          ? normalizeClaudeRoleName(parsed.value.name)
          : null;
      const fileRole = normalizeClaudeRoleName(
        fileName.slice(0, -extension.length),
      );
      if (!desired.has(fileRole) && (!declared || !desired.has(declared)))
        continue;
      const managed = readOatManagedClaudeRole(content);
      if (
        directory !== '.claude/agents' ||
        !managed ||
        !desired.has(managed.roleName)
      ) {
        throw new CliError(
          `Claude role name collision at ${directory}/${fileName}: existing definition is not the matching OAT-managed Claude variant.`,
        );
      }
    }
  }
}
