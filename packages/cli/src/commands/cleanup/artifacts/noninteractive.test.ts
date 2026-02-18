import { describe, expect, it } from 'vitest';
import {
  planArchiveActions,
  planNonInteractiveArtifactActions,
} from './artifacts';
import {
  buildArchiveTargetPath,
  resolveArchiveBasePath,
} from './artifacts.utils';

describe('artifact non-interactive safety and archive mechanics', () => {
  it('routes archive destinations by source directory', () => {
    expect(
      resolveArchiveBasePath('.oat/repo/reference/external-plans/foo.md'),
    ).toBe('.oat/repo/archive/reference/external-plans/foo.md');
    expect(resolveArchiveBasePath('.oat/repo/reviews/bar.md')).toBe(
      '.oat/repo/archive/reviews/bar.md',
    );
  });

  it('adds timestamp suffix when archive target collides', () => {
    const collisionTarget = '.oat/repo/archive/reviews/bar.md';
    const resolved = buildArchiveTargetPath(
      '.oat/repo/reviews/bar.md',
      new Set([collisionTarget]),
      '20260218-121314',
    );

    expect(resolved).toBe('.oat/repo/archive/reviews/bar-20260218-121314.md');
  });

  it('plans archive actions from source targets without double resolution', () => {
    const actions = planArchiveActions(
      ['.oat/repo/reviews/bar.md'],
      new Set<string>(),
      '20260218-121314',
    );

    expect(actions).toEqual([
      {
        type: 'archive',
        target: '.oat/repo/archive/reviews/bar.md',
        reason: 'archive stale artifact from .oat/repo/reviews/bar.md',
        phase: 'archive',
        result: 'planned',
      },
    ]);
  });

  it('requires --all-candidates --yes for non-interactive stale deletion', () => {
    const actions = planNonInteractiveArtifactActions(
      [
        { target: '.oat/repo/reviews/a.md', referenced: false },
        { target: '.oat/repo/reviews/b.md', referenced: true },
      ],
      {
        allCandidates: false,
        yes: false,
      },
    );

    expect(actions.every((action) => action.type === 'skip')).toBe(true);
    expect(actions.every((action) => action.result === 'skipped')).toBe(true);
  });

  it('blocks referenced candidates even with force flags', () => {
    const actions = planNonInteractiveArtifactActions(
      [
        { target: '.oat/repo/reviews/a.md', referenced: false },
        { target: '.oat/repo/reviews/b.md', referenced: true },
      ],
      {
        allCandidates: true,
        yes: true,
      },
    );

    expect(actions).toEqual([
      {
        type: 'delete',
        target: '.oat/repo/reviews/a.md',
        reason:
          'non-interactive stale deletion approved (--all-candidates --yes)',
        phase: 'safety-gates',
        result: 'planned',
      },
      {
        type: 'block',
        target: '.oat/repo/reviews/b.md',
        reason:
          'candidate is referenced and blocked from non-interactive deletion',
        phase: 'safety-gates',
        result: 'blocked',
      },
    ]);
  });
});
