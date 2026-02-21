import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { geminiAdapter } from './adapter';

describe('geminiAdapter', () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(
      tempDirs.map(async (tempDir) => {
        await rm(tempDir, { recursive: true, force: true });
      }),
    );
    tempDirs.length = 0;
  });

  it('has name "gemini" and displayName "Gemini CLI"', () => {
    expect(geminiAdapter.name).toBe('gemini');
    expect(geminiAdapter.displayName).toBe('Gemini CLI');
  });

  it('project mappings: skills + agents, both nativeRead: true', () => {
    expect(geminiAdapter.projectMappings).toEqual([
      {
        contentType: 'skill',
        canonicalDir: '.agents/skills',
        providerDir: '.agents/skills',
        nativeRead: true,
      },
      {
        contentType: 'agent',
        canonicalDir: '.agents/agents',
        providerDir: '.agents/agents',
        nativeRead: true,
      },
    ]);
  });

  it('user mappings: skills + agents, both nativeRead: true', () => {
    expect(geminiAdapter.userMappings).toEqual([
      {
        contentType: 'skill',
        canonicalDir: '.agents/skills',
        providerDir: '.agents/skills',
        nativeRead: true,
      },
      {
        contentType: 'agent',
        canonicalDir: '.agents/agents',
        providerDir: '.agents/agents',
        nativeRead: true,
      },
    ]);
  });

  it('all mappings have nativeRead: true', () => {
    const allMappings = [
      ...geminiAdapter.projectMappings,
      ...geminiAdapter.userMappings,
    ];
    expect(allMappings.every((mapping) => mapping.nativeRead === true)).toBe(
      true,
    );
  });

  it('detect returns true when .gemini/ exists', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-gemini-'));
    tempDirs.push(root);
    await mkdir(join(root, '.gemini'));

    const detected = await geminiAdapter.detect(root);

    expect(detected).toBe(true);
  });

  it('detect returns false when .gemini/ is absent', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-gemini-'));
    tempDirs.push(root);

    const detected = await geminiAdapter.detect(root);

    expect(detected).toBe(false);
  });
});
