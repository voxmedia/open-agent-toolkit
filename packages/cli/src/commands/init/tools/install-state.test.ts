import type { PackName, ToolInfo } from '@commands/tools/shared/types';
import { describe, expect, it } from 'vitest';

import {
  buildPackInstallStateMap,
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

describe('buildPackInstallStateMap', () => {
  const packs = ['core', 'ideas', 'docs'] satisfies readonly PackName[];

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
});
