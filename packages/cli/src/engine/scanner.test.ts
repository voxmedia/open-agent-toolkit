import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { scanCanonical } from './scanner';

describe('scanCanonical', () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(
      tempDirs.map(async (dir) => {
        await rm(dir, { recursive: true, force: true });
      }),
    );
    tempDirs.length = 0;
  });

  it('discovers skills under .agents/skills/', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-scan-'));
    tempDirs.push(root);
    await mkdir(join(root, '.agents', 'skills', 'skill-one'), {
      recursive: true,
    });

    const entries = await scanCanonical(root, 'project');

    expect(
      entries.some(
        (entry) => entry.type === 'skill' && entry.name === 'skill-one',
      ),
    ).toBe(true);
  });

  it('discovers agents under .agents/agents/ for project scope', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-scan-'));
    tempDirs.push(root);
    await mkdir(join(root, '.agents', 'agents', 'agent-one'), {
      recursive: true,
    });

    const entries = await scanCanonical(root, 'project');

    expect(
      entries.some(
        (entry) => entry.type === 'agent' && entry.name === 'agent-one',
      ),
    ).toBe(true);
  });

  it('skips agents for user scope (skills only)', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-scan-'));
    tempDirs.push(root);
    await mkdir(join(root, '.agents', 'skills', 'skill-one'), {
      recursive: true,
    });
    await mkdir(join(root, '.agents', 'agents', 'agent-one'), {
      recursive: true,
    });

    const entries = await scanCanonical(root, 'user');

    expect(entries.some((entry) => entry.type === 'skill')).toBe(true);
    expect(entries.some((entry) => entry.type === 'agent')).toBe(false);
  });

  it('returns empty array when .agents/ does not exist', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-scan-'));
    tempDirs.push(root);

    const entries = await scanCanonical(root, 'project');

    expect(entries).toEqual([]);
  });

  it('ignores non-.md files', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-scan-'));
    tempDirs.push(root);
    await mkdir(join(root, '.agents', 'agents'), { recursive: true });
    await writeFile(
      join(root, '.agents', 'agents', 'README.txt'),
      'ignore me',
      'utf8',
    );

    const entries = await scanCanonical(root, 'project');

    expect(entries).toEqual([]);
  });

  it('ignores .md files under skills (file-based discovery is agents-only)', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-scan-'));
    tempDirs.push(root);
    await mkdir(join(root, '.agents', 'skills'), { recursive: true });
    await writeFile(
      join(root, '.agents', 'skills', 'my-skill.md'),
      '# some skill\n',
      'utf8',
    );

    const entries = await scanCanonical(root, 'project');

    expect(entries).toEqual([]);
  });

  it('discovers .md file agents with isFile: true', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-scan-'));
    tempDirs.push(root);
    await mkdir(join(root, '.agents', 'agents'), { recursive: true });
    await writeFile(
      join(root, '.agents', 'agents', 'oat-reviewer.md'),
      '# Reviewer agent\n',
      'utf8',
    );

    const entries = await scanCanonical(root, 'project');

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      name: 'oat-reviewer.md',
      type: 'agent',
      isFile: true,
      canonicalPath: join(root, '.agents', 'agents', 'oat-reviewer.md'),
    });
  });

  it('returns mixed directory and file entries', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-scan-'));
    tempDirs.push(root);
    await mkdir(join(root, '.agents', 'agents', 'agent-dir'), {
      recursive: true,
    });
    await writeFile(
      join(root, '.agents', 'agents', 'agent-file.md'),
      '# File agent\n',
      'utf8',
    );

    const entries = await scanCanonical(root, 'project');

    const dirEntry = entries.find((e) => e.name === 'agent-dir');
    const fileEntry = entries.find((e) => e.name === 'agent-file.md');
    expect(dirEntry).toMatchObject({ isFile: false, type: 'agent' });
    expect(fileEntry).toMatchObject({ isFile: true, type: 'agent' });
  });

  it('directory entries have isFile: false', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-scan-'));
    tempDirs.push(root);
    await mkdir(join(root, '.agents', 'skills', 'skill-one'), {
      recursive: true,
    });

    const entries = await scanCanonical(root, 'project');

    expect(entries[0]?.isFile).toBe(false);
  });

  it('treats a directory named with .md extension as isFile: false', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-scan-'));
    tempDirs.push(root);
    await mkdir(join(root, '.agents', 'agents', 'tricky-name.md'), {
      recursive: true,
    });

    const entries = await scanCanonical(root, 'project');

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      name: 'tricky-name.md',
      type: 'agent',
      isFile: false,
    });
  });

  it('populates canonicalPath as absolute path', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-scan-'));
    tempDirs.push(root);
    await mkdir(join(root, '.agents', 'skills', 'skill-one'), {
      recursive: true,
    });

    const entries = await scanCanonical(root, 'project');
    const skill = entries.find((entry) => entry.name === 'skill-one');

    expect(skill).toBeDefined();
    expect(skill?.canonicalPath).toBe(
      join(root, '.agents', 'skills', 'skill-one'),
    );
  });

  it('requires concrete scope values at compile time', () => {
    const root = '/tmp/oat-scan';
    // @ts-expect-error scanner intentionally rejects all-scope orchestration.
    scanCanonical(root, 'all');
    expect(true).toBe(true);
  });
});
