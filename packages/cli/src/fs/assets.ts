import { stat } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { CliError } from '@errors/index';

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

  return assetsRoot;
}
