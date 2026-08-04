import { constants } from 'node:fs';
import { open, readdir, rm } from 'node:fs/promises';
import { join } from 'node:path';

import { ValidationStore } from './validation-store';

export const DEFAULT_VALIDATION_TTL_MS = 2 * 60 * 60 * 1_000;
export const MIN_VALIDATION_TTL_MS = 30 * 60 * 1_000;
export const MAX_VALIDATION_TTL_MS = 4 * 60 * 60 * 1_000;
export const DEFAULT_REAPER_SCAN_LIMIT = 128;

export function computeValidationTtlMs(outerBudgetMs: number | null): number {
  if (outerBudgetMs === null) return DEFAULT_VALIDATION_TTL_MS;
  if (!Number.isSafeInteger(outerBudgetMs) || outerBudgetMs < 0) {
    throw new Error('outer budget must be a non-negative safe integer');
  }
  return Math.min(
    MAX_VALIDATION_TTL_MS,
    Math.max(MIN_VALIDATION_TTL_MS, outerBudgetMs * 2),
  );
}

export async function reapExpiredValidationState(
  store: ValidationStore,
  options: { now?: Date; maxEntries?: number } = {},
): Promise<{ scanned: number; deleted: number }> {
  const now = options.now ?? new Date();
  const maxEntries = options.maxEntries ?? DEFAULT_REAPER_SCAN_LIMIT;
  if (!Number.isSafeInteger(maxEntries) || maxEntries < 0) {
    throw new Error('reaper entry limit must be a non-negative safe integer');
  }
  let entries;
  try {
    entries = await readdir(store.root, { withFileTypes: true });
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'ENOENT'
    ) {
      return { scanned: 0, deleted: 0 };
    }
    throw error;
  }

  let scanned = 0;
  let deleted = 0;
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (scanned >= maxEntries) break;
    if (entry.isDirectory() && entry.name.startsWith('run-')) {
      scanned++;
      const runId = entry.name.slice(4);
      try {
        if (await store.deleteRunIfExpired(runId, now)) deleted++;
      } catch {
        // Corrupt or unsafe entries are not followed or removed by the reaper.
      }
    } else if (
      entry.isFile() &&
      (entry.name.startsWith('terminal-') ||
        entry.name.startsWith('diagnostic-')) &&
      entry.name.endsWith('.json')
    ) {
      scanned++;
      const path = join(store.root, entry.name);
      try {
        const handle = await open(
          path,
          constants.O_RDONLY |
            ('O_NOFOLLOW' in constants ? constants.O_NOFOLLOW : 0),
        );
        try {
          const info = await handle.stat();
          const value = JSON.parse(await handle.readFile('utf8')) as {
            expiresAt?: unknown;
          };
          if (
            info.isFile() &&
            info.nlink === 1 &&
            typeof value.expiresAt === 'string' &&
            Date.parse(value.expiresAt) <= now.getTime()
          ) {
            await rm(path, { force: true });
            deleted++;
          }
        } finally {
          await handle.close();
        }
      } catch {
        // Ignore malformed retained receipts and continue the bounded sweep.
      }
    }
  }
  return { scanned, deleted };
}
