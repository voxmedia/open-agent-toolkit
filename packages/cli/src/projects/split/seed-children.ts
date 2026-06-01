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
  'Inherited Context Revalidation Gate',
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
    if (content.startsWith('---\n---')) {
      return {};
    }
    throw new Error(`${filePath} is missing frontmatter`);
  }
  if (block.trim().length === 0) {
    return {};
  }
  const parsed: unknown = YAML.parse(block);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`${filePath} frontmatter must be an object`);
  }
  return parsed as Record<string, unknown>;
}

async function updateFrontmatter(
  filePath: string,
  updates: Record<string, unknown>,
): Promise<void> {
  const content = await readFile(filePath, 'utf8');
  const frontmatter = readObjectFrontmatter(content, filePath);
  for (const [key, value] of Object.entries(updates)) {
    frontmatter[key] = value;
  }
  const nextBlock = YAML.stringify(frontmatter).trimEnd();
  const nextContent = getFrontmatterBlock(content)
    ? replaceFrontmatter(content, nextBlock)
    : content.replace(/^---\n---/, `---\n${nextBlock}\n---`);
  await writeFile(filePath, nextContent, 'utf8');
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
    [
      'Origin',
      `Split from coordination parent \`${plan.parentSlug}\`. This child was seeded by \`oat-project-split\`; it is **not** discovered, planned, or implementation-ready yet and resumes at discovery.`,
    ],
    [
      'Inherited Context',
      [
        child.inheritedContext || 'No inherited context provided.',
        '',
        '> Provisional seed. This context was inherited from the parent split decision. It is a **starting point, not a final scope decision** — treat every inherited claim as an assumption until it is revalidated below.',
      ].join('\n'),
    ],
    [
      'Inherited Context Revalidation Gate',
      [
        'This project resumes at **discovery**, not planning or implementation. Inherited context may be stale by the time work resumes, so it must be revalidated before this discovery is completed.',
        '',
        '- [ ] Re-read the inherited context against the current codebase and sibling progress.',
        '- [ ] Confirm or correct the child scope, dependencies, and assumptions below.',
        '- [ ] When revalidation is complete, set `oat_inherited_context_revalidated: true` in this file.',
        '',
        'Discovery cannot be marked complete — and planning must not begin — while `oat_inherited_context_revalidated: false`. A child left in this state is expected work-in-progress, not stale bookkeeping.',
      ].join('\n'),
    ],
    ['Child Scope', child.description ?? child.slug],
    ['Known Dependencies', bulletList(child.knownDependencies)],
    [
      'Assumptions To Revalidate',
      [
        '- Revalidate inherited context before completing discovery.',
        '- Confirm the child scope still matches reality before generating a plan.',
      ].join('\n'),
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

    await updateFrontmatter(join(childRoot, 'state.md'), {
      oat_phase: 'discovery',
      oat_workflow_mode: 'quick',
      oat_hill_checkpoints: [],
      oat_parent: plan.parentSlug,
      oat_siblings: siblings,
      oat_depends_on: child.knownDependencies,
    });
    // Children resume at discovery, so their scaffolded plan.md is a
    // placeholder only. Re-mark it as a not-started template (the scaffold
    // strips these markers when rendering) so neither tooling nor agents can
    // mistake the seed for an active or validated plan; routing keys off
    // state.md (oat_phase: discovery) and oat-project-next treats
    // oat_template: true as a still-a-template signal.
    await updateFrontmatter(join(childRoot, 'plan.md'), {
      oat_plan_source: 'quick',
      oat_template: true,
      oat_template_name: 'plan',
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
