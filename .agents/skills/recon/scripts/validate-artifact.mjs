#!/usr/bin/env node

import { realpathSync } from 'node:fs';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { validateArtifactShape } from './lib/contracts.mjs';
import {
  assertSafeExistingPath,
  assertSafeOutputPath,
} from './lib/safe-path.mjs';

export function validateArtifactValue(value) {
  return validateArtifactShape(value);
}

export async function validateArtifactFile(path) {
  try {
    const value = JSON.parse(await readFile(path, 'utf8'));
    return { ...validateArtifactValue(value), path: resolve(path) };
  } catch (error) {
    return {
      valid: false,
      path: resolve(path),
      errors: [
        {
          code: 'INVALID_JSON',
          message: error instanceof Error ? error.message : 'Invalid JSON',
          path: '$',
          severity: 'error',
        },
      ],
    };
  }
}

export async function quarantineInvalidArtifact(path, packetRoot, result) {
  if (result.valid) return null;
  const root = resolve(packetRoot);
  await assertSafeExistingPath(root, resolve(path));
  const quarantineRoot = join(root, 'raw', 'quarantine');
  await assertSafeOutputPath(root, quarantineRoot);
  await mkdir(quarantineRoot, { recursive: true });
  const target = join(quarantineRoot, `${basename(path)}.invalid`);
  await assertSafeOutputPath(root, target);
  await assertSafeOutputPath(root, `${target}.failure.json`);
  await rename(path, target);
  await writeFile(
    `${target}.failure.json`,
    `${JSON.stringify(
      {
        kind: 'recon.validation-failure',
        schemaVersion: 1,
        artifact: basename(path),
        errors: result.errors,
      },
      null,
      2,
    )}\n`,
    'utf8',
  );
  return target;
}

async function main(argv) {
  const args = [...argv];
  const quarantineIndex = args.indexOf('--quarantine-root');
  const quarantineRoot =
    quarantineIndex === -1 ? null : args.splice(quarantineIndex, 2)[1];
  const [path] = args;
  if (!path) {
    throw new Error(
      'Usage: validate-artifact.mjs <artifact.json> [--quarantine-root <packet-dir>]',
    );
  }
  const result = await validateArtifactFile(path);
  if (!result.valid && quarantineRoot) {
    result.quarantinedPath = await quarantineInvalidArtifact(
      path,
      quarantineRoot,
      result,
    );
  }
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  process.exitCode = result.valid ? 0 : 1;
}

/**
 * Direct invocation, compared as canonical paths on both sides. Comparing a raw
 * `process.argv[1]` against `import.meta.url` makes this script a silent no-op
 * that exits 0 whenever the skill is reached through a symlinked install root,
 * and canonicalizing only one side has the same effect under
 * `--preserve-symlinks-main`, which keeps the link in `import.meta.url`.
 * A path that cannot be canonicalized is not a module Node loaded as the entry
 * point, so a thrown `realpathSync` means "not invoked directly" and returns
 * `false`; it never masks a direct run.
 */
function isDirectInvocation(invokedPath) {
  if (!invokedPath) return false;
  try {
    return (
      realpathSync(fileURLToPath(import.meta.url)) ===
      realpathSync(resolve(invokedPath))
    );
  } catch {
    return false;
  }
}

if (isDirectInvocation(process.argv[1])) {
  main(process.argv.slice(2)).catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : error}\n`);
    process.exitCode = 2;
  });
}
