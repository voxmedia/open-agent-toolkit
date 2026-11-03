import { describe, expect, it } from 'vitest';

import type { ReviewStatus } from '../types';
import {
  findSupersededReviews,
  markSupersededReviews,
  resolveReviewHeadAncestry,
  reviewHeadPairKey,
  reviewInvocationClass,
  reviewSupersessionHeadPairs,
} from './review-supersession';

const H1 = '1'.repeat(40);
const H2 = '2'.repeat(40);
const H3 = '3'.repeat(40);

function row(
  scope: string,
  status: string,
  options: {
    type?: string;
    artifact?: string;
    head?: string;
    invocation?: string;
    gateTarget?: string;
  } = {},
): ReviewStatus {
  return {
    scope,
    type: options.type ?? 'code',
    status,
    date: status === 'pending' ? '-' : '2026-11-03',
    artifact: options.artifact ?? '-',
    ...(options.head ? { reviewedHead: options.head } : {}),
    ...(options.invocation ? { invocation: options.invocation } : {}),
    ...(options.gateTarget ? { gateTarget: options.gateTarget } : {}),
  };
}

function gate(
  status: string,
  head: string,
  artifact: string,
  gateTarget = 'claude-opus-5-5-high',
): ReviewStatus {
  return row('final', status, {
    head,
    artifact,
    invocation: 'gate',
    gateTarget,
  });
}

/** Indices of `received` rows that readers still treat as live. */
function liveReceived(
  rows: ReviewStatus[],
  ancestry?: ReadonlySet<string>,
): number[] {
  return markSupersededReviews(rows, ancestry)
    .map((entry, index) => ({ entry, index }))
    .filter(
      ({ entry }) => entry.status === 'received' && entry.superseded !== true,
    )
    .map(({ index }) => index);
}

describe('reviewInvocationClass', () => {
  it('classes gate rows and lifecycle (manual, auto) rows; anything else has none', () => {
    expect(reviewInvocationClass('gate')).toBe('gate');
    expect(reviewInvocationClass('manual')).toBe('lifecycle');
    expect(reviewInvocationClass('auto')).toBe('lifecycle');
    expect(reviewInvocationClass(undefined)).toBeNull();
    expect(reviewInvocationClass('-')).toBeNull();
    expect(reviewInvocationClass('other')).toBeNull();
  });
});

describe('findSupersededReviews', () => {
  it('supersedes a received gate row by a later gate row of a different Gate Target at the same head (the pinned Sol case)', () => {
    const rows = [
      gate('received', H1, 'reviews/final-sol.md', 'codex-6-sol-xhigh'),
      gate('passed', H1, 'reviews/final-opus.md'),
    ];
    expect(findSupersededReviews(rows)).toEqual([
      { row: 0, supersededBy: 1, relation: 'same-head' },
    ]);
  });

  it('keeps a received gate row live when only a manual round follows', () => {
    const rows = [
      gate('received', H1, 'reviews/final-gate.md'),
      row('final', 'passed', {
        head: H1,
        artifact: 'reviews/final-manual.md',
        invocation: 'manual',
      }),
    ];
    expect(findSupersededReviews(rows)).toEqual([]);
  });

  it('keeps a received lifecycle row live when only a gate round follows', () => {
    const rows = [
      row('p01', 'received', {
        head: H1,
        artifact: 'reviews/p01-a.md',
        invocation: 'manual',
      }),
      row('p01', 'passed', {
        head: H1,
        artifact: 'reviews/p01-b.md',
        invocation: 'gate',
        gateTarget: 'x',
      }),
    ];
    expect(findSupersededReviews(rows)).toEqual([]);
  });

  it('supersedes manual by auto, because both are the lifecycle class', () => {
    const rows = [
      row('p01', 'received', {
        head: H1,
        artifact: 'reviews/p01-a.md',
        invocation: 'manual',
      }),
      row('p01', 'fixes_added', {
        head: H1,
        artifact: 'reviews/p01-b.md',
        invocation: 'auto',
      }),
    ];
    expect(findSupersededReviews(rows)).toHaveLength(1);
  });

  it('supersedes at a descendant head only when the precomputed ancestry holds', () => {
    const rows = [
      gate('received', H1, 'reviews/final-r1.md'),
      gate('received', H2, 'reviews/final-r2.md'),
    ];
    expect(findSupersededReviews(rows)).toEqual([]);
    expect(
      findSupersededReviews(rows, new Set([reviewHeadPairKey(H1, H2)])),
    ).toEqual([{ row: 0, supersededBy: 1, relation: 'descendant-head' }]);
    // The reverse relation (the later row sits at an ancestor) never supersedes.
    expect(
      findSupersededReviews(rows, new Set([reviewHeadPairKey(H2, H1)])),
    ).toEqual([]);
  });

  it('keeps a row with a `-` Invocation live', () => {
    const rows = [
      row('final', 'received', { head: H1, artifact: 'reviews/final-a.md' }),
      row('final', 'passed', { head: H1, artifact: 'reviews/final-b.md' }),
    ];
    expect(findSupersededReviews(rows)).toEqual([]);
  });

  it('keeps a row with a `-` Reviewed Head live, and a head-less later row never supersedes', () => {
    expect(
      findSupersededReviews([
        row('plan', 'received', {
          type: 'artifact',
          artifact: 'reviews/plan-a.md',
          invocation: 'gate',
        }),
        row('plan', 'passed', {
          type: 'artifact',
          head: H1,
          artifact: 'reviews/plan-b.md',
          invocation: 'gate',
        }),
      ]),
    ).toEqual([]);
    expect(
      findSupersededReviews([
        gate('received', H1, 'reviews/final-a.md'),
        row('final', 'passed', {
          artifact: 'reviews/final-b.md',
          invocation: 'gate',
        }),
      ]),
    ).toEqual([]);
  });

  it('keeps a received row live when only a pending placeholder follows', () => {
    const rows = [
      gate('received', H1, 'reviews/final-a.md'),
      row('final', 'pending', { head: H1, invocation: 'gate' }),
    ];
    expect(findSupersededReviews(rows)).toEqual([]);
  });

  it('never supersedes across Scope or Type, nor a row that is not received', () => {
    expect(
      findSupersededReviews([
        gate('received', H1, 'reviews/final-a.md'),
        row('m01', 'passed', {
          head: H1,
          artifact: 'reviews/m01.md',
          invocation: 'gate',
        }),
        row('final', 'passed', {
          type: 'artifact',
          head: H1,
          artifact: 'reviews/x.md',
          invocation: 'gate',
        }),
      ]),
    ).toEqual([]);
    expect(
      findSupersededReviews([
        gate('fixes_completed', H1, 'reviews/final-a.md'),
        gate('passed', H1, 'reviews/final-b.md'),
      ]),
    ).toEqual([]);
  });
});

describe('repeated blocking gate rounds (BL-260820-bind-each-gate-review)', () => {
  // Each step is the ledger after one disposition. The deterministic sequence
  // follows the #194 incident shape: a blocking round is relaunched before it
  // is received, the later round is received and fixed, and a third round at
  // the fixed head passes.
  const r1 = 'reviews/archived/final-review-r1.md';
  const r2 = 'reviews/archived/final-review-r2.md';
  const r3 = 'reviews/final-review-r3.md';
  const ancestry = new Set([
    reviewHeadPairKey(H1, H2),
    reviewHeadPairKey(H1, H3),
    reviewHeadPairKey(H2, H3),
  ]);
  const steps: Array<{ name: string; rows: ReviewStatus[]; live: number[] }> = [
    {
      name: 'round 1 recorded',
      rows: [gate('received', H1, r1)],
      live: [0],
    },
    {
      name: 'round 2 relaunched at the same head before round 1 is received',
      rows: [gate('received', H1, r1), gate('received', H1, r2)],
      live: [1],
    },
    {
      name: 'round 2 received into fix tasks',
      rows: [gate('received', H1, r1), gate('fixes_added', H1, r2)],
      live: [],
    },
    {
      name: 'round 2 fixes completed',
      rows: [gate('received', H1, r1), gate('fixes_completed', H1, r2)],
      live: [],
    },
    {
      name: 'round 3 recorded at the fixed (descendant) head',
      rows: [
        gate('received', H1, r1),
        gate('fixes_completed', H1, r2),
        gate('received', H3, r3),
      ],
      live: [2],
    },
    {
      name: 'round 3 passed',
      rows: [
        gate('received', H1, r1),
        gate('fixes_completed', H1, r2),
        gate('passed', H3, r3),
      ],
      live: [],
    },
  ];

  it.each(steps)(
    'leaves no live stranded received event after: $name',
    ({ rows, live }) => {
      expect(liveReceived(rows, ancestry)).toEqual(live);
      // Only the newest row may ever be a live received event.
      for (const index of live) {
        expect(index).toBe(rows.length - 1);
      }
    },
  );

  it('keeps the single-round path unchanged: the one row is live until received', () => {
    for (const status of [
      'received',
      'fixes_added',
      'fixes_completed',
      'passed',
    ]) {
      const rows = [gate(status, H1, r1)];
      expect(findSupersededReviews(rows, ancestry)).toEqual([]);
      expect(liveReceived(rows, ancestry)).toEqual(
        status === 'received' ? [0] : [],
      );
    }
  });

  it('strands round 1 when supersession is not applied (the pre-change regression)', () => {
    const rows = steps.at(-1)?.rows ?? [];
    const naiveLive = rows
      .map((entry, index) => ({ entry, index }))
      .filter(({ entry }) => entry.status === 'received')
      .map(({ index }) => index);
    expect(naiveLive).toEqual([0]);
    expect(liveReceived(rows, ancestry)).toEqual([]);
  });
});

describe('head ancestry resolution', () => {
  it('asks only for distinct-head pairs of a received row and a later candidate', () => {
    const rows = [
      gate('received', H1, 'reviews/a.md'),
      gate('passed', H1, 'reviews/b.md'),
      gate('received', H2, 'reviews/c.md'),
      row('final', 'passed', {
        head: H3,
        artifact: 'reviews/d.md',
        invocation: 'manual',
      }),
      gate('passed', H3, 'reviews/e.md'),
    ];
    expect(reviewSupersessionHeadPairs(rows)).toEqual([
      { ancestor: H1, descendant: H2 },
      { ancestor: H1, descendant: H3 },
      { ancestor: H2, descendant: H3 },
    ]);
  });

  it('resolves through the caller resolver, and to nothing without one', async () => {
    const rows = [
      gate('received', H1, 'reviews/a.md'),
      gate('passed', H2, 'reviews/b.md'),
    ];
    const asked: string[] = [];
    const ancestry = await resolveReviewHeadAncestry(rows, async (pairs) => {
      asked.push(
        ...pairs.map((pair) =>
          reviewHeadPairKey(pair.ancestor, pair.descendant),
        ),
      );
      return new Set(asked);
    });
    expect(asked).toEqual([reviewHeadPairKey(H1, H2)]);
    expect(markSupersededReviews(rows, ancestry)[0]?.superseded).toBe(true);
    expect(await resolveReviewHeadAncestry(rows, undefined)).toEqual(new Set());
  });

  it('marks without mutating the input rows', () => {
    const rows = [
      gate('received', H1, 'reviews/a.md'),
      gate('passed', H1, 'reviews/b.md'),
    ];
    const marked = markSupersededReviews(rows);
    expect(marked[0]?.superseded).toBe(true);
    expect(marked[1]?.superseded).toBeUndefined();
    expect(rows[0]?.superseded).toBeUndefined();
  });
});
