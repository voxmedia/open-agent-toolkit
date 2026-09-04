import { describe, expect, it } from 'vitest';

import {
  PACK_MANIFEST,
  type PackDefinition,
  validatePackManifest,
} from './pack-manifest';
import type { PackName } from './types';

const ALL_PACKS = [
  'core',
  'ideas',
  'docs',
  'workflows',
  'utility',
  'project-management',
  'research',
  'brainstorm',
] as const satisfies readonly PackName[];

function fixture(overrides: Partial<PackDefinition> = {}): PackDefinition {
  return {
    name: 'ideas',
    allowedScopes: ['project', 'user'],
    defaultScope: 'user',
    assets: [
      {
        id: 'fixture-skill',
        kind: 'skill',
        source: 'skills/fixture',
        destination: '.agents/skills/fixture',
        scopes: ['project', 'user'],
        ownership: { project: 'managed', user: 'managed' },
      },
    ],
    ...overrides,
  };
}

describe('PACK_MANIFEST', () => {
  it('covers every PackName exactly once', () => {
    expect(PACK_MANIFEST.map(({ name }) => name).sort()).toEqual(
      [...ALL_PACKS].sort(),
    );
    expect(() => validatePackManifest()).not.toThrow();
  });

  it('requires unique pack and asset IDs', () => {
    expect(() => validatePackManifest([fixture(), fixture()])).toThrow(
      /duplicate pack/i,
    );
    expect(() =>
      validatePackManifest([
        fixture({
          assets: [fixture().assets[0], fixture().assets[0]],
        }),
      ]),
    ).toThrow(/duplicate asset/i);
  });

  it('requires the default scope to be allowed', () => {
    expect(() =>
      validatePackManifest([
        fixture({ allowedScopes: ['project'], defaultScope: 'user' }),
      ]),
    ).toThrow(/default scope/i);
  });

  it('rejects absolute and parent-traversing paths', () => {
    for (const invalidPath of [
      '/tmp/fixture',
      '../fixture',
      'skills/../../fixture',
    ]) {
      expect(() =>
        validatePackManifest([
          fixture({
            assets: [
              {
                ...fixture().assets[0],
                destination: invalidPath,
              },
            ],
          }),
        ]),
      ).toThrow(/relative.*scope|traversal/i);
    }
  });

  it('requires ownership for every declared asset scope', () => {
    expect(() =>
      validatePackManifest([
        fixture({
          assets: [
            {
              ...fixture().assets[0],
              ownership: { project: 'managed' },
            },
          ],
        }),
      ]),
    ).toThrow(/ownership.*user/i);
  });

  it('requires a source or explicit generation contract for every asset', () => {
    expect(() =>
      validatePackManifest([
        fixture({
          assets: [{ ...fixture().assets[0], source: undefined }],
        }),
      ]),
    ).toThrow(/source or generation contract/i);
  });

  it('rejects destination collisions without compatible shared ownership', () => {
    const colliding = {
      ...fixture().assets[0],
      id: 'fixture-collision',
    };
    expect(() =>
      validatePackManifest([
        fixture(),
        fixture({ name: 'docs', assets: [colliding] }),
      ]),
    ).toThrow(/collide.*shared owner/i);

    expect(() =>
      validatePackManifest([
        fixture({
          assets: [{ ...fixture().assets[0], sharedOwner: 'fixture' }],
        }),
        fixture({
          name: 'docs',
          assets: [{ ...colliding, sharedOwner: 'fixture' }],
        }),
      ]),
    ).not.toThrow();
  });

  it('declares resolve-tracking as a compatible docs/workflows shared asset', () => {
    const owners = PACK_MANIFEST.flatMap((pack) =>
      pack.assets
        .filter(
          ({ destination }) =>
            destination === '.oat/scripts/resolve-tracking.sh',
        )
        .map((asset) => ({ pack: pack.name, owner: asset.sharedOwner })),
    );
    expect(owners).toEqual([
      { pack: 'docs', owner: 'resolve-tracking' },
      { pack: 'workflows', owner: 'resolve-tracking' },
    ]);
  });

  it('registers recon as a research-owned skill and user-materializable agent with utility-owned dependencies', () => {
    const research = PACK_MANIFEST.find(({ name }) => name === 'research')!;
    const utility = PACK_MANIFEST.find(({ name }) => name === 'utility')!;

    expect(research.assets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'skill:recon', kind: 'skill' }),
        expect.objectContaining({
          id: 'agent:recon-worker.md',
          kind: 'agent',
          userMaterializable: true,
        }),
      ]),
    );
    expect(research.dependencies).toEqual([
      {
        pack: 'utility',
        scope: 'same',
        assets: [
          'skill:oat-dispatch-subagents',
          'skill:subagent-orchestration',
        ],
      },
    ]);
    for (const id of [
      'skill:oat-dispatch-subagents',
      'skill:subagent-orchestration',
    ]) {
      expect(utility.assets.some((asset) => asset.id === id)).toBe(true);
      expect(research.assets.some((asset) => asset.id === id)).toBe(false);
    }
  });

  it('validates same-scope selected-asset dependency declarations', () => {
    const utility = fixture({
      name: 'utility',
      assets: [
        {
          ...fixture().assets[0],
          id: 'skill:oat-dispatch-subagents',
          source: 'skills/oat-dispatch-subagents',
          destination: '.agents/skills/oat-dispatch-subagents',
        },
        {
          ...fixture().assets[0],
          id: 'skill:subagent-orchestration',
          source: 'skills/subagent-orchestration',
          destination: '.agents/skills/subagent-orchestration',
        },
      ],
    });
    const research = fixture({
      name: 'research',
      dependencies: [
        {
          pack: 'utility',
          scope: 'same',
          assets: [
            'skill:oat-dispatch-subagents',
            'skill:subagent-orchestration',
          ],
        },
      ],
    });

    expect(() => validatePackManifest([utility, research])).not.toThrow();
    expect(() =>
      validatePackManifest([
        utility,
        {
          ...research,
          dependencies: [
            { pack: 'docs', scope: 'same', assets: ['skill:missing'] },
          ],
        },
      ]),
    ).toThrow(/unknown dependency pack/i);
    expect(() =>
      validatePackManifest([
        utility,
        {
          ...research,
          dependencies: [
            { pack: 'utility', scope: 'same', assets: ['skill:missing'] },
          ],
        },
      ]),
    ).toThrow(/unknown dependency asset/i);
    expect(() =>
      validatePackManifest([
        utility,
        {
          ...research,
          dependencies: [
            {
              pack: 'utility',
              scope: 'project' as 'same',
              assets: ['skill:oat-dispatch-subagents'],
            },
          ],
        },
      ]),
    ).toThrow(/same scope/i);
    expect(() =>
      validatePackManifest([
        utility,
        {
          ...research,
          dependencies: [
            {
              pack: 'utility',
              scope: 'same',
              assets: ['skill:oat-dispatch-subagents'],
            },
            {
              pack: 'utility',
              scope: 'same',
              assets: ['skill:oat-dispatch-subagents'],
            },
          ],
        },
      ]),
    ).toThrow(/duplicate dependency edge/i);
  });

  it('rejects dependency cycles', () => {
    expect(() =>
      validatePackManifest([
        fixture({
          name: 'ideas',
          dependencies: [
            { pack: 'docs', scope: 'same', assets: ['fixture-docs'] },
          ],
        }),
        fixture({
          name: 'docs',
          assets: [
            {
              ...fixture().assets[0],
              id: 'fixture-docs',
              source: 'skills/fixture-docs',
              destination: '.agents/skills/fixture-docs',
            },
          ],
          dependencies: [
            { pack: 'ideas', scope: 'same', assets: ['fixture-skill'] },
          ],
        }),
      ]),
    ).toThrow(/dependency cycle/i);
  });

  it('allows user materialization only for managed user-scope agents', () => {
    const materializable = {
      ...fixture().assets[0],
      id: 'agent:fixture.md',
      kind: 'agent' as const,
      source: 'agents/fixture.md',
      destination: '.agents/agents/fixture.md',
      userMaterializable: true,
    };
    expect(() =>
      validatePackManifest([fixture({ assets: [materializable] })]),
    ).not.toThrow();
    expect(() =>
      validatePackManifest([
        fixture({
          assets: [{ ...materializable, kind: 'skill' }],
        }),
      ]),
    ).toThrow(/user materializable.*agent/i);
    expect(() =>
      validatePackManifest([
        fixture({
          allowedScopes: ['project'],
          defaultScope: 'project',
          assets: [
            {
              ...materializable,
              scopes: ['project'],
              ownership: { project: 'managed' },
            },
          ],
        }),
      ]),
    ).toThrow(/user materializable.*user scope/i);
  });
});
