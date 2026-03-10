import { createLoggerCapture } from '@commands/__tests__/helpers';
import { describe, expect, it } from 'vitest';

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
    });
  });
});
