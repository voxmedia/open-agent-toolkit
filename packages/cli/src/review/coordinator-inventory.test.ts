import { describe, expect, it } from 'vitest';

import {
  REVIEW_COORDINATOR_EXCLUSIONS,
  REVIEW_COORDINATOR_INVENTORY,
} from './coordinator-inventory';

describe('review coordinator inventory', () => {
  it('freezes five direct and two indirect coordinator rows', () => {
    expect(
      REVIEW_COORDINATOR_INVENTORY.filter(({ tier }) => tier === 'direct'),
    ).toHaveLength(5);
    expect(
      REVIEW_COORDINATOR_INVENTORY.filter(({ tier }) => tier === 'indirect'),
    ).toHaveLength(2);
    expect(REVIEW_COORDINATOR_INVENTORY.map(({ id }) => id)).toEqual([
      'local-artifact-tier-1',
      'local-artifact-tier-3',
      'remote-structured-tier-1',
      'remote-structured-tier-3',
      'direct-phase-review',
      'gate-review',
      'implementation-checkpoint-final-aliases',
    ]);
  });

  it('assigns every broad review rail exactly one declared owner', () => {
    const ids = REVIEW_COORDINATOR_INVENTORY.map(({ id }) => id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(
      REVIEW_COORDINATOR_INVENTORY.every(({ owner }) => owner.length > 0),
    ).toBe(true);
  });

  it('explicitly excludes ad-hoc and non-code rails', () => {
    expect(REVIEW_COORDINATOR_EXCLUSIONS).toEqual([
      'ad-hoc-local-review',
      'ad-hoc-remote-review',
      'structured-plan-loop',
      'structured-analysis-loop',
    ]);
  });
});
