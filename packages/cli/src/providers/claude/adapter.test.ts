import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { claudeAdapter } from './adapter';

describe('claudeAdapter', () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(
      tempDirs.map(async (tempDir) => {
        await rm(tempDir, { recursive: true, force: true });
      }),
    );
    tempDirs.length = 0;
  });

  it('has name "claude" and displayName "Claude Code"', () => {
    expect(claudeAdapter.name).toBe('claude');
    expect(claudeAdapter.displayName).toBe('Claude Code');
  });

  it('project mappings include rules under .claude/rules', () => {
    expect(claudeAdapter.projectMappings).toHaveLength(3);
    expect(claudeAdapter.projectMappings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          contentType: 'skill',
          canonicalDir: '.agents/skills',
          providerDir: '.claude/skills',
          nativeRead: false,
        }),
        expect.objectContaining({
          contentType: 'agent',
          canonicalDir: '.agents/agents',
          providerDir: '.claude/agents',
          nativeRead: false,
        }),
        expect.objectContaining({
          contentType: 'rule',
          canonicalDir: '.agents/rules',
          providerDir: '.claude/rules',
          nativeRead: false,
          providerExtension: '.md',
          transformCanonical: expect.any(Function),
          parseToCanonical: expect.any(Function),
        }),
      ]),
    );
  });

  it('user mappings: skills → .claude/skills, agents → .claude/agents', () => {
    expect(claudeAdapter.userMappings).toEqual([
      {
        contentType: 'skill',
        canonicalDir: '.agents/skills',
        providerDir: '.claude/skills',
        nativeRead: false,
      },
      {
        contentType: 'agent',
        canonicalDir: '.agents/agents',
        providerDir: '.claude/agents',
        nativeRead: false,
      },
    ]);
  });

  it('all mappings have nativeRead: false', () => {
    const allMappings = [
      ...claudeAdapter.projectMappings,
      ...claudeAdapter.userMappings,
    ];
    expect(allMappings.every((mapping) => mapping.nativeRead === false)).toBe(
      true,
    );
  });

  it('detect returns true when .claude/ exists', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-claude-'));
    tempDirs.push(root);
    await mkdir(join(root, '.claude'));

    const detected = await claudeAdapter.detect(root);

    expect(detected).toBe(true);
  });

  it('detect returns false when .claude/ is absent', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-claude-'));
    tempDirs.push(root);

    const detected = await claudeAdapter.detect(root);

    expect(detected).toBe(false);
  });
});
