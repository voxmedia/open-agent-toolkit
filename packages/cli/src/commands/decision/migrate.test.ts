import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { migrateDecisionRecords } from './migrate';

const LEGACY_DECISIONS = [
  '# OAT Decision Record',
  '',
  '## Decision Index',
  '',
  '| ID | Date | Status | Decision | Context |',
  '| --- | --- | --- | --- | --- |',
  '| ADR-001 | 2026-06-22 | accepted | Adopt PJM split | Shared files collide |',
  '| DR-002 | 2026-06-23 | proposed | Add decision command | Decisions need file records |',
  '',
  '## ADR-001: Adopt PJM split',
  '',
  '- Date: 2026-06-22',
  '- Status: accepted',
  '- Context: Shared files collide across worktrees.',
  '- Decision: Use repo-local deterministic IDs.',
  '- Consequences: Regenerate indexes after conflicts.',
  '',
  '## DR-002: Add decision command',
  '',
  '- Date: 2026-06-23',
  '- Status: proposed',
  '- Context: Decisions need file records.',
  '- Decision: Add oat decision.',
  '- Consequences: Existing records need migration.',
  '',
].join('\n');

// Mirrors this repo's real `.oat/repo/reference/decision-record.md` shape:
// `### ADR-NNN: Title` / `### DR-NNN: Title` headings with bold `- **Date:**` /
// `- **Status:**` metadata fields followed by a free-form body. The parser must
// handle this real-world format (the headline B1 bug returned zero sections).
const REAL_WORLD_DECISIONS = [
  '# OAT Decision Record (Internal / Dogfood)',
  '',
  'Track notable decisions made while evolving OAT in this repo.',
  '',
  '## Decision Index',
  '',
  '| ID      | Date       | Status   | Title                         |',
  '| ------- | ---------- | -------- | ----------------------------- |',
  '| ADR-001 | 2026-01-30 | accepted | Keep active-project path-based |',
  '| ADR-002 | 2026-01-31 | accepted | Standardize progress indicators |',
  '| DR-003  | 2026-02-14 | proposed | Adopt skill-first invocation  |',
  '',
  '## Decisions',
  '',
  '### ADR-001: Keep active-project path-based',
  '',
  '- **Date:** 2026-01-30',
  '- **Status:** accepted',
  '- **Drivers:** Avoid breaking existing skills that assume a full path.',
  '',
  '#### Context',
  '',
  'We considered migrating to a name-only pointer but kept the path for v1.',
  '',
  '#### Decision',
  '',
  'Canonical write format stores a full path to the active project directory.',
  '',
  '### ADR-002: Standardize progress indicators',
  '',
  '- **Date:** 2026-01-31',
  '- **Status:** accepted',
  '',
  '#### Decision',
  '',
  'OAT skills should provide lightweight, consistent progress feedback.',
  '',
  '### DR-003: Adopt skill-first invocation',
  '',
  '- **Date:** 2026-02-14',
  '- **Status:** proposed',
  '- **Drivers:** Reduce cross-client confusion and workflow drift.',
  '',
  '#### Decision',
  '',
  'Canonical invocation contract is skill names; slash commands are optional.',
  '',
].join('\n');

// Mirrors this repo's real `decision-record.md` tail: a `## Decisions` region
// with `### ADR-NNN` records whose bodies use `#### Context`/`#### Decision`
// sub-headings, followed by a trailing `## ADR Template` boilerplate block that
// is NOT an ADR/DR heading. The parser used to run the LAST section's body to
// EOF and absorb that template tail (F2).
const TRAILING_TEMPLATE_DECISIONS = [
  '# OAT Decision Record',
  '',
  '## Decision Index',
  '',
  '| ID      | Date       | Status   | Title                        |',
  '| ------- | ---------- | -------- | ---------------------------- |',
  '| ADR-020 | 2026-04-01 | accepted | Adopt deterministic ids      |',
  '| DR-021  | 2026-04-02 | accepted | Make oat tools install        |',
  '',
  '## Decisions',
  '',
  '### ADR-020: Adopt deterministic ids',
  '',
  '- **Date:** 2026-04-01',
  '- **Status:** accepted',
  '',
  '#### Context',
  '',
  'Hash ids collided across worktrees.',
  '',
  '#### Decision',
  '',
  'Use date plus slug ids everywhere.',
  '',
  '### DR-021: Make oat tools install',
  '',
  '- **Date:** 2026-04-02',
  '- **Status:** accepted',
  '',
  '#### Context',
  '',
  'Installing tools by hand was error prone.',
  '',
  '#### Decision',
  '',
  'Ship an oat tools install command.',
  '',
  '## ADR Template',
  '',
  'Copy this block to add a new decision record.',
  '',
  '### ADR-NNN: Title',
  '',
  '- **Date:** YYYY-MM-DD',
  '- **Status:** proposed',
  '',
].join('\n');

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

describe('migrateDecisionRecords', () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(
      tempDirs.map((dir) => rm(dir, { recursive: true, force: true })),
    );
    tempDirs.length = 0;
  });

  it('dry-runs legacy mappings without writing files', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-decision-migrate-'));
    tempDirs.push(root);
    const referenceRoot = join(root, 'reference');
    await mkdir(referenceRoot, { recursive: true });
    await writeFile(
      join(referenceRoot, 'decision-record.md'),
      LEGACY_DECISIONS,
      {
        encoding: 'utf8',
        flag: 'wx',
      },
    );

    const result = await migrateDecisionRecords({
      referenceRoot,
      dryRun: true,
    });

    expect(result.dryRun).toBe(true);
    expect(result.mappings).toEqual([
      {
        legacyId: 'ADR-001',
        id: 'DR-260622-adopt-pjm-split',
        title: 'Adopt PJM split',
        date: '2026-06-22',
        filePath: join(
          referenceRoot,
          'decisions',
          'DR-260622-adopt-pjm-split.md',
        ),
      },
      {
        legacyId: 'DR-002',
        id: 'DR-260623-add-decision-command',
        title: 'Add decision command',
        date: '2026-06-23',
        filePath: join(
          referenceRoot,
          'decisions',
          'DR-260623-add-decision-command.md',
        ),
      },
    ]);
    await expect(pathExists(join(referenceRoot, 'decisions'))).resolves.toBe(
      false,
    );
  });

  it('applies migration with legacy ids, preserved body text, and regenerated index', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-decision-migrate-'));
    tempDirs.push(root);
    const referenceRoot = join(root, 'reference');
    await mkdir(referenceRoot, { recursive: true });
    await writeFile(
      join(referenceRoot, 'decision-record.md'),
      LEGACY_DECISIONS,
      {
        encoding: 'utf8',
        flag: 'wx',
      },
    );

    const result = await migrateDecisionRecords({ referenceRoot });

    expect(result.dryRun).toBe(false);
    expect(result.written).toEqual([
      join(referenceRoot, 'decisions', 'DR-260622-adopt-pjm-split.md'),
      join(referenceRoot, 'decisions', 'DR-260623-add-decision-command.md'),
    ]);
    const firstRecord = await readFile(result.written[0]!, 'utf8');
    expect(firstRecord).toContain('legacy_id: ADR-001');
    expect(firstRecord).toContain('## ADR-001: Adopt PJM split');
    expect(firstRecord).toContain('Use repo-local deterministic IDs.');
    const index = await readFile(
      join(referenceRoot, 'decisions', 'index.md'),
      'utf8',
    );
    expect(index).toContain(
      '| DR-260623-add-decision-command | 2026-06-23 | proposed | Add decision command | DR-002 |',
    );
    expect(index).toContain(
      '| DR-260622-adopt-pjm-split | 2026-06-22 | accepted | Adopt PJM split | ADR-001 |',
    );
  });

  it('deletes the legacy source only after parsed index and section counts match', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-decision-migrate-'));
    tempDirs.push(root);
    const referenceRoot = join(root, 'reference');
    await mkdir(referenceRoot, { recursive: true });
    const mismatchedLegacy = [
      '# OAT Decision Record',
      '',
      '| ID | Date | Status | Decision | Context |',
      '| --- | --- | --- | --- | --- |',
      '| ADR-001 | 2026-06-22 | accepted | Adopt PJM split | Shared files collide |',
      '| DR-002 | 2026-06-23 | proposed | Missing section | Missing body |',
      '',
      '## ADR-001: Adopt PJM split',
      '',
      '- Date: 2026-06-22',
      '- Status: accepted',
      '- Decision: Use repo-local deterministic IDs.',
      '',
    ].join('\n');
    await writeFile(
      join(referenceRoot, 'decision-record.md'),
      mismatchedLegacy,
      {
        encoding: 'utf8',
        flag: 'wx',
      },
    );

    await expect(
      migrateDecisionRecords({ referenceRoot, deleteLegacy: true }),
    ).rejects.toThrow('Refusing to delete legacy decision source');
    await expect(
      pathExists(join(referenceRoot, 'decision-record.md')),
    ).resolves.toBe(true);
    await expect(pathExists(join(referenceRoot, 'decisions'))).resolves.toBe(
      false,
    );
  });

  it('refuses to delete an unparseable legacy source with no decision sections', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-decision-migrate-'));
    tempDirs.push(root);
    const referenceRoot = join(root, 'reference');
    await mkdir(referenceRoot, { recursive: true });
    await writeFile(
      join(referenceRoot, 'decision-record.md'),
      [
        '# OAT Decision Record',
        '',
        'This legacy file has prose but no parseable ADR or DR sections.',
        '',
        'The migration must not delete it when no mappings are produced.',
        '',
      ].join('\n'),
      {
        encoding: 'utf8',
        flag: 'wx',
      },
    );

    await expect(
      migrateDecisionRecords({ referenceRoot, deleteLegacy: true }),
    ).rejects.toThrow(
      'Refusing to delete legacy decision source because no legacy decision sections were parsed.',
    );
    await expect(
      pathExists(join(referenceRoot, 'decision-record.md')),
    ).resolves.toBe(true);
    await expect(pathExists(join(referenceRoot, 'decisions'))).resolves.toBe(
      false,
    );
  });

  it('is repeatable after a completed migration and can delete verified legacy source', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-decision-migrate-'));
    tempDirs.push(root);
    const referenceRoot = join(root, 'reference');
    await mkdir(referenceRoot, { recursive: true });
    await writeFile(
      join(referenceRoot, 'decision-record.md'),
      LEGACY_DECISIONS,
      {
        encoding: 'utf8',
        flag: 'wx',
      },
    );

    await migrateDecisionRecords({ referenceRoot });
    const rerun = await migrateDecisionRecords({
      referenceRoot,
      deleteLegacy: true,
    });

    expect(rerun.written).toEqual([]);
    expect(rerun.deletedLegacy).toBe(true);
    expect(rerun.mappings).toHaveLength(2);
    await expect(
      pathExists(join(referenceRoot, 'decision-record.md')),
    ).resolves.toBe(false);
  });

  it('rejects duplicate target paths before writing migration output', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-decision-migrate-'));
    tempDirs.push(root);
    const referenceRoot = join(root, 'reference');
    await mkdir(referenceRoot, { recursive: true });
    const duplicateLegacy = [
      '# OAT Decision Record',
      '',
      '## ADR-001: Same Title',
      '',
      '- Date: 2026-06-22',
      '- Status: accepted',
      '- Decision: First body.',
      '',
      '## DR-002: Same Title',
      '',
      '- Date: 2026-06-22',
      '- Status: proposed',
      '- Decision: Second body.',
      '',
    ].join('\n');
    await writeFile(
      join(referenceRoot, 'decision-record.md'),
      duplicateLegacy,
      {
        encoding: 'utf8',
        flag: 'wx',
      },
    );

    await expect(migrateDecisionRecords({ referenceRoot })).rejects.toThrow(
      'Duplicate decision migration target',
    );
    await expect(pathExists(join(referenceRoot, 'decisions'))).resolves.toBe(
      false,
    );
  });

  it('rejects pre-existing conflicting target files before writing missing records', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-decision-migrate-'));
    tempDirs.push(root);
    const referenceRoot = join(root, 'reference');
    const decisionsRoot = join(referenceRoot, 'decisions');
    await mkdir(decisionsRoot, { recursive: true });
    await writeFile(
      join(referenceRoot, 'decision-record.md'),
      LEGACY_DECISIONS,
      {
        encoding: 'utf8',
        flag: 'wx',
      },
    );
    await writeFile(
      join(decisionsRoot, 'DR-260622-adopt-pjm-split.md'),
      [
        '---',
        'id: DR-260622-adopt-pjm-split',
        'title: Conflicting record',
        'date: 2026-06-22',
        'status: accepted',
        'legacy_id: ADR-999',
        '---',
        '',
        '# Conflicting record',
        '',
      ].join('\n'),
      'utf8',
    );

    await expect(migrateDecisionRecords({ referenceRoot })).rejects.toThrow(
      'already exists with different content',
    );
    await expect(
      pathExists(join(decisionsRoot, 'DR-260623-add-decision-command.md')),
    ).resolves.toBe(false);
    await expect(pathExists(join(decisionsRoot, 'index.md'))).resolves.toBe(
      false,
    );
  });

  it('parses the real-world `### ADR-NNN` + bold-field decision shape into a non-zero section count', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-decision-migrate-'));
    tempDirs.push(root);
    const referenceRoot = join(root, 'reference');
    await mkdir(referenceRoot, { recursive: true });
    await writeFile(
      join(referenceRoot, 'decision-record.md'),
      REAL_WORLD_DECISIONS,
      { encoding: 'utf8', flag: 'wx' },
    );

    const result = await migrateDecisionRecords({
      referenceRoot,
      dryRun: true,
    });

    // Regression for B1: the real-world heading + bold-field shape used to
    // yield zero sections. It must now parse every record.
    expect(result.mappings.length).toBeGreaterThan(0);
    expect(result.mappings).toHaveLength(3);
    expect(result.mappings).toEqual([
      expect.objectContaining({
        legacyId: 'ADR-001',
        id: 'DR-260130-keep-active-project-path-based',
        title: 'Keep active-project path-based',
        date: '2026-01-30',
      }),
      expect.objectContaining({
        legacyId: 'ADR-002',
        id: 'DR-260131-standardize-progress',
        title: 'Standardize progress indicators',
        date: '2026-01-31',
      }),
      expect.objectContaining({
        legacyId: 'DR-003',
        id: 'DR-260214-adopt-skill-first-invocation',
        title: 'Adopt skill-first invocation',
        date: '2026-02-14',
      }),
    ]);
  });

  it('applies the real-world shape preserving body text, status, and legacy_id across ADR and DR prefixes', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-decision-migrate-'));
    tempDirs.push(root);
    const referenceRoot = join(root, 'reference');
    await mkdir(referenceRoot, { recursive: true });
    await writeFile(
      join(referenceRoot, 'decision-record.md'),
      REAL_WORLD_DECISIONS,
      { encoding: 'utf8', flag: 'wx' },
    );

    const result = await migrateDecisionRecords({ referenceRoot });

    expect(result.written).toHaveLength(3);

    const adrRecord = await readFile(
      join(
        referenceRoot,
        'decisions',
        'DR-260130-keep-active-project-path-based.md',
      ),
      'utf8',
    );
    expect(adrRecord).toContain('legacy_id: ADR-001');
    expect(adrRecord).toContain('status: accepted');
    // Body (including the original heading and bold metadata) is preserved.
    expect(adrRecord).toContain('### ADR-001: Keep active-project path-based');
    expect(adrRecord).toContain('- **Date:** 2026-01-30');
    expect(adrRecord).toContain(
      'Canonical write format stores a full path to the active project directory.',
    );

    // The DR-prefixed record migrates the same way and keeps its DR legacy id.
    const drRecord = await readFile(
      join(
        referenceRoot,
        'decisions',
        'DR-260214-adopt-skill-first-invocation.md',
      ),
      'utf8',
    );
    expect(drRecord).toContain('legacy_id: DR-003');
    expect(drRecord).toContain('status: proposed');
    expect(drRecord).toContain(
      'Canonical invocation contract is skill names; slash commands are optional.',
    );

    const index = await readFile(
      join(referenceRoot, 'decisions', 'index.md'),
      'utf8',
    );
    expect(index).toContain(
      '| DR-260130-keep-active-project-path-based | 2026-01-30 | accepted | Keep active-project path-based | ADR-001 |',
    );
    expect(index).toContain(
      '| DR-260214-adopt-skill-first-invocation | 2026-02-14 | proposed | Adopt skill-first invocation | DR-003 |',
    );
  });

  it('excludes a trailing `## ADR Template` block from the last decision record body (F2)', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-decision-migrate-'));
    tempDirs.push(root);
    const referenceRoot = join(root, 'reference');
    await mkdir(referenceRoot, { recursive: true });
    await writeFile(
      join(referenceRoot, 'decision-record.md'),
      TRAILING_TEMPLATE_DECISIONS,
      { encoding: 'utf8', flag: 'wx' },
    );

    const result = await migrateDecisionRecords({ referenceRoot });

    // Only the two real records migrate; the trailing template is not a record.
    expect(result.written).toHaveLength(2);

    const lastRecord = await readFile(
      join(referenceRoot, 'decisions', 'DR-260402-make-oat-tools-install.md'),
      'utf8',
    );
    // legacy_id is preserved on the last record.
    expect(lastRecord).toContain('legacy_id: DR-021');
    // The real body (including its level-4 sub-headings) stays in the record.
    expect(lastRecord).toContain('### DR-021: Make oat tools install');
    expect(lastRecord).toContain('#### Context');
    expect(lastRecord).toContain('Ship an oat tools install command.');
    // The trailing `## ADR Template` boilerplate is EXCLUDED from the body.
    expect(lastRecord).not.toContain('## ADR Template');
    expect(lastRecord).not.toContain(
      'Copy this block to add a new decision record.',
    );
    expect(lastRecord).not.toContain('### ADR-NNN: Title');

    // Body parity for the non-trailing record is unchanged: its body still ends
    // at the next `### ADR/DR` heading and keeps its own sub-headings.
    const firstRecord = await readFile(
      join(referenceRoot, 'decisions', 'DR-260401-adopt-deterministic-ids.md'),
      'utf8',
    );
    expect(firstRecord).toContain('legacy_id: ADR-020');
    expect(firstRecord).toContain('### ADR-020: Adopt deterministic ids');
    expect(firstRecord).toContain('#### Decision');
    expect(firstRecord).toContain('Use date plus slug ids everywhere.');
    // The first record must not bleed into the second.
    expect(firstRecord).not.toContain('### DR-021: Make oat tools install');
    expect(firstRecord).not.toContain('## ADR Template');
  });

  it('tolerates a real-world record missing an optional field (no Drivers line) and missing Status via index fallback', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-decision-migrate-'));
    tempDirs.push(root);
    const referenceRoot = join(root, 'reference');
    await mkdir(referenceRoot, { recursive: true });
    // ADR-002 has no `- **Drivers:**` line; ADR-100 has no inline Status and
    // must recover Status from its Decision Index row.
    const partialLegacy = [
      '# OAT Decision Record',
      '',
      '## Decision Index',
      '',
      '| ID      | Date       | Status   | Title              |',
      '| ------- | ---------- | -------- | ------------------ |',
      '| ADR-100 | 2026-03-09 | accepted | Index status only  |',
      '',
      '## Decisions',
      '',
      '### ADR-100: Index status only',
      '',
      '- **Date:** 2026-03-09',
      '',
      '#### Decision',
      '',
      'Status is recovered from the decision index row.',
      '',
    ].join('\n');
    await writeFile(join(referenceRoot, 'decision-record.md'), partialLegacy, {
      encoding: 'utf8',
      flag: 'wx',
    });

    const result = await migrateDecisionRecords({ referenceRoot });

    expect(result.mappings).toHaveLength(1);
    const record = await readFile(result.written[0]!, 'utf8');
    expect(record).toContain('legacy_id: ADR-100');
    // Status fell back to the Decision Index row value.
    expect(record).toContain('status: accepted');
    expect(record).toContain(
      'Status is recovered from the decision index row.',
    );
  });
});
