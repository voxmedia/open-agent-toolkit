import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  getAdoptionSources,
  getSyncMappings,
} from '@providers/shared/adapter.utils';
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

  it('project skills are native-read with .cursor/skills as an adoption source', () => {
    const skillMapping = cursorAdapter.projectMappings.find(
      (mapping) => mapping.contentType === 'skill',
    );

    expect(skillMapping).toMatchObject({
      canonicalDir: '.agents/skills',
      providerDir: '.agents/skills',
      nativeRead: true,
      adoptionSourceDirs: ['.cursor/skills'],
    });
  });

  it('project agents map to .cursor/agents', () => {
    const agentMapping = cursorAdapter.projectMappings.find(
      (mapping) => mapping.contentType === 'agent',
    );

    expect(agentMapping?.providerDir).toBe('.cursor/agents');
  });

  it('project rules map to .cursor/rules', () => {
    const ruleMapping = cursorAdapter.projectMappings.find(
      (mapping) => mapping.contentType === 'rule',
    );

    expect(ruleMapping?.providerDir).toBe('.cursor/rules');
  });

  it('user mappings mix native-read skills with mirrored agents', () => {
    expect(cursorAdapter.userMappings).toEqual([
      {
        contentType: 'skill',
        canonicalDir: '.agents/skills',
        providerDir: '.agents/skills',
        nativeRead: true,
        adoptionSourceDirs: ['.cursor/skills'],
      },
      {
        contentType: 'agent',
        canonicalDir: '.agents/agents',
        providerDir: '.cursor/agents',
        nativeRead: false,
      },
    ]);
  });

  it.each(['project', 'user'] as const)(
    '%s sync mappings exclude skills while adoption sources include .cursor/skills',
    (scope) => {
      expect(
        getSyncMappings(cursorAdapter, scope).map(
          (mapping) => mapping.contentType,
        ),
      ).not.toContain('skill');
      expect(getAdoptionSources(cursorAdapter, scope)).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            contentType: 'skill',
            directory: '.cursor/skills',
          }),
        ]),
      );
    },
  );

  it('preserves project agent and rule mappings exactly', () => {
    expect(cursorAdapter.projectMappings.slice(1)).toEqual([
      {
        contentType: 'agent',
        canonicalDir: '.agents/agents',
        providerDir: '.cursor/agents',
        nativeRead: false,
      },
      expect.objectContaining({
        contentType: 'rule',
        canonicalDir: '.agents/rules',
        providerDir: '.cursor/rules',
        nativeRead: false,
        providerExtension: '.mdc',
      }),
    ]);
  });

  it('detect returns true when .cursor/ exists', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-cursor-'));
    tempDirs.push(root);
    await mkdir(join(root, '.cursor'));

    const detected = await cursorAdapter.detect(root);

    expect(detected).toBe(true);
  });
});
