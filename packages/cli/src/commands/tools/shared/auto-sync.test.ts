import { createLoggerCapture } from '@commands/__tests__/helpers';
import { describe, expect, it, vi } from 'vitest';

import { type AutoSyncDependencies, autoSync } from './auto-sync';

describe('autoSync', () => {
  it('triggers sync for affected scopes', async () => {
    const synced: string[] = [];
    const deps: AutoSyncDependencies = {
      runSync: async ({ scope }) => {
        synced.push(scope);
      },
    };
    const capture = createLoggerCapture();

    const result = await autoSync(
      ['project', 'user'],
      '/cwd',
      '/home',
      capture.logger,
      deps,
    );

    expect(result.synced).toBe(true);
    expect(result.scopes).toEqual(['project', 'user']);
    expect(result.error).toBeNull();
    expect(synced).toEqual(['project', 'user']);
    expect(capture.info.some((l) => l.includes('Auto-sync completed'))).toBe(
      true,
    );
  });

  it('catches sync failures and logs warning', async () => {
    const deps: AutoSyncDependencies = {
      runSync: async () => {
        throw new Error('sync broke');
      },
    };
    const capture = createLoggerCapture();

    const result = await autoSync(
      ['project'],
      '/cwd',
      '/home',
      capture.logger,
      deps,
    );

    expect(result.synced).toBe(false);
    expect(result.error).toBe('sync broke');
    expect(capture.warn.some((l) => l.includes('Auto-sync failed'))).toBe(true);
  });

  it('skips sync when no scopes provided', async () => {
    const deps: AutoSyncDependencies = {
      runSync: async () => {
        throw new Error('should not be called');
      },
    };
    const capture = createLoggerCapture();

    const result = await autoSync([], '/cwd', '/home', capture.logger, deps);

    expect(result.synced).toBe(false);
    expect(result.scopes).toEqual([]);
    expect(result.error).toBeNull();
  });

  it('includes sync result in return value', async () => {
    const deps: AutoSyncDependencies = {
      runSync: async () => {
        // no-op for success path
      },
    };
    const capture = createLoggerCapture();

    const result = await autoSync(
      ['project'],
      '/cwd',
      '/home',
      capture.logger,
      deps,
    );

    expect(result).toEqual({
      synced: true,
      scopes: ['project'],
      error: null,
      // A dependency that returns nothing still records that the scope ran;
      // the evidence is empty rather than absent.
      evidence: [
        {
          scope: 'project',
          ran: true,
          failedOperations: 0,
          operationResults: [],
          extensionResults: [],
          refreshAdvice: [],
        },
      ],
    });
  });

  it('returns the evidence a sync run reports on success', async () => {
    const deps: AutoSyncDependencies = {
      runSync: async ({ scope }) => ({
        scope,
        ran: true,
        failedOperations: 0,
        operationResults: [
          {
            provider: 'claude',
            scope,
            contentKind: 'skill' as const,
            asset: '.agents/skills/analyze',
            status: 'changed' as const,
          },
        ],
        extensionResults: [],
        refreshAdvice: [],
      }),
    };
    const capture = createLoggerCapture();

    const result = await autoSync(
      ['project'],
      '/cwd',
      '/home',
      capture.logger,
      deps,
    );

    expect(result.synced).toBe(true);
    expect(result.evidence[0]?.operationResults).toEqual([
      {
        provider: 'claude',
        scope: 'project',
        contentKind: 'skill',
        asset: '.agents/skills/analyze',
        status: 'changed',
      },
    ]);
  });

  it('preserves evidence collected before a failing scope', async () => {
    const deps: AutoSyncDependencies = {
      runSync: async ({ scope }) => {
        if (scope === 'user') throw new Error('sync exploded');
        return {
          scope,
          ran: true,
          failedOperations: 0,
          operationResults: [
            {
              provider: 'claude',
              scope,
              contentKind: 'skill' as const,
              asset: '.agents/skills/analyze',
              status: 'changed' as const,
            },
          ],
          extensionResults: [],
          refreshAdvice: [],
        };
      },
    };
    const capture = createLoggerCapture();

    const result = await autoSync(
      ['project', 'user'],
      '/cwd',
      '/home',
      capture.logger,
      deps,
    );

    expect(result.synced).toBe(false);
    expect(result.error).toBe('sync exploded');
    // The project scope did run: discarding its evidence would report a
    // reachable provider as unknown.
    expect(result.evidence).toHaveLength(1);
    expect(result.evidence[0]?.scope).toBe('project');
  });

  it('forwards installed canonical paths to sync', async () => {
    const synced: Array<{ scope: string; installedCanonicalPaths?: string[] }> =
      [];
    const deps: AutoSyncDependencies = {
      runSync: async ({ scope, installedCanonicalPaths }) => {
        synced.push({ scope, installedCanonicalPaths });
      },
    };
    const capture = createLoggerCapture();

    await autoSync(['project'], '/cwd', '/home', capture.logger, deps, {
      installedCanonicalPaths: ['.agents/skills/oat-docs-analyze'],
    });

    expect(synced).toEqual([
      {
        scope: 'project',
        installedCanonicalPaths: ['.agents/skills/oat-docs-analyze'],
      },
    ]);
  });

  it('keeps one canonical install input for every affected scope', async () => {
    const calls: string[][] = [];
    await autoSync(
      ['project', 'user'],
      '/cwd',
      '/home',
      createLoggerCapture().logger,
      {
        runSync: async ({ installedCanonicalPaths }) => {
          calls.push(installedCanonicalPaths ?? []);
        },
      },
      { installedCanonicalPaths: ['.agents/skills/oat-brainstorm'] },
    );
    expect(calls).toEqual([
      ['.agents/skills/oat-brainstorm'],
      ['.agents/skills/oat-brainstorm'],
    ]);
  });

  it('forwards exact removed canonical paths without changing install filters', async () => {
    const runSync = vi.fn(async () => {});
    await autoSync(
      ['user'],
      '/cwd',
      '/home',
      createLoggerCapture().logger,
      { runSync },
      { removedCanonicalPaths: ['.agents/agents/oat-reviewer.md'] },
    );
    expect(runSync).toHaveBeenCalledWith(
      expect.objectContaining({
        scope: 'user',
        installedCanonicalPaths: undefined,
        removedCanonicalPaths: ['.agents/agents/oat-reviewer.md'],
      }),
    );
  });
});

describe('autoSync failure without a thrown error', () => {
  it('reports a failed sync and keeps the evidence that names the failure', async () => {
    const deps: AutoSyncDependencies = {
      runSync: async ({ scope }) => ({
        scope,
        ran: true,
        failedOperations: 2,
        operationResults: [
          {
            provider: 'codex',
            scope,
            contentKind: 'agent' as const,
            asset: 'reviewer',
            status: 'failed' as const,
            failure: 'permission denied',
          },
        ],
        extensionResults: [],
        refreshAdvice: [],
      }),
    };
    const capture = createLoggerCapture();

    const result = await autoSync(
      ['user'],
      '/cwd',
      '/home',
      capture.logger,
      deps,
    );

    // A sync that fails without throwing must not report success.
    expect(result.synced).toBe(false);
    expect(result.error).toContain('2 failed operation(s)');
    // The evidence is what emits `provider-materialization-failed`, so a
    // failure must never discard it.
    expect(result.evidence).toHaveLength(1);
    expect(result.evidence[0]?.operationResults[0]?.status).toBe('failed');
  });
});
