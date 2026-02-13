import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { cursorAdapter } from './adapter';

describe('cursorAdapter', () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(
      tempDirs.map(async (tempDir) => {
        await rm(tempDir, { recursive: true, force: true });
      }),
    );
    tempDirs.length = 0;
  });

  it('has name "cursor" and displayName "Cursor"', () => {
    expect(cursorAdapter.name).toBe('cursor');
    expect(cursorAdapter.displayName).toBe('Cursor');
  });

  it('project skills map to .cursor/skills (not .claude/skills)', () => {
    const skillMapping = cursorAdapter.projectMappings.find(
      (mapping) => mapping.contentType === 'skill',
    );

    expect(skillMapping?.providerDir).toBe('.cursor/skills');
  });

  it('project agents map to .cursor/agents', () => {
    const agentMapping = cursorAdapter.projectMappings.find(
      (mapping) => mapping.contentType === 'agent',
    );

    expect(agentMapping?.providerDir).toBe('.cursor/agents');
  });

  it('user mappings: skills → .cursor/skills', () => {
    expect(cursorAdapter.userMappings).toEqual([
      {
        contentType: 'skill',
        canonicalDir: '.agents/skills',
        providerDir: '.cursor/skills',
        nativeRead: false,
      },
    ]);
  });

  it('all mappings have nativeRead: false', () => {
    const allMappings = [
      ...cursorAdapter.projectMappings,
      ...cursorAdapter.userMappings,
    ];
    expect(allMappings.every((mapping) => mapping.nativeRead === false)).toBe(
      true,
    );
  });

  it('detect returns true when .cursor/ exists', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-cursor-'));
    tempDirs.push(root);
    await mkdir(join(root, '.cursor'));

    const detected = await cursorAdapter.detect(root);

    expect(detected).toBe(true);
  });
});
