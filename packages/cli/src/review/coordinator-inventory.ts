export type ReviewCoordinatorTier = 'direct' | 'indirect';
export type ReviewCoordinatorSink = 'artifact' | 'structured';

export interface ReviewCoordinatorInventoryEntry {
  id: string;
  owner:
    | 'oat-project-review-provide'
    | 'oat-project-review-provide-remote'
    | 'oat-project-implement';
  tier: ReviewCoordinatorTier;
  sink: ReviewCoordinatorSink;
  authority: 'review-coordinator' | 'inherited';
}

export const REVIEW_COORDINATOR_INVENTORY = [
  {
    id: 'local-artifact-tier-1',
    owner: 'oat-project-review-provide',
    tier: 'direct',
    sink: 'artifact',
    authority: 'review-coordinator',
  },
  {
    id: 'local-artifact-tier-3',
    owner: 'oat-project-review-provide',
    tier: 'direct',
    sink: 'artifact',
    authority: 'review-coordinator',
  },
  {
    id: 'remote-structured-tier-1',
    owner: 'oat-project-review-provide-remote',
    tier: 'direct',
    sink: 'structured',
    authority: 'review-coordinator',
  },
  {
    id: 'remote-structured-tier-3',
    owner: 'oat-project-review-provide-remote',
    tier: 'direct',
    sink: 'structured',
    authority: 'review-coordinator',
  },
  {
    id: 'direct-phase-review',
    owner: 'oat-project-implement',
    tier: 'direct',
    sink: 'artifact',
    authority: 'review-coordinator',
  },
  {
    id: 'gate-review',
    owner: 'oat-project-review-provide',
    tier: 'indirect',
    sink: 'artifact',
    authority: 'inherited',
  },
  {
    id: 'implementation-checkpoint-final-aliases',
    owner: 'oat-project-review-provide',
    tier: 'indirect',
    sink: 'artifact',
    authority: 'inherited',
  },
] as const satisfies readonly ReviewCoordinatorInventoryEntry[];

export const REVIEW_COORDINATOR_EXCLUSIONS = [
  'ad-hoc-local-review',
  'ad-hoc-remote-review',
  'structured-plan-loop',
  'structured-analysis-loop',
] as const;
