import {
  requireCurrentOutboundSafety,
  type OutboundProjection,
  type OutboundProjectionSafetyResult,
} from '@commands/pjm/remote/outbound-projection-safety';
import { semanticDigest } from '@commands/pjm/remote/provider';

export type GitHubRepositoryVisibility = 'private' | 'public' | 'unavailable';

export type GitHubPublicationBlockReason =
  | 'visibility-unavailable'
  | 'universal-safety-invalid'
  | 'prohibited-private-artifact';

export interface GitHubPublicationSafetyInput {
  visibility: GitHubRepositoryVisibility;
  visibilityEvidenceDigest: string | null;
  projection: OutboundProjection;
  outboundSafety: OutboundProjectionSafetyResult | null;
  assessedAt: string;
}

export interface GitHubPublicationSafetyResult {
  schemaVersion: 1;
  verdict: 'safe' | 'blocked';
  reasons: GitHubPublicationBlockReason[];
  resultDigest: string;
  preview: {
    visibility: GitHubRepositoryVisibility;
    projectionDigest: string;
    universalSafetyResultDigest: string;
    verdict: 'safe' | 'blocked';
    reasonCodes: GitHubPublicationBlockReason[];
  };
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

export function assessGitHubPublicationSafety(
  input: GitHubPublicationSafetyInput,
): GitHubPublicationSafetyResult {
  if (!Number.isFinite(Date.parse(input.assessedAt))) {
    throw new Error('GitHub publication safety requires a valid timestamp.');
  }
  const reasons: GitHubPublicationBlockReason[] = [];
  if (input.visibility === 'unavailable' || !input.visibilityEvidenceDigest) {
    reasons.push('visibility-unavailable');
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
  const projectionDigest =
    input.outboundSafety?.projectionDigest ?? semanticDigest(input.projection);
  const universalSafetyResultDigest =
    input.outboundSafety?.resultDigest ?? 'missing';
  const preview = {
    visibility: input.visibility,
    projectionDigest,
    universalSafetyResultDigest,
    verdict,
    reasonCodes: uniqueReasons,
  };
  return {
    schemaVersion: 1,
    verdict,
    reasons: uniqueReasons,
    resultDigest: semanticDigest({
      schemaVersion: 1,
      visibilityEvidenceDigest: input.visibilityEvidenceDigest,
      ...preview,
      assessedAt: input.assessedAt,
    }),
    preview,
  };
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
