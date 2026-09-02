import {
  requireCurrentOutboundSafety,
  type OutboundProjection,
  type OutboundProjectionSafetyResult,
} from '@commands/pjm/remote/outbound-projection-safety';
import {
  contextsEqual,
  semanticDigest,
  type ProviderContext,
} from '@commands/pjm/remote/provider';

export type GitHubRepositoryVisibility = 'private' | 'public' | 'unavailable';

export type GitHubPublicationBlockReason =
  | 'visibility-unavailable'
  | 'visibility-stale'
  | 'universal-safety-invalid'
  | 'prohibited-private-artifact';

export interface GitHubRepositoryVisibilityObservation {
  provider: 'github';
  context: ProviderContext;
  visibility: GitHubRepositoryVisibility;
  capabilityEvidenceDigest: string;
  observedAt: string;
  evidenceDigest: string;
}

export interface GitHubPublicationSafetyInput {
  visibilityObservation: GitHubRepositoryVisibilityObservation;
  projection: OutboundProjection;
  outboundSafety: OutboundProjectionSafetyResult | null;
  assessedAt: string;
}

export interface GitHubPublicationSafetyResult {
  schemaVersion: 1;
  verdict: 'safe' | 'blocked';
  reasons: GitHubPublicationBlockReason[];
  assessedAt: string;
  resultDigest: string;
  preview: {
    visibility: GitHubRepositoryVisibility;
    contextDigest: string;
    capabilityEvidenceDigest: string;
    visibilityEvidenceDigest: string;
    projectionDigest: string;
    universalSafetyResultDigest: string;
    verdict: 'safe' | 'blocked';
    reasonCodes: GitHubPublicationBlockReason[];
  };
}

export interface CurrentGitHubPublicationSafetyInput {
  context: ProviderContext;
  capabilityEvidenceDigest: string;
  projection: OutboundProjection;
  outboundSafety: OutboundProjectionSafetyResult;
  result: GitHubPublicationSafetyResult;
}

const PRIVATE_ARTIFACT_MARKERS = [
  '.oat/projects/',
  'discovery.md',
  'spec.md',
  'design.md',
  'plan.md',
  'implementation.md',
  'review artifact',
];
const MAX_VISIBILITY_AGE_MS = 5 * 60 * 1000;

export function observeGitHubRepositoryVisibility(
  input: Omit<
    GitHubRepositoryVisibilityObservation,
    'provider' | 'evidenceDigest'
  >,
): GitHubRepositoryVisibilityObservation {
  if (!Number.isFinite(Date.parse(input.observedAt))) {
    throw new Error(
      'GitHub visibility observation requires a valid timestamp.',
    );
  }
  if (!input.capabilityEvidenceDigest) {
    throw new Error(
      'GitHub visibility observation requires capability evidence.',
    );
  }
  const evidence = {
    provider: 'github' as const,
    context: input.context,
    visibility: input.visibility,
    capabilityEvidenceDigest: input.capabilityEvidenceDigest,
    observedAt: input.observedAt,
  };
  return { ...evidence, evidenceDigest: semanticDigest(evidence) };
}

export function assessGitHubPublicationSafety(
  input: GitHubPublicationSafetyInput,
): GitHubPublicationSafetyResult {
  if (!Number.isFinite(Date.parse(input.assessedAt))) {
    throw new Error('GitHub publication safety requires a valid timestamp.');
  }
  assertVisibilityObservation(input.visibilityObservation);
  const reasons: GitHubPublicationBlockReason[] = [];
  if (input.visibilityObservation.visibility === 'unavailable') {
    reasons.push('visibility-unavailable');
  }
  const visibilityAge =
    Date.parse(input.assessedAt) -
    Date.parse(input.visibilityObservation.observedAt);
  if (visibilityAge < 0 || visibilityAge > MAX_VISIBILITY_AGE_MS) {
    reasons.push('visibility-stale');
  }
  try {
    requireCurrentOutboundSafety(input.projection, input.outboundSafety);
  } catch {
    reasons.push('universal-safety-invalid');
  }
  if (containsPrivateArtifact(input.projection)) {
    reasons.push('prohibited-private-artifact');
  }
  const uniqueReasons = [...new Set(reasons)];
  const verdict: 'safe' | 'blocked' =
    uniqueReasons.length === 0 ? 'safe' : 'blocked';
  const preview = {
    visibility: input.visibilityObservation.visibility,
    contextDigest: semanticDigest(input.visibilityObservation.context),
    capabilityEvidenceDigest:
      input.visibilityObservation.capabilityEvidenceDigest,
    visibilityEvidenceDigest: input.visibilityObservation.evidenceDigest,
    projectionDigest:
      input.outboundSafety?.projectionDigest ??
      semanticDigest(input.projection),
    universalSafetyResultDigest:
      input.outboundSafety?.resultDigest ?? 'missing',
    verdict,
    reasonCodes: uniqueReasons,
  };
  const resultWithoutDigest = {
    schemaVersion: 1 as const,
    verdict,
    reasons: uniqueReasons,
    assessedAt: input.assessedAt,
    preview,
  };
  return {
    ...resultWithoutDigest,
    resultDigest: semanticDigest(resultWithoutDigest),
  };
}

export function requireCurrentGitHubPublicationSafety(
  input: CurrentGitHubPublicationSafetyInput,
): void {
  requireCurrentOutboundSafety(input.projection, input.outboundSafety);
  if (input.result.verdict !== 'safe') {
    throw new Error('GitHub publication safety blocks execution.');
  }
  if (
    input.result.preview.capabilityEvidenceDigest !==
    input.capabilityEvidenceDigest
  ) {
    throw new Error('GitHub publication capability evidence is mismatched.');
  }
  if (input.result.preview.contextDigest !== semanticDigest(input.context)) {
    throw new Error('GitHub publication context evidence is mismatched.');
  }
  if (
    input.result.preview.projectionDigest !==
      input.outboundSafety.projectionDigest ||
    input.result.preview.universalSafetyResultDigest !==
      input.outboundSafety.resultDigest
  ) {
    throw new Error('GitHub publication projection evidence is mismatched.');
  }
  const expectedDigest = semanticDigest({
    schemaVersion: input.result.schemaVersion,
    verdict: input.result.verdict,
    reasons: input.result.reasons,
    assessedAt: input.result.assessedAt,
    preview: input.result.preview,
  });
  if (expectedDigest !== input.result.resultDigest) {
    throw new Error('GitHub publication safety result digest is invalid.');
  }
}

function assertVisibilityObservation(
  observation: GitHubRepositoryVisibilityObservation,
): void {
  if (observation.provider !== 'github') {
    throw new Error('GitHub visibility evidence has the wrong provider.');
  }
  const expected = observeGitHubRepositoryVisibility({
    context: observation.context,
    visibility: observation.visibility,
    capabilityEvidenceDigest: observation.capabilityEvidenceDigest,
    observedAt: observation.observedAt,
  });
  if (expected.evidenceDigest !== observation.evidenceDigest) {
    throw new Error('GitHub visibility evidence digest is invalid.');
  }
  if (!contextsEqual(expected.context, observation.context)) {
    throw new Error('GitHub visibility context evidence is invalid.');
  }
}

function containsPrivateArtifact(projection: OutboundProjection): boolean {
  return Object.values(projection).some(
    (value) =>
      typeof value === 'string' &&
      PRIVATE_ARTIFACT_MARKERS.some((marker) =>
        value.toLowerCase().includes(marker),
      ),
  );
}
