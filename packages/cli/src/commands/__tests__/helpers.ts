/**
 * Shared CLI command-test helpers.
 *
 * Fake-cwd isolation: suites that set `cwd` to a nonexistent path such as
 * `/tmp/workspace` must inject every init/doctor dependency that writes the
 * filesystem or spawns git. At minimum, mock `applyOatCoreGitattributes` and
 * `checkSyncedProjects`. Leaving those on production implementations produces
 * CI-only `ENOENT` / `spawn git ENOENT` failures.
 */
import type { CliLogger } from '@ui/logger';

export interface LoggerCapture {
  info: string[];
  warn: string[];
  error: string[];
  success: string[];
  debug: string[];
  jsonPayloads: unknown[];
  logger: CliLogger;
}

export function createLoggerCapture(): LoggerCapture {
  const info: string[] = [];
  const warn: string[] = [];
  const error: string[] = [];
  const success: string[] = [];
  const debug: string[] = [];
  const jsonPayloads: unknown[] = [];

  return {
    info,
    warn,
    error,
    success,
    debug,
    jsonPayloads,
    logger: {
      debug(message) {
        debug.push(message);
      },
      info(message) {
        info.push(message);
      },
      warn(message) {
        warn.push(message);
      },
      error(message) {
        error.push(message);
      },
      success(message) {
        success.push(message);
      },
      json(payload) {
        jsonPayloads.push(payload);
      },
    },
  };
}
