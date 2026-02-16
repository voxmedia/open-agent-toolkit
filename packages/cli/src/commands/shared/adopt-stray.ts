import { access, rename, rm } from 'node:fs/promises';
import { basename, dirname, relative, resolve } from 'node:path';
import { CliError } from '../../errors';
import { createSymlink, ensureDir } from '../../fs/io';
import { toPosixPath } from '../../fs/paths';
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

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
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
  const canonicalAlreadyExists = await pathExists(canonicalAbsolutePath);

  if (canonicalAlreadyExists) {
    const canonicalHash = await computeDirectoryHash(canonicalAbsolutePath);
    const providerHash = await computeDirectoryHash(providerAbsolutePath);

    if (canonicalHash !== providerHash) {
      throw new CliError(
        `Cannot adopt ${toPosixPath(
          relative(scopeRoot, providerAbsolutePath),
        )}: canonical path ${toPosixPath(
          relative(scopeRoot, canonicalAbsolutePath),
        )} already exists with different content.`,
      );
    }

    await rm(providerAbsolutePath, { recursive: true, force: true });
  } else {
    await rename(providerAbsolutePath, canonicalAbsolutePath);
  }

  const strategy = await createSymlink(
    canonicalAbsolutePath,
    providerAbsolutePath,
  );

  const canonicalPath = toPosixPath(relative(scopeRoot, canonicalAbsolutePath));
  const providerPath = toPosixPath(relative(scopeRoot, providerAbsolutePath));
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
