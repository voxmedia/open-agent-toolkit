import { lstat, readFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { CanonicalAgentDocument } from '@agents/canonical';
import { CliError } from '@errors/index';
import YAML from 'yaml';

import type { CursorModelPinMapping } from './catalog';
import {
  buildCursorMaterializedRoleName,
  isOatManagedCursorRoleFile,
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

async function pathExists(path: string): Promise<boolean> {
  try {
    await lstat(path);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}

export async function assertNoUnmanagedCursorAgentCollisions(
  scopeRoot: string,
  desiredRoleNames: Iterable<string>,
): Promise<void> {
  for (const roleName of new Set(desiredRoleNames)) {
    for (const directory of CURSOR_AGENT_DISCOVERY_DIRECTORIES) {
      const relativePath = `${directory}/${roleName}.md`;
      const absolutePath = join(scopeRoot, relativePath);
      if (!(await pathExists(absolutePath))) {
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
      if (!isOatManagedCursorRoleFile(content, roleName)) {
        throw new CliError(
          `Cursor role name collision at ${relativePath}: existing Markdown definition is unmanaged.`,
        );
      }
    }
  }
}
