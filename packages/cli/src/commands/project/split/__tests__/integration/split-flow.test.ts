import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';
import YAML from 'yaml';

import type { SplitPlanDocument } from '../../../../../projects/split/child-plan';
import { finalizeSplit } from '../../../../../projects/split/finalize';
import { resumeSplit } from '../../../../../projects/split/resume';
import { seedChildren } from '../../../../../projects/split/seed-children';
import { validateChildPlan } from '../../../../../projects/split/validation';
import { writeCoordinationParent } from '../../../../../projects/split/write-parent';

async function exists(path: string): Promise<boolean> {
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

function documentFor(
  origin: SplitPlanDocument['origin'] = 'declared',
): SplitPlanDocument {
  return {
    origin,
    interactive: true,
    plan: {
      parentSlug: `umbrella-${origin.replaceAll('-', '_')}`,
      children: [
        {
          slug: `foundation-${origin.replaceAll('-', '_')}`,
          inheritedContext: 'Foundation context',
          knownDependencies: [],
          order: 1,
        },
        {
          slug: `api-${origin.replaceAll('-', '_')}`,
          inheritedContext: 'API context',
          knownDependencies: [`foundation-${origin.replaceAll('-', '_')}`],
          order: 2,
        },
        {
          slug: `docs-${origin.replaceAll('-', '_')}`,
          inheritedContext: 'Docs context',
          knownDependencies: [`foundation-${origin.replaceAll('-', '_')}`],
          order: 3,
        },
      ],
      foundationChild: `foundation-${origin.replaceAll('-', '_')}`,
      integrationSketch: 'Foundation ships before API and docs.',
      initialActiveChild: `foundation-${origin.replaceAll('-', '_')}`,
    },
  };
}

async function runSplit(
  repoRoot: string,
  document: SplitPlanDocument,
): Promise<void> {
  await writeCoordinationParent(document, { repoRoot });
  await seedChildren(document.plan, { repoRoot });
  await finalizeSplit(document.plan, { repoRoot });
}

describe('oat-project-split integration fixtures', () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(
      tempDirs.map(async (dir) => {
        await rm(dir, { recursive: true, force: true });
      }),
    );
    tempDirs.length = 0;
  });

  it('runs the declared happy path with a foundation child', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'oat-split-integration-'));
    tempDirs.push(repoRoot);
    await seedTemplates(repoRoot);
    const document = documentFor('declared');

    await runSplit(repoRoot, document);

    const parentRoot = join(
      repoRoot,
      '.oat',
      'projects',
      'shared',
      document.plan.parentSlug,
    );
    const parentState = readFrontmatter(
      await readFile(join(parentRoot, 'state.md'), 'utf8'),
    );
    expect(parentState['oat_kind']).toBe('coordination');
    expect(parentState['oat_phase']).toBe('decomposition');
    expect(parentState['oat_phase_status']).toBe('complete');

    for (const child of document.plan.children) {
      await expect(
        exists(join(repoRoot, '.oat', 'projects', 'shared', child.slug)),
      ).resolves.toBe(true);
    }
    const localConfig = JSON.parse(
      await readFile(join(repoRoot, '.oat', 'config.local.json'), 'utf8'),
    ) as { activeProject: string };
    expect(localConfig.activeProject).toBe(
      `.oat/projects/shared/${document.plan.foundationChild}`,
    );
  });

  it('keeps the coordination-parent file invariant for produced parents', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'oat-split-integration-'));
    tempDirs.push(repoRoot);
    await seedTemplates(repoRoot);
    const document = documentFor('detected-mid-stream');

    await runSplit(repoRoot, document);

    const parentRoot = join(
      repoRoot,
      '.oat',
      'projects',
      'shared',
      document.plan.parentSlug,
    );
    for (const file of [
      'spec.md',
      'design.md',
      'plan.md',
      'implementation.md',
    ]) {
      await expect(exists(join(parentRoot, file))).resolves.toBe(false);
    }
  });

  it('persists detected and brainstorm origins in split-plan.json', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'oat-split-integration-'));
    tempDirs.push(repoRoot);
    await seedTemplates(repoRoot);

    for (const origin of [
      'detected-mid-stream',
      'detected-convergence',
      'brainstorm-picker',
    ] as const) {
      const document = documentFor(origin);
      await writeCoordinationParent(document, { repoRoot });
      const persisted = JSON.parse(
        await readFile(
          join(
            repoRoot,
            '.oat',
            'projects',
            'shared',
            document.plan.parentSlug,
            'references',
            'split-plan.json',
          ),
          'utf8',
        ),
      ) as SplitPlanDocument;
      expect(persisted.origin).toBe(origin);
    }
  });

  it('resumes from durable split-plan data after an interrupted run', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'oat-split-integration-'));
    tempDirs.push(repoRoot);
    await seedTemplates(repoRoot);
    const document = documentFor('declared');

    await writeCoordinationParent(document, { repoRoot });
    await seedChildren(
      document.plan,
      {
        repoRoot,
      },
      new Set([document.plan.children[0]!.slug]),
    );

    await resumeSplit(
      join(repoRoot, '.oat', 'projects', 'shared', document.plan.parentSlug),
      { repoRoot },
    );

    for (const child of document.plan.children) {
      await expect(
        exists(join(repoRoot, '.oat', 'projects', 'shared', child.slug)),
      ).resolves.toBe(true);
    }
  });

  it('reports post-manual-mutation validation errors', () => {
    const document = documentFor('declared');
    const mutated = {
      ...document.plan,
      children: document.plan.children.map((child) =>
        child.slug === document.plan.children[1]!.slug
          ? { ...child, knownDependencies: ['missing-sibling'] }
          : child,
      ),
    };

    const result = validateChildPlan(mutated, new Set());

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.map((error) => error.code)).toContain(
        'unknown-dependency',
      );
    }
  });
});
