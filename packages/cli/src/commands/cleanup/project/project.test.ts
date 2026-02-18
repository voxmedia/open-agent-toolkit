import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { scanCleanupProjectDrift } from './project';

async function createRepoRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'oat-cleanup-project-'));
  await mkdir(join(root, '.git'), { recursive: true });
  await mkdir(join(root, '.oat', 'projects', 'shared'), { recursive: true });
  await mkdir(join(root, '.oat', 'projects', 'local'), { recursive: true });
  return root;
}

describe('cleanup project drift scanning', () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(
      tempDirs.map(async (dir) => rm(dir, { recursive: true, force: true })),
    );
    tempDirs.length = 0;
  });

  it('detects invalid active project pointer', async () => {
    const root = await createRepoRoot();
    tempDirs.push(root);
    await writeFile(
      join(root, '.oat', 'active-project'),
      '.oat/projects/shared/missing\n',
      'utf8',
    );

    const payload = await scanCleanupProjectDrift({ repoRoot: root });

    expect(payload.actions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'clear',
          target: '.oat/active-project',
        }),
      ]),
    );
  });

  it('detects missing state.md when lifecycle artifacts exist', async () => {
    const root = await createRepoRoot();
    tempDirs.push(root);
    const projectDir = join(root, '.oat', 'projects', 'shared', 'demo');
    await mkdir(projectDir, { recursive: true });
    await writeFile(join(projectDir, 'plan.md'), '# plan\n', 'utf8');

    const payload = await scanCleanupProjectDrift({ repoRoot: root });

    expect(payload.actions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'create',
          target: '.oat/projects/shared/demo/state.md',
        }),
      ]),
    );
  });

  it('detects completed project missing oat_lifecycle: complete', async () => {
    const root = await createRepoRoot();
    tempDirs.push(root);
    const projectDir = join(root, '.oat', 'projects', 'shared', 'done-project');
    await mkdir(projectDir, { recursive: true });
    await writeFile(
      join(projectDir, 'plan.md'),
      [
        '## Reviews',
        '',
        '| Scope | Type | Status | Date | Artifact |',
        '|-------|------|--------|------|----------|',
        '| final | code | passed | 2026-02-18 | reviews/final.md |',
      ].join('\n'),
      'utf8',
    );
    await writeFile(
      join(projectDir, 'state.md'),
      ['---', 'oat_phase: implement', 'oat_phase_status: complete', '---'].join(
        '\n',
      ),
      'utf8',
    );

    const payload = await scanCleanupProjectDrift({ repoRoot: root });

    expect(payload.actions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'update',
          target: '.oat/projects/shared/done-project/state.md',
        }),
      ]),
    );
  });
});
