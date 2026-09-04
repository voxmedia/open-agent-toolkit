import { describe, expect, it } from 'vitest';

import {
  canonicalPathsForPack,
  canonicalPathsForPacks,
} from './install-sync-context';
import { getCanonicalProviderPaths, getPackDefinition } from './pack-manifest';

describe('install sync context', () => {
  it('derives every pack canonical path from the manifest', () => {
    expect(canonicalPathsForPack('workflows')).toEqual(
      getCanonicalProviderPaths('workflows'),
    );
  });

  it('deduplicates shared canonical paths across packs in stable order', () => {
    const paths = canonicalPathsForPacks(['docs', 'workflows']);
    expect(paths).toEqual([...new Set(paths)]);
    expect(paths).toContain('.agents/skills/oat-docs-analyze');
  });

  it('includes selected dependency canonical paths for filtered auto-sync', () => {
    expect(
      canonicalPathsForPack('research', (pack) =>
        pack === 'research'
          ? {
              ...getPackDefinition(pack),
              dependencies: [
                {
                  pack: 'utility',
                  scope: 'same',
                  assets: ['skill:oat-dispatch-subagents'],
                },
              ],
            }
          : getPackDefinition(pack),
      ),
    ).toContain('.agents/skills/oat-dispatch-subagents');
  });
});
