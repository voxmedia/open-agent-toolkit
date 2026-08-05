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
      `Bundled asset metadata not found: ${metadataPath}. Reinstall @open-agent-toolkit/cli or rebuild the CLI before updating tools.`,
      2,
    );
  }

  let metadata: unknown;
  try {
    metadata = JSON.parse(rawMetadata);
  } catch {
    throw new CliError(
      `Bundled asset metadata is invalid: ${metadataPath}. Reinstall @open-agent-toolkit/cli or rebuild the CLI before updating tools.`,
      2,
    );
  }

  if (!isBundleMetadata(metadata)) {
    throw new CliError(
      `Bundled asset metadata is invalid: ${metadataPath}. Reinstall @open-agent-toolkit/cli or rebuild the CLI before updating tools.`,
      2,
    );
  }

  if (metadata.oatVersion !== expectedVersion) {
    throw new CliError(
      `Bundled assets version mismatch: CLI ${expectedVersion}, assets ${metadata.oatVersion}. Reinstall @open-agent-toolkit/cli or rebuild the CLI before updating tools.`,
      2,
    );
  }
}

export async function resolveAssetsRoot(): Promise<string> {
  const modulePath = fileURLToPath(import.meta.url);
  const cliRoot = resolve(dirname(modulePath), '..', '..');
  const assetsRoot = join(cliRoot, 'assets');

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
