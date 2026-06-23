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
        id: 'dr-260622-adopt-pjm-split',
        title: 'Adopt PJM split',
        date: '2026-06-22',
        filePath: join(
          referenceRoot,
          'decisions',
          'dr-260622-adopt-pjm-split.md',
        ),
      },
      {
        legacyId: 'DR-002',
        id: 'dr-260623-add-decision-command',
        title: 'Add decision command',
        date: '2026-06-23',
        filePath: join(
          referenceRoot,
          'decisions',
          'dr-260623-add-decision-command.md',
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
      join(referenceRoot, 'decisions', 'dr-260622-adopt-pjm-split.md'),
      join(referenceRoot, 'decisions', 'dr-260623-add-decision-command.md'),
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
      '| dr-260623-add-decision-command | 2026-06-23 | proposed | Add decision command | DR-002 |',
    );
    expect(index).toContain(
      '| dr-260622-adopt-pjm-split | 2026-06-22 | accepted | Adopt PJM split | ADR-001 |',
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
});
