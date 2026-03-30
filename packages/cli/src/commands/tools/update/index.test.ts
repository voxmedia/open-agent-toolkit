import { describe, expect, it } from 'vitest';

import { formatUpdatedToolMessage, shouldRefreshCoreDocs } from './index';
import type { UpdateResult, UpdateTarget } from './update-tools';

function createResult(overrides: Partial<UpdateResult> = {}): UpdateResult {
  return {
    updated: [],
    current: [],
    newer: [],
    notInstalled: [],
    notBundled: [],
    ...overrides,
  };
}

describe('shouldRefreshCoreDocs', () => {
  it('refreshes for an explicit core-pack update', () => {
    const target: UpdateTarget = { kind: 'pack', pack: 'core' };

    expect(shouldRefreshCoreDocs(target, createResult())).toBe(true);
  });

  it('refreshes for --all when the core pack is present in the update result', () => {
    const target: UpdateTarget = { kind: 'all' };
    const result = createResult({
      current: [
        {
          name: 'oat-docs',
          type: 'skill',
          scope: 'user',
          version: '1.0.0',
          bundledVersion: '1.0.0',
          pack: 'core',
          status: 'current',
        },
      ],
    });

    expect(shouldRefreshCoreDocs(target, result)).toBe(true);
  });

  it('does not refresh for --all when the core pack is absent', () => {
    const target: UpdateTarget = { kind: 'all' };
    const result = createResult({
      updated: [
        {
          name: 'oat-idea-new',
          type: 'skill',
          scope: 'project',
          version: '1.0.0',
          bundledVersion: '2.0.0',
          pack: 'ideas',
          status: 'outdated',
        },
      ],
    });

    expect(shouldRefreshCoreDocs(target, result)).toBe(false);
  });
});

describe('formatUpdatedToolMessage', () => {
  it('reports synthesized pack members as installs', () => {
    expect(
      formatUpdatedToolMessage(
        {
          name: 'oat-idea-ideate',
          type: 'skill',
          scope: 'project',
          version: null,
          bundledVersion: null,
          pack: 'ideas',
          status: 'outdated',
        },
        false,
      ),
    ).toBe('Installed: oat-idea-ideate');
  });

  it('reports ordinary bundled updates with versions', () => {
    expect(
      formatUpdatedToolMessage(
        {
          name: 'oat-idea-new',
          type: 'skill',
          scope: 'project',
          version: '1.0.0',
          bundledVersion: '2.0.0',
          pack: 'ideas',
          status: 'outdated',
        },
        false,
      ),
    ).toBe('Updated: oat-idea-new (1.0.0 -> 2.0.0)');
  });
});
