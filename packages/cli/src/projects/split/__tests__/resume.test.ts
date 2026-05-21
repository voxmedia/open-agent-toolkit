import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';
import YAML from 'yaml';

import type { SplitPlanDocument } from '../child-plan';
import { detectPartialSplit, resumeSplit } from '../resume';

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

function stateContent(frontmatter: Record<string, unknown>): string {
  return `---\n${YAML.stringify(frontmatter).trimEnd()}\n---\n# State\n`;
}

const document: SplitPlanDocument = {
  origin: 'declared',
  interactive: true,
  plan: {
    parentSlug: 'umbrella',
    children: [
      {
        slug: 'a',
        inheritedContext: 'A context',
        knownDependencies: [],
        order: 1,
      },
      {
        slug: 'b',
        inheritedContext: 'B context',
        knownDependencies: ['a'],
        order: 2,
      },
      {
        slug: 'c',
        inheritedContext: 'C durable context',
        knownDependencies: ['b'],
        order: 3,
      },
    ],
    initialActiveChild: 'a',
  },
};

async function seedPartialParent(
  repoRoot: string,
  phaseStatus = 'in_progress',
): Promise<string> {
  const parentRoot = join(repoRoot, '.oat', 'projects', 'shared', 'umbrella');
  await mkdir(join(parentRoot, 'references'), { recursive: true });
  await writeFile(
    join(parentRoot, 'state.md'),
    stateContent({
      oat_kind: 'coordination',
      oat_phase: 'decomposition',
      oat_phase_status: phaseStatus,
      oat_children: ['a', 'b', 'c'],
    }),
    'utf8',
  );
  await writeFile(
    join(parentRoot, 'references', 'split-plan.json'),
    `${JSON.stringify(document, null, 2)}\n`,
    'utf8',
  );
  await mkdir(join(repoRoot, '.oat', 'projects', 'shared', 'a'), {
    recursive: true,
  });
  await mkdir(join(repoRoot, '.oat', 'projects', 'shared', 'b'), {
    recursive: true,
  });
  return parentRoot;
}

describe('split resume', () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(
      tempDirs.map(async (dir) => {
        await rm(dir, { recursive: true, force: true });
      }),
    );
    tempDirs.length = 0;
  });

  it('detects missing children from persisted split-plan data', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'oat-split-resume-'));
    tempDirs.push(repoRoot);
    const parentRoot = await seedPartialParent(repoRoot);

    const partial = await detectPartialSplit(parentRoot, { repoRoot });

    expect(partial.missingChildren).toEqual(['c']);
    expect(
      partial.plan.children.find((child) => child.slug === 'c')
        ?.inheritedContext,
    ).toBe('C durable context');
    expect(
      partial.plan.children.find((child) => child.slug === 'c')
        ?.knownDependencies,
    ).toEqual(['b']);
  });

  it('resumes missing children and finalizes the parent', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'oat-split-resume-'));
    tempDirs.push(repoRoot);
    await seedTemplates(repoRoot);
    const parentRoot = await seedPartialParent(repoRoot);

    await resumeSplit(parentRoot, { repoRoot });

    const childDiscovery = await readFile(
      join(repoRoot, '.oat', 'projects', 'shared', 'c', 'discovery.md'),
      'utf8',
    );
    expect(childDiscovery).toContain('C durable context');
    const parentState = await readFile(join(parentRoot, 'state.md'), 'utf8');
    expect(parentState).toContain('oat_phase_status: complete');
  });

  it('rejects re-invocation on a completed parent', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'oat-split-resume-'));
    tempDirs.push(repoRoot);
    const parentRoot = await seedPartialParent(repoRoot, 'complete');

    await expect(detectPartialSplit(parentRoot, { repoRoot })).rejects.toThrow(
      /completed split parent/,
    );
  });

  it('aborts instead of guessing when split-plan.json is missing', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'oat-split-resume-'));
    tempDirs.push(repoRoot);
    const parentRoot = await seedPartialParent(repoRoot);
    await rm(join(parentRoot, 'references', 'split-plan.json'));

    await expect(detectPartialSplit(parentRoot, { repoRoot })).rejects.toThrow(
      /split-plan\.json/,
    );
  });
});
