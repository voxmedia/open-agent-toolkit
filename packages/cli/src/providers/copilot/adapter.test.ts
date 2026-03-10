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

  it('project mappings: skills → .github/skills, agents → .github/agents', () => {
    expect(copilotAdapter.projectMappings).toEqual([
      {
        contentType: 'skill',
        canonicalDir: '.agents/skills',
        providerDir: '.github/skills',
        nativeRead: false,
      },
      {
        contentType: 'agent',
        canonicalDir: '.agents/agents',
        providerDir: '.github/agents',
        nativeRead: false,
      },
    ]);
  });

  it('user mappings: skills → .copilot/skills, agents → .copilot/agents', () => {
    expect(copilotAdapter.userMappings).toEqual([
      {
        contentType: 'skill',
        canonicalDir: '.agents/skills',
        providerDir: '.copilot/skills',
        nativeRead: false,
      },
      {
        contentType: 'agent',
        canonicalDir: '.agents/agents',
        providerDir: '.copilot/agents',
        nativeRead: false,
      },
    ]);
  });

  it('all mappings have nativeRead: false', () => {
    const allMappings = [
      ...copilotAdapter.projectMappings,
      ...copilotAdapter.userMappings,
    ];
    expect(allMappings.every((mapping) => mapping.nativeRead === false)).toBe(
      true,
    );
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

  it('detect returns false when only bare .github/ exists', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-copilot-'));
    tempDirs.push(root);
    await mkdir(join(root, '.github'));

    const detected = await copilotAdapter.detect(root);

    expect(detected).toBe(false);
  });
});
