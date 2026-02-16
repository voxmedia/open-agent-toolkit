import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CliError } from '@errors/index';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  addEntry,
  createEmptyManifest,
  findEntry,
  loadManifest,
  removeEntry,
  saveManifest,
} from './manager';
import type { Manifest, ManifestEntry } from './manifest.types';

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

    it('returns empty manifest when file does not exist', async () => {
      const loaded = await loadManifest(manifestPath);

      expect(loaded.version).toBe(1);
      expect(loaded.entries).toEqual([]);
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
        JSON.stringify({ version: 2, entries: [], oatVersion: '0.1.0' }),
        'utf8',
      );

      await expect(loadManifest(manifestPath)).rejects.toMatchObject({
        message: expect.stringContaining('version'),
      });
    });
  });

  describe('saveManifest', () => {
    it('writes manifest atomically (temp + rename)', async () => {
      const manifest = createEmptyManifest();

      await saveManifest(manifestPath, manifest);

      const persisted = JSON.parse(await readFile(manifestPath, 'utf8'));
      expect(persisted.version).toBe(1);
      await expect(readFile(`${manifestPath}.tmp`, 'utf8')).rejects.toThrow();
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
});
