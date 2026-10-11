import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';
import YAML from 'yaml';

import { getProjectState, listProjects } from '../project';
import { scanArtifacts } from '../state/artifacts';
import {
  type ArtifactStatus,
  type ProjectState,
  type ReviewStatus,
  WORKFLOW_MODES,
} from '../types';
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

  // The quick routes agree with the oat-project-next and oat-project-progress
  // skill tables: discovery tier 3 continues discovery, tiers 2 and 1 go to
  // quick-start, never through the spec-driven planning skill.
  it('routes quick discovery complete to quick-start', () => {
    const state = makeState({
      phaseStatus: 'complete',
      workflowMode: 'quick',
      artifacts: makeArtifacts({
        type: 'discovery',
        boundaryTier: 1,
        status: 'complete',
      }),
    });

    expect(recommendSkill(state).skill).toBe('oat-project-quick-start');
  });

  it('routes quick discovery tier 2 to quick-start', () => {
    const state = makeState({
      workflowMode: 'quick',
      artifacts: makeArtifacts({
        type: 'discovery',
        boundaryTier: 2,
        isTemplate: false,
      }),
    });

    expect(recommendSkill(state).skill).toBe('oat-project-quick-start');
  });

  it('keeps quick discovery tier 3 in discovery', () => {
    const state = makeState({
      workflowMode: 'quick',
      artifacts: makeArtifacts({
        type: 'discovery',
        boundaryTier: 3,
      }),
    });

    expect(recommendSkill(state).skill).toBe('oat-project-discover');
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

// The public recommender must agree with the four lifecycle skills about the
// same `plan.md`. These cases run the real artifact reader over real files so
// the predicate, the boundary tier, and the route are exercised together.
describe('recommendSkill quick plan readiness gate', () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(
      tempDirs.map(async (dir) => rm(dir, { recursive: true, force: true })),
    );
    tempDirs.length = 0;
  });

  const READY_FRONTMATTER = `---
oat_status: complete
oat_ready_for: oat-project-implement
oat_phase_status: complete
oat_template: false
---
`;

  const PRE_REVIEW_FRONTMATTER = `---
oat_status: in_progress
oat_ready_for: null
oat_phase_status: in_progress
oat_template: false
---
`;

  const SUBSTANTIVE_PHASE = `
## Phase 1: Foundation

### Task p01-t01: Add the readiness predicate

**Status:** pending
`;

  const PLACEHOLDER_PHASE = `
## Phase 1: Foundation

### Task p01-t01: {Task title}
`;

  const RECORDED_DISPOSITION = `
## Reviews

| Scope | Type     | Status | Date       | Artifact |
| ----- | -------- | ------ | ---------- | -------- |
| plan  | artifact | passed | 2026-09-07 | -        |
`;

  const PENDING_DISPOSITION = `
## Reviews

| Scope | Type     | Status  | Date | Artifact |
| ----- | -------- | ------- | ---- | -------- |
| plan  | artifact | pending | -    | -        |
`;

  async function planState(
    plan: string | null,
    overrides: Partial<Omit<ProjectState, 'recommendation'>> = {},
  ): Promise<Omit<ProjectState, 'recommendation'>> {
    const projectRoot = await mkdtemp(join(tmpdir(), 'oat-router-quick-plan-'));
    tempDirs.push(projectRoot);
    if (plan != null) {
      await writeFile(join(projectRoot, 'plan.md'), plan, 'utf8');
    }

    return makeState({
      phase: 'plan',
      phaseStatus: 'complete',
      workflowMode: 'quick',
      artifacts: await scanArtifacts(projectRoot),
      ...overrides,
    });
  }

  it('routes a substantive but pre-review quick plan to quick-start instead of implement', async () => {
    const state = await planState(
      `${PRE_REVIEW_FRONTMATTER}\n# Plan: demo\n${SUBSTANTIVE_PHASE}${PENDING_DISPOSITION}`,
      { phaseStatus: 'in_progress' },
    );

    // Boundary tier 2 is what previously mapped straight to implementation.
    expect(
      state.artifacts.find((artifact) => artifact.type === 'plan'),
    ).toMatchObject({ boundaryTier: 2 });
    expect(recommendSkill(state)).toEqual({
      skill: 'oat-project-quick-start',
      reason:
        'Quick plan is not implementation-ready (frontmatter is not the recorded plan-complete state); resume the quick workflow in place',
    });
  });

  it('routes a ready-looking quick plan with no review disposition to quick-start', async () => {
    const state = await planState(
      `${READY_FRONTMATTER}\n# Plan: demo\n${SUBSTANTIVE_PHASE}${PENDING_DISPOSITION}`,
    );

    expect(recommendSkill(state)).toEqual({
      skill: 'oat-project-quick-start',
      reason:
        'Quick plan is not implementation-ready (the Reviews section records no plan review disposition); resume the quick workflow in place',
    });
  });

  it('routes a ready-looking quick plan with no substantive task to quick-start', async () => {
    const state = await planState(
      `${READY_FRONTMATTER}\n# Plan: demo\n${PLACEHOLDER_PHASE}${RECORDED_DISPOSITION}`,
    );

    expect(recommendSkill(state)).toEqual({
      skill: 'oat-project-quick-start',
      reason:
        'Quick plan is not implementation-ready (no phase carries a substantive task); resume the quick workflow in place',
    });
  });

  it('routes a ready-looking promoted brief with pending phases to quick-start', async () => {
    const state = await planState(
      `${READY_FRONTMATTER.replace(
        'oat_template: false\n',
        "oat_template: false\noat_promoted_from: brief\noat_promotion_pending_phases: ['p03']\n",
      )}\n# Plan: demo\n${SUBSTANTIVE_PHASE}${RECORDED_DISPOSITION}`,
    );

    expect(recommendSkill(state)).toEqual({
      skill: 'oat-project-quick-start',
      reason:
        'Quick plan is not implementation-ready (promoted brief phases still need executable tasks); resume the quick workflow in place',
    });
  });

  it('routes a tier-1b quick plan with no oat_ready_for to quick-start', async () => {
    const state = await planState(
      `---
oat_status: complete
oat_template: false
---
\n# Plan: demo\n${SUBSTANTIVE_PHASE}${RECORDED_DISPOSITION}`,
    );

    expect(recommendSkill(state).skill).toBe('oat-project-quick-start');
  });

  it('routes a quick project whose plan.md is missing to quick-start', async () => {
    const state = await planState(null);

    expect(recommendSkill(state)).toEqual({
      skill: 'oat-project-quick-start',
      reason:
        'Quick plan is not implementation-ready (plan.md is missing); resume the quick workflow in place',
    });
  });

  it('keeps the implement route for a quick plan that satisfies every clause', async () => {
    const ready = `${READY_FRONTMATTER}\n# Plan: demo\n${SUBSTANTIVE_PHASE}${RECORDED_DISPOSITION}`;

    const complete = await planState(ready);
    const inProgress = await planState(ready, { phaseStatus: 'in_progress' });

    expect(recommendSkill(complete)).toEqual({
      skill: 'oat-project-implement',
      reason:
        'Current artifact is complete and explicitly points to the next skill',
    });
    expect(recommendSkill(inProgress).skill).toBe('oat-project-implement');
  });

  it('accepts the explicit skip disposition as the recorded outcome', async () => {
    const state = await planState(
      `${READY_FRONTMATTER}\n# Plan: demo\n${SUBSTANTIVE_PHASE}
## Reviews

Plan artifact review: skipped (workflow.autoArtifactReview.plan=false)
`,
    );

    expect(recommendSkill(state).skill).toBe('oat-project-implement');
  });

  it('leaves lite and spec-driven plan routes untouched by the quick predicate', async () => {
    const notReady = `${PRE_REVIEW_FRONTMATTER}\n# Plan: demo\n${SUBSTANTIVE_PHASE}${PENDING_DISPOSITION}`;

    const lite = await planState(notReady, {
      workflowMode: 'lite',
      phaseStatus: 'in_progress',
    });
    const specDriven = await planState(notReady, {
      workflowMode: 'spec-driven',
      phaseStatus: 'in_progress',
    });
    const importMode = await planState(notReady, {
      workflowMode: 'import',
      phaseStatus: 'in_progress',
    });

    expect(recommendSkill(lite)).toEqual({
      skill: 'oat-project-implement',
      reason: 'Route lite plan work based on boundary tier',
    });
    expect(recommendSkill(specDriven)).toEqual({
      skill: 'oat-project-implement',
      reason: 'Route spec-driven plan work based on boundary tier',
    });
    expect(recommendSkill(importMode)).toEqual({
      skill: 'oat-project-implement',
      reason: 'Route import plan work based on boundary tier',
    });
  });

  it('leaves quick implementation untouched and sends discovery to quick-start', async () => {
    const notReady = `${PRE_REVIEW_FRONTMATTER}\n# Plan: demo\n${SUBSTANTIVE_PHASE}${PENDING_DISPOSITION}`;

    const implementing = await planState(notReady, {
      phase: 'implement',
      phaseStatus: 'in_progress',
    });
    const discovering = await planState(notReady, {
      phase: 'discovery',
      phaseStatus: 'complete',
      artifacts: makeArtifacts({
        type: 'discovery',
        boundaryTier: 1,
        status: 'complete',
      }),
    });

    expect(recommendSkill(implementing).skill).toBe('oat-project-implement');
    expect(recommendSkill(discovering).skill).toBe('oat-project-quick-start');
  });
});

// Brief mode owns its planning phase through the brief entry skill. The
// router performs exact `phase:status:tier` lookups, so every planning tier is
// pinned explicitly here.
describe('recommendSkill brief routes', () => {
  const briefPlan = (
    boundaryTier: 1 | 2 | 3,
    status: 'in_progress' | 'complete',
    overrides: Partial<Omit<ProjectState, 'recommendation'>> = {},
  ) =>
    makeState({
      phase: 'plan',
      phaseStatus: status,
      workflowMode: 'brief',
      artifacts: makeArtifacts({
        type: 'plan',
        boundaryTier,
        status,
      }),
      ...overrides,
    });

  it('keeps brief planning at tier 3 and tier 2 with the brief entry skill', () => {
    expect(recommendSkill(briefPlan(3, 'in_progress')).skill).toBe(
      'oat-project-brief',
    );
    expect(recommendSkill(briefPlan(2, 'in_progress')).skill).toBe(
      'oat-project-brief',
    );
  });

  it('keeps an untiered in-progress brief plan with the brief entry skill', () => {
    expect(recommendSkill(briefPlan(1, 'in_progress')).skill).toBe(
      'oat-project-brief',
    );
  });

  it('routes a complete brief plan to implement', () => {
    expect(recommendSkill(briefPlan(1, 'complete')).skill).toBe(
      'oat-project-implement',
    );
  });

  it('routes brief implementation in progress to implement', () => {
    const state = makeState({
      phase: 'implement',
      phaseStatus: 'in_progress',
      workflowMode: 'brief',
    });

    expect(recommendSkill(state).skill).toBe('oat-project-implement');
  });

  it('sends a pending brief plan HiLL checkpoint to the brief entry skill', () => {
    const state = briefPlan(1, 'complete', {
      hillCheckpoints: ['plan'],
      hillCompleted: [],
    });

    expect(recommendSkill(state)).toMatchObject({
      skill: 'oat-project-brief',
      reason: 'HiLL gate is pending for the current phase',
    });
  });

  it('keeps the spec-driven planning skill for a pending spec-driven plan HiLL checkpoint', () => {
    const state = makeState({
      phase: 'plan',
      phaseStatus: 'complete',
      hillCheckpoints: ['plan'],
      hillCompleted: [],
      artifacts: makeArtifacts({
        type: 'plan',
        boundaryTier: 1,
        status: 'complete',
      }),
    });

    expect(recommendSkill(state).skill).toBe('oat-project-plan');
  });

  it('never routes a non-spec-driven tier-3 plan to the spec-driven planning skill', () => {
    const routed = WORKFLOW_MODES.map((workflowMode) => ({
      workflowMode,
      skill: recommendSkill(
        makeState({
          phase: 'plan',
          phaseStatus: 'in_progress',
          workflowMode,
          artifacts: makeArtifacts({ type: 'plan', boundaryTier: 3 }),
        }),
      ).skill,
    }));

    for (const { workflowMode, skill } of routed) {
      if (workflowMode === 'spec-driven') {
        expect(skill).toBe('oat-project-plan');
      } else {
        expect(skill, workflowMode).not.toBe('oat-project-plan');
      }
    }
    expect(routed.find((r) => r.workflowMode === 'brief')?.skill).toBe(
      'oat-project-brief',
    );
  });
});

/**
 * Phase-unit progress as `parseTaskProgress(..., { phaseUnits: true })`
 * produces it: each phase is one unit, accepted units read 1/1, and a
 * provisional phase reads 0/1 regardless of any journal marker. An explicit
 * `completed` overrides the derived count, so a test can build a shape the
 * parser does not emit (for example a provisional unit reading 1/1).
 */
function makeBriefUnitProgress(
  units: Array<{
    phaseId: string;
    accepted?: boolean;
    provisional?: boolean;
    completed?: number;
  }>,
): ProjectState['progress'] {
  const phases = units.map(
    ({ phaseId, accepted = false, provisional, completed }) => ({
      phaseId,
      name: `Phase ${phaseId}`,
      total: 1,
      completed: completed ?? (accepted && !provisional ? 1 : 0),
      isRevision: false,
      unit: 'phase' as const,
      ...(provisional ? { provisional: true } : {}),
    }),
  );

  return {
    total: phases.length,
    completed: phases.filter((phase) => phase.completed === 1).length,
    currentTaskId: null,
    phases,
  };
}

describe('recommendSkill brief-unit guard', () => {
  const passedFinalReview = [makeReview({ scope: 'final', status: 'passed' })];
  const missingSummary = makeArtifacts({
    type: 'summary',
    exists: false,
    boundaryTier: 3,
  });

  it('resumes implement when a brief reaches implement:complete with an incomplete phase-unit', () => {
    const state = makeState({
      phase: 'implement',
      phaseStatus: 'complete',
      workflowMode: 'brief',
      progress: makeBriefUnitProgress([
        { phaseId: 'p01', accepted: true },
        { phaseId: 'p02' },
      ]),
      reviews: passedFinalReview,
      artifacts: missingSummary,
    });

    expect(recommendSkill(state)).toMatchObject({
      skill: 'oat-project-implement',
      reason: 'Incomplete phase-units remain in the active scope',
    });
  });

  it('resumes implement for a brief at pr_open with an incomplete phase-unit', () => {
    const state = makeState({
      phase: 'implement',
      phaseStatus: 'pr_open',
      workflowMode: 'brief',
      progress: makeBriefUnitProgress([
        { phaseId: 'p01', accepted: true },
        { phaseId: 'p02' },
      ]),
      reviews: passedFinalReview,
    });

    expect(recommendSkill(state)).toMatchObject({
      skill: 'oat-project-implement',
      reason: 'Incomplete phase-units remain in the active scope',
    });
  });

  it('treats a provisional phase-unit as incomplete', () => {
    // The provisional unit reads 1/1 here, so only the guard's `provisional`
    // clause (not `completed < total`) can keep it incomplete.
    const state = makeState({
      phase: 'implement',
      phaseStatus: 'complete',
      workflowMode: 'brief',
      progress: makeBriefUnitProgress([
        { phaseId: 'p01', accepted: true },
        { phaseId: 'p02', completed: 1, provisional: true },
      ]),
      reviews: passedFinalReview,
      artifacts: missingSummary,
    });

    expect(recommendSkill(state)).toMatchObject({
      skill: 'oat-project-implement',
      reason: 'Incomplete phase-units remain in the active scope',
    });
  });

  it('does not reopen implementation for a complete-lifecycle brief', () => {
    const state = makeState({
      phase: 'implement',
      phaseStatus: 'pr_open',
      workflowMode: 'brief',
      lifecycle: 'complete',
      progress: makeBriefUnitProgress([
        { phaseId: 'p01', accepted: true },
        { phaseId: 'p02' },
      ]),
      reviews: passedFinalReview,
      artifacts: makeArtifacts({
        type: 'summary',
        exists: true,
        status: 'complete',
        boundaryTier: 1,
      }),
    });

    expect(recommendSkill(state).skill).toBe('oat-project-complete');
  });

  it('keeps a planning brief with an incomplete phase on the brief entry skill', () => {
    const state = makeState({
      phase: 'plan',
      phaseStatus: 'in_progress',
      workflowMode: 'brief',
      progress: makeBriefUnitProgress([{ phaseId: 'p01' }, { phaseId: 'p02' }]),
      artifacts: makeArtifacts({ type: 'plan', boundaryTier: 3 }),
    });

    expect(recommendSkill(state).skill).toBe('oat-project-brief');
  });

  it('routes a brief with every phase-unit accepted and no summary to summary', () => {
    const state = makeState({
      phase: 'implement',
      phaseStatus: 'complete',
      workflowMode: 'brief',
      progress: makeBriefUnitProgress([
        { phaseId: 'p01', accepted: true },
        { phaseId: 'p02', accepted: true },
      ]),
      reviews: passedFinalReview,
      artifacts: missingSummary,
    });

    expect(recommendSkill(state).skill).toBe('oat-project-summary');
  });

  it('leaves quick post-implementation routing unchanged by incomplete ordinary phases', () => {
    const state = makeState({
      phase: 'implement',
      phaseStatus: 'complete',
      workflowMode: 'quick',
      progress: {
        total: 2,
        completed: 1,
        currentTaskId: null,
        phases: [
          {
            phaseId: 'p01',
            name: 'Phase p01',
            total: 2,
            completed: 1,
            isRevision: false,
          },
        ],
      },
      reviews: passedFinalReview,
      artifacts: missingSummary,
    });

    expect(recommendSkill(state).skill).toBe('oat-project-summary');
  });
});

// Goal routing is exercised through the real project readers: each fixture
// writes `state.md`, a goal brief with a canonical `## Milestones` table, the
// journal and optional review files, then reads them with `getProjectState`,
// whose recommendation is `recommendSkill` over the parsed state.
describe('recommendSkill goal milestones (real readers)', () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(
      tempDirs.map((dir) => rm(dir, { recursive: true, force: true })),
    );
    tempDirs.length = 0;
  });

  const SHA = (character: string) => character.repeat(40);
  const DECIDED = '2026-10-11T00:00:00Z';

  const planCarrier = (scope: string[], overrides = {}) => ({
    status: 'allowed',
    resolution: 'configured',
    disposition: 'passed',
    config_fingerprint: 'cfg',
    reviewed_head: SHA('a'),
    subject: { kind: 'plan', scope, ref: 'plan.md' },
    decided_at: DECIDED,
    freshness: 'fresh',
    freshness_reason: null,
    ...overrides,
  });
  const exitCarrier = (scope: string[], overrides = {}) => ({
    status: 'allowed',
    resolution: 'no_gate',
    disposition: 'no_gate',
    config_fingerprint: null,
    reviewed_head: null,
    subject: { kind: 'code', scope },
    decided_at: DECIDED,
    freshness: 'fresh',
    freshness_reason: null,
    ...overrides,
  });
  const delivery = (overrides: Record<string, unknown> = {}) => ({
    delivery_id: 'd01',
    milestone: 'm01',
    scope: ['p01', 'p02'],
    endpoint: 'merged',
    kind: 'pr',
    status: 'at_endpoint',
    superseded_by: null,
    corrects_delivery_id: null,
    covers_scope_of: null,
    members: [
      {
        url: 'https://example.com/pull/1',
        base: SHA('b'),
        reviewed_head: SHA('c'),
        observed_head: SHA('c'),
        observed_base: SHA('b'),
        status: 'merged',
      },
    ],
    integrated_review: {
      artifact: 'reviews/archived/review-m01.md',
      scope: ['p01', 'p02'],
      bound_revisions: [],
      disposition: 'passed',
    },
    ...overrides,
  });

  interface GoalFixture {
    phase?: string;
    phaseStatus?: string;
    state?: Record<string, unknown>;
    milestones?: string;
    phases?: { id: string; provisional?: boolean }[];
    journal?: Record<string, string>;
    currentTaskId?: string;
    reviewRows?: string[];
    reviewFiles?: Record<string, string>;
    planStatus?: 'complete' | 'in_progress';
    parallelGroups?: string[][];
    summary?: boolean;
  }

  const DEFAULT_PHASES = ['p01', 'p02', 'p03', 'p04'].map((id) => ({ id }));

  /** m01 delivered and at its endpoint; m02 is the active milestone. */
  function m02Implementing(overrides: GoalFixture = {}): GoalFixture {
    return {
      ...overrides,
      state: {
        oat_milestone: 'm02',
        oat_milestone_status: 'implementing',
        oat_goal_status: 'active',
        oat_deliveries: [delivery()],
        oat_milestone_gates: {
          m01: {
            plan: planCarrier(['p01', 'p02']),
            exit: exitCarrier(['p01', 'p02']),
          },
          m02: { plan: planCarrier(['p03', 'p04']) },
        },
        ...overrides.state,
      },
      journal: {
        p01: 'completed',
        p02: 'completed',
        p03: 'in_progress',
        ...overrides.journal,
      },
    };
  }

  async function writeGoalProject(
    projectDir: string,
    fixture: GoalFixture,
  ): Promise<void> {
    await mkdir(join(projectDir, 'reviews'), { recursive: true });
    const phases = fixture.phases ?? DEFAULT_PHASES;
    const stateYaml = YAML.stringify({
      oat_current_task: null,
      oat_blockers: [],
      oat_hill_checkpoints: [],
      oat_hill_completed: [],
      oat_phase: fixture.phase ?? 'implement',
      oat_phase_status: fixture.phaseStatus ?? 'in_progress',
      oat_execution_mode: 'single-thread',
      oat_lifecycle: 'active',
      oat_workflow_mode: 'goal',
      ...fixture.state,
    });
    const planStatus = fixture.planStatus ?? 'complete';
    const plan = [
      '---',
      `oat_status: ${planStatus}`,
      `oat_ready_for: ${planStatus === 'complete' ? 'oat-project-implement' : 'null'}`,
      'oat_template: false',
      'oat_plan_source: goal',
      `oat_plan_parallel_groups: ${JSON.stringify(fixture.parallelGroups ?? [])}`,
      '---',
      '',
      '# Project Brief: goal',
      '',
      '## Outcomes',
      '',
      '1. **Goal works** — Evidence: tests',
      '',
      '## Milestones',
      '',
      '| Milestone | Phases |',
      '| --------- | ------ |',
      fixture.milestones ?? '| m01 | p01, p02 |\n| m02 | p03, p04 |',
      '',
      ...phases.flatMap((phase) => [
        `## Phase ${phase.id}: Phase ${phase.id}`,
        '',
        '**Intent:** Do it.',
        '**Exit evidence:** Done.',
        `**Provisional:** ${phase.provisional ? 'yes' : 'no'}`,
        '',
      ]),
      '## Reviews',
      '',
      '| Scope | Type | Status | Date | Artifact |',
      '| ----- | ---- | ------ | ---- | -------- |',
      ...(fixture.reviewRows ?? []),
      '',
    ].join('\n');
    const journal = [
      '---',
      `oat_current_task_id: ${fixture.currentTaskId ?? 'null'}`,
      '---',
      '',
      ...phases.flatMap((phase) => {
        const marker = fixture.journal?.[phase.id] ?? 'pending';
        const [status, target] = marker.split(':');
        return [
          `## Phase ${phase.id}: Phase ${phase.id}`,
          '',
          `**Status:** ${status}`,
          ...(target ? [`**Extracted to:** ${target}`] : []),
          '',
        ];
      }),
    ].join('\n');
    await Promise.all([
      writeFile(join(projectDir, 'state.md'), `---\n${stateYaml}---\n`),
      writeFile(join(projectDir, 'plan.md'), plan),
      writeFile(join(projectDir, 'implementation.md'), journal),
      ...(fixture.summary
        ? [
            writeFile(
              join(projectDir, 'summary.md'),
              '---\noat_status: complete\noat_ready_for: null\n---\n\n# Summary\n',
            ),
          ]
        : []),
      ...Object.entries(fixture.reviewFiles ?? {}).map(([path, content]) =>
        writeFile(join(projectDir, path), content),
      ),
    ]);
  }

  async function newProjectDir(): Promise<string> {
    const repoRoot = await mkdtemp(join(tmpdir(), 'oat-goal-router-'));
    tempDirs.push(repoRoot);
    await mkdir(join(repoRoot, '.oat'), { recursive: true });
    const projectDir = join(repoRoot, '.oat', 'projects', 'shared', 'goal');
    await mkdir(projectDir, { recursive: true });
    return projectDir;
  }

  async function readGoal(fixture: GoalFixture) {
    const projectDir = await newProjectDir();
    await writeGoalProject(projectDir, fixture);
    const state = await getProjectState(projectDir);
    // The reader's recommendation is the router over the parsed state.
    expect(state.recommendation).toEqual(recommendSkill(state));
    return state;
  }

  async function route(fixture: GoalFixture) {
    return (await readGoal(fixture)).recommendation;
  }

  describe('planning and status table', () => {
    it('routes goal planning to the goal entry skill before milestone state exists', async () => {
      const recommendation = await route({
        phase: 'plan',
        planStatus: 'in_progress',
        state: {},
        journal: {},
      });
      expect(recommendation.skill).toBe('oat-project-goal');
      expect(
        recommendSkill(
          makeState({
            phase: 'plan',
            phaseStatus: 'in_progress',
            workflowMode: 'goal',
            artifacts: makeArtifacts({ type: 'plan', boundaryTier: 3 }),
          }),
        ).skill,
      ).toBe('oat-project-goal');
    });

    it('scopes implementation to the active milestone ordered phase set', async () => {
      expect(await route(m02Implementing())).toEqual({
        skill: 'oat-project-implement',
        reason: 'Incomplete phase-units remain in the active milestone',
        context: 'scope m02: p03, p04',
      });
    });

    it('runs milestone closeout once every active-milestone unit is accepted', async () => {
      expect(
        await route(
          m02Implementing({ journal: { p03: 'completed', p04: 'completed' } }),
        ),
      ).toEqual({
        skill: 'oat-project-implement',
        reason:
          'Every phase-unit in the active milestone is accepted; implement milestone closeout runs the exit gate',
        context: 'closeout m02: p03, p04',
      });
    });

    it('routes reviewing by the missing evidence (A1)', async () => {
      const reviewing = (state: Record<string, unknown>, rows: string[] = []) =>
        m02Implementing({
          journal: { p03: 'completed', p04: 'completed' },
          reviewRows: rows,
          state: { oat_milestone_status: 'reviewing', ...state },
        });
      const gates = (exit: unknown) => ({
        oat_milestone_gates: {
          m01: { plan: planCarrier(['p01', 'p02']) },
          m02: { plan: planCarrier(['p03', 'p04']), exit },
        },
      });

      expect(await route(reviewing({}))).toMatchObject({
        skill: 'oat-project-implement',
        context: 'closeout m02: p03, p04',
      });
      const fresh = gates(exitCarrier(['p03', 'p04']));
      expect(await route(reviewing(fresh))).toMatchObject({
        skill: 'oat-project-review-provide',
        context: 'code m02: p03, p04',
      });
      expect(
        await route(
          reviewing(fresh, [
            '| m02 | code | received | 2026-10-11 | reviews/archived/review-m02.md |',
          ]),
        ),
      ).toMatchObject({
        skill: 'oat-project-review-receive',
        context: 'receive reviews/archived/review-m02.md',
      });
      expect(
        await route(
          reviewing(fresh, [
            '| m02 | code | passed | 2026-10-11 | reviews/archived/review-m02.md |',
          ]),
        ),
      ).toMatchObject({ skill: 'oat-project-review-receive' });
    });

    it('delivers only with a passed review and a fresh allowed exit carrier', async () => {
      const delivering = (status: string) =>
        m02Implementing({
          journal: { p03: 'completed', p04: 'completed' },
          reviewRows: [
            `| m02 | code | ${status} | 2026-10-11 | reviews/archived/review-m02.md |`,
          ],
          state: {
            oat_milestone_status: 'delivering',
            oat_milestone_gates: {
              m02: {
                plan: planCarrier(['p03', 'p04']),
                exit: exitCarrier(['p03', 'p04']),
              },
            },
          },
        });
      expect(await route(delivering('passed'))).toEqual({
        skill: 'oat-project-pr-progress',
        reason:
          'Integrated review passed and the exit carrier is allowed and fresh',
        context: 'deliver m02',
      });
      // fixes_completed is not a passed review.
      expect(await route(delivering('fixes_completed'))).toMatchObject({
        skill: 'oat-project-review-provide',
        context: 'code m02: p03, p04',
      });
    });

    it('surfaces invalid active membership to the goal skill (B1)', async () => {
      for (const milestones of [
        '| m01 p01, p02 |\n| m02 | p03, p04 |',
        '| m01 | p01, p02 |\n| m02 | p03, p04, p09 |',
        '| m01 | p01, p02, p03 |\n| m02 | p03, p04 |',
        '| m01 | p01, p02, p03, p04 |',
      ]) {
        const recommendation = await route(m02Implementing({ milestones }));
        expect(recommendation.skill, milestones).toBe('oat-project-goal');
        expect(recommendation.reason).toMatch(
          /^Active milestone membership invalid: /,
        );
      }
    });

    it('routes the same goal state identically through listProjects', async () => {
      const projectDir = await newProjectDir();
      await writeGoalProject(projectDir, m02Implementing());
      const [summary] = await listProjects(join(projectDir, '..'));
      expect(summary?.recommendation).toMatchObject({
        skill: 'oat-project-implement',
        reason: 'Incomplete phase-units remain in the active milestone',
      });
    });
  });

  describe('goal-activation-prerequisites', () => {
    /** m01 at its endpoint; m02 aligning with an approved, bound plan carrier. */
    function aligningM02(overrides: GoalFixture = {}): GoalFixture {
      const base = m02Implementing({ journal: { p03: 'pending' } });
      return {
        ...base,
        ...overrides,
        state: {
          ...base.state,
          oat_milestone_status: 'aligning',
          ...overrides.state,
        },
      };
    }
    const gatesWith = (plan: unknown) => ({
      oat_milestone_gates: {
        m01: {
          plan: planCarrier(['p01', 'p02']),
          exit: exitCarrier(['p01', 'p02']),
        },
        m02: { plan },
      },
    });

    it('accepts an approved concrete next dispatch with later provisional phases', async () => {
      expect(
        await route(
          aligningM02({
            phases: [
              { id: 'p01' },
              { id: 'p02' },
              { id: 'p03' },
              { id: 'p04', provisional: true },
            ],
          }),
        ),
      ).toEqual({
        skill: 'oat-project-goal',
        reason: 'Milestone m02 is ready to activate',
        context: 'align m02',
      });
    });

    it.each([
      [
        'missing approval',
        { planStatus: 'in_progress' as const },
        'the brief is not approved',
      ],
      [
        'a disallowed plan carrier',
        {
          state: gatesWith(planCarrier(['p03', 'p04'], { status: 'blocked' })),
        },
        'the m02 plan carrier is blocked',
      ],
      [
        'a stale plan carrier',
        {
          state: gatesWith(
            planCarrier(['p03', 'p04'], {
              freshness: 'stale',
              freshness_reason: 'gate configuration changed',
            }),
          ),
        },
        'the m02 plan carrier is stale (gate configuration changed)',
      ],
      [
        'a plan binding to different membership',
        { state: gatesWith(planCarrier(['p03'])) },
        'the m02 plan carrier binds [p03]',
      ],
      [
        'a provisional next phase',
        {
          phases: [
            { id: 'p01' },
            { id: 'p02' },
            { id: 'p03', provisional: true },
            { id: 'p04' },
          ],
        },
        'the next phase p03 is provisional',
      ],
      [
        'a provisional next-group member',
        {
          parallelGroups: [['p03', 'p04']],
          phases: [
            { id: 'p01' },
            { id: 'p02' },
            { id: 'p03' },
            { id: 'p04', provisional: true },
          ],
        },
        'next dispatched group member p04 is provisional',
      ],
    ])('refuses activation with %s', async (_label, overrides, reason) => {
      const recommendation = await route(aligningM02(overrides));
      expect(recommendation.skill).toBe('oat-project-goal');
      expect(recommendation.context).toBe('align m02');
      expect(recommendation.reason).toContain(
        `Milestone m02 cannot activate yet: ${reason}`,
      );
    });

    it('refuses implementation of a milestone whose plan carrier is not allowed', async () => {
      expect(
        await route(
          m02Implementing({
            state: gatesWith(
              planCarrier(['p03', 'p04'], { status: 'pending' }),
            ),
          }),
        ),
      ).toMatchObject({
        skill: 'oat-project-goal',
        reason:
          'Milestone m02 is implementing without its activation prerequisites: the m02 plan carrier is pending',
      });
    });

    it('refuses activation after the goal is declared met', async () => {
      const recommendation = await route(
        aligningM02({
          journal: { p03: 'completed', p04: 'completed' },
          state: { oat_goal_status: 'declared_met' },
        }),
      );
      expect(recommendation.reason).not.toContain('ready to activate');
      expect(recommendation.context).not.toBe('align m02');
    });
  });

  describe('delivered versus at_endpoint (B4)', () => {
    const delivered = (endpoint: string, memberStatus: string) =>
      m02Implementing({
        journal: { p03: 'pending' },
        state: {
          oat_milestone: 'm01',
          oat_milestone_status: 'delivered',
          oat_deliveries: [
            delivery({
              endpoint,
              status: 'open',
              members: [
                {
                  url: 'https://example.com/pull/1',
                  base: SHA('b'),
                  reviewed_head: SHA('c'),
                  observed_head: SHA('c'),
                  observed_base: SHA('b'),
                  status: memberStatus,
                },
              ],
            }),
          ],
        },
      });

    it('lets an open merged-endpoint delivery plan the next milestone but not activate it', async () => {
      const recommendation = await route(delivered('merged', 'open'));
      expect(recommendation).toMatchObject({
        skill: 'oat-project-goal',
        context: 'realign m01',
      });
      expect(recommendation.reason).toContain(
        'activation waits for d01 to reach its agreed endpoint (merged)',
      );

      // Drafting m02 during `delivered` is permitted; activating it is not.
      const drafted = delivered('merged', 'open');
      const aligning = await route({
        ...drafted,
        state: {
          ...drafted.state,
          oat_milestone: 'm02',
          oat_milestone_status: 'aligning',
        },
      });
      expect(aligning.reason).toBe(
        'Milestone m02 cannot activate yet: delivery d01 has not reached its agreed endpoint (merged)',
      );
    });

    it('lets an open endpoint satisfied by the same observation permit activation', async () => {
      const recommendation = await route(delivered('open', 'open'));
      expect(recommendation.reason).toBe(
        'Delivery d01 reached its agreed endpoint; re-align and activate the next milestone',
      );

      const drafted = delivered('open', 'open');
      expect(
        (
          await route({
            ...drafted,
            state: {
              ...drafted.state,
              oat_milestone: 'm02',
              oat_milestone_status: 'aligning',
            },
          })
        ).reason,
      ).toBe('Milestone m02 is ready to activate');
    });
  });

  describe('terminal declaration (A3)', () => {
    const SNAPSHOT_COMPLETE = {
      status: 'complete',
      source: 'configured',
      final_phase: 'p04',
      pre_approval: ['review', 'summary', 'pr'],
      pre_approval_completed: ['review', 'summary', 'pr'],
      approval: 'not_required',
      approval_source: null,
      post_approval: [],
      post_approval_completed: [],
      failure: null,
    };
    const phaseEntry = (disposition: string, extra = {}) => ({
      disposition,
      reason: null,
      scope_decision_ref: null,
      ...extra,
    });
    const audit = (phases: Record<string, unknown>, outcomes?: unknown) => ({
      disposition: 'met_with_deferrals',
      decided_at: DECIDED,
      declaration_ref: 'project-log.md#declared',
      brief_identity: `plan.md@${SHA('f')}`,
      phases,
      outcomes: outcomes ?? {
        1: {
          disposition: 'met',
          evidence_or_ref: 'tests',
          text: '**Goal works** — Evidence: tests',
        },
      },
    });
    const ALL_PHASES = {
      p01: phaseEntry('accepted'),
      p02: phaseEntry('accepted'),
      p03: phaseEntry('accepted'),
      p04: phaseEntry('deferred', {
        reason: 'Out of budget',
        scope_decision_ref: 'decisions/DR-1',
      }),
    };
    const declared = (auditValue: unknown) =>
      m02Implementing({
        phaseStatus: 'pr_open',
        summary: true,
        journal: { p03: 'completed', p04: 'in_progress' },
        reviewRows: [
          '| final | code | passed | 2026-10-11 | reviews/archived/final.md |',
        ],
        state: {
          oat_milestone_status: 'delivered',
          oat_goal_status: 'declared_met',
          oat_goal_outcome_audit: auditValue,
          oat_post_implement_sequence: SNAPSHOT_COMPLETE,
        },
      });

    it('routes a declared-met goal with a completed snapshot but an omitted phase to audit repair', async () => {
      const { p03: _omitted, ...withoutP03 } = ALL_PHASES;
      const recommendation = await route(declared(audit(withoutP03)));
      expect(recommendation).toEqual({
        skill: 'oat-project-goal',
        reason:
          'Goal is declared met but its outcome audit is invalid (audit-phase-omitted); oat-project-goal repairs the declaration and audit',
        context: 'audit',
      });
    });

    it('routes an omitted outcome and a missing audit to audit repair', async () => {
      expect((await route(declared(audit(ALL_PHASES, {})))).reason).toContain(
        '(audit-outcome-omitted)',
      );
      expect((await route(declared(null))).reason).toContain('(audit-missing)');
    });

    it('lets an audited deferral leave terminal scope without changing phase-unit counts', async () => {
      const state = await readGoal(declared(audit(ALL_PHASES)));
      // Placement control: the incomplete deferred p04 does not reopen
      // implementation; terminal closeout continues to completion.
      expect(state.recommendation).toEqual({
        skill: 'oat-project-complete',
        reason: 'PR is open and the project is ready for completion',
      });
      expect(state.progress).toMatchObject({ total: 4, completed: 3 });
    });
  });

  describe('goal-recovery-evidence and older-delivery isolation (A1)', () => {
    const RECOVERY_SCOPE = ['p01', 'p02', 'p-rev1'];
    const PHASES_WITH_REVISION = [...DEFAULT_PHASES, { id: 'p-rev1' }];
    const MEMBERSHIP = '| m01 | p01, p02, p-rev1 |\n| m02 | p03, p04 |';
    /** The fresh recovery review; d01's registry still records the original. */
    const ARTIFACT = 'reviews/archived/review-m01-d01.md';
    const ORIGINAL = 'reviews/archived/review-m01.md';

    /** m02 active and implementing; d01 (m01) under recovery. */
    function recovering(
      stage: string,
      options: {
        exit?: unknown;
        rows?: string[];
        artifact?: string | null;
        deliveryReview?: string;
        journal?: Record<string, string>;
      } = {},
    ): GoalFixture {
      const base = m02Implementing();
      return {
        ...base,
        phases: PHASES_WITH_REVISION,
        milestones: MEMBERSHIP,
        currentTaskId: 'p03',
        reviewRows: options.rows ?? [],
        journal: { ...base.journal, 'p-rev1': 'completed', ...options.journal },
        state: {
          ...base.state,
          oat_deliveries: [
            delivery({
              status: 'open',
              integrated_review: {
                artifact: ORIGINAL,
                scope: ['p01', 'p02'],
                bound_revisions: [],
                disposition: options.deliveryReview ?? 'passed',
              },
            }),
          ],
          oat_goal_recovery: {
            milestone: 'm01',
            delivery_id: 'd01',
            phase_ids: RECOVERY_SCOPE,
            stage,
            review_artifact:
              options.artifact === undefined ? ARTIFACT : options.artifact,
          },
          oat_milestone_gates: {
            m01: {
              plan: planCarrier(['p01', 'p02']),
              ...(options.exit === undefined ? {} : { exit: options.exit }),
            },
            m02: { plan: planCarrier(['p03', 'p04']) },
          },
        },
      };
    }
    const row = (status: string, artifact = ARTIFACT) =>
      `| m01 | code | ${status} | 2026-10-11 | ${artifact} |`;
    const FRESH_EXIT = exitCarrier(RECOVERY_SCOPE);

    async function expectActiveMilestoneUntouched(fixture: GoalFixture) {
      const state = await readGoal(fixture);
      expect(state).toMatchObject({
        milestone: 'm02',
        milestoneStatus: 'implementing',
        progress: { currentTaskId: 'p03' },
      });
      expect(state.recommendation.context ?? '').not.toContain('m02');
      return state.recommendation;
    }

    it('A1: a received review with a missing exit carrier is neither delivery-ready nor sent to review-provide', async () => {
      const recommendation = await expectActiveMilestoneUntouched(
        recovering('delivering', { rows: [row('received')] }),
      );
      expect(recommendation).toEqual({
        skill: 'oat-project-implement',
        reason:
          "Milestone exit carrier for m01 is missing; implement's scoped closeout reruns the exit gate",
        context: 'closeout m01/d01: p01, p02, p-rev1',
      });
    });

    it('A1: a clean receive of the exact fresh review advances only d01', async () => {
      const recommendation = await expectActiveMilestoneUntouched(
        recovering('delivering', { exit: FRESH_EXIT, rows: [row('passed')] }),
      );
      expect(recommendation).toEqual({
        skill: 'oat-project-pr-progress',
        reason:
          'Integrated review passed and the exit carrier is allowed and fresh',
        context: 'deliver m01/d01',
      });
    });

    it('refuses fixes_completed as a passed review', async () => {
      expect(
        await route(
          recovering('delivering', {
            exit: FRESH_EXIT,
            rows: [row('fixes_completed')],
          }),
        ),
      ).toMatchObject({
        skill: 'oat-project-review-provide',
        context: 'code m01/d01: p01, p02, p-rev1',
      });
    });

    it('refuses a passed review of a different artifact (wrong-artifact receive)', async () => {
      for (const other of ['reviews/archived/review-m02.md', ORIGINAL]) {
        expect(
          await route(
            recovering('delivering', {
              exit: FRESH_EXIT,
              rows: [row('passed', other)],
            }),
          ),
          other,
        ).toMatchObject({
          skill: 'oat-project-review-provide',
          context: 'code m01/d01: p01, p02, p-rev1',
        });
      }
    });

    it('refuses the registry review that predates the appended correction phase', async () => {
      expect(
        await route(
          recovering('reviewing', {
            exit: FRESH_EXIT,
            artifact: null,
            rows: [row('passed', ORIGINAL)],
          }),
        ),
      ).toMatchObject({
        skill: 'oat-project-review-provide',
        context: 'code m01/d01: p01, p02, p-rev1',
      });
    });

    it.each([
      ['blocked', exitCarrier(RECOVERY_SCOPE, { status: 'blocked' })],
      [
        'stale',
        exitCarrier(RECOVERY_SCOPE, {
          freshness: 'stale',
          freshness_reason: 'member base changed',
        }),
      ],
    ])('refuses %s exit evidence', async (_label, exit) => {
      expect(
        await route(recovering('delivering', { exit, rows: [row('passed')] })),
      ).toMatchObject({
        skill: 'oat-project-implement',
        context: 'closeout m01/d01: p01, p02, p-rev1',
      });
    });

    it('refuses evidence reused after queued fixes', async () => {
      // Queued fixes on the reviewed artifact route back to implementation.
      expect(
        await route(
          recovering('delivering', {
            exit: FRESH_EXIT,
            rows: [row('fixes_added')],
          }),
        ),
      ).toMatchObject({
        skill: 'oat-project-implement',
        context: 'scope m01/d01: p01, p02, p-rev1',
      });
      // A carrier bound before the correction phase was added no longer
      // covers the recovery scope.
      expect(
        await route(
          recovering('delivering', {
            exit: exitCarrier(['p01', 'p02']),
            rows: [row('passed')],
          }),
        ),
      ).toMatchObject({
        skill: 'oat-project-implement',
        reason:
          "Milestone exit carrier for m01 is not bound to p-rev1; implement's scoped closeout reruns the exit gate",
      });
    });

    it('preserves the active pointer while an interrupted recovery resumes', async () => {
      expect(
        await expectActiveMilestoneUntouched(
          recovering('implementing', { journal: { 'p-rev1': 'in_progress' } }),
        ),
      ).toEqual({
        skill: 'oat-project-implement',
        reason: 'Goal recovery for m01/d01 is implementing queued fixes',
        context: 'scope m01/d01: p01, p02, p-rev1',
      });
    });

    it('routes stale d01 evidence found at pr-progress entry to its owner without touching m02', async () => {
      expect(
        await expectActiveMilestoneUntouched(
          recovering('reviewing', {
            exit: FRESH_EXIT,
            artifact: null,
            deliveryReview: 'stale',
          }),
        ),
      ).toMatchObject({
        skill: 'oat-project-review-provide',
        reason: 'The integrated delivery review is stale',
        context: 'code m01/d01: p01, p02, p-rev1',
      });
    });

    it('routes inline m01 feedback landed as p-rev1 through its recovery, with active-milestone and brief controls', async () => {
      const revised = await readGoal(
        recovering('implementing', {
          artifact: null,
          journal: { 'p-rev1': 'pending' },
        }),
      );
      expect(revised.milestoneMembership).toMatchObject({
        errors: [],
        milestones: [
          { milestoneId: 'm01', phaseIds: ['p01', 'p02', 'p-rev1'] },
          { milestoneId: 'm02', phaseIds: ['p03', 'p04'] },
        ],
      });
      expect(revised.recommendation.context).toBe(
        'scope m01/d01: p01, p02, p-rev1',
      );

      // Control: the same correction on the active milestone uses the
      // ordinary pointer and scope, with no recovery record.
      const active = m02Implementing({
        phases: PHASES_WITH_REVISION,
        milestones: '| m01 | p01, p02 |\n| m02 | p03, p04, p-rev1 |',
        journal: { 'p-rev1': 'pending' },
      });
      expect(await route(active)).toMatchObject({
        skill: 'oat-project-implement',
        context: 'scope m02: p03, p04, p-rev1',
      });

      // Control: an ordinary brief keeps the landed brief-unit guard.
      const brief = await newProjectDir();
      await writeGoalProject(brief, {
        ...active,
        state: { oat_workflow_mode: 'brief' },
      });
      expect((await getProjectState(brief)).recommendation).toEqual({
        skill: 'oat-project-implement',
        reason: 'Incomplete phase-units remain in the active scope',
      });
    });

    it('lets received feedback precede the recovery record', async () => {
      const artifact = 'reviews/review-m01-d01.md';
      expect(
        await route({
          ...recovering('delivering', {
            exit: FRESH_EXIT,
            artifact,
            rows: [row('received', artifact)],
          }),
          reviewFiles: {
            [artifact]:
              '---\noat_review_scope: m01\noat_review_type: code\n---\n',
          },
        }),
      ).toEqual({
        skill: 'oat-project-review-receive',
        reason: 'Unprocessed review feedback exists',
      });
    });
  });

  describe('placement', () => {
    it('does not route a delivered m01 with drafted m02 phases to implement', async () => {
      const drafted = m02Implementing({
        phases: [
          { id: 'p01' },
          { id: 'p02' },
          { id: 'p03', provisional: true },
          { id: 'p04', provisional: true },
        ],
        journal: { p03: 'pending' },
        state: { oat_milestone: 'm01', oat_milestone_status: 'delivered' },
      });
      const state = await readGoal(drafted);
      expect(state.recommendation).toMatchObject({
        skill: 'oat-project-goal',
        context: 'realign m01',
      });
      // The phases are genuinely incomplete: only placement keeps the
      // whole-plan brief-unit guard from claiming them.
      expect(state.progress).toMatchObject({ total: 4, completed: 2 });
    });
  });

  describe('recovery stage walk', () => {
    const SCOPE = ['p01', 'p02', 'p-rev1'];
    const ARTIFACT = 'reviews/archived/review-m01-d01-r2.md';

    /** Each owner's clean stage write, applied to the fixture. */
    type StageWrite = (fixture: GoalFixture) => GoalFixture;
    const withState =
      (patch: (state: Record<string, unknown>) => Record<string, unknown>) =>
      (fixture: GoalFixture): GoalFixture => ({
        ...fixture,
        state: patch(fixture.state ?? {}),
      });
    const recoveryPatch = (patch: Record<string, unknown>) =>
      withState((state) => ({
        ...state,
        oat_goal_recovery: {
          ...(state.oat_goal_recovery as Record<string, unknown>),
          ...patch,
        },
      }));

    const OWNER_WRITES: Record<string, StageWrite> = {
      // implement: fixes accepted → exit_gate.
      implementing: (fixture) =>
        recoveryPatch({ stage: 'exit_gate' })({
          ...fixture,
          journal: { ...fixture.journal, 'p-rev1': 'completed' },
          reviewRows: [
            `| m01 | code | fixes_completed | 2026-10-11 | reviews/archived/review-m01.md |`,
          ],
        }),
      // implement scoped closeout: carrier allowed and fresh → reviewing.
      exit_gate: (fixture) =>
        withState((state) => ({
          ...state,
          oat_milestone_gates: {
            ...(state.oat_milestone_gates as Record<string, unknown>),
            m01: {
              plan: planCarrier(['p01', 'p02']),
              exit: exitCarrier(SCOPE),
            },
          },
        }))(recoveryPatch({ stage: 'reviewing' })(fixture)),
      // review-provide: artifact recorded `received` → receiving.
      reviewing: (fixture) =>
        recoveryPatch({ stage: 'receiving', review_artifact: ARTIFACT })({
          ...fixture,
          reviewRows: [
            ...(fixture.reviewRows ?? []),
            `| m01 | code | received | 2026-10-11 | ${ARTIFACT} |`,
          ],
        }),
      // review-receive: clean receive → delivering.
      receiving: (fixture) =>
        recoveryPatch({ stage: 'delivering' })({
          ...fixture,
          reviewRows: [
            ...(fixture.reviewRows ?? []).slice(0, -1),
            `| m01 | code | passed | 2026-10-11 | ${ARTIFACT} |`,
          ],
        }),
      // pr-progress: refresh of the targeted delivery complete → cleared.
      delivering: withState((state) => ({
        ...state,
        oat_goal_recovery: null,
      })),
    };

    async function walk(writes: Record<string, StageWrite>) {
      const projectDir = await newProjectDir();
      let fixture: GoalFixture = m02Implementing({
        phases: [...DEFAULT_PHASES, { id: 'p-rev1' }],
        milestones: '| m01 | p01, p02, p-rev1 |\n| m02 | p03, p04 |',
        journal: { 'p-rev1': 'in_progress' },
        reviewRows: [
          '| m01 | code | fixes_added | 2026-10-11 | reviews/archived/review-m01.md |',
        ],
        state: {
          oat_goal_recovery: {
            milestone: 'm01',
            delivery_id: 'd01',
            phase_ids: SCOPE,
            stage: 'implementing',
            review_artifact: null,
          },
        },
      });
      const routes: string[] = [];
      const seen = new Set<string>();
      for (let step = 0; step < 8; step += 1) {
        await writeGoalProject(projectDir, fixture);
        const state = await getProjectState(projectDir);
        const stage = state.goalRecovery?.stage ?? 'cleared';
        const routeKey = `${state.recommendation.skill} ${state.recommendation.context ?? ''}`;
        const visit = `${stage} → ${routeKey}`;
        if (seen.has(visit)) {
          return { routes, repeated: visit };
        }
        seen.add(visit);
        routes.push(visit);
        if (stage === 'cleared') {
          return { routes, repeated: null };
        }
        fixture = writes[stage]!(fixture);
      }
      return { routes, repeated: 'no terminal state' };
    }

    it('routes each stage to its owner in turn and reaches no owner twice without a stage change', async () => {
      expect(await walk(OWNER_WRITES)).toEqual({
        routes: [
          'implementing → oat-project-implement scope m01/d01: p01, p02, p-rev1',
          'exit_gate → oat-project-implement closeout m01/d01: p01, p02, p-rev1',
          'reviewing → oat-project-review-provide code m01/d01: p01, p02, p-rev1',
          `receiving → oat-project-review-receive receive ${ARTIFACT}`,
          'delivering → oat-project-pr-progress deliver m01/d01',
          'cleared → oat-project-implement scope m02: p03, p04',
        ],
        repeated: null,
      });
    });

    it('repeats the route when one stage write is neutralized', async () => {
      const { routes, repeated } = await walk({
        ...OWNER_WRITES,
        // implement accepts the fixes but never advances the stage.
        implementing: (fixture) => ({
          ...OWNER_WRITES.implementing!(fixture),
          state: fixture.state,
        }),
      });
      expect(routes).toEqual([
        'implementing → oat-project-implement scope m01/d01: p01, p02, p-rev1',
      ]);
      expect(repeated).toBe(
        'implementing → oat-project-implement scope m01/d01: p01, p02, p-rev1',
      );
    });
  });
});
