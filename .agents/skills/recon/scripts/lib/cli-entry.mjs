import { realpathSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Compare canonical paths on both sides so direct execution works through a
 * symlinked install root, including with `--preserve-symlinks-main`. A path
 * that cannot be canonicalized is not the loaded entry module, so resolution
 * failure returns false without masking a direct run.
 */
export function isDirectExecution(moduleUrl, entryPath = process.argv[1]) {
  if (!entryPath) return false;
  try {
    return (
      realpathSync(fileURLToPath(moduleUrl)) ===
      realpathSync(resolve(entryPath))
    );
  } catch {
    return false;
  }
}
