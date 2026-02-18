import { describe, expect, it } from 'vitest';
import type { CleanupActionRecord } from './cleanup.types';
import {
  buildCleanupSummary,
  createCleanupPayload,
  toCleanupMode,
  toRepoRelativePath,
} from './cleanup.utils';

describe('cleanup utils', () => {
  it('maps apply flag to mode', () => {
    expect(toCleanupMode(false)).toBe('dry-run');
    expect(toCleanupMode(true)).toBe('apply');
  });

  it('builds deterministic action ordering and summary counts', () => {
    const actions: CleanupActionRecord[] = [
      {
        type: 'delete',
        target: '.oat/repo/reviews/b.md',
        reason: 'stale',
        phase: 'stale-triage',
        result: 'applied',
      },
      {
        type: 'block',
        target: '.oat/repo/reviews/a.md',
        reason: 'referenced',
        phase: 'stale-triage',
        result: 'blocked',
      },
      {
        type: 'archive',
        target: '.oat/repo/reviews/c.md',
        reason: 'user-selected',
        phase: 'stale-triage',
        result: 'planned',
      },
      {
        type: 'skip',
        target: '.oat/repo/reference/external-plans/d.md',
        reason: 'no --yes',
        phase: 'safety-gates',
        result: 'skipped',
      },
    ];

    const payload = createCleanupPayload({
      status: 'drift',
      apply: false,
      scanned: 12,
      issuesFound: 4,
      actions,
    });

    expect(payload.mode).toBe('dry-run');
    expect(payload.actions.map((action) => action.target)).toEqual([
      '.oat/repo/reference/external-plans/d.md',
      '.oat/repo/reviews/a.md',
      '.oat/repo/reviews/b.md',
      '.oat/repo/reviews/c.md',
    ]);
    expect(payload.summary).toEqual({
      scanned: 12,
      issuesFound: 4,
      planned: 1,
      applied: 1,
      skipped: 1,
      blocked: 1,
    });

    expect(
      buildCleanupSummary({ scanned: 0, issuesFound: 0, actions: [] }),
    ).toEqual({
      scanned: 0,
      issuesFound: 0,
      planned: 0,
      applied: 0,
      skipped: 0,
      blocked: 0,
    });
  });

  it('normalizes repo-relative target paths', () => {
    expect(
      toRepoRelativePath(
        '/tmp/workspace',
        '/tmp/workspace/.oat/repo/reviews/r1.md',
      ),
    ).toBe('.oat/repo/reviews/r1.md');
  });
});
