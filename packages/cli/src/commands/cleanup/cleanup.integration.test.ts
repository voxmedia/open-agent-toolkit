import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  discoverArtifactCandidates,
  findReferencedArtifactCandidates,
  planDuplicatePruneActions,
  planNonInteractiveArtifactActions,
  runCleanupArtifacts,
} from './artifacts/artifacts';
import { runCleanupProject } from './project/project';

async function createRepoRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'oat-cleanup-int-'));
  await mkdir(join(root, '.git'), { recursive: true });
  await mkdir(join(root, '.oat', 'templates'), { recursive: true });
  await mkdir(join(root, '.oat', 'projects', 'shared', 'demo'), {
    recursive: true,
  });
  await mkdir(join(root, '.oat', 'repo', 'reviews'), { recursive: true });
  await mkdir(join(root, '.oat', 'repo', 'reference', 'external-plans'), {
    recursive: true,
  });
  await mkdir(join(root, '.oat', 'repo', 'reference'), { recursive: true });
  return root;
}

describe('cleanup integration', () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(
      tempDirs.map(async (dir) => rm(dir, { recursive: true, force: true })),
    );
    tempDirs.length = 0;
  });

  it('cleanup project apply is idempotent', async () => {
    const root = await createRepoRoot();
    tempDirs.push(root);
    await writeFile(
      join(root, '.oat', 'templates', 'state.md'),
      [
        '---',
        'oat_template: true',
        '---',
        '',
        '# Project State: {Project Name}',
      ].join('\n'),
      'utf8',
    );
    await writeFile(
      join(root, '.oat', 'active-project'),
      '.oat/projects/shared/missing\n',
      'utf8',
    );
    await writeFile(
      join(root, '.oat', 'projects', 'shared', 'demo', 'plan.md'),
      '# plan\n',
      'utf8',
    );

    const first = await runCleanupProject(
      { repoRoot: root, apply: true, today: '2026-02-18' },
      { refreshDashboard: async () => undefined },
    );
    const second = await runCleanupProject(
      { repoRoot: root, apply: true, today: '2026-02-18' },
      { refreshDashboard: async () => undefined },
    );

    expect(first.summary.applied).toBeGreaterThan(0);
    expect(second.summary.applied).toBe(0);
    expect(second.actions).toEqual([]);
  });

  it('artifact cleanup flow handles duplicates, references, and safety gates', async () => {
    const root = await createRepoRoot();
    tempDirs.push(root);
    await writeFile(
      join(root, '.oat', 'repo', 'reviews', 'r1.md'),
      '# r1',
      'utf8',
    );
    await writeFile(
      join(root, '.oat', 'repo', 'reviews', 'r1-v2.md'),
      '# r1-v2',
      'utf8',
    );
    await writeFile(
      join(root, '.oat', 'repo', 'reviews', 'stale.md'),
      '# stale',
      'utf8',
    );
    await writeFile(
      join(root, '.oat', 'repo', 'reference', 'external-plans', 'p1.md'),
      '# p1',
      'utf8',
    );
    await writeFile(
      join(root, '.oat', 'repo', 'reference', 'backlog.md'),
      'Uses .oat/repo/reference/external-plans/p1.md',
      'utf8',
    );

    const allCandidates = await discoverArtifactCandidates(root);
    const duplicatePrunes = planDuplicatePruneActions(allCandidates);
    const filteredCandidates = await discoverArtifactCandidates(
      root,
      duplicatePrunes.map((action) => action.target),
    );
    const hits = await findReferencedArtifactCandidates(
      root,
      filteredCandidates,
    );
    const candidateRows = filteredCandidates.map((target) => ({
      target,
      referenced: hits.has(target),
    }));
    const nonInteractive = planNonInteractiveArtifactActions(candidateRows, {
      allCandidates: true,
      yes: true,
    });

    expect(nonInteractive).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'block',
          target: '.oat/repo/reference/external-plans/p1.md',
        }),
      ]),
    );
    expect(
      nonInteractive.some(
        (action) =>
          action.type === 'delete' &&
          action.target === '.oat/repo/reviews/stale.md',
      ),
    ).toBe(true);
  });

  it('artifact cleanup apply archives selected targets via planArchiveActions composition', async () => {
    const root = await createRepoRoot();
    tempDirs.push(root);
    await writeFile(
      join(root, '.oat', 'repo', 'reviews', 'stale.md'),
      '# stale',
      'utf8',
    );

    const payload = await runCleanupArtifacts(
      {
        repoRoot: root,
        apply: true,
        interactive: true,
        timestamp: '20260218-121314',
      },
      {
        runInteractiveStaleTriage: async () => ({
          keep: [],
          archive: ['.oat/repo/reviews/stale.md'],
          delete: [],
        }),
      },
    );

    expect(payload.status).toBe('ok');
    expect(payload.actions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'archive',
          target: '.oat/repo/archive/reviews/stale.md',
          result: 'applied',
        }),
      ]),
    );
    await expect(
      readFile(join(root, '.oat', 'repo', 'archive', 'reviews', 'stale.md')),
    ).resolves.toBeDefined();
  });
});
