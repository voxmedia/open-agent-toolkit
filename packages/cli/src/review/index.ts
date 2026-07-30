export const REVIEW_CONTRACT_VERSION = 1 as const;

export { preflightReviewPlan } from './preflight';
export {
  parsePreparedReviewContextV1,
  parseReviewPreparationV1,
  ReviewSchemaError,
} from './schemas';
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
  ReviewInvocation,
  ReviewPlanCapabilities,
  ReviewPlanPreflightInput,
  ReviewPlanPreflightResult,
  ReviewProgress,
  ReviewSink,
} from './types';
