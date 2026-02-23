import YAML from 'yaml';
import type { CanonicalAgentDocument } from './types';

function buildFrontmatter(
  agent: CanonicalAgentDocument,
): Record<string, unknown> {
  return {
    ...agent.frontmatter,
    name: agent.name,
    description: agent.description,
    ...(agent.tools !== undefined ? { tools: agent.tools } : {}),
    ...(agent.model !== undefined ? { model: agent.model } : {}),
    ...(agent.readonly !== undefined ? { readonly: agent.readonly } : {}),
    ...(agent.color !== undefined ? { color: agent.color } : {}),
  };
}

export function renderCanonicalAgentMarkdown(
  agent: CanonicalAgentDocument,
): string {
  const frontmatterYaml = YAML.stringify(buildFrontmatter(agent)).trimEnd();
  const body = agent.body.startsWith('\n') ? agent.body.slice(1) : agent.body;

  return `---\n${frontmatterYaml}\n---\n\n${body}`;
}
