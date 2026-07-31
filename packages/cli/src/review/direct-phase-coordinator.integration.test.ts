import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { REVIEW_COORDINATOR_INVENTORY } from './coordinator-inventory';

const phaseExecution = readFileSync(
  join(
    import.meta.dirname,
    '../../../../.agents/skills/oat-project-implement/references/phase-execution.md',
  ),
  'utf8',
);

describe('direct phase review coordinator integration', () => {
  it('orders preparation, accepted continuation, validation, and publication', () => {
    const review = phaseExecution
      .slice(
        phaseExecution.indexOf('### Per-Phase Review'),
        phaseExecution.indexOf('#### Bounded Fix and Re-Review Loop'),
      )
      .replace(/\s+/g, ' ');
    const markers = [
      'prepare-context',
      'accepted reviewer handle',
      'checkpointArtifacts',
      'validate-plan',
      'begin-evidence',
      'ReviewerTerminalV1',
      'validate-output',
      'same-handle accounting repair',
      'publishAcceptedArtifact',
      'bookkeeping',
    ];
    let prior = -1;
    for (const marker of markers) {
      const index = review.indexOf(marker);
      expect(index, marker).toBeGreaterThan(prior);
      prior = index;
    }
    expect(review).toContain(
      'Blocked or accounting-invalid output remains non-actionable',
    );
  });

  it('resolves five direct and two indirect rails through one shared coordinator', () => {
    expect(
      REVIEW_COORDINATOR_INVENTORY.filter(
        ({ resolution }) => resolution === 'direct-owner',
      ),
    ).toHaveLength(5);
    expect(
      REVIEW_COORDINATOR_INVENTORY.filter(
        ({ resolution }) => resolution === 'inherits-owner',
      ),
    ).toHaveLength(2);
    expect(
      new Set(
        REVIEW_COORDINATOR_INVENTORY.map(
          ({ sharedCoordinator }) => sharedCoordinator,
        ),
      ),
    ).toEqual(new Set(['review-validation-v1']));
  });

  it('does not duplicate authoritative context for gate or checkpoint aliases', () => {
    const normalized = phaseExecution.replace(/\s+/g, ' ');
    expect(normalized).toContain(
      'Gate and checkpoint/final aliases inherit this coordinator; they do not create another authoritative context.',
    );
    expect(
      REVIEW_COORDINATOR_INVENTORY.filter(
        ({ authority }) => authority === 'inherited',
      ).map(({ id }) => id),
    ).toEqual(['gate-review', 'implementation-checkpoint-final-aliases']);
  });
});
