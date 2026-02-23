import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { resolveProjectsRoot } from './oat-paths';

describe('resolveProjectsRoot', () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(
      tempDirs.map(async (dir) => rm(dir, { recursive: true, force: true })),
    );
    tempDirs.length = 0;
  });

  async function createRepoRoot(): Promise<string> {
    const root = await mkdtemp(join(tmpdir(), 'oat-projects-root-'));
    tempDirs.push(root);
    await mkdir(join(root, '.oat'), { recursive: true });
    return root;
  }

  it('uses OAT_PROJECTS_ROOT env override first', async () => {
    const repoRoot = await createRepoRoot();

    const result = await resolveProjectsRoot(repoRoot, {
      OAT_PROJECTS_ROOT: '.oat/projects/from-env',
    } as NodeJS.ProcessEnv);

    expect(result).toBe('.oat/projects/from-env');
  });

  it('uses config.json.projects.root when env is unset', async () => {
    const repoRoot = await createRepoRoot();
    await writeFile(
      join(repoRoot, '.oat', 'config.json'),
      `${JSON.stringify({ version: 1, projects: { root: '.oat/projects/from-config' } })}\n`,
      'utf8',
    );

    const result = await resolveProjectsRoot(repoRoot, {} as NodeJS.ProcessEnv);

    expect(result).toBe('.oat/projects/from-config');
  });

  it('uses default when env and config are unset', async () => {
    const repoRoot = await createRepoRoot();

    const result = await resolveProjectsRoot(repoRoot, {} as NodeJS.ProcessEnv);

    expect(result).toBe('.oat/projects/shared');
  });
});
