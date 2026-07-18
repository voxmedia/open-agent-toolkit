import { lstat, readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

import type { CanonicalAgentDocument } from '@agents/canonical';
import { CliError } from '@errors/index';
import { validateRealPathWithinScope } from '@fs/paths';
import YAML from 'yaml';

import type { CursorModelPinMapping } from './catalog';
import {
  buildCursorMaterializedRoleName,
  isOatManagedCursorRoleFile,
  normalizeCursorRoleName,
  renderCursorManagedComments,
  type CursorRoleOwner,
} from './shared';

const CURSOR_AGENT_DISCOVERY_DIRECTORIES = [
  '.cursor/agents',
  '.claude/agents',
  '.codex/agents',
] as const;

export interface CursorMaterializedAgent {
  roleName: string;
  fileName: string;
  description: string;
  content: string;
  owner: CursorRoleOwner;
  mapping: CursorModelPinMapping;
}

export interface CursorMaterializeAgentOptions {
  agent: CanonicalAgentDocument;
  mapping: CursorModelPinMapping;
  owner: CursorRoleOwner;
}

function assertApprovedMapping(mapping: CursorModelPinMapping): void {
  if (
    mapping.gateEvidence.gate !== 'g01' ||
    mapping.gateEvidence.disposition !== 'approved' ||
    !mapping.gateEvidence.probeName.trim()
  ) {
    throw new CliError(
      `Cannot materialize Cursor model ${mapping.ladderModelId}: mapping-specific gate g01 approval is required.`,
    );
  }
  if (!/\[[^\]]+\]$/.test(mapping.frontmatterModel)) {
    throw new CliError(
      `Cannot materialize Cursor model ${mapping.ladderModelId}: frontmatter model must include a non-empty bracket segment.`,
    );
  }
}

function optionalCursorBoolean(
  agent: CanonicalAgentDocument,
  field: 'readonly' | 'is_background',
): boolean | undefined {
  const value =
    field === 'readonly' ? agent.readonly : agent.frontmatter[field];
  return typeof value === 'boolean' ? value : undefined;
}

export function materializeCursorAgent({
  agent,
  mapping,
  owner,
}: CursorMaterializeAgentOptions): CursorMaterializedAgent {
  assertApprovedMapping(mapping);
  const roleName = buildCursorMaterializedRoleName({
    agentName: agent.name,
    ladderModelId: mapping.ladderModelId,
  });
  if (!roleName) {
    throw new CliError('Cannot materialize Cursor role: missing role name.');
  }

  const readonly = optionalCursorBoolean(agent, 'readonly');
  const isBackground = optionalCursorBoolean(agent, 'is_background');
  const frontmatter = {
    name: roleName,
    description: agent.description,
    model: mapping.frontmatterModel,
    ...(readonly !== undefined ? { readonly } : {}),
    ...(isBackground !== undefined ? { is_background: isBackground } : {}),
  };
  const yaml = YAML.stringify(frontmatter).trimEnd();
  const comments = renderCursorManagedComments(roleName, owner).join('\n');

  return {
    roleName,
    fileName: `${roleName}.md`,
    description: agent.description,
    content: `---\n${comments}\n${yaml}\n---\n${agent.body}`,
    owner,
    mapping,
  };
}

export function materializeCursorAgents(options: {
  agents: CanonicalAgentDocument[];
  targets: readonly CursorModelPinMapping[];
  owner: CursorRoleOwner;
}): CursorMaterializedAgent[] {
  const materialized = options.agents.flatMap((agent) =>
    options.targets.map((mapping) =>
      materializeCursorAgent({
        agent,
        mapping,
        owner: options.owner,
      }),
    ),
  );
  const byRoleName = new Map<string, CursorMaterializedAgent>();
  for (const role of materialized) {
    const existing = byRoleName.get(role.roleName);
    if (existing) {
      throw new CliError(
        `Distinct Cursor targets produced the same Cursor role name ${role.roleName} (${existing.mapping.ladderModelId}, ${role.mapping.ladderModelId}). Refusing ambiguous role writes.`,
      );
    }
    byRoleName.set(role.roleName, role);
  }

  return materialized.sort((left, right) =>
    left.roleName.localeCompare(right.roleName),
  );
}

async function readPathStats(path: string) {
  try {
    return await lstat(path);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

function readDeclaredCursorAgentName(content: string): string | null {
  const normalized = content.startsWith('\uFEFF') ? content.slice(1) : content;
  const match = /^---\n([\s\S]*?)\n---(?:\n|$)/.exec(normalized);
  if (!match?.[1]) {
    return null;
  }
  try {
    const frontmatter = YAML.parse(match[1]) as unknown;
    if (
      !frontmatter ||
      typeof frontmatter !== 'object' ||
      Array.isArray(frontmatter)
    ) {
      return null;
    }
    const name = (frontmatter as Record<string, unknown>)['name'];
    return typeof name === 'string' && name.trim()
      ? normalizeCursorRoleName(name)
      : null;
  } catch {
    return null;
  }
}

export async function assertNoUnmanagedCursorAgentCollisions(
  scopeRoot: string,
  desiredRoleNames: Iterable<string>,
): Promise<void> {
  const desiredNames = new Set(desiredRoleNames);
  for (const directory of CURSOR_AGENT_DISCOVERY_DIRECTORIES) {
    const directoryPath = join(scopeRoot, directory);
    const directoryStats = await readPathStats(directoryPath);
    if (!directoryStats) {
      continue;
    }
    if (directoryStats.isSymbolicLink()) {
      throw new CliError(
        `Cursor agent discovery directory is a symbolic link: ${directory}. Refusing unsafe materialization.`,
      );
    }
    if (!directoryStats.isDirectory()) {
      throw new CliError(
        `Cursor agent discovery path is not a directory: ${directory}.`,
      );
    }

    for (const fileName of await readdir(directoryPath)) {
      if (!fileName.endsWith('.md')) {
        continue;
      }
      const relativePath = `${directory}/${fileName}`;
      const absolutePath = join(directoryPath, fileName);
      const filenameRoleName = normalizeCursorRoleName(fileName);
      const fileStats = await readPathStats(absolutePath);
      if (!fileStats) {
        continue;
      }
      if (fileStats.isSymbolicLink()) {
        try {
          await validateRealPathWithinScope(absolutePath, scopeRoot);
        } catch {
          throw new CliError(
            `Cursor agent definition is a symbolic link at ${relativePath} whose target escapes the sync scope.`,
          );
        }
      }
      if (!fileStats.isFile() && !fileStats.isSymbolicLink()) {
        continue;
      }
      let content: string;
      try {
        content = await readFile(absolutePath, 'utf8');
      } catch {
        throw new CliError(
          `Cursor role name collision at ${relativePath}: existing Markdown definition cannot be verified as OAT-managed.`,
        );
      }
      const declaredRoleName = readDeclaredCursorAgentName(content);
      const filenameCollision = desiredNames.has(filenameRoleName);
      const declaredCollision =
        declaredRoleName !== null && desiredNames.has(declaredRoleName);
      if (!filenameCollision && !declaredCollision) {
        continue;
      }
      if (fileStats.isSymbolicLink()) {
        throw new CliError(
          `Cursor agent definition is a symbolic link at ${relativePath} with a colliding role name. Refusing unsafe materialization.`,
        );
      }
      const collidingRoleName = declaredCollision
        ? declaredRoleName
        : filenameRoleName;
      if (!isOatManagedCursorRoleFile(content, collidingRoleName)) {
        throw new CliError(
          declaredCollision && !filenameCollision
            ? `Unmanaged Cursor definition at ${relativePath} declares colliding name ${collidingRoleName}.`
            : `Cursor role name collision at ${relativePath}: existing Markdown definition is unmanaged.`,
        );
      }
    }
  }
}
