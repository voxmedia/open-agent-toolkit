import type { ConcreteScope } from '@shared/types';
import type { CliLogger } from '@ui/logger';

export interface AutoSyncDependencies {
  runSync: (options: {
    scope: ConcreteScope;
    cwd: string;
    home: string;
  }) => Promise<void>;
}

export interface AutoSyncResult {
  synced: boolean;
  scopes: ConcreteScope[];
  error: string | null;
}

export async function autoSync(
  scopes: ConcreteScope[],
  cwd: string,
  home: string,
  logger: CliLogger,
  dependencies: AutoSyncDependencies,
): Promise<AutoSyncResult> {
  if (scopes.length === 0) {
    return { synced: false, scopes: [], error: null };
  }

  try {
    for (const scope of scopes) {
      await dependencies.runSync({ scope, cwd, home });
    }
    logger.info('Auto-sync completed.');
    return { synced: true, scopes, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.warn(`Auto-sync failed: ${message}`);
    return { synced: false, scopes, error: message };
  }
}
