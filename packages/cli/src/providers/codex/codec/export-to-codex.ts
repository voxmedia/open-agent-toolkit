import type { CanonicalAgentDocument } from '@agents/canonical';
import { CliError } from '@errors/index';

import {
  sanitizeCodexRoleName,
  stringifyToml,
  withOatManagedCodexHeader,
} from './shared';

export interface CodexRoleExport {
  roleName: string;
  description: string;
  configFile: string;
  content: string;
}

function resolveSandboxMode(agent: CanonicalAgentDocument): string {
  const codexExtension = agent.extensions.x_codex;
  if (
    codexExtension &&
    typeof codexExtension === 'object' &&
    codexExtension !== null &&
    'sandbox_mode' in codexExtension &&
    typeof codexExtension.sandbox_mode === 'string'
  ) {
    return codexExtension.sandbox_mode;
  }

  if (agent.readonly === true) {
    return 'read-only';
  }

  return 'workspace-write';
}

function codexExtensionMap(
  agent: CanonicalAgentDocument,
): Record<string, unknown> {
  const extension = agent.extensions.x_codex;
  if (!extension || typeof extension !== 'object' || Array.isArray(extension)) {
    return {};
  }

  return { ...(extension as Record<string, unknown>) };
}

export function exportCanonicalAgentToCodexRole(
  agent: CanonicalAgentDocument,
): CodexRoleExport {
  const roleName = sanitizeCodexRoleName(agent.name);
  if (!roleName) {
    throw new CliError(
      'Cannot export Codex role: missing canonical agent name.',
    );
  }

  const extension = codexExtensionMap(agent);
  const roleObject: Record<string, unknown> = {
    ...extension,
    developer_instructions: agent.body,
    sandbox_mode: resolveSandboxMode(agent),
  };

  if (agent.model && typeof roleObject.model !== 'string') {
    roleObject.model = agent.model;
  }

  const tomlBody = stringifyToml(roleObject);

  return {
    roleName,
    description: agent.description,
    configFile: `agents/${roleName}.toml`,
    content: withOatManagedCodexHeader(roleName, tomlBody),
  };
}
