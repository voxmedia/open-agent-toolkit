import type { CommandContext } from '@app/command-context';
import { runSyncInProcess } from '@commands/sync/index';
import type { CliLogger } from '@ui/logger';

import type { AutoSyncDependencies } from './auto-sync';
import { normalizeSyncEvidence } from './sync-evidence';

/**
 * Silent logger that captures the sync run's JSON payload.
 *
 * Auto-sync has never surfaced the child sync's output — the previous
 * subprocess implementation captured and discarded its stdout — so keeping
 * every channel silent preserves the lifecycle command's human output exactly
 * while making the evidence object available to the caller.
 */
function capturingSyncLogger(sink: { payload: unknown }): CliLogger {
  const noop = (): void => {};
  return {
    debug: noop,
    info: noop,
    warn: noop,
    error: noop,
    success: noop,
    json(payload) {
      sink.payload = payload;
    },
  };
}

/**
 * The production auto-sync seam for every pack lifecycle command.
 *
 * Runs sync in-process and consumes the evidence object the sync run already
 * builds, rather than spawning `oat sync --json` and parsing stdout. The
 * subprocess it replaces discarded that evidence entirely, which is why every
 * lifecycle outcome carried an empty provider array.
 */
export const inProcessSyncDependencies: AutoSyncDependencies = {
  runSync: async ({
    scope,
    cwd,
    home,
    installedCanonicalPaths,
    removedCanonicalPaths,
  }) => {
    const sink: { payload: unknown } = { payload: null };
    const context: CommandContext = {
      scope,
      dryRun: false,
      verbose: false,
      json: true,
      cwd,
      home,
      interactive: false,
      logger: capturingSyncLogger(sink),
    };
    // `runSyncApply` assigns `process.exitCode` for its own run. In a
    // subprocess that was the child's exit status and never reached the
    // parent command; in-process it would overwrite the parent's own result,
    // including resetting a failure to 0, so the parent's value is restored.
    //
    // That exit code is also the only signal sync gives for a run that failed
    // without throwing: `runSyncApply` sets 1 when operations failed and
    // returns normally. The subprocess this replaces surfaced that as an
    // `execFile` rejection, which auto-sync recorded as a failed sync. Reading
    // it before restoring keeps that contract instead of reporting a failed
    // sync as `Auto-sync completed.` with exit 0.
    const priorExitCode = process.exitCode;
    let syncExitCode: typeof process.exitCode;
    try {
      await runSyncInProcess(context, {
        ...(installedCanonicalPaths ? { installedCanonicalPaths } : {}),
        ...(removedCanonicalPaths ? { removedCanonicalPaths } : {}),
      });
      syncExitCode = process.exitCode;
    } finally {
      process.exitCode = priorExitCode;
    }
    const evidence = normalizeSyncEvidence(scope, sink.payload);
    // The failure is reported through the evidence rather than by throwing:
    // a throw would discard the very rows that describe which provider
    // failed, and those rows are what emit `provider-materialization-failed`.
    // A non-zero exit with no counted operation (a rejected collection is a
    // failure but not a planned operation) still records one.
    const exitedNonZero =
      typeof syncExitCode === 'number' && syncExitCode !== 0;
    return exitedNonZero && evidence.failedOperations === 0
      ? { ...evidence, failedOperations: 1 }
      : evidence;
  },
};
