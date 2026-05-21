import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import {
  scaffoldProject as defaultScaffoldProject,
  type ScaffoldProjectResult,
} from '@commands/project/new/scaffold';
import { getFrontmatterBlock } from '@commands/shared/frontmatter';
import { replaceFrontmatter } from '@commands/shared/frontmatter-write';
import YAML from 'yaml';

import type { SplitPlanDocument } from './child-plan';

export interface SplitProjectContext {
  repoRoot: string;
  projectsRoot?: string;
  today?: string;
  nowUtc?: string;
  env?: NodeJS.ProcessEnv;
  scaffoldProject?: typeof defaultScaffoldProject;
}

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

async function writeObjectFrontmatter(
  filePath: string,
  updates: (frontmatter: Record<string, unknown>) => void,
): Promise<void> {
  const content = await readFile(filePath, 'utf8');
  const frontmatter = readObjectFrontmatter(content, filePath);
  updates(frontmatter);
  await writeFile(
    filePath,
    replaceFrontmatter(content, YAML.stringify(frontmatter).trimEnd()),
    'utf8',
  );
}

function projectPathFor(projectsRoot: string, slug: string): string {
  return join(projectsRoot, slug).split('\\').join('/');
}

function renderParentDiscovery(document: SplitPlanDocument): string {
  const { plan } = document;
  const orderedChildren = plan.children
    .slice()
    .sort((left, right) => left.order - right.order);
  const childSlugs = orderedChildren.map((child) => child.slug);
  const childSummary = orderedChildren
    .map((child) => {
      const siblings = childSlugs.filter((slug) => slug !== child.slug);
      return [
        `${child.order}. ${child.slug}: ${child.description ?? 'No description provided.'}`,
        `   - Dependencies: ${child.knownDependencies.length > 0 ? child.knownDependencies.join(', ') : 'None'}`,
        `   - Siblings: ${siblings.length > 0 ? siblings.join(', ') : 'None'}`,
        `   - Inherited context: ${child.inheritedContext || 'None provided.'}`,
      ].join('\n');
    })
    .join('\n');
  const inheritedContext = orderedChildren
    .map(
      (child) =>
        `- ${child.slug}: ${child.inheritedContext || 'None provided.'}`,
    )
    .join('\n');
  const sharedConstraints = [
    plan.foundationChild ? `- Foundation child: ${plan.foundationChild}` : null,
    `- Initial active child: ${plan.initialActiveChild}`,
  ]
    .filter((line): line is string => Boolean(line))
    .join('\n');

  return [
    '---',
    'oat_status: complete',
    'oat_ready_for: null',
    'oat_blockers: []',
    'oat_generated: false',
    '---',
    '',
    `# Discovery: ${plan.parentSlug}`,
    '',
    '## Split Rationale',
    '',
    `Origin: ${document.origin}`,
    `Interactive: ${document.interactive ? 'true' : 'false'}`,
    `Why: ${plan.integrationSketch ?? 'Split child scopes were captured in a coordination parent for tracked sequencing and integration.'}`,
    '',
    '## Ordered Children',
    '',
    childSummary,
    '',
    '## Inherited Broad Context',
    '',
    inheritedContext || 'No inherited broad context provided.',
    '',
    '## Shared Constraints',
    '',
    sharedConstraints || 'No shared constraints provided.',
    '',
    '## Integration Sketch',
    '',
    plan.integrationSketch ?? 'No integration sketch provided.',
    '',
  ].join('\n');
}

function renderParentStateBody(document: SplitPlanDocument): string {
  const childList = document.plan.children
    .slice()
    .sort((left, right) => left.order - right.order)
    .map((child) => `- ${child.slug}`)
    .join('\n');

  return [
    `# Project State: ${document.plan.parentSlug}`,
    '',
    '**Status:** Coordination',
    '',
    '## Current Phase',
    '',
    'Decomposition coordination - split children are tracked as implementation projects.',
    '',
    '## Artifacts',
    '',
    '- **Discovery:** `discovery.md` (coordination summary)',
    '- **Split Plan:** `references/split-plan.json` (persisted resume source)',
    '- **Spec:** N/A (coordination parent)',
    '- **Design:** N/A (coordination parent)',
    '- **Plan:** N/A (coordination parent)',
    '- **Implementation:** N/A (coordination parent)',
    '',
    '## Children',
    '',
    childList || '- None.',
    '',
    '## Progress',
    '',
    '- Split plan persisted',
    '- Child projects selected for implementation tracking',
    '',
    '## Blockers',
    '',
    'None',
    '',
    '## Next Milestone',
    '',
    `Continue through active child \`${document.plan.initialActiveChild}\`.`,
    '',
  ].join('\n');
}

async function replaceMarkdownBody(
  filePath: string,
  body: string,
): Promise<void> {
  const content = await readFile(filePath, 'utf8');
  const frontmatter = getFrontmatterBlock(content);
  if (!frontmatter) {
    throw new Error(`${filePath} is missing frontmatter`);
  }
  await writeFile(filePath, `---\n${frontmatter}\n---\n\n${body}`, 'utf8');
}

export interface WriteCoordinationParentResult {
  parentProjectPath: string;
  scaffold: ScaffoldProjectResult;
}

export async function writeCoordinationParent(
  document: SplitPlanDocument,
  context: SplitProjectContext,
): Promise<WriteCoordinationParentResult> {
  const scaffoldProject = context.scaffoldProject ?? defaultScaffoldProject;
  const scaffold = await scaffoldProject({
    repoRoot: context.repoRoot,
    projectName: document.plan.parentSlug,
    mode: 'quick',
    setActive: false,
    refreshDashboard: false,
    env: context.env,
    today: context.today,
    nowUtc: context.nowUtc,
  });
  const parentProjectPath = scaffold.projectPath;
  const parentRoot = join(context.repoRoot, parentProjectPath);
  const statePath = join(parentRoot, 'state.md');

  await writeObjectFrontmatter(statePath, (frontmatter) => {
    frontmatter['oat_kind'] = 'coordination';
    frontmatter['oat_workflow_mode'] = 'quick';
    frontmatter['oat_hill_checkpoints'] = [];
    frontmatter['oat_children'] = document.plan.children
      .slice()
      .sort((left, right) => left.order - right.order)
      .map((child) => child.slug);
  });
  await replaceMarkdownBody(statePath, renderParentStateBody(document));

  await mkdir(join(parentRoot, 'references'), { recursive: true });
  await writeFile(
    join(parentRoot, 'references', 'split-plan.json'),
    `${JSON.stringify(document, null, 2)}\n`,
    'utf8',
  );

  await writeFile(
    join(parentRoot, 'discovery.md'),
    renderParentDiscovery(document),
    'utf8',
  );

  await Promise.all(
    ['spec.md', 'design.md', 'plan.md', 'implementation.md'].map((file) =>
      rm(join(parentRoot, file), { force: true }),
    ),
  );

  return {
    parentProjectPath: projectPathFor(
      context.projectsRoot ?? scaffold.projectsRoot,
      document.plan.parentSlug,
    ),
    scaffold,
  };
}
