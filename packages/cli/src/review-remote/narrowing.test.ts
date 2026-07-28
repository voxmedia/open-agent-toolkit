import { describe, expect, it } from 'vitest';

import {
  pickNarrowingTarget,
  priorReviewFromLedger,
  type GitInvoker,
  type PriorReview,
  type ReviewLedgerProvenance,
} from './narrowing';

const SHA_A = 'a'.repeat(40);
const SHA_B = 'b'.repeat(40);
const SHA_C = 'c'.repeat(40);
const HEAD = 'd'.repeat(40);

function review(
  overrides: Partial<PriorReview> & { submittedAt: string },
): PriorReview {
  return {
    headSha: SHA_A,
    scope: 'ad-hoc',
    invocation: 'manual',
    lineage: { kind: 'lifecycle' },
    ...overrides,
  };
}

/** A GitInvoker stub with configurable existence/ancestry/fetch outcomes. */
function stubGit(opts: {
  exists?: boolean;
  ancestor?: boolean;
  fetch?: boolean;
  files?: string[];
}): GitInvoker {
  return {
    objectExists: async () => opts.exists ?? true,
    isAncestor: async () => opts.ancestor ?? true,
    fetchRef: async () => opts.fetch ?? true,
    changedFiles: async () => opts.files ?? ['src/default.ts'],
  };
}

const PASSING_GIT = stubGit({ exists: true, ancestor: true });

function ledgerReview(
  overrides: Partial<ReviewLedgerProvenance> = {},
): PriorReview {
  return priorReviewFromLedger({
    reviewedHead: SHA_A,
    scope: 'p02',
    project: '.oat/projects/shared/x',
    invocation: 'manual',
    artifact: 'reviews/archived/p02-review.md',
    submittedAt: '2026-05-01T00:00:00Z',
    ...overrides,
  });
}

describe('pickNarrowingTarget — matching', () => {
  it('returns full-scope-fallback (no-prior) when no prior review matches', async () => {
    const result = await pickNarrowingTarget({
      reviews: [],
      rail: 'ad-hoc',
      project: null,
      scope: 'ad-hoc',
      lineage: { kind: 'lifecycle' },
      headSha: HEAD,
      git: PASSING_GIT,
    });
    expect(result.kind).toBe('full-scope-fallback');
    if (result.kind === 'full-scope-fallback') {
      expect(result.reason).toBe('no-prior-review');
    }
  });

  it('ad-hoc tuple matches only ad-hoc scope with no project key', async () => {
    const result = await pickNarrowingTarget({
      reviews: [
        review({ submittedAt: '2026-05-01T00:00:00Z', headSha: SHA_A }),
        // project review must be ignored by ad-hoc filter
        review({
          submittedAt: '2026-05-02T00:00:00Z',
          headSha: SHA_B,
          scope: 'p02',
          project: '.oat/projects/shared/x',
        }),
      ],
      rail: 'ad-hoc',
      project: null,
      scope: 'ad-hoc',
      lineage: { kind: 'lifecycle' },
      headSha: HEAD,
      git: PASSING_GIT,
    });
    expect(result.kind).toBe('narrow-range');
    if (result.kind === 'narrow-range') {
      expect(result.priorSha).toBe(SHA_A);
      expect(result.headSha).toBe(HEAD);
    }
  });

  it('project tuple matches only same project AND same scope', async () => {
    const result = await pickNarrowingTarget({
      reviews: [
        review({
          submittedAt: '2026-05-01T00:00:00Z',
          headSha: SHA_A,
          scope: 'p02',
          project: '.oat/projects/shared/x',
        }),
        // same project / different scope — rejected
        review({
          submittedAt: '2026-05-03T00:00:00Z',
          headSha: SHA_B,
          scope: 'p03',
          project: '.oat/projects/shared/x',
        }),
        // same scope / different project — rejected
        review({
          submittedAt: '2026-05-04T00:00:00Z',
          headSha: SHA_C,
          scope: 'p02',
          project: '.oat/projects/shared/y',
        }),
      ],
      rail: 'project',
      project: '.oat/projects/shared/x',
      scope: 'p02',
      lineage: { kind: 'lifecycle' },
      headSha: HEAD,
      git: PASSING_GIT,
    });
    expect(result.kind).toBe('narrow-range');
    if (result.kind === 'narrow-range') {
      expect(result.priorSha).toBe(SHA_A);
    }
  });

  it('picks the most recent matching review by submittedAt (descending)', async () => {
    const result = await pickNarrowingTarget({
      reviews: [
        review({ submittedAt: '2026-05-01T00:00:00Z', headSha: SHA_A }),
        review({ submittedAt: '2026-05-05T00:00:00Z', headSha: SHA_B }),
        review({ submittedAt: '2026-05-03T00:00:00Z', headSha: SHA_C }),
      ],
      rail: 'ad-hoc',
      project: null,
      scope: 'ad-hoc',
      lineage: { kind: 'lifecycle' },
      headSha: HEAD,
      git: PASSING_GIT,
    });
    expect(result.kind).toBe('narrow-range');
    if (result.kind === 'narrow-range') {
      expect(result.priorSha).toBe(SHA_B);
    }
  });

  it('matches a gate review from the same gate target and scope', async () => {
    const result = await pickNarrowingTarget({
      reviews: [
        review({
          submittedAt: '2026-05-01T00:00:00Z',
          scope: 'p02',
          project: '.oat/projects/shared/x',
          lineage: { kind: 'gate', target: 'codex-default' },
        }),
      ],
      rail: 'project',
      project: '.oat/projects/shared/x',
      scope: 'p02',
      lineage: { kind: 'gate', target: 'codex-default' },
      headSha: HEAD,
      git: PASSING_GIT,
    });

    expect(result.kind).toBe('narrow-range');
  });

  it('rejects a gate review from a different gate target', async () => {
    const result = await pickNarrowingTarget({
      reviews: [
        review({
          submittedAt: '2026-05-01T00:00:00Z',
          scope: 'p02',
          project: '.oat/projects/shared/x',
          lineage: { kind: 'gate', target: 'claude-default' },
        }),
      ],
      rail: 'project',
      project: '.oat/projects/shared/x',
      scope: 'p02',
      lineage: { kind: 'gate', target: 'codex-default' },
      headSha: HEAD,
      git: PASSING_GIT,
    });

    expect(result).toMatchObject({
      kind: 'full-scope-fallback',
      reason: 'no-prior-review',
    });
  });

  it('rejects a lifecycle review for a gate invocation', async () => {
    const result = await pickNarrowingTarget({
      reviews: [
        review({
          submittedAt: '2026-05-01T00:00:00Z',
          scope: 'p02',
          project: '.oat/projects/shared/x',
        }),
      ],
      rail: 'project',
      project: '.oat/projects/shared/x',
      scope: 'p02',
      lineage: { kind: 'gate', target: 'codex-default' },
      headSha: HEAD,
      git: PASSING_GIT,
    });

    expect(result).toMatchObject({
      kind: 'full-scope-fallback',
      reason: 'no-prior-review',
    });
  });

  it('rejects a gate review for a lifecycle invocation', async () => {
    const result = await pickNarrowingTarget({
      reviews: [
        review({
          submittedAt: '2026-05-01T00:00:00Z',
          scope: 'p02',
          project: '.oat/projects/shared/x',
          lineage: { kind: 'gate', target: 'codex-default' },
        }),
      ],
      rail: 'project',
      project: '.oat/projects/shared/x',
      scope: 'p02',
      lineage: { kind: 'lifecycle' },
      headSha: HEAD,
      git: PASSING_GIT,
    });

    expect(result).toMatchObject({
      kind: 'full-scope-fallback',
      reason: 'no-prior-review',
    });
  });
});

describe('pickNarrowingTarget — durable ledger lineage', () => {
  const base = {
    reviews: [] as PriorReview[],
    rail: 'project' as const,
    project: '.oat/projects/shared/x',
    scope: 'p02',
    headSha: HEAD,
    git: PASSING_GIT,
  };

  it('fails open when a lifecycle row is the only baseline for a gate invocation', async () => {
    const result = await pickNarrowingTarget({
      ...base,
      reviews: [ledgerReview()],
      lineage: { kind: 'gate', target: 'codex-default' },
    });

    expect(result).toMatchObject({
      kind: 'full-scope-fallback',
      reason: 'no-prior-review',
    });
  });

  it('fails open when a gate row belongs to a different target', async () => {
    const result = await pickNarrowingTarget({
      ...base,
      reviews: [
        ledgerReview({
          invocation: 'gate',
          gateTarget: 'claude-default',
        }),
      ],
      lineage: { kind: 'gate', target: 'codex-default' },
    });

    expect(result).toMatchObject({
      kind: 'full-scope-fallback',
      reason: 'no-prior-review',
    });
  });

  it('narrows from a gate row with the same target', async () => {
    const result = await pickNarrowingTarget({
      ...base,
      reviews: [
        ledgerReview({
          invocation: 'gate',
          gateTarget: 'codex-default',
        }),
      ],
      lineage: { kind: 'gate', target: 'codex-default' },
    });

    expect(result).toMatchObject({
      kind: 'narrow-range',
      priorSha: SHA_A,
      headSha: HEAD,
    });
  });

  it('fails open when a gate row is the only baseline for a lifecycle invocation', async () => {
    const result = await pickNarrowingTarget({
      ...base,
      reviews: [
        ledgerReview({
          invocation: 'gate',
          gateTarget: 'codex-default',
        }),
      ],
      lineage: { kind: 'lifecycle' },
    });

    expect(result).toMatchObject({
      kind: 'full-scope-fallback',
      reason: 'no-prior-review',
    });
  });

  it('fails open for a legacy row with a head but no lineage qualifier', async () => {
    const legacyRow = priorReviewFromLedger({
      reviewedHead: SHA_A,
      scope: 'p02',
      project: '.oat/projects/shared/x',
      artifact: 'reviews/archived/p02-review.md',
      submittedAt: '2026-05-01T00:00:00Z',
    });

    const result = await pickNarrowingTarget({
      ...base,
      reviews: [legacyRow],
      lineage: { kind: 'lifecycle' },
    });

    expect(result).toMatchObject({
      kind: 'full-scope-fallback',
      reason: 'no-prior-review',
    });
  });
});

describe('pickNarrowingTarget — stale-SHA guard', () => {
  const base = {
    reviews: [review({ submittedAt: '2026-05-01T00:00:00Z', headSha: SHA_A })],
    rail: 'ad-hoc' as const,
    project: null,
    scope: 'ad-hoc',
    lineage: { kind: 'lifecycle' as const },
    headSha: HEAD,
  };

  it('returns narrow range when existence + ancestry both pass', async () => {
    const result = await pickNarrowingTarget({
      ...base,
      git: stubGit({ exists: true, ancestor: true }),
    });
    expect(result.kind).toBe('narrow-range');
  });

  it('falls back to full scope (stale-sha) when existence fails', async () => {
    const result = await pickNarrowingTarget({
      ...base,
      git: stubGit({ exists: false }),
    });
    expect(result.kind).toBe('full-scope-fallback');
    if (result.kind === 'full-scope-fallback') {
      expect(result.reason).toBe('stale-sha');
    }
  });

  it('falls back to full scope (stale-sha) when ancestry fails', async () => {
    const result = await pickNarrowingTarget({
      ...base,
      git: stubGit({ exists: true, ancestor: false }),
    });
    expect(result.kind).toBe('full-scope-fallback');
    if (result.kind === 'full-scope-fallback') {
      expect(result.reason).toBe('stale-sha');
    }
  });

  it('hard-errors when --narrow is set and the guard fails', async () => {
    const result = await pickNarrowingTarget({
      ...base,
      git: stubGit({ exists: false }),
      forceNarrow: true,
    });
    expect(result.kind).toBe('hard-error');
    if (result.kind === 'hard-error') {
      expect(result.reason).toBe('stale-sha');
    }
  });

  it('narrows without prompting when the preference is unset', async () => {
    const result = await pickNarrowingTarget({
      ...base,
      git: PASSING_GIT,
    });

    expect(result).toMatchObject({ kind: 'narrow-range' });
    expect(result).not.toHaveProperty('prompted');
  });

  it('narrows without prompting when the preference is true', async () => {
    const result = await pickNarrowingTarget({
      ...base,
      git: PASSING_GIT,
      narrowingPreference: true,
    });

    expect(result).toMatchObject({ kind: 'narrow-range' });
    expect(result).not.toHaveProperty('prompted');
  });

  it('uses full scope without consulting a prior review when the preference is false', async () => {
    const git: GitInvoker = {
      objectExists: async () => {
        throw new Error('guard must not run');
      },
      isAncestor: async () => {
        throw new Error('guard must not run');
      },
      fetchRef: async () => {
        throw new Error('guard must not run');
      },
      changedFiles: async () => {
        throw new Error('guard must not run');
      },
    };

    const result = await pickNarrowingTarget({
      ...base,
      git,
      narrowingPreference: false,
    });

    expect(result).toEqual({
      kind: 'full-scope-fallback',
      reason: 'narrowing-disabled',
    });
  });

  it('force-narrows when the preference is false and the guard passes', async () => {
    const result = await pickNarrowingTarget({
      ...base,
      git: PASSING_GIT,
      forceNarrow: true,
      narrowingPreference: false,
    });

    expect(result).toMatchObject({
      kind: 'narrow-range',
      priorSha: SHA_A,
      headSha: HEAD,
    });
  });

  it('hard-errors when force-narrow overrides false and the guard fails', async () => {
    const result = await pickNarrowingTarget({
      ...base,
      git: stubGit({ exists: true, ancestor: false }),
      forceNarrow: true,
      narrowingPreference: false,
    });

    expect(result).toEqual({
      kind: 'hard-error',
      reason: 'stale-sha',
      priorSha: SHA_A,
    });
  });

  it('preserves the guard failure reason in the full-scope fallback', async () => {
    const result = await pickNarrowingTarget({
      ...base,
      git: stubGit({ exists: true, ancestor: false }),
    });

    expect(result).toEqual({
      kind: 'full-scope-fallback',
      reason: 'stale-sha',
      priorSha: SHA_A,
    });
  });
});

describe('pickNarrowingTarget — diff-only fetch path', () => {
  const base = {
    reviews: [review({ submittedAt: '2026-05-01T00:00:00Z', headSha: SHA_A })],
    rail: 'ad-hoc' as const,
    project: null,
    scope: 'ad-hoc',
    lineage: { kind: 'lifecycle' as const },
    headSha: HEAD,
  };

  it('fetches the single ref first in diff-only mode and narrows when reachable', async () => {
    let fetched = false;
    const git: GitInvoker = {
      // Object only exists after a successful fetch.
      objectExists: async () => fetched,
      isAncestor: async () => true,
      fetchRef: async () => {
        fetched = true;
        return true;
      },
      changedFiles: async () => ['src/default.ts'],
    };
    const result = await pickNarrowingTarget({
      ...base,
      git,
      diffOnly: true,
    });
    expect(result.kind).toBe('narrow-range');
  });

  it('falls back when the single-ref fetch fails in diff-only mode', async () => {
    const git: GitInvoker = {
      objectExists: async () => false,
      isAncestor: async () => true,
      fetchRef: async () => false,
      changedFiles: async () => ['src/default.ts'],
    };
    const result = await pickNarrowingTarget({
      ...base,
      git,
      diffOnly: true,
    });
    expect(result.kind).toBe('full-scope-fallback');
    if (result.kind === 'full-scope-fallback') {
      expect(result.reason).toBe('stale-sha');
    }
  });
});

describe('pickNarrowingTarget — range classification', () => {
  const base = {
    reviews: [
      review({
        submittedAt: '2026-05-01T00:00:00Z',
        headSha: SHA_A,
        scope: 'p02',
        project: '.oat/projects/shared/x',
      }),
    ],
    rail: 'project' as const,
    project: '.oat/projects/shared/x',
    scope: 'p02',
    lineage: { kind: 'lifecycle' as const },
    headSha: HEAD,
  };

  it.each([
    {
      name: 'a range with no commits',
      files: [],
      expected: 'empty',
    },
    {
      name: "a range touching only the project's tracking directory",
      files: [
        '.oat/projects/shared/x/state.md',
        '.oat/projects/shared/x/reviews/review.md',
      ],
      expected: 'bookkeeping-only',
    },
    {
      name: 'a range touching a bundled template',
      files: ['.oat/templates/plan.md'],
      expected: 'substantive',
    },
    {
      name: 'a range touching a durable repository reference',
      files: ['.oat/repo/references/current.md'],
      expected: 'substantive',
    },
    {
      name: 'a range mixing project tracking and source files',
      files: ['.oat/projects/shared/x/state.md', 'packages/cli/src/index.ts'],
      expected: 'substantive',
    },
  ])(
    'classifies $name and keeps it dispatchable',
    async ({ files, expected }) => {
      const result = await pickNarrowingTarget({
        ...base,
        git: stubGit({ files }),
      });

      expect(result).toMatchObject({
        kind: 'narrow-range',
        classification: expected,
        priorSha: SHA_A,
        headSha: HEAD,
      });
    },
  );

  it('keeps the range dispatchable when changed-file classification fails', async () => {
    const git = stubGit({});
    git.changedFiles = async () => {
      throw new Error('diff unavailable');
    };

    const result = await pickNarrowingTarget({
      ...base,
      git,
    });

    expect(result).toEqual({
      kind: 'narrow-range',
      priorSha: SHA_A,
      headSha: HEAD,
      classification: 'substantive',
      classificationReason: 'changed-files-unavailable',
    });
  });
});
