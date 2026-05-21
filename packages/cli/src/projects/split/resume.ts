import { readFile, stat } from 'node:fs/promises';
import { isAbsolute, join, relative } from 'node:path';

import { getFrontmatterBlock } from '@commands/shared/frontmatter';
import YAML from 'yaml';

import type { ChildPlan, SplitPlanDocument } from './child-plan';
import { finalizeSplit } from './finalize';
import { seedChildren } from './seed-children';
import type { SplitProjectContext } from './write-parent';

export class SplitResumeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SplitResumeError';
  }
}

export interface PartialSplit {
  document: SplitPlanDocument;
  plan: ChildPlan;
  missingChildren: string[];
  parentProjectPath: string;
  projectsRoot: string;
}

function readObjectFrontmatter(
  content: string,
  filePath: string,
): Record<string, unknown> {
  const block = getFrontmatterBlock(content);
  if (!block) {
    throw new SplitResumeError(`${filePath} is missing frontmatter`);
  }
  const parsed: unknown = YAML.parse(block);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new SplitResumeError(`${filePath} frontmatter must be an object`);
  }
  return parsed as Record<string, unknown>;
}

function isSplitPlanDocument(value: unknown): value is SplitPlanDocument {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  const document = value as Partial<SplitPlanDocument>;
  return (
    typeof document.origin === 'string' &&
    typeof document.interactive === 'boolean' &&
    Boolean(document.plan) &&
    typeof document.plan?.parentSlug === 'string' &&
    Array.isArray(document.plan?.children) &&
    typeof document.plan?.initialActiveChild === 'string'
  );
}

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

function resolveParentPaths(
  parentPath: string,
  context: SplitProjectContext,
): {
  absoluteParentPath: string;
  parentProjectPath: string;
  projectsRoot: string;
} {
  const absoluteParentPath = isAbsolute(parentPath)
    ? parentPath
    : join(context.repoRoot, parentPath);
  const parentProjectPath = relative(context.repoRoot, absoluteParentPath)
    .split('\\')
    .join('/');
  const segments = parentProjectPath.split('/');
  const projectsRoot = segments.slice(0, -1).join('/');
  return { absoluteParentPath, parentProjectPath, projectsRoot };
}

export async function detectPartialSplit(
  parentPath: string,
  context: SplitProjectContext,
): Promise<PartialSplit> {
  const { absoluteParentPath, parentProjectPath, projectsRoot } =
    resolveParentPaths(parentPath, context);
  const statePath = join(absoluteParentPath, 'state.md');
  const state = readObjectFrontmatter(
    await readFile(statePath, 'utf8'),
    statePath,
  );

  if (state['oat_kind'] !== 'coordination') {
    throw new SplitResumeError('Split resume requires a coordination parent');
  }
  if (state['oat_phase_status'] === 'complete') {
    throw new SplitResumeError('Cannot resume a completed split parent');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(
      await readFile(
        join(absoluteParentPath, 'references', 'split-plan.json'),
        'utf8',
      ),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new SplitResumeError(
      `Cannot resume split without valid references/split-plan.json: ${message}`,
    );
  }
  if (!isSplitPlanDocument(parsed)) {
    throw new SplitResumeError(
      'Cannot resume split without valid references/split-plan.json',
    );
  }

  const missingChildren: string[] = [];
  for (const child of parsed.plan.children) {
    if (!(await exists(join(context.repoRoot, projectsRoot, child.slug)))) {
      missingChildren.push(child.slug);
    }
  }

  return {
    document: parsed,
    plan: parsed.plan,
    missingChildren,
    parentProjectPath,
    projectsRoot,
  };
}

export async function resumeSplit(
  parentPath: string,
  context: SplitProjectContext,
): Promise<PartialSplit> {
  const partial = await detectPartialSplit(parentPath, context);
  if (partial.missingChildren.length > 0) {
    await seedChildren(
      partial.plan,
      { ...context, projectsRoot: partial.projectsRoot },
      new Set(partial.missingChildren),
    );
  }
  await finalizeSplit(partial.plan, {
    ...context,
    projectsRoot: partial.projectsRoot,
  });
  return partial;
}
