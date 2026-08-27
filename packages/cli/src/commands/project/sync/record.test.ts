import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  buildSyncedRecord,
  listSyncedRecords,
  readSyncedRecord,
  SyncedProjectRecordSchema,
  writeSyncedRecord,
} from './record';

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(
    tempDirs
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

async function createScopeRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'oat-synced-record-'));
  tempDirs.push(root);
  return root;
}

describe('SyncedProjectRecordSchema', () => {
  const canonical = buildSyncedRecord(
    'example',
    new Date('2026-08-27T01:02:03.000Z'),
  );

  it('accepts canonical records and rejects scope/ref mismatches', () => {
    expect(SyncedProjectRecordSchema.parse(canonical)).toEqual(canonical);
    expect(() =>
      SyncedProjectRecordSchema.parse({ ...canonical, scope: 'shared' }),
    ).toThrow();
    expect(() =>
      SyncedProjectRecordSchema.parse({
        ...canonical,
        ref: 'refs/oat/projects/other',
      }),
    ).toThrow(/slug/);
  });

  it('names the upgrade path for unknown schema versions', () => {
    expect(() =>
      SyncedProjectRecordSchema.parse({ ...canonical, schemaVersion: 2 }),
    ).toThrow(/upgrade OAT/i);
  });
});

describe('record persistence', () => {
  it('writes canonical two-space JSON with a trailing newline', async () => {
    const root = await createScopeRoot();
    const path = join(root, 'example.json');
    const record = buildSyncedRecord(
      'example',
      new Date('2026-08-27T01:02:03.000Z'),
    );

    await writeSyncedRecord(path, record);

    expect(await readFile(path, 'utf8')).toBe(
      `${JSON.stringify(record, null, 2)}\n`,
    );
    await expect(readSyncedRecord(path)).resolves.toEqual(record);
  });

  it('returns null for a missing file and rejects filename mismatches', async () => {
    const root = await createScopeRoot();
    const missing = join(root, 'missing.json');
    await expect(readSyncedRecord(missing)).resolves.toBeNull();

    const wrongPath = join(root, 'wrong.json');
    await writeFile(
      wrongPath,
      `${JSON.stringify(buildSyncedRecord('actual', new Date()))}\n`,
      'utf8',
    );
    await expect(readSyncedRecord(wrongPath)).rejects.toThrow(
      /filename.*slug/i,
    );
  });

  it('lists JSON record files by slug and ignores other entries', async () => {
    const root = await createScopeRoot();
    await writeSyncedRecord(
      join(root, 'zeta.json'),
      buildSyncedRecord('zeta', new Date('2026-08-27T00:00:00.000Z')),
    );
    await writeSyncedRecord(
      join(root, 'alpha.json'),
      buildSyncedRecord('alpha', new Date('2026-08-27T00:00:00.000Z')),
    );
    await writeFile(join(root, 'notes.md'), 'ignore me\n', 'utf8');
    await mkdir(join(root, 'directory.json'));

    await expect(listSyncedRecords(root)).resolves.toMatchObject([
      { slug: 'alpha' },
      { slug: 'zeta' },
    ]);
  });

  it('returns an empty list for an absent scope root', async () => {
    const root = await createScopeRoot();
    await expect(listSyncedRecords(join(root, 'absent'))).resolves.toEqual([]);
  });
});
