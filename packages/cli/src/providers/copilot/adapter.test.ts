import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { copilotAdapter } from './adapter';

describe('copilotAdapter', () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(
      tempDirs.map(async (tempDir) => {
        await rm(tempDir, { recursive: true, force: true });
      }),
    );
    tempDirs.length = 0;
  });

  it('has name "copilot" and displayName "GitHub Copilot"', () => {
    expect(copilotAdapter.name).toBe('copilot');
    expect(copilotAdapter.displayName).toBe('GitHub Copilot');
  });

  it('project mappings native-read skills and preserve agents and rules', () => {
    expect(copilotAdapter.projectMappings).toHaveLength(3);
    expect(copilotAdapter.projectMappings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          contentType: 'skill',
          canonicalDir: '.agents/skills',
          providerDir: '.agents/skills',
          nativeRead: true,
          adoptionSourceDirs: ['.github/skills'],
        }),
        expect.objectContaining({
          contentType: 'agent',
          canonicalDir: '.agents/agents',
          providerDir: '.github/agents',
          nativeRead: false,
        }),
        expect.objectContaining({
          contentType: 'rule',
          canonicalDir: '.agents/rules',
          providerDir: '.github/instructions',
          nativeRead: false,
          providerExtension: '.instructions.md',
          transformCanonical: expect.any(Function),
          parseToCanonical: expect.any(Function),
        }),
      ]),
    );
  });

  it('user mappings native-read skills and preserve agents', () => {
    expect(copilotAdapter.userMappings).toEqual([
      {
        contentType: 'skill',
        canonicalDir: '.agents/skills',
        providerDir: '.agents/skills',
        nativeRead: true,
        adoptionSourceDirs: ['.copilot/skills'],
      },
      {
        contentType: 'agent',
        canonicalDir: '.agents/agents',
        providerDir: '.copilot/agents',
        nativeRead: false,
      },
    ]);
  });

  it('only skill mappings have nativeRead: true', () => {
    expect(
      [...copilotAdapter.projectMappings, ...copilotAdapter.userMappings].map(
        ({ contentType, nativeRead }) => ({ contentType, nativeRead }),
      ),
    ).toEqual([
      { contentType: 'skill', nativeRead: true },
      { contentType: 'agent', nativeRead: false },
      { contentType: 'rule', nativeRead: false },
      { contentType: 'skill', nativeRead: true },
      { contentType: 'agent', nativeRead: false },
    ]);
  });

  it('detect returns true when .copilot/ exists', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-copilot-'));
    tempDirs.push(root);
    await mkdir(join(root, '.copilot'));

    const detected = await copilotAdapter.detect(root);

    expect(detected).toBe(true);
  });

  it('detect returns true when .github/copilot-instructions.md exists', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-copilot-'));
    tempDirs.push(root);
    await mkdir(join(root, '.github'), { recursive: true });
    await writeFile(join(root, '.github', 'copilot-instructions.md'), '');

    const detected = await copilotAdapter.detect(root);

    expect(detected).toBe(true);
  });

  it('detect returns true when .github/agents/ exists', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-copilot-'));
    tempDirs.push(root);
    await mkdir(join(root, '.github', 'agents'), { recursive: true });

    const detected = await copilotAdapter.detect(root);

    expect(detected).toBe(true);
  });

  it('detect returns true when .github/skills/ exists', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-copilot-'));
    tempDirs.push(root);
    await mkdir(join(root, '.github', 'skills'), { recursive: true });

    const detected = await copilotAdapter.detect(root);

    expect(detected).toBe(true);
  });

  it('detect returns true when .github/instructions/ exists', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-copilot-'));
    tempDirs.push(root);
    await mkdir(join(root, '.github', 'instructions'), { recursive: true });

    const detected = await copilotAdapter.detect(root);

    expect(detected).toBe(true);
  });

  it('detect returns false when only bare .github/ exists', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-copilot-'));
    tempDirs.push(root);
    await mkdir(join(root, '.github'));

    const detected = await copilotAdapter.detect(root);

    expect(detected).toBe(false);
  });
});
