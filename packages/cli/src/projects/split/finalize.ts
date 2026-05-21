import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { getFrontmatterBlock } from '@commands/shared/frontmatter';
import { replaceFrontmatter } from '@commands/shared/frontmatter-write';
import { setActiveProject } from '@config/oat-config';
import YAML from 'yaml';

import type { ChildPlan } from './child-plan';
import type { SplitProjectContext } from './write-parent';

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

export interface FinalizeSplitResult {
  activeProjectPath: string;
}

export async function finalizeSplit(
  plan: ChildPlan,
  context: SplitProjectContext,
): Promise<FinalizeSplitResult> {
  const projectsRoot = context.projectsRoot ?? '.oat/projects/shared';
  const parentPath = join(projectsRoot, plan.parentSlug).split('\\').join('/');
  const statePath = join(context.repoRoot, parentPath, 'state.md');
  const stateContent = await readFile(statePath, 'utf8');
  const frontmatter = readObjectFrontmatter(stateContent, statePath);
  frontmatter['oat_phase'] = 'decomposition';
  frontmatter['oat_phase_status'] = 'complete';
  await writeFile(
    statePath,
    replaceFrontmatter(stateContent, YAML.stringify(frontmatter).trimEnd()),
    'utf8',
  );

  const activeProjectPath = join(projectsRoot, plan.initialActiveChild)
    .split('\\')
    .join('/');
  await setActiveProject(context.repoRoot, activeProjectPath);

  return { activeProjectPath };
}
