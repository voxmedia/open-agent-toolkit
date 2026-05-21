import { mkdir, mkdtemp, readFile, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';
import YAML from 'yaml';

import type { SplitPlanDocument } from '../child-plan';
import { writeCoordinationParent } from '../write-parent';

async function pathExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function seedTemplates(repoRoot: string): Promise<void> {
  const templatesDir = join(repoRoot, '.oat', 'templates');
  await mkdir(templatesDir, { recursive: true });
  const stateTemplate = [
    '---',
    'oat_hill_checkpoints: {OAT_HILL_CHECKPOINTS}',
    'oat_phase: {OAT_PHASE}',
    'oat_phase_status: in_progress',
    'oat_workflow_mode: {OAT_WORKFLOW_MODE}',
    'oat_pr_status: null',
    'oat_pr_url: null',
    'oat_project_created: null',
    'oat_project_completed: null',
    'oat_project_state_updated: null',
    '---',
    '',
    '# Project State: {Project Name}',
  ].join('\n');
  await writeFile(join(templatesDir, 'state.md'), stateTemplate, 'utf8');
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

const document: SplitPlanDocument = {
  origin: 'declared',
  interactive: true,
  plan: {
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
  },
};

describe('writeCoordinationParent', () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(
      tempDirs.map(async (dir) => {
        await import('node:fs/promises').then(({ rm }) =>
          rm(dir, { recursive: true, force: true }),
        );
      }),
    );
    tempDirs.length = 0;
  });

  it('scaffolds a coordination parent with split plan and no executable artifacts', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'oat-split-parent-'));
    tempDirs.push(repoRoot);
    await seedTemplates(repoRoot);

    await writeCoordinationParent(document, {
      repoRoot,
      today: '2026-05-20',
      nowUtc: '2026-05-20T12:00:00.000Z',
    });

    const parentRoot = join(repoRoot, '.oat', 'projects', 'shared', 'umbrella');
    const state = readFrontmatter(
      await readFile(join(parentRoot, 'state.md'), 'utf8'),
    );
    expect(state['oat_kind']).toBe('coordination');
    expect(state['oat_children']).toEqual(['foundation', 'docs']);

    const discovery = await readFile(join(parentRoot, 'discovery.md'), 'utf8');
    expect(discovery).toContain('## Integration Sketch');
    expect(discovery).toContain('Ship foundation before docs.');

    const persisted = JSON.parse(
      await readFile(join(parentRoot, 'references', 'split-plan.json'), 'utf8'),
    ) as SplitPlanDocument;
    expect(persisted).toEqual(document);

    for (const file of [
      'spec.md',
      'design.md',
      'plan.md',
      'implementation.md',
    ]) {
      await expect(pathExists(join(parentRoot, file))).resolves.toBe(false);
    }
  });
});
