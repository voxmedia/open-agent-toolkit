import {
  type CanonicalAgentDocument,
  parseCanonicalAgentMarkdown,
  renderCanonicalAgentMarkdown,
} from '@agents/canonical';
import type { ProviderAgentRecord } from './agent-codec.types';

export function importMarkdownAgentRecord(
  record: ProviderAgentRecord,
): CanonicalAgentDocument {
  return parseCanonicalAgentMarkdown(
    record.content,
    `${record.provider}:${record.identifier}`,
  );
}

export function exportMarkdownAgentRecord(
  provider: string,
  identifier: string,
  agent: CanonicalAgentDocument,
): ProviderAgentRecord {
  return {
    provider,
    identifier,
    description: agent.description,
    content: renderCanonicalAgentMarkdown(agent),
  };
}
