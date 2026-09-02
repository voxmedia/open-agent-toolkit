export const REVIEW_CONTRACT_VERSION = 1 as const;

export {
  collectChangeMap,
  DefaultGitChangeMapAdapter,
  type GitChangeMapAdapter,
} from './change-map';
export {
  collectReviewObligations,
  type CollectReviewObligationsInput,
  parseDeferredFindingObligations,
  parseDeviationObligations,
  parsePlanTaskObligations,
  parseRequirementObligations,
} from './obligations';
export {
  prepareReviewContext,
  type PrepareReviewContextDependencies,
  type PrepareReviewContextInput,
} from './prepare-context';
export { preflightReviewPlan } from './preflight';
export {
  parsePreparedReviewContextV1,
  parseReviewPreparationV1,
  parseReviewerTerminalIngressV1,
  parseReviewerTerminalOverlayV1,
  ReviewSchemaError,
} from './schemas';
export {
  assembleReviewerTerminal,
  ReviewTerminalAssemblyError,
  type ReviewerTerminalAssemblyContextV1,
} from './terminal-assembly';
export {
  type FindingSeverity,
  type StructuredFinding,
  type StructuredFindings,
  StructuredFindingsError,
  validateStructuredFindings,
} from './structured-findings';
export {
  type HostContextTelemetryAdapter,
  type ObserveHostTelemetryInput,
  observeHostTelemetry,
} from './telemetry';
export type {
  JsonValue,
  ReviewCliEnvelope,
  ReviewCliError,
  ReviewErrorCategory,
  ReviewAccountingSeedV1,
  ReviewInvocation,
  ReviewPlanCapabilities,
  ReviewPlanPreflightInput,
  ReviewPlanPreflightResult,
  ReviewProgress,
  ReviewSink,
  ReviewerTerminalIngressV1,
  ReviewerTerminalOverlayV1,
} from './types';
