export type {
  AdapterScope,
  PathMapping,
  ProviderAdapter,
} from './adapter.types';
export type { ConfigAwareAdaptersResult } from './adapter.utils';
export {
  getActiveAdapters,
  getConfigAwareAdapters,
  getSyncMappings,
} from './adapter.utils';
export type {
  ProviderAgentCodec,
  ProviderAgentRecord,
} from './agent-codec.types';
export {
  exportMarkdownAgentRecord,
  importMarkdownAgentRecord,
} from './markdown-agent-codec';
export type {
  MaterializationAction,
  MaterializationApplyResult,
  MaterializationContext,
  MaterializationExtension,
  MaterializationOperation,
  MaterializationPlan,
  MaterializationPlanSummary,
  MaterializationWriteOperation,
} from './materialization-extension';
export {
  hasMaterializationChanges,
  summarizeMaterializationPlan,
  toMaterializationOperations,
} from './materialization-extension';
