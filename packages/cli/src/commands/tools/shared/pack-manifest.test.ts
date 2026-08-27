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
});
