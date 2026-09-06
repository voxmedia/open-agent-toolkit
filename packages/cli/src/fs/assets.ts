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
 * Where the assets root under validation came from.
 *
 * The packaged `<cliRoot>/assets` default and an operator-supplied
 * `OAT_ASSETS_DIR` fail exactly the same checks, but only the packaged one is
 * repairable by rebuilding or reinstalling this package. Carrying the source
 * into every fail-closed diagnosis is what keeps its remedy true.
 *
 * Exported only because it appears in the signature of the exported
 * `validateAssetsBundle` and this package emits declarations. It is an
 * internal context argument with a `packaged` default, not a new contract any
 * caller has to satisfy.
 */
export type AssetsRootSource = 'packaged' | 'override';

/**
 * Remedy for a packaged root that is absent or is not a directory. The
 * packaged tree is a build output, so the build is what creates it.
 */
const PACKAGED_ROOT_REMEDY = "Run 'pnpm build' to generate bundled assets.";

/**
 * Remedy for a packaged bundle whose contents are missing, malformed, or
 * built for another CLI version. Binding it once keeps the metadata, version,
 * and structural families phrased identically so their guidance cannot drift
 * apart.
 */
const PACKAGED_BUNDLE_REMEDY =
  'Reinstall @open-agent-toolkit/cli or rebuild the CLI before updating tools.';

/**
 * The single remedy for every failure under an explicit override. Neither a
 * rebuild nor a reinstall touches an operator-supplied path, so this sentence
 * names the one input the operator controls and the two properties it must
 * satisfy — complete, and built for the running CLI. It deliberately offers no
 * way to proceed on the packaged bundle instead: an explicit override never
 * falls back.
 */
const OVERRIDE_REMEDY =
  'Check OAT_ASSETS_DIR and point it to a complete asset bundle built for this CLI version.';

/**
 * The one place a fail-closed assets diagnosis turns its source into advice.
 *
 * Every branch keeps its own factual prefix — path, expected and actual
 * version, offending directory — and varies only this trailing sentence, so a
 * source-aware remedy can never quietly become a source-aware verdict.
 */
function assetsRemedy(
  source: AssetsRootSource,
  packagedRemedy: string = PACKAGED_BUNDLE_REMEDY,
): string {
  return source === 'override' ? OVERRIDE_REMEDY : packagedRemedy;
}

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

/**
 * The `errno` label of a failed filesystem call, or `unknown` when the thrown
 * value carries none. `EACCES`, `ELOOP`, and `EIO` demand different operator
 * responses and none of them is the remedy this validator can offer, so the
 * code is reported rather than collapsed into one unreadable-path verdict.
 */
function errorCode(error: unknown): string {
  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof error.code === 'string' &&
    error.code.length > 0
  ) {
    return error.code;
  }

  return 'unknown';
}

function isMissingPathError(error: unknown): boolean {
  return errorCode(error) === 'ENOENT';
}

/**
 * Reject a bundle whose top-level shape is incomplete.
 *
 * Reports the first offending path in producer order, so the diagnosis for a
 * given broken bundle is deterministic. A failed `stat` is never read as an
 * absent-but-tolerable directory: a path the process cannot read fails closed
 * under its own diagnosis, naming the `errno` that stopped it.
 */
async function validateBundleStructure(
  assetsRoot: string,
  source: AssetsRootSource,
): Promise<void> {
  for (const directoryName of REQUIRED_BUNDLE_DIRECTORIES) {
    const directoryPath = join(assetsRoot, directoryName);
    let directoryStat: Stats;

    try {
      directoryStat = await stat(directoryPath);
    } catch (error) {
      if (isMissingPathError(error)) {
        throw new CliError(
          `Bundled assets are incomplete: required directory not found: ${directoryPath}. ${assetsRemedy(source)}`,
          2,
        );
      }

      throw new CliError(
        `Bundled assets are unreadable: required directory could not be read (${errorCode(error)}): ${directoryPath}. ${assetsRemedy(source)}`,
        2,
      );
    }

    if (!directoryStat.isDirectory()) {
      throw new CliError(
        `Bundled assets are incomplete: required bundle path is not a directory: ${directoryPath}. ${assetsRemedy(source)}`,
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
 *
 * `source` only selects the remedy sentence. It defaults to `packaged` so
 * direct callers keep their existing rebuild/reinstall guidance, and it never
 * decides whether a bundle is acceptable.
 */
export async function validateAssetsBundle(
  assetsRoot: string,
  expectedVersion = OAT_VERSION,
  source: AssetsRootSource = 'packaged',
): Promise<void> {
  const metadataPath = join(assetsRoot, BUNDLE_METADATA_FILENAME);
  let rawMetadata: string;

  try {
    rawMetadata = await readFile(metadataPath, 'utf8');
  } catch {
    throw new CliError(
      `Bundled asset metadata not found: ${metadataPath}. ${assetsRemedy(source)}`,
      2,
    );
  }

  let metadata: unknown;
  try {
    metadata = JSON.parse(rawMetadata);
  } catch {
    throw new CliError(
      `Bundled asset metadata is invalid: ${metadataPath}. ${assetsRemedy(source)}`,
      2,
    );
  }

  if (!isBundleMetadata(metadata)) {
    throw new CliError(
      `Bundled asset metadata is invalid: ${metadataPath}. ${assetsRemedy(source)}`,
      2,
    );
  }

  if (metadata.oatVersion !== expectedVersion) {
    throw new CliError(
      `Bundled assets version mismatch: CLI ${expectedVersion}, assets ${metadata.oatVersion}. ${assetsRemedy(source)}`,
      2,
    );
  }

  await validateBundleStructure(assetsRoot, source);
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
 * errors. The override discriminator is derived once, here, and carried
 * through every one of those failures so each reports a remedy that applies to
 * the root it actually read. A relative value is resolved against the process
 * working directory.
 */
export async function resolveAssetsRoot(
  env: NodeJS.ProcessEnv = process.env,
): Promise<string> {
  const override = env.OAT_ASSETS_DIR?.trim() ?? '';
  const isOverride = override.length > 0;
  const source: AssetsRootSource = isOverride ? 'override' : 'packaged';
  const assetsRoot = isOverride
    ? resolve(override)
    : resolvePackagedAssetsRoot();

  try {
    const assetsStat = await stat(assetsRoot);
    if (!assetsStat.isDirectory()) {
      throw new CliError(
        `Assets path is not a directory: ${assetsRoot}. ${assetsRemedy(source, PACKAGED_ROOT_REMEDY)}`,
        2,
      );
    }
  } catch (error) {
    if (error instanceof CliError) {
      throw error;
    }

    throw new CliError(
      `Assets directory not found: ${assetsRoot}. ${assetsRemedy(source, PACKAGED_ROOT_REMEDY)}`,
      2,
    );
  }

  await validateAssetsBundle(assetsRoot, OAT_VERSION, source);

  return assetsRoot;
}
