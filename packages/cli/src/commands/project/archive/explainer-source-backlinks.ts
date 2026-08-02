import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { CliError } from '@errors/cli-error';
import { resolveAssetsRoot } from '@fs/assets';

const SOURCE_BACKLINK_CONTRACT_VERSION = 'explainer-kit.source-backlinks/v1';

export interface CanonicalSourceBacklink {
  repository: string;
  revision: string;
  path: string;
  lineRange: { start: number; end: number };
  url: string;
}

export interface ExplainerSourceBacklinks {
  SOURCE_BACKLINK_CONTRACT_VERSION: typeof SOURCE_BACKLINK_CONTRACT_VERSION;
  parseCanonicalGithubBlobUrl: (value: string) => CanonicalSourceBacklink;
}

let cachedBacklinks: Promise<ExplainerSourceBacklinks> | undefined;

export function loadExplainerSourceBacklinks(): Promise<ExplainerSourceBacklinks> {
  cachedBacklinks ??= loadGeneratedBacklinks();
  return cachedBacklinks;
}

async function loadGeneratedBacklinks(): Promise<ExplainerSourceBacklinks> {
  const assetsRoot = await resolveAssetsRoot();
  const modulePath = join(
    assetsRoot,
    'skills',
    'explainer-kit',
    'scripts',
    'lib',
    'source-backlinks.mjs',
  );
  let loaded: Record<string, unknown>;
  try {
    loaded = (await import(pathToFileURL(modulePath).href)) as Record<
      string,
      unknown
    >;
  } catch (error) {
    throw new CliError(
      `Bundled explainer source backlink contract could not be loaded: ${error instanceof Error ? error.message : String(error)}`,
      2,
    );
  }
  if (
    loaded.SOURCE_BACKLINK_CONTRACT_VERSION !==
      SOURCE_BACKLINK_CONTRACT_VERSION ||
    typeof loaded.parseCanonicalGithubBlobUrl !== 'function'
  ) {
    throw new CliError(
      `Bundled assets must provide ${SOURCE_BACKLINK_CONTRACT_VERSION}.`,
      2,
    );
  }
  return loaded as unknown as ExplainerSourceBacklinks;
}
