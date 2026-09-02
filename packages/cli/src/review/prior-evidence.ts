import { normalizeReviewPaths } from './review-paths';
import type { PriorReviewEvidenceV1 } from './types';

export interface PriorReviewEvidenceCandidate {
  artifactRef: string;
  lineage: PriorReviewEvidenceV1['lineage'];
  reviewedRange: PriorReviewEvidenceV1['reviewedRange'];
  riskHints?: string[];
  verificationHistory?: PriorReviewEvidenceV1['verificationHistory'];
  deferredFindingIds?: string[];
  verdict?: unknown;
  severity?: unknown;
  disposition?: unknown;
}

export function adaptPriorReviewEvidence(input: {
  project: string;
  target: string;
  gateId: string | null;
  candidates: readonly PriorReviewEvidenceCandidate[];
}): PriorReviewEvidenceV1[] {
  const adapted = input.candidates.map((candidate) => {
    if (
      candidate.lineage.project !== input.project ||
      candidate.lineage.target !== input.target
    ) {
      throw new Error('prior review evidence has mismatched project or target');
    }
    if (candidate.lineage.gateId !== input.gateId) {
      throw new Error('prior review evidence has mismatched gate lineage');
    }
    for (const sha of [
      candidate.reviewedRange.baseSha,
      candidate.reviewedRange.headSha,
    ]) {
      if (!/^[0-9a-f]{40}$/.test(sha)) {
        throw new Error('prior review evidence has malformed range');
      }
    }
    return {
      artifactRef: candidate.artifactRef,
      lineage: { ...candidate.lineage },
      reviewedRange: { ...candidate.reviewedRange },
      riskHints: [...(candidate.riskHints ?? [])],
      verificationHistory: (candidate.verificationHistory ?? []).map(
        (entry) => ({
          check: entry.check,
          scopePaths: normalizeReviewPaths(entry.scopePaths),
          result: entry.result,
          provenance: entry.provenance,
        }),
      ),
      deferredFindingIds: [
        ...new Set(candidate.deferredFindingIds ?? []),
      ].sort(),
    };
  });
  return adapted.sort((left, right) =>
    left.artifactRef.localeCompare(right.artifactRef),
  );
}
