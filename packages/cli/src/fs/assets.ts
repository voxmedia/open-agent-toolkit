import type { Stats } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { CliError } from '@errors/index';
import { OAT_VERSION } from '@shared/oat-version';

interface BundleMetadata {
  schemaVersion: 1;
  oatVersion: string;
}

const BUNDLE_METADATA_FILENAME = 'bundle-metadata.json';

/**
 * Shared remedy sentence for every bundle-integrity failure. The wording is
 * unchanged from the metadata-only validator; binding it once keeps the
 * metadata, version, and structural families phrased identically so their
 * guidance cannot drift apart.
 */
const BUNDLE_REMEDY =
  'Reinstall @open-agent-toolkit/cli or rebuild the CLI before updating tools.';

/**
 * Top-level directories `packages/cli/scripts/bundle-assets.sh` creates for
 * every bundle, listed in the order that script creates them. The producer
 * makes all of them unconditionally — even when a category has no entries — so
 * their presence is the cheapest structural contract that tells a complete
 * bundle apart from a metadata-only or truncated one.
 *
 * This is deliberately a shape check and nothing more: no per-file manifest,
 * no checksums, and no walk of the bundled documents.
 */
const REQUIRED_BUNDLE_DIRECTORIES = [
  'skills',
  'agents',
  'templates',
  'scripts',
  'docs',
  'migration',
  'config',
] as const;

function isBundleMetadata(value: unknown): value is BundleMetadata {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const metadata = value as Record<string, unknown>;
  return (
    metadata.schemaVersion === 1 &&
    typeof metadata.oatVersion === 'string' &&
    metadata.oatVersion.length > 0
  );
}

function isMissingPathError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'ENOENT'
  );
}

/**
 * Reject a bundle whose top-level shape is incomplete.
 *
 * Reports the first offending path in producer order, so the diagnosis for a
 * given broken bundle is deterministic. A failed `stat` is never read as an
 * absent-but-tolerable directory: a path the process cannot read fails closed
 * under its own diagnosis instead of being reported as missing.
 */
async function validateBundleStructure(assetsRoot: string): Promise<void> {
  for (const directoryName of REQUIRED_BUNDLE_DIRECTORIES) {
    const directoryPath = join(assetsRoot, directoryName);
    let directoryStat: Stats;

    try {
      directoryStat = await stat(directoryPath);
    } catch (error) {
      if (isMissingPathError(error)) {
        throw new CliError(
          `Bundled assets are incomplete: required directory not found: ${directoryPath}. ${BUNDLE_REMEDY}`,
          2,
        );
      }

      throw new CliError(
        `Bundled assets are unreadable: required directory could not be read: ${directoryPath}. ${BUNDLE_REMEDY}`,
        2,
      );
    }

    if (!directoryStat.isDirectory()) {
      throw new CliError(
        `Bundled assets are incomplete: required bundle path is not a directory: ${directoryPath}. ${BUNDLE_REMEDY}`,
        2,
      );
    }
  }
}

/**
 * Fail closed on any bundle a consumer must not read as a legitimate install.
 *
 * Checks run in escalating specificity — metadata presence, metadata shape,
 * CLI version, then top-level structure — so malformed metadata remains the
 * primary diagnosis and a structural complaint is only reported about a bundle
 * whose metadata already agrees with the running CLI.
 */
export async function validateAssetsBundle(
  assetsRoot: string,
  expectedVersion = OAT_VERSION,
): Promise<void> {
  const metadataPath = join(assetsRoot, BUNDLE_METADATA_FILENAME);
  let rawMetadata: string;

  try {
    rawMetadata = await readFile(metadataPath, 'utf8');
  } catch {
    throw new CliError(
      `Bundled asset metadata not found: ${metadataPath}. ${BUNDLE_REMEDY}`,
      2,
    );
  }

  let metadata: unknown;
  try {
    metadata = JSON.parse(rawMetadata);
  } catch {
    throw new CliError(
      `Bundled asset metadata is invalid: ${metadataPath}. ${BUNDLE_REMEDY}`,
      2,
    );
  }

  if (!isBundleMetadata(metadata)) {
    throw new CliError(
      `Bundled asset metadata is invalid: ${metadataPath}. ${BUNDLE_REMEDY}`,
      2,
    );
  }

  if (metadata.oatVersion !== expectedVersion) {
    throw new CliError(
      `Bundled assets version mismatch: CLI ${expectedVersion}, assets ${metadata.oatVersion}. ${BUNDLE_REMEDY}`,
      2,
    );
  }

  await validateBundleStructure(assetsRoot);
}

function resolvePackagedAssetsRoot(): string {
  const modulePath = fileURLToPath(import.meta.url);
  const cliRoot = resolve(dirname(modulePath), '..', '..');
  return join(cliRoot, 'assets');
}

/**
 * Resolve the directory the CLI reads bundled assets from.
 *
 * A non-empty `OAT_ASSETS_DIR` selects an explicit root; an unset or blank
 * value keeps the packaged `<cliRoot>/assets` default. Both paths run the same
 * directory and bundle-integrity checks, and an explicit root never falls back
 * to the packaged one: a missing, non-directory, malformed, version-mismatched,
 * or structurally incomplete override fails closed with the same actionable
 * errors. A relative value is resolved against the process working directory.
 */
export async function resolveAssetsRoot(
  env: NodeJS.ProcessEnv = process.env,
): Promise<string> {
  const override = env.OAT_ASSETS_DIR?.trim() ?? '';
  const assetsRoot =
    override.length > 0 ? resolve(override) : resolvePackagedAssetsRoot();

  try {
    const assetsStat = await stat(assetsRoot);
    if (!assetsStat.isDirectory()) {
      throw new CliError(`Assets path is not a directory: ${assetsRoot}`, 2);
    }
  } catch (error) {
    if (error instanceof CliError) {
      throw error;
    }

    throw new CliError(
      `Assets directory not found: ${assetsRoot}. Run 'pnpm build' to generate bundled assets.`,
      2,
    );
  }

  await validateAssetsBundle(assetsRoot);

  return assetsRoot;
}
