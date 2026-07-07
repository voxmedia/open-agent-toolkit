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
  'repo-readme.md',
  'pjm-handoffs-readme.md',
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

  it('fails canonical_files with the init fix when README.md is missing', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-pjm-doctor-'));
    tempDirs.push(root);
    const repoRoot = await createCanonicalRepo(root);
    await rm(join(repoRoot, 'README.md'));

    const checks = await runPjmDoctorChecks(repoRoot);

    const check = checks.find((c) => c.name === 'pjm:canonical_files');
    expect(check?.status).toBe('fail');
    expect(check?.message).toContain('README.md');
    expect(check?.fix).toContain('oat pjm init');
  });

  it('fails canonical_files when the pjm handoffs README is missing', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-pjm-doctor-'));
    tempDirs.push(root);
    const repoRoot = await createCanonicalRepo(root);
    await rm(join(repoRoot, 'pjm', 'handoffs', 'README.md'));

    const checks = await runPjmDoctorChecks(repoRoot);

    const check = checks.find((c) => c.name === 'pjm:canonical_files');
    expect(check?.status).toBe('fail');
    expect(check?.message).toContain('pjm/handoffs/README.md');
    expect(check?.fix).toContain('oat pjm init');
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

  async function writeBacklogItem(
    repoRoot: string,
    directory: 'items' | 'archived',
    id: string,
    status: string,
  ): Promise<void> {
    const dir = join(repoRoot, 'pjm', 'backlog', directory);
    await mkdir(dir, { recursive: true });
    await writeFile(
      join(dir, `${id}.md`),
      [
        '---',
        `id: ${id}`,
        `title: ${id}`,
        `status: ${status}`,
        '---',
        '',
        '## Description',
        '',
        'Body.',
        '',
      ].join('\n'),
      'utf8',
    );
  }

  it('fails backlog_terminal_in_items when a closed/wont_do item remains under items/', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-pjm-doctor-'));
    tempDirs.push(root);
    const repoRoot = await createCanonicalRepo(root);
    await writeBacklogItem(repoRoot, 'items', 'BL-260101-closed', 'closed');
    await writeBacklogItem(repoRoot, 'items', 'BL-260102-wontdo', 'wont_do');

    const checks = await runPjmDoctorChecks(repoRoot);

    const check = checks.find(
      (c) => c.name === 'pjm:backlog_terminal_in_items',
    );
    expect(check?.status).toBe('fail');
    expect(check?.message).toContain('pjm/backlog/items/BL-260101-closed.md');
    expect(check?.message).toContain('pjm/backlog/items/BL-260102-wontdo.md');
    expect(check?.fix).toContain('oat backlog archive');
  });

  it('passes backlog_terminal_in_items when items/ holds only non-terminal statuses', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-pjm-doctor-'));
    tempDirs.push(root);
    const repoRoot = await createCanonicalRepo(root);
    await writeBacklogItem(repoRoot, 'items', 'BL-260101-open', 'open');
    await writeBacklogItem(
      repoRoot,
      'items',
      'BL-260102-progress',
      'in_progress',
    );

    const checks = await runPjmDoctorChecks(repoRoot);

    const check = checks.find(
      (c) => c.name === 'pjm:backlog_terminal_in_items',
    );
    expect(check?.status).toBe('pass');
  });

  it('fails backlog_invalid_status for out-of-enum statuses in items/ and archived/', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-pjm-doctor-'));
    tempDirs.push(root);
    const repoRoot = await createCanonicalRepo(root);
    await writeBacklogItem(repoRoot, 'items', 'BL-260101-doneitem', 'done');
    await writeBacklogItem(
      repoRoot,
      'archived',
      'BL-260102-donearchived',
      'done',
    );

    const checks = await runPjmDoctorChecks(repoRoot);

    const check = checks.find((c) => c.name === 'pjm:backlog_invalid_status');
    expect(check?.status).toBe('fail');
    expect(check?.message).toContain('pjm/backlog/items/BL-260101-doneitem.md');
    expect(check?.message).toContain(
      'pjm/backlog/archived/BL-260102-donearchived.md',
    );
    // Message surfaces the valid enum values.
    expect(check?.message).toContain('open');
    expect(check?.message).toContain('wont_do');
  });

  it('passes backlog_invalid_status when every status is within the enum', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-pjm-doctor-'));
    tempDirs.push(root);
    const repoRoot = await createCanonicalRepo(root);
    await writeBacklogItem(repoRoot, 'items', 'BL-260101-open', 'open');
    await writeBacklogItem(repoRoot, 'archived', 'BL-260102-closed', 'closed');

    const checks = await runPjmDoctorChecks(repoRoot);

    const check = checks.find((c) => c.name === 'pjm:backlog_invalid_status');
    expect(check?.status).toBe('pass');
  });

  it('fails backlog_invalid_status when an item has no status field', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-pjm-doctor-'));
    tempDirs.push(root);
    const repoRoot = await createCanonicalRepo(root);
    // A status-less item file must not be invisible to drift detection.
    const dir = join(repoRoot, 'pjm', 'backlog', 'items');
    await mkdir(dir, { recursive: true });
    await writeFile(
      join(dir, 'BL-260101-nostatus.md'),
      [
        '---',
        'id: BL-260101-nostatus',
        'title: No status item',
        '---',
        '',
        '## Description',
        '',
        'Body.',
        '',
      ].join('\n'),
      'utf8',
    );
    // A well-formed sibling must not be flagged.
    await writeBacklogItem(repoRoot, 'items', 'BL-260102-open', 'open');

    const checks = await runPjmDoctorChecks(repoRoot);

    const check = checks.find((c) => c.name === 'pjm:backlog_invalid_status');
    expect(check?.status).toBe('fail');
    expect(check?.message).toContain('missing status');
    expect(check?.message).toContain('pjm/backlog/items/BL-260101-nostatus.md');
    expect(check?.message).not.toContain('BL-260102-open');
    // Valid enum values remain in the message.
    expect(check?.message).toContain('open');
    expect(check?.message).toContain('wont_do');
  });

  it('warns backlog_archived_open when an archived item is still open/in_progress', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-pjm-doctor-'));
    tempDirs.push(root);
    const repoRoot = await createCanonicalRepo(root);
    await writeBacklogItem(repoRoot, 'archived', 'BL-260101-stillopen', 'open');
    await writeBacklogItem(
      repoRoot,
      'archived',
      'BL-260102-stillprogress',
      'in_progress',
    );
    // A properly terminal archived item does not trip the check.
    await writeBacklogItem(repoRoot, 'archived', 'BL-260103-closed', 'closed');

    const checks = await runPjmDoctorChecks(repoRoot);

    const check = checks.find((c) => c.name === 'pjm:backlog_archived_open');
    expect(check?.status).toBe('warn');
    expect(check?.message).toContain(
      'pjm/backlog/archived/BL-260101-stillopen.md',
    );
    expect(check?.message).toContain(
      'pjm/backlog/archived/BL-260102-stillprogress.md',
    );
    expect(check?.message).not.toContain('BL-260103-closed');
  });

  it('passes backlog_archived_open when archived items carry terminal statuses', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-pjm-doctor-'));
    tempDirs.push(root);
    const repoRoot = await createCanonicalRepo(root);
    await writeBacklogItem(repoRoot, 'archived', 'BL-260101-closed', 'closed');
    await writeBacklogItem(repoRoot, 'archived', 'BL-260102-wontdo', 'wont_do');

    const checks = await runPjmDoctorChecks(repoRoot);

    const check = checks.find((c) => c.name === 'pjm:backlog_archived_open');
    expect(check?.status).toBe('pass');
  });

  it('fails backlog_duplicate_id when the same id exists in items/ and archived/', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-pjm-doctor-'));
    tempDirs.push(root);
    const repoRoot = await createCanonicalRepo(root);
    await writeBacklogItem(repoRoot, 'items', 'BL-260101-dup', 'open');
    await writeBacklogItem(repoRoot, 'archived', 'BL-260101-dup', 'closed');
    // A non-duplicate sibling in each directory must not be flagged.
    await writeBacklogItem(repoRoot, 'items', 'BL-260102-solo', 'open');
    await writeBacklogItem(repoRoot, 'archived', 'BL-260103-done', 'closed');

    const checks = await runPjmDoctorChecks(repoRoot);

    const check = checks.find((c) => c.name === 'pjm:backlog_duplicate_id');
    expect(check?.status).toBe('fail');
    expect(check?.message).toContain('pjm/backlog/items/BL-260101-dup.md');
    expect(check?.message).toContain('pjm/backlog/archived/BL-260101-dup.md');
    expect(check?.message).not.toContain('BL-260102-solo');
    expect(check?.message).not.toContain('BL-260103-done');
    expect(check?.fix).toContain('Reconcile');
  });

  it('passes backlog_duplicate_id when no id is present in both directories', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-pjm-doctor-'));
    tempDirs.push(root);
    const repoRoot = await createCanonicalRepo(root);
    await writeBacklogItem(repoRoot, 'items', 'BL-260101-open', 'open');
    await writeBacklogItem(repoRoot, 'archived', 'BL-260102-closed', 'closed');

    const checks = await runPjmDoctorChecks(repoRoot);

    const check = checks.find((c) => c.name === 'pjm:backlog_duplicate_id');
    expect(check?.status).toBe('pass');
  });

  it('warns backlog_completed_unarchived when a completed entry file still sits in items/', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-pjm-doctor-'));
    tempDirs.push(root);
    const repoRoot = await createCanonicalRepo(root);
    await writeBacklogItem(repoRoot, 'items', 'BL-260101-shipped', 'open');
    // Legacy lowercase id in items/ referenced by an uppercase completed entry.
    await writeBacklogItem(
      repoRoot,
      'items',
      'bl-260102-legacy',
      'in_progress',
    );
    await writeFile(
      join(repoRoot, 'pjm', 'backlog', 'completed.md'),
      [
        '# OAT Backlog Completed',
        '',
        '## Entry Format',
        '',
        '- `YYYY-MM-DD — BL-YYMMDD-slug — Title — one-line outcome summary`',
        '',
        '## Completed Items',
        '',
        '- 2026-01-01 — BL-260101-shipped — Shipped thing — did it',
        '- 2026-01-02 — BL-260102-LEGACY — Legacy thing — case-insensitive',
        'some unparseable freeform line with no id',
        '',
      ].join('\n'),
      'utf8',
    );

    const checks = await runPjmDoctorChecks(repoRoot);

    const check = checks.find(
      (c) => c.name === 'pjm:backlog_completed_unarchived',
    );
    expect(check?.status).toBe('warn');
    expect(check?.message).toContain('pjm/backlog/items/BL-260101-shipped.md');
    expect(check?.message).toContain('pjm/backlog/items/bl-260102-legacy.md');
  });

  it('passes backlog_completed_unarchived when completed entries reference archived files only', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-pjm-doctor-'));
    tempDirs.push(root);
    const repoRoot = await createCanonicalRepo(root);
    await writeBacklogItem(repoRoot, 'archived', 'BL-260101-done', 'closed');
    await writeFile(
      join(repoRoot, 'pjm', 'backlog', 'completed.md'),
      [
        '# OAT Backlog Completed',
        '',
        '## Completed Items',
        '',
        '- 2026-01-01 — BL-260101-done — Done thing — shipped',
        'freeform line, unparseable, should be ignored',
        '',
      ].join('\n'),
      'utf8',
    );

    const checks = await runPjmDoctorChecks(repoRoot);

    const check = checks.find(
      (c) => c.name === 'pjm:backlog_completed_unarchived',
    );
    expect(check?.status).toBe('pass');
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
