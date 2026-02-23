import type { CanonicalAgentDocument } from '@agents/canonical';

export interface ProviderAgentRecord {
  provider: string;
  identifier: string;
  description?: string;
  content: string;
}

export interface ProviderAgentCodec {
  provider: string;
  importFromProvider(record: ProviderAgentRecord): CanonicalAgentDocument;
  exportToProvider(agent: CanonicalAgentDocument): ProviderAgentRecord;
}
