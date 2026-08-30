import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { createSyncedFixture } from '@test-support/synced-fixture';
import { afterEach, describe, expect, it, vi } from 'vitest';
import YAML from 'yaml';

import type { ChildPlan } from '../child-plan';
import { SEEDED_SECTIONS, seedChildren } from '../seed-children';

async function seedTemplates(repoRoot: string): Promise<void> {
  const templatesDir = join(repoRoot, '.oat', 'templates');
  await mkdir(templatesDir, { recursive: true });
  await writeFile(
    join(templatesDir, 'state.md'),
    [
      '---',
      'oat_phase: {OAT_PHASE}',
      'oat_phase_status: in_progress',
      'oat_workflow_mode: {OAT_WORKFLOW_MODE}',
      '---',
      '',
      '# Project State: {Project Name}',
    ].join('\n'),
    'utf8',
  );
  for (const file of ['discovery.md', 'plan.md', 'implementation.md']) {
    await writeFile(
      join(templatesDir, file),
      ['---', 'oat_template: true', '---', '', `# {Project Name} ${file}`].join(
        '\n',
      ),
      'utf8',
    );
  }
}

function readFrontmatter(content: string): Record<string, unknown> {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) {
    throw new Error('missing frontmatter');
  }
  return YAML.parse(match[1]) as Record<string, unknown>;
}

const plan: ChildPlan = {
  parentSlug: 'umbrella',
  children: [
    {
      slug: 'foundation',
      description: 'Shared foundation',
      inheritedContext: 'Foundation context',
      knownDependencies: [],
      order: 1,
    },
    {
      slug: 'docs',
      description: 'Docs rollout',
      inheritedContext: 'Docs context',
      knownDependencies: ['foundation'],
      order: 2,
    },
  ],
  foundationChild: 'foundation',
  integrationSketch: 'Ship foundation before docs.',
  initialActiveChild: 'foundation',
};

describe('seedChildren', () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    vi.restoreAllMocks();
    await Promise.all(
      tempDirs.map(async (dir) => {
        await rm(dir, { recursive: true, force: true });
      }),
    );
    tempDirs.length = 0;
  });

  it('scaffolds children with split links and seeded discovery sections', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'oat-split-children-'));
    tempDirs.push(repoRoot);
    await seedTemplates(repoRoot);

    await seedChildren(plan, {
      repoRoot,
      today: '2026-05-20',
      nowUtc: '2026-05-20T12:00:00.000Z',
    });

    const docsRoot = join(repoRoot, '.oat', 'projects', 'shared', 'docs');
    const state = readFrontmatter(
      await readFile(join(docsRoot, 'state.md'), 'utf8'),
    );
    expect(state['oat_parent']).toBe('umbrella');
    expect(state['oat_siblings']).toEqual(['foundation']);
    expect(state['oat_depends_on']).toEqual(['foundation']);

    const discovery = await readFile(join(docsRoot, 'discovery.md'), 'utf8');
    const discoveryFrontmatter = readFrontmatter(discovery);
    expect(discoveryFrontmatter['oat_inherited_context_revalidated']).toBe(
      false,
    );

    let previousIndex = -1;
    for (const section of SEEDED_SECTIONS) {
      const index = discovery.indexOf(`## ${section}`);
      expect(index).toBeGreaterThan(previousIndex);
      previousIndex = index;
    }
  });

  it('routes every child to discovery with inherited context awaiting revalidation', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'oat-split-resume-'));
    tempDirs.push(repoRoot);
    await seedTemplates(repoRoot);

    await seedChildren(plan, {
      repoRoot,
      today: '2026-05-20',
      nowUtc: '2026-05-20T12:00:00.000Z',
    });

    for (const child of plan.children) {
      const childRoot = join(
        repoRoot,
        '.oat',
        'projects',
        'shared',
        child.slug,
      );

      // state.md routes resume/progress/quick-start back to discovery.
      const state = readFrontmatter(
        await readFile(join(childRoot, 'state.md'), 'utf8'),
      );
      expect(state['oat_phase']).toBe('discovery');
      expect(state['oat_phase_status']).toBe('in_progress');
      expect(state['oat_workflow_mode']).toBe('quick');

      // discovery.md is in progress with an explicit, unmet revalidation gate.
      const discovery = await readFile(join(childRoot, 'discovery.md'), 'utf8');
      const discoveryFrontmatter = readFrontmatter(discovery);
      expect(discoveryFrontmatter['oat_status']).toBe('in_progress');
      expect(discoveryFrontmatter['oat_inherited_context_revalidated']).toBe(
        false,
      );
      expect(discovery).toContain('## Inherited Context Revalidation Gate');
      expect(discovery).toContain('resumes at **discovery**');
      expect(discovery).toContain('starting point, not a final scope decision');

      // plan.md is a not-started template placeholder, never plan-ready.
      const planFrontmatter = readFrontmatter(
        await readFile(join(childRoot, 'plan.md'), 'utf8'),
      );
      expect(planFrontmatter['oat_template']).toBe(true);
      expect(planFrontmatter['oat_plan_source']).toBe('quick');
      expect(planFrontmatter['oat_status']).not.toBe('complete');
    }
  });

  it('seeds shared children while an existing origin is unreachable', async () => {
    const fixture = await createSyncedFixture();
    tempDirs.push(fixture.rootDir);
    await seedTemplates(fixture.cloneA);
    execFileSync(
      'git',
      ['remote', 'set-url', 'origin', join(fixture.rootDir, 'missing.git')],
      { cwd: fixture.cloneA },
    );
    vi.spyOn(console, 'error').mockImplementation(() => {});

    await seedChildren(plan, { repoRoot: fixture.cloneA, scope: 'shared' });

    for (const child of plan.children) {
      expect(
        await readFile(
          join(
            fixture.cloneA,
            '.oat',
            'projects',
            'shared',
            child.slug,
            'state.md',
          ),
          'utf8',
        ),
      ).toContain(`oat_parent: ${plan.parentSlug}`);
    }
  });
});
