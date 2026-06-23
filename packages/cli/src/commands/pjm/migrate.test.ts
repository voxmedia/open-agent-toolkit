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

import { initializeBacklog } from '@commands/backlog/init';
import { afterEach, describe, expect, it } from 'vitest';

import { migratePjmRepo } from './migrate';

const TEMPLATE_NAMES = [
  'current-state.md',
  'roadmap.md',
  'repo-agents.md',
  'pjm-agents.md',
  'reference-agents.md',
] as const;

const LEGACY_DECISIONS = [
  '# OAT Decision Record',
  '',
  '## Decision Index',
  '',
  '| ID | Date | Status | Decision | Context |',
  '| --- | --- | --- | --- | --- |',
  '| ADR-001 | 2026-06-22 | accepted | Adopt PJM split | Shared files collide |',
  '',
  '## ADR-001: Adopt PJM split',
  '',
  '- Date: 2026-06-22',
  '- Status: accepted',
  '- Context: Shared files collide across worktrees.',
  '- Decision: Use repo-local deterministic IDs.',
  '- Consequences: Regenerate indexes after conflicts.',
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

async function createWorkspace(): Promise<{
  assetsRoot: string;
  repoRoot: string;
  root: string;
}> {
  const root = await mkdtemp(join(tmpdir(), 'oat-pjm-migrate-'));
  const assetsRoot = join(root, 'assets');
  const repoRoot = join(root, '.oat', 'repo');
  for (const templateName of TEMPLATE_NAMES) {
    await seedTemplate(join(assetsRoot, 'templates'), templateName);
  }
  return { assetsRoot, repoRoot, root };
}

async function seedLegacyPjm(repoRoot: string): Promise<void> {
  const referenceRoot = join(repoRoot, 'reference');
  const backlogRoot = join(referenceRoot, 'backlog');
  await mkdir(referenceRoot, { recursive: true });
  await writeFile(
    join(referenceRoot, 'current-state.md'),
    '# Legacy Current State\n',
    'utf8',
  );
  await writeFile(
    join(referenceRoot, 'roadmap.md'),
    '# Legacy Roadmap\n',
    'utf8',
  );
  await initializeBacklog(backlogRoot);
  await writeFile(
    join(backlogRoot, 'items', 'bl-c745.md'),
    [
      '---',
      'id: bl-c745',
      'title: Streaming Cache',
      'status: open',
      'priority: high',
      'scope: cli',
      'scope_estimate: S',
      'created: 2026-06-22T10:00:00Z',
      '---',
      '',
      '# Streaming Cache',
      '',
      'Preserve this body.',
      '',
    ].join('\n'),
    'utf8',
  );
  await writeFile(
    join(referenceRoot, 'decision-record.md'),
    LEGACY_DECISIONS,
    'utf8',
  );
}

describe('migratePjmRepo', () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(
      tempDirs.map((dir) => rm(dir, { recursive: true, force: true })),
    );
    tempDirs.length = 0;
  });

  it('reports a no-op when project-management is disabled', async () => {
    const { assetsRoot, repoRoot, root } = await createWorkspace();
    tempDirs.push(root);
    await seedLegacyPjm(repoRoot);

    const result = await migratePjmRepo({
      repoRoot,
      assetsRoot,
      projectManagementEnabled: false,
      apply: true,
    });

    expect(result.status).toBe('skipped');
    expect(result.reason).toBe('project-management pack is disabled');
    await expect(pathExists(join(repoRoot, 'pjm'))).resolves.toBe(false);
  });

  it('dry-runs migration inventory without writing files', async () => {
    const { assetsRoot, repoRoot, root } = await createWorkspace();
    tempDirs.push(root);
    await seedLegacyPjm(repoRoot);

    const result = await migratePjmRepo({
      repoRoot,
      assetsRoot,
      projectManagementEnabled: true,
      apply: false,
    });

    expect(result.status).toBe('dry-run');
    expect(result.actions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'move',
          source: 'reference/current-state.md',
          target: 'pjm/current-state.md',
          result: 'planned',
        }),
        expect.objectContaining({
          type: 'move',
          source: 'reference/backlog',
          target: 'pjm/backlog',
          result: 'planned',
        }),
      ]),
    );
    expect(result.backlogMappings).toEqual([
      expect.objectContaining({
        legacyId: 'bl-c745',
        id: 'bl-260622-streaming-cache',
      }),
    ]);
    expect(result.decisionMappings).toEqual([
      expect.objectContaining({
        legacyId: 'ADR-001',
        id: 'dr-260622-adopt-pjm-split',
      }),
    ]);
    await expect(pathExists(join(repoRoot, 'pjm'))).resolves.toBe(false);
    await expect(
      pathExists(join(repoRoot, 'reference', 'current-state.md')),
    ).resolves.toBe(true);
  });

  it('short-circuits already migrated repos', async () => {
    const { assetsRoot, repoRoot, root } = await createWorkspace();
    tempDirs.push(root);
    await mkdir(join(repoRoot, 'pjm'), { recursive: true });
    await mkdir(join(repoRoot, 'reference', 'decisions'), { recursive: true });

    const result = await migratePjmRepo({
      repoRoot,
      assetsRoot,
      projectManagementEnabled: true,
      apply: true,
    });

    expect(result.status).toBe('already-migrated');
    expect(result.actions).toEqual([]);
  });

  it('applies mechanical moves, backlog re-id, decision split, and scaffold docs', async () => {
    const { assetsRoot, repoRoot, root } = await createWorkspace();
    tempDirs.push(root);
    await seedLegacyPjm(repoRoot);

    const result = await migratePjmRepo({
      repoRoot,
      assetsRoot,
      projectManagementEnabled: true,
      apply: true,
    });

    expect(result.status).toBe('migrated');
    await expect(
      readFile(join(repoRoot, 'pjm', 'current-state.md'), 'utf8'),
    ).resolves.toBe('# Legacy Current State\n');
    await expect(
      pathExists(join(repoRoot, 'reference', 'current-state.md')),
    ).resolves.toBe(false);

    const backlogRecordPath = join(
      repoRoot,
      'pjm',
      'backlog',
      'items',
      'bl-260622-streaming-cache.md',
    );
    const backlogRecord = await readFile(backlogRecordPath, 'utf8');
    expect(backlogRecord).toContain('id: bl-260622-streaming-cache');
    expect(backlogRecord).toContain('legacy_id: bl-c745');
    expect(backlogRecord).toContain('Preserve this body.');
    await expect(
      readFile(join(repoRoot, 'pjm', 'backlog', 'index.md'), 'utf8'),
    ).resolves.toContain('| bl-260622-streaming-cache | Streaming Cache |');

    const decisionRecord = await readFile(
      join(
        repoRoot,
        'reference',
        'decisions',
        'dr-260622-adopt-pjm-split.md',
      ),
      'utf8',
    );
    expect(decisionRecord).toContain('legacy_id: ADR-001');
    expect(decisionRecord).toContain('Use repo-local deterministic IDs.');
    await expect(
      pathExists(join(repoRoot, 'reference', 'decision-record.md')),
    ).resolves.toBe(false);

    await expect(access(join(repoRoot, 'AGENTS.md'))).resolves.toBeUndefined();
    await expect(
      access(join(repoRoot, 'pjm', 'AGENTS.md')),
    ).resolves.toBeUndefined();
    expect(result.backlogMappings).toEqual([
      expect.objectContaining({
        legacyId: 'bl-c745',
        id: 'bl-260622-streaming-cache',
      }),
    ]);
  });
});
