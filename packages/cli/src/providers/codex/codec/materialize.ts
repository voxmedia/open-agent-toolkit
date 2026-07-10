import type { CanonicalAgentDocument } from '@agents/canonical';
import { CliError } from '@errors/index';

import {
  type CodexRoleExport,
  exportCanonicalAgentToCodexRole,
} from './export-to-codex';
import {
  buildCodexMaterializedTargetRoleName,
  sanitizeCodexRoleName,
} from './shared';

export interface CodexMaterializeRoleOptions {
  agent: CanonicalAgentDocument;
  model: string;
  effort: string;
  roleName?: string;
}

export interface CodexMaterializedRoleNameOptions {
  agentName: string;
  model: string;
  effort: string;
}

function requireNonEmpty(value: string, label: string): string {
  const normalized = value.trim();
  if (!normalized) {
    throw new CliError(`Cannot materialize Codex role: missing ${label}.`);
  }
  return normalized;
}

export function buildCodexMaterializedRoleName({
  agentName,
  model,
  effort,
}: CodexMaterializedRoleNameOptions): string {
  const roleName = buildCodexMaterializedTargetRoleName({
    agentName,
    model,
    effort,
  });

  if (!roleName) {
    throw new CliError('Cannot materialize Codex role: missing role name.');
  }

  return roleName;
}

function codexExtensionObject(agent: CanonicalAgentDocument) {
  const extension = agent.extensions.x_codex;
  if (!extension || typeof extension !== 'object' || Array.isArray(extension)) {
    return {};
  }

  return { ...(extension as Record<string, unknown>) };
}

export function materializeCodexRole({
  agent,
  model,
  effort,
  roleName,
}: CodexMaterializeRoleOptions): CodexRoleExport {
  const materializedModel = requireNonEmpty(model, 'model');
  const materializedEffort = requireNonEmpty(effort, 'effort');
  const materializedRoleName = roleName
    ? sanitizeCodexRoleName(roleName)
    : buildCodexMaterializedRoleName({
        agentName: agent.name,
        model: materializedModel,
        effort: materializedEffort,
      });

  if (!materializedRoleName) {
    throw new CliError('Cannot materialize Codex role: missing role name.');
  }

  return exportCanonicalAgentToCodexRole({
    ...agent,
    name: materializedRoleName,
    frontmatter: {
      ...agent.frontmatter,
      name: materializedRoleName,
    },
    extensions: {
      ...agent.extensions,
      x_codex: {
        ...codexExtensionObject(agent),
        model: materializedModel,
        model_reasoning_effort: materializedEffort,
      },
    },
  });
}
