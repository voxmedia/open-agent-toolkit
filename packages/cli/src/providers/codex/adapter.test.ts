import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { codexAdapter } from './adapter';

describe('codexAdapter', () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(
      tempDirs.map(async (tempDir) => {
        await rm(tempDir, { recursive: true, force: true });
      }),
    );
    tempDirs.length = 0;
  });

  it('has name "codex" and displayName "Codex CLI"', () => {
    expect(codexAdapter.name).toBe('codex');
    expect(codexAdapter.displayName).toBe('Codex CLI');
  });

  it('project skills mapping has nativeRead: true', () => {
    const skillMapping = codexAdapter.projectMappings.find(
      (mapping) => mapping.contentType === 'skill',
    );

    expect(skillMapping?.nativeRead).toBe(true);
    expect(skillMapping?.providerDir).toBe('.agents/skills');
  });

  it('project mappings include skills and agents', () => {
    const agentMapping = codexAdapter.projectMappings.find(
      (mapping) => mapping.contentType === 'agent',
    );

    expect(agentMapping?.nativeRead).toBe(true);
    expect(agentMapping?.providerDir).toBe('.agents/agents');
    expect(codexAdapter.projectMappings).toHaveLength(2);
  });

  it('user mappings include skills and agents with nativeRead: true', () => {
    expect(codexAdapter.userMappings).toEqual([
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

  it('detect returns true when .codex/ exists', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-codex-'));
    tempDirs.push(root);
    await mkdir(join(root, '.codex'));

    const detected = await codexAdapter.detect(root);

    expect(detected).toBe(true);
  });
});
