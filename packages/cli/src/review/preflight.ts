import { allocateReviewTimeBudget } from './budget';
import { ReviewDomainError } from './errors';
import type {
  ReviewPlanCapabilities,
  ReviewPlanPreflightInput,
  ReviewPlanPreflightResult,
} from './types';

export interface ReviewPlanLaunchPreflightInput extends ReviewPlanPreflightInput {
  budgetMs?: number | null;
  budgetSource?: string | null;
}

const COMMON_CAPABILITIES = [
  'supportsAcceptedContinuation',
  'supportsArtifactCheckpoint',
  'supportsSameHandleRepair',
  'supportsReviewerTerminalV1',
] as const satisfies readonly (keyof ReviewPlanCapabilities)[];

export function preflightReviewPlan(
  input: ReviewPlanLaunchPreflightInput,
  capabilities: ReviewPlanCapabilities,
  _reviewerSelfReport?: unknown,
): ReviewPlanPreflightResult {
  if (input.mode === 'legacy') {
    return { ok: true, capabilities, errors: [] };
  }

  const errors: ReviewPlanPreflightResult['errors'] = [];
  if (capabilities.schemaVersion !== 1) {
    errors.push({
      code: 'unsupported-review-contract-version',
      message:
        'The coordinator adapter must support review contract version 1.',
    });
  }

  for (const capability of COMMON_CAPABILITIES) {
    if (!capabilities[capability]) {
      errors.push({
        code: `missing-${capability}`,
        message: `The coordinator adapter is missing ${capability}.`,
      });
    }
  }

  const sinkCapability =
    input.sink === 'artifact'
      ? 'supportsPrivateArtifactStaging'
      : 'supportsStructuredBlockedStatus';
  if (!capabilities[sinkCapability]) {
    errors.push({
      code: `missing-${sinkCapability}`,
      message: `The ${input.sink} sink is missing ${sinkCapability}.`,
    });
  }

  if (
    capabilities.contextTelemetry === 'host-observed' &&
    capabilities.telemetryAdapterId === null
  ) {
    errors.push({
      code: 'missing-telemetry-adapter-id',
      message: 'Host-observed telemetry requires an adapter ID.',
    });
  }
  if (
    capabilities.contextTelemetry === 'unavailable' &&
    capabilities.telemetryAdapterId !== null
  ) {
    errors.push({
      code: 'unexpected-telemetry-adapter-id',
      message: 'Unavailable telemetry cannot name an adapter.',
    });
  }

  try {
    allocateReviewTimeBudget({
      totalMs: input.budgetMs ?? null,
      source: input.budgetSource ?? null,
      startedAtMs: 0,
    });
  } catch (error) {
    if (error instanceof ReviewDomainError) {
      errors.push({
        code: error.code,
        message: error.message,
        ...(typeof error.details === 'object' &&
        error.details !== null &&
        !Array.isArray(error.details)
          ? { details: error.details }
          : {}),
      });
    } else {
      throw error;
    }
  }

  return { ok: errors.length === 0, capabilities, errors };
}
