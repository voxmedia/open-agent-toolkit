import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

import { CliError } from '@errors/index';
import { OAT_VERSION } from '@shared/oat-version';

import {
  type Manifest,
  type ManifestEntry,
  type ManifestV2,
  ManifestSchema,
  ManifestV2Schema,
} from './manifest.types';

function formatIssuePath(path: (string | number)[]): string {
  if (path.length === 0) {
    return '(root)';
  }
  return path.map(String).join('.');
}

function nowIso(): string {
  return new Date().toISOString();
}

export function createEmptyManifest(): Manifest {
  return {
    version: 2,
    oatVersion: OAT_VERSION,
    entries: [],
    collections: [],
    lastUpdated: nowIso(),
  };
}

/**
 * Structured evidence that the CLI version recorded in a manifest differs from
 * the CLI version that is about to rewrite it.
 *
 * `saveManifest` unconditionally replaces `oatVersion` with `OAT_VERSION`, so
 * this is the only record of the producing version once a save has happened.
 * Commands compute it from the pre-mutation manifest and report it *before*
 * their save, which is why it is a value rather than an output side effect.
 */
export interface ManifestVersionRestamp<TScope extends string = string> {
  scope: TScope;
  producingVersion: string;
  invokingVersion: string;
}

/**
 * Derive the advisory restamp diagnostic for a loaded scope manifest.
 *
 * This is the single comparison used by every command that saves a manifest,
 * so the semantics cannot drift between call sites. Comparison is plain string
 * inequality on identity, never semantic-version ordering: "different" is the
 * contract, not "older" or "newer".
 *
 * Only `oatVersion` is reported. The silent V1 -> V2 `version` upgrade that
 * `loadManifest` performs in memory is deliberately out of scope for this
 * advisory: it is a schema migration rather than a loss of producer evidence.
 *
 * An absent manifest never reports a restamp, because `loadManifest` returns an
 * empty manifest already stamped with the invoking version and the two strings
 * match. Invalid manifests never reach here at all; the loader and schema keep
 * their existing fail-closed behavior.
 */
export function detectManifestVersionRestamp<TScope extends string>(
  scope: TScope,
  manifest: Pick<ManifestV2, 'oatVersion'>,
): ManifestVersionRestamp<TScope> | undefined {
  const producingVersion = manifest.oatVersion;
  const invokingVersion = OAT_VERSION;

  if (producingVersion === invokingVersion) {
    return undefined;
  }

  return { scope, producingVersion, invokingVersion };
}

/**
 * Render the human advisory for a restamp diagnostic.
 *
 * Formatting is shared so the message stays identical across commands, but
 * *emitting* it stays with each command: only the command knows its output
 * ordering and whether the run is in JSON mode.
 */
export function formatManifestVersionRestampWarning(
  command: string,
  restamp: ManifestVersionRestamp,
): string {
  return `Manifest version restamp [${command} ${restamp.scope}]: manifest produced by oat "${restamp.producingVersion}" will be restamped to oat "${restamp.invokingVersion}".`;
}

export async function loadManifest(manifestPath: string): Promise<Manifest> {
  try {
    const raw = await readFile(manifestPath, 'utf8');

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new CliError(
        `Manifest at ${manifestPath} is not valid JSON. Delete or repair the file and re-run oat sync.`,
      );
    }

    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      !('version' in parsed) ||
      (parsed.version !== 1 && parsed.version !== 2)
    ) {
      throw new CliError(
        `Manifest at ${manifestPath} failed validation: version must be 1 or 2. Delete or repair the file and re-run oat sync.`,
      );
    }

    const result = ManifestSchema.safeParse(parsed);
    if (!result.success) {
      const issueDetails = result.error.issues
        .map((issue) => `${formatIssuePath(issue.path)}: ${issue.message}`)
        .join('; ');
      throw new CliError(
        `Manifest at ${manifestPath} failed validation: ${issueDetails}. Delete or repair the file and re-run oat sync.`,
      );
    }

    if (result.data.version === 1) {
      return {
        ...result.data,
        version: 2,
        entries: result.data.entries.map((entry) => ({ ...entry })),
        collections: [],
      };
    }

    // Collection entries are consumed by the collection planner before the
    // existing per-entry engine receives this compatibility view.
    return result.data as unknown as Manifest;
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
  manifest: ManifestV2,
): Promise<void> {
  const validated = ManifestV2Schema.parse({
    ...manifest,
    oatVersion: OAT_VERSION,
  });
  const dir = dirname(manifestPath);
  const tempPath = `${manifestPath}.${randomUUID()}.tmp`;

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
