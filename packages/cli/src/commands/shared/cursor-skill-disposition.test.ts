import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { loadSyncConfig } from '@config/sync-config';
import { createEmptyManifest } from '@manifest/manager';
import { CURSOR_PROJECT_MAPPINGS } from '@providers/cursor/paths';
import { afterEach, describe, expect, it } from 'vitest';

import {
  applyCursorSkillDisposition,
  isCursorSkillCandidate,
  type CursorSkillCandidate,
} from './cursor-skill-disposition';

describe('Cursor skill dispositions', () => {
  const tempDirs: string[] = [];
  const mapping = CURSOR_PROJECT_MAPPINGS.find(
    (entry) => entry.contentType === 'skill',
  )!;

  afterEach(async () => {
    await Promise.all(
      tempDirs.map(async (dir) => rm(dir, { recursive: true, force: true })),
    );
    tempDirs.length = 0;
  });

  async function createCandidate(): Promise<{
    scopeRoot: string;
    candidate: CursorSkillCandidate;
  }> {
    const scopeRoot = await mkdtemp(join(tmpdir(), 'oat-cursor-skill-'));
    tempDirs.push(scopeRoot);
    await mkdir(join(scopeRoot, '.cursor', 'skills', 'local-only'), {
      recursive: true,
    });
    await writeFile(
      join(scopeRoot, '.cursor', 'skills', 'local-only', 'SKILL.md'),
      '# Local only\n',
      'utf8',
    );
    return {
      scopeRoot,
      candidate: {
        provider: 'cursor',
        report: { providerPath: '.cursor/skills/local-only' },
        mapping,
      },
    };
  }

  it('recognizes only native-read Cursor skill candidates', async () => {
    const { candidate } = await createCandidate();

    expect(isCursorSkillCandidate(candidate)).toBe(true);
    expect(isCursorSkillCandidate({ ...candidate, provider: 'claude' })).toBe(
      false,
    );
    expect(
      isCursorSkillCandidate({
        ...candidate,
        mapping: { ...candidate.mapping, contentType: 'agent' },
      }),
    ).toBe(false);
  });

  it('keeps provider content and immediately records its normalized path', async () => {
    const { scopeRoot, candidate } = await createCandidate();
    const syncConfigPath = join(scopeRoot, '.oat', 'sync', 'config.json');

    const manifest = await applyCursorSkillDisposition(
      scopeRoot,
      candidate,
      createEmptyManifest(),
      'keep',
      syncConfigPath,
    );

    await expect(
      readFile(
        join(scopeRoot, '.cursor', 'skills', 'local-only', 'SKILL.md'),
        'utf8',
      ),
    ).resolves.toBe('# Local only\n');
    await expect(loadSyncConfig(syncConfigPath)).resolves.toMatchObject({
      knownStrays: ['.cursor/skills/local-only'],
    });
    expect(manifest.entries).toHaveLength(0);
  });

  it('blocks keep-local when a same-name canonical skill exists', async () => {
    const { scopeRoot, candidate } = await createCandidate();
    const syncConfigPath = join(scopeRoot, '.oat', 'sync', 'config.json');
    await mkdir(join(scopeRoot, '.agents', 'skills', 'local-only'), {
      recursive: true,
    });
    await writeFile(
      join(scopeRoot, '.agents', 'skills', 'local-only', 'SKILL.md'),
      '# Canonical\n',
      'utf8',
    );

    await expect(
      applyCursorSkillDisposition(
        scopeRoot,
        candidate,
        createEmptyManifest(),
        'keep',
        syncConfigPath,
      ),
    ).rejects.toThrow(/Rename one skill/);
    await expect(loadSyncConfig(syncConfigPath)).resolves.toMatchObject({
      knownStrays: [],
    });
  });

  it('adopts without creating a provider view or manifest entry', async () => {
    const { scopeRoot, candidate } = await createCandidate();

    const manifest = await applyCursorSkillDisposition(
      scopeRoot,
      candidate,
      createEmptyManifest(),
      'adopt',
      join(scopeRoot, '.oat', 'sync', 'config.json'),
    );

    await expect(
      readFile(
        join(scopeRoot, '.agents', 'skills', 'local-only', 'SKILL.md'),
        'utf8',
      ),
    ).resolves.toBe('# Local only\n');
    await expect(
      readFile(
        join(scopeRoot, '.cursor', 'skills', 'local-only', 'SKILL.md'),
        'utf8',
      ),
    ).rejects.toMatchObject({ code: 'ENOENT' });
    expect(manifest.entries).toHaveLength(0);
  });
});
