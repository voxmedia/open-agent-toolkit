import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { loadSyncConfig } from '@config/sync-config';
import { createEmptyManifest } from '@manifest/manager';
import {
  COPILOT_PROJECT_MAPPINGS,
  COPILOT_USER_MAPPINGS,
} from '@providers/copilot/paths';
import { CURSOR_PROJECT_MAPPINGS } from '@providers/cursor/paths';
import type { PathMapping } from '@providers/shared/adapter.types';
import { afterEach, describe, expect, it } from 'vitest';

import { AdoptionSourceUnavailableError } from './adopt-stray';
import {
  applyNativeSkillDisposition,
  getNativeSkillProviderDetails,
  isNativeSkillCandidate,
  type NativeSkillCandidate,
} from './native-skill-disposition';

describe('native skill dispositions', () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(
      tempDirs.map(async (dir) => rm(dir, { recursive: true, force: true })),
    );
    tempDirs.length = 0;
  });

  async function createCandidate(options: {
    provider: 'copilot' | 'cursor';
    providerPath: string;
    mapping: PathMapping;
  }): Promise<{
    scopeRoot: string;
    candidate: NativeSkillCandidate;
  }> {
    const scopeRoot = await mkdtemp(join(tmpdir(), 'oat-native-skill-'));
    tempDirs.push(scopeRoot);
    await mkdir(join(scopeRoot, options.providerPath), { recursive: true });
    await writeFile(
      join(scopeRoot, options.providerPath, 'SKILL.md'),
      '# Local only\n',
      'utf8',
    );
    return {
      scopeRoot,
      candidate: {
        provider: options.provider,
        report: { providerPath: options.providerPath },
        mapping: options.mapping,
      },
    };
  }

  function cursorMapping(): PathMapping {
    return CURSOR_PROJECT_MAPPINGS.find(
      (entry) => entry.contentType === 'skill',
    )!;
  }

  function copilotMapping(): PathMapping {
    return COPILOT_PROJECT_MAPPINGS.find(
      (entry) => entry.contentType === 'skill',
    )!;
  }

  function copilotUserMapping(): PathMapping {
    return COPILOT_USER_MAPPINGS.find(
      (entry) => entry.contentType === 'skill',
    )!;
  }

  it('recognizes supported native-read provider-local skill candidates', async () => {
    const { candidate: cursorCandidate } = await createCandidate({
      provider: 'cursor',
      providerPath: '.cursor/skills/local-only',
      mapping: cursorMapping(),
    });
    const { candidate: copilotCandidate } = await createCandidate({
      provider: 'copilot',
      providerPath: '.github/skills/local-only',
      mapping: copilotMapping(),
    });

    expect(isNativeSkillCandidate(cursorCandidate)).toBe(true);
    expect(isNativeSkillCandidate(copilotCandidate)).toBe(true);
    expect(getNativeSkillProviderDetails(copilotCandidate)).toEqual({
      displayName: 'Copilot',
      sourceDir: '.github/skills',
    });
    expect(
      isNativeSkillCandidate({
        ...cursorCandidate,
        mapping: { ...cursorCandidate.mapping, contentType: 'agent' },
      }),
    ).toBe(false);
    expect(
      getNativeSkillProviderDetails({
        ...copilotCandidate,
        report: { providerPath: '.copilot/skills/local-only' },
      }),
    ).toBeNull();
  });

  it.each([
    {
      provider: 'cursor' as const,
      providerPath: '.cursor/skills/local-only',
      mapping: cursorMapping,
    },
    {
      provider: 'copilot' as const,
      providerPath: '.github/skills/local-only',
      mapping: copilotMapping,
    },
    {
      provider: 'copilot' as const,
      providerPath: '.copilot/skills/local-only',
      mapping: copilotUserMapping,
    },
  ])(
    'keeps $provider content and immediately records its normalized path',
    async ({ provider, providerPath, mapping }) => {
      const { scopeRoot, candidate } = await createCandidate({
        provider,
        providerPath,
        mapping: mapping(),
      });
      const syncConfigPath = join(scopeRoot, '.oat', 'sync', 'config.json');

      const manifest = await applyNativeSkillDisposition(
        scopeRoot,
        candidate,
        createEmptyManifest(),
        'keep',
        syncConfigPath,
      );

      await expect(
        readFile(join(scopeRoot, providerPath, 'SKILL.md'), 'utf8'),
      ).resolves.toBe('# Local only\n');
      await expect(loadSyncConfig(syncConfigPath)).resolves.toMatchObject({
        knownStrays: [providerPath],
      });
      expect(manifest.entries).toHaveLength(0);
    },
  );

  it('blocks keep-local when a same-name canonical skill exists', async () => {
    const { scopeRoot, candidate } = await createCandidate({
      provider: 'copilot',
      providerPath: '.github/skills/local-only',
      mapping: copilotMapping(),
    });
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
      applyNativeSkillDisposition(
        scopeRoot,
        candidate,
        createEmptyManifest(),
        'keep',
        syncConfigPath,
      ),
    ).rejects.toThrow(/Copilot-only.*Rename one skill/);
    await expect(loadSyncConfig(syncConfigPath)).resolves.toMatchObject({
      knownStrays: [],
    });
  });

  it('adopts without creating a provider view or manifest entry', async () => {
    const providerPath = '.github/skills/local-only';
    const { scopeRoot, candidate } = await createCandidate({
      provider: 'copilot',
      providerPath,
      mapping: copilotMapping(),
    });

    const manifest = await applyNativeSkillDisposition(
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
      readFile(join(scopeRoot, providerPath, 'SKILL.md'), 'utf8'),
    ).rejects.toMatchObject({ code: 'ENOENT' });
    expect(manifest.entries).toHaveLength(0);
  });

  it('reports a broken adoption-source symlink as unavailable', async () => {
    const scopeRoot = await mkdtemp(join(tmpdir(), 'oat-native-skill-'));
    tempDirs.push(scopeRoot);
    const providerPath = '.github/skills/broken';
    await mkdir(join(scopeRoot, '.github', 'skills'), { recursive: true });
    await symlink('missing-target', join(scopeRoot, providerPath), 'dir');

    await expect(
      applyNativeSkillDisposition(
        scopeRoot,
        {
          provider: 'copilot',
          report: { providerPath },
          mapping: copilotMapping(),
        },
        createEmptyManifest(),
        'adopt',
        join(scopeRoot, '.oat', 'sync', 'config.json'),
      ),
    ).rejects.toBeInstanceOf(AdoptionSourceUnavailableError);
  });
});
