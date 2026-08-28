import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { writeOatConfig } from '@config/oat-config';
import { afterEach, describe, expect, it } from 'vitest';

import { resolvePjmAdoption } from './adoption';
import { CANONICAL_REPO_REFERENCE_PATHS } from './init';

describe('resolvePjmAdoption', () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(
      tempDirs.map((dir) => rm(dir, { recursive: true, force: true })),
    );
    tempDirs.length = 0;
  });

  async function createProject(): Promise<{
    projectRoot: string;
    repoRoot: string;
  }> {
    const projectRoot = await mkdtemp(join(tmpdir(), 'oat-pjm-adoption-'));
    tempDirs.push(projectRoot);
    const repoRoot = join(projectRoot, '.oat', 'repo');
    await mkdir(repoRoot, { recursive: true });
    return { projectRoot, repoRoot };
  }

  async function seedCanonical(repoRoot: string): Promise<void> {
    for (const relativePath of CANONICAL_REPO_REFERENCE_PATHS) {
      const path = join(repoRoot, relativePath);
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, '', 'utf8');
    }
  }

  it('prefers the explicit project marker over observed files', async () => {
    const { projectRoot, repoRoot } = await createProject();
    await writeOatConfig(projectRoot, {
      version: 1,
      pjm: { initialized: true, schemaVersion: 1 },
    });

    await expect(
      resolvePjmAdoption({ projectRoot, repoRoot }),
    ).resolves.toEqual({
      state: 'declared',
      repoRoot,
      recovery: null,
    });
  });

  it('infers a complete markerless legacy scaffold without writing config', async () => {
    const { projectRoot, repoRoot } = await createProject();
    await seedCanonical(repoRoot);

    await expect(
      resolvePjmAdoption({ projectRoot, repoRoot }),
    ).resolves.toEqual({
      state: 'inferred-legacy',
      repoRoot,
      recovery: null,
    });
  });

  it('distinguishes partial initialization from no adoption', async () => {
    const { projectRoot, repoRoot } = await createProject();
    await mkdir(join(repoRoot, 'pjm'), { recursive: true });
    await writeFile(join(repoRoot, 'pjm', 'roadmap.md'), '# Roadmap\n', 'utf8');

    await expect(
      resolvePjmAdoption({ projectRoot, repoRoot }),
    ).resolves.toEqual({
      state: 'partial-initialization',
      repoRoot,
      recovery: 'oat pjm init',
    });

    await rm(repoRoot, { recursive: true, force: true });
    await expect(
      resolvePjmAdoption({ projectRoot, repoRoot }),
    ).resolves.toEqual({ state: 'none', repoRoot, recovery: 'oat pjm init' });
  });
});
