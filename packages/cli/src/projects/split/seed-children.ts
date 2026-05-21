import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { scaffoldProject as defaultScaffoldProject } from '@commands/project/new/scaffold';
import { getFrontmatterBlock } from '@commands/shared/frontmatter';
import { replaceFrontmatter } from '@commands/shared/frontmatter-write';
import YAML from 'yaml';

import type { ChildPlan } from './child-plan';
import type { SplitProjectContext } from './write-parent';

const SEEDED_SECTIONS = [
  'Origin',
  'Inherited Context',
  'Child Scope',
  'Known Dependencies',
  'Assumptions To Revalidate',
  'Likely Workflow Mode',
  'Sibling Projects',
] as const;

function readObjectFrontmatter(
  content: string,
  filePath: string,
): Record<string, unknown> {
  const block = getFrontmatterBlock(content);
  if (!block) {
    throw new Error(`${filePath} is missing frontmatter`);
  }
  const parsed: unknown = YAML.parse(block);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`${filePath} frontmatter must be an object`);
  }
  return parsed as Record<string, unknown>;
}

async function updateStateLinks(
  statePath: string,
  updates: Record<string, unknown>,
): Promise<void> {
  const content = await readFile(statePath, 'utf8');
  const frontmatter = readObjectFrontmatter(content, statePath);
  for (const [key, value] of Object.entries(updates)) {
    frontmatter[key] = value;
  }
  await writeFile(
    statePath,
    replaceFrontmatter(content, YAML.stringify(frontmatter).trimEnd()),
    'utf8',
  );
}

function bulletList(items: string[]): string {
  if (items.length === 0) {
    return '- None.';
  }
  return items.map((item) => `- ${item}`).join('\n');
}

function renderSeededDiscovery(
  plan: ChildPlan,
  child: ChildPlan['children'][number],
): string {
  const siblingSlugs = plan.children
    .map((candidate) => candidate.slug)
    .filter((slug) => slug !== child.slug);
  const sections = [
    ['Origin', `Split from coordination parent \`${plan.parentSlug}\`.`],
    [
      'Inherited Context',
      child.inheritedContext || 'No inherited context provided.',
    ],
    ['Child Scope', child.description ?? child.slug],
    ['Known Dependencies', bulletList(child.knownDependencies)],
    [
      'Assumptions To Revalidate',
      '- Revalidate inherited context before completing discovery.',
    ],
    ['Likely Workflow Mode', 'quick'],
    ['Sibling Projects', bulletList(siblingSlugs)],
  ];

  return [
    '---',
    'oat_status: in_progress',
    'oat_ready_for: null',
    'oat_blockers: []',
    'oat_inherited_context_revalidated: false',
    'oat_generated: false',
    '---',
    '',
    `# Discovery: ${child.slug}`,
    '',
    ...sections.flatMap(([heading, body]) => [`## ${heading}`, '', body, '']),
  ].join('\n');
}

export interface SeedChildrenResult {
  childProjectPaths: string[];
}

export async function seedChildren(
  plan: ChildPlan,
  context: SplitProjectContext,
  onlySlugs?: Set<string>,
): Promise<SeedChildrenResult> {
  const scaffoldProject = context.scaffoldProject ?? defaultScaffoldProject;
  const childProjectPaths: string[] = [];
  const orderedChildren = plan.children
    .slice()
    .sort((left, right) => left.order - right.order)
    .filter((child) => !onlySlugs || onlySlugs.has(child.slug));

  for (const child of orderedChildren) {
    const scaffold = await scaffoldProject({
      repoRoot: context.repoRoot,
      projectName: child.slug,
      mode: 'quick',
      setActive: false,
      refreshDashboard: false,
      env: context.env,
      today: context.today,
      nowUtc: context.nowUtc,
    });
    const childRoot = join(context.repoRoot, scaffold.projectPath);
    const siblings = plan.children
      .map((candidate) => candidate.slug)
      .filter((slug) => slug !== child.slug);

    await updateStateLinks(join(childRoot, 'state.md'), {
      oat_parent: plan.parentSlug,
      oat_siblings: siblings,
      oat_depends_on: child.knownDependencies,
    });
    await writeFile(
      join(childRoot, 'discovery.md'),
      renderSeededDiscovery(plan, child),
      'utf8',
    );
    childProjectPaths.push(scaffold.projectPath);
  }

  return { childProjectPaths };
}

export { SEEDED_SECTIONS };
