import type { PackName, ToolInfo } from '@commands/tools/shared/types';
import { describe, expect, it } from 'vitest';

import {
  buildPackInstallStateMap,
  buildPackInstallStateMapFromEvidence,
  buildPackInstallStateMapFromInventory,
  resolvePackInstallLocation,
} from './install-state';

function createTool(
  pack: PackName | 'custom',
  scope: ToolInfo['scope'],
  name: string,
  type: ToolInfo['type'] = 'skill',
): ToolInfo {
  return {
    name,
    type,
    scope,
    version: '1.0.0',
    bundledVersion: '1.0.0',
    pack,
    status: 'current',
  };
}

describe('resolvePackInstallLocation', () => {
  it('returns not-installed when a pack is absent in both scopes', () => {
    expect(resolvePackInstallLocation(false, false)).toBe('not-installed');
  });

  it('returns project or user when a pack is installed in one scope', () => {
    expect(resolvePackInstallLocation(true, false)).toBe('project');
    expect(resolvePackInstallLocation(false, true)).toBe('user');
  });

  it('returns both when a pack is installed in both scopes', () => {
    expect(resolvePackInstallLocation(true, true)).toBe('both');
  });
});

describe('buildPackInstallStateMapFromInventory', () => {
  it('preserves declared placement when all physical members are missing', () => {
    const result = buildPackInstallStateMapFromInventory(
      ['project-management'],
      [
        {
          pack: 'project-management',
          placement: 'user',
          diagnostics: [],
          scopes: [
            {
              pack: 'project-management',
              scope: 'user',
              intent: {
                pack: 'project-management',
                scope: 'user',
                enabled: true,
                source: 'declared',
                configPath: '/home/.oat/config.json',
                diagnostics: [],
              },
              completeness: 'absent',
              assets: [],
              diagnostics: [],
            },
          ],
        },
      ],
    );
    expect(result['project-management'].location).toBe('user');
  });

  it('does not restore placement from shared-only partial observations', () => {
    const result = buildPackInstallStateMapFromInventory(
      ['docs'],
      [
        {
          pack: 'docs',
          placement: 'unavailable',
          diagnostics: [
            {
              code: 'shared-owner-observation',
              message: 'shared only',
              paths: ['/home/.oat/scripts/resolve-tracking.sh'],
            },
          ],
          scopes: [
            {
              pack: 'docs',
              scope: 'user',
              intent: {
                pack: 'docs',
                scope: 'user',
                enabled: false,
                source: 'none',
                configPath: '/home/.oat/config.json',
                diagnostics: [],
              },
              completeness: 'partial',
              assets: [],
              diagnostics: [],
            },
          ],
        },
      ],
    );
    expect(result.docs.location).toBe('not-installed');
  });
});

describe('buildPackInstallStateMapFromEvidence', () => {
  it('does not turn declared-only intent into installed state', () => {
    const result = buildPackInstallStateMapFromEvidence(
      ['project-management'],
      [
        {
          schemaVersion: 1,
          pack: 'project-management',
          canonical: null,
          scopes: [],
          knownRealizedScopes: [],
          unknownScopes: [],
          realizedPlacement: 'none',
          providers: [],
          diagnostics: [],
        },
      ],
    );
    expect(result['project-management'].location).toBe('not-installed');
  });

  it('projects only verified realized scopes', () => {
    const result = buildPackInstallStateMapFromEvidence(
      ['ideas'],
      [
        {
          schemaVersion: 1,
          pack: 'ideas',
          canonical: null,
          scopes: [],
          knownRealizedScopes: ['user'],
          unknownScopes: ['project'],
          realizedPlacement: 'unknown',
          providers: [],
          diagnostics: [],
        },
      ],
    );
    expect(result.ideas.location).toBe('user');
  });
});

describe('buildPackInstallStateMap', () => {
  const packs = [
    'core',
    'ideas',
    'docs',
    'research',
  ] satisfies readonly PackName[];

  it('aggregates installed packs across project and user scopes', () => {
    const result = buildPackInstallStateMap(packs, [
      createTool('core', 'user', 'oat-docs'),
      createTool('ideas', 'project', 'oat-idea-new'),
      createTool('ideas', 'user', 'oat-idea-ideate'),
    ]);

    expect(result.core).toEqual({
      project: false,
      user: true,
      location: 'user',
    });
    expect(result.ideas).toEqual({
      project: true,
      user: true,
      location: 'both',
    });
    expect(result.docs).toEqual({
      project: false,
      user: false,
      location: 'not-installed',
    });
  });

  it('ignores custom packs and duplicate tools', () => {
    const result = buildPackInstallStateMap(packs, [
      createTool('custom', 'project', 'custom-skill'),
      createTool('docs', 'project', 'oat-docs-analyze'),
      createTool('docs', 'project', 'oat-docs-bootstrap'),
    ]);

    expect(result.docs).toEqual({
      project: true,
      user: false,
      location: 'project',
    });
    expect(result.core.location).toBe('not-installed');
    expect(result.ideas.location).toBe('not-installed');
  });

  it('treats agent-only entries as installed pack content', () => {
    const result = buildPackInstallStateMap(packs, [
      createTool('research', 'user', 'skeptical-evaluator.md', 'agent'),
    ]);

    expect(result.research).toEqual({
      project: false,
      user: true,
      location: 'user',
    });
  });
});
