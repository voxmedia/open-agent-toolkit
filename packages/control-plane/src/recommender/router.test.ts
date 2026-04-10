import { describe, expect, it } from 'vitest';

import type { ArtifactStatus, ProjectState, ReviewStatus } from '../types';
import { recommendSkill } from './router';

function makeState(
  overrides: Partial<Omit<ProjectState, 'recommendation'>> = {},
): Omit<ProjectState, 'recommendation'> {
  return {
    name: 'demo',
    path: '.oat/projects/shared/demo',
    phase: 'discovery',
    phaseStatus: 'in_progress',
    workflowMode: 'spec-driven',
    executionMode: 'single-thread',
    lifecycle: 'active',
    pauseTimestamp: null,
    pauseReason: null,
    progress: {
      total: 0,
      completed: 0,
      currentTaskId: null,
      phases: [],
    },
    artifacts: makeArtifacts(),
    reviews: [],
    blockers: [],
    hillCheckpoints: [],
    hillCompleted: [],
    prStatus: null,
    prUrl: null,
    docsUpdated: null,
    lastCommit: null,
    timestamps: {
      created: '2026-04-08T00:00:00Z',
      completed: null,
      stateUpdated: '2026-04-09T00:00:00Z',
    },
    ...overrides,
  };
}

function makeArtifacts(
  currentArtifact?: Partial<ArtifactStatus> & { type: ArtifactStatus['type'] },
): ArtifactStatus[] {
  const base: ArtifactStatus[] = [
    makeArtifact('discovery'),
    makeArtifact('spec'),
    makeArtifact('design'),
    makeArtifact('plan'),
    makeArtifact('implementation'),
    makeArtifact('summary'),
  ];

  if (!currentArtifact) {
    return base;
  }

  return base.map((artifact) =>
    artifact.type === currentArtifact.type
      ? { ...artifact, ...currentArtifact }
      : artifact,
  );
}

function makeArtifact(type: ArtifactStatus['type']): ArtifactStatus {
  return {
    type,
    exists: true,
    path: `${type}.md`,
    status: 'in_progress',
    readyFor: null,
    isTemplate: true,
    boundaryTier: 3,
  };
}

function makeReview(overrides: Partial<ReviewStatus>): ReviewStatus {
  return {
    scope: 'final',
    type: 'code',
    status: 'pending',
    date: '-',
    artifact: '-',
    ...overrides,
  };
}

describe('recommendSkill', () => {
  it('routes spec-driven discovery tier 3 to discover', () => {
    const state = makeState({
      phase: 'discovery',
      phaseStatus: 'in_progress',
      artifacts: makeArtifacts({
        type: 'discovery',
        boundaryTier: 3,
      }),
    });

    expect(recommendSkill(state).skill).toBe('oat-project-discover');
  });

  it('routes spec-driven discovery tier 2 to spec', () => {
    const state = makeState({
      artifacts: makeArtifacts({
        type: 'discovery',
        boundaryTier: 2,
        isTemplate: false,
      }),
    });

    expect(recommendSkill(state).skill).toBe('oat-project-spec');
  });

  it('routes quick discovery complete to plan', () => {
    const state = makeState({
      phaseStatus: 'complete',
      workflowMode: 'quick',
      artifacts: makeArtifacts({
        type: 'discovery',
        boundaryTier: 1,
        status: 'complete',
      }),
    });

    expect(recommendSkill(state).skill).toBe('oat-project-plan');
  });

  it('routes import plan tier 3 to import-plan', () => {
    const state = makeState({
      phase: 'plan',
      workflowMode: 'import',
      artifacts: makeArtifacts({
        type: 'plan',
        boundaryTier: 3,
      }),
    });

    expect(recommendSkill(state).skill).toBe('oat-project-import-plan');
  });

  it('uses subagent implementation when execution mode is subagent-driven', () => {
    const state = makeState({
      phase: 'plan',
      phaseStatus: 'complete',
      executionMode: 'subagent-driven',
      artifacts: makeArtifacts({
        type: 'plan',
        boundaryTier: 1,
        status: 'complete',
      }),
    });

    expect(recommendSkill(state).skill).toBe('oat-project-subagent-implement');
  });

  it('applies the HiLL override before normal routing', () => {
    const state = makeState({
      phase: 'design',
      hillCheckpoints: ['design'],
      hillCompleted: [],
      artifacts: makeArtifacts({
        type: 'design',
        boundaryTier: 1,
        status: 'complete',
      }),
    });

    expect(recommendSkill(state).skill).toBe('oat-project-design');
  });

  it('routes incomplete revision work back to implement', () => {
    const state = makeState({
      phase: 'implement',
      phaseStatus: 'complete',
      progress: {
        total: 3,
        completed: 2,
        currentTaskId: 'p-rev1-t02',
        phases: [
          {
            phaseId: 'p-rev1',
            name: 'Review fixes',
            total: 2,
            completed: 1,
            isRevision: true,
          },
        ],
      },
    });

    expect(recommendSkill(state).skill).toBe('oat-project-implement');
  });

  it('routes unprocessed reviews to review-receive', () => {
    const state = makeState({
      phase: 'implement',
      phaseStatus: 'complete',
      reviews: [makeReview({ scope: 'p01', status: 'received' })],
    });

    expect(recommendSkill(state).skill).toBe('oat-project-review-receive');
  });

  it('routes pending final review to review-provide with code final context', () => {
    const state = makeState({
      phase: 'implement',
      phaseStatus: 'complete',
      reviews: [makeReview({ scope: 'final', status: 'pending' })],
    });

    expect(recommendSkill(state)).toMatchObject({
      skill: 'oat-project-review-provide',
      context: 'code final',
    });
  });

  it('routes fixes_completed final review to re-review', () => {
    const state = makeState({
      phase: 'implement',
      phaseStatus: 'complete',
      reviews: [makeReview({ scope: 'final', status: 'fixes_completed' })],
    });

    expect(recommendSkill(state).skill).toBe('oat-project-review-provide');
  });

  it('routes non-passed final review statuses back to review-receive', () => {
    const state = makeState({
      phase: 'implement',
      phaseStatus: 'complete',
      reviews: [makeReview({ scope: 'final', status: 'fixes_added' })],
    });

    expect(recommendSkill(state).skill).toBe('oat-project-review-receive');
  });

  it('routes passed final review without summary to summary', () => {
    const state = makeState({
      phase: 'implement',
      phaseStatus: 'complete',
      reviews: [makeReview({ scope: 'final', status: 'passed' })],
      artifacts: makeArtifacts({
        type: 'summary',
        exists: false,
        boundaryTier: 3,
      }),
    });

    expect(recommendSkill(state).skill).toBe('oat-project-summary');
  });

  it('routes to pr-final when summary is complete and no PR is open', () => {
    const state = makeState({
      phase: 'implement',
      phaseStatus: 'complete',
      reviews: [makeReview({ scope: 'final', status: 'passed' })],
      artifacts: makeArtifacts({
        type: 'summary',
        exists: true,
        status: 'complete',
        boundaryTier: 1,
      }),
    });

    expect(recommendSkill(state).skill).toBe('oat-project-pr-final');
  });

  it('routes to complete when the PR is already open', () => {
    const state = makeState({
      phase: 'implement',
      phaseStatus: 'pr_open',
      reviews: [makeReview({ scope: 'final', status: 'passed' })],
      artifacts: makeArtifacts({
        type: 'summary',
        exists: true,
        status: 'complete',
        boundaryTier: 1,
      }),
    });

    expect(recommendSkill(state).skill).toBe('oat-project-complete');
  });
});
