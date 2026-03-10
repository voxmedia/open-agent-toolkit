import { describe, expect, it } from 'vitest';

import { planDuplicatePruneActions } from './artifacts';
import {
  findDuplicateChains,
  parseArtifactVersion,
  selectLatestFromChain,
} from './artifacts.utils';

describe('artifact duplicate chains', () => {
  it('parses base and version from artifact names', () => {
    expect(parseArtifactVersion('.oat/repo/reviews/foo.md')).toEqual({
      chainKey: '.oat/repo/reviews/foo.md',
      version: 1,
    });
    expect(parseArtifactVersion('.oat/repo/reviews/foo-v2.md')).toEqual({
      chainKey: '.oat/repo/reviews/foo.md',
      version: 2,
    });
    expect(parseArtifactVersion('.oat/repo/reviews/foo-v11.md')).toEqual({
      chainKey: '.oat/repo/reviews/foo.md',
      version: 11,
    });
  });

  it('groups duplicate chains and keeps only latest version', () => {
    const chains = findDuplicateChains([
      '.oat/repo/reviews/foo.md',
      '.oat/repo/reviews/foo-v2.md',
      '.oat/repo/reviews/foo-v3.md',
      '.oat/repo/reviews/bar.md',
    ]);

    expect(chains).toHaveLength(1);
    expect(chains[0]?.chainKey).toBe('.oat/repo/reviews/foo.md');
    expect(selectLatestFromChain(chains[0]!)).toBe(
      '.oat/repo/reviews/foo-v3.md',
    );
  });

  it('plans delete actions for non-latest duplicate versions', () => {
    const actions = planDuplicatePruneActions([
      '.oat/repo/reviews/foo.md',
      '.oat/repo/reviews/foo-v2.md',
      '.oat/repo/reviews/foo-v3.md',
      '.oat/repo/reviews/bar.md',
    ]);

    expect(actions).toEqual([
      {
        type: 'delete',
        target: '.oat/repo/reviews/foo-v2.md',
        reason:
          'duplicate chain prune (latest kept: .oat/repo/reviews/foo-v3.md)',
        phase: 'duplicate-prune',
        result: 'planned',
      },
      {
        type: 'delete',
        target: '.oat/repo/reviews/foo.md',
        reason:
          'duplicate chain prune (latest kept: .oat/repo/reviews/foo-v3.md)',
        phase: 'duplicate-prune',
        result: 'planned',
      },
    ]);
  });
});
