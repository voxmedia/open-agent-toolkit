/**
 * Project-rail integration test (p04-t02).
 *
 * Exercises the helper composition the `oat-project-review-provide-remote`
 * skill relies on, end-to-end through the pure-logic layer:
 *
 * - Project resolution from a synthetic PR-diff file list
 *   (two-level `.oat/projects` scope/project `state.md` scan + ambiguity
 *   error).
 * - The re-review narrowing filter scoped to project, scope, and lineage
 *   (rejects tuple mismatches and legacy records without lineage).
 * - Round-trip of the posted-review body with project markers
 *   (`oat_project`, `oat_review_scope`) through builder → parser.
 *
 * No GitHub or git side effects: the narrowing guard runs against a stub
 * `GitInvoker`, and project resolution runs against a synthetic file list.
 */

import { describe, expect, it } from 'vitest';

import { buildReviewBody } from '../../body-builder';
import { parseMarkerBlock } from '../../marker-parser';
import {
  pickNarrowingTarget,
  priorReviewFromMarker,
  type GitInvoker,
  type PriorReview,
} from '../../narrowing';
import { resolveProject } from '../../project-resolver';
import {
  AcceptedReviewBlockedError,
  AcceptedReviewOutputError,
  dispatchStructuredReview,
  type Dispatcher,
  type ReviewDispatchContext,
} from '../../reviewer-dispatch';

const PROJECT = '.oat/projects/foo/bar';
const SCOPE = 'p02';
const HEAD_SHA = 'a1b2c3d4e5f60718293a4b5c6d7e8f9012345678';
const PRIOR_SHA = '1111111111111111111111111111111111111111';

/** A git stub where both existence + ancestry checks pass. */
const reachableGit: GitInvoker = {
  async objectExists() {
    return true;
  },
  async isAncestor() {
    return true;
  },
  async fetchRef() {
    return true;
  },
  async changedFiles() {
    return ['src/app.ts'];
  },
};

function priorReview(overrides: Partial<PriorReview> = {}): PriorReview {
  return {
    headSha: PRIOR_SHA,
    scope: SCOPE,
    project: PROJECT,
    invocation: 'manual',
    lineage: { kind: 'lifecycle' },
    submittedAt: '2026-05-29T10:00:00Z',
    ...overrides,
  };
}

describe('project-rail: project resolution from PR diff', () => {
  it('resolves a single project from a state.md mod in the diff', () => {
    const diffFiles = [
      'src/app.ts',
      '.oat/projects/foo/bar/state.md',
      '.oat/projects/foo/bar/plan.md',
    ];
    const result = resolveProject(diffFiles);
    expect(result.kind).toBe('resolved');
    if (result.kind === 'resolved') {
      expect(result.projectPath).toBe(PROJECT);
    }
  });

  it('errors with a candidate list when multiple projects are touched', () => {
    const diffFiles = [
      '.oat/projects/foo/bar/state.md',
      '.oat/projects/baz/qux/state.md',
    ];
    const result = resolveProject(diffFiles);
    expect(result.kind).toBe('ambiguous');
    if (result.kind === 'ambiguous') {
      expect(result.candidates).toEqual([
        '.oat/projects/baz/qux',
        '.oat/projects/foo/bar',
      ]);
    }
  });

  it('returns not-found when no state.md is in the diff', () => {
    const result = resolveProject(['src/app.ts', 'README.md']);
    expect(result.kind).toBe('not-found');
  });
});

describe('project-rail: re-review narrowing scoped to project, scope, and lineage', () => {
  it('narrows against a matching same-project/same-scope prior review', async () => {
    const result = await pickNarrowingTarget({
      reviews: [priorReview()],
      rail: 'project',
      project: PROJECT,
      scope: SCOPE,
      lineage: { kind: 'lifecycle' },
      headSha: HEAD_SHA,
      git: reachableGit,
    });
    expect(result.kind).toBe('narrow-range');
    if (result.kind === 'narrow-range') {
      expect(result.priorSha).toBe(PRIOR_SHA);
      expect(result.headSha).toBe(HEAD_SHA);
    }
  });

  it('rejects a same-project/different-scope prior review (no narrowing)', async () => {
    const result = await pickNarrowingTarget({
      reviews: [priorReview({ scope: 'p03' })],
      rail: 'project',
      project: PROJECT,
      scope: SCOPE,
      lineage: { kind: 'lifecycle' },
      headSha: HEAD_SHA,
      git: reachableGit,
    });
    expect(result.kind).toBe('full-scope-fallback');
    if (result.kind === 'full-scope-fallback') {
      expect(result.reason).toBe('no-prior-review');
    }
  });

  it('rejects a different-project/same-scope prior review (no narrowing)', async () => {
    const result = await pickNarrowingTarget({
      reviews: [priorReview({ project: '.oat/projects/other/proj' })],
      rail: 'project',
      project: PROJECT,
      scope: SCOPE,
      lineage: { kind: 'lifecycle' },
      headSha: HEAD_SHA,
      git: reachableGit,
    });
    expect(result.kind).toBe('full-scope-fallback');
    if (result.kind === 'full-scope-fallback') {
      expect(result.reason).toBe('no-prior-review');
    }
  });

  it('ignores an ad-hoc prior review (no project key) on the project rail', async () => {
    const adHocReview = priorReview();
    delete adHocReview.project;
    adHocReview.scope = 'ad-hoc';
    const result = await pickNarrowingTarget({
      reviews: [adHocReview],
      rail: 'project',
      project: PROJECT,
      scope: SCOPE,
      lineage: { kind: 'lifecycle' },
      headSha: HEAD_SHA,
      git: reachableGit,
    });
    expect(result.kind).toBe('full-scope-fallback');
  });

  it('fails open for a legacy prior review without lineage', async () => {
    const result = await pickNarrowingTarget({
      reviews: [priorReview({ lineage: undefined })],
      rail: 'project',
      project: PROJECT,
      scope: SCOPE,
      lineage: { kind: 'lifecycle' },
      headSha: HEAD_SHA,
      git: reachableGit,
    });

    expect(result).toMatchObject({
      kind: 'full-scope-fallback',
      reason: 'no-prior-review',
    });
  });
});

describe('project-rail: posted-body round-trip with project markers', () => {
  it('round-trips oat_project + oat_review_scope through builder → parser', () => {
    const { body, verdict } = buildReviewBody({
      headSha: HEAD_SHA,
      scope: SCOPE,
      project: PROJECT,
      invocation: 'manual',
      summary: 'Reviewed the p02 phase against design.md.',
      findings: [{ severity: 'important' }, { severity: 'minor' }],
      verificationCommands: ['pnpm test'],
    });

    // Marker block is first; project rail carries both project + scope keys.
    expect(body.startsWith('<!-- oat-review-metadata')).toBe(true);
    const markers = parseMarkerBlock(body);
    expect(markers).not.toBeNull();
    expect(markers?.oat_provide_remote).toBe(true);
    expect(markers?.oat_review_head_sha).toBe(HEAD_SHA);
    expect(markers?.oat_review_scope).toBe(SCOPE);
    expect(markers?.oat_project).toBe(PROJECT);
    expect(markers?.oat_review_invocation).toBe('manual');

    // An important finding drives REQUEST_CHANGES; the minor drives the Notes nudge.
    expect(verdict).toBe('REQUEST_CHANGES');
    expect(body).toContain('## Notes');
  });

  it('keeps the project markers distinct from the ad-hoc rail (key presence)', () => {
    const projectBody = buildReviewBody({
      headSha: HEAD_SHA,
      scope: SCOPE,
      project: PROJECT,
      invocation: 'manual',
      summary: 'Project rail.',
      findings: [],
    }).body;
    const adHocBody = buildReviewBody({
      headSha: HEAD_SHA,
      scope: 'ad-hoc',
      invocation: 'manual',
      summary: 'Ad-hoc rail.',
      findings: [],
    }).body;

    expect(parseMarkerBlock(projectBody)?.oat_project).toBe(PROJECT);
    // Ad-hoc body omits the project key entirely (the rail discriminator).
    expect(parseMarkerBlock(adHocBody)?.oat_project).toBeUndefined();
  });

  it('round-trips a same-target gate marker into an eligible narrowing candidate', async () => {
    const body = buildReviewBody({
      headSha: PRIOR_SHA,
      scope: SCOPE,
      project: PROJECT,
      invocation: 'gate',
      gateTarget: 'cursor-fable-5-xhigh',
      summary: 'Gate review.',
      findings: [],
    }).body;
    const marker = parseMarkerBlock(body);
    expect(marker).not.toBeNull();
    if (marker === null) {
      throw new Error('built gate marker must parse');
    }

    const result = await pickNarrowingTarget({
      reviews: [priorReviewFromMarker(marker, '2026-05-29T10:00:00Z')],
      rail: 'project',
      project: PROJECT,
      scope: SCOPE,
      lineage: { kind: 'gate', target: 'cursor-fable-5-xhigh' },
      headSha: HEAD_SHA,
      git: reachableGit,
    });

    expect(result.kind).toBe('narrow-range');
  });

  it.each([
    {
      name: 'a different gate target',
      lineage: { kind: 'gate' as const, target: 'cursor-fable-5-high' },
    },
    {
      name: 'lifecycle lineage',
      lineage: { kind: 'lifecycle' as const },
    },
  ])('rejects a gate marker for $name', async ({ lineage }) => {
    const body = buildReviewBody({
      headSha: PRIOR_SHA,
      scope: SCOPE,
      project: PROJECT,
      invocation: 'gate',
      gateTarget: 'cursor-fable-5-xhigh',
      summary: 'Gate review.',
      findings: [],
    }).body;
    const marker = parseMarkerBlock(body);
    if (marker === null) {
      throw new Error('built gate marker must parse');
    }

    const result = await pickNarrowingTarget({
      reviews: [priorReviewFromMarker(marker, '2026-05-29T10:00:00Z')],
      rail: 'project',
      project: PROJECT,
      scope: SCOPE,
      lineage,
      headSha: HEAD_SHA,
      git: reachableGit,
    });

    expect(result).toMatchObject({
      kind: 'full-scope-fallback',
      reason: 'no-prior-review',
    });
  });

  it('rejects an invocation-less legacy marker after parser composition', async () => {
    const marker = parseMarkerBlock(`<!-- oat-review-metadata
oat_provide_remote: true
oat_review_head_sha: ${PRIOR_SHA}
oat_review_scope: ${SCOPE}
oat_project: ${PROJECT}
-->`);
    if (marker === null) {
      throw new Error('legacy marker must preserve non-lineage metadata');
    }

    const result = await pickNarrowingTarget({
      reviews: [priorReviewFromMarker(marker, '2026-05-29T10:00:00Z')],
      rail: 'project',
      project: PROJECT,
      scope: SCOPE,
      lineage: { kind: 'lifecycle' },
      headSha: HEAD_SHA,
      git: reachableGit,
    });

    expect(marker.oat_review_head_sha).toBe(PRIOR_SHA);
    expect(marker.oat_review_invocation).toBeUndefined();
    expect(result).toMatchObject({
      kind: 'full-scope-fallback',
      reason: 'no-prior-review',
    });
  });
});

function structuredDispatchContext(): ReviewDispatchContext {
  return {
    projectPath: PROJECT,
    scope: SCOPE,
    headSha: HEAD_SHA,
    reviewScopeMetadata: '## Review Scope',
    postedBodySchemaRef: 'design.md → Posted-review-body',
    narrowing: { kind: 'full-scope-fallback', reason: 'no-prior-review' },
    validation: {
      receipt: {
        token: 'receipt',
        validationRunId: 'validation-run',
        gateRunId: null,
        launchAttemptId: 'launch',
        acceptedHandleDigest: 'handle',
        contractVersion: 1,
        contextDigest: 'context',
        planDigest: 'plan',
        assignmentDigest: 'assignment',
        validatedAt: '2026-07-30T20:00:00.000Z',
        expiresAt: '2026-07-30T22:00:00.000Z',
      },
      plan: {
        strategy: 'selective-inline',
        verificationBoundary: {
          requiredClaims: [
            { kind: 'promoted-finding', mode: 'direct' },
            { kind: 'consequential-absence', mode: 'direct' },
            { kind: 'worker-conflict', mode: 'direct' },
            { kind: 'cross-lane-gap', mode: 'direct' },
          ],
          positiveCoverage: { mode: 'sample', laneIds: [], rationale: 'none' },
          deterministicAcceptance: {
            mode: 'provenance',
            requiredFields: [
              'command',
              'cwd',
              'scopeRefs',
              'provenance',
              'result',
            ],
          },
        },
      },
      assignment: { lanes: [], classifications: [] },
    },
    outputDeadlineMs: Date.now() + 60_000,
  };
}

function acceptedTerminal(completion: 'complete' | 'blocked-incomplete') {
  const accounting = {
    schemaVersion: 1 as const,
    receipt: 'receipt',
    contextDigest: 'context',
    planDigest: 'plan',
    assignmentDigest: 'assignment',
    strategy: 'selective-inline' as const,
    completion,
    evidence: [],
    lanes: [],
    classifications: [],
    verification:
      completion === 'complete'
        ? []
        : [
            {
              claimId: 'unresolved',
              kind: 'consequential-absence' as const,
              findingId: null,
              laneIds: [],
              mode: 'direct' as const,
              disposition: 'unresolved' as const,
              evidenceRefIds: [],
            },
          ],
    budget: { evidenceStoppedAt: null, outputReservePreserved: null },
  };
  return completion === 'complete'
    ? {
        schemaVersion: 1 as const,
        status: 'complete' as const,
        candidate: {
          kind: 'structured' as const,
          review: {
            summary: 'No issues found.',
            findings: [],
            verification_commands: [],
          },
        },
        reviewAccounting: { ...accounting, completion: 'complete' as const },
      }
    : {
        schemaVersion: 1 as const,
        status: 'blocked' as const,
        reason: 'coverage incomplete',
        diagnostics: ['budget exhausted'],
        reviewAccounting: {
          ...accounting,
          completion: 'blocked-incomplete' as const,
        },
      };
}

describe('project-rail: terminal validation before posting', () => {
  async function run(dispatcher: Dispatcher, posts: string[]): Promise<void> {
    const findings = await dispatchStructuredReview(
      structuredDispatchContext(),
      dispatcher,
    );
    const body = buildReviewBody({
      headSha: HEAD_SHA,
      scope: SCOPE,
      project: PROJECT,
      invocation: 'manual',
      summary: findings.summary,
      findings: findings.findings,
      verificationCommands: findings.verification_commands,
    }).body;
    posts.push(body);
  }

  it('maps and posts only an accepted validated complete terminal', async () => {
    const posts: string[] = [];
    await run(
      {
        async spawn() {
          return { accepted: true, terminal: acceptedTerminal('complete') };
        },
      },
      posts,
    );
    expect(posts).toHaveLength(1);
  });

  it.each([
    [
      'blocked',
      () => acceptedTerminal('blocked-incomplete'),
      AcceptedReviewBlockedError,
    ],
    ['malformed', () => ({}), AcceptedReviewOutputError],
    [
      'accepted timeout',
      () => Promise.reject(new Error('accepted timeout')),
      AcceptedReviewOutputError,
    ],
  ])('never posts after %s output', async (_, terminalFactory, errorType) => {
    const posts: string[] = [];
    await expect(
      run(
        {
          async spawn() {
            return { accepted: true, terminal: terminalFactory() };
          },
        },
        posts,
      ),
    ).rejects.toBeInstanceOf(errorType);
    expect(posts).toEqual([]);
  });
});
