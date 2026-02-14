import { rename } from 'node:fs/promises';
import { basename, dirname, relative, resolve } from 'node:path';
import { createSymlink, ensureDir } from '../../fs/io';
import { computeDirectoryHash } from '../../manifest/hash';
import { addEntry } from '../../manifest/manager';
import type { Manifest, ManifestEntry } from '../../manifest/manifest.types';

interface StrayAdoptionCandidate {
  provider: string;
  report: {
    providerPath: string;
  };
  mapping: {
    canonicalDir: string;
    contentType: ManifestEntry['contentType'];
  };
}

function normalizePath(pathValue: string): string {
  return pathValue.replaceAll('\\', '/');
}

export async function adoptStrayToCanonical<
  TCandidate extends StrayAdoptionCandidate,
>(scopeRoot: string, stray: TCandidate, manifest: Manifest): Promise<Manifest> {
  const providerAbsolutePath = resolve(scopeRoot, stray.report.providerPath);
  const entryName = basename(stray.report.providerPath);
  const canonicalAbsolutePath = resolve(
    scopeRoot,
    stray.mapping.canonicalDir,
    entryName,
  );

  await ensureDir(dirname(canonicalAbsolutePath));
  await rename(providerAbsolutePath, canonicalAbsolutePath);
  const strategy = await createSymlink(
    canonicalAbsolutePath,
    providerAbsolutePath,
  );

  const canonicalPath = normalizePath(
    relative(scopeRoot, canonicalAbsolutePath),
  );
  const providerPath = normalizePath(relative(scopeRoot, providerAbsolutePath));
  const manifestEntry: ManifestEntry = {
    canonicalPath,
    providerPath,
    provider: stray.provider,
    contentType: stray.mapping.contentType,
    strategy,
    contentHash:
      strategy === 'copy'
        ? await computeDirectoryHash(canonicalAbsolutePath)
        : null,
    lastSynced: new Date().toISOString(),
  };

  return addEntry(manifest, manifestEntry);
}
