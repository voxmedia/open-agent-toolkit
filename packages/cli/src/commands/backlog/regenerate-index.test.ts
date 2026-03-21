import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { initializeBacklog } from './init';
import { regenerateBacklogIndex } from './regenerate-index';

const INDEX_START = '<!-- OAT BACKLOG-INDEX -->';
const INDEX_END = '<!-- END OAT BACKLOG-INDEX -->';

async function writeBacklogItem(
  itemsDir: string,
  fileName: string,
  frontmatter: Record<string, string>,
): Promise<void> {
  const yaml = Object.entries(frontmatter)
    .map(([key, value]) => `${key}: ${value}`)
    .join('\n');

  await writeFile(
    join(itemsDir, fileName),
    `---\n${yaml}\n---\n\n## Description\n\nDemo\n`,
    'utf8',
  );
}

describe('regenerateBacklogIndex', () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(
      tempDirs.map((dir) => rm(dir, { recursive: true, force: true })),
    );
    tempDirs.length = 0;
  });

  it('writes a sorted markdown table into the managed section and preserves curated content', async () => {
    const backlogRoot = await mkdtemp(join(tmpdir(), 'oat-backlog-'));
    tempDirs.push(backlogRoot);
    const itemsDir = join(backlogRoot, 'items');
    await mkdir(itemsDir, { recursive: true });

    await writeBacklogItem(itemsDir, 'zeta.md', {
      id: 'bl-zzzz',
      title: '"Zeta"',
      status: 'open',
      priority: 'medium',
      scope: 'task',
      scope_estimate: 'M',
    });
    await writeBacklogItem(itemsDir, 'alpha.md', {
      id: 'bl-aaaa',
      title: '"Alpha"',
      status: 'in_progress',
      priority: 'urgent',
      scope: 'feature',
      scope_estimate: 'S',
    });
    await writeBacklogItem(itemsDir, 'beta.md', {
      id: 'bl-bbbb',
      title: '"Beta"',
      status: 'open',
      priority: 'urgent',
      scope: 'initiative',
      scope_estimate: 'L',
    });

    await writeFile(
      join(backlogRoot, 'index.md'),
      [
        '# OAT Backlog Index',
        '',
        '## Curated Overview',
        '',
        '- Keep this summary.',
        '',
        INDEX_START,
        '| stale | stale | stale | stale | stale | stale |',
        INDEX_END,
        '',
        '## Notes',
        '',
        '- Preserve this too.',
        '',
      ].join('\n'),
      'utf8',
    );

    await regenerateBacklogIndex(backlogRoot);

    const index = await readFile(join(backlogRoot, 'index.md'), 'utf8');
    const managedSection = index.slice(
      index.indexOf(INDEX_START),
      index.indexOf(INDEX_END) + INDEX_END.length,
    );

    expect(index).toContain('- Keep this summary.');
    expect(index).toContain('- Preserve this too.');
    expect(managedSection).toContain(
      '| bl-aaaa | Alpha | in_progress | urgent | feature | S |',
    );
    expect(managedSection).toContain(
      '| bl-bbbb | Beta | open | urgent | initiative | L |',
    );
    expect(managedSection).toContain(
      '| bl-zzzz | Zeta | open | medium | task | M |',
    );
    expect(
      managedSection.indexOf(
        '| bl-aaaa | Alpha | in_progress | urgent | feature | S |',
      ),
    ).toBeLessThan(
      managedSection.indexOf(
        '| bl-bbbb | Beta | open | urgent | initiative | L |',
      ),
    );
    expect(
      managedSection.indexOf(
        '| bl-bbbb | Beta | open | urgent | initiative | L |',
      ),
    ).toBeLessThan(
      managedSection.indexOf('| bl-zzzz | Zeta | open | medium | task | M |'),
    );
  });

  it('handles an empty items directory gracefully', async () => {
    const backlogRoot = await mkdtemp(join(tmpdir(), 'oat-backlog-empty-'));
    tempDirs.push(backlogRoot);
    await mkdir(join(backlogRoot, 'items'), { recursive: true });
    await writeFile(
      join(backlogRoot, 'index.md'),
      `${INDEX_START}\nold\n${INDEX_END}\n`,
      'utf8',
    );

    await regenerateBacklogIndex(backlogRoot);

    const index = await readFile(join(backlogRoot, 'index.md'), 'utf8');

    expect(index).toContain('| _No backlog items yet_ | - | - | - | - | - |');
  });

  it('works with a freshly scaffolded backlog root and preserves curated overview content', async () => {
    const backlogRoot = await mkdtemp(join(tmpdir(), 'oat-backlog-seeded-'));
    tempDirs.push(backlogRoot);

    await initializeBacklog(backlogRoot);

    const itemsDir = join(backlogRoot, 'items');
    await writeBacklogItem(itemsDir, 'alpha.md', {
      id: 'bl-aaaa',
      title: '"Alpha"',
      status: 'open',
      priority: 'high',
      scope: 'feature',
      scope_estimate: 'M',
    });

    const indexPath = join(backlogRoot, 'index.md');
    const originalIndex = await readFile(indexPath, 'utf8');
    await writeFile(
      indexPath,
      originalIndex.replace(
        '- Add brief narrative summaries here as backlog items are created and reprioritized.',
        '- Keep this curated summary.',
      ),
      'utf8',
    );

    await regenerateBacklogIndex(backlogRoot);

    const index = await readFile(indexPath, 'utf8');
    expect(index).toContain('- Keep this curated summary.');
    expect(index).toContain('| bl-aaaa | Alpha | open | high | feature | M |');
    expect(index).not.toContain(
      '| _No backlog items yet_ | - | - | - | - | - |',
    );
  });

  it('works after a git commit and clone round-trip without rerunning init', async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), 'oat-backlog-git-'));
    tempDirs.push(tempRoot);

    const repoRoot = join(tempRoot, 'repo');
    const cloneRoot = join(tempRoot, 'clone');
    const backlogRoot = join(repoRoot, '.oat', 'repo', 'reference', 'backlog');

    await mkdir(repoRoot, { recursive: true });
    await initializeBacklog(backlogRoot);

    execFileSync('git', ['init', '-q'], { cwd: repoRoot });
    execFileSync('git', ['config', 'user.email', 'review@example.com'], {
      cwd: repoRoot,
    });
    execFileSync('git', ['config', 'user.name', 'reviewer'], { cwd: repoRoot });
    execFileSync('git', ['add', '.'], { cwd: repoRoot });
    execFileSync('git', ['commit', '-qm', 'init backlog scaffold'], {
      cwd: repoRoot,
    });
    execFileSync('git', ['clone', '-q', repoRoot, cloneRoot], {
      cwd: tempRoot,
    });

    const clonedBacklogRoot = join(
      cloneRoot,
      '.oat',
      'repo',
      'reference',
      'backlog',
    );

    await expect(
      readFile(join(clonedBacklogRoot, 'items', '.gitkeep'), 'utf8'),
    ).resolves.toBe('');
    await expect(
      regenerateBacklogIndex(clonedBacklogRoot),
    ).resolves.toBeUndefined();
  });
});
