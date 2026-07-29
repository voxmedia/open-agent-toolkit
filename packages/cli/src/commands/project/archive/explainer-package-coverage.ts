import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { CliError } from '@errors/cli-error';
import { resolveAssetsRoot } from '@fs/assets';

const PACKAGE_COVERAGE_VERSION = 'explainer-kit.package-coverage/v1';

export interface ExplainerPackageCoverage {
  PACKAGE_COVERAGE_VERSION: typeof PACKAGE_COVERAGE_VERSION;
  requiredImmutablePackagePaths: (
    manifest: unknown,
    options?: { runMode?: 'interactive' | 'unattended' },
  ) => string[];
}

let cachedCoverage: Promise<ExplainerPackageCoverage> | undefined;

export function loadExplainerPackageCoverage(): Promise<ExplainerPackageCoverage> {
  cachedCoverage ??= loadGeneratedCoverage();
  return cachedCoverage;
}

async function loadGeneratedCoverage(): Promise<ExplainerPackageCoverage> {
  const assetsRoot = await resolveAssetsRoot();
  const modulePath = join(
    assetsRoot,
    'skills',
    'explainer-kit',
    'scripts',
    'lib',
    'package-coverage.mjs',
  );
  let loaded: Record<string, unknown>;
  try {
    loaded = (await import(pathToFileURL(modulePath).href)) as Record<
      string,
      unknown
    >;
  } catch (error) {
    throw new CliError(
      `Bundled explainer package coverage could not be loaded: ${error instanceof Error ? error.message : String(error)}`,
      2,
    );
  }
  if (
    loaded.PACKAGE_COVERAGE_VERSION !== PACKAGE_COVERAGE_VERSION ||
    typeof loaded.requiredImmutablePackagePaths !== 'function'
  ) {
    throw new CliError(
      `Bundled assets must provide ${PACKAGE_COVERAGE_VERSION} package coverage.`,
      2,
    );
  }
  return loaded as unknown as ExplainerPackageCoverage;
}
