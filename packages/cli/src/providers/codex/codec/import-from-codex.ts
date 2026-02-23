import {
  type CanonicalAgentDocument,
  parseCanonicalAgentMarkdown,
} from '@agents/canonical';
import { CliError } from '@errors/index';
import TOML from '@iarna/toml';
import YAML from 'yaml';
import { sanitizeCodexRoleName } from './shared';

const DEFAULT_CANONICAL_TOOLS = 'Read, Grep, Glob, Bash';

function parseCodexRoleToml(roleContent: string): Record<string, unknown> {
  try {
    const parsed = TOML.parse(roleContent);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new CliError('Codex role TOML must parse to an object.');
    }
    return parsed as Record<string, unknown>;
  } catch (error) {
    if (error instanceof CliError) {
      throw error;
    }
    throw new CliError(
      `Failed to parse Codex role TOML: ${error instanceof Error ? error.message : 'unknown parse error'}`,
    );
  }
}

function pickCodexExtension(
  role: Record<string, unknown>,
): Record<string, unknown> {
  const extension = { ...role };
  delete extension.developer_instructions;
  return extension;
}

function renderMarkdown(
  frontmatter: Record<string, unknown>,
  body: string,
): string {
  return `---\n${YAML.stringify(frontmatter).trimEnd()}\n---\n\n${body}`;
}

export interface CodexRoleImportArgs {
  roleName: string;
  roleContent: string;
  description?: string;
  tools?: string;
}

export function importCanonicalAgentFromCodexRole({
  roleName,
  roleContent,
  description,
  tools,
}: CodexRoleImportArgs): CanonicalAgentDocument {
  const normalizedRoleName = sanitizeCodexRoleName(roleName);
  const parsed = parseCodexRoleToml(roleContent);
  const instructions =
    typeof parsed.developer_instructions === 'string'
      ? parsed.developer_instructions
      : '';

  const extension = pickCodexExtension(parsed);
  const frontmatter: Record<string, unknown> = {
    name: normalizedRoleName,
    description:
      description && description.trim().length > 0
        ? description
        : `Imported from Codex role ${normalizedRoleName}`,
    tools: tools ?? DEFAULT_CANONICAL_TOOLS,
  };

  if (parsed.sandbox_mode === 'read-only') {
    frontmatter.readonly = true;
  }

  if (Object.keys(extension).length > 0) {
    frontmatter.x_codex = extension;
  }

  const markdown = renderMarkdown(frontmatter, instructions);
  return parseCanonicalAgentMarkdown(markdown, `codex:${normalizedRoleName}`);
}
