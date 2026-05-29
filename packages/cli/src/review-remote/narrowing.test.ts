import { describe, expect, it } from 'vitest';

import {
  pickNarrowingTarget,
  type GitInvoker,
  type PriorReview,
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
    ...overrides,
  };
}

/** A GitInvoker stub with configurable existence/ancestry/fetch outcomes. */
function stubGit(opts: {
  exists?: boolean;
  ancestor?: boolean;
  fetch?: boolean;
}): GitInvoker {
  return {
    objectExists: async () => opts.exists ?? true,
    isAncestor: async () => opts.ancestor ?? true,
    fetchRef: async () => opts.fetch ?? true,
  };
}

const PASSING_GIT = stubGit({ exists: true, ancestor: true });

describe('pickNarrowingTarget — matching', () => {
  it('returns full-scope-fallback (no-prior) when no prior review matches', async () => {
    const result = await pickNarrowingTarget({
      reviews: [],
      rail: 'ad-hoc',
      project: null,
      scope: 'ad-hoc',
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
      headSha: HEAD,
      git: PASSING_GIT,
    });
    expect(result.kind).toBe('narrow-range');
    if (result.kind === 'narrow-range') {
      expect(result.priorSha).toBe(SHA_B);
    }
  });
});

describe('pickNarrowingTarget — stale-SHA guard', () => {
  const base = {
    reviews: [review({ submittedAt: '2026-05-01T00:00:00Z', headSha: SHA_A })],
    rail: 'ad-hoc' as const,
    project: null,
    scope: 'ad-hoc',
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

  it('auto-narrow config never prompts and still falls back on guard failure', async () => {
    const result = await pickNarrowingTarget({
      ...base,
      git: stubGit({ exists: true, ancestor: false }),
      autoNarrow: true,
    });
    expect(result.kind).toBe('full-scope-fallback');
    if (result.kind === 'full-scope-fallback') {
      expect(result.reason).toBe('stale-sha');
      expect(result.prompted).toBe(false);
    }
  });

  it('auto-narrow config never prompts on a successful narrow', async () => {
    const result = await pickNarrowingTarget({
      ...base,
      git: stubGit({ exists: true, ancestor: true }),
      autoNarrow: true,
    });
    expect(result.kind).toBe('narrow-range');
    if (result.kind === 'narrow-range') {
      expect(result.prompted).toBe(false);
    }
  });
});

describe('pickNarrowingTarget — diff-only fetch path', () => {
  const base = {
    reviews: [review({ submittedAt: '2026-05-01T00:00:00Z', headSha: SHA_A })],
    rail: 'ad-hoc' as const,
    project: null,
    scope: 'ad-hoc',
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
