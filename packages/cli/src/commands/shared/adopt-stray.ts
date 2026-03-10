import {
  access,
  readFile,
  rename,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises';
import { basename, dirname, relative, resolve } from 'node:path';

import { renderCanonicalAgentMarkdown } from '@agents/canonical';
import { CliError } from '@errors/index';
import { createSymlink, ensureDir } from '@fs/io';
import { toPosixPath } from '@fs/paths';
import { computeContentHash } from '@manifest/hash';
import { addEntry } from '@manifest/manager';
import type { Manifest, ManifestEntry } from '@manifest/manifest.types';
import { importCanonicalAgentFromCodexRole } from '@providers/codex/codec/import-from-codex';

interface StrayAdoptionCandidate {
  provider: string;
  report: {
    providerPath: string;
  };
  mapping: {
    canonicalDir: string;
    contentType: ManifestEntry['contentType'];
  };
  adoption?: {
    kind: 'codex_role';
    roleName: string;
    description?: string;
  };
}

interface AdoptStrayOptions {
  replaceCanonical?: boolean;
}

export function isAdoptionConflictError(error: unknown): error is CliError {
  return error instanceof CliError && error.message.startsWith('Cannot adopt ');
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
>(
  scopeRoot: string,
  stray: TCandidate,
  manifest: Manifest,
  options: AdoptStrayOptions = {},
): Promise<Manifest> {
  if (stray.adoption?.kind === 'codex_role') {
    return adoptCodexRoleStrayToCanonical(scopeRoot, stray, manifest, options);
  }

  const providerAbsolutePath = resolve(scopeRoot, stray.report.providerPath);
  const providerStat = await stat(providerAbsolutePath);
  const isFile = providerStat.isFile();
  const entryName = basename(stray.report.providerPath);
  const canonicalAbsolutePath = resolve(
    scopeRoot,
    stray.mapping.canonicalDir,
    entryName,
  );

  await ensureDir(dirname(canonicalAbsolutePath));
  const canonicalAlreadyExists = await pathExists(canonicalAbsolutePath);

  if (canonicalAlreadyExists) {
    const canonicalHash = await computeContentHash(
      canonicalAbsolutePath,
      isFile,
    );
    const providerHash = await computeContentHash(providerAbsolutePath, isFile);

    if (canonicalHash !== providerHash) {
      if (options.replaceCanonical) {
        await rm(canonicalAbsolutePath, { recursive: true, force: true });
        await rename(providerAbsolutePath, canonicalAbsolutePath);
      } else {
        throw new CliError(
          `Cannot adopt ${toPosixPath(
            relative(scopeRoot, providerAbsolutePath),
          )}: canonical path ${toPosixPath(
            relative(scopeRoot, canonicalAbsolutePath),
          )} already exists with different content.`,
        );
      }
    } else {
      await rm(providerAbsolutePath, { recursive: true, force: true });
    }
  } else {
    await rename(providerAbsolutePath, canonicalAbsolutePath);
  }

  const strategy = await createSymlink(
    canonicalAbsolutePath,
    providerAbsolutePath,
    undefined,
    isFile,
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
        ? await computeContentHash(canonicalAbsolutePath, isFile)
        : null,
    isFile,
    lastSynced: new Date().toISOString(),
  };

  return addEntry(manifest, manifestEntry);
}

async function adoptCodexRoleStrayToCanonical<
  TCandidate extends StrayAdoptionCandidate,
>(
  scopeRoot: string,
  stray: TCandidate,
  manifest: Manifest,
  options: AdoptStrayOptions,
): Promise<Manifest> {
  const roleName = stray.adoption?.roleName;
  if (!roleName) {
    throw new CliError('Cannot adopt Codex stray without role metadata.');
  }

  const providerAbsolutePath = resolve(scopeRoot, stray.report.providerPath);
  const providerContent = await readFile(providerAbsolutePath, 'utf8');
  const imported = importCanonicalAgentFromCodexRole({
    roleName,
    roleContent: providerContent,
    description: stray.adoption?.description,
  });
  const canonicalContent = renderCanonicalAgentMarkdown(imported);
  const canonicalAbsolutePath = resolve(
    scopeRoot,
    stray.mapping.canonicalDir,
    `${roleName}.md`,
  );

  await ensureDir(dirname(canonicalAbsolutePath));
  const canonicalAlreadyExists = await pathExists(canonicalAbsolutePath);

  if (canonicalAlreadyExists) {
    const existing = await readFile(canonicalAbsolutePath, 'utf8');
    if (existing.trimEnd() !== canonicalContent.trimEnd()) {
      if (!options.replaceCanonical) {
        throw new CliError(
          `Cannot adopt ${toPosixPath(
            relative(scopeRoot, providerAbsolutePath),
          )}: canonical path ${toPosixPath(
            relative(scopeRoot, canonicalAbsolutePath),
          )} already exists with different content.`,
        );
      }
    }
  }

  await writeFile(canonicalAbsolutePath, canonicalContent, 'utf8');
  return manifest;
}
