import type { ConcreteScope } from '@shared/types';
import type { CliLogger } from '@ui/logger';

import { emptySyncRunEvidence, type SyncRunEvidence } from './sync-evidence';

export interface AutoSyncDependencies {
  /**
   * Runs one scope's sync and returns its normalized evidence.
   *
   * The production implementation runs sync in-process and consumes the
   * evidence object directly; it does not spawn `oat sync --json` and parse
   * stdout. Returning `void` is still accepted so an injected test double or a
   * caller that only needs the success/failure signal stays valid.
   */
  runSync: (options: {
    scope: ConcreteScope;
    cwd: string;
    home: string;
    installedCanonicalPaths?: string[];
    removedCanonicalPaths?: string[];
  }) => Promise<SyncRunEvidence | void>;
}

export interface AutoSyncResult {
  synced: boolean;
  scopes: ConcreteScope[];
  error: string | null;
  /** One entry per scope the run reached, in the order it ran them. */
  evidence: readonly SyncRunEvidence[];
}

export interface AutoSyncOptions {
  installedCanonicalPaths?: string[];
  removedCanonicalPaths?: string[];
}

export async function autoSync(
  scopes: ConcreteScope[],
  cwd: string,
  home: string,
  logger: CliLogger,
  dependencies: AutoSyncDependencies,
  options?: AutoSyncOptions,
): Promise<AutoSyncResult> {
  if (scopes.length === 0) {
    return { synced: false, scopes: [], error: null, evidence: [] };
  }

  const evidence: SyncRunEvidence[] = [];
  try {
    for (const scope of scopes) {
      const result = await dependencies.runSync({
        scope,
        cwd,
        home,
        installedCanonicalPaths: options?.installedCanonicalPaths,
        removedCanonicalPaths: options?.removedCanonicalPaths,
      });
      evidence.push(result ?? { ...emptySyncRunEvidence(scope), ran: true });
    }
    // A sync can fail without throwing: `runSyncApply` reports failed
    // operations and returns normally. Treating that as success is what let a
    // failed sync print `Auto-sync completed.` and exit 0. The evidence is
    // kept either way so the failed provider rows survive.
    const failedOperations = evidence.reduce(
      (total, run) => total + run.failedOperations,
      0,
    );
    if (failedOperations > 0) {
      const message = `oat sync reported ${failedOperations} failed operation(s)`;
      logger.warn(`Auto-sync failed: ${message}`);
      return { synced: false, scopes, error: message, evidence };
    }
    logger.info('Auto-sync completed.');
    return { synced: true, scopes, error: null, evidence };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.warn(`Auto-sync failed: ${message}`);
    // Evidence collected before the failure is preserved: a two-scope run that
    // failed on the second scope still reached the first, and discarding that
    // would report a reachable provider as unknown.
    return { synced: false, scopes, error: message, evidence };
  }
}
