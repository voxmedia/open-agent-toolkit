import { describe, expect, it } from 'vitest';

import { expandPackLifecycleRequests } from './pack-dependencies';
import { getPackDefinition } from './pack-manifest';
import type { PackDefinition, PackName } from './types';

const researchWithDependencies: PackDefinition = {
  ...getPackDefinition('research'),
  dependencies: [
    {
      pack: 'utility',
      scope: 'same',
      assets: ['skill:oat-dispatch-subagents', 'skill:subagent-orchestration'],
    },
  ],
};

function definition(pack: PackName): PackDefinition {
  return pack === 'research'
    ? researchWithDependencies
    : getPackDefinition(pack);
}

const request = {
  pack: 'research' as const,
  scope: 'user' as const,
  scopeRoot: '/scope',
  assetsRoot: '/assets',
  action: 'install' as const,
};

describe('expandPackLifecycleRequests', () => {
  it('orders same-scope dependency acquisition before the direct root request', () => {
    expect(expandPackLifecycleRequests([request], definition)).toEqual([
      {
        ...request,
        pack: 'utility',
        assetIds: [
          'skill:oat-dispatch-subagents',
          'skill:subagent-orchestration',
        ],
        dependency: {
          requiredBy: 'research',
          lease: 'acquire',
        },
      },
      request,
    ]);
  });

  it('orders root removal before dependency lease release and deduplicates exact requests', () => {
    const removal = { ...request, action: 'remove' as const };
    expect(expandPackLifecycleRequests([removal, removal], definition)).toEqual(
      [
        removal,
        {
          ...removal,
          pack: 'utility',
          assetIds: [
            'skill:oat-dispatch-subagents',
            'skill:subagent-orchestration',
          ],
          dependency: {
            requiredBy: 'research',
            lease: 'release',
          },
        },
      ],
    );
  });
});
