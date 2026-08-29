import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { basename, dirname, extname, join } from 'node:path';

import { SYNCED_REMOTE, syncedRefName } from '@commands/shared/project-scope';
import { CliError } from '@errors/cli-error';
import { z } from 'zod';

export interface SyncedProjectRecord {
  schemaVersion: 1;
  slug: string;
  scope: 'synced';
  ref: string;
  remote: typeof SYNCED_REMOTE;
  status: 'active' | 'complete';
  createdAt: string;
  completedAt: string | null;
  archiveSnapshot?: string;
}

const schemaVersion = z.custom<1>((value) => value === 1, {
  message: 'Unsupported schemaVersion; upgrade OAT before reading this record',
});

export const SyncedProjectRecordSchema: z.ZodType<SyncedProjectRecord> = z
  .object({
    schemaVersion,
    slug: z.string().min(1),
    scope: z.literal('synced'),
    ref: z.string().min(1),
    remote: z.literal(SYNCED_REMOTE),
    status: z.enum(['active', 'complete']),
    createdAt: z.string().datetime(),
    completedAt: z.string().datetime().nullable(),
    archiveSnapshot: z.string().min(1).optional(),
  })
  .strict()
  .superRefine((record, context) => {
    let expectedRef: string;
    try {
      expectedRef = syncedRefName(record.slug);
    } catch {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['slug'],
        message: 'Record slug is not a valid synced project slug',
      });
      return;
    }
    if (record.ref !== expectedRef) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['ref'],
        message: `Record ref must match slug (${expectedRef})`,
      });
    }
  });

export function buildSyncedRecord(
  slug: string,
  now: Date,
): SyncedProjectRecord {
  return SyncedProjectRecordSchema.parse({
    schemaVersion: 1,
    slug,
    scope: 'synced',
    ref: syncedRefName(slug),
    remote: SYNCED_REMOTE,
    status: 'active',
    createdAt: now.toISOString(),
    completedAt: null,
  });
}

function recordSlugFromPath(path: string): string {
  return basename(path, extname(path));
}

function recordRecovery(path: string): string {
  const slug = recordSlugFromPath(path);
  return `Restore the record from Git, or quarantine the invalid file and run \`oat project pull ${slug} --no-commit\` from a clean checkout before committing the repaired record.`;
}

function parseRecord(path: string, value: unknown): SyncedProjectRecord {
  const result = SyncedProjectRecordSchema.safeParse(value);
  if (!result.success) {
    throw new CliError(
      `Invalid synced project record ${path}: ${result.error.issues
        .map((issue) => issue.message)
        .join('; ')} ${recordRecovery(path)}`,
      1,
    );
  }
  const filenameSlug = recordSlugFromPath(path);
  if (result.data.slug !== filenameSlug) {
    throw new CliError(
      `Synced project record filename slug "${filenameSlug}" does not match record slug "${result.data.slug}". ${recordRecovery(path)}`,
      1,
    );
  }
  return result.data;
}

export async function readSyncedRecord(
  path: string,
): Promise<SyncedProjectRecord | null> {
  let content: string;
  try {
    content = await readFile(path, 'utf8');
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return null;
    }
    throw error;
  }

  try {
    return parseRecord(path, JSON.parse(content) as unknown);
  } catch (error) {
    if (error instanceof CliError) {
      throw error;
    }
    const message = error instanceof Error ? error.message : String(error);
    throw new CliError(
      `Invalid JSON in synced project record ${path}: ${message} ${recordRecovery(path)}`,
      1,
    );
  }
}

export async function writeSyncedRecord(
  path: string,
  record: SyncedProjectRecord,
): Promise<void> {
  const validated = parseRecord(path, record);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(validated, null, 2)}\n`, 'utf8');
}

export async function listSyncedRecords(
  scopeRoot: string,
): Promise<SyncedProjectRecord[]> {
  let entries;
  try {
    entries = await readdir(scopeRoot, { withFileTypes: true });
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }

  const records = await Promise.all(
    entries
      .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
      .map((entry) => readSyncedRecord(join(scopeRoot, entry.name))),
  );
  return records
    .filter((record): record is SyncedProjectRecord => record !== null)
    .sort((left, right) => left.slug.localeCompare(right.slug));
}
