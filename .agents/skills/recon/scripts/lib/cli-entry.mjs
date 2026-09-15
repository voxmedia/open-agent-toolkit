import { realpathSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export function isDirectExecution(moduleUrl, entryPath = process.argv[1]) {
  if (!entryPath) return false;
  try {
    return (
      realpathSync(fileURLToPath(moduleUrl)) ===
      realpathSync(resolve(entryPath))
    );
  } catch (error) {
    process.stderr.write(
      `Unable to resolve CLI entry path: ${error instanceof Error ? error.message : error}\n`,
    );
    process.exitCode = 2;
    return false;
  }
}
