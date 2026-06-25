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

  it('skips drift checks when project-management is disabled', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-pjm-doctor-'));
    tempDirs.push(root);
    const repoRoot = join(root, '.oat', 'repo');

    const checks = await runPjmDoctorChecks(repoRoot, {
      projectManagementEnabled: false,
    });

    expect(checks).toEqual([
      expect.objectContaining({
        name: 'pjm:disabled',
        status: 'pass',
        message: expect.stringContaining('disabled'),
      }),
    ]);
    expect(checks.some((check) => check.name === 'pjm:canonical_files')).toBe(
      false,
    );
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

  it('fails when a migrated backlog item still carries template frontmatter', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-pjm-doctor-'));
    tempDirs.push(root);
    const repoRoot = await createCanonicalRepo(root);
    await writeFile(
      join(repoRoot, 'pjm', 'backlog', 'items', 'bl-260623-migrated.md'),
      [
        '---',
        'oat_template: true',
        'id: bl-260623-migrated',
        'title: Migrated item',
        '---',
        '',
        '## Description',
        '',
        'Body.',
        '',
      ].join('\n'),
      'utf8',
    );

    const checks = await runPjmDoctorChecks(repoRoot);

    expect(checks).toContainEqual(
      expect.objectContaining({
        name: 'pjm:template_frontmatter',
        status: 'fail',
        message: expect.stringContaining(
          'pjm/backlog/items/bl-260623-migrated.md',
        ),
      }),
    );
  });

  it('fails when an archived backlog item still carries template frontmatter', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-pjm-doctor-'));
    tempDirs.push(root);
    const repoRoot = await createCanonicalRepo(root);
    await writeFile(
      join(repoRoot, 'pjm', 'backlog', 'archived', 'bl-260601-old.md'),
      [
        '---',
        'oat_template_name: backlog-item',
        'id: bl-260601-old',
        '---',
        '',
        '# Archived',
        '',
      ].join('\n'),
      'utf8',
    );

    const checks = await runPjmDoctorChecks(repoRoot);

    expect(checks).toContainEqual(
      expect.objectContaining({
        name: 'pjm:template_frontmatter',
        status: 'fail',
        message: expect.stringContaining(
          'pjm/backlog/archived/bl-260601-old.md',
        ),
      }),
    );
  });

  it('fails when a migrated decision record still carries template frontmatter', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-pjm-doctor-'));
    tempDirs.push(root);
    const repoRoot = await createCanonicalRepo(root);
    await writeFile(
      join(repoRoot, 'reference', 'decisions', 'dr-260623-migrated.md'),
      [
        '---',
        'oat_template: true',
        'id: dr-260623-migrated',
        'title: Migrated decision',
        '---',
        '',
        '## Context',
        '',
        'Body.',
        '',
      ].join('\n'),
      'utf8',
    );

    const checks = await runPjmDoctorChecks(repoRoot);

    expect(checks).toContainEqual(
      expect.objectContaining({
        name: 'pjm:template_frontmatter',
        status: 'fail',
        message: expect.stringContaining(
          'reference/decisions/dr-260623-migrated.md',
        ),
      }),
    );
  });

  it('passes the template-frontmatter check when migrated records are clean', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-pjm-doctor-'));
    tempDirs.push(root);
    const repoRoot = await createCanonicalRepo(root);
    await writeFile(
      join(repoRoot, 'pjm', 'backlog', 'items', 'bl-260623-clean.md'),
      [
        '---',
        'id: bl-260623-clean',
        'title: Clean item',
        'status: open',
        '---',
        '',
        '## Description',
        '',
        'Body.',
        '',
      ].join('\n'),
      'utf8',
    );
    await writeFile(
      join(repoRoot, 'reference', 'decisions', 'dr-260623-clean.md'),
      [
        '---',
        'id: dr-260623-clean',
        'title: Clean decision',
        'date: 2026-06-23',
        'status: accepted',
        '---',
        '',
        '## Context',
        '',
        'Body.',
        '',
      ].join('\n'),
      'utf8',
    );

    const checks = await runPjmDoctorChecks(repoRoot);

    const templateCheck = checks.find(
      (check) => check.name === 'pjm:template_frontmatter',
    );
    expect(templateCheck?.status).toBe('pass');
  });

  it('allows a top-level README.md but still flags genuinely-unknown top-level files (F5)', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-pjm-doctor-'));
    tempDirs.push(root);
    const repoRoot = await createCanonicalRepo(root);
    // A human-facing README at the repo-reference root is benign.
    await writeFile(join(repoRoot, 'README.md'), '# Repo reference');

    const passingChecks = await runPjmDoctorChecks(repoRoot);
    const passingLayout = passingChecks.find(
      (check) => check.name === 'pjm:top_level_layout',
    );
    expect(passingLayout?.status).toBe('pass');
    expect(passingLayout?.message).not.toContain('README.md');

    // An actually-unknown top-level file still trips the layout check, even
    // alongside the now-allowed README.md.
    await writeFile(join(repoRoot, 'stray.md'), '# Stray');

    const failingChecks = await runPjmDoctorChecks(repoRoot);
    expect(failingChecks).toContainEqual(
      expect.objectContaining({
        name: 'pjm:top_level_layout',
        status: 'warn',
        message: expect.stringContaining('stray.md'),
      }),
    );
    const failingLayout = failingChecks.find(
      (check) => check.name === 'pjm:top_level_layout',
    );
    // The allowed README.md is NOT listed among the unknown entries.
    expect(failingLayout?.message).not.toContain('README.md');
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
