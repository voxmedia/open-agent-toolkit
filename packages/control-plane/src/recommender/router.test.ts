import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { scanArtifacts } from '../state/artifacts';
import type { ArtifactStatus, ProjectState, ReviewStatus } from '../types';
import { recommendSkill } from './router';

// Captured from discovery.md produced by `oat project promote` after p06-t10.
// scanArtifacts parses this provider-independent production artifact shape.
const PROMOTED_DISCOVERY_FRONTMATTER = `---
oat_status: in_progress
oat_ready_for: oat-project-quick-start
oat_last_updated: 2026-09-05
---

# Discovery: demo

## Initial Request

Ship safe behavior.
`;

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
    activeReviewArtifacts: [],
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

/**
 * One ordinary phase (complete) plus one two-task revision phase. Pass
 * `completedRevisionTasks: 1` for an incomplete revision phase, `2` for a
 * complete one.
 */
function makeRevisionProgress({
  completedRevisionTasks,
  currentTaskId = 'prev1-t02',
}: {
  completedRevisionTasks: number;
  currentTaskId?: string | null;
}): ProjectState['progress'] {
  return {
    total: 3,
    completed: 1 + completedRevisionTasks,
    currentTaskId,
    phases: [
      {
        phaseId: 'p01',
        name: 'Foundation',
        total: 1,
        completed: 1,
        isRevision: false,
      },
      {
        phaseId: 'p-rev1',
        name: 'Revision 1',
        total: 2,
        completed: completedRevisionTasks,
        isRevision: true,
      },
    ],
  };
}

/**
 * Snapshot fixture — provenance.
 *
 * Captured on 2026-09-07 by running the committed `parseTaskProgress` over the
 * read-only archive `.oat/projects/archived/workflow-friction/` (`plan.md` +
 * `implementation.md`) at commit 9d004921263a639888192c8ab005733fcb762903, and
 * cross-checked against a raw `grep` of that plan's headings. Phase names are
 * copied verbatim from `plan.md:88,431,629,700,838,910,1172`.
 *
 * Measured result: 15/25 completed. The five ordinary phases parse normally
 * because that project writes `### Task pNN-tNN:` + `**Status:** completed` for
 * them (`p05` reads 1/2 because its `p05-t01` body still says `pending`). Its
 * two revision phases read 0/8 and 0/1 because `implementation.md` has no
 * `## Revision Phase …` section for them at all: their completion is recorded
 * only in the Progress Overview table (`implementation.md:35-36`,
 * `| Revision Phase p-rev1: … | complete | 8 | 8/8 |`) and their task ids only
 * as review-log bullets (`implementation.md:660-667`). That table asserts
 * 25/25. This is precisely the shape the external plan's "Out of scope" names:
 * completion marked "on the heading line or only in the Progress Overview
 * table".
 *
 * This is a snapshot, not a reader: the archive is evidence and is never read
 * or mutated by this test.
 */
function makeWorkflowFrictionProgress(): ProjectState['progress'] {
  return {
    total: 25,
    completed: 15,
    currentTaskId: null,
    phases: [
      {
        phaseId: 'p01',
        name: 'Config System Extension',
        total: 4,
        completed: 4,
        isRevision: false,
      },
      {
        phaseId: 'p02',
        name: 'Skill Integration — oat-project-implement',
        total: 5,
        completed: 5,
        isRevision: false,
      },
      {
        phaseId: 'p03',
        name: 'Skill Integration — oat-project-complete and oat-project-pr-final',
        total: 2,
        completed: 2,
        isRevision: false,
      },
      {
        phaseId: 'p04',
        name: 'Skill Integration — Review Skills',
        total: 3,
        completed: 3,
        isRevision: false,
      },
      {
        phaseId: 'p05',
        name: 'Documentation and Bundled Docs Update',
        total: 2,
        completed: 1,
        isRevision: false,
      },
      {
        phaseId: 'p-rev1',
        name: 'Final Review Fixes',
        total: 8,
        completed: 0,
        isRevision: true,
      },
      {
        phaseId: 'p-rev2',
        name: 'Re-Review Polish',
        total: 1,
        completed: 0,
        isRevision: true,
      },
    ],
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

  it('routes a promoted quick project artifact to quick-start', async () => {
    const projectRoot = await mkdtemp(join(tmpdir(), 'oat-router-promoted-'));
    try {
      await writeFile(
        join(projectRoot, 'discovery.md'),
        PROMOTED_DISCOVERY_FRONTMATTER,
        'utf8',
      );
      const state = makeState({
        phaseStatus: 'complete',
        workflowMode: 'quick',
        artifacts: await scanArtifacts(projectRoot),
      });

      expect(recommendSkill(state).skill).toBe('oat-project-quick-start');
    } finally {
      await rm(projectRoot, { recursive: true, force: true });
    }
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

  it('routes lite projects across planning boundary tiers', () => {
    const litePlan = (
      boundaryTier: 1 | 2 | 3,
      status: 'in_progress' | 'complete',
    ) =>
      makeState({
        phase: 'plan',
        phaseStatus: status,
        workflowMode: 'lite',
        artifacts: makeArtifacts({
          type: 'plan',
          boundaryTier,
          status,
        }),
      });

    expect(recommendSkill(litePlan(3, 'in_progress')).skill).toBe(
      'oat-project-lite',
    );
    expect(recommendSkill(litePlan(2, 'in_progress')).skill).toBe(
      'oat-project-implement',
    );
    expect(recommendSkill(litePlan(1, 'complete')).skill).toBe(
      'oat-project-implement',
    );
  });

  it('uses the current-phase default for a lite discovery state', () => {
    const state = makeState({
      phase: 'discovery',
      workflowMode: 'lite',
      artifacts: makeArtifacts({
        type: 'discovery',
        boundaryTier: 3,
      }),
    });

    expect(recommendSkill(state).skill).toBe('oat-project-discover');
  });

  it('routes lite implementation in progress to implement', () => {
    const state = makeState({
      phase: 'implement',
      phaseStatus: 'in_progress',
      workflowMode: 'lite',
    });

    expect(recommendSkill(state).skill).toBe('oat-project-implement');
  });

  it('uses oat-project-implement regardless of execution mode', () => {
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

    expect(recommendSkill(state).skill).toBe('oat-project-implement');
  });

  it('returns an inert recommendation for completed decomposition coordination parents', () => {
    const state = makeState({
      phase: 'decomposition',
      phaseStatus: 'complete',
      workflowMode: 'quick',
    });

    expect(recommendSkill(state)).toMatchObject({
      skill: 'none',
      reason:
        'Coordination decomposition is complete; continue one of the child implementation projects',
    });
  });

  it('routes in-progress decomposition coordination parents back to split', () => {
    const state = makeState({
      phase: 'decomposition',
      phaseStatus: 'in_progress',
      workflowMode: 'quick',
    });

    expect(recommendSkill(state)).toMatchObject({
      skill: 'oat-project-split',
    });
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
        currentTaskId: 'prev1-t02',
        phases: [
          {
            phaseId: 'p-rev1',
            name: 'Revision 1',
            total: 2,
            completed: 1,
            isRevision: true,
          },
        ],
      },
    });

    expect(recommendSkill(state).skill).toBe('oat-project-implement');
  });

  it('does not resume implement for a complete-lifecycle project even when revision counts are incomplete or stale', () => {
    const state = makeState({
      phase: 'implement',
      phaseStatus: 'complete',
      lifecycle: 'complete',
      progress: makeRevisionProgress({ completedRevisionTasks: 1 }),
    });

    // The pre-guard router returned implement here purely on the stale
    // revision count. Lifecycle, not the count, decides terminality.
    expect(recommendSkill(state).skill).not.toBe('oat-project-implement');
    expect(recommendSkill(state).skill).toBe('oat-project-review-provide');
  });

  it('still resumes implement when revision tasks remain and lifecycle is active', () => {
    const state = makeState({
      phase: 'implement',
      phaseStatus: 'complete',
      lifecycle: 'active',
      progress: makeRevisionProgress({ completedRevisionTasks: 1 }),
    });

    expect(recommendSkill(state).skill).toBe('oat-project-implement');
    expect(recommendSkill(state).reason).toBe(
      'Revision work remains incomplete',
    );
  });

  it('keeps revision routing for an active project with a null current task and complete or pr_open phase status', () => {
    for (const phaseStatus of ['complete', 'pr_open'] as const) {
      const state = makeState({
        phase: 'implement',
        phaseStatus,
        lifecycle: 'active',
        progress: makeRevisionProgress({
          completedRevisionTasks: 1,
          currentTaskId: null,
        }),
      });

      expect(recommendSkill(state).skill).toBe('oat-project-implement');
    }
  });

  it('still resumes implement for a paused project with incomplete revision work', () => {
    // The terminal rule is exactly `lifecycle === 'complete'`, not "not
    // active". Without this case a guard written as `lifecycle === 'active'`
    // would pass every other test while silently stranding paused projects.
    const state = makeState({
      phase: 'implement',
      phaseStatus: 'complete',
      lifecycle: 'paused',
      progress: makeRevisionProgress({ completedRevisionTasks: 1 }),
    });

    expect(recommendSkill(state).skill).toBe('oat-project-implement');
  });

  // Lite controls. The terminal guard is keyed on lifecycle alone and carries
  // no workflow-mode branch, so lite must behave exactly like every other mode.
  it('keeps revision routing for an active lite project with incomplete revision work', () => {
    const state = makeState({
      phase: 'implement',
      phaseStatus: 'complete',
      workflowMode: 'lite',
      lifecycle: 'active',
      progress: makeRevisionProgress({ completedRevisionTasks: 1 }),
    });

    expect(recommendSkill(state).skill).toBe('oat-project-implement');
  });

  it('does not resume implement for a complete-lifecycle lite project with incomplete revision work', () => {
    const state = makeState({
      phase: 'implement',
      phaseStatus: 'complete',
      workflowMode: 'lite',
      lifecycle: 'complete',
      progress: makeRevisionProgress({ completedRevisionTasks: 1 }),
    });

    expect(recommendSkill(state).skill).not.toBe('oat-project-implement');
    expect(recommendSkill(state).skill).toBe('oat-project-review-provide');
  });

  it('does not resume implement for an active lite project whose revision phases are all complete', () => {
    const state = makeState({
      phase: 'implement',
      phaseStatus: 'complete',
      workflowMode: 'lite',
      lifecycle: 'active',
      progress: makeRevisionProgress({ completedRevisionTasks: 2 }),
    });

    expect(recommendSkill(state).skill).not.toBe('oat-project-implement');
    expect(recommendSkill(state).skill).toBe('oat-project-review-provide');
  });

  // Documents — does not endorse — the interaction between this phase's heading
  // widening and the completion-format class the external plan puts out of
  // scope. Widening made `## Revision Phase p-revN:` plan headings parse for the
  // first time, so their tasks now surface in `progress.phases`. When a project
  // records those tasks' completion somewhere other than `### Task <id>:` +
  // `**Status:** completed` in `implementation.md` — for the captured archive,
  // only in the Progress Overview table and in review-log bullets — no
  // task-level record exists to read, so the phase counts 0/N however finished
  // it actually is.
  //
  // For a `complete` lifecycle the terminal guard absorbs this, which is why
  // the real archive is unaffected. For an `active` or `paused` lifecycle the
  // project routes back to `oat-project-implement` even though its own record
  // says the revision work is done. Recognizing phase-level completion records
  // is deliberately NOT done here — it is the out-of-scope completion-format
  // class, tracked as `BL-260907-recognize-phase-level`. This test pins today's
  // behavior so that follow-up changes it deliberately rather than by accident.
  it('routes an active-lifecycle project to implement when its revision phases are recorded only at phase level (documented BL-260907-recognize-phase-level interaction)', () => {
    const progress = makeWorkflowFrictionProgress();

    // Counterfactual lifecycle: the captured project is `complete`; this is the
    // active-lifecycle case the widening newly reaches.
    const active = makeState({
      phase: 'implement',
      phaseStatus: 'pr_open',
      workflowMode: 'quick',
      lifecycle: 'active',
      progress,
    });

    expect(recommendSkill(active)).toMatchObject({
      skill: 'oat-project-implement',
      reason: 'Revision work remains incomplete',
    });

    // The captured project's real lifecycle. The terminal guard absorbs the
    // same progress snapshot, so the archive itself never regressed.
    const complete = makeState({
      phase: 'implement',
      phaseStatus: 'pr_open',
      workflowMode: 'quick',
      lifecycle: 'complete',
      progress,
    });

    expect(recommendSkill(complete).skill).not.toBe('oat-project-implement');
  });

  it('routes active top-level review artifacts to review-receive', () => {
    const state = makeState({
      phase: 'implement',
      phaseStatus: 'complete',
      reviews: [
        makeReview({
          scope: 'p01',
          status: 'received',
          artifact: 'reviews/p01-review.md',
        }),
      ],
      activeReviewArtifacts: [
        {
          path: 'reviews/p01-review.md',
          archived: false,
          actionable: true,
        },
      ],
    });

    expect(recommendSkill(state).skill).toBe('oat-project-review-receive');
  });

  it('ignores consumed top-level artifacts when a received event remains actionable', () => {
    const state = makeState({
      phase: 'implement',
      phaseStatus: 'complete',
      reviews: [
        makeReview({
          scope: 'p01',
          status: 'received',
          artifact: 'reviews/p01-review.md',
        }),
        makeReview({
          scope: 'p02',
          status: 'fixes_added',
          artifact: 'reviews/p02-review.md',
        }),
        makeReview({
          scope: 'final',
          status: 'passed',
          artifact: 'reviews/final-review.md',
        }),
      ],
      activeReviewArtifacts: [
        {
          path: 'reviews/p01-review.md',
          archived: false,
          actionable: true,
        },
        {
          path: 'reviews/p02-review.md',
          archived: false,
          actionable: true,
        },
        {
          path: 'reviews/final-review.md',
          archived: false,
          actionable: true,
        },
      ],
    });

    expect(recommendSkill(state).skill).toBe('oat-project-review-receive');
  });

  it('does not route consumed top-level artifacts to review-receive', () => {
    const state = makeState({
      phase: 'implement',
      phaseStatus: 'complete',
      reviews: [
        makeReview({
          scope: 'p02',
          status: 'fixes_added',
          artifact: 'reviews/p02-review.md',
        }),
        makeReview({
          scope: 'final',
          status: 'passed',
          artifact: 'reviews/final-review.md',
        }),
      ],
      activeReviewArtifacts: [
        {
          path: 'reviews/p02-review.md',
          archived: false,
          actionable: true,
        },
        {
          path: 'reviews/final-review.md',
          archived: false,
          actionable: true,
        },
      ],
    });

    expect(recommendSkill(state).skill).toBe('oat-project-summary');
  });

  it('does not route stale review rows to review-receive without an active artifact', () => {
    const state = makeState({
      phase: 'implement',
      phaseStatus: 'pr_open',
      reviews: [
        makeReview({
          scope: 'p01',
          status: 'received',
          artifact: 'reviews/archived/p01-review.md',
        }),
        makeReview({ scope: 'final', status: 'passed' }),
      ],
      artifacts: makeArtifacts({
        type: 'summary',
        exists: true,
        status: 'complete',
        boundaryTier: 1,
      }),
      activeReviewArtifacts: [],
    });

    expect(recommendSkill(state).skill).toBe('oat-project-complete');
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

  it('uses the latest appended final review event for routing', () => {
    const state = makeState({
      phase: 'implement',
      phaseStatus: 'complete',
      reviews: [
        makeReview({
          scope: 'final',
          status: 'passed',
          artifact: 'reviews/final-root-review.md',
        }),
        makeReview({
          scope: 'final',
          status: 'received',
          artifact: 'reviews/final-gate-review.md',
        }),
      ],
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

  it('routes non-passed final review statuses back to review-provide when no active review exists', () => {
    const state = makeState({
      phase: 'implement',
      phaseStatus: 'complete',
      reviews: [makeReview({ scope: 'final', status: 'fixes_added' })],
    });

    expect(recommendSkill(state)).toMatchObject({
      skill: 'oat-project-review-provide',
      context: 'code final',
    });
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

  it('routes lite passed final review without summary directly to pr-final', () => {
    const state = makeState({
      phase: 'implement',
      phaseStatus: 'complete',
      workflowMode: 'lite',
      reviews: [makeReview({ scope: 'final', status: 'passed' })],
      artifacts: makeArtifacts({
        type: 'summary',
        exists: false,
        boundaryTier: 3,
      }),
    });

    expect(recommendSkill(state)).toMatchObject({
      skill: 'oat-project-pr-final',
      reason:
        'Final review passed; lite mode synthesizes the PR from plan and implementation',
    });
  });

  it('keeps quick passed final review without summary on the summary route', () => {
    const state = makeState({
      phase: 'implement',
      phaseStatus: 'complete',
      workflowMode: 'quick',
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
