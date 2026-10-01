// One rule, shared by reconciliation and publication, for a claim that a
// required review left without a disposition. Reviewers may omit a claim, and
// an accepted review is never rerun, so reconciliation keeps the claim below
// `verified`. It must not hide: the packet carries a material gap naming the
// claim and the review's exact approved wave and lane, which forces `partial`.
//
// The only exemption is a claim an incorporated review itself characterized:
// any review's `rejected` disposition or an adversarial `challenged` one. That
// mirrors the reconciler's precedence (rejected, then challenged, before
// incomplete) and is read from the reviews, never from the claim's published
// status, which the controller writes.

export const REVIEW_OMISSION_GAP_CODE = 'REVIEW_DISPOSITION_OMITTED';

export const requiredReviewKinds = Object.freeze([
  'semantic',
  'adversarial',
  'coverage',
]);

export function reviewsCharacterizeClaim(claimId, reviews) {
  return reviews.some((review) =>
    (review?.dispositions ?? []).some(
      (item) =>
        item?.claimId === claimId &&
        (item.disposition === 'rejected' ||
          (review.reviewKind === 'adversarial' &&
            item.disposition === 'challenged')),
    ),
  );
}

function laneWaves(manifest) {
  const waves = new Map();
  const declared = manifest?.execution?.waves;
  for (const wave of Array.isArray(declared) ? declared : []) {
    for (const lane of Array.isArray(wave?.lanes) ? wave.lanes : []) {
      waves.set(lane?.laneId, wave.waveId);
    }
  }
  return waves;
}

// Each required review kind (by its incorporated review) that left `claimId`
// without a disposition.
export function omittedReviews(claimId, reviews) {
  return requiredReviewKinds
    .map((kind) => reviews.find((review) => review?.reviewKind === kind))
    .filter(
      (review) =>
        review &&
        !(review.dispositions ?? []).some((item) => item?.claimId === claimId),
    );
}

export function reviewOmissionGaps({ manifest, ledger, reviews }) {
  const waves = laneWaves(manifest);
  const gaps = [];
  for (const claim of Array.isArray(ledger?.claims) ? ledger.claims : []) {
    if (reviewsCharacterizeClaim(claim.id, reviews)) continue;
    for (const review of omittedReviews(claim.id, reviews)) {
      const waveId = waves.get(review.reviewerLane);
      gaps.push({
        id: `gap-review-omitted-${review.reviewerLane}-${claim.id}`,
        code: REVIEW_OMISSION_GAP_CODE,
        message: `The ${review.reviewKind} review ${review.id} left claim ${claim.id} without a disposition; the claim was not reviewed.`,
        material: true,
        ...(waveId ? { waveId, laneId: review.reviewerLane } : {}),
        sourceIds: [],
        claimIds: [claim.id],
        coverageFindingIds: [],
      });
    }
  }
  return gaps;
}

export function gapCoversReviewOmission(gap, expected) {
  return (
    gap?.code === REVIEW_OMISSION_GAP_CODE &&
    gap.material === true &&
    expected.waveId !== undefined &&
    gap.waveId === expected.waveId &&
    gap.laneId === expected.laneId &&
    Array.isArray(gap.claimIds) &&
    expected.claimIds.every((claimId) => gap.claimIds.includes(claimId))
  );
}
