import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { runPjmDoctorChecks } from './doctor';
import { initializeRepoReference } from './init';

const TEMPLATE_NAMES = [
  'current-state.md',
  'roadmap.md',
  'repo-agents.md',
  'pjm-agents.md',
  'reference-agents.md',
] as const;

async function seedTemplate(root: string, name: string): Promise<void> {
  await mkdir(root, { recursive: true });
  await writeFile(
    join(root, name),
    [
      '---',
      'oat_template: true',
      `oat_template_name: ${name.replace('.md', '')}`,
      '---',
      '',
      `# ${name}`,
      '',
    ].join('\n'),
    'utf8',
  );
}

async function createCanonicalRepo(root: string): Promise<string> {
  const assetsRoot = join(root, 'assets');
  const repoRoot = join(root, '.oat', 'repo');
  for (const templateName of TEMPLATE_NAMES) {
    await seedTemplate(join(assetsRoot, 'templates'), templateName);
  }
  await initializeRepoReference({ repoRoot, assetsRoot });
  return repoRoot;
}

describe('runPjmDoctorChecks', () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(
      tempDirs.map((dir) => rm(dir, { recursive: true, force: true })),
    );
    tempDirs.length = 0;
  });

  it('passes for a canonical initialized PJM repo', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-pjm-doctor-'));
    tempDirs.push(root);
    const repoRoot = await createCanonicalRepo(root);

    const checks = await runPjmDoctorChecks(repoRoot);

    expect(checks.every((check) => check.status === 'pass')).toBe(true);
  });

  it('fails when a canonical file is missing', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-pjm-doctor-'));
    tempDirs.push(root);
    const repoRoot = await createCanonicalRepo(root);
    await rm(join(repoRoot, 'pjm', 'roadmap.md'));

    const checks = await runPjmDoctorChecks(repoRoot);

    expect(checks).toContainEqual(
      expect.objectContaining({
        name: 'pjm:canonical_files',
        status: 'fail',
        message: expect.stringContaining('pjm/roadmap.md'),
      }),
    );
  });

  it('fails when instantiated files still contain template frontmatter', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-pjm-doctor-'));
    tempDirs.push(root);
    const repoRoot = await createCanonicalRepo(root);
    await writeFile(
      join(repoRoot, 'pjm', 'current-state.md'),
      ['---', 'oat_template: true', '---', '', '# Current State', ''].join(
        '\n',
      ),
      'utf8',
    );

    const checks = await runPjmDoctorChecks(repoRoot);

    expect(checks).toContainEqual(
      expect.objectContaining({
        name: 'pjm:template_frontmatter',
        status: 'fail',
        message: expect.stringContaining('pjm/current-state.md'),
      }),
    );
  });

  it('warns about legacy monoliths, loose reference files, second roadmaps, and unknown top-level folders', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-pjm-doctor-'));
    tempDirs.push(root);
    const repoRoot = await createCanonicalRepo(root);
    await mkdir(join(repoRoot, 'unexpected'), { recursive: true });
    await writeFile(
      join(repoRoot, 'reference', 'decision-record.md'),
      '# Legacy',
    );
    await writeFile(join(repoRoot, 'reference', 'notes.md'), '# Loose');
    await writeFile(
      join(repoRoot, 'reference', 'roadmap.md'),
      '# Second roadmap',
    );

    const checks = await runPjmDoctorChecks(repoRoot);

    expect(checks).toContainEqual(
      expect.objectContaining({
        name: 'pjm:top_level_layout',
        status: 'warn',
        message: expect.stringContaining('unexpected'),
      }),
    );
    expect(checks).toContainEqual(
      expect.objectContaining({
        name: 'pjm:legacy_monoliths',
        status: 'warn',
        message: expect.stringContaining('reference/decision-record.md'),
      }),
    );
    expect(checks).toContainEqual(
      expect.objectContaining({
        name: 'pjm:loose_reference_files',
        status: 'warn',
        message: expect.stringContaining('reference/notes.md'),
      }),
    );
    expect(checks).toContainEqual(
      expect.objectContaining({
        name: 'pjm:second_roadmap',
        status: 'warn',
        message: expect.stringContaining('reference/roadmap.md'),
      }),
    );
  });
});
