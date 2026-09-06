import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { CliError } from '@errors/index';
import { OAT_VERSION } from '@shared/oat-version';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  addEntry,
  createEmptyManifest,
  detectManifestVersionRestamp,
  findEntry,
  formatManifestVersionRestampWarning,
  loadManifest,
  removeEntry,
  saveManifest,
} from './manager';
import type { Manifest, ManifestEntry, ManifestV2 } from './manifest.types';

async function createTempDir(name: string): Promise<string> {
  const dir = join(tmpdir(), `oat-${name}-${Date.now()}-${Math.random()}`);
  await mkdir(dir, { recursive: true });
  return dir;
}

describe('manifest manager', () => {
  let workDir: string;
  let manifestPath: string;

  beforeEach(async () => {
    workDir = await createTempDir('manifest');
    manifestPath = join(workDir, '.agents', 'manifest.json');
  });

  afterEach(async () => {
    await rm(workDir, { recursive: true, force: true });
  });

  describe('loadManifest', () => {
    it('loads valid manifest from disk', async () => {
      const manifest: Manifest = createEmptyManifest();
      manifest.entries.push({
        canonicalPath: '.agents/skills/example',
        providerPath: '.claude/skills/example',
        provider: 'claude',
        contentType: 'skill',
        strategy: 'symlink',
        contentHash: null,
        lastSynced: new Date().toISOString(),
      });
      await saveManifest(manifestPath, manifest);

      const loaded = await loadManifest(manifestPath);

      expect(loaded.entries).toHaveLength(1);
      expect(loaded.entries[0]?.provider).toBe('claude');
    });

    it('normalizes a V1 manifest to V2 in memory without rewriting it', async () => {
      const legacy = {
        version: 1,
        oatVersion: '0.1.0',
        entries: [],
        lastUpdated: '2026-02-13T00:00:00.000Z',
      };
      await mkdir(join(workDir, '.agents'), { recursive: true });
      await writeFile(manifestPath, JSON.stringify(legacy), 'utf8');

      const loaded = await loadManifest(manifestPath);

      expect(loaded).toMatchObject({ version: 2, collections: [] });
      expect(JSON.parse(await readFile(manifestPath, 'utf8'))).toEqual(legacy);
    });

    it('returns empty manifest when file does not exist', async () => {
      const loaded = await loadManifest(manifestPath);

      expect(loaded.version).toBe(2);
      expect(loaded.entries).toEqual([]);
      expect(loaded.collections).toEqual([]);
    });

    it('throws CliError on corrupt JSON', async () => {
      await mkdir(join(workDir, '.agents'), { recursive: true });
      await writeFile(manifestPath, '{"bad":', 'utf8');

      await expect(loadManifest(manifestPath)).rejects.toBeInstanceOf(CliError);
    });

    it('throws CliError on schema validation failure', async () => {
      await mkdir(join(workDir, '.agents'), { recursive: true });
      await writeFile(
        manifestPath,
        JSON.stringify({ version: 3, entries: [], oatVersion: '0.1.0' }),
        'utf8',
      );

      await expect(loadManifest(manifestPath)).rejects.toMatchObject({
        message: expect.stringContaining('version'),
      });
    });

    it('throws CliError when oatVersion is empty or missing', async () => {
      await mkdir(join(workDir, '.agents'), { recursive: true });
      await writeFile(
        manifestPath,
        JSON.stringify({
          version: 1,
          oatVersion: '',
          entries: [],
          lastUpdated: '2026-02-14T00:00:00.000Z',
        }),
        'utf8',
      );

      await expect(loadManifest(manifestPath)).rejects.toMatchObject({
        message: expect.stringContaining('oatVersion'),
      });

      await writeFile(
        manifestPath,
        JSON.stringify({
          version: 1,
          entries: [],
          lastUpdated: '2026-02-14T00:00:00.000Z',
        }),
        'utf8',
      );

      await expect(loadManifest(manifestPath)).rejects.toBeInstanceOf(CliError);
    });
  });

  describe('saveManifest', () => {
    it('writes manifest atomically (temp + rename)', async () => {
      const manifest = createEmptyManifest();

      await saveManifest(manifestPath, manifest);

      const persisted = JSON.parse(await readFile(manifestPath, 'utf8'));
      expect(persisted.version).toBe(2);
      expect(persisted.collections).toEqual([]);
      await expect(readFile(`${manifestPath}.tmp`, 'utf8')).rejects.toThrow();
    });

    it('restamps stale oatVersion to the running CLI version on every write', async () => {
      const manifest = {
        ...createEmptyManifest(),
        oatVersion: '0.0.1',
      };

      await saveManifest(manifestPath, manifest);

      const persisted = await loadManifest(manifestPath);
      expect(persisted.oatVersion).toBe(OAT_VERSION);
    });

    it('round trips V2 collection ownership', async () => {
      const manifest: ManifestV2 = {
        ...createEmptyManifest(),
        entries: [
          {
            canonicalPath: '.agents/skills/example',
            providerPath: '.claude/skills/example',
            provider: 'claude',
            contentType: 'skill',
            strategy: 'collection',
            collectionId: 'claude-skills',
            contentHash: null,
            isFile: false,
            lastSynced: '2026-02-13T00:00:00.000Z',
          },
        ],
        collections: [
          {
            id: 'claude-skills',
            provider: 'claude',
            contentType: 'skill',
            canonicalDir: '.agents/skills',
            providerDir: '.claude/skills',
            linkTarget: '.agents/skills',
            ownership: 'oat-created',
            lastVerified: '2026-02-13T00:00:00.000Z',
          },
        ],
      };

      await saveManifest(manifestPath, manifest);

      const persisted = await loadManifest(manifestPath);
      expect(persisted.collections).toEqual(manifest.collections);
      expect(persisted.entries).toEqual(manifest.entries);
    });

    it('creates parent directories if needed', async () => {
      const manifest = createEmptyManifest();

      await saveManifest(manifestPath, manifest);

      const persisted = await loadManifest(manifestPath);
      expect(persisted.entries).toEqual([]);
    });
  });

  describe('findEntry', () => {
    it('finds entry by canonicalPath + provider', () => {
      const entry: ManifestEntry = {
        canonicalPath: '.agents/skills/example',
        providerPath: '.claude/skills/example',
        provider: 'claude',
        contentType: 'skill',
        strategy: 'symlink',
        contentHash: null,
        lastSynced: new Date().toISOString(),
      };
      const manifest = addEntry(createEmptyManifest(), entry);

      const found = findEntry(manifest, entry.canonicalPath, entry.provider);

      expect(found).toEqual(entry);
    });

    it('returns undefined when not found', () => {
      const manifest = createEmptyManifest();

      const found = findEntry(manifest, '.agents/skills/missing', 'claude');

      expect(found).toBeUndefined();
    });
  });

  describe('addEntry', () => {
    it('adds new entry to manifest', () => {
      const entry: ManifestEntry = {
        canonicalPath: '.agents/skills/example',
        providerPath: '.claude/skills/example',
        provider: 'claude',
        contentType: 'skill',
        strategy: 'symlink',
        contentHash: null,
        lastSynced: new Date().toISOString(),
      };

      const next = addEntry(createEmptyManifest(), entry);

      expect(next.entries).toHaveLength(1);
      expect(next.entries[0]).toEqual(entry);
    });

    it('replaces existing entry with same canonicalPath + provider', () => {
      const existing: ManifestEntry = {
        canonicalPath: '.agents/skills/example',
        providerPath: '.claude/skills/example',
        provider: 'claude',
        contentType: 'skill',
        strategy: 'symlink',
        contentHash: null,
        lastSynced: new Date().toISOString(),
      };
      const updated: ManifestEntry = {
        ...existing,
        providerPath: '.cursor/skills/example',
        provider: 'claude',
      };
      const initial = addEntry(createEmptyManifest(), existing);

      const next = addEntry(initial, updated);

      expect(next.entries).toHaveLength(1);
      expect(next.entries[0]?.providerPath).toBe('.cursor/skills/example');
    });
  });

  describe('removeEntry', () => {
    it('removes entry by canonicalPath + provider', () => {
      const entry: ManifestEntry = {
        canonicalPath: '.agents/skills/example',
        providerPath: '.claude/skills/example',
        provider: 'claude',
        contentType: 'skill',
        strategy: 'symlink',
        contentHash: null,
        lastSynced: new Date().toISOString(),
      };
      const initial = addEntry(createEmptyManifest(), entry);

      const next = removeEntry(initial, entry.canonicalPath, entry.provider);

      expect(next.entries).toHaveLength(0);
    });

    it('is a no-op when entry does not exist', () => {
      const initial = createEmptyManifest();

      const next = removeEntry(initial, '.agents/skills/missing', 'claude');

      expect(next.entries).toEqual([]);
    });
  });

  describe('detectManifestVersionRestamp', () => {
    it('reports nothing when the producing version matches the invoking version', () => {
      const manifest = createEmptyManifest();

      expect(detectManifestVersionRestamp('project', manifest)).toBeUndefined();
    });

    it('reports the producing and invoking versions for an older manifest', () => {
      const manifest = { ...createEmptyManifest(), oatVersion: '0.0.1' };

      expect(detectManifestVersionRestamp('project', manifest)).toEqual({
        scope: 'project',
        producingVersion: '0.0.1',
        invokingVersion: OAT_VERSION,
      });
    });

    it('reports a newer manifest too: the contract is identity, not ordering', () => {
      const manifest = { ...createEmptyManifest(), oatVersion: '999.0.0' };

      expect(detectManifestVersionRestamp('user', manifest)).toEqual({
        scope: 'user',
        producingVersion: '999.0.0',
        invokingVersion: OAT_VERSION,
      });
    });

    it('reports nothing for an absent manifest', async () => {
      const loaded = await loadManifest(manifestPath);

      expect(detectManifestVersionRestamp('project', loaded)).toBeUndefined();
    });

    it('ignores the in-memory V1 to V2 upgrade and compares only oatVersion', async () => {
      // `loadManifest` silently rewrites `version` 1 -> 2 in memory. That
      // schema migration is explicitly out of scope for the advisory: a V1
      // file produced by the invoking CLI version reports no restamp.
      await mkdir(join(workDir, '.agents'), { recursive: true });
      await writeFile(
        manifestPath,
        JSON.stringify({
          version: 1,
          oatVersion: OAT_VERSION,
          entries: [],
          lastUpdated: '2026-02-13T00:00:00.000Z',
        }),
        'utf8',
      );

      const loaded = await loadManifest(manifestPath);

      expect(loaded.version).toBe(2);
      expect(detectManifestVersionRestamp('project', loaded)).toBeUndefined();
    });

    it('leaves invalid manifests to the loader rather than reclassifying them', async () => {
      await mkdir(join(workDir, '.agents'), { recursive: true });
      await writeFile(
        manifestPath,
        JSON.stringify({
          version: 2,
          oatVersion: '',
          entries: [],
          collections: [],
          lastUpdated: '2026-02-13T00:00:00.000Z',
        }),
        'utf8',
      );

      await expect(loadManifest(manifestPath)).rejects.toBeInstanceOf(CliError);
    });

    it('still restamps after the diagnostic is taken, preserving save enforcement', async () => {
      const manifest = { ...createEmptyManifest(), oatVersion: '0.0.1' };
      const restamp = detectManifestVersionRestamp('project', manifest);

      await saveManifest(manifestPath, manifest);

      expect(restamp?.producingVersion).toBe('0.0.1');
      expect((await loadManifest(manifestPath)).oatVersion).toBe(OAT_VERSION);
    });
  });

  describe('formatManifestVersionRestampWarning', () => {
    it('names the command, the scope, and both versions exactly once', () => {
      const message = formatManifestVersionRestampWarning('init', {
        scope: 'project',
        producingVersion: '0.0.1',
        invokingVersion: '9.9.9',
      });

      expect(message).toBe(
        'Manifest version restamp [init project]: manifest produced by oat "0.0.1" will be restamped to oat "9.9.9".',
      );
      expect(message.match(/0\.0\.1/g)).toHaveLength(1);
      expect(message.match(/9\.9\.9/g)).toHaveLength(1);
      expect(message.match(/project/g)).toHaveLength(1);
    });
  });
});
