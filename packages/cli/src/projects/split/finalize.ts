import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { defaultGitRunner } from '@commands/project/sync/git';
import {
  buildSyncTarget,
  pendingRebaseConflicts,
  pushSynced as defaultPushSynced,
  type SyncTarget,
} from '@commands/project/sync/ref-sync';
import { getFrontmatterBlock } from '@commands/shared/frontmatter';
import { replaceFrontmatter } from '@commands/shared/frontmatter-write';
import { setActiveProject } from '@config/oat-config';
import { CliError } from '@errors/cli-error';
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

function shellQuote(value: string): string {
  return `'${value.replaceAll("'", `'\\''`)}'`;
}

function conflictError(target: SyncTarget, conflicts: string[]): CliError {
  const detail = conflicts.length > 0 ? ` (${conflicts.join(', ')})` : '';
  const targetArg = shellQuote(target.projectPath);
  return new CliError(
    `Failed to publish synced split project ${target.slug}: conflict${detail}. Resolve the files, then run oat project pull ${targetArg} --continue; or run oat project pull ${targetArg} --abort. After recovery, rerun split with --resume.`,
    1,
  );
}

export async function finalizeSplit(
  plan: ChildPlan,
  context: SplitProjectContext,
): Promise<FinalizeSplitResult> {
  const projectsRoot = context.projectsRoot ?? '.oat/projects/shared';
  const scopeRoot = context.scopeRoot ?? projectsRoot;
  const parentPath = join(scopeRoot, plan.parentSlug).split('\\').join('/');
  const statePath = join(context.repoRoot, parentPath, 'state.md');
  const stateContent = await readFile(statePath, 'utf8');
  const frontmatter = readObjectFrontmatter(stateContent, statePath);

  const gitRunner = context.gitRunner ?? defaultGitRunner;
  const syncTargets =
    context.scope === 'synced'
      ? [
          plan.parentSlug,
          ...plan.children
            .slice()
            .sort((left, right) => left.order - right.order)
            .map((child) => child.slug),
        ].map((slug) => buildSyncTarget(context.repoRoot, projectsRoot, slug))
      : [];
  for (const target of syncTargets) {
    const conflicts = await pendingRebaseConflicts(target, gitRunner);
    if (conflicts !== null) {
      throw conflictError(target, conflicts);
    }
  }

  frontmatter['oat_phase'] = 'decomposition';
  frontmatter['oat_phase_status'] = 'complete';
  await writeFile(
    statePath,
    replaceFrontmatter(stateContent, YAML.stringify(frontmatter).trimEnd()),
    'utf8',
  );

  if (context.scope === 'synced') {
    const pushSynced = context.pushSynced ?? defaultPushSynced;
    try {
      for (const target of syncTargets) {
        const result = await pushSynced(target, gitRunner, {
          message: `chore(oat): finalize split ${plan.parentSlug}`,
        });
        if (result.status !== 'pushed' && result.status !== 'up-to-date') {
          if (result.status === 'conflict') {
            throw conflictError(target, result.conflicts ?? []);
          }
          throw new CliError(
            `Failed to publish synced split project ${target.slug}: ${result.status}`,
            1,
          );
        }
      }
    } catch (error) {
      try {
        await writeFile(statePath, stateContent, 'utf8');
      } catch (rollbackError) {
        throw new CliError(
          `Failed to restore resumable split state after publication failure: ${rollbackError instanceof Error ? rollbackError.message : String(rollbackError)}. Original failure: ${error instanceof Error ? error.message : String(error)}`,
          2,
        );
      }
      throw error;
    }
  }

  const activeProjectPath = join(scopeRoot, plan.initialActiveChild)
    .split('\\')
    .join('/');
  await setActiveProject(context.repoRoot, activeProjectPath);

  return { activeProjectPath };
}
