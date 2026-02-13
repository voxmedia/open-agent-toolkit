import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { CliError } from '../errors';
import {
  type Manifest,
  type ManifestEntry,
  ManifestSchema,
} from './manifest.types';

const OAT_VERSION = '0.0.1';

function nowIso(): string {
  return new Date().toISOString();
}

export function createEmptyManifest(): Manifest {
  return {
    version: 1,
    oatVersion: OAT_VERSION,
    entries: [],
    lastUpdated: nowIso(),
  };
}

export async function loadManifest(manifestPath: string): Promise<Manifest> {
  try {
    const raw = await readFile(manifestPath, 'utf8');

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new CliError(
        `Manifest at ${manifestPath} is not valid JSON. Delete or repair the file and retry.`,
      );
    }

    const result = ManifestSchema.safeParse(parsed);
    if (!result.success) {
      throw new CliError(
        `Manifest at ${manifestPath} failed validation. Delete or repair the file and retry.`,
      );
    }

    return result.data;
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'ENOENT'
    ) {
      return createEmptyManifest();
    }

    if (error instanceof CliError) {
      throw error;
    }

    throw new CliError(
      `Failed to read manifest at ${manifestPath}: ${
        error instanceof Error ? error.message : 'unknown error'
      }`,
      2,
    );
  }
}

export async function saveManifest(
  manifestPath: string,
  manifest: Manifest,
): Promise<void> {
  const validated = ManifestSchema.parse(manifest);
  const dir = dirname(manifestPath);
  const tempPath = `${manifestPath}.tmp`;

  await mkdir(dir, { recursive: true });
  await writeFile(tempPath, `${JSON.stringify(validated, null, 2)}\n`, 'utf8');
  await rename(tempPath, manifestPath);
}

export function findEntry(
  manifest: Manifest,
  canonicalPath: string,
  provider: string,
): ManifestEntry | undefined {
  return manifest.entries.find(
    (entry) =>
      entry.canonicalPath === canonicalPath && entry.provider === provider,
  );
}

export function addEntry(manifest: Manifest, entry: ManifestEntry): Manifest {
  const nextEntries = manifest.entries.filter(
    (candidate) =>
      !(
        candidate.canonicalPath === entry.canonicalPath &&
        candidate.provider === entry.provider
      ),
  );

  return {
    ...manifest,
    entries: [...nextEntries, entry],
    lastUpdated: nowIso(),
  };
}

export function removeEntry(
  manifest: Manifest,
  canonicalPath: string,
  provider: string,
): Manifest {
  const nextEntries = manifest.entries.filter(
    (entry) =>
      !(entry.canonicalPath === canonicalPath && entry.provider === provider),
  );

  if (nextEntries.length === manifest.entries.length) {
    return manifest;
  }

  return {
    ...manifest,
    entries: nextEntries,
    lastUpdated: nowIso(),
  };
}
