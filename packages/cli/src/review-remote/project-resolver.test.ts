import { describe, expect, it } from 'vitest';

import { resolveProject } from './project-resolver';

describe('resolveProject — diff scan', () => {
  it('returns the single project when exactly one state.md matches', () => {
    const result = resolveProject([
      'packages/cli/src/foo.ts',
      '.oat/projects/shared/remote-review/state.md',
      '.oat/projects/shared/remote-review/plan.md',
      'README.md',
    ]);
    expect(result.kind).toBe('resolved');
    if (result.kind === 'resolved') {
      expect(result.projectPath).toBe('.oat/projects/shared/remote-review');
    }
  });

  it('returns ambiguous with the candidate list when multiple match', () => {
    const result = resolveProject([
      '.oat/projects/shared/remote-review/state.md',
      '.oat/projects/personal/other-thing/state.md',
    ]);
    expect(result.kind).toBe('ambiguous');
    if (result.kind === 'ambiguous') {
      expect(result.candidates).toEqual([
        '.oat/projects/personal/other-thing',
        '.oat/projects/shared/remote-review',
      ]);
    }
  });

  it('returns not-found when zero state.md files match', () => {
    const result = resolveProject([
      'packages/cli/src/foo.ts',
      '.oat/projects/shared/remote-review/plan.md', // no state.md
    ]);
    expect(result.kind).toBe('not-found');
  });

  it('only matches the two-level scope/project state.md glob', () => {
    const result = resolveProject([
      // wrong depth — one level
      '.oat/projects/remote-review/state.md',
      // wrong depth — three levels
      '.oat/projects/shared/remote-review/nested/state.md',
      // a state.md somewhere else entirely
      'packages/cli/state.md',
    ]);
    expect(result.kind).toBe('not-found');
  });

  it('deduplicates a project listed via multiple changed files', () => {
    const result = resolveProject([
      '.oat/projects/shared/remote-review/state.md',
      '.oat/projects/shared/remote-review/state.md',
    ]);
    expect(result.kind).toBe('resolved');
  });
});

describe('resolveProject — --project override', () => {
  it('takes precedence over the diff scan when the path is a valid project', () => {
    const result = resolveProject(
      ['.oat/projects/shared/diff-scanned/state.md'],
      {
        overridePath: '.oat/projects/shared/explicit',
        pathExists: (p) => p === '.oat/projects/shared/explicit/state.md',
      },
    );
    expect(result.kind).toBe('resolved');
    if (result.kind === 'resolved') {
      expect(result.projectPath).toBe('.oat/projects/shared/explicit');
    }
  });

  it('errors clearly when the override path has no state.md (m1 fix)', () => {
    const result = resolveProject([], {
      overridePath: '.oat/projects/shared/nope',
      pathExists: () => false,
    });
    expect(result.kind).toBe('invalid-override');
    if (result.kind === 'invalid-override') {
      expect(result.overridePath).toBe('.oat/projects/shared/nope');
      expect(result.message).toMatch(/state\.md/);
    }
  });

  it('normalizes a trailing slash on the override path', () => {
    const result = resolveProject([], {
      overridePath: '.oat/projects/shared/explicit/',
      pathExists: (p) => p === '.oat/projects/shared/explicit/state.md',
    });
    expect(result.kind).toBe('resolved');
    if (result.kind === 'resolved') {
      expect(result.projectPath).toBe('.oat/projects/shared/explicit');
    }
  });

  it('accepts an override path that already points at state.md', () => {
    const result = resolveProject([], {
      overridePath: '.oat/projects/shared/explicit/state.md',
      pathExists: (p) => p === '.oat/projects/shared/explicit/state.md',
    });
    expect(result.kind).toBe('resolved');
    if (result.kind === 'resolved') {
      expect(result.projectPath).toBe('.oat/projects/shared/explicit');
    }
  });
});
